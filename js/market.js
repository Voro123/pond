"use strict";
function refreshPopulation(){
  rebuildRoster();buildTiles();syncSwimmers();render();
}
function note(message,duration=4000){
  const el=$('#notice');el.textContent=message;el.hidden=false;
  clearTimeout(note.timer);note.timer=setTimeout(()=>el.hidden=true,duration);
}
const MARKET_HOUR=3600000,REEF_COST=300;
function localStock(zone=garden.zone){return koi.filter(f=>f.habitat===zone);}
function stockFor(hour=Math.floor(Date.now()/MARKET_HOUR)){
 // Coprime steps rotate through every member of each pool. The common slot
 // always offers an affordable animal, including when the reef is still locked.
 const salt=Math.floor(garden.created/1000)%104729;
 const choose=(list,step,offset)=>list[(hour*step+salt+offset)%list.length];
 const common=[6,7,8,9,10,11,13,15,16,19];
 const pond=[12,14,17,18,20,21,22,...Array.from({length:6},(_,i)=>i)];
 const tropical=[23,24,25,26,27,28,29,30,31,32,HILLSTREAM];
 const reef=breeds.flatMap((f,type)=>f.habitat==='reef'&&f.kind==='鱼类'?[type]:[]);
 const specials=[TADPOLE,55,56,57,58,59,NERITE];
 const used=[choose(common,3,0),choose(pond,5,1),choose(tropical,3,7),choose(reef,5,2),choose(reef,5,11),choose(specials,1,3)];
 return used.map((type,i)=>{
   const plain=type===TADPOLE?6:offers[type].cost;
   const traits=rollTraits([garden.created,'market',hour,type].join('/'));
   // Long waves keep a species' underlying quote smooth across hourly batches.
   const phase=sampleUnit(salt+'/'+type)*Math.PI*2;
   const rate=.135*Math.sin(hour*.18+phase)+.065*Math.sin(hour*.29-phase);
   const base=plain,price=Math.max(Math.ceil(plain*.8),Math.min(Math.floor(plain*1.2),Math.round(plain*(1+rate))));
   const sex=breeds[type]?.kind==='鱼类'?(sampleUnit([garden.created,hour,type].join('/'))<.5?'雌':'雄'):null;
   return {type,base,price,sex,traits};
 });
}
function itemInfo(type){
 if(type===TADPOLE)return {breed:'池蛙蝌蚪',image:fieldTextures[0],kind:'两栖类',habitat:'pond',nature:'浅滩育幼'};
 return breeds[type];
}
function purchaseReason(type,price,hour){
 if(garden.marketSold.hour===hour&&garden.marketSold.types.includes(type))return '已售罄';
 const zone=habitatOf(type);
 if(zone==='reef'&&!garden.reef)return '需扩建礁池';
 if(type===TADPOLE?Object.keys(garden.amphibians).length>=6:localStock(zone).length>=CAPACITY)return '池位已满';
 return garden.jade<price?'庭玉不足':'';
}
async function purchase(type,hour){
 // Re-read the whole transaction while holding the shared browser lock. The
 // debit, one-off stock reservation and animal are committed in one JSON write.
 const commit=()=>{
   try{
     if(isEmptySlot()){location.reload();return;}
     if(localStorage.getItem(SAVE_KEY)){
       const latest=readState();if(latest.created!==garden.created){location.reload();return;}
       garden=latest;
     }
   }catch{}
   rebuildRoster();
   if(Math.floor(Date.now()/MARKET_HOUR)!==hour){showMarket();return;}
   const offer=stockFor(hour).find(o=>o.type===type);
   if(!offer||purchaseReason(type,offer.price,hour)){refreshPopulation();showMarket();return;}
   if(garden.marketSold.hour!==hour)garden.marketSold={hour,types:[]};
   garden.marketSold.types.push(type);garden.jade-=offer.price;discover(garden,type);
   garden.zone=habitatOf(type);let id;
   if(type===TADPOLE){
     const n=garden.nextFrog++;id='a'+n;const name=frogNames[(n-1)%frogNames.length]+(n>8?'·'+n:'');
     garden.amphibians[id]={name,born:Date.now(),seed:Math.random(),traits:offer.traits,meals:0,lastMeal:0};garden.focusFrog=id;
   }else{
     id='k'+String(garden.next++).padStart(2,'0');garden.fish[id]={...individual(type,Date.now(),Math.random()),traits:offer.traits,sex:offer.sex,hatchery:true};
     garden.selected=id;garden.focusFrog=null;rebuildRoster();
   }
   const breed=itemInfo(type).breed;
   const lucky=offer.traits.length?'幸运入池！「'+breed+'」拥有 '+traitText(offer.traits)+'，成年出售时享受特性加价！':'';
   if(lucky)record(lucky);
   save();refreshPopulation();setBackdrop();modal.close();showInspector(false);
   if(type===TADPOLE)inspectFrog(id);else{chooseBait(type===NERITE?'algae':'grain');locateFish(id);}
   note(lucky||breed+'已入池',lucky?8000:4000);
 };
 if(navigator.locks)await navigator.locks.request('niwa-hourly-shop',commit);else commit();
}
function marketCare(type){
 const frog=type===TADPOLE,p=frog?frogCare:breeds[type].care;
 const minutes=p.adultDays*DAY/RATE/60000;
 const clock=minutes<60?Math.round(minutes)+' 分钟':Number((minutes/60).toFixed(1))+' 小时';
 const lines=frog?[
  '进食后饱食回满 · 每池日消耗 '+p.dailyUse+' 点',
  '成蛙需 '+frogStageHours[2]+' 池时和 3 次进食'
 ]:[
  '每池日消耗 '+p.dailyUse+' 点 · 每粒补 '+p.bite+' 点',
  '饱食 ≥ '+p.growthFloor+'% 时，'+p.adultDays+' 池日成熟'
 ];
 return '<div class="lot-care">'+lines.map(line=>'<span>'+line+'</span>').join('')+'<span>最快约现实 '+clock+'</span></div>';
}
function showMarket(){
 const hour=Math.floor(Date.now()/MARKET_HOUR),body=openDialog('潮时鱼市');body.dataset.marketHour=hour;
 if(garden.seenMarketHour!==hour && !document.hidden){garden.seenMarketHour=hour;save();}
 body.innerHTML='<div class="market-summary"><span>庭玉 <b>'+garden.jade+'</b></span><span>下批到货 <b id="arrival"></b></span></div><div class="stall"></div><p class="market-help">每逢整点到货六样，每样一份。标价随本批行情上下浮动 20%。天生特性买入后揭晓，仅在出售估价时加价。养成时间从幼体起算，鱼虾等饱食不足时生长放慢。</p>';
 const stall=body.querySelector('.stall');
 for(const {type,base,price,sex} of stockFor(hour)){
   const f=itemInfo(type),card=document.createElement('article'),diff=Math.round(100*(price/base-1));
   card.className='lot';
   const habitat=f.habitat==='reef'?'潮间礁池':'镜水庭';
   card.innerHTML='<div class="lot-image"><img alt="" src="'+f.image+'"></div>'+
     '<h3>'+f.breed+'</h3><small class="lot-meta">'+habitat+' · '+(sex?sex+'性':f.kind)+'</small>'+marketCare(type)+
     '<div class="lot-order"><div class="quote"><b>'+price+' 玉</b><small>'+(!diff?'平价':(diff>0?'+':'')+diff+'%')+'</small></div></div>';
   const button=document.createElement('button'),reason=purchaseReason(type,price,hour);
   button.disabled=!!reason;button.textContent=reason||'买入一只';button.onclick=()=>purchase(type,hour);
   card.querySelector('.lot-order').append(button);stall.append(card);
 }
 updateMarket();
}
function updateMarket(){
 const now=Date.now(),hour=Math.floor(now/MARKET_HOUR);
 const seconds=Math.ceil(((hour+1)*MARKET_HOUR-now)/1000);
 const time=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
 $('#marketTime').textContent=time;
 $('#marketDot').hidden=garden.seenMarketHour===hour;
 const clock=$('#arrival');if(!clock||!modal.open||document.hidden)return;
 if(Number($('#modalBody').dataset.marketHour)!==hour){showMarket();return;}
 if(garden.seenMarketHour!==hour){garden.seenMarketHour=hour;save();$('#marketDot').hidden=true;}
 clock.textContent=time;
}
updateMarket();setInterval(updateMarket,500);document.addEventListener("visibilitychange",updateMarket);
function releaseFish(){
 const f=current();if(!f||!garden.fish[f.id])return;
 const id=f.id,body=openDialog('放生');
 body.innerHTML='<h3>'+f.breed+'</h3><p class="market-help">放生后，它将离开池庭。放生免费，没有庭玉收入。</p><div class="sale-actions"><button id="keepFish">继续留养</button><button id="confirmRelease">确认放生</button></div>';
 $('#keepFish').onclick=()=>modal.close();
 $('#confirmRelease').onclick=async()=>{
  const commit=()=>{
   if(isEmptySlot()){location.reload();return;}
   const latest=readState();
   if(latest.created!==garden.created){location.reload();return;}
   garden=latest;
   if(!garden.fish[id]){refreshPopulation();modal.close();return;}
   delete garden.fish[id];garden.favorites=garden.favorites.filter(key=>key!==id);
   record('放生「'+f.breed+'」，回归自然。');
   refreshPopulation();save();modal.close();note('「'+f.breed+'」已放生');
  };
  if(navigator.locks)await navigator.locks.request('niwa-hourly-shop',commit);else commit();
 };
}
$('#releaseFish').onclick=()=>garden.focusFrog?tradeFrog(garden.focusFrog,true):releaseFish();
function offerSale(){
  const f=current();if(!f||growthOf(f).maturity<1)return;
  const id=f.id,value=appraisal(f);
  $('#modalTitle').textContent='成年品鉴';const body=$('#modalBody');
  body.innerHTML='<div class="sale-portrait"><img src="'+f.image+'" alt=""></div><h3>'+f.breed+'</h3><p>'+value.label+' · '+growthOf(f).length.toFixed(1)+' cm</p><p class="market-help">成交后，它将离开池庭。交易会记入庭院手记。</p><div class="sale-actions"><button id="keep">继续留养</button><button id="confirmSale">出售 · '+value.price+' 庭玉</button></div>';
  body.querySelector('img').style.filter=coloration(f);
  $('#keep').onclick=()=>modal.close();$('#confirmSale').onclick=()=>{
    if(!garden.fish[id]||growthOf(f).maturity<1)return;
    settleIncome();
    const price=appraisal(f).price;garden.jade+=price;delete garden.fish[id];garden.favorites=garden.favorites.filter(k=>k!==id);
    record('售出'+value.label+'「'+f.breed+'」，收入 '+price+' 庭玉。');refreshPopulation();save();modal.close();note('「'+f.breed+'」已成交，收入 '+price+' 庭玉');
  };modal.showModal();
}
$('#sell').onclick=()=>garden.focusFrog?tradeFrog(garden.focusFrog,false):offerSale();$('#market').onclick=showMarket;$('#buyMore').onclick=showMarket;
// Reveal once per individual, including fish that matured while the garden was closed.
function revealAdults(){
  const matured=koi.filter(f=>{
    const item=garden.fish[f.id];
    return item.hatchery && !item.appraised && growthOf(f).maturity===1;
  });
  if(!matured.length)return;
  const notices=[];
  for(const f of matured){
    const value=appraisal(f);
    garden.fish[f.id].appraised=true;
    const entry='「'+f.breed+'」成年，品鉴为'+value.label+'，估价 '+value.price+' 庭玉。';
    notices.push(entry);record(entry);
  }
  save();note(matured.length===1?notices[0]:matured.length+' 只生物已完成品鉴，详情记入庭院手记。');
}
setInterval(revealAdults,1000);
function setBackdrop(){
 $('#expandHabitat').textContent=garden.reef?'镜水庭 ⇄ 潮间礁池':'＋ 扩建鱼池 · '+REEF_COST+' 玉';
 $('#hint span').textContent=mode==='observe'?(garden.reef?'拖过栈道游览两池 · 点击漂浮杂物清理':'拖动游园 · 轻点生物观察或拾取杂物'):instructions[mode];
 $('#zoneJumps').hidden=!garden.reef;$('#expandHabitat').hidden=garden.reef;
 for(const b of document.querySelectorAll('#zoneJumps button'))b.setAttribute('aria-pressed',String(b.dataset.zone===garden.zone));
 $('h1').firstChild.nodeValue=garden.zone==='reef'?'潮间礁池 ':'镜水庭 ';
}
function switchZone(zone){
 if(huntRun)endHunt();
 if(zone==='reef'&&!garden.reef)return;
 garden.zone=zone;garden.focusFrog=null;chooseBait('grain');refreshPopulation();setBackdrop();save();showInspector(false);placeCamera(zoneStart(zone)+width*.48,height*.49);
}
function habitatDialog(){
 const body=openDialog(garden.reef?'双池游览':'鱼池扩建');
 const raised=garden.discovered.filter(n=>!visitorKinds[n]).length;
 if(!garden.reef){const requirement=document.createElement('p');requirement.className='market-info';requirement.textContent='扩建条件 · 养过 '+Math.min(raised,4)+' / 4 种生物　庭玉 '+garden.jade+' / '+REEF_COST;body.append(requirement);}
 for(const [zone,title,src] of [['pond','镜水庭',pondTextures[0]],['reef','潮间礁池',reefTexture]]){
  const locked=zone==='reef'&&!garden.reef,box=document.createElement('article');box.className='habitat';
  box.innerHTML='<img alt="" src="'+src+'"><div><h3>'+title+'</h3><small>'+(zone==='reef'?'海水 · 珊瑚与浅沙':'淡水 · 苔石与睡莲')+'　'+localStock(zone).length+' / '+CAPACITY+'</small></div>';
  const b=document.createElement('button');b.textContent=locked?'扩建 · '+REEF_COST+' 玉':garden.zone===zone?'当前水域':'前往';b.disabled=locked?(garden.jade<REEF_COST||raised<4):garden.zone===zone;
  b.onclick=()=>{if(locked&&!garden.reef){if(garden.jade<REEF_COST||garden.discovered.filter(n=>!visitorKinds[n]).length<4)return;garden.jade-=REEF_COST;garden.reef=true;garden.reefOpenedAt=Date.now();record('开辟潮间礁池，新增 '+CAPACITY+' 个海水生物池位。');}modal.close();switchZone(zone);};box.append(b);body.append(box);
 }
 const visitor=visitorState();
 if(visitor){
  const b=document.createElement('button');b.className='primary-action';b.textContent='前往'+(visitor.zone==='pond'?'荷岸':'礁池')+' · '+visitor.breed;
  b.onclick=locateVisitor;body.append(b);
 }
}
for(const b of document.querySelectorAll('#zoneJumps button'))b.onclick=()=>switchZone(b.dataset.zone);
$('#zones').onclick=habitatDialog;$('#expandHabitat').onclick=habitatDialog;
function fillAtlas(body){
 const groups=[0,...Object.keys(breeds).map(Number).filter(type=>type>=6),TADPOLE,...Object.keys(visitorKinds).map(Number)],known=new Set(garden.discovered);
 const fishes=groups.filter(type=>breeds[type]?.kind==='鱼类');
 const top=document.createElement('div');top.className='market-summary';top.innerHTML='<span>已记录 <b>'+known.size+' / '+groups.length+'</b></span><span>鱼类 <b>'+fishes.filter(t=>known.has(t)).length+' / '+fishes.length+'</b></span>';body.append(top);
 const intro=document.createElement('p');intro.className='market-help';intro.textContent='养入新物种或观察野生访客可点亮图鉴；售出、放归和离世后仍保留记录。锦鲤的六种花色归在同一条目。';body.append(intro);
 for(const type of groups.filter(t=>known.has(t))){
   const f=visitorKinds[type]??itemInfo(type);
   const row=document.createElement('section');row.className='atlas-entry';row.innerHTML='<img src="'+f.image+'" alt=""><div><b>'+(type===0?'锦鲤':f.breed)+'</b><small>'+(f.marking||'蝌蚪经后肢期与幼蛙期长成池蛙。')+'</small></div>';
   if(speciesObservations[type]){
    const detail=document.createElement('small');detail.textContent=garden.speciesNotes?.includes(type)?'物种手记 · '+speciesObservations[type]:'观察线索 · '+speciesClues[type];row.querySelector('div').append(detail);
   }
   if(visitorKinds[type]){
    const details=document.createElement('small'),prefix=type+'/';
    const seen=(garden.visitorNotes||[]).filter(key=>key.startsWith(prefix)).map(key=>key.slice(prefix.length));
    details.textContent='停留时'+f.gift+(seen.length?' · 已见：'+seen.join('、'):'');row.querySelector('div').append(details);
   }
   const pets=koi.filter(p=>speciesKey(garden.fish[p.id].type)===type);
   for(const pet of pets){const b=document.createElement('button');b.textContent=(garden.favorites.includes(pet.id)?'★ ':'')+pet.breed+' ↗';b.onclick=()=>{modal.close();selectFish(pet);};row.append(b);}
   if(type===TADPOLE){const b=document.createElement('button');b.textContent='蛙舍 ↗';b.onclick=openNursery;row.append(b);}
   body.append(row);
 }
 const locked=groups.length-known.size;if(locked){const card=document.createElement('div');card.className='undiscovered';card.textContent='尚有 '+locked+' 种生物待发现';body.append(card);}
}
function checkLives(now=Date.now()){
 settleIncome(now);settleVisitor(now);
 const expired=Object.entries(garden.fish).filter(([,item])=>now>=item.deathAt);
 if(expired.length&&huntRun)endHunt();
 for(const [id,item] of expired){
   const f=koi.find(f=>f.id===id);if(!f)continue;
   record('「'+f.breed+'」寿终，享年 '+Math.floor((item.deathAt-item.born)*RATE/DAY)+' 池日。');
   delete garden.fish[id];garden.favorites=garden.favorites.filter(k=>k!==id);
 }
 if(expired.length){refreshPopulation();save();if(modal.open)modal.close();note('有生物走完了一生，记录已收入庭院手记。');}
}
