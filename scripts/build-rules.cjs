const fs=require('node:fs'),assert=require('node:assert/strict');
const p='site/rules.js',config=JSON.parse(fs.readFileSync('docs/standard/ruleset.json','utf8'));
assert.equal(config.version,JSON.parse(fs.readFileSync('package.json')).version);
for(const group of ['critical','frost','events','utility'])assert.ok(config[group]);
assert.ok(config.critical.perCopy>=0&&config.critical.perCopy<=1&&config.critical.cap<=1&&config.critical.cap>=0&&config.critical.multiplier>=1);
assert.ok(config.frost.perCopy>=0&&config.frost.cap>=0&&config.frost.cap<1&&config.frost.duration>0&&config.frost.guardianFactor>=0&&config.frost.guardianFactor<=1);
for(const group of ['events','utility'])assert.ok(Object.values(config[group]).every(x=>Number.isFinite(x)&&x>=0)&&Object.values(config[group]).some(x=>x>0));
const source=fs.readFileSync(p,'utf8'),pattern=/const config=freeze\([^\n]+\);/;
assert.match(source,pattern);const output=source.replace(pattern,'const config=freeze('+JSON.stringify(config)+');');
if(process.argv.includes('--check'))assert.equal(source,output,'Regenerate site/rules.js using node scripts/build-rules.cjs');else fs.writeFileSync(p,output);
console.log('Versioned ruleset generation/conformance PASS');

const hp='site/index.html',html=fs.readFileSync(hp,'utf8');let next=html;for(const [key,weight]of Object.entries(config.events)){const re=new RegExp('('+key+':\\{name:[^}]+weight:)\\d+');assert.match(next,re);next=next.replace(re,'$1'+weight)}if(process.argv.includes('--check'))assert.equal(html,next,'World event profile diverged');else fs.writeFileSync(hp,next);
