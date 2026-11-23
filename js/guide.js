(()=>{
 const guide=$('#guide'),card=guide.querySelector('.guide-card'),help=$('#guideHelp');
 const steps=[
  ['[data-mode="observe"]','观察池中生物','选中「观察」后，拖动水面四处看看。轻点一尾鱼，就能查看它的档案。'],
  ['[data-mode="feed"]','在水面投喂','切换到「投喂」，选好饵料，再轻点想撒下饵料的水面。'],
  ['#market','去鱼市逛逛','点「鱼市」，用庭玉购入鱼苗。以后想重看教程，点右上角的问号即可。']
 ];
 let step=0;
 function position(){
  if(!guide.open)return;
  const rect=$(steps[step][0]).getBoundingClientRect();
  const width=guide.clientWidth,height=guide.clientHeight;
  const left=Math.max(2,rect.left-4),right=Math.min(width-2,rect.right+4);
  const top=Math.max(2,rect.top-4),bottom=Math.min(height-2,rect.bottom+4);
  for(const [name,value] of Object.entries({left,right,top,bottom})){
   guide.style.setProperty('--'+name,value+'px');
  }
  card.style.left=Math.max(8,Math.min((left+right-card.offsetWidth)/2,width-card.offsetWidth-8))+'px';
  const above=top-card.offsetHeight-12;
  card.style.top=(above>=8?above:Math.min(bottom+12,height-card.offsetHeight-8))+'px';
 }
 function render(){
  $('#guideCount').textContent='新手教程 · '+(step+1)+' / '+steps.length;
  $('#guideTitle').textContent=steps[step][1];
  $('#guideText').textContent=steps[step][2];
  $('#guideNext').textContent=step===steps.length-1?'开始游园':'下一步';
  position();
 }
 function start(){
  step=0;
  guide.showModal();
  render();
  try{localStorage.setItem(GUIDE_KEY,'1');}catch{}
 }
 $('#guideNext').onclick=()=>{if(step===steps.length-1)guide.close();else{step++;render();}};
 $('#guideSkip').onclick=()=>guide.close();
 guide.addEventListener('close',()=>help.focus());
 window.addEventListener('resize',position);
 const observer=new ResizeObserver(position);
 for(const [selector] of steps)observer.observe($(selector));
 observer.observe(card);
 help.onclick=start;
 if(firstGardenVisit)start();
})();
