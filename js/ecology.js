"use strict";
const wildImage=new Image();wildImage.src=fieldTextures[1];
function paintSeaStar(c){
 c.beginPath();
 for(let i=0;i<10;i++){
  const a=i*Math.PI/5,r=i%2?7:20;
  c.lineTo(Math.cos(a)*r,Math.sin(a)*r);
 }
 c.closePath();c.lineJoin='round';c.lineWidth=3;c.strokeStyle='#c87a49';c.stroke();c.fillStyle='#d58b55';c.fill();
 c.fillStyle='#f2cb96';
 for(let i=0;i<5;i++)for(let d=3;d<18;d+=4){
  const a=i*Math.PI*2/5;c.beginPath();c.arc(d*Math.cos(a),d*Math.sin(a),1,0,Math.PI*2);c.fill();
 }
}
const starPortrait=document.createElement('canvas');starPortrait.width=starPortrait.height=48;
const starContext=starPortrait.getContext('2d');starContext.translate(24,24);paintSeaStar(starContext);
const visitorKinds={
 [VISITOR]:{breed:'赤蜻',zone:'pond',image:fieldTextures[1],marking:'日间巡飞，偶尔落脚在荷岸。',gift:'每 45 秒为全庭添 1 庭玉'},
 [SEA_STAR]:{breed:'海星',zone:'reef',image:starPortrait.toDataURL(),marking:'伸展腕足，沿礁池浅沙缓行。',gift:'每 45 秒为两池所有饲养生物补充 2 点饱食度'}
};
function currentVisit(now=Date.now()){
 const dayLength=DAY/RATE,day=Math.floor((now-garden.created)/dayLength);
 const seed=garden.created+'/visit/'+day;
 // The garden opens at 10:24. Each following visit also falls in daylight.
 const start=day===0?garden.wildStart:garden.created+day*dayLength+sampleUnit(seed)*70000+5000;
 const age=(now-start)/1000;
 if(age<0||age>=150+sampleUnit(seed+'/stay')*75)return null;
 const type=garden.reef&&(garden.reefOpenedAt??garden.created)<=start&&sampleUnit(seed+'/shore')<.5?SEA_STAR:VISITOR;
 return {type,day,start,age,...visitorKinds[type]};
}
function visitorState(now=Date.now()){
 const v=currentVisit(now);if(!v)return null;
 if(v.type===SEA_STAR)return {...v,x:zoneStart('reef')/width+.45+.028*Math.sin(v.age/38),y:.68+.018*Math.cos(v.age/46),heading:.2*Math.sin(v.age/38),status:'沿浅沙觅食'};
 const leg=Math.floor(v.age/8),time=v.age%8;
 function perch(i){const key=v.start+'/'+i;return [.20+.43*sampleUnit(key+'x'),.45+.23*sampleUnit(key+'y')];}
 const [ax,ay]=perch(leg),[bx,by]=perch(leg+1);
 const t=Math.min(1,time/5),f=t*t*(3-2*t);
 return {...v,x:ax+(bx-ax)*f,y:ay+(by-ay)*f-.045*Math.sin(Math.PI*f),heading:Math.atan2((by-ay-.045*Math.PI*Math.cos(Math.PI*f))*height,(bx-ax)*width),status:t===1?'落脚歇翅':'低飞巡猎'};
}
function drawVisitor(c,underwater){
 const v=visitorState();if(!v||(v.type===SEA_STAR)!==underwater)return;
 c.save();c.translate(v.x*width,v.y*height);c.rotate(v.heading);
 if(underwater){paintSeaStar(c);}
 else if(wildImage.naturalWidth){c.rotate(Math.PI);c.shadowColor='#18221c77';c.shadowBlur=3;c.shadowOffsetY=v.status==='低飞巡猎'?7:2;
 const h=42*wildImage.height/wildImage.width;c.drawImage(wildImage,-21,-h/2,42,h*(v.status==='低飞巡猎'?.85+.15*Math.sin(elapsed*52):1));}
 c.restore();
}
function locateVisitor(){
 const v=visitorState();modal.close();
 if(!v){note('访客已经离开');return;}
 switchZone(v.zone);placeCamera(v.x*width,v.y*height);document.querySelector('[data-mode="observe"]').click();
 note('轻点'+v.breed+'记录此刻的行为 · '+v.gift);
}
$('#visitorHint').onclick=locateVisitor;
function observeVisitor(v){
 discover(garden,v.type);
 const entry=v.type+'/'+v.status;garden.visitorNotes??=[];
 if(!garden.visitorNotes.includes(entry)){garden.visitorNotes.push(entry);record('庭外偶遇 · '+v.breed+'：'+v.status+'。');}
 save();
 const body=openDialog('庭外访客');
 body.innerHTML='<div class="sale-portrait"><img alt="" src="'+v.image+'"></div><h3>'+v.breed+' · '+v.status+'</h3><p>'+v.marking+'</p><p class="market-help">停留期间，'+v.gift+'。</p>';
}
function settleVisitor(now){
 const v=currentVisit(now),hint=$('#visitorHint');hint.hidden=!v;if(!v)return;
 hint.textContent=(v.zone==='pond'?'荷岸':'礁池')+'来客 · '+v.breed+' ↗';hint.title=v.gift;
 const tick=Math.floor(v.age/45),key=v.start+'/'+tick;
 if(!tick||garden.visitorTick===key)return;
 garden.visitorTick=key;
 if(v.type===VISITOR)garden.jade++;
 else{
  for(const f of koi){const item=garden.fish[f.id],m=metabolism(item,now);markAdult(f,now);item.metabolicAt=now;item.bodyDays=m.body;item.fullness=Math.min(100,m.full+2);}
  for(const p of Object.values(garden.amphibians)){p.fedLevel=Math.min(100,frogFullness(p,now)+2);p.fedAt=now;}
 }
 save();
}
const petMotion=new Map();
const frogNames=['小苔','露丸','团青','竹音','雨豆','芦生','青灯','溪叶'];
function frogFullness(p,now=Date.now()){
 if(p.fedAt)return Math.max(p.lastMeal?0:32,p.fedLevel-(now-p.fedAt)*.00060);
 return p.lastMeal?Math.max(0,100-(now-p.lastMeal)*.00060):32;
}
function frogGrowth(p){
 const age=Math.max(0,(Date.now()-p.born)*RATE/3600000);
 const stage=age>=16&&p.meals>=3?3:age>=8&&p.meals>=2?2:age>=3&&p.meals>=1?1:0;
 const full=Math.round(frogFullness(p));
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
  if(g.stage===3){
    const phase=(elapsed+p.seed*6)%2.6;
    m.lift=phase<.42?Math.sin(Math.PI*phase/.42):0;
    speed=130*m.lift;
  }
  if(p.traits.includes('fast'))speed*=1.5;
  m.alarm-=dt;m.x+=Math.cos(m.angle)*speed*dt/width;m.y+=Math.sin(m.angle)*speed*dt/height;
  if(goal&&nearest<10){
    eatGrain(goal);
    if(Date.now()-p.lastMeal>22000){p.meals++;p.lastMeal=Date.now();p.fedAt=p.lastMeal;p.fedLevel=100;record('「'+p.name+'」吃下藻屑，第 '+p.meals+' 次照料。');save();note(p.name+' 吃饱了 · 照料 '+p.meals+' 次');}
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
 c.save();c.translate(m.x*width,m.y*height-(m.lift||0)*12);c.rotate(m.angle+Math.PI+.024*pulse);
 c.scale(1+.014*pulse,1-.025*pulse);c.shadowColor='#10221a66';c.shadowBlur=2;c.shadowOffsetY=stage===3?2+(m.lift||0)*12:3;
 c.drawImage(img,-length/2,-spriteHeight/2,length,spriteHeight);c.restore();
}
function drawFrogs(c){
 for(const [id,p] of Object.entries(garden.amphibians)){
  if(frogGrowth(p).stage===3)paintFrog(c,id,p,motionFor(id,p),3);
 }
}
