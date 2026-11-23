"use strict";
const DAY = 86400000, RATE = 100;
const breeds = [
  {id:"k01", breed:"红白锦鲤", nature:"亲和", marking:"雪白鳞间，三段绯红如枫叶。", max:60, pace:1.05},
  {id:"k02", breed:"山吹黄金锦鲤", nature:"活泼", marking:"从额顶到尾柄，通身金鳞。", max:65, pace:1.25},
  {id:"k03", breed:"丹顶锦鲤", nature:"温顺", marking:"通体乳白，额心独有一枚朱印。", max:58, pace:.87},
  {id:"k04", breed:"昭和三色锦鲤", nature:"沉静", marking:"墨色横过肩背，绯斑点缀其间。", max:70, pace:.73},
  {id:"k05", breed:"浅黄锦鲤", nature:"谨慎", marking:"背鳞似蓝灰色织网，鳍尖染橙。", max:56, pace:.82},
  {id:"k06", breed:"赤别甲锦鲤", nature:"好奇", marking:"铜红的底色上散落乌黑斑纹。", max:63, pace:1.14}
].map((fish,i)=>({...fish,image:pondTextures[i+1]}));
const CAPACITY=20;
for(const f of breeds)Object.assign(f,{habit:'cruise',habitat:'pond',kind:'鱼类',adult:koiCare.adultDays,care:koiCare});
// Pre-v4 maturity thresholds are needed only to translate existing save progress.
const oldKoiGrowth=[180,200,175,210,184,170],oldMarketKoiGrowth=[3,4,4.5,6,3.5,3.2];
const offers=[
  {cost:120,base:290}, {cost:360,base:920},
  {cost:520,base:1404}, {cost:1200,base:3600},
  {cost:240,base:645}, {cost:180,base:437}
];
speciesRows.forEach(([breed,habit,max,cost,marketCost=cost],i)=>{
 const type=i+6,profile=speciesCare[breed];
 breeds.push({id:'sp'+type,breed,habit,kind:i<49?'鱼类':['爬行类','两栖类','甲壳类','头足类','甲壳类'][i-49],nature:activity[habit][0],marking:activity[habit][1],pace:activity[habit][2],max,adult:profile.adultDays,care:profile,habitat:habitatOf(type),image:specimenTextures[i]});
 offers.push({cost:marketCost,base:Math.round(marketCost*2.5)});
});
breeds[NERITE]={id:'sp62',breed:'斑马螺',kind:'腹足类',habit:'scrape',habitat:'pond',max:3,adult:speciesCare['斑马螺'].adultDays,care:speciesCare['斑马螺'],pace:.25,nature:'安静',marking:activity.scrape[1],image:neriteTexture};
offers[NERITE]={cost:7,base:18};
function inheritedSex(id,item){
 let hash=Math.round(item.seed*4294967295)>>>0;
 for(const char of id)hash=Math.imul(hash^char.charCodeAt(0),16777619)>>>0;
 return hash%2?'雄':'雌';
}
function individual(type,born,seed){
 return {type,born,seed,incomeSince:born,traits:rollTraits([type,born,seed].join('/')),sex:breeds[type].kind==='鱼类'?(Math.random()<.5?'雌':'雄'):null,care:0,lastMeal:null,metabolicAt:born,fullness:42,bodyDays:0,deathAt:born+lifeDays(type,seed)*DAY/RATE};
}
function discover(data,type){
 const key=speciesKey(type);if(!data.discovered.includes(key))data.discovered.push(key);
}
function upgrade(data){
 if(data.version===1){for(const [i,f] of breeds.slice(0,6).entries()){if(data.fish[f.id])Object.assign(data.fish[f.id],{type:i,seed:.19+i*.125,care:0,lastMeal:null});}Object.assign(data,{version:2,jade:60,next:7});}
 data.events=data.events.filter(event=>importantEvent(event.text)).map(event=>({...event,text:event.text.replace('首次投喂后可领取开庭委托奖励。','')}));
 data.amphibians??={};data.nextFrog??=1;delete data.quest;delete data.survey;delete data.huntPurse;
 if(data.version===2){
  const now=Date.now();data.discovered=[];data.zone='pond';data.reef=false;data.marketSold={};data.wildStart=now+32000;
  for(const f of Object.values(data.fish)){discover(data,f.type);f.metabolicAt=now;f.bodyDays=Math.max(0,(now-f.born)*RATE/DAY);f.fullness=47;f.deathAt=Math.max(now+DAY,f.born+lifeDays(f.type,f.seed)*DAY/RATE);}
  if(Object.keys(data.amphibians).length)discover(data,TADPOLE);
  data.version=3;
 }
 for(const [id,item] of Object.entries(data.fish)){
  item.incomeSince??=Date.now();
  item.traits??=rollTraits([data.created,id,item.seed].join('/'));
  if(breeds[item.type]?.kind==='鱼类'&&!item.sex)item.sex=inheritedSex(id,item);
 }
 for(const [id,p] of Object.entries(data.amphibians))p.traits??=rollTraits([data.created,id,p.seed].join('/'));
 if(data.version===3)migrateCare(data,Date.now());
 return data;
}
// Settle the old rate through the upgrade instant, preserving both the
// growth fraction and the original maturity crossing used for adult income.
function migrateCare(data,now){
 for(const item of Object.values(data.fish)){
  const type=item.type,def=breeds[type],end=Math.min(now,item.deathAt);
  const oldDays=type<6?(item.starter||item.hatchery?oldMarketKoiGrowth[type]:oldKoiGrowth[type]):type===NERITE?2.8:2.4+speciesRows[type-6][3]*.09;
  const oldRate=(2.4+(type%7)*.23+item.seed*.45)/5;
  const previous=integrateGrowth(item,end,oldRate);
  if(def.kind==='鱼类'&&item.adultAt==null&&previous.body>=oldDays){
   let lo=item.metabolicAt,hi=Math.max(lo,end);
   while(hi-lo>1){const mid=Math.floor((lo+hi)/2);if(integrateGrowth(item,mid,oldRate).body>=oldDays)hi=mid;else lo=mid;}
   item.adultAt=item.bodyDays>=oldDays?lo:hi;
  }
  item.fullness=previous.full;item.metabolicAt=end;
  item.bodyDays=previous.body/oldDays*def.care.adultDays;
 }
 for(const p of Object.values(data.amphibians)){
  const at=p.fedAt||p.lastMeal,level=p.fedAt?p.fedLevel:100;
  p.fedLevel=at?Math.max(p.lastMeal?0:32,level-(now-at)*.00060):32;p.fedAt=now;
 }
 data.version=4;
}
function initialState(now){
 const startingAge=koiCare.adultDays-1;
 const f=individual(0,now-startingAge*DAY/RATE,.44);f.metabolicAt=now;f.bodyDays=startingAge;f.fullness=27;f.starter=true;
 return {version:4,created:now,jade:0,next:7,selected:'k01',favorites:[],fish:{k01:f},amphibians:{},nextFrog:1,discovered:[0],zone:'pond',reef:false,marketSold:{},wildStart:now+32000,events:[{at:now,text:'红白锦鲤入庭。'}]};
}
function validGarden(data){
  return data && [1,2,3,4].includes(data.version) && Number.isFinite(data.created) && Array.isArray(data.events) && Array.isArray(data.favorites);
}
function readState(){
  try{
    const data=JSON.parse(localStorage.getItem(SAVE_KEY));
    if(validGarden(data))return upgrade(data);
  }catch{}
  return initialState(Date.now());
}
let garden=readState(),koi=[];
function rebuildRoster(){
  koi=Object.entries(garden.fish).map(([id,item])=>{
    const def=breeds[item.type];
    if(!item.hatchery)return {...def,id};
    return {...def,id,max:def.max*(.84+item.seed*.28),pace:def.pace*(.90+.2*item.seed),
      nature:["好奇","悠闲","活泼","温顺"][Math.floor(item.seed*173)%4]};
  });
  const local=koi.filter(f=>f.habitat===garden.zone);
  if(!local.some(f=>f.id===garden.selected))garden.selected=local[0]?.id??null;
}
function coloration(f){
  const item=garden.fish[f.id];
  return item.hatchery?'hue-rotate('+Math.round((item.seed-.5)*28)+'deg) saturate('+(.82+item.seed*.4)+')':'none';
}
function frogStage(p,age){
 return frogStageHours.filter((hours,i)=>age>=hours&&p.meals>=i+1).length;
}
function chorusLayers(now=Date.now()){
 const adults=Object.values(garden.amphibians).filter(p=>frogStage(p,(now-p.born)*RATE/3600000)===3);
 return Math.min(3,adults.length);
}
function chorusText(){
 return '荷岸蛙鸣 '+chorusLayers()+'/3 层 · 每留养一只成蛙，两池生物出售时多得 1 庭玉';
}
function appraisal(f){
  const item=garden.fish[f.id],g=growthOf(f);
  const rank=item.seed>=.96?3:item.seed>=.76?2:item.seed>=.39?1:0;
  const label=(item.type<6?["素锦","秀锦","上锦","珍品"]:["素品","秀品","上品","珍品"])[rank];
  const price=Math.round(offers[item.type].base*[1,1.35,1.9,3.2][rank]*(1+.05*item.care))*traitValue(item.traits);
  return {price:price+chorusLayers(),rank,label,reveal:g.maturity>=1?label:g.maturity>=.5?(rank>=2?"鳞光初现":"花纹渐显"):"花色未定"};
}
function nourish(f,now=Date.now()){
  const item=garden.fish[f.id];
  if(growthOf(f,now).maturity>=1||item.care>=3||(item.lastMeal!==null&&now-item.lastMeal<DAY/RATE/4))return false;
  item.lastMeal=now;item.care++;return true;
}
rebuildRoster();
function save(){
  try{
    const raw=localStorage.getItem(SAVE_KEY);
    if(raw==='null')return;
    let previous;
    try{previous=JSON.parse(raw);}catch{}
    if(validGarden(previous)&&previous.created!==garden.created)return;
    localStorage.setItem(SAVE_KEY,JSON.stringify(garden));
  }
  catch{document.querySelector("#saved").textContent="浏览器未允许本地存档";}
}
function importantEvent(text){
 return !/得到一次照料|游来吃下了鱼食|吃下藻屑，第|^开始关注|^清理.+获得 1 庭玉|^成鱼留养收入到账|^完成水域巡查|^鱼市购入|^完成委托/.test(text);
}
function record(text){
 if(!importantEvent(text))return;
 garden.events.unshift({at:Date.now(),text});garden.events=garden.events.slice(0,100);
}
// Integrate each hunger band exactly even when a tab stays closed for days.
function metabolism(item,now=Date.now()){
 const profile=breeds[item.type].care;
 return integrateGrowth(item,now,profile.dailyUse/24,profile.growthFloor);
}
function integrateGrowth(item,now,rate,growthFloor=55){
 const hours=Math.max(0,now-item.metabolicAt)*RATE/3600000;
 let left=hours,full=item.fullness,gain=0;
 for(const [floor,factor] of [[growthFloor,1],[25,.76],[8,.48],[0,.30]]){
   const span=Math.min(left,Math.max(0,(full-floor)/rate));gain+=span*factor;left-=span;full-=span*rate;
 }
 return {full:Math.max(0,full),body:item.bodyDays+(gain+left*.20)/24};
}
function feedIndividual(f,now=Date.now()){
 const item=garden.fish[f.id],m=metabolism(item,now);
 if(m.full>=88||now-(item.biteAt||0)<650)return false;
 markAdult(f,now);
 item.bodyDays=m.body;item.fullness=Math.min(100,m.full+breeds[item.type].care.bite+(currentVisit(now)?.type===BUTTERFLY?2:0));item.biteAt=item.metabolicAt=now;return true;
}
function grazeFilm(f,now){
 const item=garden.fish[f.id];
 if(now-(item.grazedAt??item.born)<45000)return;
 const m=metabolism(item,now);if(m.full>=55)return;
 item.bodyDays=m.body;item.fullness=Math.min(55,m.full+5);
 item.grazedAt=item.metabolicAt=now;save();
}
function growthOf(f,now=Date.now()){
 const item=garden.fish[f.id],age=Math.max(0,(now-item.born)*RATE/DAY),m=metabolism(item,now),maturity=Math.min(1,m.body/f.adult);
 const origin=Math.min(2.5,f.max*.1),elder=now>item.deathAt-(item.deathAt-item.born)*.13;
 let phase=elder?'暮年期':maturity>=1?'成年期':maturity<.04?(item.type===55?'稚龟期':f.kind==='鱼类'?'鱼苗期':'幼体期'):maturity<.18?'幼年期':'成长期';
 if(item.type===55)phase=elder?"老年龟":maturity>=1?"成龟":maturity<.10?"稚龟":maturity<.55?"幼龟":"亚成龟";
 return {age,maturity,full:m.full,body:m.body,length:(origin+(f.max-origin)*Math.sin(maturity*Math.PI/2))*traitScale(item.traits),phase,remaining:Math.max(0,(item.deathAt-now)*RATE/DAY)};
}
function gardenTime(now=Date.now()){return new Date(Date.UTC(2024,9,1,10,24)+Math.max(0,now-garden.created)*RATE);}
save();
function sceneImage(type){
 const index={33:2,34:3,35:4,37:5,27:6,54:7,52:8}[type];
 return index===undefined?breeds[type].image:fieldTextures[index];
}
