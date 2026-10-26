import fs from 'node:fs';import http from 'node:http';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve('site'),out=path.resolve('artifacts/qa');fs.mkdirSync(out,{recursive:true});
const probe=`window.__saveCraftQA={
 start(){game.user='save-craft-fixture';game.guest=false;cfAccount=null;cloudSession=null;const a=baseSave();a.version=5;a.p.level=30;a.bag={'basic@7':44,'leaf@0':20,'rose@0':4,'basic@9':1};initGame(a);craftSelect='basic@7';showModal('craft');},
 state(){return{bag:{...game.bags},stored:(()=>{try{return JSON.parse(localStorage.getItem('petal_realms_save_'+game.user)||'null')}catch{return null}})(),busy:!!craftOperation,receipt:lastCraftReceipt,slots:JSON.stringify(game.slots),key:'petal_realms_save_'+game.user}},
 open:showModal,close:closeModal,save:manualSaveProgress,export:exportLocalProgress,
 loginGate(){logout();configureAccountMode(false);},
 damageLogin(){const key='petal_realms_save_'+game.user;logout();localStorage.setItem(key,'broken-login');localStorage.removeItem(key+'.previous');},
 reload(){initGame(readSave());showModal('craft');},
 storageFailure(on){if(on){this.original=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw Error('QuotaExceededError')}}else if(this.original){Storage.prototype.setItem=this.original;this.original=null}},
 recover(){const key='petal_realms_save_'+game.user;localStorage.setItem(key+'.previous',JSON.stringify(currentSaveSnapshot()));localStorage.setItem(key,'broken');initGame(readSave());saveGame();return localStorage.getItem(key+'.damaged')},
 corrupt(){const key='petal_realms_save_'+game.user;localStorage.removeItem(key+'.previous');localStorage.setItem(key,'broken');try{readSave();return false}catch{return localStorage.getItem(key)==='broken'}},
 failOnly(){game.bags={'basic@0':14};game.random.craft=()=>.99;craftSelect='basic@0';showModal('craft');},
 protect(){game.protectedPetals['basic@7']=true;renderModal();},
 source(){game.bags['basic@7']=5;renderModal();}
};`;
const html=fs.readFileSync(root+'/index.html','utf8').replaceAll('requestAnimationFrame(loop);','').replace('})();</script>',probe+'\n})();</script>');
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');if(u.pathname.startsWith('/api/')){res.setHeader('Content-Type','application/json');res.end('{"account":null}');return}const f=u.pathname==='/'?null:path.join(root,path.basename(u.pathname));if(f&&!fs.existsSync(f)){res.writeHead(404);res.end();return}res.setHeader('Content-Type',u.pathname.endsWith('.js')?'text/javascript':u.pathname.endsWith('.css')?'text/css':u.pathname.endsWith('.json')?'application/json':'text/html;charset=utf-8');res.end(f?fs.readFileSync(f):html)});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,executablePath:process.env.PETAL_CHROMIUM,args:['--no-sandbox','--disable-dev-shm-usage']});
const checks=[];function check(name,ok){checks.push({name,ok:!!ok});assert.ok(ok,name)}
try{for(const[label,width,height,mobile]of [['desktop',1280,800,false],['phone',390,844,true],['small',320,568,true],['landscape',844,390,true],['short',568,320,true]]){
 const page=await browser.newPage({viewport:{width,height},isMobile:mobile,hasTouch:mobile}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('#welcomeContinue').click();await page.waitForFunction(()=>!document.querySelector('#authSubmit').disabled);
 await page.clock.install({time:new Date('2026-10-26T00:00:00Z')});await page.clock.pauseAt(new Date('2026-10-26T00:01:00Z'));
 await page.evaluate(()=>__saveCraftQA.start());
 check(label+' adjacent material and action columns',await page.locator('.craft-layout').evaluate(e=>{const a=e.querySelector('.craft-library').getBoundingClientRect(),b=e.querySelector('.craft-workbench').getBoundingClientRect();return a.right<=b.left&&Math.abs(a.top-b.top)<2}));
 check(label+' no panel horizontal overflow',await page.locator('#panelBody').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
 await page.screenshot({path:out+'/save_craft_'+label+'_layout.png'});
 await page.locator('#itemRarity').selectOption('0');check(label+' quality filter hides other qualities',await page.locator('[data-craft="basic@7"]').isHidden());await page.locator('#itemRarity').selectOption('all');
 await page.locator('#itemSearch').fill('绿叶');check(label+' name filter works',await page.locator('[data-craft="basic@7"]').isHidden());await page.locator('#itemSearch').fill('');
 await page.locator('[data-craft="basic@7"]').click();
 await page.locator('#batchCraft').click();await page.locator('#confirmCancel').click();check(label+' cancel keeps materials', (await page.evaluate(()=>__saveCraftQA.state())).bag['basic@7']===44);
 await page.locator('#allCraft').click();check(label+' all confirms precise source and scope',(await page.locator('#confirmMessage').innerText()).includes('不连续升级'));await page.locator('#confirmAccept').click();await page.waitForFunction(()=>!!__saveCraftQA.state().receipt);
 let s=await page.evaluate(()=>__saveCraftQA.state());check(label+' all stops at source remainder',s.bag['basic@7']===4&&s.bag['basic@8']===8&&s.receipt.attempts===8&&s.bag['basic@9']===1);
 check(label+' all committed before animation',s.stored.bag['basic@8']===8);const inventory=JSON.stringify(s.bag);
 await page.locator('#craftSkip').click();check(label+' skip cannot grant twice',JSON.stringify((await page.evaluate(()=>__saveCraftQA.state())).bag)===inventory);
 await page.screenshot({path:out+'/save_craft_'+label+'_result.png'});
 await page.evaluate(()=>__saveCraftQA.reload());check(label+' reload restores exact settled inventory',JSON.stringify((await page.evaluate(()=>__saveCraftQA.state())).bag)===inventory);
 await page.evaluate(()=>__saveCraftQA.start());await page.evaluate(()=>__saveCraftQA.protect());check(label+' protected source blocks all',await page.locator('#allCraft').isDisabled());
 await page.evaluate(()=>__saveCraftQA.start());await page.evaluate(()=>__saveCraftQA.source());check(label+' batch allows attempts with just five source cards',await page.locator('#batchCraft').isEnabled());
 await page.evaluate(()=>__saveCraftQA.start());const before=await page.evaluate(()=>__saveCraftQA.state());await page.evaluate(()=>__saveCraftQA.storageFailure(true));await page.locator('#doCraft').click();await page.waitForFunction(()=>!__saveCraftQA.state().busy);
 s=await page.evaluate(()=>__saveCraftQA.state());check(label+' quota failure rolls back materials and outputs',JSON.stringify(s.bag)===JSON.stringify(before.bag)&&s.receipt===null);
 check(label+' failed manual save never announces success',await page.evaluate(()=>__saveCraftQA.save())===false);
 const downloadPromise=page.waitForEvent('download');await page.evaluate(()=>__saveCraftQA.export());const downloaded=await downloadPromise;const payload=JSON.parse(fs.readFileSync(await downloaded.path(),'utf8')).payload;
 check(label+' export captures current memory despite failed storage',JSON.stringify(payload.bag)===JSON.stringify(before.bag));await page.evaluate(()=>__saveCraftQA.storageFailure(false));
 check(label+' damaged primary recovers without deleting raw evidence',await page.evaluate(()=>__saveCraftQA.recover())==='broken');
 check(label+' no valid copy blocks silent new character',await page.evaluate(()=>__saveCraftQA.corrupt()));
 await page.evaluate(()=>__saveCraftQA.start());await page.evaluate(()=>__saveCraftQA.failOnly());await page.locator('#allCraft').click();await page.locator('#confirmAccept').click();await page.waitForFunction(()=>!!__saveCraftQA.state().receipt);
 s=await page.evaluate(()=>__saveCraftQA.state());check(label+' all failures are bounded and counted',s.bag['basic@0']===2&&s.receipt.spent===12&&s.receipt.failed===3);
 await page.locator('#craftSkip').click();check(label+' failed outcome explicitly says no new petals',(await page.locator('#craftReceipt').innerText()).includes('未生成新花瓣'));
 if(label==='desktop'){
  await page.evaluate(()=>__saveCraftQA.loginGate());await page.locator('#welcomeContinue').click();await page.locator('#tabRegister').click();
  await page.locator('#authName').fill('save-recovery-qa');await page.locator('#authPass').fill('QA-only-test-2468');await page.locator('#authConfirm').fill('QA-only-test-2468');await page.locator('#authSubmit').click();
  await page.waitForFunction(()=>document.getElementById('gate').classList.contains('hidden'));
  await page.evaluate(()=>__saveCraftQA.damageLogin());await page.locator('#welcomeContinue').click();await page.locator('#authName').fill('save-recovery-qa');await page.locator('#authPass').fill('QA-only-test-2468');await page.locator('#authSubmit').click();
  await page.locator('#localSaveRecovery').waitFor({state:'visible'});check('local login exposes recovery after detecting damage',(await page.locator('#authError').innerText()).includes('损坏'));
  await page.locator('#localSaveRecovery input').setInputFiles({name:'progress.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({kind:'petal-realms-local-save',format:1,payload}))});
  await page.locator('#confirmAccept').click();await page.waitForFunction(()=>document.getElementById('gate').classList.contains('hidden'));
  check('verified local login can restore an exported backup',JSON.stringify((await page.evaluate(()=>__saveCraftQA.state())).bag)===JSON.stringify(payload.bag));
  check('explicit recovery preserves damaged login bytes',await page.evaluate(()=>localStorage.getItem('petal_realms_save_save-recovery-qa.damaged'))==='broken-login');
 }
 check(label+' no runtime errors',errors.length===0);await page.close();
}
console.log(JSON.stringify({passed:checks.length,total:checks.length}));
}finally{fs.writeFileSync(out+'/save_craft_browser.json',JSON.stringify({checks},null,2));await browser.close();server.close()}
