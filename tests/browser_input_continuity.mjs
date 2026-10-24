import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve('site'),out=path.resolve('artifacts/qa');
fs.mkdirSync(out,{recursive:true});
const probe=`window.__inputQA={start(){game.user='QA';game.guest=true;initGame(null);game.settings.movement='keyboard';game.mapData[game.zone].rocks=[];game.mapData[game.zone].living=[];game.mapData[game.zone].portals=[];game.nextSpawn=Infinity;game.nextEventAt=Infinity;game.p.x=1000;game.p.y=1000;resetInputs();},state(){return {mode:actMode(),move:moveInput(),joy:joy.id,x:game.p.x}},step(){update(1/60);render();syncHud(true)}};`;
const html=fs.readFileSync(root+'/index.html','utf8').replaceAll('requestAnimationFrame(loop);','').replace('})();</script>',probe+'\n})();</script>');
const server=http.createServer((req,res)=>{
 const u=new URL(req.url,'http://localhost');
 if(u.pathname.startsWith('/api/')){res.setHeader('Content-Type','application/json');res.end('{"account":null}');return}
 const f=u.pathname==='/'?null:path.join(root,path.basename(u.pathname));
 if(f&&!fs.existsSync(f)){res.writeHead(404);res.end();return}
 res.setHeader('Content-Type',u.pathname.endsWith('.js')?'text/javascript':u.pathname.endsWith('.json')?'application/json':'text/html;charset=utf-8');
 res.end(f?fs.readFileSync(f):html);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:process.env.PETAL_CHROMIUM,args:['--no-sandbox','--disable-dev-shm-usage']});
const checks=[],failures=[];
function check(name,passed){checks.push({name,passed});if(!passed)failures.push(name)}
try{
 for(const [label,width,height]of [['phone',390,844],['landscape',844,390],['small',320,568]]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:true,isMobile:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.locator('#welcomeContinue').click();
  await page.waitForFunction(()=>!document.querySelector('#authSubmit').disabled);
  await page.evaluate(()=>__inputQA.start());
  const joy=page.locator('#joystick'),box=await joy.boundingBox();
  const held={pointerId:11,pointerType:'touch',clientX:box.x+box.width*.85,clientY:box.y+box.height*.5};
  const press=(id,pointerId)=>page.locator('#'+id).dispatchEvent('pointerdown',{pointerId,pointerType:'touch',button:0});
  const cancel=(id,pointerId)=>page.locator('#'+id).dispatchEvent('pointercancel',{pointerId,pointerType:'touch'});
  const state=()=>page.evaluate(()=>__inputQA.state());
  await joy.dispatchEvent('pointerdown',held);
  await press('touchAtk',12);await press('touchDef',13);
  check(label+' defense priority',(await state()).mode==='defend');
  await cancel('touchDef',13);
  let s=await state();check(label+' cancel defense preserves attack',s.mode==='attack');
  check(label+' cancel defense preserves joystick',s.joy===11&&s.move.dx>.9);
  const before=s.x;await page.evaluate(()=>__inputQA.step());
  check(label+' player still moves after cancellation',(await state()).x>before);
  await cancel('touchAtk',12);s=await state();
  check(label+' cancel attack returns normal',s.mode==='normal');
  check(label+' cancel attack preserves movement',s.joy===11&&s.move.dx>.9);
  await press('touchAtk',14);await cancel('joystick',11);s=await state();
  check(label+' cancel joystick stops movement',s.joy===null&&s.move.dx===0&&s.move.dy===0);
  check(label+' cancel joystick preserves attack',s.mode==='attack');
  await page.locator('#touchAtk').dispatchEvent('pointerup',{pointerId:14,pointerType:'touch'});
  check(label+' final release clears attack',(await state()).mode==='normal');
  await joy.dispatchEvent('pointerdown',held);await press('touchAtk',15);
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));s=await state();
  check(label+' blur clears all actions',s.mode==='normal'&&s.joy===null&&s.move.dx===0);
  await joy.dispatchEvent('pointerdown',held);await press('touchAtk',16);
  await page.locator('#bagBtn').click();s=await state();
  check(label+' inventory clears all input',s.mode==='normal'&&s.joy===null&&s.move.dx===0);
  await page.locator('#panelClose').click();s=await state();
  check(label+' closing inventory cannot resume stale input',s.mode==='normal'&&s.move.dx===0);
  await page.screenshot({path:out+'/input_'+label+'.png'});
  check(label+' no runtime errors',errors.length===0);await page.close();
 }
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 await page.goto('http://127.0.0.1:'+server.address().port);
 await page.locator('#welcomeContinue').click();
 await page.waitForFunction(()=>!document.querySelector('#authSubmit').disabled);
 await page.evaluate(()=>__inputQA.start());
 await page.locator('#game').focus();
 const state=()=>page.evaluate(()=>__inputQA.state());
 const before=(await state()).x;
 await page.keyboard.down('d');await page.evaluate(()=>__inputQA.step());
 check('desktop keyboard moves player',(await state()).x>before);
 await page.keyboard.up('d');check('desktop release stops movement',(await state()).move.dx===0);
 await page.keyboard.down('Space');check('desktop space attacks',(await state()).mode==='attack');
 await page.keyboard.down('Shift');check('desktop shift defense takes priority',(await state()).mode==='defend');
 await page.keyboard.up('Shift');check('desktop release defense restores held attack',(await state()).mode==='attack');
 await page.keyboard.up('Space');check('desktop final release returns normal',(await state()).mode==='normal');
 await page.keyboard.down('w');await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
 check('desktop blur clears movement',(await state()).move.dy===0);await page.keyboard.up('w');
 await page.close();
 fs.writeFileSync(out+'/input_continuity.json',JSON.stringify({passed:checks.length-failures.length,total:checks.length,checks},null,2)+'\n');
 console.log(JSON.stringify({passed:checks.length-failures.length,total:checks.length,failures}));
 assert.equal(failures.length,0,failures.join('; '));
}finally{await browser.close();server.close()}
