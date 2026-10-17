const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../site/index.html'),'utf8');
let n=0;function ok(value,message){assert.ok(value,message);n++}
const shapeStart=html.indexOf('const PETAL_WORLD_SCALE='),shapeEnd=html.indexOf('function actMode(){',shapeStart);
ok(shapeStart>0&&shapeEnd>shapeStart,'shape helpers defined before simulation');
const g=vm.createContext({console});vm.runInContext(html.slice(shapeStart,shapeEnd),g);
const get=x=>vm.runInContext(x,g);
ok(Math.abs(get("petalContactRadius({size:20})")-11.84)<1e-8,'scaled petal collider');
ok(get("PETAL_WORLD_SCALE")<.9,'petals are visibly smaller');
ok(get("mobCollider({t:'ant',r:20,facing:0}).rx")<get("mobCollider({t:'ant',r:20,facing:0}).ry"),'ant longitudinal ellipse');
ok(get("mobCollider({t:'wasp',r:20,facing:0}).ry")<get("mobCollider({t:'ant',r:20,facing:0}).ry"),'flying creature shorter collider');
ok(get("mobCollider({t:'beetle',r:20,facing:0}).rx")>get("mobCollider({t:'ant',r:20,facing:0}).rx"),'beetle wide collider');
ok(get("mobCircleOverlap({t:'ant',r:20,x:0,y:0,facing:0},0,17,1)")===true,'ant narrow axis collision');
ok(get("mobCircleOverlap({t:'ant',r:20,x:0,y:0,facing:0},17,0,1)")===false,'ant broadside does not over-hit');
ok(get("mobCircleOverlap({t:'ant',r:20,x:0,y:0,facing:Math.PI/2},17,0,1)")===true,'collision rotates with facing');
ok(get("mobCircleOverlap({t:'ant',r:20,x:0,y:0,facing:Math.PI/2},0,17,1)")===false,'orthogonal direction shrinks');
ok(get("mobRockRadius({t:'ant',r:20})")<=20,'rocks use contracted collider');
ok(get("(()=>{const m={facing:0};updateMobFacing(m,1,0,1);return Math.abs(m.facing-Math.PI/2)<1e-9})()"),'movement updates facing');
ok(get("(()=>{const m={facing:6.25};updateMobFacing(m,0,-1,.016);return Math.abs(m.facing-6.25)<.2})()"),'angle turning uses shortest path');
ok(html.includes("!mobCircleOverlap(m,e.x,e.y,petalContactRadius(def))"),'petal hitboxes use shared geometry');
ok(html.includes('const d=pets[e.t],size=d.size*PETAL_WORLD_SCALE'),'petal rendering uses same scale');
ok(html.includes('ctx.rotate((m.facing??0)'),'creature facing drives sprite orientation');
ok(html.includes('function drawMobHitbox(m)')&&html.includes("$('hitboxToggle').onclick"),'optional visual collision debugger');
ok(html.includes('mobSupportRadius(a,dx,dy)+mobSupportRadius(b,-dx,-dy)'),'mob separation respects silhouettes');

