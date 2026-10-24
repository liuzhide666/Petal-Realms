/* Source-bound diagnostics, not an automatic rebalance or an optimal-build solver. */
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const html=fs.readFileSync('site/index.html','utf8'),out=process.argv[2]||'artifacts/qa/v520_balance.json';
const line=name=>{const x=html.match(new RegExp('^function '+name+'\\([^\\n]+','m'));assert.ok(x,'source function '+name);return x[0]};
const state={game:{zone:'garden',p:{level:61},talents:{},slots:[],skillBuffs:{},synergies:{},time:10,mode:'normal',trial:null},W:6800,H:5000,cx:3400,cy:2500,TAU:Math.PI*2,mobUid:0,
 clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),dist:(x,y,a,b)=>Math.hypot(x-a,y-b),nearbyRocks:()=>[],regionBand:()=>state.rank,minZoneLevel:()=>state.level,
 floating:()=>{},die:()=>{},activeBoon:()=>false,rootedArmor:()=>0};
vm.createContext(state);
vm.runInContext(html.slice(html.indexOf('const rarity='),html.indexOf('const SHRINE_TYPES=')),state);
vm.runInContext(html.match(/^const SLOT_MILESTONES=[^\n]+/m)[0]+'\n'+['xpNeed','slotCapacity','maxHP','rawPetalDamage','syner','damagePlayer'].map(line).join('\n'),state);
vm.runInContext(html.slice(html.indexOf('function armorOf('),html.indexOf('function damageMob('))+'\n'+html.slice(html.indexOf('function spawnMob('),html.indexOf('let mobUid=')),state);
vm.runInContext('globalThis.model={rarity,pets,mobs,GUARDIANS,TALENTS,talentEarned,xpNeed,slotCapacity,maxHP,rawPetalDamage,armorOf,spawnMob,damagePlayer}',state);
const {model:M}=state,scope={};vm.runInNewContext(fs.readFileSync('site/rules.js','utf8'),scope);const R=scope.PetalRules;
const report={sourceSha256:crypto.createHash('sha256').update(html).digest('hex'),ruleset:R.version,
 limits:['Craft expectation assumes replenished independent fixed-probability attempts; finite-stock/batch chances are separate.','Damage rows are conditional single-hit outcomes at level61, not measured DPS or optimal builds.','EHP scalars exclude armor layers, dodge/grace, healing and positioning.','Monster cases execute the actual spawn function with fixed rank/level/random branches; no empirical encounter-frequency claim.'],progression:[],crafting:[],damage:{cases:0,floorCases:0,groups:[]},monsters:[],ehp:[]};
