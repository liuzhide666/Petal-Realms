const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('site/index.html','utf8');
const block=html.slice(html.indexOf('async function cfUseCloud('),html.indexOf('async function cfPasswordForm('));
function setup(){
 const original=JSON.stringify({format:1,owner:'A',baseRevision:1,payload:{p:{level:8}},time:'2026-10-24T00:00:00Z'});
 const data=new Map([['petal_realms_cf_last_uid','A'],['outbox-A',original]]),error={textContent:''};let puts=0;
 const c={authWorking:false,game:{active:false},cfConflictView:null,cfOutboxKey:id=>'outbox-'+id,
  askGame:async()=>true,cfTakeLock:async()=>{},cfReleaseLock:()=>{},cfExportPending:()=>true,cfDownload:()=>{},cfShowConflict:()=>{},
  cfReadOutbox:(id,raw=data.get('outbox-'+id))=>JSON.parse(raw||'null'),cfEnter:async()=>{throw Error('网络读取失败')},
  cfAPI:async(path,opts)=>{if(opts?.method==='PUT'){puts++;return{revision:3}}return path==='session'?{account:{id:'A'}}:{accountId:'A',revision:2,payload:{p:{level:12}}}},
  localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)},$:()=>error};
 vm.runInNewContext(block,c);return{c,data,original,error,puts:()=>puts};
}
test('failed cloud resolution restores original pending bytes',async()=>{
 const t=setup();await t.c.cfUseCloud();assert.equal(t.data.get('outbox-A'),t.original);
 assert.equal(t.data.get('petal_realms_cf_before_cloud_A'),t.original);assert.equal(t.c.authWorking,false);
 assert.match(t.error.textContent,/网络/);
});
test('failed cloud resolution never overwrites a newer pending generation',async()=>{
 const t=setup();t.c.cfEnter=async()=>{t.data.set('outbox-A','newer');throw Error('网络读取失败')};
 await t.c.cfUseCloud();assert.equal(t.data.get('outbox-A'),'newer');
 assert.equal(t.data.get('petal_realms_cf_before_cloud_A'),t.original);
});
test('changed cloud revision requires comparison again before local replacement',async()=>{
 const t=setup();t.c.cfConflictView={owner:'A',revision:1,raw:t.original};
 await t.c.cfUseLocal();assert.equal(t.puts(),0);assert.equal(t.data.get('outbox-A'),t.original);
 assert.equal(t.c.authWorking,false);
});
test('changed local generation cannot replace cloud from an old comparison',async()=>{
 const t=setup();t.c.cfConflictView={owner:'A',revision:2,raw:'older pending bytes'};
 await t.c.cfUseLocal();assert.equal(t.puts(),0);assert.equal(t.data.get('outbox-A'),t.original);
});
test('matching explicit local choice retains conditional-write guard',async()=>{
 const t=setup();t.c.cfConflictView={owner:'A',revision:2,raw:t.original};t.c.cfEnter=async()=>{};
 let written;t.c.cfAPI=async(path,opts)=>{if(opts?.method==='PUT'){written=opts.body;return{revision:3}}return path==='session'?{account:{id:'A'}}:{accountId:'A',revision:2,payload:{p:{level:12}}}};
 await t.c.cfUseLocal();assert.equal(written.expectedRevision,2);assert.equal(written.payload.p.level,8);
});
test('pending change during awaited cloud read displays the same generation later authorized',async()=>{
 const t=setup(),newRaw=JSON.stringify({format:1,owner:'A',baseRevision:1,payload:{p:{level:99}}});let displayed,uploaded,first=true;
 t.c.cfConflictView={owner:'A',revision:2,raw:t.original};t.c.cfEnter=async()=>{};
 t.c.cfShowConflict=(account,pending,data,raw)=>{displayed=pending.payload.p.level;t.c.cfConflictView={owner:account.id,revision:data.revision,raw:raw??t.data.get('outbox-A')}};
 t.c.cfAPI=async(path,opts)=>{if(opts?.method==='PUT'){uploaded=opts.body.payload.p.level;return {revision:3}}if(path==='session')return {account:{id:'A'}};if(first){first=false;t.data.set('outbox-A',newRaw)}return{accountId:'A',revision:2,payload:{p:{level:12}}}};
 await t.c.cfUseLocal();assert.equal(uploaded,undefined);assert.equal(displayed,99);
 assert.equal(t.c.cfConflictView.raw,newRaw);await t.c.cfUseLocal();assert.equal(uploaded,displayed);
});
