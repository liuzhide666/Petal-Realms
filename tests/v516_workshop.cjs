const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c={};vm.createContext(c);if(fs.existsSync('site/workshop.js'))vm.runInContext(fs.readFileSync('site/workshop.js','utf8'),c);
assert.equal(typeof c.PetalWorkshop?.plan,'function','a deterministic inventory-conserving build planner must be available');
const W=c.PetalWorkshop, defs={a:{attack:10,renewal:1,support:0},b:{attack:1,renewal:10,support:10},c:{attack:5,renewal:5,support:5}};
const json=x=>JSON.stringify(x);let passed=0;function check(v,m){assert.ok(v,m);passed++}
for(const policy of ['attack','sustain','balanced'])for(let n=1;n<=10;n++){
 const bag={a:n,b:n,c:n},slots=['c','c'],before=json({bag,slots});const p=W.plan(bag,slots,defs,policy);
 check(json({bag,slots})===before,'planning is pure');check(p.slots.length===2,'capacity preserved');
 for(const k of Object.keys(bag))check((p.bag[k]||0)+p.slots.filter(x=>x===k).length===bag[k]+slots.filter(x=>x===k).length,'per-key conservation');
 check(json(p)===json(W.plan(bag,slots,defs,policy)),'stable repeatability');check(p.after+1e-12>=p.before,'additive score never decreases');
}
check(W.plan({a:2,b:2},['c','c'],defs,'attack').slots.every(x=>x==='a'),'attack objective');
check(W.plan({a:2,b:2},['c','c'],defs,'sustain').slots.every(x=>x==='b'),'sustain objective');
for(const invalid of [{a:-1},{a:Infinity},{a:1.5},{unknown:1}])assert.throws(()=>W.plan(invalid,['a'],defs,'attack'));
assert.throws(()=>W.plan({},['a'],defs,'unknown'));
const feed=JSON.parse(fs.readFileSync('site/release.json'));check(W.release(feed)!==null,'bundled announcement validates');
for(const bad of [null,{...feed,version:'<img src=x>'},{...feed,highlights:['<script>']},{...feed,updatedAt:'yesterday'},{...feed,highlights:new Array(21).fill('x')}])check(W.release(bad)===null,'untrusted feed rejected');
console.log(JSON.stringify({passed,scope:'pure planner conservation and announcement boundary'}));

// Exhaustively enumerate all feasible two-slot allocations in small pools.
for(let a=0;a<=3;a++)for(let b=0;b<=3;b++)for(const policy of Object.keys(W.weights)){
 const bag={a,b,c:1},slots=['c','c'],p=W.plan(bag,slots,defs,policy),pool={a,b,c:3};let best=-Infinity;
 for(const x of Object.keys(pool))for(const y of Object.keys(pool))if(pool[x]>0&&pool[y]>(x===y?1:0))best=Math.max(best,(p.scores[x]||0)+(p.scores[y]||0));
 assert.ok(Math.abs(p.after-best)<1e-12,'greedy equals feasible additive optimum');
}
assert.throws(()=>W.plan({a:99999,b:2},['a','a'],defs,'sustain'),'reject returned stack overflow');
console.log('48 exhaustive allocation cases and overflow boundary PASS');
(async()=>{
 const html=fs.readFileSync('site/index.html','utf8');const src=html.slice(html.indexOf('async function askGame('),html.indexOf("let workshopPolicy=",html.indexOf('async function askGame(')));
 const ctx={game:{user:'A',active:true,dead:false,p:{}},cfAccount:{id:'A'},modal:'workshop',cfConflict:false,PetalUI:{ask:async()=>true}};vm.createContext(ctx);vm.runInContext(src,ctx);
 assert.equal(await ctx.askGame('apply'),true);
 let pending=ctx.askGame('apply');ctx.game.user='B';assert.equal(await pending,false);
 ctx.game.user='A';pending=ctx.askGame('apply');ctx.game.p={};assert.equal(await pending,false);
 pending=ctx.askGame('apply');ctx.cfConflict=true;assert.equal(await pending,false);
 ctx.game.active=false;ctx.game.dead=true;ctx.modal=null;assert.equal(await ctx.askGame('resolve known conflict at gate'),true);
 ctx.PetalUI.ask=async()=>false;assert.equal(await ctx.askGame('cancel'),false);
 console.log('6 asynchronous action-identity cases PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
