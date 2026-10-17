const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');const assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../site/index.html'),'utf8');
const start=html.indexOf('const TALENTS='),end=html.indexOf('const DEFAULT_SETTINGS=',start);assert.ok(start>0&&end>start);
const messages=[];
const sandbox={Math,Number,Object,Date,console,
  game:{active:true,dead:false,time:0,boon:null,p:{level:11,hp:70,x:500,y:500},talents:{},equipped:[]},
  pets:{basic:{cd:2.1}},saveGame:()=>{},syncHud:()=>{},renderModal:()=>{},
  toast:(text)=>messages.push(text),floating:()=>{},pulse:()=>{},dist:(a,b,c,d)=>Math.hypot(a-c,b-d),
  window:{confirm:()=>true}
};vm.createContext(sandbox);
vm.runInContext(html.slice(start,end),sandbox);
vm.runInContext("function maxHP(){return Math.round(100*talentModifier('vitality'))}",sandbox);
vm.runInContext('game.talents=sanitizeTalents({},game.p.level)',sandbox);
const run=(code)=>vm.runInContext(code,sandbox);
let passed=0;function check(condition,label){assert.ok(condition,label);passed++}
check(run('talentEarned(1)')===0 && run('talentEarned(11)')===5,'2-level TP awards');
check(run('talentPoints()')===5,'old save no talents grants free points');
check(run("spendTalent('vitality')")===true,'vitality upgrade');
check(run('game.p.hp')===76 && run('maxHP()')===106,'HP benefit applied');
check(run("spendTalent('power')")===true,'power upgrade');
check(Math.abs(run('petalDamageMultiplier()')-1.05)<1e-9,'real damage multiplier');
check(run("spendTalent('reach')&&spendTalent('reload')&&spendTalent('stride')")===true,'multi path');
check(run('talentPoints()')===0 && run("spendTalent('harvest')")===false,'hard budget');
check(Math.abs(run("petalReloadTime('basic')")-1.995)<1e-9,'reload calculation');
check(run("JSON.stringify(sanitizeTalents({vitality:5,power:5,reach:5},3))").includes('"vitality":1'),'overspend sanitized');
check(run("sanitizeTalents({power:'NaN',reach:-9},11).power")===0,'malformed rank sanitized');
check(run('resetTalents()')===true && run('talentPoints()')===5,'respec restores points');
check(run('game.p.hp')<=run('maxHP()'),'respec HP clamped');
run("game.p.hp=30;game.time=0;var plant={x:500,y:500,type:'bloom',readyAt:0};activateShrine(plant)");
check(run('game.p.hp')===60,'bloom heals 30%');
check(run('shrineCooldown(plant)')===100 && run('activateShrine(plant)')===false,'shrine cooldown');
run("var speedShrine={x:500,y:500,type:'swift',readyAt:0};activateShrine(speedShrine)");
check(run("activeBoon('swift')")===true,'swift buff');
run('game.time=19');check(run("activeBoon('swift')")===false,'buff expiry');
check(html.includes('game.talents=sanitizeTalents(a.talents,game.p.level)')&&html.includes('talents:game.talents'),'save contract present');
console.log(JSON.stringify({passed,total:passed,note:'no production users or live Supabase requests'}));
