// Explicitly opt in to writing an isolated PREVIEW database. Never accepts production.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomBytes,X509Certificate,createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const origin=new URL(process.argv[2]||'');
assert.equal(origin.protocol,'https:');
assert.match(origin.hostname,/^[a-z0-9-]+\.petal-realms\.pages\.dev$/);
assert.equal(origin.port,'');
assert.equal(process.env.PETAL_CONFIRMED_PREVIEW_D1,'9ec11aae-8c72-4e78-a32e-79b9525e7d1d','First verify this deployment binding through Cloudflare');
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const proxyAddress=process.env.PETAL_BROWSER_PROXY||process.env.HTTPS_PROXY,proxy=proxyAddress?new URL(proxyAddress):null,args=['--no-sandbox','--disable-dev-shm-usage'];
if(proxy&&process.env.CODEX_PROXY_CERT){const ca=new X509Certificate(fs.readFileSync(process.env.CODEX_PROXY_CERT));args.push('--ignore-certificate-errors-spki-list='+createHash('sha256').update(ca.publicKey.export({type:'spki',format:'der'})).digest('base64'))}
const browser=await chromium.launch({headless:true,executablePath:process.env.PETAL_CHROMIUM,args,...(proxy?{proxy:{server:proxy.origin,...(proxy.username?{username:decodeURIComponent(proxy.username),password:decodeURIComponent(proxy.password)}:{})}}:{})});
const checks=[],errors=[];let completed=false;
function check(name,ok){checks.push({name,passed:!!ok});assert.ok(ok,name)}
const output='artifacts/qa/preview_cloud_acceptance.json';fs.mkdirSync('artifacts/qa',{recursive:true});
try{
 const a=await browser.newContext({viewport:{width:1280,height:800}}),b=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const call=(c,path,method='GET',data,id)=>c.request.fetch(new URL('/api/'+path,origin).href,{method,...(data?{data}:{}),headers:{Origin:origin.origin,...(id?{'X-Petal-Account':id}:{})}});
 const health=await call(a,'health');check('real Worker and database health',health.ok()&&(await health.json()).version===JSON.parse(fs.readFileSync('package.json','utf8')).version);
 const username='release-'+randomBytes(10).toString('hex')+'@example.invalid',password=randomBytes(24).toString('hex');
 const registered=await call(a,'auth/register','POST',{username,password});check('register isolated preview identity',registered.status()===201);
 const account=(await registered.json()).account;
 check('second browser context login',(await call(b,'auth/login','POST',{username,password})).ok());
 const save={version:5,zone:'garden',p:{level:8,xp:0,kills:0,hp:80},bag:{'basic@0':20},slots:Array.from({length:7},()=>({t:'basic',r:0})),backupSlots:Array.from({length:7},()=>({t:'basic',r:0}))};
 let r=await call(a,'save','PUT',{expectedRevision:null,payload:save},account.id);check('initial conditional cloud save',r.ok()&&(await r.json()).revision===1);
 check('independent context reads revision one',(await (await call(b,'save','GET',null,account.id)).json()).revision===1);
 save.p.kills=1;r=await call(a,'save','PUT',{expectedRevision:1,payload:save},account.id);check('matching revision advances once',r.ok()&&(await r.json()).revision===2);
 r=await call(b,'save','PUT',{expectedRevision:1,payload:{...save,bag:{'basic@0':999}}},account.id);check('stale context rejected',r.status()===409);
 check('stale write did not overwrite cloud',(await (await call(a,'save','GET',null,account.id)).json()).payload.bag['basic@0']===20);
 async function enter(c){const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(origin.href);await p.locator('#welcomeContinue').click();await p.waitForFunction(()=>PetalRealmsInfo.snapshot()!==null);await p.locator('#pauseBtn').click();await p.waitForFunction(()=>document.querySelector('#saveText').textContent==='云端已同步');return p}
 const pa=await enter(a);check('desktop resumes actual cloud progress',(await pa.evaluate(()=>PetalRealmsInfo.snapshot())).level===8);
 await pa.locator('#resumeBtn').click();await pa.keyboard.press('c');await pa.locator('[data-craft="basic@0"]').click();await pa.locator('#doCraft').click();
 await pa.waitForFunction(()=>document.querySelector('#craftReceipt')?.textContent.includes('消耗'));
 await pa.waitForFunction(()=>document.querySelector('#saveText').textContent==='云端已同步');
 const crafted=(await (await call(a,'save','GET',null,account.id)).json()).payload.bag;
 check('craft consumption committed to real cloud',crafted['basic@0']<20&&crafted['basic@0']>=15);
 await pa.reload();await pa.locator('#welcomeContinue').click();await pa.waitForFunction(()=>PetalRealmsInfo.snapshot()!==null);await pa.locator('#pauseBtn').click();await pa.waitForFunction(()=>document.querySelector('#saveText').textContent==='云端已同步');
 check('reload retained settled inventory',JSON.stringify((await (await call(a,'save','GET',null,account.id)).json()).payload.bag)===JSON.stringify(crafted));
 const pb=await enter(b);check('phone context sees saved level',(await pb.evaluate(()=>PetalRealmsInfo.snapshot())).level===8);
 await pb.locator('#resumeBtn').click();await pb.locator('#craftBtn').click();check('phone cloud stock matches desktop',await pb.locator('[data-craft="basic@0"]').innerText().then(t=>t.includes(String(crafted['basic@0']))));
 // The phone's resume save advances the revision. The older desktop must retain an outbox.
 await pa.locator('#manualSave').click();await pa.waitForFunction(()=>document.querySelector('#saveText').textContent.includes('冲突'));
 check('older desktop retains pending snapshot',await pa.evaluate(id=>!!localStorage.getItem('petal_realms_cf_outbox_'+id),account.id));
 await pa.screenshot({path:'artifacts/qa/preview_cloud_desktop_conflict.png'});await pb.screenshot({path:'artifacts/qa/preview_cloud_phone_craft.png'});
 check('no browser runtime errors',errors.length===0);completed=true;
}finally{
 await browser.close();fs.writeFileSync(output,JSON.stringify({origin:origin.origin,checkedAt:new Date().toISOString(),database:'isolated preview',completed,success:completed&&checks.every(c=>c.passed),passed:checks.filter(c=>c.passed).length,total:checks.length,checks},null,2)+'\n');
}
console.log(JSON.stringify({origin:origin.origin,passed:checks.length}));
