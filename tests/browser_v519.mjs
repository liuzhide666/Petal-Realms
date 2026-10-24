import fs from 'node:fs';import http from 'node:http';import path from 'node:path';import assert from 'node:assert/strict';import{createRequire}from'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve('site'),out=path.resolve('artifacts/qa');fs.mkdirSync(out,{recursive:true});
const probe=`window.__combatQA={
 start(){game.user='QA';game.guest=true;initGame(null);game.settings.movement='keyboard';game.time=10;game.nextSpawn=Infinity;game.nextEventAt=Infinity;game.p.x=1000;game.p.y=1000;game.p.lastHit=0;const m=game.mapData[game.zone];m.rocks=[];m.living=[];m.portals=[];m.shrines=[];game.camera={x:game.p.x-game.width/game.zoom/2,y:game.p.y-game.height/game.zoom/2};resetEquip();resetInputs();clearTimeout(toastTimer);$('toast').classList.remove('show');},
 mob(extra={}){return {id:99,t:'ant',x:1250,y:1000,r:50,level:1,rank:0,hp:1000,max:1000,dmg:10,speed:0,vx:0,vy:0,a:0,turn:100,shoot:100,hit:0,poison:0,poisonTime:0,calmed:100,specialAt:100,windup:0,stunUntil:100,facing:0,...extra}},
 bullet(){game.bullets=[{x:1000,y:1000,vx:0,vy:0,r:8,dmg:10,life:1,status:'venom'}]},
 tick(){update(1/60);render();syncHud(true)},
 state(){return {dead:game.dead,paused:game.paused,hp:game.p.hp,venom:game.p.venomUntil||0,mode:actMode(),move:moveInput(),kills:game.p.kills,level:game.p.level,xp:game.p.xp,drops:game.drops.length,bag:game.bags['basic@0'],angle:game.p.angle,shots:game.friendlyShots.length,targets:game.mapData[game.zone].living.map(m=>({id:m.id,hp:m.hp}))}},
 poisonDeath(){game.p.hp=.001;game.p.venomUntil=20;game.drops=[{x:1000,y:1000,t:'basic',r:0,life:20,ang:0}];},
 meteorDeath(){game.p.hp=1;game.worldEvent={type:'meteor',until:20,nextPulse:100,meteors:[{x:1000,y:1000,r:95,at:0}]};},
 bodyDeath(){game.p.hp=1;game.equipped=[];game.mapData[game.zone].living=[this.mob({x:1000,hp:1,max:1,dmg:100})];},
 novaDeath(){game.p.hp=1;game.equipped=[];game.mapData[game.zone].living=[this.mob({x:1200,t:'guardianHel',dmg:100,specialType:'nova',windup:.001})];},
 bulletDeath(){game.p.hp=1;this.projectile(0,true);this.bullet();game.bullets[0].dmg=100;game.mapData[game.zone].living[0].hp=1;},
 projectile(facing=0,hit=false){game.equipped=[];const m=this.mob({facing});game.mapData[game.zone].living=[m];game.friendlyShots=[{x:m.x+(facing?0:hit?20:43),y:m.y+(facing?(hit?20:43):0),vx:0,vy:0,range:100,traveled:0,radius:2,dmg:10,bounces:0,hitIds:[]}];},
 venom(kind){game.equipped=[];if(kind==='dash')game.p.dashIFrames=1;if(kind==='grace')game.p.lastHit=game.time;this.bullet();},
 level(l,x){game.p.level=l;game.p.xp=x??xpNeed(l)-1;damageMob(this.mob({hp:1,max:1}),10,1200,1000);},
 feedback(hp){const m=this.mob({hp,rank:4});return {applied:damageMob(m,10,m.x,m.y),label:game.floats.find(f=>f.text.startsWith('−'))?.text}},
 trade(){game.equipped=[{t:'basic',r:0,hp:pets.basic.hp,cd:0,reloadTotal:0,lastDamage:0,healWait:1.8,shotWait:100,lastHits:new Map(),x:1092,y:1000}];game.mapData[game.zone].living=[this.mob({x:1092,r:18,dmg:1,rank:4})];this.tick();const label=game.floats.find(f=>f.text.startsWith('−'))?.text;return {loss:1000-game.mapData[game.zone].living[0].hp,label}},
 loot(){game.drops=Object.keys(pets).map((t,i)=>({x:game.p.x+(i%6-2.5)*63,y:game.p.y+(Math.floor(i/6)-2)*64,t,r:i%rarity.length,life:30,ang:0}));render();},
 boss(){game.mapData[game.zone].living=[this.mob({t:'guardianGarden',level:30,hp:900,max:1000})];game.worldEvent={type:'treasure',until:30,nextPulse:100,meteors:[]};syncHud(true);render();},
 die,render};`;
