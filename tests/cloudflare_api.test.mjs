import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import crypto from 'node:crypto';
import { syncBuiltinESMExports } from 'node:module';
import { onRequest } from '../functions/api/[[path]].js';

function fixture() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../database/cloudflare/0001_accounts.sql', import.meta.url), 'utf8'));
  const wrap = (sql, args = []) => ({
    bind: (...values) => wrap(sql, values),
    first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({results: db.prepare(sql).all(...args)}),
    run: async () => ({meta: {changes: Number(db.prepare(sql).run(...args).changes)}}),
  });
  const env = {PETAL_DB: {prepare: sql => wrap(sql), batch: async statements => {
    db.exec('BEGIN');
    try {const out = []; for (const s of statements) out.push(await s.run()); db.exec('COMMIT'); return out;}
    catch (e) {db.exec('ROLLBACK'); throw e;}
  }}};
  const identities=new Map();
  async function call(path, {method='GET', body, cookie='', origin='https://petal.test', ip='127.0.0.1',expectedAccountId=identities.get(cookie)}={}) {
    const response=await onRequest({env, request: new Request('https://petal.test/api/'+path, {
      method, headers: {'Content-Type':'application/json', Origin:origin, Cookie:cookie, 'CF-Connecting-IP':ip,...(expectedAccountId?{'X-Petal-Account':expectedAccountId}:{})},
      body: body === undefined ? undefined : JSON.stringify(body),
    })});
    if(response.headers.has('Set-Cookie')){const data=await response.clone().json();const id=data.account?.id||identities.get(cookie);if(id)identities.set(response.headers.get('Set-Cookie').split(';')[0],id)}
    return response;
  }
  return {db, call};
}
const password='sensible-password-2026';
const save = () => ({version:5,zone:'garden',p:{level:3,xp:12,kills:5,hp:100},bag:{'basic@0':8},slots:[{t:'basic',r:0}],protectedPetals:{'basic@0':true}});
async function register(f, username='flower@example.com', ip='127.0.0.1') {
  const r=await f.call('auth/register',{method:'POST',body:{username,password,remember:true},ip});
  assert.equal(r.status,201); const data=await r.json();
  return {...data,cookie:r.headers.get('Set-Cookie').split(';')[0]};
}

