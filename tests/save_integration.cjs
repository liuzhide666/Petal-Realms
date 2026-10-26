const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('site/index.html','utf8');
function setup(){const data=new Map([['petal_realms_save_A','broken']]);const c={game:{user:'A',active:true,guest:false,p:{level:8},bags:{'basic@0':10}},localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},$:()=>({textContent:''}),validateLocalProgress:p=>{if(!p?.p?.level)throw Error('bad')},cfAccount:null,cloudSession:null};
 vm.runInNewContext(fs.readFileSync('site/save-store.js','utf8'),c);vm.runInNewContext(html.slice(html.indexOf('function readSave('),html.indexOf('function initGame(')),c);return{c,data}}
test('damaged local login stops before a fresh character can overwrite it',()=>{const t=setup();assert.throws(()=>t.c.readSave());assert.equal(t.data.get('petal_realms_save_A'),'broken')});
test('save returns false when storage refuses writes',()=>{const t=setup();t.c.localStorage.setItem=()=>{throw Error('quota')};assert.equal(t.c.saveGame(),false)});

test('cloud queue failure cannot turn a committed local save into a failed transaction',()=>{const t=setup();t.data.clear();t.c.cfAccount={id:'A'};t.c.cfQueue=()=>{throw Error('queue unavailable')};assert.equal(t.c.saveGame(),true);assert.equal(JSON.parse(t.data.get('petal_realms_save_A')).bag['basic@0'],10)});
test('queued snapshot does not change when gameplay mutates inventory',()=>{const t=setup();t.data.clear();t.c.cfAccount={id:'A'};let queued;t.c.cfQueue=p=>queued=p;t.c.saveGame();t.c.game.bags['basic@0']=1;assert.equal(queued.bag['basic@0'],10)});
