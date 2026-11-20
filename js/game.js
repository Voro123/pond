"use strict";
const jobs=[
 {kind:'feed',name:'开庭第一餐',count:1,reward:4,desc:'在鱼的前方投喂鱼粮。等它吃到第一口，回来领取 4 庭玉，攒下第一笔鱼市预算。'},
 {kind:'survey',name:'三湾水纹',count:3,reward:6,desc:'拖动游览，在荷岸浅滩、镜心洄湾、枫影深潭各拨一次水。小地图可以快速定位。'},
 {kind:'frogFeed',name:'荷岸育幼',count:1,reward:4,desc:'到蛙舍定位一只蝌蚪，在它附近投喂藻屑，等它上前觅食。'},
 {kind:'sale',name:'成年出庭',count:1,reward:8,desc:'从观察档案中选择一只成年生物，完成品鉴并出售。'},
 {kind:'release',name:'蛙鸣入野',count:1,reward:10,desc:'把一只蝌蚪养到成蛙，再从蛙舍放归湿地。'}
];
function job(){
 const index=garden.quest.round%jobs.length;
 if(index===0&&garden.quest.round>0)return repeatMealJob;
 return jobs[index];
}
const repeatMealJob={kind:'feed',name:'水庭开饭',count:1,reward:4,desc:'找到饥饿的生物并喂它吃下一口。'};
function questHit(kind,id){
 const q=garden.quest,j=job();if(j.kind!==kind||q.hits.includes(id)||q.hits.length>=j.count)return;
 q.hits.push(id);save();paintQuest();
 if(q.hits.length===j.count)note('委托完成 · '+j.name+'，可领取 '+j.reward+' 庭玉');
}
function paintQuest(){const j=job(),n=garden.quest.hits.length;$('#questText').textContent=j.name+'　'+n+' / '+j.count;$('#quest span').textContent=n>=j.count?'领取 ↗':'查看 ↗';}
function openDialog(title){if(modal.open)modal.close();$('#modalTitle').textContent=title;$('#modalBody').replaceChildren();modal.showModal();return $('#modalBody');}
$('#quest').onclick=()=>{
 const j=job(),q=garden.quest,body=openDialog('庭院委托');
 const intro=document.createElement('p');intro.className='market-info';intro.textContent=j.name+' · '+q.hits.length+' / '+j.count;
 const desc=document.createElement('p');desc.className='task-detail';desc.textContent=j.desc;
 const claim=document.createElement('button');claim.className='primary-action';claim.disabled=q.hits.length<j.count;claim.textContent='领取 '+j.reward+' 庭玉';
 claim.onclick=()=>{if(job()!==j||q.hits.length<j.count)return;garden.jade+=j.reward;record('完成委托「'+j.name+'」，收入 '+j.reward+' 庭玉。');q.round++;q.hits=[];save();paintQuest();render();modal.close();note('已领取奖励 · 新委托「'+job().name+'」');};body.append(intro,desc,claim);
 if(!koi.length&&!Object.keys(garden.amphibians).length){const aid=document.createElement('button');aid.className='primary-action';aid.textContent='接取巡池津贴';aid.onclick=habitatDialog;body.append(aid);}
 if(j.kind==='survey'){const seen=document.createElement('p');seen.className='market-help';seen.textContent='已踏勘：'+(q.hits.join('、')||'尚未踏勘');body.append(seen);}
};
function showInspector(open){$('aside').hidden=!open;$('#inspect').hidden=open;}
$('#inspect').onclick=()=>{if(garden.focusFrog)openNursery();else showInspector(true);};
$('.fold').onclick=()=>showInspector(false);
$('#home').onclick=()=>{showInspector(false);placeCamera(width*.423,height*.49);};
function inspectFrog(id){
 const p=garden.amphibians[id];if(!p)return;if(garden.zone!=='pond')switchZone('pond');garden.focusFrog=id;chooseBait("algae");const m=motionFor(id,p);
 placeCamera(m.x*width,m.y*height);save();showInspector(false);render();note('已定位「'+p.name+'」 · '+frogGrowth(p).label+(frogGrowth(p).stage<3?'，投喂工具已备好藻屑':'，在荷岸活动'));
}
function openNursery(){
 const body=openDialog('荷岸蛙舍'),list=document.createElement('div');list.className='nursery-list';
 const intro=document.createElement('p');intro.className='market-help';intro.textContent='定位个体后，投喂会换成藻屑。每隔 22 秒可进食一次。池中 3、8、16 小时分别长出后肢、前肢和褪尾，各需累计 1、2、3 次进食。成年后可留在荷岸，或放归赚取庭玉。';body.append(intro,list);
 for(const [id,p] of Object.entries(garden.amphibians)){
   const g=frogGrowth(p),row=document.createElement('article'),title=document.createElement('b');title.textContent=p.name+' · '+g.label;
   const stats=document.createElement('small');stats.textContent=traitText(p.traits)+' · '+g.temper+' · '+g.length+' cm · 饱食 '+g.full+'% · 活力 '+g.energy+'　水龄 '+g.age.toFixed(1)+' 小时　照料 '+p.meals+' 次'+(Date.now()-p.lastMeal<22000?'　刚刚吃饱':'');
   const locate=document.createElement('button');locate.textContent='定位观察';locate.onclick=()=>{modal.close();inspectFrog(id);};const portrait=document.createElement('img');portrait.className='frog-photo';portrait.src=frogTextures[g.stage];portrait.alt=g.label;
   row.append(portrait,title,stats,locate);
   if(g.stage===3){const price=18*traitValue(p.traits);const release=document.createElement('button');release.textContent='放归 · '+price+' 玉';release.onclick=()=>{
     const confirm=openDialog('放归湿地');confirm.innerHTML='<p class="task-detail">放归后，'+p.name+' 将离开镜水庭。湿地养护所会回赠 '+price+' 庭玉。</p>';
     const yes=document.createElement('button');yes.className='primary-action';yes.textContent='确认放归';yes.onclick=()=>{
       if(!garden.amphibians[id])return;delete garden.amphibians[id];petMotion.delete(id);if(garden.focusFrog===id){garden.focusFrog=null;chooseBait("grain");}garden.jade+=price;record('成蛙「'+p.name+'」已放归湿地，获赠 '+price+' 庭玉。');questHit('release',id);save();render();modal.close();note(p.name+' 已游入湿地');};confirm.append(yes);
   };row.append(release);}list.append(row);
 }
 const adopt=document.createElement('button');adopt.className='primary-action';adopt.textContent='到鱼市查看本批生物';adopt.onclick=showMarket;body.append(adopt);
}
$('#nursery').onclick=openNursery;
function paintFocus(){
 const p=garden.amphibians[garden.focusFrog];if(!p)return;
 $('#peekImg').hidden=true;$('#peekName').textContent=p.name+' · '+frogGrowth(p).label;
}
paintQuest();paintFocus();
if(garden.focusFrog&&garden.amphibians[garden.focusFrog]){const m=motionFor(garden.focusFrog,garden.amphibians[garden.focusFrog]);placeCamera(m.x*width,m.y*height);}
else if(garden.selected&&garden.selected!=='k01')locateFish(garden.selected);
const HUNT_REFILL=90000;
function huntCredit(now=Date.now()){
 const purse=garden.huntPurse||{at:now,balance:4};
 return Math.min(9,purse.balance+Math.max(0,now-purse.at)/HUNT_REFILL);
}
let huntRun=null;
function endHunt(won=false){
 if(!huntRun)return;
 const run=huntRun;huntRun=null;$('#huntHud img').hidden=false;$('#huntHud').hidden=true;$('#marker').style.visibility='';$('#quest').style.visibility='';
 if(run.behavior){note(won?'拍摄成功 · 照片已收入庭院手记':'行为寻踪结束');return;}
 if(won){
  const seconds=Math.ceil((performance.now()-run.start)/1000),credit=huntCredit(),reward=Math.min(Math.floor(credit),run.targets.length*2);
  garden.huntPurse={at:Date.now(),balance:credit-reward};
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
 const body=openDialog('寻踪游');const text=document.createElement('p');text.className='task-detail';text.textContent='在 60 秒内依次找到图示种类。每尾只能计入一次。点错扣 3 秒，每尾赏金 2 玉，完成本轮时结算。赏金池每 90 秒恢复 1 玉，上限 9 玉。当前可领 '+Math.floor(huntCredit())+' 玉。';
 const best=document.createElement('p');best.className='market-info';best.textContent=garden.huntBest?'最快纪录 · '+garden.huntBest+' 秒':'本轮目标 · '+Math.min(localStock().length,3)+' 尾';
 const field=document.createElement('button');field.textContent='行为寻踪 · 拍照入册';field.className='primary-action';field.disabled=!localStock().length;field.onclick=startBehaviorHunt;
 const help=document.createElement('p');help.className='market-help';help.textContent='根据池中此刻的活动出题。轻点符合线索的生物，把这一幕留在庭院手记，最近 12 张可回看。';
 const start=document.createElement('button');start.className='primary-action';start.disabled=!localStock().length;start.textContent=localStock().length?'开始寻踪':'先到鱼市购入一尾鱼苗';
 start.onclick=()=>{const pool=localStock(),targets=[];while(pool.length&&targets.length<3)targets.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]);
 const now=performance.now();huntRun={start:now,end:now+60000,targets,index:0,found:new Set()};modal.close();showInspector(false);document.querySelector('[data-mode="observe"]').click();$('#huntHud').hidden=false;$('#quest').style.visibility='hidden';$('#marker').style.visibility='hidden';tickHunt();};body.append(field,help,text,best,start);
};
for(const button of document.querySelectorAll('[data-mode]'))button.addEventListener('click',()=>{if(huntRun&&button.dataset.mode!=='observe')endHunt();});

let baitKind=garden.focusFrog||current()?.habit==='scrape'?'algae':'grain';
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
