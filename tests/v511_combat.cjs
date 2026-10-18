const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const html=fs.readFileSync('site/index.html','utf8');
function setup(){
 const start=html.indexOf('function reverseOrbit('),end=html.indexOf('function orbitRadius(',start);
 assert.ok(start>0&&end>start,'combat additions exist');
 const game={active:true,paused:false,dead:false,mode:'defend',time:10,p:{lastHit:0,orbitDirection:1}};
 const c={game,modal:null,pets:{basic:{hp:100}},rarity:[{scale:1}],clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),toast(){},syncHud(){}};
 vm.runInNewContext(html.slice(start,end),c);return c;
}
test('orbit reversal is usable in combat, respects pause and does not jump angle',()=>{
 const c=setup();c.game.p.angle=2;c.reverseOrbit();assert.equal(c.game.p.orbitDirection,-1);assert.equal(c.game.p.angle,2);
 c.game.paused=true;c.reverseOrbit();assert.equal(c.game.p.orbitDirection,-1);
 c.game.paused=false;c.reverseOrbit();assert.equal(c.game.p.orbitDirection,1);
});
test('guard repairs only intact petals after both body and petal stop taking hits',()=>{
 const c=setup(),e={t:'basic',r:0,hp:50,cd:0,lastDamage:0};
 c.recoverPetalDurability(e,1);assert.equal(e.hp,56);
 e.lastDamage=9.5;c.recoverPetalDurability(e,1);assert.equal(e.hp,56);
 e.lastDamage=0;c.game.p.lastHit=9.5;c.recoverPetalDurability(e,1);assert.equal(e.hp,56);
 c.game.p.lastHit=0;e.cd=2;c.recoverPetalDurability(e,1);assert.equal(e.hp,56);assert.equal(e.cd,2);
 e.cd=0;c.game.mode='attack';c.recoverPetalDurability(e,1);assert.equal(e.hp,56);
 c.game.mode='defend';e.hp=99;c.recoverPetalDurability(e,1);assert.equal(e.hp,100);
 e.hp=0;c.recoverPetalDurability(e,1);assert.equal(e.hp,0);
});
