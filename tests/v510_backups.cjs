const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../site/index.html'),'utf8');
const a=html.indexOf('function parseLocalBackup('),b=html.indexOf('function exportLocalProgress(',a);
assert.ok(a>0&&b>a,'local backup parser must exist');
const c={JSON,Number,Object};vm.createContext(c);vm.runInContext(html.slice(a,b),c);
const parse=value=>vm.runInContext('parseLocalBackup('+JSON.stringify(value)+')',c);
const payload={version:5,zone:'garden',p:{level:8,xp:4,kills:6,hp:80},bag:{'basic@0':12},slots:[],protectedPetals:{'basic@0':true}};
const backup={kind:'petal-realms-local-save',format:1,payload};
let n=0;function ok(x,s){assert.ok(x,s);n++}
ok(parse(JSON.stringify(backup)).p.level===8,'valid character level retained');
ok(parse(JSON.stringify(backup)).protectedPetals['basic@0']===true,'material locks survive transfer');
for(const invalid of ['bad','{}',JSON.stringify({...backup,payload:{...payload,p:{level:Infinity}}}),JSON.stringify({...backup,payload:{...payload,bag:[]}}),JSON.stringify({kind:'petal-realms-manual-backup',payload}),JSON.stringify({...backup,payload:{...payload,version:99}}),' '.repeat(1048577)]){
 assert.throws(()=>parse(invalid));n++;
}
console.log(JSON.stringify({passed:n,scope:'local save transfer validation, not live cloud migration'}));
