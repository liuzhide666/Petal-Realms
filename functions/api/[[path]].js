import { pbkdf2, scrypt, randomBytes, randomUUID, createHash, timingSafeEqual } from 'node:crypto';

// Secrets are never accepted as player IDs or put into a save/export.
const COOKIE = '__Host-petal_session';
// OWASP's 16 MiB scrypt profile; native Workers PBKDF2 rejects >100000 iterations.
const SCRYPT = Object.freeze({N:16384,r:8,p:5,maxmem:33554432});
const MAX_BODY = 1048576;
const LEGACY_URL = 'https://bfipozjqhzsbdvmisoct.supabase.co';
const LEGACY_PUBLIC_KEY = 'sb_publishable_wfyMqIqPAZPjH-Q7sHl5ug_8m92bpX0';
const PETALS = new Set(['basic','rose','leaf','stinger','cactus','bubble','sand','claw','iris','lightning','gear','fang','magma','shell','antenna','poison','starpetal','nectar','missile','grape','puff','bloom','glass','root','soil','wing','magnet']);
const ZONES = new Set(['garden','desert','ant','ocean','sewer','jungle','hel','factory']);
const hash = value => createHash('sha256').update(value).digest('hex');
const now = () => Math.floor(Date.now()/1000);
class APIError extends Error {
  constructor(status, message, retry=0) { super(message); this.status=status; this.retry=retry; }
}
const fail = (status,message) => {throw new APIError(status,message);};
const statement = (db,sql,...args) => db.prepare(sql).bind(...args);
function reply(data,status=200,headers={}) {
  return Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
}
function username(value,emailOnly=false) {
  if(typeof value!=='string') fail(400,'请输入注册邮箱。');
  const name=value.normalize('NFKC').trim().toLowerCase();
  if(emailOnly||name.includes('@')) {
    const parts=name.split('@'),local=parts[0],domain=parts[1]||'';
    const labels=domain.split('.');
    if(name.length>254||parts.length!==2||!local||local.length>64||! /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local)||local.startsWith('.')||local.endsWith('.')||local.includes('..')||labels.length<2||!labels.every(x=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(x))||!/^[a-z]{2,63}$/i.test(labels.at(-1))) fail(400,'请输入有效的邮箱地址，例如 name@example.com。');
    return name;
  }
  // Existing V5.11 preview game names keep working for login and recovery.
  if(!/^[\p{L}\p{N}_-]{2,18}$/u.test(name)||['__proto__','constructor','prototype'].includes(name)||/^(cloud-|cf-)/i.test(name)) fail(400,'账号需为 2—18 位汉字、字母、数字、下划线或连字符，且不能使用保留前缀。');
  return name;
}
function password(value) {
  if(typeof value!=='string'||value.length<8||value.length>128) fail(400,'密码需为 8—128 个字符。');
  return value;
}
const derive = (pass,salt) => new Promise((resolve,reject)=>scrypt(pass,salt,32,SCRYPT,(err,key)=>err?reject(err):resolve(key)));
let passwordRuntimeReady;
function verifyPasswordRuntime(){
  return passwordRuntimeReady??=(async()=>{
    const key=await derive('fixed-public-runtime-probe','fixed-public-salt');
    if(key.toString('hex')!=='964969a05a3b287285cf7576af1ffcdc6bc82f271132dcc5915c14dd7bea6767')throw Error('Password runtime self-test failed');
  })();
}
async function makePassword(pass) {
  const salt=randomBytes(16).toString('hex');
  return JSON.stringify({algorithm:'scrypt',version:1,N:SCRYPT.N,r:SCRYPT.r,p:SCRYPT.p,salt,key:(await derive(pass,salt)).toString('hex')});
}
async function checkPassword(pass,record) {
  if(typeof pass!=='string'||pass.length>128) return false;
  const p=record?JSON.parse(record):{algorithm:'scrypt',version:1,...SCRYPT,salt:'00000000000000000000000000000000',key:'0'.repeat(64)};
  let actual;
  if(p.algorithm==='scrypt'&&p.version===1&&p.N===SCRYPT.N&&p.r===SCRYPT.r&&p.p===SCRYPT.p)actual=await derive(pass,p.salt);
  else if(p.algorithm==='pbkdf2-sha256'&&p.iterations===600000){
    // Earlier preview records are recoverable by recovery code even on capped runtimes.
    try{actual=await new Promise((resolve,reject)=>pbkdf2(pass,p.salt,p.iterations,32,'sha256',(err,key)=>err?reject(err):resolve(key)));}
    catch(e){if(e.name==='NotSupportedError')fail(503,'此旧密码记录需要更新，请使用注册时保存的恢复码设置新密码。');throw e}
  }else fail(503,'密码校验暂不可用。');
  const expected=Buffer.from(p.key,'hex');
  return actual.length===expected.length&&timingSafeEqual(actual,expected)&&!!record;
}
async function bodyOf(request) {
  if(!/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type')||'')) fail(415,'请求必须使用 JSON。');
  if(Number(request.headers.get('Content-Length'))>MAX_BODY) fail(413,'请求文件过大。');
  const reader=request.body?.getReader(); if(!reader) fail(400,'缺少请求内容。');
  let total=0;const chunks=[];
  for(;;){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>MAX_BODY){await reader.cancel();fail(413,'请求文件过大。')}chunks.push(value)}
  try {const bytes=new Uint8Array(total);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length}const body=JSON.parse(new TextDecoder().decode(bytes));if(!body||typeof body!=='object'||Array.isArray(body))throw Error();return body;}
  catch {fail(400,'请求内容格式无效。');}
}
async function limit(db,bucket,max,seconds) {
  const t=now();
  const row=await statement(db,`INSERT INTO rate_limits(bucket,attempts,reset_at) VALUES(?,1,?)
    ON CONFLICT(bucket) DO UPDATE SET attempts=CASE WHEN reset_at<=? THEN 1 ELSE attempts+1 END,
    reset_at=CASE WHEN reset_at<=? THEN excluded.reset_at ELSE reset_at END RETURNING attempts,reset_at`,bucket,t+seconds,t,t).first();
  if(row.attempts>max) throw new APIError(429,'操作过于频繁，请等待后再试。',Math.max(1,row.reset_at-t));
}
function cookieToken(request) {
  const match=(request.headers.get('Cookie')||'').match(/(?:^|;\s*)__Host-petal_session=([a-f0-9]{64})(?:;|$)/);
  return match?.[1]||null;
}
async function accountFor(db,request) {
  const token=cookieToken(request);if(!token)return null;
  return statement(db,`SELECT p.id,p.username,p.display_name,p.password_record,p.recovery_hash,p.credential_version FROM sessions s JOIN players p ON p.id=s.player_id
    WHERE s.token_hash=? AND s.expires_at>? AND s.credential_version=p.credential_version`,hash(token),now()).first();
}
const publicAccount = a => ({id:a.id,username:a.username,displayName:a.display_name});
async function sessionCookie(db,account,remember) {
  await statement(db,'DELETE FROM sessions WHERE token_hash IN (SELECT token_hash FROM sessions WHERE expires_at<=? LIMIT 100)',now()).run();
  await statement(db,'DELETE FROM rate_limits WHERE bucket IN (SELECT bucket FROM rate_limits WHERE reset_at<=? LIMIT 100)',now()).run();
  const token=randomBytes(32).toString('hex'), duration=remember?30*86400:12*3600;
  const r=await statement(db,`INSERT INTO sessions(token_hash,player_id,credential_version,expires_at)
    SELECT ?,id,credential_version,? FROM players WHERE id=? AND credential_version=?`,hash(token),now()+duration,account.id,account.credential_version).run();
  if(r.meta.changes!==1) fail(409,'账号安全设置已改变，请重新登录。');
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict${remember?'; Max-Age='+duration:''}`;
}
function validateSave(payload) {
  if(!payload||typeof payload!=='object'||Array.isArray(payload)||payload.version!==5||!ZONES.has(payload.zone)) fail(400,'不支持的存档版本或地图。');
  const p=payload.p;
  if(!p||typeof p!=='object'||!Number.isSafeInteger(p.level)||p.level<1||p.level>999||!['xp','kills','hp'].every(k=>Number.isFinite(p[k])&&p[k]>=0&&p[k]<=1e12)) fail(400,'角色数值无效。');
  const item=x=>x&&typeof x==='object'&&PETALS.has(x.t)&&Number.isInteger(x.r)&&x.r>=0&&x.r<10;
  if(!Array.isArray(payload.slots)||payload.slots.length>10||!payload.slots.every(item)) fail(400,'装备数据无效。');
  if(payload.backupSlots!==undefined&&(!Array.isArray(payload.backupSlots)||payload.backupSlots.length>10||!payload.backupSlots.every(item))) fail(400,'备用装备数据无效。');
  const bag=payload.bag;
  if(!bag||typeof bag!=='object'||Array.isArray(bag)||Object.keys(bag).length>270) fail(400,'背包数据无效。');
  for(const [k,n]of Object.entries(bag)){const m=/^([a-zA-Z]+)@(0|[1-9])$/.exec(k);if(!m||!PETALS.has(m[1])||!Number.isInteger(n)||n<0||n>99999)fail(400,'背包物品无效。')}
  if(payload.goal!=null&&(!PETALS.has(payload.goal.t)||!Number.isInteger(payload.goal.r)||payload.goal.r<0||payload.goal.r>9))fail(400,'收集目标无效。');
  const text=JSON.stringify(payload);
  if(new TextEncoder().encode(text).length>MAX_BODY) fail(413,'存档超过大小限制。');
  return text;
}
async function putSave(db,id,expected,payload) {
  if(expected!==null&&(!Number.isSafeInteger(expected)||expected<1||expected>=Number.MAX_SAFE_INTEGER)) fail(400,'存档版本号无效。');
  const text=validateSave(payload),t=now();
  const row=expected===null
    ?await statement(db,'INSERT INTO saves(player_id,schema_version,revision,payload,updated_at) VALUES(?,5,1,?,?) ON CONFLICT(player_id) DO NOTHING RETURNING revision',id,text,t).first()
    :await statement(db,'UPDATE saves SET revision=revision+1,payload=?,updated_at=? WHERE player_id=? AND revision=? RETURNING revision',text,t,id,expected).first();
  if(!row) fail(409,'云存档已经更新。已保留本机进度，请先导出备份并核对版本。');
  return row;
}
async function migrate(db,account,body) {
  const token=body.accessToken;
  if(typeof token!=='string'||token.length>8192||token.length<20) fail(400,'请先登录旧邮箱云账号。');
  const headers={apikey:LEGACY_PUBLIC_KEY,Authorization:'Bearer '+token};
  const userResponse=await fetch(LEGACY_URL+'/auth/v1/user',{headers,signal:AbortSignal.timeout(10000)});
  if(!userResponse.ok) fail(401,'旧云账号身份验证失败，请重新登录。');
  const user=await userResponse.json();
  if(!/^[a-f0-9-]{36}$/i.test(user?.id||'')) fail(401,'旧云账号身份无效。');
  const linked=await statement(db,'SELECT player_id FROM legacy_links WHERE legacy_uid=?',user.id).first();
  if(linked){if(linked.player_id!==account.id)fail(409,'该旧角色已经迁移到另一个账号。');return {migrated:true,alreadyMigrated:true};}
  if(await statement(db,'SELECT player_id FROM saves WHERE player_id=?',account.id).first()) fail(409,'当前 Cloudflare 账号已有云存档，迁移不会覆盖它。请使用空账号。');
  const response=await fetch(LEGACY_URL+'/rest/v1/petal_realms_saves?user_id=eq.'+encodeURIComponent(user.id)+'&select=revision,payload&limit=1',{headers,signal:AbortSignal.timeout(10000)});
  if(!response.ok) fail(502,'无法读取旧云存档，尚未迁移。');
  const rows=await response.json();if(!Array.isArray(rows)||rows.length!==1)fail(404,'旧账号尚无云存档。');
  const text=validateSave(rows[0].payload);
  // Both inserts succeed or both roll back. A concurrent import/claim cannot overwrite either.
  try {await db.batch([
    statement(db,'INSERT INTO legacy_links(legacy_uid,player_id,source_revision,migrated_at) VALUES(?,?,?,?)',user.id,account.id,rows[0].revision,now()),
    statement(db,'INSERT INTO saves(player_id,schema_version,revision,payload,updated_at) VALUES(?,5,1,?,?)',account.id,text,now()),
  ]);}catch {fail(409,'角色迁移发生冲突，原数据保持不变，请重新核对。');}
  return {migrated:true,alreadyMigrated:false};
}

export async function onRequest({request,env}) {
  try {
    if(!env.PETAL_DB) fail(503,'云账号服务尚未就绪，可选择本机角色继续游玩。');
    const db=env.PETAL_DB, url=new URL(request.url), path=url.pathname.slice(5), method=request.method;
    if(!['GET','POST','PUT'].includes(method)) return reply({error:'请求方法不支持。'},405,{Allow:'GET, POST, PUT'});
    if(method!=='GET'&&request.headers.get('Origin')!==url.origin) fail(403,'请求来源不匹配。请从游戏主站重新操作。');
    if(method==='GET'&&path==='session') {const a=await accountFor(db,request);return reply({account:a?publicAccount(a):null});}
    if(method==='GET'&&path==='health') {await db.prepare('SELECT id FROM players LIMIT 1').first();await verifyPasswordRuntime();return reply({ok:true,version:'5.13',provider:'cloudflare',passwordHash:'scrypt'});}
    const account=await accountFor(db,request);
    if(account&&['save','auth/password','auth/logout','migrate'].includes(path)&&request.headers.get('X-Petal-Account')!==account.id)
      fail(409,'此浏览器已切换到其他账号。已停止操作，请在当前标签页重新登录。');
    if(path==='save'&&method==='GET') {
      if(!account)fail(401,'请重新登录游戏账号。');
      const row=await statement(db,'SELECT revision,payload,updated_at FROM saves WHERE player_id=?',account.id).first();
      return reply(row?{accountId:account.id,revision:row.revision,payload:JSON.parse(row.payload),updatedAt:row.updated_at}:{accountId:account.id,revision:null,payload:null});
    }
    if(method==='GET')fail(404,'接口不存在。');
    const body=await bodyOf(request),ip=request.headers.get('CF-Connecting-IP')||'unknown';
    if(path==='save'&&method==='PUT') {
      if(!account)fail(401,'请重新登录游戏账号。');
      await limit(db,'save:'+account.id,120,60);return reply(await putSave(db,account.id,body.expectedRevision,body.payload));
    }
    if(method!=='POST')fail(405,'请求方法不支持。');
    if(path==='auth/logout') {
      const token=cookieToken(request);if(token)await statement(db,'DELETE FROM sessions WHERE token_hash=?',hash(token)).run();
      return reply({ok:true},200,{'Set-Cookie':`${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`});
    }
    if(path==='migrate') {
      if(!account)fail(401,'请先登录新的 Cloudflare 游戏账号。');
      await limit(db,'migrate:'+account.id,5,3600);return reply(await migrate(db,account,body));
    }
    if(!['auth/register','auth/login','auth/password','auth/recover'].includes(path))fail(404,'接口不存在。');
    await limit(db,'auth-ip:'+hash(ip),30,300);
    if(path==='auth/password') {
      if(!account)fail(401,'请重新登录游戏账号。');
      await limit(db,'password:'+account.id,10,300);
      if(!await checkPassword(body.currentPassword,account.password_record))fail(401,'当前密码不正确。');
      const record=await makePassword(password(body.newPassword));
      const changed=await statement(db,'UPDATE players SET password_record=?,credential_version=credential_version+1 WHERE id=? AND credential_version=? RETURNING credential_version',record,account.id,account.credential_version).first();
      if(!changed)fail(409,'账号安全设置已改变，请重新登录。');
      return reply({ok:true},200,{'Set-Cookie':await sessionCookie(db,{...account,...changed},body.remember===true)});
    }
    const name=username(body.username,path==='auth/register');
    await limit(db,'auth-name:'+hash(name),15,300);
    if(path==='auth/register') {
      await limit(db,'register:'+hash(ip),5,3600);
      const record=await makePassword(password(body.password)),id=randomUUID(),recoveryCode=randomBytes(32).toString('hex');
      const row=await statement(db,'INSERT INTO players(id,username,display_name,password_record,recovery_hash,created_at) VALUES(?,?,?,?,?,?) ON CONFLICT(username) DO NOTHING RETURNING id,username,display_name,credential_version',id,name,body.username.normalize('NFKC').trim(),record,hash(recoveryCode),now()).first();
      if(!row)fail(409,'该邮箱已经注册，请登录或使用恢复码找回。');
      return reply({account:publicAccount(row),recoveryCode},201,{'Set-Cookie':await sessionCookie(db,row,body.remember===true)});
    }
    const row=await statement(db,'SELECT * FROM players WHERE username=?',name).first();
    if(path==='auth/recover') {
      password(body.newPassword);
      const recovery=typeof body.recoveryCode==='string'?body.recoveryCode.trim().toLowerCase():'';
      if(!row||!/^[a-f0-9]{64}$/.test(recovery)||!timingSafeEqual(Buffer.from(hash(recovery),'hex'),Buffer.from(row.recovery_hash,'hex')))fail(401,'游戏账号或恢复码不正确。');
      const recoveryCode=randomBytes(32).toString('hex'),record=await makePassword(body.newPassword);
      const changed=await statement(db,'UPDATE players SET password_record=?,recovery_hash=?,credential_version=credential_version+1 WHERE id=? AND credential_version=? AND recovery_hash=? RETURNING credential_version',record,hash(recoveryCode),row.id,row.credential_version,row.recovery_hash).first();
      if(!changed)fail(409,'恢复码已使用，请重新核对。');
      return reply({account:publicAccount(row),recoveryCode},200,{'Set-Cookie':await sessionCookie(db,{...row,...changed},false)});
    }
    if(!await checkPassword(body.password,row?.password_record))fail(401,'游戏账号或密码不正确。');
    return reply({account:publicAccount(row)},200,{'Set-Cookie':await sessionCookie(db,row,body.remember===true)});
  } catch(error) {
    if(error instanceof APIError)return reply({error:error.message},error.status,error.retry?{'Retry-After':String(error.retry)}:{});
    console.error('Petal API operation failed:',error?.name||'Error');
    return reply({error:'云端操作暂未完成，本机进度仍保留，请稍后重试。'},503);
  }
}
