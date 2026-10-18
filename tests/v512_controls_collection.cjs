const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const html=fs.readFileSync('site/index.html','utf8');
function extract(a,b){const i=html.indexOf(a),j=html.indexOf(b,i);assert.ok(i>=0&&j>i,'required behavior exists: '+a);return html.slice(i,j)}
test('physical keyboard mapping ignores layout while editing detection includes selects',()=>{
 const ctx={};vm.runInNewContext(extract('function keyForEvent(','function resetInputs('),ctx);
 assert.equal(ctx.keyForEvent({code:'KeyW',key:'ц'}),'w');
 assert.equal(ctx.keyForEvent({code:'Space',key:' '}),' ');
 assert.equal(ctx.isEditing({closest:q=>q.includes('select')?{}:null}),true);
});
test('keyboard-only movement ignores mouse; WASD has priority in mouse mode',()=>{
 const ctx={keys:new Set(),joy:{id:null},pointer:{active:true,x:900,y:300},game:{width:1000,height:600,settings:{movement:'keyboard'}},clamp:(x,a,b)=>Math.max(a,Math.min(b,x))};
 vm.runInNewContext(extract('function moveInput(','function mobCollider('),ctx);
 assert.equal(ctx.moveInput().dx,0);ctx.game.settings.movement='mouse';assert.ok(ctx.moveInput().dx>0);
 ctx.keys.add('a');assert.equal(ctx.moveInput().dx,-1);
});
test('collection targets accept known items only and count both equipment decks',()=>{
 const ctx={game:{bags:{'rose@2':2},slots:[{t:'rose',r:2}],backupSlots:[{t:'rose',r:2}],goal:{t:'rose',r:2}},
  pets:{rose:{name:'玫瑰'}},rarity:[{},{},{}],itemOf:k=>k==='rose@2'?['rose',2]:null,inventoryKey:(t,r)=>t+'@'+r,
  mobs:{bee:{drop:['rose']},ant:{drop:['basic']}},zones:{garden:{mob:['bee']},ant:{mob:['ant']}},GUARDIANS:{}};
 vm.runInNewContext(extract('function sanitizeCollectionGoal(','function petalBaseStats('),ctx);
 assert.equal(ctx.sanitizeCollectionGoal({t:'constructor',r:2}),null);
 assert.equal(ctx.sanitizeCollectionGoal({t:'rose',r:99}),null);
 assert.equal(ctx.sanitizeCollectionGoal({t:'rose',r:'2'}),null,'goal must match the numeric server schema');
 assert.equal(ctx.sanitizeCollectionGoal({t:{toString:'rose'},r:2}),null,'malformed backup must not throw');
 assert.equal(ctx.collectionOwned(),4);assert.deepEqual(Array.from(ctx.collectionSources('rose')),['garden']);
});
test('creature regions include guardian habitats without revealing unknown IDs',()=>{
 const ctx={zones:{garden:{mob:['bee']},desert:{mob:['scarab']}},GUARDIANS:{garden:'guardianGarden',desert:'guardianDesert'}};
 vm.runInNewContext(extract('function creatureRegions(','function collectionSources('),ctx);
 assert.deepEqual(Array.from(ctx.creatureRegions('guardianGarden')),['garden']);
 assert.deepEqual(Array.from(ctx.creatureRegions('bee')),['garden']);
 assert.deepEqual(Array.from(ctx.creatureRegions('unknown')),[]);
});
test('neutral creatures retaliate for a limited interval, then retreat again',()=>{
 const ctx={game:{time:10}};vm.runInNewContext(extract('function neutralMotion(','function actMode('),ctx);
 const m={aggroUntil:0,a:0};assert.equal(ctx.neutralMotion(m,1,0,100).dx,-.65);
 m.aggroUntil=18;assert.equal(ctx.neutralMotion(m,1,0,100).dx,1);
 ctx.game.time=19;assert.equal(ctx.neutralMotion(m,1,0,100).dx,-.65);
});