test('registration uses a server account, secure cookie and no email',async()=>{
  const f=fixture(), a=await register(f);
  assert.equal(a.account.username,'flower@example.com'); assert.match(a.recoveryCode,/^[a-f0-9]{64}$/);
  const row=f.db.prepare('SELECT * FROM players').get();
  assert.ok(!JSON.stringify(row).includes(password)); assert.ok(!JSON.stringify(row).includes(a.recoveryCode));
  const r=await f.call('auth/login',{method:'POST',body:{username:'FLOWER@EXAMPLE.COM',password,remember:true}});
  assert.equal(r.status,200); assert.match(r.headers.get('Set-Cookie'),/HttpOnly; Secure; SameSite=Strict/);
  assert.match(r.headers.get('Set-Cookie'),/Max-Age=/);
  const session=await f.call('session',{cookie:a.cookie}); assert.equal((await session.json()).account.id,a.account.id);
  assert.equal((await f.call('session')).status,200);
  assert.equal((await f.call('auth/login',{method:'POST',body:{username:'flower@example.com',password:'wrong'}})).status,401);
  assert.equal((await f.call('auth/register',{method:'POST',body:{username:'flower@example.com',password}})).status,409);
});
test('same-origin JSON required, body bounded and identity never comes from caller',async()=>{
  const f=fixture();
  assert.equal((await f.call('auth/register',{method:'POST',origin:'https://evil.test',body:{username:'flower@example.com',password}})).status,403);
  assert.equal((await f.call('auth/register',{method:'POST',body:{username:'__proto__',password}})).status,400);
  assert.equal((await f.call('auth/register',{method:'POST',body:{username:'cloud-test',password}})).status,400);
  assert.equal((await f.call('auth/register',{method:'POST',body:{username:'flower@example.com',password:'a'.repeat(1100000)}})).status,413);
  assert.equal((await f.call('save')).status,401);
});
test('save revisions are atomic; users cannot overwrite each other',async()=>{
  const f=fixture(), a=await register(f), b=await register(f,'second@example.com','127.0.0.2');
  const write=await f.call('save',{method:'PUT',cookie:a.cookie,body:{expectedRevision:null,payload:save()}});
  assert.equal(write.status,200); assert.equal((await write.json()).revision,1);
  assert.equal((await f.call('save',{cookie:b.cookie})).status,200);
  assert.equal((await (await f.call('save',{cookie:b.cookie})).json()).payload,null);
  assert.equal((await f.call('save',{method:'PUT',cookie:a.cookie,body:{expectedRevision:null,payload:save()}})).status,409);
  assert.equal((await f.call('save',{method:'PUT',cookie:a.cookie,body:{expectedRevision:1,payload:save()}})).status,200);
  assert.equal((await f.call('save',{method:'PUT',cookie:a.cookie,body:{expectedRevision:1,payload:save()}})).status,409);
  const bad=save(); bad.bag['constructor@0']=3;
  assert.equal((await f.call('save',{method:'PUT',cookie:a.cookie,body:{expectedRevision:2,payload:bad}})).status,400);
  assert.equal((await (await f.call('save',{cookie:a.cookie})).json()).revision,2);
  const target=save();target.goal={t:'rose',r:2};
  assert.equal((await f.call('save',{method:'PUT',cookie:a.cookie,body:{expectedRevision:2,payload:target}})).status,200);
  assert.deepEqual((await (await f.call('save',{cookie:a.cookie})).json()).payload.goal,target.goal);
  target.goal.r=10;
  assert.equal((await f.call('save',{method:'PUT',cookie:a.cookie,body:{expectedRevision:3,payload:target}})).status,400);
  target.goal={t:'constructor',r:0};
  assert.equal((await f.call('save',{method:'PUT',cookie:a.cookie,body:{expectedRevision:3,payload:target}})).status,400);
});
test('password rotation and one-use recovery revoke every older session',async()=>{
  const f=fixture(), a=await register(f);
  const other=await f.call('auth/login',{method:'POST',body:{username:'flower@example.com',password}});
  const otherCookie=other.headers.get('Set-Cookie').split(';')[0];
  const change=await f.call('auth/password',{method:'POST',cookie:a.cookie,body:{currentPassword:password,newPassword:password+'new'}});
  assert.equal(change.status,200); const fresh=change.headers.get('Set-Cookie').split(';')[0];
  assert.equal((await (await f.call('session',{cookie:a.cookie})).json()).account,null);
  assert.equal((await (await f.call('session',{cookie:otherCookie})).json()).account,null);
  assert.ok((await (await f.call('session',{cookie:fresh})).json()).account);
  const recovered=await f.call('auth/recover',{method:'POST',body:{username:'flower@example.com',recoveryCode:a.recoveryCode,newPassword:password+'restored'}});
  assert.equal(recovered.status,200); assert.notEqual((await recovered.json()).recoveryCode,a.recoveryCode);
  assert.equal((await (await f.call('session',{cookie:fresh})).json()).account,null);
  assert.equal((await f.call('auth/recover',{method:'POST',body:{username:'flower@example.com',recoveryCode:a.recoveryCode,newPassword:password+'again'}})).status,401);
});
test('rate limits persist in database; failures do not grant a session',async()=>{
  const f=fixture(); let r;
  for(let i=0;i<31;i++) r=await f.call('auth/login',{method:'POST',body:{username:'absent'+i,password:'wrong'}});
  assert.equal(r.status,429); assert.ok(Number(r.headers.get('Retry-After'))>0); assert.equal(r.headers.get('Set-Cookie'),null);
});
test('logout invalidates cookie on server and missing binding fails closed',async()=>{
  const f=fixture(), a=await register(f);
  assert.equal((await f.call('auth/logout',{method:'POST',cookie:a.cookie,body:{}})).status,200);
  assert.equal((await (await f.call('session',{cookie:a.cookie})).json()).account,null);
  const r=await onRequest({env:{},request:new Request('https://petal.test/api/session')}); assert.equal(r.status,503);
});
test('legacy migration proves identity, refuses overwrite and is idempotent',async()=>{
  const f=fixture(), a=await register(f), b=await register(f,'other@example.com','127.0.0.2');
  const original=globalThis.fetch, uid='11223344-aaaa-4aaa-bbbb-112233445566';
  let authOK=false;
  globalThis.fetch=async url=>url.includes('/auth/v1/user')
    ?Response.json(authOK?{id:uid}:{error:'unverified'},{status:authOK?200:401})
    :Response.json([{revision:50,payload:save()}]);
  try{
    const args={method:'POST',cookie:a.cookie,body:{accessToken:'legacy-token-for-isolated-test'}};
    assert.equal((await f.call('migrate',args)).status,401);
    assert.equal(f.db.prepare('SELECT count(*) n FROM legacy_links').get().n,0);
    authOK=true;
    assert.equal((await f.call('migrate',args)).status,200);
    assert.equal((await (await f.call('migrate',args)).json()).alreadyMigrated,true);
    assert.equal((await f.call('migrate',{...args,cookie:b.cookie})).status,409);
    assert.equal(f.db.prepare('SELECT count(*) n FROM legacy_links').get().n,1);
    assert.equal((await (await f.call('save',{cookie:a.cookie})).json()).payload.p.level,3);
    await f.call('save',{method:'PUT',cookie:b.cookie,body:{expectedRevision:null,payload:save()}});
    globalThis.fetch=async url=>url.includes('/auth/v1/user')?Response.json({id:'77889900-aaaa-4aaa-bbbb-112233445566'}):Response.json([{revision:1,payload:save()}]);
    assert.equal((await f.call('migrate',{...args,cookie:b.cookie})).status,409);
    assert.equal(f.db.prepare('SELECT count(*) n FROM legacy_links').get().n,1);
  }finally{globalThis.fetch=original;}
});
test('all 27 petals survive validation and concurrent writes have one winner',async()=>{
  const f=fixture(), a=await register(f);
  const payload=save();
  payload.bag={'iris@0':1,'puff@3':2,'bloom@9':4,'glass@4':1,'root@3':2,'soil@3':4,'wing@0':1,'magnet@0':2};
  await f.call('save',{method:'PUT',cookie:a.cookie,body:{expectedRevision:null,payload}});
  const results=await Promise.all([1,2].map(()=>f.call('save',{method:'PUT',cookie:a.cookie,body:{expectedRevision:1,payload}})));
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
});

