// The historical file list stays pinned; current runtime math must remain consistent.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
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
console.log('Probability catalog source and anchor integrity: PASS');
