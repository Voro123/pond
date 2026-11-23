"use strict";
const DOJO=9, GUDGEON=13, STERLET=14, PANDA_CORY=20, PLECO=21, KUHLI=23;
const PEARL_GOURAMI=25, DWARF_GOURAMI=26, CHERRY_SHRIMP=57, BLUE_CRAYFISH=59;
const SLEEPER=11, REDTAIL=24, ANGEL=27, PEA_PUFFER=30, RAM=31;
const spawningBeds={
 [ANGEL]:{x:.36,y:.55},[RAM]:{x:.56,y:.61}
};
const BASKING_TURTLE=55, CLOWNFISH=33;
const shallowRestRadius={[BASKING_TURTLE]:14,[DOJO]:22};
const baskingStone={x:.215,y:.69};
const shallowHabits={
 [BASKING_TURTLE]:['登石晒背','白天到荷岸等它爬上晒台。','它从水边慢慢爬上石面，停稳晒背，随后沿原路入水。'],
 [NERITE]:['刮过藻膜','观察螺身后刚刚经过的石面。','爬过有藻膜的石面时，身后留下一小段浅色刮痕。'],
 [12]:['贴底探食','在丁鱥附近的底面撒藻屑。','它贴底游近，吻部在藻屑旁轻轻拨起细沙。'],
 [CLOWNFISH]:['退入海葵','在海葵附近的鱼身旁拨水。','水面受扰，它折返到熟悉的海葵丛里。'],
 [SLEEPER]:['离掩体短扑','等它伏在石旁，在近处投下鱼粮。','它贴近石影停伏，饵粒落在近旁才突然短扑。'],
 [REDTAIL]:['绕木巡界','沿沉木的两端观察它折返。','它反复沿沉木外缘巡回，转过木端后绕向另一侧。'],
 [PEA_PUFFER]:['绕饵端详','把鱼粮撒在身旁，留意靠近前的弧线。','它从侧面绕近食粒，换一个角度才啄食。'],
 [ANGEL]:['叶面护卵','配对后观察叶片上的卵和往返的亲鱼。','亲鱼贴近宽叶清理表面，产卵后又回到叶旁护卵。'],
 [RAM]:['石面护卵','配对后去平石旁寻找亲鱼。','亲鱼清理平石，在石面产卵，随后留在卵旁守护。'],
 [PEARL_GOURAMI]:['丝鳍探饵','向身前投下少量鱼粮。','它先伸出细长腹鳍碰触食粒，随后才把嘴凑近。'],
 [DWARF_GOURAMI]:['丝鳍探饵','观察它接近食粒时的腹鳍。','丝状腹鳍先触到食物，鱼身随后跟上。'],
 [DOJO]:['拱入软沙','留意浅沙里扬起的细砂。','它将吻部拱进软沙，身体渐渐隐入沙色。'],
 [KUHLI]:['钻入石隙','白天去浅沙旁的两块石头之间看看。','它沿着窄缝钻进去，在石影里停留。'],
 [PANDA_CORY]:['结伴翻砂','在浅滩养两尾熊猫鼠鱼，等它们聚到沙地。','同伴聚近时，它们贴着沙底探食，吻前扬起细沙。'],
 [GUDGEON]:['浅底短移','在沙地等它停下，再留意下一次挪窝。','它贴底歇一阵，再短短地移向旁边的落点。'],
 [STERLET]:['贴沙扫寻','沿着沙地观察吻部的路线。','它沿沙底来回扫寻，长吻下的触须掠过底面。'],
 [PLECO]:['附木刮食','找到浅滩的沉木，再看它在哪一面停下。','它将口部贴在沉木表面，一点点刮过木纹。'],
 [CHERRY_SHRIMP]:['前肢拣食','在虾的前方撒少许藻屑。','它停在藻屑旁，两侧前肢轮流拣取。'],
 [BLUE_CRAYFISH]:['举螯持食','把鱼粮撒在螯尖附近。','它在食物旁停下，用螯夹住食粒，再把食物送到口边。']
};
const sandBed={x:.47,y:.65},rockGap={x:.52,y:.69},sunkenWood={x:.38,y:.63};
function isGourami(type){return type===PEARL_GOURAMI||type===DWARF_GOURAMI;}
function bottomDestination(s,seed,hour){
 const t=elapsed+seed*30;
 const offset=seed-.5;
 switch(s.type){
 case BASKING_TURTLE:
  if(hour<7||hour>=19)return {x:baskingStone.x+.055,y:baskingStone.y-.008};
  return t%46<30?baskingStone:{x:baskingStone.x+.042,y:baskingStone.y-.014};
 case SLEEPER:return {x:rockGap.x-.014,y:rockGap.y+.012};
 case REDTAIL:return {x:sunkenWood.x+.032*Math.cos(t*.22),y:sunkenWood.y+.02*Math.sin(t*.22)};
 case DOJO:return {x:sandBed.x+.026*offset,y:sandBed.y+.03*offset};
 case PANDA_CORY:return {x:sandBed.x+.016*Math.sin(t*.18),y:sandBed.y+.014*Math.cos(t*.18)};
 case GUDGEON:{
  const step=Math.floor(t/6);
  return {x:sandBed.x+.035*Math.sin(step*1.7),y:sandBed.y+.019*Math.cos(step*1.7)};
 }
 case STERLET:return {x:sandBed.x+.05*Math.sin(t*.15),y:sandBed.y+.024*Math.sin(t*.30)};
 case KUHLI:return hour>=7&&hour<19?rockGap:null;
 case PLECO:return {x:sunkenWood.x+.012*Math.sin(t*.12),y:sunkenWood.y+.005*Math.sin(t*.12)};
 default:return null;
 }
}
function bottomAction(s,site){
 if(!site||!shallowHabits[s.type])return false;
 const d=Math.hypot((site.x-s.x)*width,(site.y-s.y)*height);
 switch(s.type){
 case STERLET:return d<55&&s.speed>4;
 case GUDGEON:return d>8&&d<45&&s.speed>3;
 case PANDA_CORY:return d<39&&swimmers.some(o=>o!==s&&o.type===PANDA_CORY&&Math.hypot((o.x-s.x)*width,(o.y-s.y)*height)<85);
 case REDTAIL:return d<43&&s.speed>4;
 case SLEEPER:return false;
 case RAM:case ANGEL:return d<30;
 case BASKING_TURTLE:return site===baskingStone&&d<shallowRestRadius[s.type];
 case DOJO:return d<shallowRestRadius[s.type];
 default:return d<22;
 }
}
// Pause at a reachable particle long enough to show the appendages touching it.
// Eating stays in the shared feeding path so each particle is consumed once.
function handleShallowFood(s,meal,d,angle,dt){
 const reach=isGourami(s.type)?Math.min(34,s.length*.45):18;
 if(!meal||d>reach||Math.abs(angle)>1){
  s.handling=null;return false;
 }
 if(s.handling?.meal!==meal)s.handling={meal,start:elapsed};
 const held=elapsed-s.handling.start;
 if(s.type===BLUE_CRAYFISH&&held>.45&&held<1.1){
  const pull=1-Math.exp(-dt*4);meal.x+=(s.x-meal.x)*pull;meal.y+=(s.y-meal.y)*pull;
 }
 return held<(isGourami(s.type)?.85:1.1);
}
const [woodSprite,baskingSprite,creviceSprite,stoneSprite,leafSprite]=habitatTextures.map(src=>{
 const image=new Image();image.src=src;return image;
});
function drawHabitatSprite(c,image,site,w,h,angle){
 if(!image.naturalWidth)return;
 c.save();c.translate(site.x*width,site.y*height);c.rotate(angle);
 c.globalAlpha*=image===baskingSprite?.83:.62;
 c.drawImage(image,-w/2,-h/2,w,h);c.restore();
}
const pondStructures=[
 {types:[BASKING_TURTLE],image:baskingSprite,site:baskingStone,w:90,h:46,angle:-.24},
 {types:[KUHLI,SLEEPER],image:creviceSprite,site:rockGap,w:66,h:45,angle:-.28},
 {types:[PLECO,REDTAIL],image:woodSprite,site:sunkenWood,w:94,h:33,angle:.25}
];
function drawBottomHabitat(c){
 const sand=swimmers.some(s=>[DOJO,KUHLI,PANDA_CORY,GUDGEON,STERLET].includes(s.type));
 if(sand){
  c.save();c.translate(sandBed.x*width,sandBed.y*height);c.scale(130,52);
  const wash=c.createRadialGradient(0,0,.2,0,0,1);wash.addColorStop(0,'#c4b48366');wash.addColorStop(1,'#c4b48300');
  c.fillStyle=wash;c.fillRect(-1,-1,2,2);c.restore();
 }
 for(const r of pondStructures){
  if(swimmers.some(s=>r.types.includes(s.type)))drawHabitatSprite(c,r.image,r.site,r.w,r.h,r.angle);
 }
 for(const [key,site] of Object.entries(spawningBeds)){
  const type=Number(key),brood=garden.bedBroods?.[type];
  if(!brood&&!swimmers.some(s=>s.type===type))continue;
  if(type===ANGEL)drawHabitatSprite(c,leafSprite,site,71,24,-.45);
  else drawHabitatSprite(c,stoneSprite,site,56,30,-.45);
  if(!brood)continue;
  c.save();c.translate(site.x*width,site.y*height);c.rotate(-.45);
  c.fillStyle='#dac695';for(let i=0;i<14;i++){
   c.beginPath();c.ellipse(i%7*2.7-8,Math.floor(i/7)*3-2,1.1,1.5,0,0,2*Math.PI);c.fill();
  }
  c.restore();
 }

}
function drawShallowAction(c,s){
 const action=s.speciesAction;
 if(!action||action!==shallowHabits[s.type]?.[0])return;
 c.save();c.translate(s.x*width,s.y*height);c.rotate(s.angle);
 const grain=s.handling?.meal;
 if(grain){
  const dx=(grain.x-s.x)*width,dy=(grain.y-s.y)*height,co=Math.cos(s.angle),si=Math.sin(s.angle);
  const x=dx*co+dy*si,y=dy*co-dx*si;
  c.strokeStyle=isGourami(s.type)?'#dac692':s.type===BLUE_CRAYFISH?'#5e97ac':'#c58973';
  c.lineWidth=s.type===BLUE_CRAYFISH?2.8:1;
  for(const side of [-1,1]){
   const beat=Math.sin(elapsed*14+side)*2;
   c.beginPath();c.moveTo(-s.length*.24,side*3);c.quadraticCurveTo(-3,side*(7+beat),x,y+side*1.4);c.stroke();
  }
 }else if(s.type===DOJO||s.type===PANDA_CORY||s.type===STERLET||s.type===TENCH){
  for(let i=0;i<8;i++){
   const t=(elapsed*.8+i/8)%1;c.fillStyle='rgba(211,194,149,'+(.65*(1-t))+')';
   c.beginPath();c.arc(-t*15,Math.sin(i*2.4)*(2+12*t),1+t,0,2*Math.PI);c.fill();
  }
 }else if(s.type===PLECO){
  c.strokeStyle='#b8b19091';c.beginPath();c.ellipse(1,0,3+Math.sin(elapsed*8),3,0,0,2*Math.PI);c.stroke();
 }
 c.restore();
}

function updateScrapeTrail(s){
 const trail=s.scrapeTrail??=[];
 while(trail.length&&elapsed-trail[0].at>12)trail.shift();
 const last=trail[trail.length-1];
 if(s.activity==='沿石刮藻'&&(!last||Math.hypot((s.x-last.x)*width,(s.y-last.y)*height)>2)){
  trail.push({x:s.x,y:s.y,at:elapsed});
 }
 if(trail.length>1&&s.activity==='沿石刮藻')s.speciesAction=shallowHabits[NERITE][0];
}
function drawScrapeTrail(c,trail){
 for(let i=1;i<trail.length;i++){
  c.strokeStyle='rgba(209,207,161,'+Math.max(0,.5*(1-(elapsed-trail[i].at)/12))+')';
  c.lineWidth=2;c.beginPath();c.moveTo(trail[i-1].x*width,trail[i-1].y*height);c.lineTo(trail[i].x*width,trail[i].y*height);c.stroke();
 }
}
