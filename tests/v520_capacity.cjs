const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={};vm.runInNewContext(fs.readFileSync('site/rules.js','utf8'),c);const R=c.PetalRules;
test('finite-stock output distribution respects remaining destination capacity',()=>{
 for(const p of [0,.32,1])for(const stock of [0,4,5,12,25])for(const cap of [0,1,2,5]){
  const mass=Array(6).fill(0);function visit(n,k,w,pr){if(k===5||n<5||w>=cap){mass[w]+=pr;return}visit(n-5,k+1,w+1,pr*p);for(let loss=1;loss<=4;loss++)visit(n-loss,k+1,w,pr*(1-p)/4)}visit(stock,0,0,1);
  const a=R.craftAnalysis(p,stock,5,cap);for(let i=0;i<6;i++)assert.ok(Math.abs(a.outputMass[i]-mass[i])<1e-12,JSON.stringify({p,stock,cap,i,got:a.outputMass[i],expected:mass[i]}));
 }
});
