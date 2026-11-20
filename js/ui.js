"use strict";
const $=s=>document.querySelector(s);
const paths={
 wave:'M2 8q3-3 6 0t6 0t8 0 M2 13q3-3 6 0t6 0t8 0 M2 18q3-3 6 0t6 0t8 0',book:'M12 6Q7 3 2 5v14q5-2 10 1 5-3 10-1V5q-5-2-10 1v14',journal:'M5 3h15v18H5z M9 3v18m3-13h5m-5 4h5',mute:'M3 9h4l5-4v14l-5-4H3z M16 9l6 6m0-6-6 6',volume:'M3 9h4l5-4v14l-5-4H3z M16 8q4 4 0 8m3-11q7 7 0 14',sun:'M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2 M17 12a5 5 0 1 0-10 0 5 5 0 1 0 10 0',clock:'M21 12a9 9 0 1 1-18 0 9 9 0 1 1 18 0 M12 6v6l4 2',expand:'M3 9V3h6m6 0h6v6m0 6v6h-6m-6 0H3v-6',pointer:'M5 3l14 11-7 1-3 6z',tool:'M3 7h18M3 17h18M8 4v6m8 4v6',eye:'M2 12q10-15 20 0-10 15-20 0 M15 12a3 3 0 1 1-6 0 3 3 0 1 1 6 0',feed:'M4 12h16q-1 8-8 8t-8-8 M7 8h1m4-4h1m3 4h1',scan:'M3 9V4h5m8 0h5v5m0 6v5h-5m-8 0H3v-5 M15 12a3 3 0 1 1-6 0 3 3 0 1 1 6 0',star:'m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z',sprout:'M12 21v-7Q12 5 21 4q0 10-9 10M12 17Q3 17 3 9q9 0 9 8',fish:'M3 12Q10 1 17 10l5-4v12l-5-4Q10 23 3 12z M8 10v1'};
