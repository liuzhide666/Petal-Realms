const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../site/index.html'),'utf8');
const from=html.indexOf('const PETAL_WORLD_SCALE='),to=html.indexOf('function actMode(){',from);
assert.ok(from>0&&to>from,'collision functions present');
const sandbox=vm.createContext({Math,Number});
vm.runInContext(html.slice(from,to),sandbox);
function run(code){return vm.runInContext(code,sandbox)}
const c={mobCollider:run('mobCollider'),mobCircleOverlap:run('mobCircleOverlap'),mobSupportRadius:run('mobSupportRadius')};
let n=0;function ok(expr,name){assert.ok(expr,name);n++}
ok(c.mobCircleOverlap({t:'ant',r:20,x:0,y:0,facing:0},0,0,0),'point inside ellipse');
ok(c.mobCircleOverlap({t:'ant',r:20,x:0,y:0,facing:0},0,19,1),'point near long axis');
ok(!c.mobCircleOverlap({t:'ant',r:20,x:0,y:0,facing:0},0,19,0),'outside long axis without petal');
ok(!c.mobCircleOverlap({t:'ant',r:20,x:0,y:0,facing:0},19,0,1),'outside short axis');
ok(c.mobCircleOverlap({t:'ant',r:20,x:0,y:0,facing:Math.PI/2},19,0,1),'facing rotates ellipse');
ok(!c.mobCircleOverlap({t:'ant',r:20,x:0,y:0,facing:Math.PI/2},0,19,1),'short axis rotates');
const x={t:'ant',r:20,x:0,y:0,facing:Math.PI/3},d={dx:1,dy:1};
const shape=c.mobCollider(x),angle=shape.angle,localU=(Math.cos(angle)*d.dx+Math.sin(angle)*d.dy)/Math.SQRT2,localV=(-Math.sin(angle)*d.dx+Math.cos(angle)*d.dy)/Math.SQRT2;
const radial=1/Math.hypot(localU/shape.rx,localV/shape.ry);
const support=c.mobSupportRadius(x,d.dx,d.dy);
ok(support>=radial-1e-12,'true ellipse support cannot underestimate radial');
ok(support>radial+.05,'diagonal support corrects old underestimation');
const trials=[{t:'ant',r:20,x:4,y:7,facing:.2},{t:'beetle',r:31,x:-3,y:12,facing:-.8},{t:'wasp',r:16,x:25,y:2,facing:1.4},{t:'slime',r:38,x:0,y:0,facing:2.4}];
function sampleDistance(m,px,py){
 const s=c.mobCollider(m),cx=m.x,cy=m.y,ca=Math.cos(s.angle),sa=Math.sin(s.angle);
 let best=Infinity;
 for(let i=0;i<2048;i++){let t=2*Math.PI*i/2048;let x=s.rx*Math.cos(t),y=s.ry*Math.sin(t);let ux=cx+ca*x-sa*y,uy=cy+sa*x+ca*y;let d=Math.hypot(px-ux,py-uy);if(d<best)best=d}
 return best;
}
let comparisons=0;
for(const m of trials){
 const sh=c.mobCollider(m);
 for(let theta=0;theta<Math.PI*2;theta+=.29){
  for(const gap of [-3,-.75,.75,3]){
   const px=m.x+Math.cos(theta)*(Math.max(sh.rx,sh.ry)+gap),py=m.y+Math.sin(theta)*(Math.max(sh.rx,sh.ry)+gap);
   const distance=sampleDistance(m,px,py);
   const r=3;
   const expected=distance<r;
   // Discard the less-than-0.03px numerical approximation boundary.
   if(Math.abs(distance-r)<.03)continue;
   const actual=c.mobCircleOverlap(m,px,py,r);
   assert.equal(actual,expected,'elliptical contact must match sampled boundary (gap '+gap+', theta '+theta+')');comparisons++;
  }
 }
}
ok(comparisons>250,'compared against high-resolution ellipse boundary');
ok(html.includes("ctx.rotate(m.facing??0);")&&html.includes("drawCreatureBody(m,d.color"),'render orientation and collision body match');
ok(html.includes("ctx.arc(0,0,petalContactRadius(d),0,TAU);ctx.stroke()"),'petal hitbox debug shows actual collision circle');
ok(html.includes("if(mobCircleOverlap(a,p.x,p.y,p.r+.5))"),'player body uses exact ellipse vs circle');
ok(html.includes("!mobCircleOverlap(m,e.x,e.y,petalContactRadius(def))"),'orbit petals use exact ellipse vs circle');
console.log(JSON.stringify({passed:n,reference_geometry_comparisons:comparisons,status:'ok',scope:'deterministic geometry; not a native-phone test'}));
