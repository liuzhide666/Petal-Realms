const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync('site/rules.js','utf8'),ctx);const R=ctx.PetalRules;
let checks=0;const ok=v=>{assert.ok(v);checks++};
ok(R.version===JSON.parse(fs.readFileSync('package.json')).version);ok(Object.isFrozen(R.config)&&Object.isFrozen(R.config.critical));
assert.throws(()=>R.normalize([0,0]));assert.throws(()=>R.normalize([NaN,1]));checks+=2;
ok(Math.abs(R.normalize([1e308,1e308])[0]-.5)<1e-14);
const a=R.streams(42),b=R.streams(42);for(let i=0;i<100;i++)a.visual();ok(a.loot()===b.loot());ok(a.craft()===b.craft());ok(a.world()===b.world());
for(let rank=0;rank<8;rank++)for(const event of [false,true])ok(Math.abs(R.dropRanks(rank,event).reduce((s,x)=>s+x.p,0)-1)<1e-12);
for(const p of [.64,.32,.08,1]){const x=R.craftAnalysis(p,12,5);ok(x.success>=0&&x.success<=1);ok(x.outputs<=2.4);ok(Math.abs(x.mass-1)<1e-12);ok(x.stock>=0);}
ok(Math.abs(R.craftAnalysis(.64,5,5).success-.64)<1e-12);ok(Math.abs(R.craftAnalysis(.64,5,5).meanCost-6.40625)<1e-12);ok(R.craftAnalysis(.64,5,5).q95===12);ok(R.craftAnalysis(1,25,5).outputs===5);ok(R.craftAnalysis(.64,4,5).success===0);
ok(R.criticalChance(0)===0);ok(Math.abs(R.criticalChance(2)-.2775)<1e-12);ok(R.criticalChance(99)<=.6);ok(R.criticalFactor(1,()=>0)===1.6);ok(R.criticalFactor(1,()=>.99)===1);
ok(R.slowFactor(10,false)>=.65);ok(R.slowFactor(10,true)>=.825);
const j=R.rewardStats(['basic','rose'],6,true,true,(t,r)=>1.72**r);ok(Math.abs(j.mean-28.480977647446455)<1e-10);ok(j.variance>0);ok(R.expectedUtility([{p:.5,value:1},{p:.5,value:10}],0)===5.5);
console.log(JSON.stringify({checks,scope:'V5.14 executable probability rules'}));

// Expected post-armor damage must be averaged over outcomes, not evaluated at the mean raw hit.
const outcomes=[{p:.85,value:Math.max(1,10-12)},{p:.15,value:Math.max(1,16-12)}];
ok(Math.abs(R.expectedUtility(outcomes)-1.45)<1e-12);ok(Math.max(1,10*1.09-12)===1);
for(const n of [0,4,5,8,12,25]){const p=.32,a=R.craftAnalysis(p,n,5);let exact=0;function branch(stock,steps,prob,won){if(stock<5||!steps){if(won)exact+=prob;return}branch(stock-5,steps-1,prob*p,true);for(let loss=1;loss<=4;loss++)branch(stock-loss,steps-1,prob*(1-p)/4,won)}branch(n,5,1,false);ok(Math.abs(a.success-exact)<1e-11)}
console.log(JSON.stringify({total:checks}));

assert.throws(()=>R.criticalFactor(1,()=>1));checks++;
console.log(JSON.stringify({finalChecks:checks}));

ok(Math.abs(R.evaluatePolicy([{p:.75,features:[.4,1,.6,.5]},{p:.25,features:[.8,0,.9,.2]}],[.4,.3,.2,.1])-.6025)<1e-12);assert.throws(()=>R.weightedValue([2],[1]));checks++;console.log(JSON.stringify({finalChecks:checks}));
