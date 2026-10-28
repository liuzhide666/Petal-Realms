// Fault-inject only the in-memory catalog; never edit the actual game or saved files.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('tests/probability_catalog.cjs','utf8'),path='docs/manual/PROBABILITY_AUDIT_CATALOG.json';
for(const [name,mutate,expected]of [
 ['petal damage',c=>{c.definitions.pets.basic.dmg++},/Catalog definitions differ/],
 ['missing function anchor',c=>{c.namedFunctionAnchors.pop()},/Catalog function inventory is incomplete/],
]){
 const catalog=JSON.parse(fs.readFileSync(path,'utf8'));mutate(catalog);
 const reader={readFileSync:(p,...args)=>p===path?JSON.stringify(catalog):fs.readFileSync(p,...args)};
 assert.throws(()=>vm.runInNewContext(source,{require:n=>n==='node:fs'?reader:require(n),console:{log(){}}}),expected,name);
 console.log('Rejected in-memory catalog corruption:',name);
}