const uiStart=html.indexOf('// Shared controls for inventory and forging'),uiEnd=html.indexOf('function renderModal(){',uiStart);
ok(uiStart>0&&uiEnd>uiStart,'inventory helpers scoped outside rendering');
const rarity=Array.from({length:10},(_,i)=>({en:'tier'+i,name:'等级'+i}));
const c=vm.createContext({rarity,console});vm.runInContext(html.slice(uiStart,uiEnd),c);
ok(vm.runInContext("inventoryControls('bag')",c).includes('bagSort'),'inventory sorting UI');
ok(vm.runInContext("inventoryControls('craft')",c).includes('craftReadyOnly'),'ready-only crafting filter');
const cards=[{dataset:{name:'基础 basic',rank:'0',count:'5'},style:{},hidden:false},{dataset:{name:'玫瑰 rose',rank:'4',count:'3'},style:{},hidden:false},{dataset:{name:'玻璃 glass',rank:'7',count:'8'},style:{},hidden:false}];
const counter={textContent:''};const root={querySelectorAll:()=>cards,querySelector:()=>counter};
c.root=root;
vm.runInContext("craftReadyOnly=true;inventoryFilterCards('craft',root)",c);
ok(cards.filter(x=>!x.hidden).length===2,'craft ready filter excludes insufficient cards');
vm.runInContext("craftReadyOnly=false;craftRarity='4';inventoryFilterCards('craft',root)",c);
ok(cards.filter(x=>!x.hidden).length===1&&!cards[1].hidden,'tier filter exact');
vm.runInContext("craftRarity='all';craftSearch='玻璃';inventoryFilterCards('craft',root)",c);
ok(cards.filter(x=>!x.hidden).length===1&&!cards[2].hidden,'search filters item name');
ok(html.includes('aria-pressed=')&&html.includes('inventory-slot-list'),'accessible active equipment slots');
ok(html.includes('craft-risk')&&html.includes('损失 1–4 张'),'crafting risk is explicit');
ok(html.includes('data-equip=')&&html.includes('data-craft='),'existing drag and item selection preserved');
ok(html.includes('cloudVerifiedSignupReady()'),'verified signup gate called');
ok(html.includes("'/auth/v1/signup?redirect_to='+encodeURIComponent(CLOUD_SITE_URL)"),'signup uses verified email callback');
ok(html.includes("'/auth/v1/recover?redirect_to='+encodeURIComponent(CLOUD_SITE_URL)"),'optional recovery email is restored');

const authStart=html.indexOf('async function cloudVerifiedSignupReady(){');
const authEnd=html.indexOf('async function cloudAutoResume(){',authStart);
ok(authStart>0&&authEnd>authStart,'signup logic isolated');
function authHarness(settings,session=null){
 const calls=[],entered=[],err={textContent:''};
 const elements={authConfirm:{value:'safe-password-2026'},authPass:{value:'safe-password-2026'},authError:err,rememberMe:{checked:true}};
 const env={authMode:'register',cloudReady:()=>true,cloudRemember:true,
  cloudForgetStoredSession:()=>{},$:name=>elements[name]||{value:''},cloudEnter:async a=>entered.push(a),
  CLOUD_SITE_URL:'https://petal-realms.pages.dev',
  cloudRequest:async(p,opt)=>{calls.push({p,opt});if(p==='/auth/v1/settings')return settings;if(p.startsWith('/auth/v1/signup'))return session??{user:{id:'mock'}};if(p.startsWith('/auth/v1/token?'))return {access_token:'a',refresh_token:'r',user:{id:'mock'}};throw Error(p)}};
 vm.createContext(env);vm.runInContext(html.slice(authStart,authEnd),env);
 return {calls,entered,err,run:e=>vm.runInContext(e,env),env};
}
(async()=>{
 for(const settings of [{autoconfirm:true},{},{disable_signup:true,autoconfirm:false}]){
 const h=authHarness(settings);await assert.rejects(h.run("cloudAuth('qa@example.com','safe-password-2026')"));
 ok(!h.calls.some(c=>c.p.startsWith('/auth/v1/signup')),'unverified config fails closed');
 }
 const verified=authHarness({autoconfirm:false});
 await verified.run("cloudAuth('qa@example.com','safe-password-2026')");
 ok(verified.calls.some(c=>c.p.includes('redirect_to=')),'verified signup performs redirect-bound request');
 ok(verified.err.textContent.includes('请查收验证邮件')&&verified.entered.length===0,'no-session signup shows honest email confirmation');
 const login=authHarness({autoconfirm:true});login.env.authMode='login';await login.run("cloudAuth('qa@example.com','safe-password-2026')");
 ok(login.entered.length===1,'existing password login not gated by confirmation toggle');
 console.log(JSON.stringify({passed:n,checks:n,scope:'mocked browser geometry, inventory, verified Supabase auth; real SMTP still untested'}));
})().catch(e=>{console.error(e);process.exitCode=1});
