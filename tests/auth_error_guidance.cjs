const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../site/index.html'),'utf8');
const start=html.indexOf('function cloudAuthMessage(');
const stop=html.indexOf('async function cloudRequest(',start);
assert.ok(start>0&&stop>start,'Expected error presenter in site HTML');
const ctx={};vm.createContext(ctx);vm.runInContext(html.slice(start,stop),ctx);
const translate=(code,message,action)=>vm.runInContext('cloudAuthMessage({code:'+JSON.stringify(code)+',message:'+JSON.stringify(message)+'},'+JSON.stringify(action||'login')+')',ctx);
const cases=[
 ['invalid_credentials','Invalid login credentials','邮箱地址或密码不正确'],
 ['','Invalid login credentials','先注册并完成邮箱验证'],
 ['email_not_confirmed','Email not confirmed','邮箱尚未确认'],
 ['email_address_not_authorized','Email address not authorized','必须配置自定义 SMTP'],
 ['','Email address not authorized','发送授权'],
 ['email_send_failed','Error sending confirmation email','邮件服务未能正常发送'],
 ['','Error sending confirmation email','邮件服务未能正常发送'],
 ['over_email_send_rate_limit','For security purposes, you can only request this after 60 seconds','操作过于频繁'],
 ['user_already_exists','User already registered','可能已经注册'],
 ['signup_disabled','Signups not allowed','邮箱注册服务暂未开放'],
 ['weak_password','Password should be at least 8 characters','密码安全强度不足'],
 ['email_address_invalid','Invalid email','邮箱地址格式不正确'],
 ['','Failed to fetch','无法连接云端服务器'],
 ['captcha_failed','captcha_required','安全验证没有通过'],
 ['','Internal server error','登录未完成'],
];
let passed=0;
for(const [code,msg,expected] of cases){const value=translate(code,msg);assert.ok(value.includes(expected),'Expected '+expected+' for '+code+'/'+msg+', got '+value);assert.ok(!value.includes('Invalid login credentials'));passed++}
assert.ok(translate('','某设备可能已更新云存档，已阻止覆盖').includes('已阻止覆盖'));passed++;
console.log(JSON.stringify({tests:passed,passed}));
