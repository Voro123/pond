"use strict";
// Rows contain name, activity, adult size, growth tuning and optional market price.
const activity={
 cruise:['巡游','沿开阔水面缓缓巡游。',1], school:['结群','与同种伙伴靠拢，保持间距并跟随队形。',1.16],
 bottom:['伏底','在底层短距离觅食，随后贴底休息。',.68], shelter:['守巢','围绕藏身处活动，饵香会引它离巢。',.82],
 dart:['突游','在短促冲刺和悬停之间切换。',1.28], graze:['啃藻','沿浅滩慢行，在石面上停留啃藻。',.64],
 glide:['滑翔','舒展双鳍，在水中长距离滑行。',.88], night:['夜行','白天多伏藏，入夜后外出探索。',.85],
 bask:['晒背','在浅岸歇脚，偶尔换一块晒背的石头。',.54], ambush:['伏击','静候很久，发现食物才突然出击。',.72],
 scrape:['沿石刮藻','在浅滩石面慢慢刮食藻膜，恢复少量饱食度，也会靠近投下的藻屑。',.25],
 host:['依巢群游','绕海葵小范围结伴巡游，离群后会主动靠拢。',.92]
};
const speciesRows=[
 ['珍珠金鱼','cruise',16,8,40],['青鳉','school',4,6],['彩石鲋','school',8,8],['泥鳅','bottom',18,7],['白云金丝','school',4,6],['沙塘鳢','ambush',12,10],['丁鱥','graze',45,14],['棒花鱼','bottom',12,8],['小体鲟','glide',80,24,680],
 ['霓虹灯鱼','school',4,7],['孔雀鱼','dart',5,7],['暹罗斗鱼','shelter',7,12,65],['虎皮鱼','school',7,9],['斑马鱼','dart',5,6],['熊猫鼠鱼','bottom',5,10],['胡子异型','graze',12,14,45],['银斧鱼','glide',6,11],['库利泥鳅','night',10,11],
 ['红尾黑鲨','shelter',15,14,60],['珍珠丝足鲈','cruise',12,12,45],['丽丽鱼','shelter',8,10],['神仙鱼','glide',15,16,120],['美丽彩虹鱼','school',11,13,75],['条纹鳉','dart',8,10],['巧克力娃娃','ambush',3,13,90],['荷兰凤凰','shelter',7,14,110],['非洲蝴蝶鱼','ambush',11,16,180],
 ['公子小丑鱼','host',10,12,120],['蓝吊','school',28,20,480],['黄金吊','graze',20,18,800],['麒麟鱼','bottom',7,20,560],['长吻蝶鱼','graze',22,18,320],['睡衣天竺鲷','school',8,12,85],['紫雷达','dart',9,15,260],['皇家拟雀鲷','shelter',8,16,280],['邦盖天竺鲷','school',8,14,180],
 ['蓑鲉','ambush',32,24,650],['长角箱鲀','cruise',23,20,720],['黄箱鲀','shelter',25,18,420],['条纹斑竹鲨','night',85,28,2400],['蓝点魟','glide',45,26,1800],['喇叭鱼','ambush',55,22,580],['雪花海鳝','night',65,23,880],['竖琴尾花鮨','school',13,16,240],['鸟嘴隆头鱼','dart',26,17,360],
 ['青绿光鳃鱼','school',8,12,65],['镊口鱼','graze',19,20,450],['长吻鹰鱼','ambush',13,17,380],['镰鱼','glide',22,19,400],
 ['中华草龟','bask',20,16],['美西螈','bottom',22,18,160],['樱花虾','graze',3,6],['乌贼','dart',19,22,260],['蓝螯虾','night',14,14,80]
];
const TADPOLE=60, VISITOR=61, NERITE=62, SEA_STAR=63;
function habitatOf(type){return (type>=33&&type<=54)||type===58?'reef':'pond';}
function speciesKey(type){return type<6?0:type;}
function lifeDays(type,seed){
 const habit=type<6?'cruise':speciesRows[type-6]?.[1];
 return Math.round((type<6?3000:habit==='bask'?4300:habit==='school'?490:habit==='night'?1150:820)*(.85+seed*.3));
}

function sampleUnit(key){
 let h=2166136261;
 for(const ch of String(key))h=Math.imul(h^ch.charCodeAt(0),16777619);
 h^=h>>>16;h=Math.imul(h,0x85ebca6b);h^=h>>>13;
 return (h>>>0)/4294967296;
}

const traitDefs=[
 {id:'small',name:'小个子',scale:.72},
 {id:'large',name:'大块头',scale:1.4},
 {id:'glow',name:'闪闪发光',scale:1},
 {id:'fast',name:'游得快',scale:1}
];
function rollTraits(key){
 return traitDefs.filter(t=>sampleUnit(key+'/'+t.id)<.10).map(t=>t.id);
}
function traitValue(traits=[]){return 2**traits.length;}
function traitScale(traits=[]){return traitDefs.reduce((v,t)=>traits.includes(t.id)?v*t.scale:v,1);}
function traitText(traits=[]){
 const names=traitDefs.filter(t=>traits.includes(t.id)).map(t=>t.name);
 return names.length?names.join(' · ')+(traits.includes('fast')?'　游速 +50%':'')+'　身价 ×'+traitValue(traits):'无天生特性';
}
