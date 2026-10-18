const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const h=fs.readFileSync(path.join(__dirname,'../site/index.html'),'utf8');
const a=h.indexOf('function petalBaseStats('),b=h.indexOf('function renderPetalWorkbench(',a);
assert.ok(a>0&&b>a,'petal comparison must exist');
const c={Math,Number,pets:{basic:{hp:34,dmg:13,cd:2.1},rose:{hp:30,dmg:6,cd:3.4}},rarity:[{scale:1},{scale:1.72}],itemOf:k=>k==='basic@1'?['basic',1]:k==='rose@0'?['rose',0]:null};
vm.createContext(c);vm.runInContext(h.slice(a,b),c);const run=s=>vm.runInContext(s,c);
assert.equal(run("petalBaseStats('basic@1').hp"),58);
assert.equal(run("petalBaseStats('basic@1').damage"),22);
assert.equal(run("petalBaseStats('rose@0').reload"),3.4);
assert.equal(run("petalBaseStats('bad')"),null);
// Malformed IDs must not become inventory/protection keys during a save import.
const x=h.indexOf('function inventoryKey('),y=h.indexOf('function takeBag(',x);
const ids={pets:{basic:{}},rarity:Array(10).fill({})};vm.createContext(ids);vm.runInContext(h.slice(x,y),ids);
for(const k of ['constructor@0','basic@1.5','basic@1e0','basic@01','basic@0@9','basic@-1'])assert.equal(vm.runInContext('itemOf('+JSON.stringify(k)+')',ids),null);
assert.equal(vm.runInContext("itemOf('basic@9')[1]",ids),9);
console.log(JSON.stringify({passed:11,scope:'base petal comparison and imported item identity validation'}));
