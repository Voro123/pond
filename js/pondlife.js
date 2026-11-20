"use strict";
// One courtship opportunity per habitat and real half-minute. A successful
// pair swims together before its single fry joins the same habitat.
const pairings=new Map(),attempted=new Map();
const courtshipRound=30000,breedingRest=300000;
function readyParent(f,now){
 const item=garden.fish[f.id];
 if(!item||f.kind!=='鱼类'||item.deathAt<=now||(item.restUntil||0)>now)return false;
 const growth=growthOf(f,now);
 return growth.maturity>=1&&growth.full>=55;
}
function matingTarget(s){
 const pair=pairings.get(s.fish.habitat);
 if(!pair||!pair.ids.includes(s.fish.id))return null;
 const other=swimmers.find(o=>o.fish.id===pair.ids.find(id=>id!==s.fish.id));
 return other?{x:other.x,y:other.y}:null;
}
function eligiblePair(a,b,now){
 return a&&b&&a.id!==b.id&&a.habitat===b.habitat&&readyParent(a,now)&&readyParent(b,now)
   &&garden.fish[a.id].sex!==garden.fish[b.id].sex
   &&speciesKey(garden.fish[a.id].type)===speciesKey(garden.fish[b.id].type)
   &&localStock(a.habitat).length<CAPACITY;
}
function hatchFry(pair,site,now){
 const [a,b]=pair.ids.map(id=>koi.find(f=>f.id===id));
 if(!eligiblePair(a,b,now))return false;
 const parents=pair.ids.map(id=>garden.fish[id]);
 const type=parents[Math.floor(Math.random()*2)].type,id='k'+String(garden.next++).padStart(2,'0');
 const seed=Math.max(0,Math.min(.999999,(parents[0].seed+parents[1].seed)/2+(Math.random()-.5)*.30));
 const child={...individual(type,now,seed),hatchery:true,parents:[a,b].map(f=>({id:f.id,type:garden.fish[f.id].type})),hatchPosition:site};
 garden.fish[id]=child;for(const p of parents)p.restUntil=now+breedingRest;
 discover(garden,type);refreshPopulation();
 record('一尾'+breeds[type].breed+'鱼苗在'+(a.habitat==='reef'?'潮间礁池':'镜水庭')+'孵化。');
 save();note('鱼苗孵化 · '+breeds[type].breed);return true;
}
async function settlePair(pair,site){
 const commit=()=>{
   if(garden.created!==pair.garden)return;
   try{const latest=readState();if(latest.created!==pair.garden)return;garden=latest;rebuildRoster();}catch{}
   if(!hatchFry(pair,site,Date.now())){refreshPopulation();setBackdrop();}
 };
 if(navigator.locks)await navigator.locks.request('niwa-hourly-shop',commit);else commit();
}
function checkBreeding(now=Date.now()){
 const round=Math.floor(now/courtshipRound);
 for(const zone of garden.reef?['pond','reef']:['pond']){
  const pair=pairings.get(zone);
  if(pair){
   const [a,b]=pair.ids.map(id=>swimmers.find(s=>s.fish.id===id));
   if(!a||!b||now-pair.start>90000||!eligiblePair(a.fish,b.fish,now)){pairings.delete(zone);continue;}
   if(now-pair.start>3600&&Math.hypot((a.x-b.x)*width,(a.y-b.y)*height)<90){
    pairings.delete(zone);void settlePair(pair,{x:(a.x+b.x)/2,y:(a.y+b.y)/2});
   }
   continue;
  }
  if(attempted.get(zone)===round||localStock(zone).length>=CAPACITY)continue;
  attempted.set(zone,round);
  const pool=localStock(zone).filter(f=>readyParent(f,now));
  for(let i=0;i<pool.length&&!pairings.has(zone);i++)for(const b of pool.slice(i+1)){
   const a=pool[i];if(!eligiblePair(a,b,now))continue;
   if(sampleUnit([garden.created,round,a.id,b.id].join('/'))<.50){
    pairings.set(zone,{ids:[a.id,b.id],garden:garden.created,start:now});break;
   }
  }
 }
}
const debrisImages=debrisTextures.map(src=>{const img=new Image();img.src=src;return img;});
function debrisState(zone,now){
 garden.flotsam??={};
 return garden.flotsam[zone]??={items:[],nextAt:now+35000,cleared:0};
}
function replenishDebris(now=Date.now()){
 let dirty=false;
 for(const zone of garden.reef?['pond','reef']:['pond']){
  const missing=!garden.flotsam?.[zone],state=debrisState(zone,now);dirty||=missing;
  while(state.items.length<3&&now>=state.nextAt){
   const key=[garden.created,zone,state.nextAt].join('/'),rand=n=>sampleUnit(key+n);
   state.items.push({id:key,kind:Math.floor(rand(0)*3),x:.25+rand(1)*.48,y:.32+rand(2)*.38,angle:rand(3)*Math.PI,phase:rand(4)*10});
   state.nextAt+=Math.round(85000+rand(5)*75000);dirty=true;
  }
 }
 if(dirty)save();updateDebrisLabel();
}
function debrisPosition(zone,p){
 const t=(Date.now()-garden.created)/1000;
 return {x:zoneStart(zone)+(p.x+.009*Math.sin(t*.035+p.phase))*width,
         y:(p.y+.009*Math.cos(t*.067+p.phase))*height,angle:p.angle+.16*Math.sin(t*.09+p.phase)};
}
let highlightedDebris=null;
function drawDebris(c){
 for(const [zone,state] of Object.entries(garden.flotsam||{}))for(const p of state.items){
  const img=debrisImages[p.kind];if(!img.naturalWidth)continue;
  const pos=debrisPosition(zone,p),w=[38,48,41][p.kind],h=w*img.height/img.width;
  c.save();c.translate(pos.x,pos.y);c.rotate(pos.angle);c.shadowColor='#14291677';c.shadowBlur=2;c.shadowOffsetY=2;
  c.drawImage(img,-w/2,-h/2,w,h);c.restore();
  if(highlightedDebris?.id===p.id&&performance.now()<highlightedDebris.until){
    c.save();c.strokeStyle='#e8e4b5ba';c.lineWidth=1/zoom;c.beginPath();c.ellipse(pos.x,pos.y,30,23,0,0,2*Math.PI);c.stroke();c.restore();
  }
 }
}
function pickDebris(x,y){
 const zone=zoneAt(x*width),state=garden.flotsam?.[zone];if(!state)return false;
 const index=state.items.findIndex(p=>{const pos=debrisPosition(zone,p);return Math.hypot(pos.x-x*width,pos.y-y*height)<Math.max(23,18/zoom);});
 if(index<0)return false;
 const [item]=state.items.splice(index,1);state.nextAt=Math.max(Date.now()+65000,state.nextAt);state.cleared++;
 const name=['枯叶','断枝','浮藻'][item.kind];
 garden.jade+=1;record('清理'+name+'，获得 1 庭玉。');save();
 splash(x,y,.65);render();updateDebrisLabel();note('已清理'+name+' · +1 庭玉');return true;
}
function updateDebrisLabel(){
 const n=garden.flotsam?.[garden.zone]?.items.length||0,button=$('#debrisHint');
 button.hidden=!n;button.textContent='待清理 '+n+' · 定位';
}
$('#debrisHint').onclick=()=>{const p=garden.flotsam?.[garden.zone]?.items[0];if(!p)return;
 highlightedDebris={id:p.id,until:performance.now()+4200};
 const pos=debrisPosition(garden.zone,p);placeCamera(pos.x,pos.y);note('轻点水面中央的'+['枯叶','断枝','浮藻'][p.kind]+'即可清理');};
