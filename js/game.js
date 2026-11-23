"use strict";
function openDialog(title){if(modal.open)modal.close();$('#modalTitle').textContent=title;$('#modalBody').replaceChildren();modal.showModal();return $('#modalBody');}
function showInspector(open){$('aside').hidden=!open;$('#inspect').hidden=open;}
$('#inspect').onclick=()=>{showInspector(true);};
$('.fold').onclick=()=>showInspector(false);
$('#home').onclick=()=>{showInspector(false);placeCamera(width*.423,height*.49);};
function inspectFrog(id){
 const p=garden.amphibians[id];if(!p)return;if(garden.zone!=='pond')switchZone('pond');garden.focusFrog=id;if(frogGrowth(p).stage<3)chooseBait("algae");const m=motionFor(id,p);
 placeCamera(m.x*width,m.y*height);save();showInspector(true);render();note('已定位「'+p.name+'」 · '+frogGrowth(p).label+(frogGrowth(p).stage<3?'，投喂工具已备好藻屑':'，在荷岸活动'));
}
function openNursery(){
 const body=openDialog('荷岸蛙舍'),list=document.createElement('div');list.className='nursery-list';
 const intro=document.createElement('p');intro.className='market-help';intro.textContent='定位个体后，投喂会换成藻屑。每隔 22 秒可进食一次。池中 3、8、16 小时分别长出后肢、前肢和褪尾，各需累计 1、2、3 次进食。成年后可留养、出售或放归湿地。';const chorus=document.createElement('p');chorus.textContent=chorusText();body.append(intro,chorus,list);
 for(const [id,p] of Object.entries(garden.amphibians)){
   const g=frogGrowth(p),row=document.createElement('article'),title=document.createElement('b');title.textContent=p.name+' · '+g.label;
   const stats=document.createElement('small');stats.textContent=traitText(p.traits)+' · '+g.temper+' · '+g.length+' cm · 饱食 '+g.full+'% · 活力 '+g.energy+'　水龄 '+g.age.toFixed(1)+' 小时　照料 '+p.meals+' 次'+(Date.now()-p.lastMeal<22000?'　刚刚吃饱':'');
   const locate=document.createElement('button');locate.textContent='定位观察';locate.onclick=()=>{modal.close();inspectFrog(id);};const portrait=document.createElement('img');portrait.className='frog-photo';portrait.src=frogTextures[g.stage];portrait.alt=g.label;
   row.append(portrait,title,stats,locate);
   list.append(row);
 }
 const adopt=document.createElement('button');adopt.className='primary-action';adopt.textContent='到鱼市查看本批生物';adopt.onclick=showMarket;body.append(adopt);
}
$('#nursery').onclick=openNursery;
function frogPrice(p,release){return (release?18:20+Math.floor(p.seed*6))*traitValue(p.traits)+(release?0:chorusLayers());}
function tradeFrog(id,release){
 const p=garden.amphibians[id];if(!p||frogGrowth(p).stage!==3)return;
 const price=frogPrice(p,release),action=release?'放归':'出售';
 const body=openDialog(release?'放归湿地':'出售成蛙');
 const detail=document.createElement('p');detail.textContent=action+'后，「'+p.name+'」将离开荷岸。'+(release?'湿地养护所回赠':'鱼市估价')+' '+price+' 庭玉。';body.append(detail);
 const keep=document.createElement('button');keep.textContent='继续留养';keep.onclick=()=>modal.close();body.append(keep);
 const yes=document.createElement('button');yes.className='primary-action';yes.textContent='确认'+action;body.append(yes);
 yes.onclick=()=>{
  if(!garden.amphibians[id])return;
  delete garden.amphibians[id];petMotion.delete(id);
  garden.favorites=garden.favorites.filter(key=>key!==id);garden.focusFrog=null;
  garden.jade+=price;record(action+'成蛙「'+p.name+'」，获得 '+price+' 庭玉。');
  chooseBait(current()?.habit==='scrape'?'algae':'grain');buildTiles();render();save();modal.close();note(action+'完成 · '+price+' 庭玉');
 };
}
function paintFrogProfile(id,p){
 const g=frogGrowth(p),image=frogTextures[g.stage],adult=g.stage===3;
 const nextHours=frogStageHours[g.stage],needs=[];
 if(!adult){
  if(g.age<nextHours)needs.push('再过 '+(nextHours-g.age).toFixed(1)+' 池时');
  if(p.meals<=g.stage)needs.push('再进食 '+(g.stage+1-p.meals)+' 次');
 }
 const fields={serial:'NO. A'+id.slice(1).padStart(3,'0'),fishName:p.name,breed:'镜水庭 · 池蛙',length:g.length,age:(g.age/24).toFixed(1),nature:g.temper,phase:g.label,careInfo:'每池日消耗 '+frogCare.dailyUse+' 点 · '+frogStageHours[2]+' 池时及 3 次进食成蛙',hunger:g.full+'%',life:'活力 '+g.energy,family:chorusText(),traits:traitText(p.traits),fieldHabit:adult?'在荷岸跳跃、歇脚':'靠近水里的藻屑进食',incomeInfo:needs.length?'距离'+['后肢期','幼蛙','成蛙'][g.stage]+' · '+needs.join('，'):'',quality:'照料 '+p.meals+' 次'};
 for(const [key,value] of Object.entries(fields))$('#'+key).textContent=value;
 $('#peekImg').hidden=false;$('#peekImg').src=image;$('#peekName').textContent=p.name+' · '+g.label;
 $('.portrait').classList.remove('lustre');$('#portrait').style.filter='none';$('#portrait').src=image;
 $('#foodbar').style.width=g.full+'%';$('#progress').style.width=g.stage/3*100+'%';
 $('#sell').disabled=!adult;$('#sell').textContent=adult?'出售 · '+frogPrice(p,false)+' 玉':'成年可出售';
 $('#releaseFish').disabled=!adult;$('#releaseFish').textContent=adult?'放归 · '+frogPrice(p,true)+' 玉':'成年可放归';
}
buildTiles();render();
if(garden.focusFrog&&garden.amphibians[garden.focusFrog]){const m=motionFor(garden.focusFrog,garden.amphibians[garden.focusFrog]);placeCamera(m.x*width,m.y*height);}
else if(garden.selected&&garden.selected!=='k01')locateFish(garden.selected);
function canStartHunt(){return garden.lastHuntHour!==Math.floor(Date.now()/3600000);}
async function reserveHunt(){
 const commit=()=>{
  const latest=readState();
  if(latest.created!==garden.created){location.reload();return false;}
  garden=latest;rebuildRoster();
  if(!canStartHunt()){note('本小时已开启过寻踪，下个整点再来');return false;}
  garden.lastHuntHour=Math.floor(Date.now()/3600000);save();return true;
 };
 return navigator.locks?await navigator.locks.request('niwa-hourly-shop',commit):commit();
}
let huntRun=null;
function endHunt(won=false){
 if(!huntRun)return;
 const run=huntRun;huntRun=null;$('#huntHud img').hidden=false;$('#huntHud').hidden=true;$('#marker').style.visibility='';
 if(run.behavior){note(won?'拍摄成功 · 照片已收入庭院手记':'行为寻踪结束');return;}
 if(won){
  const seconds=Math.ceil((performance.now()-run.start)/1000),reward=run.targets.length*2;
  garden.huntBest=Math.min(garden.huntBest||Infinity,seconds);garden.jade+=reward;
  record('完成寻踪，耗时 '+seconds+' 秒，获赠 '+reward+' 庭玉。');save();render();note('寻踪完成 · '+seconds+' 秒，获得 '+reward+' 庭玉');
 }else note('本轮寻踪结束 · 已找到 '+run.index+' 尾');
}
function tickHunt(){
 if(!huntRun)return;
 const seconds=Math.ceil((huntRun.end-performance.now())/1000);if(seconds<=0){endHunt();return;}
 $('#huntTimer').textContent=seconds+'s';
 if(huntRun.behavior){updateBehaviorClue(huntRun);return;}
 const f=huntRun.targets[huntRun.index];
 $('#huntCounter').textContent='寻踪 · '+(huntRun.index+1)+' / '+huntRun.targets.length;
 $('#huntTarget').textContent=f.breed;const img=$('#huntHud img');if(img.getAttribute('src')!==f.image)img.src=f.image;img.style.filter=coloration(f);
}
function huntCatch(f){
 const run=huntRun;if(!run)return;
 if(run.behavior){catchBehavior(f);return;}
 if(f.breed!==run.targets[run.index].breed){run.end-=3000;note('这是「'+f.breed+'」 · 扣除 3 秒');}
 else if(run.found.has(f.id)){note('这尾已经找过了，看看同种的其他鱼');return;}
 else{
   run.found.add(f.id);run.index++;
   if(run.index===run.targets.length){endHunt(true);return;}
   note('找到了「'+f.breed+'」 · 下一尾');
 }
 tickHunt();
}
$('#endHunt').onclick=()=>endHunt();
$('#hunt').onclick=()=>{
 if(huntRun){endHunt();return;}
 if(!canStartHunt()){note('本小时已开启过寻踪，下个整点再来');return;}
 const body=openDialog('寻踪游');const text=document.createElement('p');text.className='dialog-detail';text.textContent='每小时可开启一次寻踪，普通寻踪与行为寻踪共用次数，开始即计入。在 60 秒内依次找到图示种类。点错扣 3 秒，完成后每尾赏金 2 玉。';
 const best=document.createElement('p');best.className='market-info';best.textContent=garden.huntBest?'最快纪录 · '+garden.huntBest+' 秒':'本轮目标 · '+Math.min(localStock().length,3)+' 尾';
 const field=document.createElement('button');field.textContent='行为寻踪 · 拍照入册';field.className='primary-action';field.disabled=!localStock().length;field.onclick=startBehaviorHunt;
 const help=document.createElement('p');help.className='market-help';help.textContent='根据池中此刻的活动出题。轻点符合线索的生物，把这一幕留在庭院手记，最近 12 张可回看。';
 const start=document.createElement('button');start.className='primary-action';start.disabled=!localStock().length;start.textContent=localStock().length?'开始寻踪':'先到鱼市购入一尾鱼苗';
 start.onclick=async()=>{if(!localStock().length||!await reserveHunt())return;const pool=localStock(),targets=[];while(pool.length&&targets.length<3)targets.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]);
 const now=performance.now();huntRun={start:now,end:now+60000,targets,index:0,found:new Set()};modal.close();showInspector(false);document.querySelector('[data-mode="observe"]').click();$('#huntHud').hidden=false;$('#marker').style.visibility='hidden';tickHunt();};body.append(field,help,text,best,start);
};
for(const button of document.querySelectorAll('[data-mode]'))button.addEventListener('click',()=>{if(huntRun&&button.dataset.mode!=='observe')endHunt();});

