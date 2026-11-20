"use strict";
const INCOME_PERIOD=2*3600000;
const individualHabits={
 bold:{clue:'总是很快发现鱼粮，一见饵就加速靠近。',action:'抢先追饵'},
 patient:{clue:'新饵落水时先等一会儿，水面静下来才靠近。',action:'候食'},
 wander:{clue:'喜欢离开熟悉的水域，沿长弧线探索。',action:'探游'},
 home:{clue:'兜了一圈，总爱游回熟悉的落脚处。',action:'返回老地方'}
};
function disposition(f){
 const item=garden.fish[f.id];
 return Object.keys(individualHabits)[Math.floor(sampleUnit(item.born+'/'+item.seed+'/'+f.id)*4)];
}
function habitLine(f,item){
 if(f.kind!=='鱼类')return f.marking;
 const count=item.sightings||0;
 return count>=3?'观察笔记 · '+individualHabits[disposition(f)].clue:'观察笔记 '+count+'/3 · '+(['bold','patient'].includes(disposition(f))?'撒饵时':'巡游时')+'轻点它，记录习性';
}
function witnessHabit(s){
 if(s.fish.kind!=='鱼类'||!s.signature)return;
 const item=garden.fish[s.fish.id],now=Date.now();
 if((item.sightings||0)>=3||now-(item.lastSighting||0)<15000)return;
 item.lastSighting=now;item.sightings=(item.sightings||0)+1;
 if(item.sightings===3){record(s.fish.breed+'的观察笔记：'+individualHabits[s.style].clue);note('习性已辨认 · '+individualHabits[s.style].clue);}
 else note('观察到'+s.signature+' · '+item.sightings+'/3');
 save();
}
// Find the actual maturity crossing even when the garden was closed. Feeding
// calls this before moving the metabolic baseline so the crossing stays exact.
function markAdult(f,now){
 const item=garden.fish[f.id];
 if(f.kind!=='鱼类'||item.adultAt!=null||metabolism(item,now).body<f.adult)return false;
 let lo=item.metabolicAt,hi=item.bodyDays>=f.adult?lo:Math.max(lo,now);
 while(hi-lo>1){const mid=Math.floor((lo+hi)/2);if(metabolism(item,mid).body>=f.adult)hi=mid;else lo=mid;}
 item.adultAt=hi;return true;
}
function settleIncome(now=Date.now()){
 let amount=0,changed=false;
 for(const f of koi){
   if(f.kind!=='鱼类')continue;
   const item=garden.fish[f.id],end=Math.min(now,item.deathAt);
   if(markAdult(f,end))changed=true;
   if(item.adultAt==null)continue;
   const from=item.paidThrough??Math.max(item.incomeSince,item.adultAt);
   const due=Math.floor((end-from)/INCOME_PERIOD);
   if(due>0){item.paidThrough=from+due*INCOME_PERIOD;amount+=due;}
 }
 if(amount){garden.jade+=amount;$('#wallet').textContent=garden.jade;record('成鱼留养收入到账 · '+amount+' 庭玉。');}
 if(amount||changed)save();
 return amount;
}
function incomeLine(f,item,now){
 if(f.kind!=='鱼类')return '';
 if(item.adultAt==null)return '留养收入 · 成年后每 2 个现实小时 1 庭玉';
 const from=item.paidThrough??Math.max(item.incomeSince,item.adultAt);
 const minutes=Math.max(0,Math.ceil((from+INCOME_PERIOD-now)/60000));
 return '留养收入 · 距下次 +1 庭玉约 '+minutes+' 分钟';
}
function watchSelectedFish(){
 if(document.hidden||modal.open||$('aside').hidden||garden.focusFrog)return;
 const s=swimmers.find(o=>o.fish.id===garden.selected);
 if(!s?.signature)return;
 const x=(s.x*width-cam.x)*zoom,y=(s.y*height-cam.y)*zoom;
 if(x>=0&&x<vw&&y>=0&&y<vh)witnessHabit(s);
}
function photoOf(s){
 const photo=document.createElement('canvas');photo.width=192;photo.height=128;
 const mid=s.bones[17]||{x:s.x*width,y:s.y*height};
 const scale=zoom*dpr,w=Math.min(scene.width,scene.height*1.5,Math.max(150,s.length*1.8)*scale),h=w/1.5;
 const x=clamp((mid.x-cam.x)*scale-w/2,0,scene.width-w);
 const y=clamp((mid.y-cam.y)*scale-h/2,0,scene.height-h);
 photo.getContext('2d').drawImage(scene,x,y,w,h,0,0,192,128);
 return photo.toDataURL('image/jpeg',.72);
}
function keepFieldPhoto(s){
 const at=Date.now(),title=s.fish.breed+' · '+s.activity;
 const photos=garden.fieldPhotos??=[];
 photos.unshift({image:photoOf(s),at,title});photos.length=Math.min(photos.length,12);
 record('拍下「'+title+'」，收入观察相册。');save();
}
function showFieldPhotos(body){
 if(!garden.fieldPhotos?.length)return;
 const details=document.createElement('details'),summary=document.createElement('summary');
 details.className='field-album';summary.textContent='观察相册 · '+garden.fieldPhotos.length+'/12';details.append(summary);
 const grid=document.createElement('div');grid.className='field-photos';
 for(const photo of garden.fieldPhotos){
   const card=document.createElement('figure'),img=new Image(),caption=document.createElement('figcaption'),time=document.createElement('small');
   img.src=photo.image;img.alt=photo.title;caption.textContent=photo.title;
   time.textContent='池历第 '+(1+Math.floor((photo.at-garden.created)*RATE/DAY))+' 天 · '+gardenTime(photo.at).toISOString().slice(11,16);
   caption.append(time);card.append(img,caption);grid.append(card);
 }
 details.append(grid);body.append(details);
}
function behaviorOptions(){
 const pool=swimmers.filter(s=>s.fish.habitat===garden.zone&&s.activity);
 return [...new Set(pool.map(s=>s.activity))];
}
function updateBehaviorClue(run){
 const options=behaviorOptions();
 if(!options.includes(run.clue))run.clue=options[Math.floor(Math.random()*options.length)];
 $('#huntCounter').textContent='行为寻踪 · 轻点正在这样活动的生物';
 $('#huntTarget').textContent=run.clue||'等待池中生物活动';
}
async function startBehaviorHunt(){
 const options=behaviorOptions();if(!options.length){note('等生物开始活动再来观察');return;}
 if(!await reserveHunt())return;
 const special=options.filter(a=>['正在求偶','正在觅食','沿石刮藻','结伴游动','候食','抢先追饵'].includes(a));
 const clues=special.length?special:options,now=performance.now();
 huntRun={behavior:true,start:now,end:now+60000,clue:clues[Math.floor(Math.random()*clues.length)],index:0};
 modal.close();showInspector(false);document.querySelector('[data-mode="observe"]').click();
 $('#marker').style.visibility='hidden';$('#huntHud').hidden=false;
 $('#huntHud img').hidden=true;tickHunt();
}
function catchBehavior(f){
 const s=swimmers.find(o=>o.fish.id===f.id);
 if(!s||s.activity!==huntRun.clue){note('再看看 · 它正在'+(s?.activity||'活动'));return;}
 keepFieldPhoto(s);witnessHabit(s);endHunt(true);
}
function createReturnStory(previous,now=Date.now()){
 if(!previous||now-previous<180000)return;
 const living=koi.filter(f=>garden.fish[f.id].deathAt>now);
 living.sort((a,b)=>Number(garden.favorites.includes(b.id))-Number(garden.favorites.includes(a.id)));
 let result=null;
 for(const f of living){
   const item=garden.fish[f.id];let detail;
   if(item.adultAt>previous&&item.adultAt<=now)detail='离庭期间成年了';
   else if(item.born>previous)detail='新近入池';
   else if(growthOf(f,now).full<25&&growthOf(f,previous).full>=25)detail='肚子饿了';
   else if(growthOf(f,now).length-growthOf(f,previous).length>=.5)detail='又长大了一些';
   if(detail){result={id:f.id,text:(garden.favorites.includes(f.id)?'你关注的':'')+f.breed+detail};break;}
 }
 if(result){garden.returnStory=result;save();}
}
function paintReturnStory(){
 const story=garden.returnStory,button=$('#returnStory');
 button.hidden=!story||!garden.fish[story.id];button.textContent=button.hidden?'':'回庭见闻 · '+story.text+' ↗';
}
let cameraVisit=0;
function visitReturnStory(){
 const f=koi.find(f=>f.id===garden.returnStory?.id);delete garden.returnStory;save();paintReturnStory();if(!f)return;
 const start=performance.now(),x=cam.x+vw/(2*zoom),y=cam.y+vh/(2*zoom);
 const token=++cameraVisit,duration=matchMedia('(prefers-reduced-motion: reduce)').matches?0:850;
 function travel(t){
   const s=swimmers.find(o=>o.fish.id===f.id);if(token!==cameraVisit||!s)return;
   const u=duration?Math.min(1,(t-start)/duration):1,k=u*u*(3-2*u);
   placeCamera(x+(s.x*width-x)*k,y+(s.y*height-y)*k);
   if(u<1)requestAnimationFrame(travel);else selectFish(f);
 }
 requestAnimationFrame(travel);
}
function visitKey(created){return SAVE_KEY+'.visit.'+created;}
function initReturnStory(){
 const key=visitKey(garden.created);let awayAt;
 function rememberVisit(){
   try{
     const current=JSON.parse(localStorage.getItem(SAVE_KEY));
     if(current?.created===garden.created)localStorage.setItem(key,String(Date.now()));
   }catch{}
 }
 try{createReturnStory(Number(localStorage.getItem(key)));}catch{}
 rememberVisit();paintReturnStory();
 $('#returnStory').onclick=visitReturnStory;
 canvas.addEventListener('pointerdown',()=>cameraVisit++);
 document.addEventListener('visibilitychange',()=>{
   if(document.hidden){awayAt=Date.now();rememberVisit();}
   else if(awayAt){checkLives();createReturnStory(awayAt);awayAt=null;rememberVisit();paintReturnStory();}
 });
 window.addEventListener('pagehide',rememberVisit);
 setInterval(()=>{if(!document.hidden)rememberVisit();},60000);
 setInterval(watchSelectedFish,1000);
}
