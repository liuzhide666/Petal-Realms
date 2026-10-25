/* Original Canvas 2D skill marks. Pure presentation, no timers, state writes or RNG. */
(()=>{'use strict';const TAU=Math.PI*2;
const colors={storm:'#efe1a2',volley:'#a2dbea',barrier:'#b7dbed',heal:'#b7e5ab',overdrive:'#f4cb82'};
function ring(c,r,color,width=2){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.arc(0,0,r,0,TAU);c.stroke()}
function leaf(c,x,y,angle,size,color){c.save();c.translate(x,y);c.rotate(angle);c.fillStyle=color;c.beginPath();c.ellipse(0,0,size,size*.4,0,0,TAU);c.fill();c.restore()}
function draw(c,e,time,{low=false,reduced=false}={}){
 const age=time-e.start;if(age<0||age>=e.duration)return false;const q=age/e.duration,color=colors[e.type];if(!color)return false;
 c.save();c.translate(e.x,e.y);c.globalAlpha=(1-q)*.75;c.lineCap='round';
 if(e.type==='storm'){
  // This is an afterimage of the instantaneous hit radius, not another damage wave.
  ring(c,e.radius,color,1.7);const count=low||reduced?3:7;
  for(let i=0;i<count;i++){c.save();c.rotate(i*TAU/count+(reduced?0:q*1.8));c.strokeStyle=color;c.lineWidth=3;c.beginPath();c.arc(0,0,e.radius*.76,i*.07,.6+i*.07);c.stroke();c.restore()}
 }else if(e.type==='heal'){
  const count=low||reduced?4:8;for(let i=0;i<count;i++){const a=i*TAU/count,d=reduced?e.radius*.7:e.radius*(1-q*.65);leaf(c,Math.cos(a)*d,Math.sin(a)*d,a-.5,7,color)}
  c.strokeStyle=color;c.lineWidth=3;c.beginPath();c.moveTo(-8,0);c.lineTo(8,0);c.moveTo(0,-8);c.lineTo(0,8);c.stroke();
 }else if(e.type==='volley'){
  const count=low||reduced?5:10;for(let i=0;i<count;i++){const a=i*TAU/count,d=e.radius*(reduced?1:1+q*.6);c.save();c.rotate(a);c.strokeStyle=color;c.lineWidth=2;c.beginPath();c.moveTo(d-9,-5);c.lineTo(d,0);c.lineTo(d-9,5);c.stroke();c.restore()}
 }else if(e.type==='barrier'){
  ring(c,e.radius*(reduced?1:.85+q*.15),color,2);
 }else if(e.type==='overdrive'){
  const count=low||reduced?4:8;for(let i=0;i<count;i++){const a=i*TAU/count;leaf(c,Math.cos(a)*e.radius,Math.sin(a)*e.radius,a,6,color)}
 }
 c.restore();return true;
}
function buffs(c,p,state,time,{low=false,reduced=false}={}){
 const active=[['barrier','守护 · 减伤42%'],['overdrive','超载']].filter(([key])=>state[key]>time);if(!active.length)return 0;
 c.save();c.translate(p.x,p.y);let line=0;
 for(const[key,label]of active){const remaining=state[key]-time,color=colors[key];c.globalAlpha=.5+Math.min(.5,remaining*.625);
  if(key==='barrier'){c.strokeStyle=color;c.lineWidth=2.5;c.beginPath();for(let i=0;i<=6;i++){const a=i*TAU/6-Math.PI/2,r=p.r+12;if(i)c.lineTo(Math.cos(a)*r,Math.sin(a)*r);else c.moveTo(Math.cos(a)*r,Math.sin(a)*r)}c.stroke();if(!low&&!reduced)ring(c,p.r+16,color,.7)}
  else{ring(c,p.r+21,color,2);if(!low&&!reduced)for(let i=0;i<6;i++){const a=i*TAU/6+time*.8;leaf(c,Math.cos(a)*(p.r+23),Math.sin(a)*(p.r+23),a,4,color)}}
  c.globalAlpha=1;c.font='600 11px system-ui';c.textAlign='center';c.lineWidth=3;c.strokeStyle='#254431';c.fillStyle=color;const text=label+' '+remaining.toFixed(1)+'s',y=p.r+34+line++*15;c.strokeText(text,0,y);c.fillText(text,0,y);
 }
 c.restore();return active.length;
}
function projectile(c,s){c.save();c.translate(s.x,s.y);c.rotate(Math.atan2(s.vy,s.vx));c.fillStyle=colors.volley;c.strokeStyle='#ebf2d5';c.lineWidth=1.3;c.beginPath();c.moveTo(s.radius+1,0);c.lineTo(-s.radius,-s.radius*.65);c.lineTo(-s.radius*.5,0);c.lineTo(-s.radius,s.radius*.65);c.closePath();c.fill();c.stroke();c.restore()}
globalThis.PetalEffects=Object.freeze({draw,buffs,projectile});
})();