let cumulative=0;for(let level=1;level<=999;level++){if([1,5,12,20,30,60,61,120,999].includes(level)){state.game.p.level=level;state.game.slots=[];state.game.talents={};report.progression.push({level,xpToNext:M.xpNeed(level),cumulativeXP:cumulative,baseHP:M.maxHP(),slots:M.slotCapacity(level),earnedTalent:M.talentEarned(level),talentCapacity:Object.values(M.TALENTS).reduce((a,x)=>a+x.max,0)})}cumulative+=M.xpNeed(level)}
for(let rank=0;rank<9;rank++){
 const p=M.rarity[rank].chance,expected=5+2.5*(1-p)/p,variance=6.25*(1-p)/p**2+1.25*(1-p)/p,n=30000,rng=R.streams(52000+rank).craft,spent=[];
 for(let i=0;i<n;i++){let cost=5;if(p<1)while(rng()>=p)cost+=1+Math.floor(rng()*4);spent.push(cost)}
 const mean=spent.reduce((a,x)=>a+x,0)/n,se=Math.sqrt(variance/n);assert.ok(Math.abs(mean-expected)<=6*se+1e-9,'seeded MC disagrees with expectation at '+rank);spent.sort((a,b)=>a-b);
 const finite=R.craftAnalysis(p,25);assert.ok(Math.abs(finite.outputMass.reduce((a,x)=>a+x,0)-1)<1e-10);
 report.crafting.push({from:M.rarity[rank].en,to:M.rarity[rank+1].en,p,expectedSameRankCost:expected,mcMean:mean,mcSE:se,samples:n,mcMedian:spent[Math.floor(n*.5)],mcP95:spent[Math.floor(n*.95)],stock25UpTo5Attempts:{success:finite.success,expectedOutputs:finite.outputs,outputMass:Array.from(finite.outputMass)}});
}
state.game.p.level=61;for(const [type,def]of Object.entries(M.pets))for(const rank of [0,2,4,6,8,9]){
 let min=Infinity,max=0,floors=0,cases=0;
 for(const durability of [1,.5,.1])for(const power of [0,5])for(const assault of [0,2])for(const overdrive of [false,true])for(const armor of [0,8,16])for(const crit of [0,4]){
  state.game.talents={power};state.game.synergies={assault};state.game.skillBuffs={overdrive:overdrive?11:0};const raw=M.rawPetalDamage({t:type,r:rank,hp:def.hp*M.rarity[rank].scale*durability}),moments=R.damageMoments(raw,armor,crit);
  assert.ok(Number.isFinite(moments.mean)&&moments.mean>=1);assert.ok(moments.min<=moments.mean+1e-10&&moments.max+1e-10>=moments.mean);min=Math.min(min,moments.mean);max=Math.max(max,moments.mean);if(moments.mean===1)floors++;cases++;
 }
 report.damage.cases+=cases;report.damage.floorCases+=floors;report.damage.groups.push({type,rank,minConditionalHit:min,maxConditionalHit:max,floorCases:floors,cases});
}
for(const [type,def]of Object.entries(M.mobs))for(const level of [1,30,61,120,999])for(const rank of [0,3,6])for(const elite of [false,true]){
 if(def.guardian&&(rank<2||elite))continue;state.rank=rank;state.level=level;const random=[.9,.7,.7];if(rank===6&&!def.guardian)random.push(.5);random.push(0);if(!def.guardian)random.push(elite?0:.99);
 state.game.p={x:3400,y:2500,level};state.game.mapData={garden:{living:[],rocks:[],portals:[]}};state.game.random={world:()=>random.shift()??.5};M.GUARDIANS.garden=type;M.spawnMob('garden',false,true);const m=state.game.mapData.garden.living[0];assert.ok(m&&m.hp>0&&m.dmg>0&&m.level===level,JSON.stringify({type,level,rank,elite,m}));
 report.monsters.push({type,level,rank,elite:!!m.tier,hp:m.hp,damage:m.dmg,armor:M.armorOf(m)});
}
for(const mode of ['normal','defend'])for(const barrier of [false,true])for(const fortress of [0,2]){
 state.game.p={hp:10000,lastHit:0,dashIFrames:0,armorLayers:0,x:0,y:0};state.game.dead=false;state.game.mode=mode;state.game.synergies={fortress};state.game.skillBuffs={barrier:barrier?11:0};M.damagePlayer(100);const accepted=10000-state.game.p.hp;report.ehp.push({mode,barrier,fortress,acceptedPer100:accepted,conditionalEHPScalar:100/accepted});
}
report.findings={talentSpendSaturatesAtLevel:1+2*Object.values(M.TALENTS).reduce((a,x)=>a+x.max,0),slotSaturationLevel:30,topForgeDiscontinuity:'Super->Unique guaranteed; Unique->Eternal p=0.0025. Retune only with inventory migration and updated analyses.'};
fs.mkdirSync(require('node:path').dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({output:out,sourceSha256:report.sourceSha256,craftRanks:report.crafting.length,damageCases:report.damage.cases,spawnCases:report.monsters.length,ehpCases:report.ehp.length,findings:report.findings}));
