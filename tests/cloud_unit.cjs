const fs=require('node:fs');const vm=require('node:vm');const assert=require('node:assert/strict');const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../site/index.html'),'utf8');
const code=html.slice(html.indexOf('const CLOUD_CONFIG='),html.indexOf('function inventoryKey('));
assert.ok(code.length>1000);
const uid='0dd3f74a-d8ad-4208-9bbd-607ccf3aeb8d';
let database=null,remoteVersionConflict=false,failNetwork=false,injectNewer=false;const tasks=[],dbRequests=[],store=new Map(),elements=new Map();
const localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i],get length(){return store.size}};
async function fetchMock(url,init){const method=init.method||'GET';dbRequests.push({url,method,headers:init.headers});let status=200,body=null;
 if(url.includes('grant_type=password'))body={access_token:'token',refresh_token:'refresh',expires_in:3600,user:{id:uid}};
 else if(url.includes('grant_type=refresh_token'))body={access_token:'token2',refresh_token:'refresh2',expires_in:3600,user:{id:uid}};
 else if(url.includes('/rest/v1/petal_realms_saves')&&method==='GET')body=database?[{revision:database.revision,payload:database.payload}]:[];
 else if(url.includes('/rest/v1/petal_realms_saves')&&method==='POST'){if(database){status=409;body={message:'exists'}}else{database=JSON.parse(init.body);body=[{revision:database.revision}];status=201}}
 else if(url.includes('/rest/v1/petal_realms_saves')&&method==='PATCH'){
  if(injectNewer){injectNewer=false;vm.runInContext('cloudQueue({version:5,level:77})',current.c)}
  if(failNetwork){status=503;body={message:'offline'}}
  else if(remoteVersionConflict)body=[];
  else{const data=JSON.parse(init.body);const rev=/revision=eq\.(\d+)/.exec(url);if(!database||!rev||+rev[1]!==database.revision)body=[];else{database={...database,...data};body=[{revision:database.revision}]}}
 }
 else {status=404;body={message:'unhandled'}};
 return{ok:status>=200&&status<300,status,text:async()=>JSON.stringify(body)};
}
let current;
function makeContext(){let listeners={},timer=0;const c={console,window:{},game:{active:true,user:'cloud-'+uid},fetch:fetchMock,localStorage,Date,Math,JSON,setTimeout(fn){tasks.push(fn);return ++timer},clearTimeout(){},$:name=>{if(!elements.has(name))elements.set(name,{textContent:'',value:''});return elements.get(name)},authMode:'login',initGame:()=>{},toast:()=>{}};
 vm.createContext(c);vm.runInContext(code,c);current={c};return c}
const get=(c,expr)=>vm.runInContext(expr,c);
(async()=>{
 const c=makeContext();let n=0;const test=(cond,label)=>{assert.ok(cond,label);n++};
 test(get(c,'cloudReady()')===true,'cloud-ready');
 get(c,`setCloudSession({access_token:'token',refresh_token:'refresh',expires_in:3600,user:{id:'${uid}'}})`);
 test(await get(c,'cloudLoad()')===null,'cloud-load-empty');
 get(c,'cloudQueue({version:5,level:2})');
 test(JSON.parse(store.get('petal_realms_cloud_outbox_'+uid)).snapshot.level===2,'outbox durable');
 await get(c,'cloudFlush()');test(database.revision===1&&database.payload.level===2,'first write');
 test(!store.has('petal_realms_cloud_outbox_'+uid),'outbox cleared after ack');
 get(c,'cloudQueue({version:5,level:3})');await get(c,'cloudFlush()');
 test(database.revision===2&&database.payload.level===3,'update compare and swap');
 get(c,'cloudSession.expires=Date.now()-100');await get(c,'cloudToken()');test(get(c,'cloudSession.access')==='token2','token refreshed');
 failNetwork=true;get(c,'cloudQueue({version:5,level:4})');await get(c,'cloudFlush()');
 test(get(c,'cloudPending.level')===4&&JSON.parse(store.get('petal_realms_cloud_outbox_'+uid)).baseRevision===2,'offline outbox retained');
 // Simulate page reload and cloud login, with unchanged remote version.
 failNetwork=false;let c2=makeContext();get(c2,`setCloudSession({access_token:'token',refresh_token:'refresh',expires_in:3600,user:{id:'${uid}'}})`);
 await get(c2,'cloudLoad()');
 test(get(c2,`cloudReadOutbox('${uid}').baseRevision`)===2,'outbox recovered with baseline');
 get(c2,'cloudQueue({version:5,level:4})');await get(c2,'cloudFlush()');
 test(database.revision===3&&database.payload.level===4,'safe replay after reload');
 test(!store.has('petal_realms_cloud_outbox_'+uid),'replayed outbox cleared');
 // A second save is queued while first is pending: on retry newer data MUST win.
 get(c2,'cloudQueue({version:5,level:5})');failNetwork=true;injectNewer=true;await get(c2,'cloudFlush()');failNetwork=false;
 test(get(c2,'cloudPending.level')===77,'newer pending survives old request failure');
 test(JSON.parse(store.get('petal_realms_cloud_outbox_'+uid)).snapshot.level===77,'newer durable outbox survives');
 await get(c2,'cloudFlush()');test(database.payload.level===77&&database.revision===4,'later replay saves latest');
 // Cloud version conflict should prevent any overwrite.
 get(c2,'cloudQueue({version:5,level:99})');remoteVersionConflict=true;await get(c2,'cloudFlush()');
 test(get(c2,'cloudConflict')===true,'version conflict latched');
 test(database.payload.level===77,'cloud data preserved on collision');
 test(store.has('petal_realms_cloud_outbox_'+uid),'local data preserved on collision');
 test(dbRequests.every(x=>x.headers.apikey?.startsWith('sb_publishable_')),'only public client keys used');
 console.log(JSON.stringify({passed:n,checks:n,expected:'mock-only; no live cloud account was created',methods:dbRequests.map(x=>x.method)},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
