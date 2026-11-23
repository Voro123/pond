"use strict";
// One courtship opportunity per habitat and real half-minute. A successful
// pair swims together before its single fry joins the same habitat.
const pairings=new Map(),attempted=new Map();
const courtshipRound=30000,breedingRest=300000;
function readyParent(f,now){
 const item=garden.fish[f.id];
 if(!item||item.brood||f.kind!=='鱼类'||item.deathAt<=now||(item.restUntil||0)>now)return false;
 const growth=growthOf(f,now);
 return growth.maturity>=1&&growth.full>=55;
}
function matingTarget(s){
 const pair=pairings.get(s.fish.habitat);
 if(!pair||!pair.ids.includes(s.fish.id))return null;
 const other=swimmers.find(o=>o.fish.id===pair.ids.find(id=>id!==s.fish.id));
 if(s.type===BITTERLING)return musselSite;
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
 const type=parents[Math.floor(Math.random()*2)].type;
 const origin=[a,b].map(f=>({id:f.id,type:garden.fish[f.id].type}));
 const seed=Math.max(0,Math.min(.999999,(parents[0].seed+parents[1].seed)/2+(Math.random()-.5)*.30));
 if(type===BITTERLING&&garden.musselBrood)return false;
 for(const p of parents)p.restUntil=now+breedingRest;
 if(type===BANGGAI||type===BITTERLING){
  const brood={type,parents:origin,seed,due:now+45000,laid:now};
  if(type===BANGGAI)parents.find(p=>p.sex==='雄').brood=brood;else garden.musselBrood=brood;
  record(type===BANGGAI?'邦盖天竺鲷雄鱼含住了这一窝卵。':'彩石鲋在浅滩河蚌内产下了卵。');save();return true;
 }
 addFry(type,origin,seed,site,now);
 discover(garden,type);refreshPopulation();
 record('一尾'+breeds[type].breed+'鱼苗在'+(a.habitat==='reef'?'潮间礁池':'镜水庭')+'孵化。');
 save();note('鱼苗孵化 · '+breeds[type].breed);return true;
}
function addFry(type,parents,seed,site,now){
 const id='k'+String(garden.next++).padStart(2,'0');
 garden.fish[id]={...individual(type,now,seed),hatchery:true,parents,hatchPosition:site};
}
let releasePending=false;
async function releaseBroods(now){
 if(releasePending)return;
 const musselReady=garden.musselBrood?.due<=now&&localStock('pond').length<CAPACITY;
 const fatherReady=Object.values(garden.fish).some(p=>p.brood?.due<=now&&p.deathAt>now)&&localStock('reef').length<CAPACITY;
 if(!musselReady&&!fatherReady)return;
 releasePending=true;
 const created=garden.created;
 const commit=()=>{
  const latest=readState();if(latest.created!==created)return;
  garden=latest;rebuildRoster();let changed=false;
  function release(b,site){
   addFry(b.type,b.parents,b.seed,site,now);discover(garden,b.type);
   record(b.type===BANGGAI?'一尾邦盖天竺鲷幼鱼从父鱼嘴边游出。':'一尾彩石鲋幼鱼从河蚌开口游出。');
   changed=true;rebuildRoster();
  }
  if(garden.musselBrood?.due<=now&&localStock('pond').length<CAPACITY){
   release(garden.musselBrood,{x:musselSite.x,y:musselSite.y});delete garden.musselBrood;
  }
  for(const s of swimmers){
   const p=garden.fish[s.fish.id];
   if(p?.brood?.due<=now&&p.deathAt>now&&localStock('reef').length<CAPACITY){
    release(p.brood,{x:s.x,y:s.y});delete p.brood;s.releaseUntil=elapsed+4;
   }
  }
  if(changed){refreshPopulation();save();}
 };
 try{if(navigator.locks)await navigator.locks.request('niwa-hourly-shop',commit);else commit();}finally{releasePending=false;}
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
 void releaseBroods(now);
 const round=Math.floor(now/courtshipRound);
 for(const zone of garden.reef?['pond','reef']:['pond']){
  const pair=pairings.get(zone);
  if(pair){
   const [a,b]=pair.ids.map(id=>swimmers.find(s=>s.fish.id===id));
   if(!a||!b||now-pair.start>90000||!eligiblePair(a.fish,b.fish,now)){pairings.delete(zone);continue;}
   const nearHost=a.type!==BITTERLING||!garden.musselBrood&&[a,b].every(s=>Math.hypot((s.x-musselSite.x)*width,(s.y-musselSite.y)*height)<32);
   if(nearHost&&now-pair.start>3600&&Math.hypot((a.x-b.x)*width,(a.y-b.y)*height)<90){
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
 const reward=currentVisit()?.type===HERMIT_CRAB?2:1;
 garden.jade+=reward;record('清理'+name+'，获得 '+reward+' 庭玉。');save();
 splash(x,y,.65);render();updateDebrisLabel();note('已清理'+name+' · +'+reward+' 庭玉');return true;
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

// Fixed scene landmarks use the same world coordinates as the swimmers.
const musselSite={x:.34,y:.69};
function specialDestination(s,item,g,cycle){
 if(s.type===BETTA&&item.sex==='雄'&&g.maturity>=1&&(!item.nest||cycle<13)){
  return item.nest||{x:.23+.07*item.seed,y:.65+.03*item.seed};
 }
 if(s.type===BITTERLING&&garden.musselBrood?.parents.some(p=>p.id===s.fish.id)&&Date.now()-garden.musselBrood.laid<4500)return musselSite;
 if(s.type===BANGGAI&&item.parents&&Date.now()-item.born<15000)return {x:zoneStart('reef')/width+.71,y:.70};
 if(s.type===TRUMPETFISH&&cycle<15){
  let host=null,best=260;
  for(const peer of swimmers){
   if(peer.type===TRUMPETFISH||peer.fish.habitat!=='reef'||peer.fish.kind!=='鱼类'||peer.length<s.length*.8)continue;
   const distance=Math.hypot((s.x-peer.x)*width,(s.y-peer.y)*height);
   if(distance<best){host=peer;best=distance;}
  }
  if(host){
   const side=item.seed>.5?1:-1;
   return {x:host.x+(Math.cos(host.angle)*9-side*Math.sin(host.angle)*23)/width,y:host.y+(Math.sin(host.angle)*9+side*Math.cos(host.angle)*23)/height,host};
  }
 }
 return null;
}
function tendNest(s,item,site){
 if(!item.nest)item.nest={x:site.x,y:site.y,count:0,last:0};
 const n=item.nest,now=Date.now();
 if(now-n.last>5200){n.count=Math.min(24,n.count+3);n.last=now;save();}
 return now-n.last<1900;
}
function drawNurserySites(c){
 if(garden.musselBrood||swimmers.some(s=>s.type===BITTERLING)){
  c.save();c.translate(musselSite.x*width,musselSite.y*height);c.rotate(-.45);
  for(let i=0;i<5;i++){
   c.fillStyle=['#4b4839','#786b4c','#93835f','#ab9a74','#594e38'][i];
   c.beginPath();c.ellipse(-i*.7,i*.55,19-i*2,10-i*1.7,0,0,Math.PI*2);c.fill();
  }
  for(let i=0;i<3;i++){
   const t=(elapsed*.7+i/3)%1;c.strokeStyle='rgba(213,222,193,'+(.35*(1-t))+')';
   c.beginPath();c.arc(11+t*10,-2,2+t*5,-.7,.7);c.stroke();
  }
  c.restore();
 }
 for(const s of swimmers){
  const n=garden.fish[s.fish.id]?.nest;if(!n)continue;
  for(let i=0;i<n.count;i++){
   const a=i*2.4,r=2.2*Math.sqrt(i),x=n.x*width+r*Math.cos(a),y=n.y*height+r*Math.sin(a);
   c.beginPath();c.arc(x,y,2.3,0,Math.PI*2);c.fillStyle='#c9e6cd80';c.fill();c.strokeStyle='#eaf6e0bd';c.lineWidth=.7;c.stroke();
  }
 }
}
