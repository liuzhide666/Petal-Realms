const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('site/index.html','utf8');
function setup(){
 const c={game:{time:10,width:1280,zoom:1,dead:false,p:{x:0,y:0},random:{world:()=>.5}},mobs:{beetle:{ai:'rush'},wasp:{ai:'ranged'}},
  dist:(x,y,a,b)=>Math.hypot(x-a,y-b),recordMob:()=>{},traitOf:()=> 'charger',rnd:(a,b)=>(a+b)/2,TAU:Math.PI*2,
  updateMobFacing:()=>{},mobRockRadius:()=>20,slideCircle:(m,dx,dy)=>{m.x+=dx;m.y+=dy},nearbyRocks:()=>[],pulse:()=>{},floating:()=>{},shots:0,hits:0};
 c.shoot=()=>c.shots++;c.damagePlayer=()=>c.hits++;
 vm.runInNewContext(fs.readFileSync('site/rules.js','utf8'),c);
 const a=html.indexOf('function specialProfileFor('),b=html.indexOf('function resetEquip(',a);
 const start=html.indexOf('for(const mob of map.living)',html.indexOf('function update(dt)')),end=html.indexOf('// All hostile bodies',start);
 vm.runInNewContext(html.slice(a,b)+'\nfunction tick(m,dt){const p=game.p,map={living:[m],rocks:[]};'+html.slice(start,end)+'}',c);
 const m={t:'beetle',x:300,y:0,speed:100,r:20,hp:100,max:100,hit:0,turn:2,shoot:0,calmed:0,stunUntil:11,chargeFor:.3,chargeVX:1,chargeVY:0,specialType:'charger',specialAt:100,windup:0};
 return {c,m};
}
test('storm stun interrupts active charge instead of allowing its velocity override',()=>{const {c,m}=setup();c.tick(m,1/60);assert.equal(m.x,300);assert.equal(m.chargeFor,0)});
test('stun cancels an attack windup without executing it',()=>{const {c,m}=setup();m.x=100;m.specialType='nova';m.windup=.01;c.updateMobSpecial(m,.1,100,{living:[m],rocks:[]});assert.equal(c.hits,0);assert.equal(m.windup,0)});
test('special direct dispatch cannot attack during stun',()=>{const {c,m}=setup();m.x=100;m.specialType='nova';c.performMobSpecial(m,{living:[m],rocks:[]});assert.equal(c.hits,0)});
test('stun blocks regular ranged fire; expiry requires a fresh special windup',()=>{const {c,m}=setup();m.t='wasp';m.chargeFor=0;c.tick(m,1/60);assert.equal(c.shots,0);c.game.time=11;m.specialAt=0;c.updateMobSpecial(m,.1,300,{living:[m],rocks:[]});assert.ok(m.windup>0);assert.equal(m.chargeFor,0)});
test('cloud seconds and local ISO timestamps share a valid display path',()=>{const c={};const a=html.indexOf('function formatSaveTimestamp('),b=html.indexOf('function cfShowConflict(',a);assert.ok(a>0);vm.runInNewContext(html.slice(a,b),c);const iso='2026-10-26T15:00:00Z',seconds=Date.parse(iso)/1000;assert.equal(c.formatSaveTimestamp(seconds),c.formatSaveTimestamp(iso));assert.equal(c.formatSaveTimestamp('broken'),'时间未知')});
test('health release identity agrees with package version',()=>{const api=fs.readFileSync('functions/api/[[path]].js','utf8'),v=JSON.parse(fs.readFileSync('package.json','utf8')).version;assert.equal(api.match(/reply\(\{ok:true,version:'([^']+)'/)[1],v)});
