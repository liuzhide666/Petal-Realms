const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function load(){assert.ok(fs.existsSync('site/trials.js'),'isolated tactical training rules are required');const c={};vm.runInNewContext(fs.readFileSync('site/trials.js','utf8'),c);return c.PetalTrials}
test('wave plans rotate the opening and preserve a traversable initial corridor',()=>{
 const t=load();for(let wave=1;wave<=3;wave++){const plan=t.plan('surround',wave,3400,2500);assert.ok(plan.spawns.length<=t.limits.population);assert.equal(plan.opening,-(wave-1)*Math.PI/2);
  // Arena has no rocks. Check the whole center-to-goal segment against every
  // initial body, using a conservative 65-unit monster radius and max 94-unit soil build.
  for(const m of plan.spawns){const dx=m.x-3400,dy=m.y-2500,along=Math.max(0,Math.min(300,dx*Math.cos(plan.opening)+dy*Math.sin(plan.opening)));assert.ok(Math.hypot(dx-along*Math.cos(plan.opening),dy-along*Math.sin(plan.opening))>65+94)}
  assert.equal(t.breached(plan,{x:3400+270*Math.cos(plan.opening),y:2500+270*Math.sin(plan.opening)},3400,2500),true);
  assert.equal(t.breached(plan,{x:3400,y:2500},3400,2500),false);
 }
});
test('modes differ in objectives and skill resource rules',()=>{const t=load();assert.equal(t.modes.surround.health,1);assert.equal(t.modes.surround.skills,null);assert.equal(t.modes.laststand.health,.35);assert.equal(t.modes.laststand.skills,3);assert.equal(t.modes.surround.breach,true);assert.equal(t.modes.laststand.breach,false);assert.equal(t.limits.warning,1.5)});
test('wave plans are deterministic and use frontline, flank and ranged roles',()=>{const t=load(),plan=t.plan('surround',3,0,0);assert.deepEqual(t.plan('surround',3,0,0),plan);for(const role of ['frontline','flank','ranged'])assert.ok(plan.spawns.some(x=>x.role===role))});
