const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('site/index.html','utf8'),start=html.indexOf('// V5.7 independent original tuning:'),end=html.indexOf('function resetEquip(',start);
function setup(){const floats=[];const c={game:{active:true,paused:false,dead:false,time:10,zone:'garden',p:{x:10,y:20,r:24,hp:100,level:1},skills:{},skillBuffs:{},synergies:{},mapData:{garden:{living:[]}},friendlyShots:[]},
 maxHP:()=>100,petalDamageMultiplier:()=>1,pulse:()=>{},toast:()=>{},floating:(x,y,text)=>floats.push(text),TAU:Math.PI*2};
 vm.runInNewContext(html.slice(start,end),c);return{c,floats};}
test('full-health healing is declined before cooldown or feedback',()=>{const t=setup();assert.equal(t.c.activeSkill('heal'),false);assert.equal(t.c.game.skills.heal,undefined);assert.deepEqual(t.floats,[])});
test('healing feedback reports the effective restored value',()=>{const t=setup();t.c.game.p.hp=98;assert.equal(t.c.activeSkill('heal'),true);assert.equal(t.c.game.p.hp,100);assert.equal(t.floats[0],'+2 HP');assert.equal(t.c.game.skills.heal,35)});
test('skill visual queue is bounded and uses simulation time',()=>{const t=setup();for(let i=0;i<30;i++){t.c.game.skills.barrier=0;t.c.activeSkill('barrier')}assert.equal(t.c.game.skillEffects?.length,12);assert.ok(t.c.game.skillEffects.every(e=>e.start===10));assert.equal(t.c.game.skillBuffs.barrier,14.5)});
