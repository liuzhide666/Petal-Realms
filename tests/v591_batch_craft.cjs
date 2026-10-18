const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../site/index.html'),'utf8');
const start=html.indexOf('function craftBatch('),end=html.indexOf('function renderModal(){',start);
assert.ok(start>0&&end>start,'bounded batch helper exposed before modal');
let passed=0;
function ok(cond,desc){assert.ok(cond,desc);passed++}
function make(initial,rank,rolls=[]){
 const key='basic@'+rank,bags={[key]:initial};
 const rarities=Array.from({length:10},(_,i)=>({chance:i===7?1:i===9?0:.64/Math.pow(2,i)}));
 const math=Object.create(Math);let cursor=0;math.random=()=>rolls[cursor++]??.9;
 const ctx={Math:math,game:{bags,protectedPetals:{}},rarity:rarities,itemOf:k=>k===key?['basic',rank]:null,isPetalProtected:()=>false,
 takeBag:(t,r,n=1)=>{const k=t+'@'+r;if((bags[k]||0)<n)return false;bags[k]-=n;return true},
 addBag:(t,r,n=1)=>{const k=t+'@'+r;bags[k]=(bags[k]||0)+n}};
 vm.createContext(ctx);vm.runInContext(html.slice(start,end),ctx);
 return {bags,key,rollsUsed:()=>cursor,run:(n)=>vm.runInContext('craftBatch('+JSON.stringify(key)+','+n+')',ctx),ctx};
}
let t=make(10,0,[.1,.9,.25]);let v=t.run(2);
ok(v.attempts===2,'2 bounded attempts');
ok(v.success===1&&v.failed===1,'independent outcomes');
ok(v.spent===7,'success 5 and failure 2');
ok(t.bags['basic@0']===3&&t.bags['basic@1']===1,'bag balance exact');
t=make(5,0,[.2]);v=t.run(5);
ok(v.attempts===1&&v.success===1,'stop when fewer than 5 inputs remain');
t=make(100,0,Array.from({length:10},()=>0));
v=t.run(100);
ok(v.attempts===5,'hard cap of five attempts');
ok(v.success===5&&t.bags['basic@0']===75&&t.bags['basic@1']===5,'wins consume 5 each');
t=make(24,7);v=t.run(5);
ok(v.attempts===4&&v.success===4&&v.failed===0,'rank 7 guaranteed forging');
ok(t.bags['basic@7']===4&&t.bags['basic@8']===4,'forge inventory exact');
ok(t.rollsUsed()===0,'guaranteed forging does not draw random');
t=make(20,9);v=t.run(5);
ok(v.attempts===0&&t.bags['basic@9']===20,'max rank protected');
t=make(5,0);v=t.run(-1);
ok(v.attempts===0,'negative count rejected');
t=make(15,0);v=t.run('Infinity');
ok(v.attempts===0,'infinite count rejected');
t=make(15,0,[.99,.75,.99,.0,.99,.5,.99,.99,.99,.75]);
v=t.run(5);
ok(v.attempts>0&&v.attempts<=5&&t.bags['basic@0']>=0,'failure-only never creates negative counts');
ok(v.success+v.failed===v.attempts,'result ledger reconciles');
ok(html.includes('id="batchCraft"')&&html.includes('window.confirm(msg)'),'confirmation dialog required for bulk');
ok(html.includes('craftBatch(craftSelect,1)'),'single crafting uses same transaction logic');
ok(html.includes('craftBatch(key,5)'),'bulk crafting uses same transaction logic');
ok(html.includes('saveGame();renderModal()'),'save and re-render after finished');
console.log(JSON.stringify({passed,checks:passed,scope:'isolated deterministic craft tests; no real game saves modified'}));
