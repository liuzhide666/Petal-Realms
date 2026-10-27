import fs from 'node:fs';import http from 'node:http';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve('site'),out=path.resolve('artifacts/qa');fs.mkdirSync(out,{recursive:true});
const probe=`window.__feedbackQA={
 start(motion='auto'){game.user='feedback-fixture';game.guest=false;cfAccount=null;const a=baseSave();a.settings.motion=motion;initGame(a);game.paused=true;game.time=10;game.nextSpawn=Infinity;game.nextEventAt=Infinity;game.bags={'basic@7':20,'basic@0':20};craftSelect='basic@7';game.mapData[game.zone].living=[];game.mapData[game.zone].rocks=[];game.p.x=1000;game.p.y=1000;game.camera={x:1000-game.width/game.zoom/2,y:1000-game.height/game.zoom/2};showModal('craft');},
 open:showModal,close:closeModal,
 async conflict(){const a=baseSave();a.version=5;a.p.level=8;a.bag={'basic@0':20};localStorage.setItem(cfOutboxKey('fixture'),JSON.stringify({format:1,owner:'fixture',baseRevision:1,payload:a,time:'2026-10-24T00:00:00Z'}));try{await cfEnter({id:'fixture',username:'fixture@example.invalid'})}catch(e){$('authError').textContent=e.message}},
 state(){return{bag:{...game.bags},saved:JSON.parse(localStorage.getItem('petal_realms_save_'+game.user)||'null'),rng:game.random?.snapshot(),hp:game.p?.hp,buffs:{...game.skillBuffs},skills:{...game.skills},effects:game.skillEffects?.length||0,floats:game.floats.map(x=>x.text)}},
 prepareSkills(){closeModal();game.paused=false;game.time=10;game.p.hp=maxHP();game.mapData[game.zone].living=[];},
 skill:activeSkill,
 castAll(){for(const k of ['storm','volley','barrier','overdrive'])activeSkill(k);updateSkillDock();game.paused=true;render();},
 nearFullHeal(){game.skills.heal=0;game.p.hp=maxHP()-2;return activeSkill('heal')},
 draw(){const snapshot=JSON.stringify({rng:game.random.snapshot(),p:game.p,buffs:game.skillBuffs,shots:game.friendlyShots});const old=Math.random;Math.random=()=>{throw Error('presentation used RNG')};try{render();render();return snapshot===JSON.stringify({rng:game.random.snapshot(),p:game.p,buffs:game.skillBuffs,shots:game.friendlyShots})}finally{Math.random=old}},
 tick(dt){game.paused=false;update(dt);game.paused=true;},expire(){game.time+=10;updateSkillDock();render();},reset(){clearTransientState();updateSkillDock();render();}
};`;
const source=process.argv.includes('--baseline')?execFileSync('git',['show','27590a9599e3649fc9763bcf95daa46020ef1a72:site/index.html'],{encoding:'utf8'}):fs.readFileSync(root+'/index.html','utf8');
let html=source.replaceAll('requestAnimationFrame(loop);','').replace('})();</script>',probe+'\n})();</script>');
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');if(u.pathname.startsWith('/api/')){res.setHeader('Content-Type','application/json');res.end('{"account":null}');return}const f=u.pathname==='/'?null:path.join(root,path.basename(u.pathname));if(f&&!fs.existsSync(f)){res.writeHead(404);res.end();return}res.setHeader('Content-Type',u.pathname.endsWith('.js')?'text/javascript':u.pathname.endsWith('.css')?'text/css':u.pathname.endsWith('.json')?'application/json':'text/html;charset=utf-8');res.end(f?fs.readFileSync(f):html)});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,executablePath:process.env.PETAL_CHROMIUM,args:['--no-sandbox','--disable-dev-shm-usage']});
const checks=[];function check(name,ok){checks.push({name,ok:!!ok})}
try{for(const[label,width,height,mobile]of [['desktop',1280,800,false],['phone',390,844,true],['small',320,568,true],['landscape',844,390,true],['short',568,320,true]]){
 const page=await browser.newPage({viewport:{width,height},hasTouch:mobile,isMobile:mobile}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('#welcomeContinue').click();await page.waitForFunction(()=>!document.querySelector('#authSubmit').disabled);
 // The auth boundary is stubbed; actual account/CAS behavior is covered by the local workerd suite.
 await page.route('**/api/save',async route=>{const payload=await page.evaluate(()=>{const b={version:5,zone:'garden',p:{level:12,xp:0,kills:0,hp:100},bag:{'leaf@1':30},slots:Array.from({length:6},()=>({t:'basic',r:0}))};return b});await route.fulfill({json:{accountId:'fixture',revision:2,payload,updatedAt:1792803600}})});
 await page.evaluate(()=>__feedbackQA.conflict());
 check(label+' conflict fixture reached version comparison',/版本|另一设备/.test(await page.locator('#authError').innerText()));
 check(label+' recovery is expanded automatically',await page.locator('#cfPendingControls').evaluate(e=>e.open));
 check(label+' both progress summaries are visible',await page.locator('#cfConflictSummary').count()&&await page.locator('#cfConflictSummary').isVisible());
 if(await page.locator('#cfConflictSummary').count()){
  const text=await page.locator('#cfConflictSummary').innerText();check(label+' local and cloud level/count shown',text.includes('LV 8')&&text.includes('LV 12')&&text.includes('20')&&text.includes('30'));
  check(label+' server seconds and local ISO dates both render',!(await page.locator('#cfConflictSummary').innerText()).includes('时间未知'));
  check(label+' summary fits viewport',await page.locator('#cfConflictSummary').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
 }
 check(label+' version mismatch does not claim another device as fact',!(await page.locator('#authError').innerText()).includes('另一设备已经'));
 await page.screenshot({path:out+'/v520_'+label+'_recovery.png'});await page.unroute('**/api/save');
 await page.clock.install({time:new Date('2026-10-26T00:00:00Z')});await page.clock.pauseAt(new Date('2026-10-26T00:01:00Z'));
 await page.evaluate(()=>__feedbackQA.start());await page.evaluate(()=>{const button=document.getElementById('doCraft');button.click();button.click()});
 let s=await page.evaluate(()=>__feedbackQA.state());check(label+' rapid craft accepted once',s.bag['basic@7']===15&&s.bag['basic@8']===1);
 check(label+' result persisted before animation',s.saved?.bag['basic@7']===15&&s.saved?.bag['basic@8']===1);
 check(label+' settled receipt is visible',await page.locator('#craftReceipt').count()&&await page.locator('#craftReceipt').isVisible());
 if(await page.locator('#craftSkip').count()){
  const frozen=JSON.stringify(s.bag),rng=JSON.stringify(s.rng);await page.locator('#craftSkip').click();s=await page.evaluate(()=>__feedbackQA.state());
  check(label+' skipping does not settle or reroll',JSON.stringify(s.bag)===frozen&&JSON.stringify(s.rng)===rng);
  check(label+' controls released after skip',await page.locator('#doCraft').isEnabled());
  check(label+' actual cost and output receipt',/消耗 5/.test(await page.locator('#craftReceipt').innerText()));
  check(label+' skipped result stays in the visible panel',await page.locator('#craftReceipt').evaluate(e=>{const a=e.getBoundingClientRect(),b=document.getElementById('panelBody').getBoundingClientRect();return a.top>=b.top-1&&a.bottom<=b.bottom+1}));
 }
 await page.screenshot({path:out+'/v520_'+label+'_craft.png'});
 await page.evaluate(()=>__feedbackQA.start('reduced'));await page.locator('#doCraft').click();
 if(await page.locator('#craftReceipt').count())check(label+' reduced motion is explicit',await page.locator('#craftReceipt').getAttribute('data-motion')==='reduced');
 await page.locator('#panelClose').click();s=await page.evaluate(()=>__feedbackQA.state());check(label+' panel close cannot undo settlement',s.bag['basic@7']===15&&s.bag['basic@8']===1);
 await page.evaluate(()=>__feedbackQA.start());await page.evaluate(()=>__feedbackQA.prepareSkills());
 const healed=await page.evaluate(()=>__feedbackQA.skill('heal'));s=await page.evaluate(()=>__feedbackQA.state());check(label+' full-health heal does not consume cooldown',!healed&&!(s.skills.heal>10));
 await page.evaluate(()=>__feedbackQA.nearFullHeal());s=await page.evaluate(()=>__feedbackQA.state());check(label+' healing reports actual restored HP',s.floats.includes('+2 HP'));
 await page.evaluate(()=>__feedbackQA.castAll());
 check(label+' active duration visible in skill controls',/生效/.test(await page.locator('[data-active="barrier"]').innerText()));
 check(label+' compact skill menu indicates active buffs',/生效/.test(await page.locator('#skillMenuBtn').innerText()));
 check(label+' skill presentation preserves state and RNG',await page.evaluate(()=>__feedbackQA.draw()));
 s=await page.evaluate(()=>__feedbackQA.state());check(label+' bounded skill feedback exists',s.effects>0&&s.effects<=12);
 await page.screenshot({path:out+'/v520_'+label+'_skills.png'});await page.evaluate(()=>__feedbackQA.expire());
 check(label+' expired buff has no active label',!(/生效/.test(await page.locator('[data-active="barrier"]').innerText())));
 await page.evaluate(()=>__feedbackQA.reset());s=await page.evaluate(()=>__feedbackQA.state());check(label+' transition clears transient skill presentation',s.effects===0&&Object.keys(s.buffs).length===0);
 check(label+' no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));check(label+' no runtime errors',errors.length===0);
 await page.close();
}
const failed=checks.filter(x=>!x.ok),result={passed:checks.length-failed.length,total:checks.length,checks};fs.writeFileSync(out+(process.argv.includes('--red')?'/v520_browser_red.json':'/v520_browser.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,checks:undefined,failed}));assert.equal(failed.length,0,failed.map(x=>x.name).join('; '));
}finally{await browser.close();server.close()}