// Trails belong to individual animals, so their tracks never join across a
// habitat switch, reload, or another animal's movement.
const goldenTracks=new Map();
function traceGold(c,id,traits,x,y){
 if(!traits?.includes('glow'))return;
 const now=performance.now()/1000;
 let track=goldenTracks.get(id);
 if(!track){track=[];goldenTracks.set(id,track);}
 while(track.length&&now-track[0].t>2.4)track.shift();
 const last=track.at(-1);
 if(last&&Math.hypot(last.x-x,last.y-y)>100)track.length=0;
 if(!track.length||Math.hypot(track.at(-1).x-x,track.at(-1).y-y)>2)track.push({x,y,t:now});
 c.save();c.globalCompositeOperation='screen';c.lineCap='round';
 for(let i=1;i<track.length;i++){
  const a=track[i-1],b=track[i],fade=Math.max(0,1-(now-a.t)/2.4);
  c.strokeStyle='rgba(239,194,91,'+(.24*fade)+')';c.lineWidth=1+2.5*fade;
  c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();
  if(i%3===0){c.fillStyle='rgba(255,227,143,'+(.65*fade)+')';c.fillRect(a.x+2*Math.sin(a.t*8),a.y-2,1.4,1.4);}
 }
 c.restore();
}
setInterval(()=>{
 const cutoff=performance.now()/1000-4;
 for(const [id,path] of goldenTracks)if(!path.length||path.at(-1).t<cutoff)goldenTracks.delete(id);
},5000);
