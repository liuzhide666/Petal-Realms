const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const h=fs.readFileSync(path.join(__dirname,'../site/index.html'),'utf8');
const start=h.indexOf('// Opt-in multiplayer preview.'),end=h.indexOf('window.PetalRealmsInfo=Object.freeze(',start);assert.ok(start>=0&&end>start);
let socket;const outbound=[];class WS{constructor(url){this.url=url;this.readyState=1;socket=this}send(s){outbound.push(JSON.parse(s))}close(){this.readyState=3;this.onclose?.({})}}
const fake={classList:{add(){},remove(){}}};const c={console,Math,Date,W:6800,H:5000,WebSocket:WS,cloudSession:{uid:'11111111-2222-4333-8444-555555555555'},
CLOUD_CONFIG:{url:'https://test.supabase.co',publishableKey:'sb_publishable_example'},
cloudToken:async()=>'mock-access',game:{active:true,paused:false,time:40,p:{x:400,y:300,level:5}},$:()=>fake,toast:()=>{},clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),
setInterval:()=>1,clearInterval:()=>{},visible:()=>true,ctx:{save(){},restore(){},fillText(){},beginPath(){},fill(){}},circle:()=>{}};
vm.createContext(c);vm.runInContext(h.slice(start,end),c);const run=e=>vm.runInContext(e,c);
let n=0;function ok(v,s){assert.ok(v,s);n++}
(async()=>{
ok(run("partyRoomName('garden-1')")==='garden-1','room name');ok(run("partyRoomName('?!')")===null,'reject bad name');
await run("joinParty('garden-1')");ok(socket.url.startsWith('wss://'),'TLS');
socket.onopen();const join=outbound.find(x=>x.event==='phx_join');
ok(join&&join.join_ref===join.ref,'join ref');ok(join.payload.config.presence.enabled===true,'presence enabled');ok(join.payload.access_token==='mock-access','JWT passed');
socket.onmessage({data:JSON.stringify({topic:join.topic,event:'phx_reply',payload:{status:'ok'}})});
ok(run("party.state")==='online','join ack');ok(outbound.some(x=>x.event==='presence'&&x.payload.type==='presence'),'presence track');
socket.onmessage({data:JSON.stringify({topic:join.topic,event:'presence_state',payload:{other:{metas:[{zone:'garden',x:300,y:310,level:12}]}}})});
ok(run('Object.keys(party.peers).length')===1,'presence peer');run('updateParty()');
ok(outbound.some(x=>x.event==='broadcast'&&x.join_ref===join.ref),'broadcast position');
socket.onmessage({data:JSON.stringify({topic:join.topic,event:'presence_diff',payload:{leaves:{other:{}},joins:{}}})});
ok(run('Object.keys(party.peers).length')===0,'leave diff');run('leaveParty()');ok(run('party.state')==='offline','disconnect');
c.cloudSession=null;await assert.rejects(run("joinParty('garden-1')"));n++;
console.log('V5.7 mock Realtime assertions '+n+' passed (no live room tested)');
})().catch(e=>{console.error(e);process.exitCode=1});
