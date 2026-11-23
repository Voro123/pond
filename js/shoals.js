"use strict";
// Short-lived shoals use a shared snapshot so each fish sees the same neighbours.
let shoalTick=0,shoalInvite=4;
function shoalClear(s,angle,rocks){
 const dx=Math.cos(angle),dy=Math.sin(angle),reach=Math.max(85,s.length*.85);
 for(const distance of [reach*.5,reach]){
  if(!waterPoint(s.x+dx*distance/width,s.y+dy*distance/height,s.fish.habitat))return false;
 }
 function inPath(x,y,radius){
  const ahead=x*dx+y*dy;
  return ahead>0&&ahead<reach+radius&&Math.abs(x*dy-y*dx)<radius;
 }
 if(s.fish.habitat==='pond'&&rocks.some(r=>inPath((r.site.x-s.x)*width,(r.site.y-s.y)*height,r.w*.5)))return false;
 return !swimmers.some(o=>o!==s&&o.shoal!==s.shoal&&o.fish.habitat===s.fish.habitat&&
  inPath((o.x-s.x)*width,(o.y-s.y)*height,Math.max(14,o.length*.18)));
}
function updateShoals(){
 if(elapsed<shoalTick)return;
 shoalTick=elapsed+.3;
 const rocks=pondStructures.filter(r=>swimmers.some(s=>r.types.includes(s.type)));
 const groups=new Set(swimmers.map(s=>s.shoal).filter(Boolean));
 for(const group of groups){
  const members=swimmers.filter(s=>s.shoal===group&&s.freeSwimming);
  const blocked=members.some(s=>!shoalClear(s,s.angle,rocks));
  if(blocked||members.length<3||group.until<=elapsed){
   for(const [i,s] of members.entries()){
    s.shoalReady=elapsed+8+Math.random()*8;
    if(!blocked)continue;
    const side=i%2?-1:1,spread=.55+i*.18;
    const offset=[side*spread,-side*spread,side*1.7,-side*1.7,Math.PI].find(a=>shoalClear(s,s.angle+a,rocks));
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
