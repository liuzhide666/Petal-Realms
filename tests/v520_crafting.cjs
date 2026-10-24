const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('site/index.html','utf8');
function setup(){
 const start=html.indexOf('let craftOperation='),end=html.indexOf('function sanitizeCollectionGoal(',start);
 assert.ok(start>=0,'crafting needs a single guarded acceptance path');
 let stored=null,release,confirm,reads=0;
 const c={game:{active:true,dead:false,user:'A',guest:false,bags:{'basic@7':20},random:{craft:()=>{reads++;return .9}}},modal:'craft',
  itemOf:key=>key==='basic@7'?['basic',7]:null,isPetalProtected:()=>false,
  rarity:Array.from({length:10},(_,i)=>({chance:i===7?1:.5,en:'tier'+i})),pets:{basic:{name:'基础花瓣'}},
  takeBag:(t,r,n)=>{const k=t+'@'+r;if((c.game.bags[k]||0)<n)return false;c.game.bags[k]-=n;return true},
  addBag:(t,r)=>{const k=t+'@'+r;c.game.bags[k]=(c.game.bags[k]||0)+1},
  saveGame:()=>{stored=JSON.stringify(c.game.bags);return true},renderModal:()=>{},motionReduced:()=>false,
  askGame:()=>new Promise(r=>confirm=r),$:()=>({}),toast:()=>{},document:{activeElement:null},
  PetalFeedback:{animateCraft:()=>{assert.equal(stored,JSON.stringify(c.game.bags),'persist before presentation');return {finished:new Promise(r=>release=r),finish:()=>release?.()}}}};
 vm.runInNewContext(html.slice(start,end)+'\nglobalThis.craftState=()=>({busy:!!craftOperation,receipt:lastCraftReceipt});globalThis.newSession=()=>{craftSession++};',c);
 return{c,stored:()=>stored,release:()=>release(),accept:()=>confirm(true),reads:()=>reads};
}
test('rapid activation settles once and animation completion cannot grant again',async()=>{
 const t=setup(),first=t.c.performCraft('basic@7',1);await t.c.performCraft('basic@7',1);
 assert.equal(t.c.game.bags['basic@7'],15);assert.equal(t.c.game.bags['basic@8'],1);assert.equal(t.c.craftState().busy,true);
 assert.equal(t.c.craftState().receipt.spent,5);assert.equal(t.c.craftState().receipt.remaining,15);assert.equal(t.reads(),0);
 t.release();await first;assert.equal(t.c.craftState().busy,false);assert.equal(t.c.game.bags['basic@8'],1);
});
test('canceling presentation releases controls without changing inventory',async()=>{
 const t=setup(),first=t.c.performCraft('basic@7',1),before=t.stored();t.c.cancelCraftPresentation();await first;
 assert.equal(t.c.craftState().busy,false);assert.equal(t.stored(),before);assert.equal(t.reads(),0);
});
test('batch confirmation from an obsolete interface session cannot settle',async()=>{
 const t=setup(),first=t.c.performCraft('basic@7',5);t.c.newSession();t.accept();await first;
 assert.equal(t.c.game.bags['basic@7'],20);assert.equal(t.c.game.bags['basic@8'],undefined);
});
test('failed local persistence is shown truthfully in the receipt',async()=>{
 const t=setup();t.c.saveGame=()=>false;t.c.PetalFeedback.animateCraft=()=>({finished:Promise.resolve(),finish:()=>{}});
 await t.c.performCraft('basic@7',1);assert.equal(t.c.craftState().receipt.localSaved,false);
});
test('full output stack rejects crafting before consuming materials or RNG',()=>{
 const t=setup();t.c.game.bags['basic@8']=99999;const result=t.c.craftBatch('basic@7',5);
 assert.equal(result.attempts,0);assert.equal(t.c.game.bags['basic@7'],20);assert.equal(t.reads(),0);
});
