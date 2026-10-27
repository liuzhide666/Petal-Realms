// Validate the shipped documents against the exact runtime they describe.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const m=JSON.parse(fs.readFileSync('docs/manual/V5.21_MANUAL_MANIFEST.json','utf8'));
assert.equal(m.version,JSON.parse(fs.readFileSync('package.json','utf8')).version);
for(const [file,hash] of Object.entries(m.runtimeFiles))assert.equal(sha(fs.readFileSync(file)),hash,file+' changed; rebuild the handbook');
assert.equal(sha(Buffer.from(JSON.stringify(Object.fromEntries(Object.entries(m.runtimeFiles).sort(([a],[b])=>a<b?-1:a>b?1:0))))),m.runtimeBundleSha256);
assert.equal(sha(fs.readFileSync('docs/history/Petal_Realms_Manual_V5.19_Pages.pdf')),m.baselineSha256);
for(const [name,info] of Object.entries(m.pdfs)){
 const bytes=fs.readFileSync('site/'+name);assert.ok(bytes.subarray(0,5).equals(Buffer.from('%PDF-')));
 assert.equal(bytes.length,info.bytes);assert.equal(sha(bytes),info.sha256,name);
 assert.ok(fs.readFileSync('site/index.html','utf8').includes(name+'?v='+m.version));
}
assert.equal(m.completePages,1+m.historicalPages+m.guidePages+m.engineeringPages);
console.log('Manual/runtime integrity: PASS');
