const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const h=fs.readFileSync(path.join(__dirname,'../site/index.html'),'utf8');
const start=h.indexOf('// V5.7 independent original tuning:'),end=h.indexOf('function resetEquip(',start);assert.ok(start>=0&&end>start);
const creature={t:'wasp',x:100,y:100,hp:200,max:200,rank:3,tier:1,r:20,level:18};
const c={console,Math,Date,TAU:Math.PI*2,W:6800,H:5000,mobs:{wasp:{guardian:false},ant:{drop:['basic'],hp:50,dmg:10},soldier:{hp:90,dmg:12,size:18,speed:90},mantis:{hp:95,dmg:14,size:18,speed:90}},zones:{garden:{drop:0,mob:['ant']}},
game:{active:true,paused:false,dead:false,time:12,zone:'garden',skills:{},skillBuffs:{},synergies:{},p:{x:100,y:100,hp:50,level:11,angle:0,r:20},mapData:{garden:{living:[creature],rocks:[],portals:[]}},friendlyShots:[],bullets:[],drops:[],particles:[]},
maxHP:()=>100,petalDamageMultiplier:()=>1,damageMob:(m,d)=>{m.hp-=d},pulse:()=>{},floating:()=>{},toast:()=>{},screenFx:()=>{},
clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),dist:(a,b,c,d)=>Math.hypot(a-c,b-d),nearbyRocks:()=>[],spawnMob:()=>{},mobUid:1};
vm.createContext(c);vm.runInContext(h.slice(start,end),c);const run=e=>vm.runInContext(e,c);let n=0;function ok(v,msg){assert.ok(v,msg);n++}
for(const [mob,type] of [['wasp','sniper'],['scorpion','venom'],['beetle','charger'],['queenAnt','summon'],['ember','nova'],['barrel','shield']])ok(run("traitOf("+JSON.stringify(mob)+")")===type,'special type '+mob);
ok(run('weightedEvent(()=>0)')==='swarm','event lower');ok(run('weightedEvent(()=>.999999)')==='meteor','event upper');
run("game.synergies=computeSynergies([{t:'stinger'},{t:'fang'},{t:'shell'},{t:'root'}])");
ok(run("syner('assault')")===1&&run("syner('fortress')")===1,'two piece sets');
ok(run("computeSynergies([{t:'rose'},{t:'leaf'},{t:'nectar'},{t:'starpetal'}]).nature")===2,'four piece set');
ok(run("activeSkill('storm')")&&creature.hp<200,'AOE damage');ok(!run("activeSkill('storm')")&&run("skillRemaining('storm')")>0,'cooldown gate');
ok(run("activeSkill('barrier')")&&c.game.skillBuffs.barrier>12,'shield');ok(run("activeSkill('heal')")&&c.game.p.hp>50,'heal');
ok(run("activeSkill('volley')")&&c.game.friendlyShots.length===10,'volley projectiles');ok(run("activeSkill('overdrive')")&&c.game.skillBuffs.overdrive>12,'overdrive');
c.game.time=80;ok(run("skillRemaining('storm')")===0,'cooldown expire');
ok(run("beginWorldEvent('renewal')"),'event start');c.game.p.hp=30;run('updateWorldEvents(.5)');ok(c.game.p.hp>30,'event healing');
c.game.time=c.game.worldEvent.until+1;run('updateWorldEvents(.016)');ok(c.game.worldEvent===null,'event expiry');
ok(run("beginWorldEvent('treasure')")&&c.game.drops.length===7,'loot rain');
console.log('V5.7 tactical assertions '+n+' passed');
