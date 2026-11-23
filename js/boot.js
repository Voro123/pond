"use strict";
const SAVE_KEY="niwa.garden.v1";
const ARCHIVE_KEY=SAVE_KEY+'.alternate';
const GUIDE_KEY='niwa.guide.seen';
const firstGardenVisit=(()=>{
  try{return [GUIDE_KEY,SAVE_KEY,ARCHIVE_KEY].every(key=>localStorage.getItem(key)===null);}
  catch{return false;}
})();
// A JSON null distinguishes an intentionally empty slot from a first visit.
function isEmptySlot(){
  try{return localStorage.getItem(SAVE_KEY)==='null';}catch{return false;}
}
if(isEmptySlot()){
  const welcome=document.createElement('main');
  welcome.className='empty-slot';
  welcome.innerHTML='<section><h1>镜水庭</h1><p>暂无庭院存档</p><button class="primary-action">开辟新庭</button></section>';
  document.body.replaceChildren(welcome);
  welcome.querySelector('button').onclick=()=>{
    localStorage.removeItem(SAVE_KEY);
    location.reload();
  };
  window.addEventListener('storage',e=>{if(e.key===SAVE_KEY&&e.newValue&&e.newValue!=='null')location.reload();});
}else{
  const template=document.querySelector('#gameScripts');
  for(const source of template.content.querySelectorAll('script')){
    const script=document.createElement('script');
    if(source.hasAttribute('src')){script.async=false;script.src=source.getAttribute('src');}
    else script.textContent=source.textContent;
    document.body.append(script);
  }
  template.remove();
}
