from playwright.sync_api import sync_playwright
from pathlib import Path
import json
html=Path(__file__).resolve().parent.parent/'site'/'index.html'
res=[]
output_dir=Path(__file__).resolve().parent.parent/'artifacts'/'qa'
output_dir.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for mobile, w,h in [(False,1280,800),(True,390,844)]:
  ctx=browser.new_context(viewport={'width':w,'height':h},is_mobile=mobile,has_touch=mobile)
  page=ctx.new_page(); errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html.read_text(encoding='utf-8'),wait_until='domcontentloaded')
  tag='mobile' if mobile else 'desktop'
  res.append({'test':tag+'_login_visible','ok':page.locator('#authForm').is_visible()})
  res.append({'test':tag+'_cloud_config','ok':page.evaluate('window.PetalCloudStatus.configured()')})
  page.locator('#cloudModeBtn').click()
  res.append({'test':tag+'_cloud_form','ok':page.locator('#authName').get_attribute('type')=='email'})
  page.locator('#cloudModeBtn').click()
  page.locator('#guestBtn').click();page.wait_for_timeout(700)
  snap=page.evaluate('window.PetalRealmsInfo.snapshot()')
  res.append({'test':tag+'_guest','ok':bool(snap and snap.get('mobs',0)>0 and snap.get('petals',0)>=27 and snap.get('slots',0)==6),'detail':{k:snap.get(k) for k in ['zone','mobs','petals','slots']} if snap else None})
  page.screenshot(path=str(output_dir/(tag+'_QA.png')))
  res.append({'test':tag+'_errors','ok':len(errors)==0,'errors':errors})
  ctx.close()
 browser.close()
report={'checks':len(res),'passed':sum(x['ok'] for x in res),'results':res}
(output_dir/'browser_qa.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False,indent=2))
if report['passed']!=report['checks']: raise SystemExit(1)
