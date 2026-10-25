// Explicit, anonymous release smoke test. Never creates an account or uploads a save.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const origin=new URL(process.argv[2]||'');
assert.equal(origin.protocol,'https:');
const expected=JSON.parse(fs.readFileSync('package.json','utf8')).version;
const out=path.resolve('artifacts/qa');fs.mkdirSync(out,{recursive:true});
const checks=[];function check(name,ok){checks.push({name,passed:!!ok});assert.ok(ok,name)}
const browser=await chromium.launch({headless:true,executablePath:process.env.PETAL_CHROMIUM,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const api=await browser.newContext();
 const health=await api.request.get(new URL('/api/health',origin).href);
 const h=await health.json();check('health version matches source',health.ok()&&h.ok&&h.version===expected.split('.').slice(0,2).join('.'));
 const session=await api.request.get(new URL('/api/session',origin).href);check('anonymous session stays anonymous',session.ok()&&(await session.json()).account===null);
 for(const file of ['index.html','release.json','rules.js','art.js','interface.js','workshop.js','effects.js','feedback.js','feedback.css','trials.js']){
  const response=await api.request.get(new URL(file==='index.html'?'/':'/'+file,origin).href);
  check('deployed bytes '+file,response.ok()&&(await response.body()).equals(fs.readFileSync('site/'+file)));
 }
 await api.close();
 for(const [label,width,height,mobile] of [['desktop',1280,800,false],['phone',390,844,true],['landscape',568,320,true]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile});
  const page=await context.newPage(),errors=[],writes=[];
  page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/api/**',route=>{if(!['GET','HEAD'].includes(route.request().method())){writes.push(route.request().url());return route.abort()}return route.continue()});
  await page.goto(origin.href);await page.locator('#welcomeContinue').click();await page.waitForFunction(()=>!document.querySelector('#authSubmit').disabled);
  check(label+' current runtime',await page.evaluate(()=>PetalRealmsInfo.version.startsWith('5.20')));
  await page.locator('#guestBtn').click();await page.locator('#pauseBtn').click();
  const before=await page.evaluate(()=>PetalRealmsInfo.snapshot());
  await page.locator('#trainingFromPause').click();await page.locator('[data-trial="surround"]').click();await page.locator('#confirmAccept').click();
  await page.waitForFunction(()=>document.querySelector('#eventRibbon').textContent.includes('向右突破'));
  check(label+' training context',/四面楚歌/.test(await page.locator('#zoneLabel').innerText()));
  await page.waitForFunction(()=>PetalRealmsInfo.snapshot().mobs>=4);
  await page.locator('#pauseBtn').click();check(label+' training controls reachable',await page.locator('#exitTraining').isVisible());
  await page.screenshot({path:out+'/live_'+label+'_training.png'});
  await page.locator('#exitTraining').click();await page.locator('#pauseBtn').click();
  const after=await page.evaluate(()=>PetalRealmsInfo.snapshot());
  check(label+' main level/loadout restored',after.level===before.level&&after.slots===before.slots&&after.deck===before.deck&&after.zone===before.zone);
  check(label+' training status removed',!(await page.locator('#saveText').innerText()).includes('训练'));
  check(label+' no main save written',await page.evaluate(()=>Object.keys(localStorage).every(k=>!k.startsWith('petal_realms_save_')&&!k.startsWith('petal_realms_cf_outbox_'))));
  check(label+' no server writes attempted',writes.length===0);check(label+' no runtime errors',errors.length===0);
  await context.close();
 }
}finally{
 await browser.close();fs.writeFileSync(out+'/live_browser.json',JSON.stringify({origin:origin.origin,version:expected,checkedAt:new Date().toISOString(),passed:checks.filter(c=>c.passed).length,total:checks.length,checks},null,2)+'\n');
}
console.log(JSON.stringify({origin:origin.origin,passed:checks.length}));
