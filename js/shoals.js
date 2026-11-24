"use strict";
// Short-lived shoals use a shared snapshot so each fish sees the same neighbours.
let shoalTick=0,shoalInvite=4;
let visibleRocks=[];
let reefOutcrop;
const spawningStone={site:spawningBeds[RAM],w:56};
// The renderer shears vertical texture strips along the spine. Half the sprite
// height bounds fins as well as the trunk, including during a tail beat.
function bodyRadius(s){
 const aspect=s.sprite.naturalWidth?s.sprite.naturalHeight/s.sprite.naturalWidth:.48;
 return s.length*aspect*.5;
}
// Use the same bank, stones and log capsule as the body collision pass.
function feedingClearance(s,x,y){
 const zone=s.fish.habitat;
 let space=bankClearance(x,y,zone);
 for(const rock of visibleRocks){
  if(Boolean(rock.reef)!==(zone==='reef'))continue;
  if(s.type===HILLSTREAM&&rock.site===baskingStone)continue;
  let dx=x-rock.site.x*width,dy=y-rock.site.y*height;
  if(rock===driftwood){
   const axis=woodContact(dx,dy);dx-=axis.x;dy-=axis.y;
  }
  const radius=rock===driftwood?rock.h*.5:rock===crevice?creviceRadius:rock.w*.5;
  space=Math.min(space,Math.hypot(dx,dy)-radius);
 }
 return space;
}
function feedingSegment(s,a,b,margin){
 const dx=b.x-a.x,dy=b.y-a.y,steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/12));
 // Allow departure from contact, including when a new prop appears underneath.
 let required=Math.min(margin,feedingClearance(s,a.x,a.y));
 for(let i=1;i<=steps;i++){
  const space=feedingClearance(s,a.x+dx*i/steps,a.y+dy*i/steps);
  if(space<required-.01)return false;
  required=Math.min(margin,Math.max(space,required));
 }
 return true;
}
function findFeedingPath(s,start,goal,margin){
 const step=Math.max(32,margin),queue=[{...start,col:0,row:0}],seen=new Set(['0,0']);
 for(let i=0;i<queue.length;i++){
  const node=queue[i];
  if(i&&feedingSegment(s,node,goal,margin)){
   const path=[];
   for(let p=node;p.parent;p=p.parent)path.push(p);
   return path.reverse();
  }
  for(const [dc,dr] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const col=node.col+dc,row=node.row+dr,key=col+','+row;
   if(seen.has(key))continue;
   const next={x:start.x+col*step,y:start.y+row*step,col,row,parent:node};
   if(feedingClearance(s,next.x,next.y)<margin||!feedingSegment(s,node,next,margin))continue;
   seen.add(key);queue.push(next);
  }
 }
 return [];
}
function feedingWaypoint(s,meal,margin){
 const start={x:s.x*width,y:s.y*height},goal={x:meal.x*width,y:meal.y*height};
 let route=s.mealRoute;
 const room=Math.min(feedingClearance(s,goal.x,goal.y),margin+Math.max(12,s.length*.12));
 if(feedingSegment(s,start,goal,route?.meal===meal?room:margin)){s.mealRoute=null;return goal;}
 if(!route||route.meal!==meal||Math.hypot(goal.x-route.goal.x,goal.y-route.goal.y)>20||
    !route.path.length||!feedingSegment(s,start,route.path[0],margin)){
  let path=findFeedingPath(s,start,goal,room);
  if(!path.length&&room>margin)path=findFeedingPath(s,start,goal,margin);
  route=s.mealRoute={meal,goal,path};
  if(!path.length){
   s.missedMeals??=new WeakMap();
   s.missedMeals.set(meal,elapsed+1);
  }
 }
 // Skip grid corners as soon as the next stretch is visible from the mouth.
 while(route.path.length>1&&feedingSegment(s,start,route.path[1],room))route.path.shift();
 return route.path[0];
}
function rockDetour(s,angle,habitatSite,seed){
 const dx=Math.cos(angle),dy=Math.sin(angle),halfWidth=bodyRadius(s);
 let nearest=null,best=Math.max(100,s.length*1.5),heading=angle;
 s.accessRock=null;
 for(const rock of visibleRocks){
  if(Boolean(rock.reef)!==(s.fish.habitat==='reef'))continue;
  const rx=(rock.site.x-s.x)*width,ry=(rock.site.y-s.y)*height;
  const radius=(rock===crevice?creviceRadius:rock.w*.5)+halfWidth+8;
  const visitsWood=rock===driftwood&&rock.types.includes(s.type);
  const usesSurface=rock.reef||(rock.site===baskingStone&&rock.types.includes(s.type))||(rock===spawningStone&&s.type===RAM);
  if(habitatSite&&(visitsWood||usesSurface&&Math.hypot((rock.site.x-habitatSite.x)*width,(rock.site.y-habitatSite.y)*height)<rock.w*.65)){
   s.accessRock=rock;continue;
  }
  // Keep the chosen course until the tail has passed the obstacle as well.
  if(rock===s.passingRock){
   const tail=s.bones[SPINE_SEGMENTS];
   const projection=(tail.x-rock.site.x*width)*Math.cos(s.passAngle)+(tail.y-rock.site.y*height)*Math.sin(s.passAngle);
   const reach=Math.max(80,s.length);
   const bankAhead=bankClearance(s.x*width+reach*Math.cos(s.passAngle),s.y*height+reach*Math.sin(s.passAngle),s.fish.habitat);
   if(bankAhead>halfWidth&&projection<radius&&Math.hypot(rx,ry)<2*s.length+radius+100)return s.passAngle;
  }
  const ahead=rx*dx+ry*dy,cross=rx*dy-ry*dx;
  if(ahead<=0||ahead>=best||Math.abs(cross)>=radius)continue;
  // An entrance on the near rim ends the approach before the rock behind it.
  if(rock===crevice&&habitatSite){
   const travel=Math.hypot((habitatSite.x-s.x)*width,(habitatSite.y-s.y)*height);
   if(ahead>travel&&Math.hypot(rx-dx*travel,ry-dy*travel)>=radius-8)continue;
  }
  const side=Math.abs(cross)>2?Math.sign(cross):(seed<.5?-1:1);
  const tangent=Math.asin(Math.min(1,radius/Math.max(1,Math.hypot(rx,ry))))+.19;
  const bearing=Math.atan2(ry,rx),reach=Math.max(80,s.length);
  const clearsBank=course=>bankClearance(s.x*width+reach*Math.cos(course),s.y*height+reach*Math.sin(course),s.fish.habitat)>halfWidth;
  let course=bearing+side*tangent;
  if(!clearsBank(course))course=bearing-side*tangent;
  if(!clearsBank(course))continue;
  heading=course;
  nearest=rock;best=ahead;
 }
 s.passingRock=nearest;s.passAngle=heading;
 return heading;
}
function slideBody(s,ox,oy){
 s.x+=ox/width;s.y+=oy/height;
 for(const bone of s.bones){bone.x+=ox;bone.y+=oy;}
}
function clearBodyObstacles(s,dt){
 const margin=bodyRadius(s)+s.length/(2*SPINE_SEGMENTS);
 const maxSlide=dt*(100+s.speed+1.5*s.length*Math.abs(s.angular));
 for(const rock of visibleRocks){
  if(rock===s.accessRock&&rock!==driftwood||Boolean(rock.reef)!==(s.fish.habitat==='reef'))continue;
  const x=rock.site.x*width,y=rock.site.y*height;
  // The half-segment margin covers the space between sampled spine points.
  const outerRadius=rock===crevice?creviceRadius:rock.w*.5;
  if(Math.hypot(s.x*width-x,s.y*height-y)>s.length+outerRadius+margin)continue;
  const radius=(rock===driftwood?rock.h*.5:outerRadius)+margin;
  let nx=0,ny=0,min=radius*radius;
  for(const bone of s.bones){
   let dx=bone.x-x,dy=bone.y-y;
   if(rock===driftwood){
    const axis=woodContact(dx,dy);dx-=axis.x;dy-=axis.y;
   }
   const d=dx*dx+dy*dy;
   if(d<min){min=d;nx=dx;ny=dy;}
  }
  if(min>=radius*radius)continue;
  const distance=Math.sqrt(min);
  const angle=distance>.1?Math.atan2(ny,nx):s.angle+Math.PI/2;
  // Slide the complete pose together. Ease out if a newly visible prop starts inside it.
  const push=Math.min(radius-distance,maxSlide);
  slideBody(s,Math.cos(angle)*push,Math.sin(angle)*push);
 }
 const zone=s.fish.habitat;
 if(bankClearance(s.x*width,s.y*height,zone)>s.length+margin)return;
 // At a shoreline corner the belly and tail can touch different banks.
 for(let pass=0;pass<3;pass++){
  let clearance=margin,contact;
  for(const bone of s.bones){
   const d=bankClearance(bone.x,bone.y,zone);
   if(d<clearance){clearance=d;contact=bone;}
  }
  if(!contact||margin-clearance<.01)break;
  const {x,y}=contact;
  const nx=bankClearance(x+1,y,zone)-bankClearance(x-1,y,zone);
  const ny=bankClearance(x,y+1,zone)-bankClearance(x,y-1,zone);
  const push=Math.min(margin-clearance,maxSlide)/Math.max(.01,Math.hypot(nx,ny));
  slideBody(s,nx*push,ny*push);
  if(margin-clearance>maxSlide)break;
 }
}
function shoalClear(s,angle,rocks){
 const dx=Math.cos(angle),dy=Math.sin(angle),reach=Math.max(85,s.length*.85);
 for(const distance of [reach*.5,reach]){
  if(!waterPoint(s.x+dx*distance/width,s.y+dy*distance/height,s.fish.habitat))return false;
 }
 function inPath(x,y,radius){
  const ahead=x*dx+y*dy;
  return ahead>0&&ahead<reach+radius&&Math.abs(x*dy-y*dx)<radius;
 }
 if(rocks.some(r=>Boolean(r.reef)===(s.fish.habitat==='reef')&&inPath((r.site.x-s.x)*width,(r.site.y-s.y)*height,r.w*.5)))return false;
 return !swimmers.some(o=>o!==s&&o.shoal!==s.shoal&&o.fish.habitat===s.fish.habitat&&
  inPath((o.x-s.x)*width,(o.y-s.y)*height,Math.max(14,o.length*.18)));
}
function updateShoals(){
 if(elapsed<shoalTick)return;
 shoalTick=elapsed+.3;
 visibleRocks=pondStructures.filter(r=>swimmers.some(s=>r.types.includes(s.type)));
 if(garden.bedBroods?.[RAM]||swimmers.some(s=>s.type===RAM))visibleRocks.push(spawningStone);
 if(garden.reef){
  reefOutcrop??={site:reefPoint(.181,.199),w:170,reef:true};
  visibleRocks.push(reefOutcrop);
 }
 const groups=new Set(swimmers.map(s=>s.shoal).filter(Boolean));
 for(const group of groups){
  const members=swimmers.filter(s=>s.shoal===group&&s.freeSwimming);
  const blocked=members.some(s=>!shoalClear(s,s.angle,visibleRocks));
  if(blocked||members.length<3||group.until<=elapsed){
   for(const [i,s] of members.entries()){
    s.shoalReady=elapsed+8+Math.random()*8;
    if(!blocked)continue;
    const side=i%2?-1:1,spread=.55+i*.18;
    const offset=[side*spread,-side*spread,side*1.7,-side*1.7,Math.PI].find(a=>shoalClear(s,s.angle+a,visibleRocks));
    s.scatterAngle=s.angle+(offset??Math.PI);s.scatterUntil=elapsed+2.8;
   }
   for(const s of members)s.shoal=null;
   continue;
  }
  let x=0,y=0,dx=0,dy=0,speed=0;
  for(const s of members){x+=s.x;y+=s.y;dx+=Math.cos(s.angle);dy+=Math.sin(s.angle);speed+=s.speed;}
  const n=members.length;
  Object.assign(group,{x:x/n,y:y/n,angle:Math.atan2(dy,dx),speed:speed/n});
 }
 if(elapsed<shoalInvite)return;
 shoalInvite=elapsed+3+Math.random()*4;
 const pool=swimmers.filter(s=>s.freeSwimming&&!s.shoal&&!(s.shoalReady>elapsed));
 for(const leader of pool){
  if(leader.shoal||Math.random()>.35)continue;
  const members=[leader];
  for(const s of pool){
   if(s===leader||s.shoal||s.fish.habitat!==leader.fish.habitat)continue;
   if(members.some(m=>Math.min(s.length,m.length)<.75*Math.max(s.length,m.length)))continue;
   if(Math.cos(s.angle-leader.angle)<.4||Math.hypot((s.x-leader.x)*width,(s.y-leader.y)*height)>170)continue;
   members.push(s);if(members.length===5)break;
  }
  if(members.length<3)continue;
  const group={until:elapsed+9+Math.random()*8,x:leader.x,y:leader.y,angle:leader.angle,speed:leader.speed};
  for(const s of members)s.shoal=group;
 }
}
