"use strict";
// The scene texture contains the pond floor and submerged animals. The surface
// pass samples it through the normal of moving wave trains and local impulses.
function makeWaterSurface(output){
  const gl=output.getContext('webgl',{alpha:false,antialias:false,premultipliedAlpha:false,preserveDrawingBuffer:false});
  if(!gl)return null;
  const vertex='attribute vec2 pos;varying vec2 uv;void main(){uv=vec2(pos.x*.5+.5,.5-pos.y*.5);gl_Position=vec4(pos,0.,1.);}';
  const fragment=`
  precision highp float;
  varying vec2 uv;
  uniform sampler2D scene;
  uniform vec2 origin,view,world;
  uniform float time,light,reef;
  uniform vec4 impulses[16];
  uniform vec4 wakes[12];
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
  void main(){
    vec2 p=origin+uv*view; float inReef=step(world.x+96.,p.x); vec2 loc=(p-vec2(inReef*(world.x+96.),0.))/world;
    vec3 base=texture2D(scene,uv).rgb;
    float shore=smoothstep(.28,.37,loc.x+.68*loc.y);
    float pads=(1.-smoothstep(.10,.21,loc.x))*smoothstep(.62,.82,loc.y);
    float leaves=smoothstep(.6,.82,loc.x)*(1.-smoothstep(.19,.44,loc.y))*smoothstep(.02,.15,base.r-base.g);
    float wet=mix(shore*(1.-max(pads,leaves)),smoothstep(.15,.21,loc.x+.8*loc.y),inReef);
    wet*=1.-step(world.x,p.x)*(1.-inReef);
    float a=dot(p,vec2(.024,.034))+time*1.12+1.4*sin(p.x*.009-time*.32);
    float b=dot(p,vec2(-.038,.021))-time*.92+1.8*sin(p.y*.012+time*.24);
    float c=dot(p,vec2(.066,.045))+time*1.5+.9*sin(p.x*.018+time*.46);
    vec2 slope=vec2(.53,.85)*cos(a)*.52+vec2(-.88,.47)*cos(b)*.38+vec2(.82,.57)*cos(c)*.19;
    float ring=0.;
    for(int i=0;i<16;i++){
      vec4 w=impulses[i];vec2 d=p-w.xy;float r=length(d);float t=w.z;
      float phase=r-66.*t;
      float env=exp(-phase*phase/(110.+90.*t))*exp(-t*.8)*w.w;
      float wave=cos(phase*.32)*env;
      slope+=d/max(r,1.)*wave*1.7;ring+=wave;
    }
    // Two arms of a small bow wave trail behind a surface swimmer.
    for(int i=0;i<12;i++){
      vec4 w=wakes[i];vec2 d=p-w.xy;
      float aft=-dot(d,w.zw),across=dot(d,vec2(-w.w,w.z));
      float ridge=abs(across)-.27*aft;
      float envelope=smoothstep(0.,16.,aft)*(1.-smoothstep(30.,125.,aft))*exp(-ridge*ridge/75.);
      slope+=vec2(-w.w,w.z)*sign(across)*cos(ridge*.48)*envelope*.43;
    }
    float depth=.70+.42*smoothstep(.1,.74,loc.x+.15*loc.y);
    vec3 col=texture2D(scene,clamp(uv+wet*slope*3.5*depth/view,vec2(.001),vec2(.999))).rgb;
    float deep=smoothstep(.02,.68,loc.x)*.5+.35;
    col=mix(col,col*vec3(.80,.96,1.06),wet*deep);
    float sky=noise(p*.0031+slope*.19+vec2(time*.009,0.));
    float reflection=smoothstep(.26,.82,sky)*(.16+.09*slope.y)*wet;
    col=mix(col,vec3(.52,.69,.78),reflection);
    float focus=pow(max(0.,1.-abs(.57*sin(a)+.43*sin(b)+.20*sin(c))),12.);
    col+=vec3(.16,.19,.11)*focus*wet*(.14+.50*sky)*light;
    float glint=pow(max(0.,dot(normalize(vec3(slope*.35,1.)),normalize(vec3(-.31,-.21,.91)))),125.);
    col+=vec3(.70,.76,.62)*glint*wet*(.14+.57*smoothstep(.45,.82,sky))*light;
    col+=vec3(.18,.26,.23)*max(0.,ring)*wet;
    col*=mix(vec3(.40,.54,.68),vec3(1.),light);
    gl_FragColor=vec4(col,1.);
  }`;
  function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
  const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))return null;
  gl.useProgram(program);const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const pos=gl.getAttribLocation(program,'pos');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
  const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
  for(const key of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,key,gl.LINEAR);
  for(const key of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,key,gl.CLAMP_TO_EDGE);
  const u=Object.fromEntries(['origin','world','view','time','light','reef','impulses[0]','wakes[0]'].map(n=>[n,gl.getUniformLocation(program,n)]));
  const waves=new Float32Array(64),wakes=new Float32Array(48);
  return function(scene,w,h,cam,zoom,time,light,rings,fish,reef){
    if(gl.isContextLost())throw Error('surface context lost');
    gl.viewport(0,0,output.width,output.height);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,scene);
    gl.uniform2f(u.origin,cam.x,cam.y);gl.uniform2f(u.world,w,h);gl.uniform2f(u.view,output.clientWidth/zoom,output.clientHeight/zoom);
    waves.fill(0);rings.slice(-16).forEach((r,i)=>waves.set([r.x*w,r.y*h,r.age,r.power],i*4));
    wakes.fill(0);
    fish.filter(s=>s.x*w>=cam.x-160&&s.x*w<=cam.x+output.clientWidth/zoom+160).slice(0,12).forEach((s,i)=>wakes.set([s.x*w,s.y*h,Math.cos(s.angle),Math.sin(s.angle)],i*4));
    gl.uniform4fv(u['wakes[0]'],wakes);
    gl.uniform4fv(u['impulses[0]'],waves);gl.uniform1f(u.reef,reef?1:0);gl.uniform1f(u.time,time);gl.uniform1f(u.light,light);gl.drawArrays(gl.TRIANGLES,0,6);
  };
}