let baitKind=(garden.amphibians[garden.focusFrog]?frogGrowth(garden.amphibians[garden.focusFrog]).stage<3:current()?.habit==='scrape')?'algae':'grain';
function chooseBait(kind){
 baitKind=kind;
 for(const b of document.querySelectorAll('[data-bait]'))b.setAttribute('aria-pressed',b.dataset.bait===kind);
}
for(const b of document.querySelectorAll('[data-bait]'))b.onclick=()=>chooseBait(b.dataset.bait);
for(const b of document.querySelectorAll('[data-mode]'))b.addEventListener('click',()=>{$('#bait').hidden=mode!=='feed';$('#hint').hidden=mode==='feed';});
chooseBait(baitKind);
window.addEventListener('storage',e=>{if(e.key===SAVE_KEY&&huntRun)endHunt();});

setBackdrop();replenishDebris();setInterval(replenishDebris,3000);setInterval(checkBreeding,1600);checkLives();setInterval(checkLives,1000);
initReturnStory();requestAnimationFrame(frame);
function storedGarden(key){
 return JSON.parse(localStorage.getItem(key));
}
function gardenSummary(data){
 const opened=new Date(data.created).toLocaleString('zh-CN',{hour12:false});
 const count=Object.keys(data.fish||{}).length+Object.keys(data.amphibians||{}).length;
 return opened+' 开庭 · '+(data.jade??0)+' 庭玉 · '+count+' 只生物';
}
async function changeSlots(action){
 try{
  if(navigator.locks)await navigator.locks.request('niwa-hourly-shop',action);
  else action();
 }catch{note('无法修改本地存档，请检查浏览器存储权限或剩余空间。');}
}
function addGardenSwitch(body){
 let previous;
 try{previous=storedGarden(ARCHIVE_KEY);}catch{return;}
 const actions=document.createElement('div');actions.className='slot-actions';
 const swap=document.createElement('button');swap.className='primary-action';
 swap.textContent=previous?'切换至另一座庭院':'另开新庭 · 保留本庭存档';
 swap.onclick=()=>changeSlots(()=>{
   const current=storedGarden(SAVE_KEY),other=storedGarden(ARCHIVE_KEY);
   if(current?.created!==garden.created||other?.created!==previous?.created){showSaveManager();return;}
   const next=other?upgrade(other):initialState(Date.now());
   localStorage.setItem(ARCHIVE_KEY,JSON.stringify(current));
   try{localStorage.setItem(SAVE_KEY,JSON.stringify(next));}
   catch(error){
     if(other)localStorage.setItem(ARCHIVE_KEY,JSON.stringify(other));else localStorage.removeItem(ARCHIVE_KEY);
     throw error;
   }
   location.reload();
 });
 const manage=document.createElement('button');manage.className='secondary-action';manage.textContent='存档管理';manage.onclick=showSaveManager;
 actions.append(swap,manage);body.append(actions);
}
function showSaveManager(){
 const body=openDialog('存档管理');
 for(const [key,label] of [[SAVE_KEY,'当前庭院'],[ARCHIVE_KEY,'备用庭院']]){
   const data=storedGarden(key);if(!data)continue;
   const row=document.createElement('article');row.className='slot-entry';
   const info=document.createElement('div'),title=document.createElement('strong'),summary=document.createElement('small');
   title.textContent=label;summary.textContent=gardenSummary(data);info.append(title,summary);
   const remove=document.createElement('button');remove.className='danger-action';remove.textContent='删除';
   remove.setAttribute('aria-label','删除'+label);
   remove.onclick=()=>confirmSlotDeletion(key,label,data);row.append(info,remove);body.append(row);
 }
}
function confirmSlotDeletion(key,label,target){
 const body=openDialog('删除'+label+'？'),summary=document.createElement('p'),detail=document.createElement('p');
 summary.textContent=gardenSummary(target);detail.className='market-help';
 const alternate=storedGarden(ARCHIVE_KEY);
 detail.textContent='此庭院的生物、庭玉、图鉴和手记将永久删除。'+(key===ARCHIVE_KEY?'当前庭院会保留。':alternate?'删除后将进入备用庭院。':'删除后可以重新开庭。');
 const actions=document.createElement('div');actions.className='slot-actions';
 const cancel=document.createElement('button');cancel.className='secondary-action';cancel.textContent='取消';cancel.onclick=showSaveManager;
 const remove=document.createElement('button');remove.className='danger-action';remove.textContent='确认删除';
 remove.onclick=()=>changeSlots(()=>{
   const other=storedGarden(ARCHIVE_KEY);
   if(storedGarden(key)?.created!==target.created||other?.created!==alternate?.created){
     showSaveManager();note('存档已变动，请重新选择。');return;
   }
   if(key===ARCHIVE_KEY){localStorage.removeItem(key);localStorage.removeItem(visitKey(target.created));showSaveManager();note('备用庭院已删除');return;}
   localStorage.setItem(SAVE_KEY,JSON.stringify(other));
   localStorage.removeItem(ARCHIVE_KEY);localStorage.removeItem(visitKey(target.created));
   location.reload();
 });
 actions.append(cancel,remove);body.append(summary,detail,actions);cancel.focus();
}
