"use strict";
const wildImage=new Image();wildImage.src=fieldTextures[1];
let visitorTraitKey='',visitorTraits=[];
function dragonflyTraits(generation){
 const key=garden.created+'/red-dragonfly/'+generation;
 if(key!==visitorTraitKey){visitorTraitKey=key;visitorTraits=rollTraits(key);}
 return visitorTraits;
}
function dragonflyState(now=Date.now()){
 const real=(now-garden.wildStart)/1000;if(real<0)return null;
 const generation=Math.floor(real/10368),age=real%10368,trip=Math.floor(age/31),t=age%31;
 const larva=generation>0&&age<2592,traits=dragonflyTraits(generation);
 const perch={x:.25+.022*Math.sin(generation*2.8),y:.68};
 const prey={x:.40+.16*Math.sin(trip*7.2+generation),y:.53+.095*Math.cos(trip*4.4)};
 const hour=gardenTime(now).getUTCHours(),day=hour>=6&&hour<19;
 let f=0,status='在荷岸歇翅',heading=-.6;
 if(day&&t>=12){
   const out=t<21,part=out?(t-12)/9:1-(t-21)/10;
   f=(1-Math.cos(part*Math.PI))*.5;status=out?'追逐水面飞虫':'返回荷岸';
   heading=Math.atan2((prey.y-perch.y)*height,(prey.x-perch.x)*width)+(out?0:Math.PI);
 }
 const arch=Math.sin(f*Math.PI)*.04;
 if(larva)return {generation,trip,t,day,age,larva,traits,prey,x:.274+.011*Math.sin(age*.07),y:.673+.009*Math.cos(age*.07),heading:age*.07,status:'水下若虫，在浅滩自行觅食'};
 return {generation,trip,t,day,age,larva,traits,prey,x:perch.x+(prey.x-perch.x)*f,y:perch.y+(prey.y-perch.y)*f+arch,heading,status};
}
function drawDragonfly(c){
 const v=dragonflyState();if(!v||v.larva||!wildImage.naturalWidth)return;
 const key=v.generation+'.'+v.trip;
 if(v.day&&v.t>=21&&v.t<24&&garden.lastHunt!==key){
   garden.lastHunt=key;garden.wildCatches=(garden.wildGeneration===v.generation?garden.wildCatches||0:0)+1;garden.wildGeneration=v.generation;save();
 }
 if(v.day&&v.t>10&&v.t<21){c.fillStyle='#342d1f';c.beginPath();c.arc(v.prey.x*width+Math.sin(elapsed*8)*2,v.prey.y*height,1.9,0,Math.PI*2);c.fill();}
 const active=v.status!=='在荷岸歇翅',w=34*traitScale(v.traits),h=w*wildImage.height/wildImage.width*(active?.77+.18*Math.sin(elapsed*30):1);
 traceGold(c,'wild-'+v.generation,v.traits,v.x*width,v.y*height);
 c.save();c.translate(v.x*width,v.y*height);c.rotate(v.heading+Math.PI);c.shadowColor='#08180e88';c.shadowBlur=2;c.shadowOffsetY=active?7:2;c.drawImage(wildImage,-w/2,-h/2,w,h);c.restore();
}
function drawWildNymph(c){
 const v=dragonflyState();if(!v?.larva)return;
 traceGold(c,'wild-'+v.generation,v.traits,v.x*width,v.y*height);
 c.save();c.translate(v.x*width,v.y*height);c.rotate(v.heading);c.scale(traitScale(v.traits),traitScale(v.traits));c.strokeStyle='#665a37';c.lineWidth=1.4;
 for(const side of [-1,1])for(let i=0;i<3;i++){c.beginPath();c.moveTo(2-i*2,side);c.lineTo(5-i*3,side*4);c.lineTo(8-i*4,side*5);c.stroke();}
 c.fillStyle='#706643';c.beginPath();c.ellipse(-1,0,7,3,0,0,Math.PI*2);c.fill();c.fillStyle='#514c32';c.fillRect(4,-3,4,6);c.restore();
}
function hitDragonfly(x,y){const v=dragonflyState();return v&&Math.hypot((x-v.x)*width,(y-v.y)*height)<Math.max(23,22/zoom);}
function observeVisitor(){
 const v=dragonflyState();if(!v)return;
 const isNew=!garden.discovered.includes(VISITOR);discover(garden,VISITOR);
 if(isNew){record('首次观察到野生赤蜻，自行捕食水面飞虫。');save();}
 const body=openDialog('水庭访客');body.innerHTML=(v.larva?'':'<div class="sale-portrait"><img src="'+fieldTextures[1]+'" alt="赤蜻"></div>')+'<h3>赤蜻 · '+(v.larva?'水虿':'成虫')+'</h3><p>世代 '+String(v.generation+1).padStart(3,'0')+' · '+v.status+' · '+traitText(v.traits)+'</p><p class="market-help">水庭停留 '+(v.age*RATE/3600).toFixed(1)+' 小时 · 已观察到捕食 '+(garden.wildGeneration===v.generation?garden.wildCatches:0)+' 次。成虫白天捕食，夜间歇翅。下一代在浅滩度过水虿期，再羽化离水。</p>';
}
const petMotion=new Map();
const frogNames=['小苔','露丸','团青','竹音','雨豆','芦生','青灯','溪叶'];
function frogGrowth(p){
 const age=Math.max(0,(Date.now()-p.born)*RATE/3600000);
 const stage=age>=16&&p.meals>=3?3:age>=8&&p.meals>=2?2:age>=3&&p.meals>=1?1:0;
 const full=p.lastMeal?Math.max(0,Math.round(100-(Date.now()-p.lastMeal)/1000*.60)):32;
 const energy=Math.round(35+full*.47+p.seed*15);
 return {age,stage,full,energy,temper:p.seed>.65?'警觉':p.seed>.32?'好奇':'温和',length:((1.2+stage*.72)*(1+p.seed*.26)*traitScale(p.traits)).toFixed(1),label:['蝌蚪','后肢期','幼蛙','成蛙'][stage]};
}
function motionFor(id,p){
 if(!petMotion.has(id)){const x=.22+p.seed*.105,y=.69+Math.sin(p.seed*8)*.075;petMotion.set(id,{x,y,homeX:x,homeY:y,angle:p.seed*7,alarm:0});}
 return petMotion.get(id);
}
function disturbTadpoles(x,y){for(const [id,p] of Object.entries(garden.amphibians)){const t=motionFor(id,p),dx=(t.x-x)*width,dy=(t.y-y)*height;if(Math.hypot(dx,dy)<100){t.angle=Math.atan2(dy,dx);t.alarm=.85;}}}
function petAt(x,y){let best=null,d=26/zoom;for(const [id,p] of Object.entries(garden.amphibians)){const m=motionFor(id,p),dist=Math.hypot((x-m.x)*width,(y-m.y)*height);if(dist<d){best=id;d=dist;}}return best;}
function drawTadpoles(dt){
 for(const [id,p] of Object.entries(garden.amphibians)){
  const m=motionFor(id,p),g=frogGrowth(p);
  let goal=null,nearest=280;
  if(g.stage<3&&g.full<88)for(const a of food){if(a.kind!=='algae'||a.air>0)continue;const d=Math.hypot((m.x-a.x)*width,(m.y-a.y)*height);if(d<nearest){nearest=d;goal=a;}}
  const pivot=elapsed*.18+p.seed*7;
  let tx=m.homeX+Math.sin(pivot)*.034,ty=m.homeY+Math.cos(pivot*.8)*.037;
  if(g.stage===3){tx=.12+Math.sin(pivot*.4)*.025;ty=.77+Math.cos(pivot*.5)*.026;}
  if(goal){tx=goal.x;ty=goal.y;}
  const a=Math.atan2((ty-m.y)*height,(tx-m.x)*width);
  if(m.alarm<=0)m.angle+=Math.atan2(Math.sin(a-m.angle),Math.cos(a-m.angle))*Math.min(1,dt*3.1);
  let speed=m.alarm>0?46+22*p.seed:goal?30+(100-g.full)*.3:8+g.energy*.05;
  if(g.stage===3)speed=35*Math.pow(Math.max(0,Math.sin(elapsed*1.6+p.seed*12)),6);
  if(p.traits.includes('fast'))speed*=1.5;
  m.alarm-=dt;m.x+=Math.cos(m.angle)*speed*dt/width;m.y+=Math.sin(m.angle)*speed*dt/height;
  if(goal&&nearest<10){
    eatGrain(goal);
    if(Date.now()-p.lastMeal>22000){p.meals++;p.lastMeal=Date.now();record('「'+p.name+'」吃下藻屑，第 '+p.meals+' 次照料。');save();note(p.name+' 吃饱了 · 照料 '+p.meals+' 次');}
  }
  if(g.stage<3)paintFrog(ctx,id,p,m,g.stage);
  if(garden.focusFrog===id){$('#marker').textContent='◇ '+p.name;$('#marker').hidden=false;markAt(m.x*width,m.y*height-23);}
 }
}
const frogImages=frogTextures.map(src=>{const img=new Image();img.src=src;return img;});
function paintFrog(c,id,p,m,stage){
 const img=frogImages[stage];if(!img.naturalWidth)return;
 const length=[29,33,36,44][stage]*(.93+.18*p.seed)*traitScale(p.traits),spriteHeight=length*img.height/img.width;
 traceGold(c,'frog-'+id,p.traits,m.x*width,m.y*height);
 const pulse=Math.sin(elapsed*(stage===3?1.6:3)+p.seed*8);
 c.save();c.translate(m.x*width,m.y*height);c.rotate(m.angle+Math.PI+.024*pulse);
 c.scale(1+.014*pulse,1-.025*pulse);c.shadowColor='#10221a66';c.shadowBlur=2;c.shadowOffsetY=stage===3?2:3;
 c.drawImage(img,-length/2,-spriteHeight/2,length,spriteHeight);c.restore();
}
function drawFrogs(c){
 for(const [id,p] of Object.entries(garden.amphibians)){
  if(frogGrowth(p).stage===3)paintFrog(c,id,p,motionFor(id,p),3);
 }
}