const html=fs.readFileSync(root+'/index.html','utf8').replaceAll('requestAnimationFrame(loop);','').replace('})();</script>',probe+'\n})();</script>');
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');if(u.pathname.startsWith('/api/')){res.setHeader('Content-Type','application/json');res.end('{"account":null}');return}const f=u.pathname==='/'?null:path.join(root,path.basename(u.pathname));if(f&&!fs.existsSync(f)){res.writeHead(404);res.end();return}res.setHeader('Content-Type',u.pathname.endsWith('.js')?'text/javascript':u.pathname.endsWith('.json')?'application/json':'text/html;charset=utf-8');res.end(f?fs.readFileSync(f):html)});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,executablePath:process.env.PETAL_CHROMIUM,args:['--no-sandbox','--disable-dev-shm-usage']});
const checks=[],failed=[];const check=(name,pass)=>{checks.push({name,pass});if(!pass)failed.push(name)};
try{for(const[label,width,height,mobile]of [['desktop',1280,800,false],['phone',390,844,true]]){
 const page=await browser.newPage({viewport:{width,height},hasTouch:mobile,isMobile:mobile}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('#welcomeContinue').click();await page.waitForFunction(()=>!document.querySelector('#authSubmit').disabled);
 const start=()=>page.evaluate(()=>__combatQA.start()),state=()=>page.evaluate(()=>__combatQA.state()),tick=()=>page.evaluate(()=>__combatQA.tick());
 for(const cause of ['poisonDeath','meteorDeath','bodyDeath','novaDeath','bulletDeath']){
  await start();const before=await state();await page.evaluate(c=>__combatQA[c](),cause);await tick();const s=await state();
  check(label+' '+cause+' is terminal',s.dead&&s.paused&&s.hp===0);
  check(label+' '+cause+' cannot reward body retaliation',s.kills===0&&s.xp===0);
  if(cause==='poisonDeath')check(label+' dead player cannot collect loot',s.drops===1&&s.bag===before.bag);
  if(cause==='meteorDeath')check(label+' event death stops player phase',s.angle===before.angle);
 }
 await start();await page.locator('#game').focus();await page.keyboard.down('d');await page.keyboard.down('Space');await page.evaluate(()=>__combatQA.die());
 check(label+' death clears all held commands',(await state()).mode==='normal'&&(await state()).move.dx===0);
 await page.locator('#respawnBtn').click();check(label+' respawn is neutral',(await state()).mode==='normal'&&(await state()).move.dx===0);
 await page.keyboard.up('d');await page.keyboard.up('Space');
 for(const kind of ['dash','grace','hit']){await start();await page.evaluate(k=>__combatQA.venom(k),kind);await tick();const s=await state();check(label+' venom '+kind,kind==='hit'?s.hp<100&&s.venom>10:s.hp===100&&s.venom===0)}
 for(const facing of [0,Math.PI/2])for(const hit of [false,true]){await start();await page.evaluate(([f,h])=>__combatQA.projectile(f,h),[facing,hit]);await tick();const s=await state();check(label+' projectile torso '+facing+' '+hit,s.targets[0].hp===(hit?990:1000));check(label+' projectile lifetime '+facing+' '+hit,s.shots===(hit?0:1))}
 await start();await page.evaluate(()=>__combatQA.level(999));check(label+' maximum level remains save-compatible',(await state()).level===999);
 await start();await page.evaluate(()=>__combatQA.level(998));check(label+' last level is reachable',(await state()).level===999);
 await start();await page.evaluate(()=>__combatQA.level(999,1e9));check(label+' experience respects loader cap',(await state()).xp===1e9);
 for(const hp of [100,2]){await start();const x=await page.evaluate(h=>__combatQA.feedback(h),hp);check(label+' effective damage receipt '+hp,x.applied===Math.min(hp,5)&&x.label==='−'+Math.min(hp,5))}
 await start();const exchange=await page.evaluate(()=>__combatQA.trade());check(label+' exchange number matches effective HP loss',exchange.label&&parseInt(exchange.label.slice(1),10)===Math.round(exchange.loss));
 await start();await page.evaluate(()=>__combatQA.loot());await page.screenshot({path:out+'/v519_'+label+'_loot.png'});check(label+' no runtime exceptions',errors.length===0);await page.close();
}
for(const[label,width,height,mobile]of [['desktop',1280,800,false],['phone',390,844,true],['landscape',844,390,true],['small',320,568,true],['short',568,320,true]]){
 const page=await browser.newPage({viewport:{width,height},hasTouch:mobile,isMobile:mobile});await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('#welcomeContinue').click();await page.waitForFunction(()=>!document.querySelector('#authSubmit').disabled);
 await page.evaluate(()=>__combatQA.start());
 await page.evaluate(()=>__combatQA.boss());
 for(const [a,b]of [['#bossHud','#eventRibbon'],['#bossHud','#sideBtns'],['#bossHud','.player-card'],['#eventRibbon','.player-card'],['#eventRibbon','#sideBtns']]){
  check(label+' layout '+a+' '+b,await page.evaluate(([a,b])=>{const x=document.querySelector(a).getBoundingClientRect(),y=document.querySelector(b).getBoundingClientRect();return x.right<=y.left||y.right<=x.left||x.bottom<=y.top||y.bottom<=x.top},[a,b]));
 }
 await page.screenshot({path:out+'/v519_'+label+'_encounter.png'});await page.close();
}
fs.writeFileSync(out+'/v519_browser.json',JSON.stringify({passed:checks.length-failed.length,total:checks.length,checks},null,2)+'\n');console.log(JSON.stringify({passed:checks.length-failed.length,total:checks.length,failed}));assert.equal(failed.length,0,failed.join('; '));}finally{await browser.close();server.close()}
