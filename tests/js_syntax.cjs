const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const h=fs.readFileSync(require('node:path').join(__dirname,'../site/index.html'),'utf8');
const scripts=[...h.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(s=>s.trim());
assert.equal(scripts.length,1,'Expected precisely one inline JavaScript block');
new vm.Script(scripts[0],{filename:'index.inline.js'});
assert.match(h, /petal_realms_saves/);
assert.match(h, /stellular-khapse-5c19f8|CLOUD_CONFIG/);
assert.doesNotMatch(h,/sb_secret_[A-Za-z0-9_-]{10,}/);
console.log('Static JS syntax / cloud table / frontend-secret checks PASS');

for(const asset of ['rules','art'])new vm.Script(fs.readFileSync(require('node:path').join(__dirname,'../site/'+asset+'.js'),'utf8'),{filename:asset+'.js'});
