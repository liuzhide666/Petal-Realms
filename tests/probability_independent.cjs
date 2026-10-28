// Independent path enumeration: no call to the production analysis recurrence.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={};vm.runInNewContext(fs.readFileSync('site/rules.js','utf8'),c);const R=c.PetalRules;
function enumerate(stock,attempts,cap,p){
 const leaves=[];
 function walk(n,k,w,fail,pr,draws){
  if(n<5||!k||w>=cap){leaves.push({n,w,fail,pr,draws});return}
  if(p>0)walk(n-5,k-1,w+1,fail,pr*p,[...draws,0]);
  if(p<1)for(let loss=1;loss<=4;loss++)walk(n-loss,k-1,w,fail+1,pr*(1-p)/4,[...draws,.999,(loss-.5)/4]);
 }
 walk(stock,attempts,0,0,1,[]);return leaves;
}
test('finite stock, capacity and endpoints agree with independent event-tree enumeration',()=>{
 let cases=0;for(const p of [0,.0025,.16,.64,1])for(let n=0;n<=12;n++)for(let k=0;k<=5;k++)for(let cap=0;cap<=5;cap++){
  const leaves=enumerate(n,k,cap,p),a=R.craftAnalysis(p,n,k,cap),mass=Array(k+1).fill(0);
  for(const x of leaves)mass[x.w]+=x.pr;
  mass.forEach((m,i)=>assert.ok(Math.abs(m-a.outputMass[i])<1e-10));
  assert.ok(Math.abs(leaves.reduce((s,x)=>s+x.n*x.pr,0)-a.stock)<1e-9);cases++;
 }console.log('Independent finite-stock cases:',cases);
});
test('actual all-craft settlement matches every bounded oracle path, including capacity stop',()=>{
 const h=fs.readFileSync('site/index.html','utf8'),a=h.indexOf('function craftBatch('),b=h.indexOf('function sanitizeCollectionGoal(',a);
 const env={game:{bags:{},random:{}},rarity:[{chance:.64},{}],itemOf:()=>['basic',0],isPetalProtected:()=>false};
 env.takeBag=(t,r,n)=>{env.game.bags[t+'@'+r]-=n;return true};env.addBag=(t,r)=>env.game.bags[t+'@'+r]++;
 vm.runInNewContext(h.slice(a,b),env);let cases=0;
 for(let n=0;n<=12;n++)for(const cap of [0,1,2,8])for(const path of enumerate(n,Math.max(0,n-4),cap,.64)){
  env.game.bags={'basic@0':n,'basic@1':99999-cap};let i=0;env.game.random.craft=()=>{assert.ok(i<path.draws.length);return path.draws[i++]};
  const r=env.craftBatch('basic@0','all');assert.equal(r.success,path.w);assert.equal(r.failed,path.fail);assert.equal(env.game.bags['basic@0'],path.n);assert.equal(r.spent,n-path.n);assert.equal(i,path.draws.length);cases++;
 }console.log('Actual all-craft oracle paths:',cases);
});
