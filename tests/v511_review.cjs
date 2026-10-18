const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../site/index.html'),'utf8');
const extract=(a,b)=>html.slice(html.indexOf(a),html.indexOf(b,html.indexOf(a)));
test('a stale snapshot never borrows another outbox revision',()=>{
 const original=JSON.stringify({format:1,owner:'A',baseRevision:2,payload:{p:{level:20}}});let raw=original;
 const ctx={cfAccount:{id:'A'},cfRevision:1,cfPending:null,cfConflict:false,cfLoggingOut:false,cfLockId:'A',
  cfOutboxKey:id=>'outbox_'+id,cfReadOutbox:()=>JSON.parse(raw),localStorage:{setItem:(k,v)=>{raw=v}},$:()=>({textContent:''}),cfSchedule:()=>{},console};
 vm.runInNewContext(extract('function cfQueue(','async function cfFlush('),ctx);
 ctx.cfQueue({p:{level:3}});assert.equal(raw,original);assert.equal(ctx.cfConflict,true);
});
test('corrupt outbox recovery is bound to the newly authenticated account',async()=>{
 let target='A';const ctx={cfAPI:async()=>({accountId:'B',revision:2,payload:null}),cfTakeLock:async()=>{},cfReleaseLock:()=>{},cfReadOutbox:()=>{throw Error('corrupt')},localStorage:{setItem:(k,v)=>{if(k==='petal_realms_cf_last_uid')target=v}}};
 vm.runInNewContext(extract('async function cfEnter(','async function cfAuthenticate('),ctx);
 await assert.rejects(ctx.cfEnter({id:'B',username:'new'}),/corrupt/);assert.equal(target,'B');
});
test('recovery code file uses its response account, never the old form or role',()=>{
 const nodes=new Map();const $=id=>{if(!nodes.has(id))nodes.set(id,{value:'oldlocal',remove(){}});return nodes.get(id)};let downloaded;
 const ctx={$,cfAccount:{username:'oldlocal'},game:{paused:true},modal:null,document:{createElement:()=>({style:{}}),body:{append(){}}},cfDownload:d=>{downloaded=d}};
 vm.runInNewContext(extract('function cfShowRecovery(','function cfDownload('),ctx);
 ctx.cfShowRecovery('isolated-code',{id:'new-id',username:'correct-user'});$('cfDownloadRecovery').onclick();
 assert.equal(downloaded.username,'correct-user');
});
