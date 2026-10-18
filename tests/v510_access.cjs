const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../site/index.html'),'utf8');
const start=html.indexOf('// V5.10 auth availability'),end=html.indexOf('function setCloudSession(',start);
assert.ok(start>0&&end>start,'auth availability flow must exist');
let now=100000,calls=0,response={ok:true,status:200,headers:{get:()=>null},text:async()=>'{"accepted":true}'};
const memory=new Map(),nodes=new Map();
const c={Math,Number,JSON,Date:class extends Date{static now(){return now}},
 localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)},
 CLOUD_CONFIG:{url:'https://example.supabase.co',publishableKey:'sb_publishable_example'},cloudReady:()=>true,
 fetch:async()=>{calls++;return response},cloudMode:true,authMode:'register',cloudRestoring:false,authWorking:false,
 $:id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',disabled:false,classList:{toggle(){}}});return nodes.get(id)},
 setInterval:()=>1};
vm.createContext(c);vm.runInContext(html.slice(start,end),c);
const run=s=>vm.runInContext(s,c);let passed=0;function ok(b,name){assert.ok(b,name);passed++}
(async()=>{
 await run("mailRequest('signup','/auth/v1/signup',{method:'POST',body:{email:'qa@example.invalid'}})");
 ok(calls===1,'first signup can send exactly once');
 await assert.rejects(run("mailRequest('signup','/auth/v1/signup',{method:'POST'})"));
 ok(calls===1,'repeat signup is blocked locally, not sent');
 ok(run("mailWait('signup')")===60,'successful send starts cooldown');
 await run("cloudRequest('/auth/v1/token?grant_type=password',{method:'POST'})");
 ok(calls===2,'password login remains independent of mail cooldown');
 now+=61000;
 response={ok:false,status:429,headers:{get:()=> '180'},text:async()=>'{"code":"over_email_send_rate_limit","msg":"Email rate limit exceeded"}'};
 let caught;try{await run("mailRequest('recovery','/auth/v1/recover',{method:'POST'})")}catch(e){caught=e}
 ok(caught.retryAfter===180,'Retry-After seconds preserved');
 ok(run("mailWait('recovery')")===180,'server delay respected');
 ok(run("mailWait('signup')")===180,'project email quota blocks other mail action too');
 ok(run("isMailUnavailable({code:'email_not_confirmed'})"),'unconfirmed cloud account offers separate local entry');
 ok(!run("isMailUnavailable({code:'invalid_credentials'})"),'wrong password does not become authenticated fallback');
 ok(!run("isMailUnavailable({status:429,code:'over_request_rate_limit'},'login')"),'login IP limits are not email confirmation failures');
 response={ok:false,status:429,headers:{get:()=>new Date(now+90000).toUTCString()},text:async()=>'{"code":"over_request_rate_limit"}'};
 try{await run("cloudRequest('/auth/v1/token')")}catch(e){ok(e.retryAfter===90,'HTTP date retry deadline supported')}
 console.log(JSON.stringify({passed,scope:'real cooldown and request flow with isolated HTTP and storage'}));
})().catch(e=>{console.error(e);process.exitCode=1});
