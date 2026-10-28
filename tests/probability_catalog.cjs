// The historical file list stays pinned; current runtime math must remain consistent.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict'),vm=require('node:vm');
const catalog=JSON.parse(fs.readFileSync('docs/manual/PROBABILITY_AUDIT_CATALOG.json','utf8'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
for(const path of ['site/index.html','site/rules.js','docs/standard/ruleset.json','docs/standard/mechanisms.json']){
 const row=catalog.files.find(f=>f.path===path);assert.ok(row,'Missing mathematical source: '+path);
 assert.equal(sha(fs.readFileSync(path)),row.sha256,'Mathematical source changed; review and regenerate probability catalog: '+path);
}
assert.deepEqual(catalog.rules,JSON.parse(fs.readFileSync('docs/standard/ruleset.json','utf8')));
assert.deepEqual(catalog.mechanismContracts,JSON.parse(fs.readFileSync('docs/standard/mechanisms.json','utf8')));
assert.equal(catalog.fileCount,catalog.files.length);
assert.equal(new Set(catalog.files.map(x=>x.path)).size,catalog.files.length);
for(const a of catalog.namedFunctionAnchors){
 const line=fs.readFileSync(a.path,'utf8').split('\n')[a.line-1];
 assert.ok(line&&new RegExp('function\\s+'+a.name.replace(/[$]/g,'\\$')+'\\s*\\(').test(line),'Stale function anchor: '+a.path+':'+a.line);
}
const html=fs.readFileSync('site/index.html','utf8'),context={};
const slots=html.match(/^const SLOT_MILESTONES=[^\n]+/m),xp=html.match(/^function xpNeed\([^\n]+/m);
assert.ok(slots&&xp,'Missing progression source anchors');
vm.runInNewContext(html.slice(html.indexOf('const rarity='),html.indexOf('const SHRINE_TYPES='))+slots[0]+xp[0]+"\n globalThis.data={rarity,pets,mobs,zones,TALENTS,slots:SLOT_MILESTONES,progression:[1,5,12,20,30,60,61,120,999].map(level=>({level,xp:xpNeed(level),talents:talentEarned(level)}))};",context);
assert.deepEqual(catalog.definitions,JSON.parse(JSON.stringify(context.data)),'Catalog definitions differ from executable source');
const actualAnchors=[];
for(const {path} of catalog.files){
 if(!/^(site|functions)\//.test(path)||!/\.(js|html)$/.test(path))continue;
 const text=fs.readFileSync(path,'utf8');
 for(const m of text.matchAll(/\b(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g))actualAnchors.push({path,name:m[1],line:text.slice(0,m.index).split('\n').length});
}
assert.ok(actualAnchors.length>0,'Missing function inventory');
assert.deepEqual(catalog.namedFunctionAnchors,actualAnchors,'Catalog function inventory is incomplete or changed');
console.log('Probability catalog source, data and complete lexical anchor integrity: PASS');
