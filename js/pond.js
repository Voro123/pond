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
let swimmers=[];
function syncSwimmers(){swimmers=koi.map((fish,i)=>{
  const existing=swimmers.find(s=>s.fish.id===fish.id);if(existing){existing.fish=fish;return existing;}
  const sprite=new Image();sprite.src=sceneImage(garden.fish[fish.id].type);
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
  return {fish,style:fish.kind==='鱼类'?disposition(fish):null,sprite,colored,home,x,y,angle,target:null,phase:i*1.9,length:0,turnIn:3+i,angular:0,speed:18,trail:[],bones:[],wake:1};
});}
syncSwimmers();
new ResizeObserver(sizeCanvas).observe(pond);sizeCanvas();
function steer(s,dt,i){
 const g=growthOf(s.fish),bodyScale=traitScale(garden.fish[s.fish.id].traits);s.length=(28+151*Math.pow(g.length/bodyScale/65,.7))*bodyScale;
 const hx=s.x*width,hy=s.y*height,bank=zoneStart(s.fish.habitat)/width;
 const fullness=g.full,habit=s.fish.habit,seed=garden.fish[s.fish.id].seed;
 const hunger=1-fullness/100;
 let meal=null,waiting=false,schooled=false,dist=(145+575*hunger*hunger)*(s.style==='bold'?1.35:1);
 const eligible=fullness<88 && Date.now()-(garden.fish[s.fish.id].biteAt||0)>650;
 for(const p of food){
   if(!eligible||p.air>0||zoneAt(p.x*width)!==s.fish.habitat)continue;
   if(habit==='scrape'?p.kind!=='algae':p.kind!=='grain'&&habit!=='graze')continue;
   const d=Math.hypot(hx-p.x*width,hy-p.y*height);if(d>=dist)continue;
   if(s.style==='patient'&&elapsed-p.castAt<3){waiting=true;continue;}
   dist=d;meal=p;
 }
 s.turnIn-=dt;
 if(!s.target||s.turnIn<0||Math.hypot(s.target.x*width-hx,s.target.y*height-hy)<65){
   let angle=s.angle+(Math.random()-.5)*1.9;
   const range=s.style==='wander'?460:270;
   let x=s.x+Math.cos(angle)*range/width,y=s.y+Math.sin(angle)*range/height;
   if(!waterPoint(x,y,s.fish.habitat)){x=bank+.22+.52*Math.random();y=.26+.52*Math.random();}
   s.target={x,y};s.turnIn=7+Math.random()*9;
 }
 const hour=gardenTime().getUTCHours();
 const type=garden.fish[s.fish.id].type;
 const cycle=(elapsed+seed*47)%(12+seed*13+(type%5)*.7);
 let activityScale=1,turnHome=false;
 switch(habit){
 case 'scrape':turnHome=true;activityScale=cycle<3?.08:.62;break;
 case 'host': case 'shelter':turnHome=cycle<13||Math.hypot(s.x-s.home.x,s.y-s.home.y)>.13;activityScale=cycle<3?.05:.8;break;
 case 'bottom':case 'graze':activityScale=cycle<7?.025:.58;break;
 case 'ambush':activityScale=cycle<12?.006:1.18;break;
 case 'night':activityScale=hour>=7&&hour<=18?(cycle<10?.012:.26):1.12;turnHome=hour>=7&&hour<=18;break;
 case 'bask':activityScale=cycle<14?.006:.47;turnHome=true;break;
 case 'dart':activityScale=cycle<4?1.85:cycle<8?.08:.72;break;
 case 'glide':activityScale=.7+.23*Math.cos(elapsed*.23+seed*7);break;
 }
 const returning=s.style==='home'&&Math.hypot((s.x-s.home.x)*width,(s.y-s.home.y)*height)>100;
 turnHome||=returning;
 const partner=matingTarget(s);
 const target=partner||meal||(turnHome?{x:s.home.x+.023*Math.cos(elapsed*.12+seed*11),y:s.home.y+.029*Math.sin(elapsed*.16+seed*11)}:s.target);
 let vx=target.x*width-hx,vy=target.y*height-hy;
 const norm=Math.max(1,Math.hypot(vx,vy));vx/=norm;vy/=norm;
 if(!partner&&!meal&&(habit==='host'||habit==='school')){
   const peers=swimmers.filter(other=>other!==s&&other.fish.breed===s.fish.breed);
   if(peers.length){const peer=peers.reduce((best,c)=>Math.hypot(c.x-s.x,c.y-s.y)<Math.hypot(best.x-s.x,best.y-s.y)?c:best);
    const dx=(peer.x-s.x)*width,dy=(peer.y-s.y)*height,d=Math.max(1,Math.hypot(dx,dy));
    schooled=d<145;vx+=Math.cos(peer.angle)*.7+dx/d*Math.min(3,d/80);vy+=Math.sin(peer.angle)*.7+dy/d*Math.min(3,d/80);}
 }
 for(const other of swimmers){if(other===s)continue;const dx=hx-other.x*width,dy=hy-other.y*height,d=Math.hypot(dx,dy);if(d<65&&d>0){vx+=dx/d*(1-d/65)*.8;vy+=dy/d*(1-d/65)*.8;}}
 if(!waterPoint(s.x+Math.cos(s.angle)*80/width,s.y+Math.sin(s.angle)*80/height,s.fish.habitat)){vx+=(bank+.5-s.x)*6;vy+=(.5-s.y)*6;}
 const diff=Math.atan2(Math.sin(Math.atan2(vy,vx)-s.angle),Math.cos(Math.atan2(vy,vx)-s.angle));
 const turn=Math.min(meal?1.35:.85,Math.max(.12,s.speed/(s.length*.49)));
 s.angular+=(clamp(diff*1.8,-turn,turn)-s.angular)*(1-Math.exp(-dt*2.4));s.angle+=s.angular*dt;
 const cruise=24*s.fish.pace*(.84+.032*(type%11))*(.9+.17*Math.sin(elapsed*.85+i));
 const ranging=s.style==='wander'&&!turnHome&&activityScale>=.5;
 const personalAction=meal?s.style==='bold':waiting||returning||ranging;
 s.signature=!partner&&personalAction?individualHabits[s.style].action:null;
 s.activity=partner?'正在求偶':s.signature||(
   meal?'正在觅食':activityScale<.1?'驻足休息':habit==='scrape'?'沿石刮藻':schooled?'结伴游动':turnHome?'绕巢活动':
   habit==='host'||habit==='school'?'独自巡游':activity[habit][0]);
 if(habit==='scrape'&&!meal&&activityScale>=.1&&fullness<55)grazeFilm(s.fish,Date.now());
 let speed=partner?62:meal?Math.min(40+95*hunger,22+dist*(.22+.48*hunger)):cruise*activityScale;
 if(s.style==='bold'&&meal)speed*=1.28;
 if(waiting&&!meal)speed*=.15;
 if(habit==='scrape')speed=Math.min(8,speed);
 if(garden.fish[s.fish.id].traits.includes('fast'))speed*=1.5;
 speed/=1+Math.abs(diff)*.65;
 s.speed+=(speed-s.speed)*(1-Math.exp(-dt*1.6));s.x+=Math.cos(s.angle)*s.speed*dt/width;s.y+=Math.sin(s.angle)*s.speed*dt/height;
 s.phase+=dt*(.6+s.speed*.080);
 if(meal&&dist<10&&feedIndividual(s.fish)){eatGrain(meal);save();const cared=nourish(s.fish);if(cared)record('「'+s.fish.breed+'」得到一次照料。');if(!meal.batch.has(s.fish.id)){meal.batch.add(s.fish.id);record('「'+s.fish.breed+'」游来吃下了鱼食。');save();}}
 // Sample the route taken by the head at equal distances along the spine.
 const head={x:s.x*width,y:s.y*height};
 if(!s.trail.length)for(let k=0;k<100;k++)s.trail.push({x:head.x-Math.cos(s.angle)*k*2.6,y:head.y-Math.sin(s.angle)*k*2.6});
 if(Math.hypot(head.x-s.trail[0].x,head.y-s.trail[0].y)>=2.4){s.trail.unshift(head);if(s.trail.length>110)s.trail.pop();}
 const path=[head,...s.trail];let edge=0,sum=0;s.bones=[];
 for(let n=0;n<=36;n++){
   const u=n/36,at=s.length*u;let a=path[edge],b=path[edge+1],len=Math.hypot(b.x-a.x,b.y-a.y);
   while(sum+len<at&&edge<path.length-2){sum+=len;a=path[++edge];b=path[edge+1];len=Math.hypot(b.x-a.x,b.y-a.y);}
   const mix=clamp((at-sum)/Math.max(.001,len),0,1),dx=len?(b.x-a.x)/len:-Math.cos(s.angle),dy=len?(b.y-a.y)/len:-Math.sin(s.angle);
   const rigid=['bask','ambush'].includes(habit)||garden.fish[s.fish.id].type>=55;
   const beat=Math.sin(s.phase-u*5.3)*s.length*(rigid?.008:.070)*u*u*Math.min(1,.14+s.speed/20);
   s.bones.push({x:a.x+(b.x-a.x)*mix-dy*beat,y:a.y+(b.y-a.y)*mix+dx*beat});
 }
 s.wake-=dt;if(s.wake<=0 && s.speed>18){const tail=s.bones[35];splash(tail.x/width,tail.y/height,.095);s.wake=1.6+Math.random()*.6;}
}
function pondActivity(f){return swimmers.find(s=>s.fish.id===f.id)?.activity||activity[f.habit][0];}
function drawFish(s){
 if(!s.sprite.naturalWidth||!s.bones.length)return;
 const img=s.colored.width===s.sprite.width?s.colored:s.sprite,h=s.length*img.height/img.width;
 const mid=s.bones[17];
 if(mid.x+s.length<cam.x||mid.x-s.length>cam.x+vw/zoom||mid.y+s.length<cam.y||mid.y-s.length>cam.y+vh/zoom){if(!huntRun&&s.fish.id===garden.selected)markAt(mid.x,mid.y);return;}
 traceGold(ctx,s.fish.id,garden.fish[s.fish.id].traits,s.bones[35].x,s.bones[35].y);ctx.save();ctx.translate(mid.x+7,mid.y+10);ctx.rotate(s.angle);
 const shadow=ctx.createRadialGradient(0,0,0,0,0,1);shadow.addColorStop(0,'#04191270');shadow.addColorStop(1,'#04191200');ctx.scale(s.length*.53,h*.36);ctx.fillStyle=shadow;ctx.fillRect(-1,-1,2,2);ctx.restore();
 ctx.globalAlpha=.94;
 const rigid=[55,57,58,59,NERITE].includes(garden.fish[s.fish.id].type);
 if(rigid){ctx.save();ctx.translate(s.x*width,s.y*height);ctx.rotate(s.angle+Math.PI);ctx.drawImage(img,0,-h*.5,s.length,h);ctx.restore();}
 else drawContinuousBody(ctx,s,img,h);
 ctx.globalAlpha=1;
 if(!huntRun&&s.fish.id===garden.selected&&!garden.focusFrog)markAt(mid.x,mid.y-h*.65-9);
}
// Skin the spine in a local raster first. Every strip has the same transverse
// axis and shares exact integer pixel boundaries with both neighbours. The
// final rotation samples the whole silhouette, including the outer fin tips.
function drawContinuousBody(c,s,img,h){
 const head=s.bones[0],tail=s.bones[s.bones.length-1];
 const axis=Math.hypot(tail.x-head.x,tail.y-head.y)>s.length*.45?
   Math.atan2(tail.y-head.y,tail.x-head.x):s.angle+Math.PI;
 const cos=Math.cos(axis),sin=Math.sin(axis);
 const columns=36,pixels=360,unit=pixels/s.length;
 const canvasHeight=Math.ceil((h+s.length*2)*unit)+4;
 if(!s.skin){s.skin=document.createElement('canvas');s.skin.width=pixels;s.skinCtx=s.skin.getContext('2d');}
 if(s.skin.height!==canvasHeight)s.skin.height=canvasHeight;
 const skin=s.skinCtx,mid=canvasHeight*.5;
 skin.setTransform(1,0,0,1,0,0);skin.clearRect(0,0,pixels,canvasHeight);
 let x=0,y=0,end=0;
 for(let n=0;n<columns;n++){
   const a=s.bones[n],b=s.bones[n+1],dx=b.x-a.x,dy=b.y-a.y;
   const tangent=clamp(Math.atan2(-dx*sin+dy*cos,dx*cos+dy*sin),-.94,.94);
   const step=pixels/columns,nextY=y+Math.sin(tangent)*step;
   x+=Math.cos(tangent)*step;
   const next=Math.min(pixels,Math.max(end+1,Math.round(x)));
   skin.setTransform(1,(nextY-y)/(next-end),0,1,end,mid+y);
   skin.drawImage(img,img.width*n/columns,0,img.width/columns,img.height,0,-h*unit/2,next-end,h*unit);
   y=nextY;end=next;
 }
 c.save();c.translate(head.x,head.y);c.rotate(axis);
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
   if(p.air>0){p.air-=dt;if(p.air<=0)splash(p.x,p.y,.14+Math.random()*.1);}
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
 drawWildNymph(ctx);drawTadpoles(dt);swimmers.forEach((s,i)=>{steer(s,dt,i);drawFish(s);});updateFood(dt);
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
 air.setTransform(zoom*dpr,0,0,zoom*dpr,-cam.x*zoom*dpr,-cam.y*zoom*dpr);drawDragonfly(air);drawFrogs(air);drawDebris(air);for(const p of food){if(p.air>0)drawPellet(air,p);}
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
 if(mode==='ripple'){splash(x,y,1.35);disturbShoal(x,y);return;}
 if(!huntRun&&zoneAt(x*width)==='pond'&&hitDragonfly(x,y)){observeVisitor();return;}
 const frog=zoneAt(x*width)==='pond'&&petAt(x,y);if(frog&&!huntRun){inspectFrog(frog);return;}
 let best=null,distance=Infinity;
 for(const s of swimmers)for(const b of s.bones){const d=Math.hypot(x*width-b.x,y*height-b.y);if(d<Math.max(14,s.length*.15)&&d<distance){best=s;distance=d;}}
 if(best){if(huntRun)huntCatch(best.fish);else{witnessHabit(best);selectFish(best.fish);}return;}splash(x,y,.7);
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
   if(!drag.lastWave||performance.now()-drag.lastWave>80){const x=(cam.x+e.clientX/zoom)/width,y=(cam.y+e.clientY/zoom)/height;if(waterPoint(x,y)){splash(x,y,.7);disturbShoal(x,y);}drag.lastWave=performance.now();}
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
