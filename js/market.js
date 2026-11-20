"use strict";
function refreshPopulation(){
  rebuildRoster();buildTiles();syncSwimmers();render();
}
function note(message){
  const el=$('#notice');el.textContent=message;el.hidden=false;
  clearTimeout(note.timer);note.timer=setTimeout(()=>el.hidden=true,4000);
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
 const tropical=[23,24,25,26,27,28,29,30,31,32];
 const reef=Array.from({length:22},(_,i)=>33+i);
 const specials=[TADPOLE,55,56,57,58,59,NERITE];
 const used=[choose(common,3,0),choose(pond,5,1),choose(tropical,3,7),choose(reef,5,2),choose(reef,5,11),choose(specials,1,3)];
 return used.map((type,i)=>{
   const plain=type===TADPOLE?6:offers[type].cost;
   const traits=rollTraits([garden.created,'market',hour,type].join('/')),factor=traitValue(traits);
   // Long waves keep a species' underlying quote smooth across hourly batches.
   const phase=sampleUnit(salt+'/'+type)*Math.PI*2;
   const rate=.135*Math.sin(hour*.18+phase)+.065*Math.sin(hour*.29-phase);
   const base=plain*factor,price=Math.max(Math.ceil(plain*.8),Math.min(Math.floor(plain*1.2),Math.round(plain*(1+rate))))*factor;
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
   record('鱼市购入'+itemInfo(type).breed+'，花费 '+offer.price+' 庭玉。');
   save();refreshPopulation();setBackdrop();modal.close();showInspector(false);
   if(type===TADPOLE)inspectFrog(id);else{chooseBait(type===NERITE?'algae':'grain');locateFish(id);note(itemInfo(type).breed+'已入池');}
 };
 if(navigator.locks)await navigator.locks.request('niwa-hourly-shop',commit);else commit();
}
function showMarket(){
 const hour=Math.floor(Date.now()/MARKET_HOUR),body=openDialog('潮时鱼市');body.dataset.marketHour=hour;
 if(garden.seenMarketHour!==hour && !document.hidden){garden.seenMarketHour=hour;save();}
 body.innerHTML='<div class="market-summary"><span>庭玉 <b>'+garden.jade+'</b></span><span>下批到货 <b id="arrival"></b></span></div><div class="stall"></div><p class="market-help">每逢整点到货六样，每样一份。标价随本批行情上下浮动 20%。</p>';
 const stall=body.querySelector('.stall');
 for(const {type,base,price,sex,traits} of stockFor(hour)){
   const f=itemInfo(type),card=document.createElement('article'),diff=Math.round(100*(price/base-1));
   card.className='lot';
   const habitat=f.habitat==='reef'?'潮间礁池':'镜水庭';
   const traitsMarkup=traitDefs.filter(t=>traits.includes(t.id)).map(t=>'<span>'+t.name+'</span>').join('');
   card.innerHTML='<div class="lot-image"><img alt="" src="'+f.image+'"></div>'+
     '<h3>'+f.breed+'</h3><small class="lot-meta">'+habitat+' · '+(sex?sex+'性':f.kind)+'</small>'+
     (traits.length?'<div class="lot-traits">'+traitsMarkup+'<span>身价 ×'+traitValue(traits)+'</span></div>':'')+
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
    questHit('sale',id);record('售出'+value.label+'「'+f.breed+'」，收入 '+price+' 庭玉。');refreshPopulation();save();modal.close();note('「'+f.breed+'」已成交，收入 '+price+' 庭玉');
  };modal.showModal();
}
$('#sell').onclick=offerSale;$('#market').onclick=showMarket;$('#buyMore').onclick=showMarket;
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
 if(zone==='reef'&&!garden.reef)return;
 if(typeof huntRun!=='undefined'&&huntRun)endHunt();
 garden.zone=zone;garden.focusFrog=null;chooseBait('grain');refreshPopulation();setBackdrop();save();showInspector(false);placeCamera(zoneStart(zone)+width*.48,height*.49);
}
function habitatDialog(){
 const body=openDialog(garden.reef?'双池游览':'鱼池扩建');
 const raised=garden.discovered.filter(n=>n!==VISITOR).length;
 if(!garden.reef){const requirement=document.createElement('p');requirement.className='market-info';requirement.textContent='扩建条件 · 养过 '+Math.min(raised,4)+' / 4 种生物　庭玉 '+garden.jade+' / '+REEF_COST;body.append(requirement);}
 for(const [zone,title,src] of [['pond','镜水庭',pondTextures[0]],['reef','潮间礁池',reefTexture]]){
  const locked=zone==='reef'&&!garden.reef,box=document.createElement('article');box.className='habitat';
  box.innerHTML='<img alt="" src="'+src+'"><div><h3>'+title+'</h3><small>'+(zone==='reef'?'海水 · 珊瑚与浅沙':'淡水 · 苔石与睡莲')+'　'+localStock(zone).length+' / '+CAPACITY+'</small></div>';
  const b=document.createElement('button');b.textContent=locked?'扩建 · '+REEF_COST+' 玉':garden.zone===zone?'当前水域':'前往';b.disabled=locked?(garden.jade<REEF_COST||raised<4):garden.zone===zone;
  b.onclick=()=>{if(locked&&!garden.reef){if(garden.jade<REEF_COST||garden.discovered.filter(n=>n!==VISITOR).length<4)return;garden.jade-=REEF_COST;garden.reef=true;record('开辟潮间礁池，新增 '+CAPACITY+' 个海水生物池位。');}modal.close();switchZone(zone);};box.append(b);body.append(box);
 }
 const aid=document.createElement('p');aid.className='market-help';aid.textContent='巡查三处水域可以领取 4 庭玉。选择拨水前往三个不同分区，每个现实小时可领取一次。';body.append(aid);
 const survey=garden.survey,button=document.createElement('button');button.className='primary-action';
 const hour=Math.floor(Date.now()/MARKET_HOUR),n=survey?.hour===hour?survey.regions.length:0,claimed=survey?.hour===hour&&survey.claimed;
 button.textContent=claimed?'巡查津贴已领取':'领取巡查津贴 · '+n+' / 3';button.disabled=claimed||n<3;
 button.onclick=()=>{if(!garden.survey||garden.survey.hour!==Math.floor(Date.now()/MARKET_HOUR)||garden.survey.claimed||garden.survey.regions.length<3)return;garden.survey.claimed=true;garden.jade+=4;record('完成水域巡查，获得 4 庭玉。');save();render();habitatDialog();};body.append(button);
 if(garden.zone==='pond'&&dragonflyState()){const b=document.createElement('button');b.className='primary-action';b.textContent='前往赤蜻活动水岸';b.onclick=()=>{const v=dragonflyState();modal.close();placeCamera(v.x*width,v.y*height);document.querySelector('[data-mode="observe"]').click();note('轻点蜻蜓，记录这位野生访客');};body.append(b);}
}
function surveyRegion(region){
 const hour=Math.floor(Date.now()/MARKET_HOUR);
 if(garden.survey?.hour!==hour)garden.survey={hour,regions:[],claimed:false};
 if(!garden.survey.regions.includes(region)&&garden.survey.regions.length<3){garden.survey.regions.push(region);save();if(garden.survey.regions.length===3)note('三处水域已巡查 · 到水域舆图领取 4 庭玉');}
}
for(const b of document.querySelectorAll('#zoneJumps button'))b.onclick=()=>switchZone(b.dataset.zone);
$('#zones').onclick=habitatDialog;$('#expandHabitat').onclick=habitatDialog;
function fillAtlas(body){
 const groups=[0,...Object.keys(breeds).map(Number).filter(type=>type>=6),TADPOLE,VISITOR],known=new Set(garden.discovered);
 const top=document.createElement('div');top.className='market-summary';top.innerHTML='<span>已记录 <b>'+known.size+' / '+groups.length+'</b></span><span>鱼类 <b>'+groups.filter(t=>t<55&&known.has(t)).length+' / 50</b></span>';body.append(top);
 const intro=document.createElement('p');intro.className='market-help';intro.textContent='养入新物种或观察野生访客可点亮图鉴；售出、放归和离世后仍保留记录。锦鲤的六种花色归在同一条目。';body.append(intro);
 for(const type of groups.filter(t=>known.has(t))){
   const f=type===VISITOR?{breed:'赤蜻',image:fieldTextures[1],marking:'在水面巡猎小飞虫，疲倦时停在岸草上。'}:itemInfo(type);
   const row=document.createElement('section');row.className='atlas-entry';row.innerHTML='<img src="'+f.image+'" alt=""><div><b>'+(type===0?'锦鲤':f.breed)+'</b><small>'+(f.marking||'蝌蚪经后肢期与幼蛙期长成池蛙。')+'</small></div>';
   const pets=koi.filter(p=>speciesKey(garden.fish[p.id].type)===type);
   for(const pet of pets){const b=document.createElement('button');b.textContent=(garden.favorites.includes(pet.id)?'★ ':'')+pet.breed+' ↗';b.onclick=()=>{modal.close();selectFish(pet);};row.append(b);}
   if(type===TADPOLE){const b=document.createElement('button');b.textContent='蛙舍 ↗';b.onclick=openNursery;row.append(b);}
   body.append(row);
 }
 const locked=groups.length-known.size;if(locked){const card=document.createElement('div');card.className='undiscovered';card.textContent='尚有 '+locked+' 种生物待发现';body.append(card);}
}
function checkLives(now=Date.now()){
 settleIncome(now);
 const expired=Object.entries(garden.fish).filter(([,item])=>now>=item.deathAt);
 if(expired.length&&huntRun)endHunt();
 for(const [id,item] of expired){
   const f=koi.find(f=>f.id===id);if(!f)continue;
   record('「'+f.breed+'」寿终，享年 '+Math.floor((item.deathAt-item.born)*RATE/DAY)+' 池日。');
   delete garden.fish[id];garden.favorites=garden.favorites.filter(k=>k!==id);
 }
 if(expired.length){refreshPopulation();save();if(modal.open)modal.close();note('有生物走完了一生，记录已收入庭院手记。');}
}
