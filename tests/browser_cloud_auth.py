import os
from playwright.sync_api import sync_playwright
from pathlib import Path
import json
html=Path(__file__).resolve().parent.parent/'site/index.html'
results=[];database={'revision':1,'payload':{'version':5,'zone':'garden','p':{'level':9,'xp':10,'kills':4,'hp':100},'bag':{'basic@0':5},'slots':[{'t':'basic','r':0}]*7}}
uid='cc901c93-aaaa-4aa4-bbbb-2389d1e34a7a'
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path=os.environ.get('PETAL_CHROMIUM'),args=['--no-sandbox','--disable-dev-shm-usage'])
 context=browser.new_context(viewport={'width':1200,'height':760});page=context.new_page();errs=[]
 page.on('pageerror',lambda e:errs.append(str(e)))
 def handle(route):
  req=route.request
  headers={'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,PATCH,OPTIONS','access-control-allow-headers':'apikey,authorization,content-type,prefer','content-type':'application/json'}
  if req.method=='OPTIONS':return route.fulfill(status=200,headers=headers,body='{}')
  url=req.url
  if '/auth/v1/user' in url and req.method=='GET':
   content={'id':uid,'email':'qa@example.invalid'}
  elif '/auth/v1/token?grant_type=password' in url:
   content={'access_token':'testing-access','refresh_token':'testing-refresh','user':{'id':uid},'expires_in':3600}
  elif '/rest/v1/petal_realms_saves' in url and req.method=='GET':
   content=[database]
  elif '/rest/v1/petal_realms_saves' in url and req.method=='PATCH':
   data=req.post_data_json
   if str(database['revision']) in url:
    database.update(data);content=[{'revision':database['revision']}]
   else: content=[]
  else: content={'error':'unhandled '+url}
  route.fulfill(status=200,headers=headers,body=json.dumps(content))
 page.route('https://bfipozjqhzsbdvmisoct.supabase.co/**',handle)
 page.evaluate('''() => {const m=new Map();Object.defineProperty(window, 'localStorage', {value:{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>Array.from(m.keys())[i]||null,get length(){return m.size}},configurable:true});}''')
 page.set_content(html.read_text(),wait_until='domcontentloaded')
 page.locator('#legacyAccounts').evaluate('(e)=>e.open=true');page.locator('#cloudModeBtn').click()
 page.locator('#authName').fill('qa@example.invalid')
 page.locator('#authPass').fill('temporary-mock-password')
 page.locator('#authSubmit').click()
 page.wait_for_timeout(1300)
 snap=page.evaluate('window.PetalRealmsInfo.snapshot()');
 results.append({'name':'mock_cloud_form_opens_saved_game','ok':bool(snap and snap['level']==9),'details':snap and {'level':snap['level'],'slots':snap['slots']}})
 results.append({'name':'mock_cloud_auth_active','ok':page.evaluate('window.PetalCloudStatus.isCloudLogin()')})
 # Logout then emulate a pending offline snapshot whose base revision has not changed.
 page.evaluate("document.getElementById('logoutBtn').click()");page.wait_for_timeout(200)
 page.evaluate('''(v) => { const u=v.uid; const snap={version:5,zone:'garden',p:{level:16,xp:10,kills:4,hp:100},bag:{'basic@0':5},slots:Array(8).fill({t:'basic',r:0})};localStorage.setItem('petal_realms_cloud_outbox_'+u,JSON.stringify({format:1,baseRevision:v.base,snapshot:snap,time:new Date().toISOString()}));localStorage.setItem('petal_realms_cloud_pending_'+u,'1');}''',{'uid':uid,'base':database['revision']})
 page.locator('#authPass').fill('temporary-mock-password');page.locator('#authSubmit').click();page.wait_for_timeout(1400)
 s2=page.evaluate('window.PetalRealmsInfo.snapshot()')
 results.append({'name':'pending_outbox_resume_on_equal_baseline','ok':bool(s2 and s2['level']==16),'level':s2 and s2['level']})
 results.append({'name':'replayed_outbox_cleared','ok':page.evaluate('''u => localStorage.getItem('petal_realms_cloud_outbox_'+u)===null''',uid)})
 # Remote version is now 2; emulating a stale base revision must not overwrite.
 page.evaluate("document.getElementById('logoutBtn').click()");page.wait_for_timeout(200)
 page.evaluate('''(u) => { const snap={version:5,zone:'garden',p:{level:99,xp:10,kills:4,hp:100}};localStorage.setItem('petal_realms_cloud_outbox_'+u,JSON.stringify({format:1,baseRevision:1,snapshot:snap,time:new Date().toISOString()}));localStorage.setItem('petal_realms_cloud_pending_'+u,'1');}''',uid)
 page.locator('#authPass').fill('temporary-mock-password');page.locator('#authSubmit').click();page.wait_for_timeout(400)
 results.append({'name':'stale_outbox_denied','ok':not page.evaluate('window.PetalCloudStatus.isCloudLogin()') and '基线' in page.locator('#authError').inner_text()})
 results.append({'name':'stale_outbox_preserved','ok':page.evaluate('''u => localStorage.getItem('petal_realms_cloud_outbox_'+u)!==null''',uid)})
 results.append({'name':'mock_cloud_ui_no_runtime_error','ok':not errs,'errors':errs})
 browser.close()
print(json.dumps(results,ensure_ascii=False,indent=2))
if not all(x['ok'] for x in results):raise SystemExit(1)