function icon(name){return '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="'+paths[name]+'"/></svg>';}
document.querySelectorAll('[data-i]').forEach(el=>el.innerHTML=icon(el.dataset.i));
const tiles=new Map();
function buildTiles(){
  tiles.clear();$('#fishList').replaceChildren();
for(const f of koi.filter(f=>f.habitat===garden.zone)){
  const button=document.createElement('button');button.className="tile";button.innerHTML='<img alt="" src="'+f.image+'"><span>'+f.breed+'</span>';
  button.querySelector("img").style.filter=coloration(f);button.onclick=()=>selectFish(f);$('#fishList').append(button);tiles.set(f.id,button);
}
}
buildTiles();
function current(){return koi.find(f=>f.id===garden.selected);}
function selectFish(f){if(f.habitat!==garden.zone)switchZone(f.habitat);garden.selected=f.id;garden.focusFrog=null;chooseBait(f.habit==='scrape'?'algae':'grain');save();render();locateFish(f.id);showInspector(true);}
function render(){
  const now=Date.now(),minutes=Math.floor(Math.max(0,now-garden.created)*RATE/60000);
  $('#mapClock time').textContent='池时 '+gardenTime(now).toISOString().slice(11,16);
  $('#pondElapsed').textContent='已过 '+Math.floor(minutes/1440)+'天 '+Math.floor(minutes%1440/60)+'时 '+minutes%60+'分';
  $('#wallet').textContent=garden.jade;paintReturnStory();
  $('#count').textContent=koi.filter(f=>f.habitat===garden.zone).length+' / '+CAPACITY+' 尾';
  $('#clock').textContent=gardenTime().toISOString().slice(11,16);
  $('#peekImg').hidden=!current();$('#peekName').textContent=current()?.breed??'池中名册';
  if(current() && $('#peekImg').getAttribute('src')!==current().image)$('#peekImg').src=current().image;
  if(typeof paintFocus==='function'){paintFocus();}
  const empty=!current();
  $('.profile').hidden=empty;$('#marker').hidden=empty;
  if(empty)return;
  const f=current(),g=growthOf(f),fav=garden.favorites.includes(f.id);
  const value=appraisal(f),item=garden.fish[f.id];
  $('.portrait').classList.toggle('lustre',value.rank>=2&&g.maturity>=.5);
  $('#hunger').textContent=Math.round(g.full)+'% · '+(g.full>=88?'饱足':g.full>=55?'温饱':g.full>=25?'微饿':'饥饿');
  $('#foodbar').style.width=g.full+'%';$('#life').textContent=(typeof pondActivity==='function'?pondActivity(f):activity[f.habit][0])+' · 预计余寿 '+Math.ceil(g.remaining)+' 池日';
  $('#quality').textContent=value.reveal+' · 照料 '+item.care+'/3';
  $('#sell').disabled=g.maturity<1;$('#sell').textContent=g.maturity<1?'成年可出售':'出售 · '+value.price+' 玉';
  $('#portrait').style.filter=coloration(f);
  $('#serial').textContent="NO. "+f.id.slice(1).padStart(3,'0');
  $('#fishName').textContent=f.breed;$('#breed').textContent=(f.habitat==='reef'?'潮间礁池':'镜水庭')+' · '+f.kind;
  if($('#portrait').getAttribute('src')!==f.image)$('#portrait').src=f.image;
  $('#length').textContent=g.length.toFixed(1);$('#age').textContent=Math.floor(g.age);
  $('#traits').textContent=traitText(item.traits);
  $('#family').textContent=item.sex?(item.sex+'性 · '+(item.parents?'亲本 '+item.parents.map(p=>breeds[p.type??garden.fish[p.id]?.type]?.breed??'同种成鱼').join(' × '):g.maturity<1?'成年后可繁育':g.full<55?'补足鱼粮可繁育':Date.now()<(item.restUntil||0)?'繁育休养中':'可与同种异性繁育')):'';
  $('#fieldHabit').textContent=habitLine(f,item);
  $('#incomeInfo').textContent=incomeLine(f,item,now);
  $('#nature').textContent=f.nature;$('#phase').textContent=g.phase+' · '+Math.floor(g.maturity*100)+'%';
  $('#progress').style.width=(g.maturity*100)+'%';$('#marker').textContent=(fav?'★ ':'◇ ')+f.breed;
  $('#follow span').textContent=fav?'已关注':'关注';$('#follow').classList.toggle('on',fav);$('#follow').setAttribute('aria-pressed',fav);
  for(const [id,el] of tiles){el.classList.toggle('selected',id===f.id);el.classList.toggle('fav',garden.favorites.includes(id));el.setAttribute('aria-pressed',id===f.id);el.classList.toggle('adult',growthOf(koi.find(fish=>fish.id===id)).maturity===1);}
  $('#clock').textContent=gardenTime().toISOString().slice(11,16);
}
$('#follow').onclick=()=>{
  const f=current();if(garden.favorites.includes(f.id))garden.favorites=garden.favorites.filter(id=>id!==f.id);
  else {garden.favorites.push(f.id);record("开始关注「"+f.breed+"」。");}save();render();
};
let mode='observe';
const instructions={observe:'拖动游园 · 轻点生物观察',feed:'轻点鱼嘴前方或蝌蚪身旁撒饵',ripple:'在水面轻划拨水 · 点舆图换景'};
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{
  mode=b.dataset.mode;document.querySelectorAll('[data-mode]').forEach(el=>{el.classList.toggle('chosen',el===b);el.setAttribute('aria-pressed',el===b);});$('#hint span').textContent=instructions[mode];
});
const modal=$('dialog');
function showModal(type){
  $('#modalBody').replaceChildren();
  $('#modalTitle').textContent=type==='atlas'?'水庭生物图鉴':'庭院手记';
  if(type==='atlas'){
    fillAtlas($('#modalBody'));
  }else{
    addGardenSwitch($('#modalBody'));
    showFieldPhotos($('#modalBody'));
    const events=[...garden.events];
    for(const e of events.sort((a,b)=>b.at-a.at)){
      const div=document.createElement('div');div.className='log';const time=document.createElement('small');time.textContent=new Date(e.at).toLocaleString('zh-CN');div.append(time,document.createTextNode(e.text));$('#modalBody').append(div);
    }
  }
  document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.id===type));modal.showModal();
}
$('#atlas').onclick=()=>showModal('atlas');$('#journal').onclick=()=>showModal('journal');$('#home').onclick=()=>{};
modal.onclose=()=>document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.id==='home'));
$('#close').onclick=()=>modal.close();modal.onclick=e=>{if(e.target===modal && !e.target.closest('#modalBody') && (e.clientX<modal.offsetLeft||e.clientX>modal.offsetLeft+modal.offsetWidth||e.clientY<modal.offsetTop||e.clientY>modal.offsetTop+modal.offsetHeight))modal.close();};
$('#expand').onclick=async()=>{const p=document.documentElement;if(document.fullscreenElement)await document.exitFullscreen();else if(p.classList.contains('expanded'))p.classList.remove('expanded');else try{await p.requestFullscreen();}catch{p.classList.add('expanded');}};
let audio;
$('#sound').onclick=async()=>{
  if(!audio){audio=new AudioContext();const buffer=audio.createBuffer(1,audio.sampleRate*4,audio.sampleRate),samples=buffer.getChannelData(0);let last=0;for(let i=0;i<samples.length;i++){last=(last+(Math.random()-.5)*.06)/1.025;samples[i]=last*.36;}const noise=audio.createBufferSource();noise.buffer=buffer;noise.loop=true;noise.connect(audio.destination);noise.start();await audio.resume();}
  else if(audio.state==='running')await audio.suspend();else await audio.resume();
  const on=audio.state==='running';$('#sound i').innerHTML=icon(on?'volume':'mute');$('#sound').setAttribute('aria-pressed',on);
};
window.addEventListener('storage',e=>{if(e.key===SAVE_KEY){if(isEmptySlot()){location.reload();return;}const next=readState();if(next.created!==garden.created){location.reload();return;}garden=next;refreshPopulation();setBackdrop();if(modal.open)modal.close();}});
render();setInterval(render,1000);

let lastPlip=0;
function waterSound(power){
 if(!audio||audio.state!=='running'||audio.currentTime-lastPlip<.085)return;
 const now=audio.currentTime;lastPlip=now;
 const drop=audio.createOscillator(),gain=audio.createGain();drop.type='sine';
 const pitch=power>.6?380:650+Math.random()*230;
 drop.frequency.setValueAtTime(pitch,now);drop.frequency.exponentialRampToValueAtTime(pitch*.52,now+.095);
 gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.019*power,now+.005);
 gain.gain.exponentialRampToValueAtTime(.0001,now+.14);drop.connect(gain);gain.connect(audio.destination);
 drop.start(now);drop.stop(now+.15);drop.onended=()=>{drop.disconnect();gain.disconnect();};
}
