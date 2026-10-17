const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../site/index.html'),'utf8');
const match=html.match(/^const CLOUD_SITE_URL=.*;$/m);
assert.ok(match,'CLOUD_SITE_URL declaration must exist on one line');
const configured=(loc)=>vm.runInNewContext(match[0]+'\nCLOUD_SITE_URL',loc?{location:loc}:{});
const defaultURL='https://stellular-khapse-5c19f8.netlify.app';
const cases=[
 [{protocol:'https:',hostname:'petal-realms.pages.dev',origin:'https://petal-realms.pages.dev'},'https://petal-realms.pages.dev'],
 [{protocol:'https:',hostname:'staging.petal-realms.pages.dev',origin:'https://staging.petal-realms.pages.dev'},'https://staging.petal-realms.pages.dev'],
 [{protocol:'https:',hostname:'some-project-7.pages.dev',origin:'https://some-project-7.pages.dev'},'https://some-project-7.pages.dev'],
 [{protocol:'https:',hostname:'stellular-khapse-5c19f8.netlify.app',origin:defaultURL},defaultURL],
 [{protocol:'http:',hostname:'petal-realms.pages.dev',origin:'http://petal-realms.pages.dev'},defaultURL],
 [{protocol:'https:',hostname:'petal-realms.pages.dev.attacker.example',origin:'https://petal-realms.pages.dev.attacker.example'},defaultURL],
 [null,defaultURL]
];
for(const [loc,want] of cases)assert.equal(configured(loc),want);
assert.ok(fs.readFileSync(path.join(__dirname,'../site/_headers'),'utf8').includes('X-Content-Type-Options'));
assert.ok(html.includes("'/auth/v1/signup?redirect_to='+encodeURIComponent(CLOUD_SITE_URL)"));
assert.ok(html.includes("'/auth/v1/recover?redirect_to='+encodeURIComponent(CLOUD_SITE_URL)"));
console.log(JSON.stringify({checks:10,passed:10,scope:'local URL and static-file configuration only; requires Supabase redirect allowlist'}));
