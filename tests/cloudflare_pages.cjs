const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../site/index.html'),'utf8');
const headers=fs.readFileSync(path.join(__dirname,'../site/_headers'),'utf8');
const lines=['CLOUD_PRIMARY_URL','CLOUD_LEGACY_URL','CLOUD_SITE_URL'].map(name=>{
 const declaration=html.match(new RegExp('^const '+name+'=.*;$','m'));
 assert.ok(declaration,'Missing '+name);
 return declaration[0];
});
const configured=(loc)=>vm.runInNewContext(lines.join('\n')+'\nCLOUD_SITE_URL',loc?{location:loc}:{});
const primary='https://petal-realms.pages.dev',legacy='https://stellular-khapse-5c19f8.netlify.app';
const cases=[
 [{protocol:'https:',hostname:'petal-realms.pages.dev',origin:primary},primary],
 [{protocol:'https:',hostname:'staging.petal-realms.pages.dev',origin:'https://staging.petal-realms.pages.dev'},primary],
 [{protocol:'https:',hostname:'other.pages.dev',origin:'https://other.pages.dev'},primary],
 [{protocol:'https:',hostname:'stellular-khapse-5c19f8.netlify.app',origin:legacy},legacy],
 [{protocol:'http:',hostname:'stellular-khapse-5c19f8.netlify.app',origin:'http://stellular-khapse-5c19f8.netlify.app'},primary],
 [{protocol:'https:',hostname:'petal-realms.pages.dev.attacker.example',origin:'https://petal-realms.pages.dev.attacker.example'},primary],
 [null,primary]
];
let n=0;
for(const [loc,want] of cases){assert.equal(configured(loc),want);n++;}
for(const [needle,message] of [
 ['<link rel="canonical" href="'+primary+'/"','Canonical link'],
 ['<meta property="og:url" content="'+primary+'/"','Social primary URL'],
 ["cloudRequest('/auth/v1/signup',{method:'POST'",'No-email signup endpoint'],
 ['cloudNoMailSignupReady();','No-email preflight before registration'],
 ['id="changePasswordForm"','In-game password rotation'],
 ['version:\'5.8-password-only\'','Version code'],
 ['id="forgotPasswordBtn"','Disabled legacy recovery control'],
 
 ['id="migrationNotice"','Explicit old-origin migration warning'],
 ['服务器尚未启用免邮件注册','Fail-closed no-email config message'],
 ['id="hostBadge"','Hosting badge'],
 ["const CLOUD_PRIMARY_URL='"+primary+"'","Explicit Cloudflare canonical constant"],
 ["cloudAuthMessage(err,'login')","Localized auto-login error"],
 
]){assert.ok(html.includes(needle),message);n++;}
for(const str of ['X-Content-Type-Options: nosniff','Referrer-Policy: strict-origin-when-cross-origin','X-Frame-Options: DENY','Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()','/index.html','Cache-Control: no-cache, must-revalidate']){
 assert.ok(headers.includes(str),str);n++;
}
const start=html.indexOf('function updateHostingStatus()');
const stop=html.indexOf('// Opt-in multiplayer preview.',start);
assert.ok(start>=0&&stop>start);
const code=html.slice(start,stop);
function hosted(loc,online){
 const badge={textContent:''},notice={style:{display:''}},listeners={};
 const c={location:loc,navigator:{onLine:online},window:{addEventListener:(evt,fn)=>listeners[evt]=fn},$:id=>id==='hostBadge'?badge:id==='migrationNotice'?notice:null};
 vm.runInNewContext(code,c);
 assert.equal(typeof listeners.online,'function');
 assert.equal(typeof listeners.offline,'function');
 return {badge:badge.textContent,notice:notice.style.display};
}
const a=hosted({protocol:'https:',hostname:'stellular-khapse-5c19f8.netlify.app'},true);
assert.ok(a.badge.includes('旧版网站')&&a.notice==='block');n++;
const b=hosted({protocol:'https:',hostname:'petal-realms.pages.dev'},false);
assert.ok(b.badge.includes('Cloudflare Pages')&&b.badge.includes('离线')&&b.notice==='none');n++;
assert.ok(!html.includes("'/auth/v1/recover"),'No email-recovery sending endpoint allowed');n++;
console.log(JSON.stringify({checks:n,passed:n,scope:'static Cloudflare + no-email flow; live Auth confirmation setting separate'}));
