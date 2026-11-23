"use strict";
const BLUE_TANG=34,YELLOW_TANG=35,MANDARIN=36,LONGNOSE=37,PAJAMA=38,FIREFISH=39,DOTTYBACK=40;
const LIONFISH=42,COWFISH=43,BOXFISH=44,BAMBOO_SHARK=45,RIBBONTAIL=46,MORAY=48,BIRD_WRASSE=50,COPPERBAND=52,HAWKFISH=53;
const reefHabits={
 [WATCHMAN]:['洞口放哨','在左上礁石的沙边等它停稳。','它回到沙洞口，伏在入口前守望。'],
 [SIXLINE]:['穿梭礁隙','在右下珊瑚边观察它来回穿行。','它贴着礁缘，在三个错开的落点间穿梭。'],
 [GRAMMA]:['贴壁绕檐','观察左上礁壁的外缘。','它沿岩壁外侧划过短弧，再折回岩檐。'],
 [CONVICT]:['沿礁割藻','在右下礁面看它怎样换到下一处藻面。','它沿一排藻面逐段取食，在每个落点停一会儿。'],
 [GOATFISH]:['双须探沙','在浅沙地等它放慢。','它边走边摆动颏下的双须，扫过沙面。'],
 [PICASSO]:['吹开浮沙','在沙地边缘观察它的吻前。','它朝一处沙面吹出一束细沙，再换到旁边搜索。'],
 [LEOPARD_WRASSE]:['夜间埋沙','入夜后到中央沙地找它。','它在沙地停下，身上的豹纹逐渐隐入沙色。'],
 [BLUEHEAD]:['折身截饵','向它身侧不远处投鱼粮。','它转向侧面的落饵，对准后加速截取。'],
 [FLAME_ANGEL]:['礁壁点藻','把藻屑撒在它附近。','它游近藻屑，在最后一小段放慢，吻尖逐下轻点。'],
 [FILEFISH]:['长吻探珊瑚','在右下珊瑚丛寻找它的长吻。','它依次把长吻凑到几个相邻的珊瑚枝端。'],
 [BLENNY]:['换石刮藻','在礁脊等它从一块石面挪到下一块。','它在两处石面间短移，停稳后用嘴贴着石面刮食。'],
 [BLACKTIP]:['绕沙坪巡游','跟着它看中央沙坪的外圈。','它沿沙坪外缘绕行，以宽弧转向，持续游过开阔水域。'],
 [MANDARIN]:['底面点啄','沿右下珊瑚边找它。','它在礁脚逐点停下，嘴尖贴近底面拣食。'],
 [LONGNOSE]:['探吻石缝','等它游近左上的礁石。','它从石缘将长吻探入狭缝。'],
 [COPPERBAND]:['换角探隙','观察同一道石缝的两端。','它转到石缝另一侧，再把细吻探进去。'],
 [BIRD_WRASSE]:['巡礁探食','沿珊瑚外缘观察它的路线。','它沿礁缘一路搜索，在突出处短暂停步探食。'],
 [FIREFISH]:['受扰退洞','等它在洞前悬停，再用拨水工具。','它从洞前急退到石影里，过一会儿才重新探出。'],
 [DOTTYBACK]:['巡守洞口','在左上石影外等它折返。','它沿洞缘巡回，绕一圈又游回原来的入口。'],
 [HAWKFISH]:['换位停栖','在右侧礁脊观察它歇脚。','它在凸起处静候，随后短游到另一处高点。'],
 [MORAY]:['隙中探头','白天在左上石缝观察头部。','它把身体留在石影里，头部探出后缓缓缩回。'],
 [PAJAMA]:['昼间聚礁','白天找两尾一起停在礁旁的睡衣天竺鲷。','同伴在白天聚到礁体旁，保持间距缓缓悬停。'],
 [RIBBONTAIL]:['礁沿歇伏','白天留意左上的岩缘。','它在礁沿贴底歇伏，尾部伸在外面。'],
 [BAMBOO_SHARK]:['夜巡沙沿','入夜后去沙地与礁石交界处找它。','白天藏身的鲨鱼入夜离开石影，沿沙地边缘巡游。'],
 [LIONFISH]:['展鳍缓逼','在它前方不远处投饵。','它展开胸鳍缓慢逼近，接近后才加速取食。'],
 [BLUE_TANG]:['水中截食','在蓝吊前方稍远处投下鱼粮。','它离开原来的巡游路线，横切向水中的食粒。'],
 [YELLOW_TANG]:['连啄藻面','看它如何沿礁面移动。','它在同一块礁面上连续点啄，再向旁边挪几步。'],
 [COWFISH]:['吹沙觅食','在白沙地留意吻前的小沙云。','它把吻对准沙地，嘴前扬起一小束沙粒。'],
 [BOXFISH]:['沿底啄食','观察它在沙石交界处停下的样子。','它逐点贴近底面，以小口啄取食物。']
};
// Local positions on reef.webp: volcanic rock at upper left, coral along
// the lower right border and exposed sand between the two.
function reefPoint(x,y){return {x:zoneStart('reef')/width+x,y};}
// Advance after reaching a station so even a distant newcomer completes each stop.
const reefStations={
 [SIXLINE]:{points:[[.70,.78],[.76,.72],[.73,.81]],pause:.4},
 [CONVICT]:{points:[[.66,.81],[.68,.80],[.70,.79],[.72,.78]],pause:3},
 [PICASSO]:{points:[[.50,.61],[.53,.62],[.52,.58]],pause:4},
 [FILEFISH]:{points:[[.80,.78],[.812,.765],[.822,.782]],pause:2.5},
 [BLENNY]:{points:[[.83,.69],[.86,.66]],pause:6}
};
function reefStation(s,seed,route){
 s.stationIndex??=Math.floor(seed*route.points.length)%route.points.length;
 const point=reefPoint(...route.points[s.stationIndex]);
 if(Math.hypot((s.x-point.x)*width,(s.y-point.y)*height)<18){
  s.stationSince??=elapsed;
  if(elapsed-s.stationSince>=route.pause){
   s.stationIndex=(s.stationIndex+1)%route.points.length;
   s.stationSince=null;
  }
 }else s.stationSince=null;
 return point;
}
function reefDestination(s,seed,hour){
 const t=elapsed+seed*12,day=hour>=7&&hour<19;
 if(reefStations[s.type])return reefStation(s,seed,reefStations[s.type]);
 switch(s.type){
 case WATCHMAN:return reefPoint(.185+seed*.014,.232);
 case GRAMMA:return reefPoint(.19+.028*Math.cos(t*.24),.218+.015*Math.sin(t*.24));
 case GOATFISH:return reefPoint(.54+.054*Math.sin(t*.18),.60+.012*Math.sin(t*.36));
 case LEOPARD_WRASSE:return day?null:reefPoint(.48+.035*seed,.56+.022*seed);
 case BLACKTIP:{
  const center=reefPoint(.5,.47);
  const ahead=Math.atan2((s.y-center.y)/.20,(s.x-center.x)/.27)+.25;
  return reefPoint(.5+.27*Math.cos(ahead),.47+.20*Math.sin(ahead));
 }
 case MANDARIN:return reefPoint(.69+.023*Math.sin(Math.floor(t/3)*2),.85+.014*Math.cos(Math.floor(t/3)));
 case LONGNOSE:return reefPoint(.153+.009*Math.sin(t*.9),.209);
 case COPPERBAND:return reefPoint(.178+.018*Math.cos(t*.34),.184+.015*Math.sin(t*.34));
 case BIRD_WRASSE:return reefPoint(.82+.067*Math.sin(t*.20),.70-.072*Math.sin(t*.20));
 case FIREFISH:return reefPoint(.15,.22);
 case DOTTYBACK:return reefPoint(.177+.026*Math.cos(t*.25),.192+.022*Math.sin(t*.25));
 case HAWKFISH:return reefPoint(.865+.021*Math.cos(Math.floor(t/7)*2),.67+.029*Math.sin(Math.floor(t/7)*2));
 case MORAY:return day?reefPoint(.177+.008*Math.sin(t*.53),.183):null;
 case PAJAMA:return day?reefPoint(.79+.015*seed,.76+.019*seed):null;
 case RIBBONTAIL:return day?reefPoint(.137,.197):null;
 case BAMBOO_SHARK:return day?reefPoint(.115,.178):reefPoint(.48+.22*Math.sin(t*.07),.69+.05*Math.cos(t*.12));
 case YELLOW_TANG:return reefPoint(.785+.02*Math.sin(Math.floor(t/4)*1.8),.77+.012*Math.cos(Math.floor(t/4)));
 case COWFISH:return reefPoint(.51+.022*Math.sin(Math.floor(t/5)),.51);
 case BOXFISH:return reefPoint(.65+.028*Math.cos(Math.floor(t/4)),.84+.012*Math.sin(Math.floor(t/4)));
 default:return null;
 }
}
function reefAction(s,site,d,hour){
 if(!site||!reefHabits[s.type])return false;
 switch(s.type){
 case BLACKTIP:{
  const center=reefPoint(.5,.47),radius=Math.hypot((s.x-center.x)/.27,(s.y-center.y)/.20);
  return Math.abs(radius-1)<.16&&s.speed>10;
 }
 case SIXLINE:return d<95&&s.speed>8;
 case GRAMMA:case GOATFISH:return d<40&&s.speed>3;
 case FIREFISH:return s.retreatUntil>elapsed&&d<20;
 case PAJAMA:return d<42&&swimmers.some(o=>o!==s&&o.type===PAJAMA&&Math.hypot((o.x-s.x)*width,(o.y-s.y)*height)<85);
 case BAMBOO_SHARK:return (hour<7||hour>=19)&&d<95&&s.speed>4;
 case BIRD_WRASSE:case DOTTYBACK:return d<48&&s.speed>3;
 default:return d<20;
 }
}
function drawReefDetail(c,s){
 if(!s.speciesAction||s.speciesAction!==reefHabits[s.type]?.[0])return;
 c.save();c.translate(s.x*width,s.y*height);c.rotate(s.angle);
 if(s.type===COWFISH||s.type===PICASSO){
  for(let i=0;i<15;i++){
   const t=(elapsed*1.4+i/15)%1;c.fillStyle='rgba(223,213,173,'+(.75*(1-t))+')';
   c.beginPath();c.arc(3+t*24,t*Math.sin(i*3.8)*11,1+t,0,2*Math.PI);c.fill();
  }
 }else if(s.type===GOATFISH){
  const sweep=Math.sin(elapsed*5)*3;c.strokeStyle='#e6bf8a';c.lineWidth=1;
  for(const side of [-1,1]){
   c.beginPath();c.moveTo(-2,side*2);c.quadraticCurveTo(4,side*4,7,side*(6+sweep));c.stroke();
  }
 }else if([FLAME_ANGEL,CONVICT,FILEFISH,BLENNY,MANDARIN,LONGNOSE,COPPERBAND,BIRD_WRASSE,YELLOW_TANG,BOXFISH].includes(s.type)){
  const t=(elapsed*(s.type===YELLOW_TANG?2.5:1.4))%1;c.strokeStyle='rgba(212,211,171,'+(.55*(1-t))+')';
  c.beginPath();c.ellipse(2,0,2+t*4,1+t*3,0,-1,1);c.stroke();
 }else if(s.type===LIONFISH){
  for(const side of [-1,1]){
   c.strokeStyle='#d9bc8b99';c.lineWidth=1.3;
   for(let i=0;i<6;i++){
    c.beginPath();c.moveTo(-s.length*.26,side*3);c.lineTo(-s.length*(.2+i*.07),side*s.length*(.22+.08*Math.sin(i*.6)));c.stroke();
   }
  }
 }
 c.restore();
}