test('another tab changing the shared cookie cannot redirect reads, saves or logout',async()=>{
  const f=fixture(), a=await register(f), b=await register(f,'second@example.com','127.0.0.2');
  const newer=save();newer.p.level=20;
  await f.call('save',{method:'PUT',cookie:b.cookie,body:{expectedRevision:null,payload:newer}});
  const stale={cookie:b.cookie,expectedAccountId:a.account.id};
  assert.equal((await f.call('save',{...stale,method:'PUT',body:{expectedRevision:1,payload:save()}})).status,409);
  assert.equal((await f.call('save',stale)).status,409);
  assert.equal((await f.call('auth/logout',{...stale,method:'POST',body:{}})).status,409);
  assert.equal((await (await f.call('save',{cookie:b.cookie})).json()).payload.p.level,20);
  assert.equal((await (await f.call('save',{cookie:b.cookie})).json()).accountId,b.account.id);
});


test('email registration is canonical, sends no mail, and preserves legacy logins',async()=>{
  const f=fixture();let calls=0;const original=globalThis.fetch;
  globalThis.fetch=async()=>{calls++;throw Error('new accounts must not contact mail or Supabase')};
  try{
    for(const username of ['flower','a..b@example.com','a@-domain.com','a@domain','a@domain..com','<script>@example.com','a'.repeat(65)+'@example.com']){
      assert.equal((await f.call('auth/register',{method:'POST',body:{username,password}})).status,400,username);
    }
    const a=await register(f,'  Flower+garden@Example.COM  ');
    assert.equal(a.account.username,'flower+garden@example.com');
    assert.equal((await f.call('auth/register',{method:'POST',body:{username:'FLOWER+GARDEN@example.com',password}})).status,409);
    f.db.prepare("UPDATE players SET username='oldflower', display_name='oldflower' WHERE id=?").run(a.account.id);
    assert.equal((await f.call('auth/login',{method:'POST',body:{username:'OLDFLOWER',password}})).status,200);
    assert.equal((await f.call('auth/recover',{method:'POST',body:{username:'oldflower',recoveryCode:a.recoveryCode,newPassword:password+'legacy'}})).status,200);
    assert.equal(calls,0);
  }finally{globalThis.fetch=original}
});

