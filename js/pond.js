"use strict";
const pond=$('#pond'),canvas=$('#water'),scene=document.createElement('canvas'),ctx=scene.getContext('2d');
const background=new Image();background.src=pondTextures[0];
const reefBackground=new Image();reefBackground.src=reefTexture;
const boardwalk=new Image();boardwalk.src=deckTexture;
const overlay=document.createElement('canvas');overlay.className='surface';pond.insertBefore(overlay,canvas.nextSibling);
let surface=null;
try{surface=makeWaterSurface(overlay);}catch{}
const display=canvas.getContext('2d');
const width=2000,height=1125,cam={x:0,y:0};
let zoom=1,vw=0,vh=0,dpr=1,elapsed=0,previous=0;
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
const ripples=[],food=[];
const DECK=96;
function zoneStart(zone){return zone==='reef'?width+DECK:0;}
function worldWidth(){return garden.reef?width*2+DECK:width;}
function zoneAt(x){return x<width?'pond':garden.reef&&x>=width+DECK?'reef':null;}
function placeCamera(x,y){
 const view=vw/zoom;
 cam.x=clamp(x-view/2,0,Math.max(0,worldWidth()-view));cam.y=clamp(y-vh/zoom/2,0,Math.max(0,height-vh/zoom));
 const active=garden.reef&&cam.x+view/2>=width+DECK/2?'reef':'pond';
 if(active!==garden.zone){
   garden.zone=active;garden.focusFrog=null;rebuildRoster();buildTiles();setBackdrop();render();save();
 }
}
function sizeCanvas(){
 const x=vw?cam.x+vw/zoom/2:(zoneStart(garden.zone)+width*.423),y=vh?cam.y+vh/zoom/2:height*.49;
 vw=canvas.clientWidth;vh=canvas.clientHeight;zoom=Math.max(vw/1520,vh/815,.69);dpr=Math.min(devicePixelRatio,1.4);
 for(const c of [canvas,scene,overlay]){c.width=Math.round(vw*dpr);c.height=Math.round(vh*dpr);}
 placeCamera(x,y);
}
function splash(x,y,power=1){ripples.push({x,y,power,age:0});if(ripples.length>36)ripples.shift();if(power>.13)waterSound(power);}
function locateFish(id){const s=swimmers.find(s=>s.fish.id===id);if(s)placeCamera(s.x*width,s.y*height);}
function waterPoint(x,y,required){
 const zone=zoneAt(x*width);
 if(!zone||(required&&required!==zone))return false;
 x-=zoneStart(zone)/width;
 if(zone==='reef')return x>.03&&x<.98&&y>.03&&y<.975&&x+.8*y>.19;
 return x>.045&&x<.98&&y>.025&&y<.98&&x+.68*y>.33&&!(x<.16&&y>.69)&&!(x>.75&&y<.22);
}
const starts=[[.43,.47,2.38],[.58,.37,.9],[.29,.58,-.85],[.56,.68,-2.5],[.36,.32,1.6],[.43,.73,-.45]];
const SPINE_SEGMENTS=36, TENCH=12;
const rippleResponses={
 bold:{duration:2.8,speed:76,action:'游近察看水纹'},
 patient:{duration:1.9,speed:0,action:'放慢游速，等水面平静'},
 wander:{duration:2.6,speed:88,action:'绕开水纹'},
 home:{duration:3.3,speed:82,action:'游回老地方'}
};
let swimmers=[];
function syncSwimmers(){swimmers=koi.map((fish,i)=>{
  const existing=swimmers.find(s=>s.fish.id===fish.id);if(existing){existing.fish=fish;return existing;}
  const type=garden.fish[fish.id].type;
  const rigid=[55,57,58,59,NERITE].includes(type);
  const sprite=new Image();sprite.src=sceneImage(type);
  const tint=coloration(fish),colored=document.createElement('canvas');
  if(tint!=='none')sprite.onload=()=>{
    colored.width=sprite.width;colored.height=sprite.height;
    const c=colored.getContext('2d');c.filter=tint;c.drawImage(sprite,0,0);
  };
  let [x,y,angle]=starts[i%starts.length];
  if(fish.habitat==='reef'){x+=.11;y+=.06;}
  const seed=garden.fish[fish.id].seed;
  if(fish.habit==='host'){x=.70+seed*.065;y=.70+seed*.055;}
  else if(fish.habit==='scrape'){x=.29+seed*.045;y=.68+seed*.04;}
  else if(fish.habit==='bask'){x=.22;y=.68;}
  x+=zoneStart(fish.habitat)/width;
  if(garden.fish[fish.id].hatchPosition)({x,y}=garden.fish[fish.id].hatchPosition);
  const home={x,y};
  const bones=Array.from({length:SPINE_SEGMENTS+1},()=>({x:0,y:0,along:0,across:0}));
  return {fish,type,rigid,style:fish.kind==='鱼类'?disposition(fish):null,sprite,colored,home,x,y,angle,target:null,phase:i*1.9,length:0,turnIn:3+i,angular:0,speed:18,bend:0,bones,wake:1};
});}
syncSwimmers();
new ResizeObserver(sizeCanvas).observe(pond);sizeCanvas();
function startHatchetJump(s,x,y){
 if(elapsed<(s.jumpReady||0))return;
 const away=Math.atan2((s.y-y)*height,(s.x-x)*width);
 for(const offset of [0,.8,-.8,Math.PI]){
  const angle=away+offset,dx=70*Math.cos(angle)/width,dy=70*Math.sin(angle)/height;
  if(!waterPoint(s.x+dx,s.y+dy,'pond')||!waterPoint(s.x+dx/2,s.y+dy/2,'pond'))continue;
  s.jump={x:s.x,y:s.y,dx,dy,start:elapsed};s.jumpReady=elapsed+4;
  s.angle=angle;s.angular=0;splash(s.x,s.y,.45);return;
 }
}
function advanceHatchetJump(s,dt){
 const j=s.jump,t=Math.min(1,(elapsed-j.start)/.56);
 s.x=j.x+t*j.dx;s.y=j.y+t*j.dy;s.lift=72*t*(1-t);
 s.activity=s.speciesAction='受惊跃水';s.signature=null;poseFish(s,dt);
 if(t===1){s.jump=null;s.speed=42;s.landedAt=elapsed;splash(s.x,s.y,.8);}
}
function paddleWater(x,y,power,observationTap=false){
 if(!waterPoint(x,y))return;
 splash(x,y,power);
 const zone=zoneAt(x*width),radius=power>1?210:160;
 if(!observationTap&&zone==='pond')disturbTadpoles(x,y);
 for(const s of swimmers){
   if(!s.style||s.fish.habitat!==zone||s.rippleResponse?.readyAt>elapsed)continue;
   const dx=(s.x-x)*width,dy=(s.y-y)*height,d=Math.hypot(dx,dy);
   if(d>=radius)continue;
   if(s.type===BUTTERFLY_FISH){
     s.wave={x,y,start:elapsed};continue;
   }
   if(observationTap)continue;
   if(s.type===HATCHETFISH&&d<135){startHatchetJump(s,x,y);continue;}
   if(s.type===CLOWNFISH){
    s.rippleResponse={target:s.home,until:elapsed+3.6,readyAt:elapsed+4.5,profile:{action:'返回海葵',speed:110},strength:1};continue;
   }
   if(s.type===FIREFISH){
    const shelter=reefPoint(.15,.22);
    if(Math.hypot((s.x-shelter.x)*width,(s.y-shelter.y)*height)<100){
     s.retreatUntil=elapsed+3;s.rippleResponse={target:reefPoint(.125,.19),until:s.retreatUntil,readyAt:elapsed+4,profile:{action:'急退入洞',speed:150},strength:1};continue;
    }
   }
   const profile=rippleResponses[s.style];
   let target={x:s.x+Math.cos(s.angle)*80/width,y:s.y+Math.sin(s.angle)*80/height};
   const away=d>0?Math.atan2(dy,dx):s.angle;
   if(s.style==='bold'){
     const offset=Math.min(d,38);
     target={x:x+Math.cos(away)*offset/width,y:y+Math.sin(away)*offset/height};
   }else if(s.style==='wander'){
     const side=Math.sin(s.angle-away)>=0?1:-1;
     const bypass=away+side*1.05;
     target={x:s.x+Math.cos(bypass)*180/width,y:s.y+Math.sin(bypass)*180/height};
     if(!waterPoint(target.x,target.y,zone)){
       const otherSide=away-side*1.05;
       target={x:s.x+Math.cos(otherSide)*180/width,y:s.y+Math.sin(otherSide)*180/height};
     }
   }else if(s.style==='home')target=s.home;
   if(s.style!=='patient'&&!waterPoint(target.x,target.y,zone))continue;
   const until=elapsed+profile.duration;
   s.rippleResponse={target,until,readyAt:until+.85,profile,strength:.55+.45*(1-d/radius)};
 }
}
function steer(s,dt,i){
 const g=growthOf(s.fish),bodyScale=traitScale(garden.fish[s.fish.id].traits);s.length=(28+151*Math.pow(g.length/bodyScale/65,.7))*bodyScale;
 if(s.jump){advanceHatchetJump(s,dt);return;}
 const hx=s.x*width,hy=s.y*height,bank=zoneStart(s.fish.habitat)/width;
 const fullness=g.full,habit=s.fish.habit,seed=garden.fish[s.fish.id].seed;
 const hunger=1-fullness/100;
 const response=s.rippleResponse?.until>elapsed?s.rippleResponse:null;
 let meal=null,waiting=false,schooled=false,dist=(145+575*hunger*hunger)*(s.style==='bold'?1.35:1);
 const item=garden.fish[s.fish.id];
 const eligible=!item.brood&&!response&&fullness<88 && Date.now()-(garden.fish[s.fish.id].biteAt||0)>650;
 for(const p of food){
   if(!eligible||p.air>0||zoneAt(p.x*width)!==s.fish.habitat)continue;
   if(habit==='scrape'?p.kind!=='algae':p.kind!=='grain'&&habit!=='graze')continue;
   const d=Math.hypot(hx-p.x*width,hy-p.y*height);if(d>=dist)continue;
   if(s.style==='patient'&&s.type!==STRIPED_KILLIFISH&&elapsed-p.castAt<3){waiting=true;continue;}
   dist=d;meal=p;
 }
 let wave=s.wave;
 if(wave){
  const time=elapsed-wave.start;
  if(time>(wave.pellet?3.2:1.5)||wave.pellet&&!food.includes(wave.pellet)){s.wave=wave=null;}
 }
 if(wave){meal=wave.pellet&&fullness<88?wave.pellet:null;waiting=false;if(meal)dist=Math.hypot(meal.x*width-hx,meal.y*height-hy);}
 s.turnIn-=dt;
 if(!s.target||s.turnIn<0||Math.hypot(s.target.x*width-hx,s.target.y*height-hy)<65){
   let angle=s.angle+(Math.random()-.5)*1.9;
   const range=s.style==='wander'?460:270;
   let x=s.x+Math.cos(angle)*range/width,y=s.y+Math.sin(angle)*range/height;
   if(!waterPoint(x,y,s.fish.habitat)){x=bank+.22+.52*Math.random();y=.26+.52*Math.random();}
   s.target={x,y};s.turnIn=7+Math.random()*9;
 }
 const hour=gardenTime().getUTCHours();
 const type=s.type;
 const cycle=(elapsed+seed*47)%(12+seed*13+(type%5)*.7);
 let activityScale=1,turnHome=false;
 let alignedSchool=false;
 switch(habit){
 case 'scrape':turnHome=true;activityScale=cycle<3?.08:.62;break;
 case 'host': case 'shelter':turnHome=cycle<13||Math.hypot(s.x-s.home.x,s.y-s.home.y)>.13;activityScale=cycle<3?.05:.8;break;
 case 'bottom':case 'graze':
   activityScale=type===TENCH?1.12+.22*Math.cos(elapsed*.55+seed*7):cycle<7?.025:.58;break;
 case 'ambush':activityScale=cycle<12?.006:1.18;break;
 case 'night':activityScale=hour>=7&&hour<=18?(cycle<10?.012:.26):1.12;turnHome=hour>=7&&hour<=18;break;
 case 'bask':activityScale=cycle<14?.006:.47;turnHome=true;break;
 case 'dart':activityScale=cycle<4?1.85:cycle<8?.08:.72;break;
 case 'glide':activityScale=.7+.23*Math.cos(elapsed*.23+seed*7);break;
 }
 const returning=s.style==='home'&&Math.hypot((s.x-s.home.x)*width,(s.y-s.home.y)*height)>100;
 turnHome||=returning;
 const partner=response?null:matingTarget(s);
 const site=!response&&!partner&&!meal?(specialDestination(s,item,g,cycle)||(s.fish.habitat==='reef'?reefDestination(s,seed,hour):bottomDestination(s,seed,hour))):null;
 let foodTarget=meal;
 if(type===PEA_PUFFER&&meal&&!partner&&dist<65){
  if(s.inspectBatch!==meal.batch){s.inspectBatch=meal.batch;s.inspectStart=elapsed;}
  const t=elapsed-s.inspectStart;
  if(t<1.6){
   const bearing=Math.atan2(hy-meal.y*height,hx-meal.x*width)+(seed>.5?1:-1)*.7;
   foodTarget={x:meal.x+Math.cos(bearing)*24/width,y:meal.y+Math.sin(bearing)*24/height};
  }
 }
 const target=wave||response?.target||partner||foodTarget||site||(turnHome?{x:s.home.x+.023*Math.cos(elapsed*.12+seed*11),y:s.home.y+.029*Math.sin(elapsed*.16+seed*11)}:s.target);
 let vx=target.x*width-hx,vy=target.y*height-hy;
 const norm=Math.max(1,Math.hypot(vx,vy));vx/=norm;vy/=norm;
 if(!site&&!response&&!partner&&!meal&&(habit==='host'||habit==='school')){
   const peers=swimmers.filter(other=>other!==s&&other.fish.breed===s.fish.breed);
   if(peers.length){const peer=peers.reduce((best,c)=>Math.hypot(c.x-s.x,c.y-s.y)<Math.hypot(best.x-s.x,best.y-s.y)?c:best);
    const dx=(peer.x-s.x)*width,dy=(peer.y-s.y)*height,d=Math.max(1,Math.hypot(dx,dy));
    schooled=d<145;
    if(type===MEDAKA&&schooled){
     const weight=2.4;
     vx+=Math.cos(peer.angle)*weight;vy+=Math.sin(peer.angle)*weight;
     alignedSchool=d>18&&d<105&&Math.cos(peer.angle-s.angle)>.90&&s.speed>10&&peer.speed>10;
    }
    vx+=Math.cos(peer.angle)*.7+dx/d*Math.min(3,d/80);vy+=Math.sin(peer.angle)*.7+dy/d*Math.min(3,d/80);}
 }
 for(const other of swimmers){if(other===s||other===site?.host||partner&&(type===BITTERLING||spawningBeds[type]))continue;const dx=hx-other.x*width,dy=hy-other.y*height,d=Math.hypot(dx,dy);if(d<65&&d>0){vx+=dx/d*(1-d/65)*.8;vy+=dy/d*(1-d/65)*.8;}}
 const lookahead=Math.max(80,s.length);
 if(!waterPoint(s.x+Math.cos(s.angle)*lookahead/width,s.y+Math.sin(s.angle)*lookahead/height,s.fish.habitat)){vx+=(bank+.5-s.x)*6;vy+=(.5-s.y)*6;}
 const diff=Math.atan2(Math.sin(Math.atan2(vy,vx)-s.angle),Math.cos(Math.atan2(vy,vx)-s.angle));
 const inspecting=type===PEA_PUFFER&&meal&&dist<65;
 const restRadius=shallowRestRadius[type];
 const turnSpeed=site||partner||wave||response||inspecting||(type===STRIPED_KILLIFISH||restRadius)&&meal?Math.max(65,s.speed):s.speed;
 const turnRadius=s.length*((response||meal) ? .36 : .47);
 const turn=Math.min(response?1.8:meal?1.35:.85,turnSpeed/Math.max(12,turnRadius));
 const restingAtSite=site&&restRadius&&norm<restRadius;
 if(restingAtSite)s.angular=0;
 else s.angular+=(clamp(diff*(wave?5:1.8),wave?-4:-turn,wave?4:turn)-s.angular)*(1-Math.exp(-dt*(wave?8:2.4)));
 s.angle+=s.angular*dt;
 const cruise=24*s.fish.pace*(.84+.032*(type%11))*(.9+.17*Math.sin(elapsed*.85+i));
 const ranging=s.style==='wander'&&!turnHome&&activityScale>=.5;
 const personalAction=meal?s.style==='bold':waiting||returning||ranging;
 s.signature=!response&&!partner&&personalAction?individualHabits[s.style].action:null;
 s.activity=response?.profile.action||(partner?'正在求偶':s.signature||(
   meal?'正在觅食':activityScale<.1?'驻足休息':habit==='scrape'?'沿石刮藻':schooled?'结伴游动':turnHome?'绕巢活动':
   habit==='host'||habit==='school'?'独自巡游':activity[habit][0]));
 if(!response&&habit==='scrape'&&!meal&&activityScale>=.1&&fullness<55)grazeFilm(s.fish,Date.now());
 let speed=partner?62:meal?Math.min(40+95*hunger,22+dist*(.22+.48*hunger)):cruise*activityScale;
 if(s.style==='bold'&&meal)speed*=1.28;
 if(waiting&&!meal)speed*=.15;
 if(habit==='scrape')speed=Math.min(8,speed);
 if(response)speed=Math.min(response.profile.speed*response.strength,Math.max(0,norm-8)*1.6);
 s.speciesAction=null;
 if(wave){
  const striking=meal&&elapsed-wave.start>.45&&Math.abs(diff)<.55;
  speed=striking?Math.min(145,25+dist*1.2):0;
  s.activity=striking?'循波扑食':'辨认水面细波';
  if(striking)s.speciesAction=s.activity;
  s.signature=null;
 }else if(s.type===CUTTLEFISH){
  const resting=!meal&&activityScale<.1;
  s.camouflage=clamp((s.camouflage||0)+(resting?dt*.95:-dt*.8),0,1);
  if(resting&&s.camouflage>.55)s.activity=s.speciesAction='贴底变纹';
 }
 if(site||partner&&(type===BITTERLING||spawningBeds[type])){
  speed=Math.min(site?.host?site.host.speed+28:50,norm*1.2);
  if(norm<20&&type===BETTA&&tendNest(s,item,site))s.speciesAction='补筑泡巢';
  if(site?.host&&norm<40&&Math.cos(s.angle-site.host.angle)>.65)s.speciesAction='伴影潜行';
  if(type===BITTERLING&&site&&norm<30&&item.sex==='雌')s.speciesAction='蚌口产卵';
 }
 if(type===BANGGAI){
  if(item.brood){speed*=.42;s.activity='含卵护幼';}
  if(s.releaseUntil>elapsed)s.speciesAction='释出幼鱼';
 }
 if(type===AXOLOTL&&meal&&dist<36&&Math.abs(diff)<.85){
  const pull=1-Math.exp(-dt*8);meal.x+=(s.x-meal.x)*pull;meal.y+=(s.y-meal.y)*pull;
  s.suctionUntil=elapsed+.55;speed=2;
 }
 if(s.suctionUntil>elapsed)s.speciesAction='张口吸食';
 if(type===MEDAKA&&alignedSchool)s.speciesAction='贴水并巡';
 if(type===STRIPED_KILLIFISH&&!response&&!partner){
  if(meal&&elapsed-meal.castAt<2.6&&dist<150&&Math.abs(diff)<.65){
   speed=Math.min(145,42+dist);s.speciesAction='掠取浮食';s.strikeUntil=elapsed+.5;
  }else if(!meal&&cycle<8){speed=1;s.activity='贴水伏候';s.signature=null;}
  if(s.strikeUntil>elapsed)s.speciesAction='掠取浮食';
 }
 if(type===HATCHETFISH&&elapsed-s.landedAt<.8)s.speciesAction='跃水回落';
 if(reefAction(s,site||response?.target,norm,hour)&&(!response||type===FIREFISH))s.speciesAction=reefHabits[type][0];
 if(type===LIONFISH&&meal&&!partner&&dist<115&&Math.abs(diff)<.8){
  speed=dist>24?16:66;s.speciesAction=reefHabits[type][0];
 }
 if(type===BLUE_TANG&&meal&&!partner&&dist<160&&dist>14&&elapsed-meal.castAt<4){
  speed=Math.min(95,30+dist*.7);s.speciesAction=reefHabits[type][0];
 }
 if(type===SLEEPER){
  if(site&&norm<24)s.ambushFromCover=true;
  if(response||partner||Math.hypot((s.x-rockGap.x)*width,(s.y-rockGap.y)*height)>115)s.ambushFromCover=false;
  if(s.ambushFromCover&&meal&&dist<110&&Math.abs(diff)<.8){speed=Math.min(125,32+dist);s.speciesAction=shallowHabits[type][0];}
 }
 if(inspecting){
  // Finish the arc facing the morsel before the final short approach.
  if(foodTarget!==meal){speed=30;s.speciesAction=shallowHabits[type][0];}
  else speed=Math.min(speed,dist*1.4)*Math.max(.05,Math.cos(diff));
 }
 if(spawningBeds[type]&&partner&&norm<30)s.activity='清理产卵面';
 let handling=false;
 if(isGourami(type)||type===CHERRY_SHRIMP||type===BLUE_CRAYFISH){
  handling=handleShallowFood(s,!partner&&meal,dist,diff,dt);
  if(handling){speed=0;s.speciesAction=shallowHabits[type][0];}
 }else if(bottomAction(s,site)){
  s.speciesAction=shallowHabits[type][0];
  if(type===PLECO)speed=Math.min(speed,3);
 }
 if(type===CLOWNFISH&&response&&norm<42)s.speciesAction=shallowHabits[type][0];
 if(type===NERITE)updateScrapeTrail(s);
 if(type===TENCH&&meal&&meal.kind==='algae'&&dist<38&&Math.abs(diff)<.8){speed=Math.min(speed,18);s.speciesAction=shallowHabits[type][0];}
 if(s.speciesAction){s.signature=null;s.activity=s.speciesAction;}
 if(garden.fish[s.fish.id].traits.includes('fast'))speed*=1.5;
 speed/=1+Math.min(Math.abs(diff),1.1)*.45;
 if(restRadius&&(site||meal)&&!partner)speed*=Math.max(0,Math.cos(diff));
 if(restingAtSite)s.speed=0;
 else s.speed+=(speed-s.speed)*(1-Math.exp(-dt*(response?3.4:1.6)));
 const nextX=s.x+Math.cos(s.angle)*s.speed*dt/width,nextY=s.y+Math.sin(s.angle)*s.speed*dt/height;
 if(!response||waterPoint(nextX,nextY,s.fish.habitat)){s.x=nextX;s.y=nextY;}
 s.phase=(s.phase+dt*(.9+s.speed*.105))%(Math.PI*2);
 if(meal&&foodTarget===meal&&!handling&&(!wave||s.speciesAction)&&dist<10&&feedIndividual(s.fish)){eatGrain(meal);save();const cared=nourish(s.fish);if(cared)record('「'+s.fish.breed+'」得到一次照料。');if(!meal.batch.has(s.fish.id)){meal.batch.add(s.fish.id);record('「'+s.fish.breed+'」游来吃下了鱼食。');save();}}
 poseFish(s,dt);
 s.wake-=dt;if(s.wake<=0 && s.speed>18){const tail=s.bones[SPINE_SEGMENTS];splash(tail.x/width,tail.y/height,.095);s.wake=1.6+Math.random()*.6;}
}
function poseFish(s,dt){
 const turn=clamp(-s.angular*s.length/Math.max(10,s.speed),-.50,.50);
 s.bend+=(turn-s.bend)*(1-Math.exp(-dt*5));
 const headX=s.x*width,headY=s.y*height,step=s.length/SPINE_SEGMENTS;
 const cos=-Math.cos(s.angle),sin=-Math.sin(s.angle);
 const quiet=s.fish.habit==='ambush'||s.fish.kind!=='鱼类';
 const beat=(quiet?.11:.36)*Math.min(1,.28+s.speed/24);
 let along=0,across=0;
 for(let n=0;n<=SPINE_SEGMENTS;n++){
   if(n>0){
     const u=(n-.5)/SPINE_SEGMENTS;
     // Keep the head steady and build the turn and tail beat along the spine.
     const tangent=s.rigid?0:u*u*(s.bend+beat*Math.sin(s.phase-u*5.3));
     along+=step*Math.cos(tangent);across+=step*Math.sin(tangent);
   }
   const bone=s.bones[n];
   bone.along=along;bone.across=across;
   bone.x=headX+along*cos-across*sin;
   bone.y=headY+along*sin+across*cos;
 }
}
function pondActivity(f){return swimmers.find(s=>s.fish.id===f.id)?.activity||activity[f.habit][0];}
// Sample the static seabed once. Local light variation selects mantle markings.
let reefTones;
function reefContrast(x,y){
 if(!reefTones&&reefBackground.naturalWidth){
  const map=document.createElement('canvas');map.width=128;map.height=72;
  const c=map.getContext('2d');c.drawImage(reefBackground,0,0,128,72);
  reefTones=c.getImageData(0,0,128,72).data;
 }
 if(!reefTones)return 0;
 const col=clamp(Math.round(x*127),2,125),row=clamp(Math.round(y*71),2,69);
 let min=255,max=0;
 for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
  const i=((row+dy)*128+col+dx)*4,luma=.3*reefTones[i]+.59*reefTones[i+1]+.11*reefTones[i+2];
  min=Math.min(min,luma);max=Math.max(max,luma);
 }
 return clamp((max-min-16)/45,0,1);
}
function mantlePatterns(s,img){
 if(s.patternSource===img)return s.patterns;
 s.patternSource=img;
 s.patterns=[false,true].map(mottled=>{
  const layer=document.createElement('canvas');layer.width=240;layer.height=Math.max(1,Math.round(240*img.height/img.width));
  const c=layer.getContext('2d');c.drawImage(img,0,0,layer.width,layer.height);
  c.globalCompositeOperation='source-atop';c.scale(layer.width,layer.height);
  c.fillStyle=mottled?'rgba(122,100,76,.48)':'rgba(213,199,158,.60)';
  c.beginPath();c.ellipse(.65,.5,.32,.31,0,0,Math.PI*2);c.fill();
  if(mottled)for(let i=0;i<32;i++){
   const a=i*2.4,r=Math.sqrt(i/32);c.fillStyle=i%2?'#bba98b':'#705f4a';
   c.beginPath();c.ellipse(.65+.28*r*Math.cos(a),.5+.25*r*Math.sin(a),.021,.038,0,0,Math.PI*2);c.fill();
  }
  return layer;
 });
 return s.patterns;
}
function drawFish(s){
 if(!s.sprite.naturalWidth||!s.bones.length)return;
 const img=s.colored.width===s.sprite.width?s.colored:s.sprite,h=s.length*img.height/img.width;
 const mid=s.bones[17];
 if(mid.x+s.length<cam.x||mid.x-s.length>cam.x+vw/zoom||mid.y+s.length<cam.y||mid.y-s.length>cam.y+vh/zoom){if(!huntRun&&s.fish.id===garden.selected)markAt(mid.x,mid.y);return;}
 if(s.scrapeTrail)drawScrapeTrail(ctx,s.scrapeTrail);
 const tail=s.bones[SPINE_SEGMENTS];
 traceGold(ctx,s.fish.id,garden.fish[s.fish.id].traits,tail.x,tail.y);ctx.save();ctx.translate(mid.x+7,mid.y+10);ctx.rotate(s.angle);
 const shadow=ctx.createRadialGradient(0,0,0,0,0,1);shadow.addColorStop(0,'#04191270');shadow.addColorStop(1,'#04191200');ctx.scale(s.length*.53,h*.36);ctx.fillStyle=shadow;ctx.fillRect(-1,-1,2,2);ctx.restore();
 if(s.jump||s.speciesAction===shallowHabits[BASKING_TURTLE][0])return;
 if(s.speciesAction==='贴水并巡'||s.speciesAction==='掠取浮食'){
  ctx.save();ctx.translate(mid.x,mid.y);ctx.rotate(s.angle);
  ctx.strokeStyle='#d3f3e280';ctx.lineWidth=1;ctx.beginPath();
  for(const side of [-1,1]){
   ctx.moveTo(s.length*.20,side*h*.3);
   ctx.quadraticCurveTo(0,side*h*.65,-s.length*.64,side*(h*.7+4));
  }
  ctx.stroke();ctx.restore();
 }
 const tucked=s.speciesAction&&(s.type===DOJO||s.type===KUHLI||s.type===FIREFISH);
 ctx.globalAlpha=tucked?.52:.94;
 if(s.rigid){ctx.save();ctx.translate(s.x*width,s.y*height);ctx.rotate(s.angle+Math.PI);ctx.drawImage(img,0,-h*.5,s.length,h);
  if(s.type===CUTTLEFISH&&s.camouflage>0){
   const [sand,reef]=mantlePatterns(s,img),contrast=reefContrast(mid.x/width-zoneStart('reef')/width,mid.y/height);
   ctx.globalAlpha=s.camouflage;ctx.drawImage(sand,0,-h*.5,s.length,h);
   ctx.globalAlpha=s.camouflage*contrast;ctx.drawImage(reef,0,-h*.5,s.length,h);
  }
  ctx.restore();}
 else if(s.type===MORAY&&s.speciesAction){
  // The head projects from the crevice while the long body stays in shade.
  ctx.save();ctx.beginPath();ctx.arc(s.x*width,s.y*height,Math.max(12,s.length*.39),0,2*Math.PI);ctx.clip();
  drawContinuousBody(ctx,s,img,h);ctx.restore();
 }else drawContinuousBody(ctx,s,img,h);
 ctx.globalAlpha=1;
 drawShallowAction(ctx,s);drawReefDetail(ctx,s);
 if(s.activity==='清理产卵面'||spawningBeds[s.type]&&s.speciesAction){
  ctx.save();ctx.translate(s.x*width,s.y*height);ctx.rotate(s.angle);
  const pulse=(elapsed*1.8)%1;ctx.strokeStyle='rgba(199,213,181,'+(.60*(1-pulse))+')';
  ctx.beginPath();ctx.ellipse(1,0,2+pulse*6,1+pulse*4,0,-1.1,1.1);ctx.stroke();ctx.restore();
 }
 if(s.suctionUntil>elapsed||garden.fish[s.fish.id].brood){
  ctx.save();ctx.translate(s.x*width,s.y*height);ctx.rotate(s.angle);
  const size=Math.max(2,s.length*.045);
  ctx.fillStyle=s.type===AXOLOTL?'#85474b':'#bba886';
  ctx.beginPath();ctx.ellipse(-size,0,size*(.8+.18*Math.sin(elapsed*14)),size*1.25,0,0,Math.PI*2);ctx.fill();ctx.restore();
 }
 if(!huntRun&&s.fish.id===garden.selected&&!garden.focusFrog)markAt(mid.x,mid.y-h*.65-9);
}
// Skin the spine in a local raster first. Every strip has the same transverse
// axis and shares exact integer pixel boundaries with both neighbours. The
// final rotation samples the whole silhouette, including the outer fin tips.
function drawContinuousBody(c,s,img,h){
 const head=s.bones[0],pixels=360,unit=pixels/s.length;
 const canvasHeight=Math.ceil((h+s.length*.75)*unit)+4;
 if(!s.skin){s.skin=document.createElement('canvas');s.skin.width=pixels;s.skinCtx=s.skin.getContext('2d');}
 if(s.skin.height!==canvasHeight)s.skin.height=canvasHeight;
 const skin=s.skinCtx,mid=canvasHeight*.5;
 skin.setTransform(1,0,0,1,0,0);skin.clearRect(0,0,pixels,canvasHeight);
 const slice=img.width/SPINE_SEGMENTS;
 for(let n=0;n<SPINE_SEGMENTS;n++){
   const a=s.bones[n],b=s.bones[n+1],start=Math.round(a.along*unit),end=Math.round(b.along*unit);
   skin.setTransform(1,(b.across-a.across)*unit/(end-start),0,1,start,mid+a.across*unit);
   skin.drawImage(img,slice*n,0,slice,img.height,0,-h*unit/2,end-start,h*unit);
 }
 c.save();c.translate(head.x,head.y);c.rotate(s.angle+Math.PI);
 c.drawImage(s.skin,0,-mid/unit,pixels/unit,canvasHeight/unit);c.restore();
}
function markAt(x,y){const mark=$('#marker');mark.style.left=(x-cam.x)*zoom+'px';mark.style.top=(y-cam.y)*zoom+'px';}
function eatGrain(p){const i=food.indexOf(p);if(i>=0)food.splice(i,1);splash(p.x,p.y,.35);}
function cast(x,y,kind){
 if(!waterPoint(x,y)){note('这里是岸边，试试旁边的水面。');return;}
 const batch=new Set();
 for(let n=0;n<10;n++){
   const a=Math.random()*Math.PI*2,r=Math.sqrt(Math.random())*35,air=.24+Math.random()*.34;
   food.push({castAt:elapsed,x:x+Math.cos(a)*r/width,y:y+Math.sin(a)*r*.69/height,air,flight:air,vx:Math.cos(a)*2.8,vy:Math.sin(a)*2.8,life:33+Math.random()*8,
     size:kind==='algae'?2.2+Math.random()*1.8:1.7+Math.random()*1.5,angle:a,batch,kind});
 }
 if(food.length>140)food.splice(0,food.length-140);
}
function updateFood(dt){
 for(let i=food.length-1;i>=0;i--){
   const p=food[i];p.life-=dt;if(p.life<=0){food.splice(i,1);continue;}
   if(p.air>0){p.air-=dt;if(p.air<=0){
    splash(p.x,p.y,.14+Math.random()*.1);
    if(p.kind==='grain'&&waterPoint(p.x,p.y,'pond'))for(const s of swimmers){
     if(s.type===BUTTERFLY_FISH&&(!s.wave?.pellet||elapsed-s.wave.start>3.2)&&Math.hypot((s.x-p.x)*width,(s.y-p.y)*height)<190&&growthOf(s.fish).full<88)
      s.wave={x:p.x,y:p.y,start:elapsed,pellet:p};
    }
   }}
   else{p.x+=(.9+p.vx+1.1*Math.sin(elapsed*.6+p.angle))*dt/width;p.y+=(p.vy+.65*Math.cos(elapsed*.5))*dt/height;p.vx*=Math.exp(-dt*.45);p.vy*=Math.exp(-dt*.45);}
   ctx.save();ctx.globalAlpha=Math.min(1,p.life/4);ctx.fillStyle='rgba(18,26,12,.32)';ctx.beginPath();ctx.ellipse(p.x*width+2,p.y*height+2,p.size*1.3,p.size*.65,0,0,Math.PI*2);ctx.fill();ctx.restore();
   if(p.air<=0)drawPellet(ctx,p);

 }
}
function drawPellet(c,p){
 const u=Math.max(0,p.air)/p.flight,z=u*(65+45*(1-u));
 c.save();c.globalAlpha=Math.min(1,p.life/4);c.translate(p.x*width-u*33,p.y*height-z+Math.sin(elapsed*2+p.angle)*.45);
 c.rotate(p.angle+u*4);c.fillStyle=p.kind==='algae'?'#829653':'#996139';c.beginPath();c.ellipse(0,0,p.size,p.size*.64,0,0,Math.PI*2);c.fill();c.fillStyle=p.kind==='algae'?'#b7ca7d':'#dab57b';c.fillRect(-p.size*.55,-p.size*.4,p.size,.8);c.restore();
}
function fallbackWater(light){
 const scale=dpr*zoom;display.setTransform(1,0,0,1,0,0);
 for(let y=0;y<scene.height;y+=4){const h=Math.min(4,scene.height-y),delta=Math.sin(y*.034+elapsed*.86)*1.65*dpr+Math.sin(y*.012-elapsed*.61)*dpr;
 display.drawImage(scene,0,y,scene.width,h,delta-3*dpr,y,scene.width+6*dpr,h);}
 display.setTransform(scale,0,0,scale,-cam.x*scale,-cam.y*scale);
 for(const r of ripples){for(let j=0;j<2;j++){const radius=r.age*52-j*6;if(radius<1)continue;display.strokeStyle='rgba(196,226,218,'+Math.max(0,r.power*.4*(1-r.age/3))+')';display.lineWidth=1;display.beginPath();display.ellipse(r.x*width,r.y*height,radius,radius*.8,.05,0,Math.PI*2);display.stroke();}}
 display.fillStyle='rgba(4,15,44,'+((1-light)*.55)+')';display.fillRect(cam.x,cam.y,vw/zoom,vh/zoom);
}
function frame(ts){
 requestAnimationFrame(frame);if(document.hidden||ts-previous<24||!vw)return;
 const dt=Math.min(.085,(ts-previous)/1000);previous=ts;elapsed+=dt;
 const scale=dpr*zoom;ctx.setTransform(scale,0,0,scale,-cam.x*scale,-cam.y*scale);
 ctx.fillStyle='#19473e';ctx.fillRect(cam.x,cam.y,vw/zoom,vh/zoom);
 if(background.naturalWidth&&cam.x<width)ctx.drawImage(background,0,0,width,height);
 if(garden.reef&&cam.x+vw/zoom>width){
   if(reefBackground.naturalWidth)ctx.drawImage(reefBackground,width+DECK,0,width,height);
   ctx.fillStyle='#635140';ctx.fillRect(width,0,DECK,height);
   if(boardwalk.naturalWidth)for(let y=0;y<height;y+=225)ctx.drawImage(boardwalk,width,y,DECK,225);
   const edge=ctx.createLinearGradient(width-6,0,width+DECK+13,0);
   edge.addColorStop(0,'#10211600');edge.addColorStop(.05,'#12211666');edge.addColorStop(.07,'#e7deb150');edge.addColorStop(.10,'#46371e00');
   edge.addColorStop(.85,'#46371e00');edge.addColorStop(.89,'#36291688');edge.addColorStop(.91,'#10211666');edge.addColorStop(1,'#10211600');
   ctx.fillStyle=edge;ctx.fillRect(width-6,0,DECK+19,height);
 }
 drawBottomHabitat(ctx);drawNurserySites(ctx);drawVisitor(ctx,true);drawTadpoles(dt);swimmers.forEach((s,i)=>{steer(s,dt,i);drawFish(s);});updateFood(dt);
 for(let i=ripples.length-1;i>=0;i--){ripples[i].age+=dt;if(ripples[i].age>3.2)ripples.splice(i,1);}
 const clock=gardenTime(),hour=clock.getUTCHours()+clock.getUTCMinutes()/60;
 const light=clamp(.65+Math.sin((hour-6)*Math.PI/12)*.65,.12,1);
 if(surface){try{surface(scene,width,height,cam,zoom,elapsed,light,ripples,swimmers,garden.zone==='reef');}catch{surface=null;}}
 if(!surface){overlay.hidden=true;fallbackWater(light);}
 drawMap();paintAboveWater();tickHunt();
}
const airLayer=document.createElement('canvas');airLayer.className='surface air';pond.insertBefore(airLayer,overlay.nextSibling);
function paintAboveWater(){
 if(airLayer.width!==canvas.width||airLayer.height!==canvas.height){airLayer.width=canvas.width;airLayer.height=canvas.height;}
 const air=airLayer.getContext('2d');air.setTransform(1,0,0,1,0,0);air.clearRect(0,0,airLayer.width,airLayer.height);
 air.setTransform(zoom*dpr,0,0,zoom*dpr,-cam.x*zoom*dpr,-cam.y*zoom*dpr);for(const s of swimmers)if(s.jump&&s.sprite.naturalWidth){
  const img=s.colored.width===s.sprite.width?s.colored:s.sprite;
  air.save();air.translate(0,-s.lift);drawContinuousBody(air,s,img,s.length*img.height/img.width);air.restore();
  if(!huntRun&&s.fish.id===garden.selected&&!garden.focusFrog)markAt(s.x*width,s.y*height-s.lift-12);
 }
 for(const s of swimmers){
  if(s.type!==BASKING_TURTLE||s.speciesAction!==shallowHabits[BASKING_TURTLE][0]||!s.sprite.naturalWidth)continue;
  const img=s.colored.width===s.sprite.width?s.colored:s.sprite,h=s.length*img.height/img.width;
  air.save();air.translate(s.x*width,s.y*height);air.rotate(s.angle+Math.PI);
  air.shadowColor='#20332777';air.shadowBlur=2;air.shadowOffsetY=2;air.drawImage(img,0,-h/2,s.length,h);air.restore();
  if(!huntRun&&s.fish.id===garden.selected&&!garden.focusFrog)markAt(s.x*width,s.y*height-h/2-10);
 }
 drawVisitor(air,false);drawFrogs(air);drawDebris(air);for(const p of food){if(p.air>0)drawPellet(air,p);}
}
function regionAt(x,y){if(zoneAt(x*width)==='reef')return x-zoneStart('reef')/width>.64?'海葵花园':y>.58?'珊瑚台地':'白沙浅湾';return x>.64?'枫影深潭':y>.58||x<.28?'荷岸浅滩':'镜心洄湾';}
const map=$('#map'),mapCtx=map.getContext('2d');map.width=280;map.height=158;
function drawMap(){
 const pondSpan=width/worldWidth()*map.width;
 if(background.naturalWidth)mapCtx.drawImage(background,0,0,pondSpan,map.height);
 if(garden.reef){mapCtx.fillStyle='#b9a580';mapCtx.fillRect(pondSpan,0,DECK/worldWidth()*map.width,map.height);if(reefBackground.naturalWidth)mapCtx.drawImage(reefBackground,(width+DECK)/worldWidth()*map.width,0,pondSpan,map.height);}
 mapCtx.fillStyle='#0d261c66';mapCtx.fillRect(0,0,map.width,map.height);
 const sx=map.width/worldWidth(),sy=map.height/height;mapCtx.strokeStyle='#e3edc9';mapCtx.lineWidth=2;mapCtx.strokeRect(cam.x*sx+1,cam.y*sy+1,vw/zoom*sx-2,vh/zoom*sy-2);
 for(const s of swimmers){mapCtx.fillStyle=s.fish.id===garden.selected?'#ffe6a5':'#d5cdc0';mapCtx.beginPath();mapCtx.arc(s.x*width*sx,s.y*map.height,2,0,Math.PI*2);mapCtx.fill();}
 $('#region').textContent=regionAt((cam.x+vw/zoom/2)/width,(cam.y+vh/zoom/2)/height);
}
function interact(x,y){
 if(!zoneAt(x*width))return;
 if(!huntRun&&pickDebris(x,y))return;
 if(mode==='feed'){cast(x,y,baitKind);return;}
 if(mode==='ripple'){paddleWater(x,y,1.35);return;}
 const visitor=!huntRun&&visitorState();
 if(visitor&&Math.hypot((x-visitor.x)*width,(y-visitor.y)*height)<Math.max(23,22/zoom)){observeVisitor(visitor);return;}
 const frog=zoneAt(x*width)==='pond'&&petAt(x,y);if(frog&&!huntRun){inspectFrog(frog);return;}
 let best=null,distance=Infinity;
 for(const s of swimmers)for(const b of s.bones){const d=Math.hypot(x*width-b.x,y*height-b.y+(s.lift||0));if(d<Math.max(14,s.length*.15)&&d<distance){best=s;distance=d;}}
 if(best){if(huntRun)huntCatch(best.fish);else{witnessHabit(best);selectFish(best.fish);}return;}paddleWater(x,y,.7,true);
}
let drag=null,pinch=null;
const touches=new Map();
function cameraZoom(value,x,y,worldX=cam.x+x/zoom,worldY=cam.y+y/zoom){
 const full=Math.max(vw/worldWidth(),vh/height);
 zoom=clamp(value,full,Math.max(1.65,full*2.2));
 placeCamera(worldX+(vw*.5-x)/zoom,worldY+(vh*.5-y)/zoom);
}
function touchPair(){
 const [a,b]=[...touches.values()];
 return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,d:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y))};
}
canvas.onwheel=e=>{e.preventDefault();cameraZoom(zoom*Math.exp(-clamp(e.deltaY,-200,200)*.0018),e.clientX,e.clientY);};
canvas.onpointerdown=e=>{
 if(e.button!==0||touches.size>=2)return;
 canvas.setPointerCapture(e.pointerId);touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(touches.size===2){
   const pair=touchPair();pinch={d:pair.d,zoom,x:cam.x+pair.x/zoom,y:cam.y+pair.y/zoom};drag=null;return;
 }
 drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:cam.x,top:cam.y,moved:false};
};
canvas.onpointermove=e=>{
 if(!touches.has(e.pointerId))return;
 touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(pinch&&touches.size===2){const pair=touchPair();cameraZoom(pinch.zoom*pair.d/pinch.d,pair.x,pair.y,pinch.x,pinch.y);return;}
 if(!drag||drag.id!==e.pointerId)return;
 const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>5)drag.moved=true;
 if(drag.moved&&mode==='ripple'){
   if(!drag.lastWave||performance.now()-drag.lastWave>80){const x=(cam.x+e.clientX/zoom)/width,y=(cam.y+e.clientY/zoom)/height;paddleWater(x,y,.7);drag.lastWave=performance.now();}
 }else if(drag.moved)placeCamera(drag.left+(vw*.5-dx)/zoom,drag.top+(vh*.5-dy)/zoom);
};
canvas.onpointerup=e=>{
 const tap=drag&&drag.id===e.pointerId&&!drag.moved;
 touches.delete(e.pointerId);drag=null;pinch=null;
 if(tap)interact((cam.x+e.clientX/zoom)/width,(cam.y+e.clientY/zoom)/height);
};
canvas.onpointercancel=e=>{touches.delete(e.pointerId);drag=null;pinch=null;};
map.onclick=e=>{const box=map.getBoundingClientRect();placeCamera((e.clientX-box.left)*worldWidth()/box.width,(e.clientY-box.top)*height/box.height);};
canvas.onkeydown=e=>{const dir={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(dir){e.preventDefault();placeCamera(cam.x+vw/zoom/2+dir[0]*70,cam.y+vh/zoom/2+dir[1]*70);}};
