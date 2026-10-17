const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../site/index.html'),'utf8');
const begin=html.indexOf('async function cloudNoMailSignupReady(){');
const end=html.indexOf('async function cloudAutoResume(){',begin);
assert.ok(begin>0&&end>begin,'No-email auth section must exist');
let passed=0;
function check(value,msg){assert.ok(value,msg);passed++;}
function harness(settings,signup={access_token:'access',refresh_token:'refresh',user:{id:'account-1'}},failSettings=false){
 const calls=[],entered=[],controls={authConfirm:{value:'strong-password-A'},rememberMe:{checked:true}};
 const c={console,authMode:'register',cloudMode:true,cloudRemember:true,cloudReady:()=>true,
  cloudForgetStoredSession:()=>{},$:id=>controls[id]||{value:'',textContent:''},
  cloudRequest:async(p,opt={})=>{calls.push({path:p,body:opt.body});if(p==='/auth/v1/settings'){if(failSettings)throw Error('offline');return settings}
   if(p==='/auth/v1/signup')return signup;
   if(p.startsWith('/auth/v1/token?grant_type=password'))return signup;
   throw Error('unexpected request '+p)},
  cloudEnter:async x=>entered.push(x)};
 vm.createContext(c);vm.runInContext(html.slice(begin,end),c);
 return {c,calls,entered,run:(x)=>vm.runInContext(x,c)};
}
(async()=>{
 for(const settings of [{autoconfirm:false},{mailer_autoconfirm:false},{disable_signup:true,autoconfirm:true},{},null]){
   const x=harness(settings);await assert.rejects(x.run("cloudAuth('tester@example.com','strong-password-A')"));check(x.calls.every(c=>c.path!=='/auth/v1/signup'),'unconfirmed configuration MUST NOT POST signup');
 }
 const offline=harness({},undefined,true);await assert.rejects(offline.run("cloudAuth('tester@example.com','strong-password-A')"));check(offline.calls.length===1,'network failure fail-closed');
 const ok=harness({autoconfirm:true});await ok.run("cloudAuth('tester@example.com','strong-password-A')");
 check(ok.calls.length===2&&ok.calls[0].path==='/auth/v1/settings'&&ok.calls[1].path==='/auth/v1/signup','only settings then signup');
 check(ok.calls[1].body.email==='tester@example.com'&&ok.entered.length===1,'created session directly entered game');
 check(ok.calls.every(x=>!x.path.includes('redirect_to')),'signup does not send email redirects');
 const alias=harness({mailer_autoconfirm:true});await alias.run("cloudAuth('tester@example.com','strong-password-A')");
 check(alias.entered.length===1,'backward compatible public settings');
 const noSession=harness({autoconfirm:true},{user:{id:'account-1'}});
 await assert.rejects(noSession.run("cloudAuth('tester@example.com','strong-password-A')"));check(!noSession.entered.length,'no session cannot be reported as successful registration');
 const mismatch=harness({autoconfirm:true});mismatch.c.$('authConfirm').value='different';
 await assert.rejects(mismatch.run("cloudAuth('tester@example.com','strong-password-A')"));check(mismatch.calls.length===0,'invalid password confirmation cannot invoke Auth API');
 const login=harness({autoconfirm:false});login.c.authMode='login';
 await login.run("cloudAuth('tester@example.com','strong-password-A')");
 check(login.calls.length===1&&login.calls[0].path.startsWith('/auth/v1/token?grant_type=password'),'existing accounts can sign in independently of signup setting');
 check(!html.includes("'/auth/v1/recover"),'no new recovery emails');
 check(html.includes("id=\"forgotPasswordBtn\"")&&html.includes('style="display:none" disabled>邮件找回已停用'),'no recovery button exposed');
 check(html.includes("id=\"changePasswordForm\""),'logged-in password rotation UI');
 // Run the password-change function with a verified user and current password.
 const start=html.indexOf('async function cloudChangePasswordFromSettings('),stop=html.indexOf('function cloudExportBackup(){',start);
 check(start>0&&stop>start,'password change isolated');
 const fields={'#currentGamePassword':{value:'old-secret'},'#newGamePassword':{value:'new-secret-password'},'#confirmGamePassword':{value:'new-secret-password'}};
 const form={querySelector:s=>fields[s],reset:()=>{for(const v of Object.values(fields))v.value=''}},msg={textContent:''},button={disabled:false},pwdCalls=[];
 const c={cloudSession:{uid:'account-1'},game:{active:true},$:id=>({changePasswordForm:form,passwordChangeStatus:msg,changePasswordSubmit:button})[id],
  cloudToken:async()=>'token',cloudAuthMessage:e=>String(e.message),cloudRequest:async(p,o)=>{pwdCalls.push({p,o});if(p==='/auth/v1/user'&&o?.method==='PUT')return {id:'account-1'};
    if(p==='/auth/v1/user')return {id:'account-1',email:'tester@example.com'};
    if(p.startsWith('/auth/v1/token?grant_type=password'))return {access_token:'verified',user:{id:'account-1'}};
    throw Error('unexpected route')}};
 vm.createContext(c);vm.runInContext(html.slice(start,stop),c);
 await vm.runInContext('cloudChangePasswordFromSettings({preventDefault(){}})',c);
 check(pwdCalls.length===3&&pwdCalls[1].o.body.password==='old-secret'&&pwdCalls[2].o.body.password==='new-secret-password','password rotation verifies old password then updates new');
 check(msg.textContent.includes('密码已更新')&&fields['#currentGamePassword'].value===''&&!button.disabled,'password fields cleared and UI restored');
 console.log(JSON.stringify({checks:passed,passed,scope:'mocked Supabase auth; live Confirm Email switch still required'}));
})().catch(e=>{console.error(e);process.exitCode=1});