test('register/login/password/recovery work with the deployed Workers PBKDF2 cap',async()=>{
  const original=crypto.pbkdf2;let overLimit=0;
  crypto.pbkdf2=function(pass,salt,iterations,keylen,digest,callback){
    if(iterations>100000){overLimit++;const e=new Error('Pbkdf2 failed: iteration counts above 100000 are not supported');e.name='NotSupportedError';callback(e);return}
    return original(pass,salt,iterations,keylen,digest,callback);
  };syncBuiltinESMExports();
  try{
    const f=fixture(),a=await register(f);
    const health=await f.call('health');assert.equal(health.status,200);assert.equal((await health.json()).passwordHash,'scrypt');
    const record=JSON.parse(f.db.prepare('SELECT password_record FROM players').get().password_record);
    assert.deepEqual({algorithm:record.algorithm,N:record.N,r:record.r,p:record.p},{algorithm:'scrypt',N:16384,r:8,p:5});
    assert.equal((await f.call('auth/login',{method:'POST',body:{username:a.account.username,password}})).status,200);
    assert.equal((await f.call('auth/login',{method:'POST',body:{username:'missing@example.com',password}})).status,401);
    assert.equal((await f.call('auth/password',{method:'POST',cookie:a.cookie,body:{currentPassword:password,newPassword:password+'changed'}})).status,200);
    assert.equal((await f.call('auth/recover',{method:'POST',body:{username:a.account.username,recoveryCode:a.recoveryCode,newPassword:password+'recovered'}})).status,200);
    assert.equal(overLimit,0);
  }finally{crypto.pbkdf2=original;syncBuiltinESMExports()}
});

test('capped legacy password records retain recovery-code access',async()=>{
  const f=fixture(),a=await register(f);
  f.db.prepare('UPDATE players SET password_record=? WHERE id=?').run(JSON.stringify({algorithm:'pbkdf2-sha256',iterations:600000,salt:'legacy',key:'0'.repeat(64)}),a.account.id);
  const original=crypto.pbkdf2;
  crypto.pbkdf2=(...args)=>{const e=new Error('iteration counts above 100000 are not supported');e.name='NotSupportedError';args.at(-1)(e)};syncBuiltinESMExports();
  try{
    const login=await f.call('auth/login',{method:'POST',body:{username:a.account.username,password}});
    assert.equal(login.status,503);assert.match((await login.json()).error,/恢复码/);
    assert.equal((await f.call('auth/recover',{method:'POST',body:{username:a.account.username,recoveryCode:a.recoveryCode,newPassword:password+'new'}})).status,200);
    assert.equal(JSON.parse(f.db.prepare('SELECT password_record FROM players').get().password_record).algorithm,'scrypt');
  }finally{crypto.pbkdf2=original;syncBuiltinESMExports()}
});
