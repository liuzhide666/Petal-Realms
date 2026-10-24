const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('site/index.html','utf8'),start=html.indexOf('async function cfFlush('),end=html.indexOf('function cfConfigure(',start);
function setup(error){
 const pending={owner:'A',baseRevision:1,payload:{version:5}};
 const raw=JSON.stringify(pending),schedules=[],status={textContent:''};let stored=raw;
 const c={cfBusy:false,cfConflict:false,cfAccount:{id:'A'},cfPending:pending,cfEpoch:1,cfRevision:1,cfRetry:0,
  cfAPI:async()=>{if(error)throw error;return {revision:2}},cfOutboxKey:id=>'outbox-'+id,
  localStorage:{getItem:()=>stored,setItem:(k,v)=>{stored=v},removeItem:()=>{stored=null}},
  $:()=>status,cfSchedule:delay=>schedules.push(delay??1500)};
 vm.runInNewContext(html.slice(start,end),c);return {c,pending,raw,schedules,status,stored:()=>stored};
}
for(const status of [400,401,403,409,413])test('save '+status+' preserves outbox without automatic retry',async()=>{
 const t=setup(Object.assign(Error('rejected'),{status}));await t.c.cfFlush();
 assert.equal(t.stored(),t.raw);assert.equal(t.c.cfPending,t.pending);assert.equal(t.c.cfRevision,1);
 assert.equal(t.c.cfBusy,false);assert.equal(t.schedules.length,0);
});
for(const status of [undefined,408,429,503])test('transient save '+status+' uses finite bounded backoff',async()=>{
 const t=setup(Object.assign(Error('unavailable'),{status,...(status===429?{retryAfter:60}:{})}));await t.c.cfFlush();
 assert.equal(t.schedules.length,1);assert.ok(Number.isFinite(t.schedules[0]));
 assert.ok(t.schedules[0]>=(status===429?60000:4000));assert.equal(t.stored(),t.raw);
 for(let n=0;n<7;n++)await t.c.cfFlush();assert.equal(t.schedules.length,6);
});
test('successful in-flight save rebases and schedules the newer generation',async()=>{
 const t=setup();t.c.cfAPI=async()=>{t.c.cfPending={...t.pending,payload:{version:5,newer:true}};return {revision:2}};
 await t.c.cfFlush();assert.equal(t.c.cfRevision,2);assert.equal(t.c.cfPending.baseRevision,2);
 assert.equal(t.c.cfPending.payload.newer,true);assert.equal(t.schedules.length,1);
});
test('successful current generation clears only matching outbox',async()=>{
 const t=setup();await t.c.cfFlush();assert.equal(t.c.cfPending,null);assert.equal(t.stored(),null);assert.equal(t.schedules.length,0);
});
