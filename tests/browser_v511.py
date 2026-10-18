"""Real local workerd + D1 acceptance. Never run this against production."""
import json
import os
import subprocess
import time
import tempfile
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'artifacts/qa'
OUT.mkdir(parents=True,exist_ok=True)
BASE='http://127.0.0.1:8792'
checks=[]
def api(page,path,method='GET',body=None):
    return page.evaluate("""async ({path,method,body})=>{const r=await fetch('/api/'+path,{method,credentials:'same-origin',headers:{'Content-Type':'application/json',...(window.PetalAccountStatus.accountId()?{'X-Petal-Account':window.PetalAccountStatus.accountId()}:{})},body:body===null?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json()}}""",{'path':path,'method':method,'body':body})
def check(name,condition):
    checks.append({'test':name,'passed':bool(condition)})
    assert condition,name

log=(OUT/'v511_workerd.log').open('w')
state=tempfile.TemporaryDirectory(prefix='petal-v511-')
subprocess.run(['node','node_modules/wrangler/bin/wrangler.js','d1','migrations','apply','PETAL_DB','--local','--persist-to',state.name],cwd=ROOT,stdout=log,stderr=log,check=True)
server=subprocess.Popen(['node','node_modules/wrangler/bin/wrangler.js','pages','dev','site','--ip','127.0.0.1','--port','8792','--inspector-port','0','--persist-to',state.name],cwd=ROOT,stdout=log,stderr=log)
try:
    for attempt in range(150):
        try:
            urllib.request.urlopen(BASE+'/api/session',timeout=1).close()
            break
        except Exception:
            if server.poll() is not None: raise RuntimeError('workerd failed; see artifacts/qa/v511_workerd.log')
            time.sleep(.2)
    else: raise RuntimeError('workerd did not become ready')
    with urllib.request.urlopen(BASE+'/api/health',timeout=10) as response:
        health=json.load(response)
    check('health_checks_native_password_runtime',health.get('ok') is True and health.get('passwordHash')=='scrypt')
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,executable_path=os.environ.get('PETAL_CHROMIUM'),args=['--no-sandbox','--disable-dev-shm-usage'])
        desktop=browser.new_context(viewport={'width':1280,'height':800},accept_downloads=True)
        page=desktop.new_page()
        errors=[]; mail=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('request',lambda r:mail.append(r.url) if 'supabase.co' in r.url else None)
        page.goto(BASE)
        page.wait_for_function('!document.getElementById("authSubmit").disabled')
        check('default_is_cloudflare_account','继续你的冒险' in page.locator('#authHeading').inner_text())
        stamp=str(time.time_ns())[-12:]
        user='cf'+stamp+'@example.com'; password='runtime-password-2026'
        page.locator('#tabRegister').click()
        page.locator('#authName').fill(user);page.locator('#authPass').fill(password);page.locator('#authConfirm').fill(password)
        page.locator('#authSubmit').click()
        page.locator('#cfRecoveryCard').wait_for()
        recovery=page.locator('#cfRecoveryValue').input_value()
        check('recovery_code_provided_once',len(recovery)==64)
        page.wait_for_function('window.PetalRealmsInfo.snapshot() !== null')
        with page.expect_download() as download:
            page.locator('#cfDownloadRecovery').click()
        secret=json.loads(Path(download.value.path()).read_text())
        check('recovery_download_has_no_password',secret['recoveryCode']==recovery and password not in json.dumps(secret))
        page.locator('#cfCloseRecovery').click()
        page.wait_for_function('document.getElementById("saveText").textContent.includes("已同步")')
        check('signup_really_saves_to_d1',True)
        check('secure_httponly_session',all(c['httpOnly'] and c['secure'] and c['sameSite']=='Strict' for c in desktop.cookies() if c['name']=='__Host-petal_session'))
        check('no_auth_token_in_localstorage',not page.evaluate('Object.values(localStorage).some(v=>v.includes("__Host-petal_session"))'))
        page.locator('#orbitBtn').click()
        check('orbit_button_reverses_live_petals',page.evaluate('window.PetalRealmsInfo.snapshot().orbitDirection')==-1)
        page.keyboard.press('h')
        check('orbit_keyboard_reverses_live_petals',page.evaluate('window.PetalRealmsInfo.snapshot().orbitDirection')==1)
        page.keyboard.down('Shift')
        page.wait_for_function('document.getElementById("modeTag").textContent.includes("修复")')
        check('guard_repair_stance_visible',True)
        page.keyboard.up('Shift')
        page.keyboard.press('r')
        page.wait_for_function('document.querySelector(".slot-state").textContent.includes("s")')
        check('swapping_loadout_shows_reload_countdowns',page.evaluate('window.PetalRealmsInfo.snapshot().petalState.every(p=>p.cd>0)'))
        page.screenshot(path=str(OUT/'v511_combat_reload.png'))
        page.wait_for_function('window.PetalRealmsInfo.snapshot().petalState.every(p=>p.cd<=0)')
        page.wait_for_function('!document.querySelector(".slot.reloading")')
        check('petals_return_after_reload',not page.locator('.slot.reloading').count())
        page.evaluate('document.getElementById("pauseBtn").click()')
        check('cloud_controls_reachable',page.locator('#cfSaveNow').count()==1 and page.locator('#cfPasswordForm').count()==1)
        with page.expect_download() as download:
            page.locator('#cfExportProgress').click()
        progress=json.loads(Path(download.value.path()).read_text())
        progress['payload']['p']['level']=7
        page.once('dialog',lambda d:d.accept())
        page.locator('#cfImportProgress').set_input_files({'name':'progress.json','mimeType':'application/json','buffer':json.dumps(progress).encode()})
        page.wait_for_function('window.PetalRealmsInfo.snapshot().level===7')
        page.wait_for_function('document.getElementById("saveText").textContent.includes("已同步")')
        check('import_is_uploaded_with_revision',True)
        page.evaluate('document.getElementById("pauseBtn").click()')
        page.screenshot(path=str(OUT/'v511_desktop_cloud_account.png'))

        mobile=browser.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True)
        second=mobile.new_page();second.on('pageerror',lambda e:errors.append(str(e)))
        second.goto(BASE);second.wait_for_function('!document.getElementById("authSubmit").disabled')
        second.locator('#authName').fill(user);second.locator('#authPass').fill(password);second.locator('#authSubmit').click()
        second.wait_for_function('window.PetalRealmsInfo.snapshot()?.level===7')
        second.evaluate('document.getElementById("pauseBtn").click()')
        second.wait_for_function('document.getElementById("saveText").textContent.includes("已同步")')
        check('independent_device_reads_same_cloud_character',True)
        second.screenshot(path=str(OUT/'v511_mobile_cloud_account.png'))
        second.locator('#panelClose').click()
        second.locator('#orbitBtn').click()
        check('mobile_orbit_control_is_reachable',second.evaluate('window.PetalRealmsInfo.snapshot().orbitDirection')==-1)
        check('mobile_slots_do_not_overlap_combat_buttons',second.evaluate('''()=>{
          const a=document.querySelector('#slots').getBoundingClientRect();
          return Array.from(document.querySelectorAll('.action-button')).every(e=>{const b=e.getBoundingClientRect();return a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top});
        }'''))
        second.screenshot(path=str(OUT/'v511_mobile_combat.png'))
        second.locator('#pauseBtn').click()
        remote=api(second,'save')['data'];remote['payload']['p']['level']=14
        response=api(second,'save','PUT',{'expectedRevision':remote['revision'],'payload':remote['payload']})
        check('second_device_update',response['status']==200)
        page.locator('#cfSaveNow').click()
        page.wait_for_function('document.getElementById("saveText").textContent.includes("冲突")')
        check('stale_device_cannot_overwrite_new_revision',api(second,'save')['data']['payload']['p']['level']==14)
        page.evaluate('document.getElementById("leaveBtn").click()')
        page.locator('#gate').wait_for(state='visible')
        page.locator('#authName').fill(user);page.locator('#authPass').fill(password);page.locator('#authSubmit').click()
        page.wait_for_function('document.getElementById("authError").textContent.includes("另一设备")')
        check('conflict_survives_logout_and_login',page.locator('#gate').is_visible())
        page.locator('#cfPendingControls').evaluate('(e)=>e.open=true')
        page.once('dialog',lambda d:d.accept())
        with page.expect_download(): page.locator('#cfUseCloud').click()
        page.wait_for_function('window.PetalRealmsInfo.snapshot()?.level===14')
        check('explicit_cloud_resolution_works',True)
        page.evaluate('document.getElementById("pauseBtn").click()')
        page.locator('#cfOldPassword').fill(password);page.locator('#cfNewPassword').fill(password+'new');page.locator('#cfConfirmPassword').fill(password+'new')
        page.locator('#cfPasswordForm button').click()
        page.wait_for_function('document.getElementById("cfPasswordStatus").textContent.includes("已更新")')
        check('password_change_revokes_other_device',api(second,'session')['data']['account'] is None)
        page.evaluate('document.getElementById("leaveBtn").click()');page.locator('#gate').wait_for(state='visible')
        page.locator('#cfRecoverBtn').click()
        page.locator('#cfRecoverName').fill(user);page.locator('#cfRecoverCode').fill(recovery)
        page.locator('#cfRecoverPassword').fill(password+'restored');page.locator('#cfRecoverConfirm').fill(password+'restored')
        page.locator('#cfRecoverCode').fill('0'*64)
        page.locator('#cfRecoverForm [type=submit]').click()
        page.wait_for_function('document.getElementById("cfRecoverError").textContent.length>0')
        check('invalid_recovery_error_visible',page.locator('#cfRecoverError').is_visible())
        page.locator('#cfRecoverCode').fill(recovery)
        page.locator('#cfRecoverForm [type=submit]').click()
        page.locator('#cfRecoveryCard').wait_for();page.wait_for_function('window.PetalRealmsInfo.snapshot()?.level===14')
        check('recovery_works_without_mail',page.locator('#cfRecoveryValue').input_value()!=recovery)
        page.locator('#cfCloseRecovery').click()
        page.evaluate('document.getElementById("pauseBtn").click()')
        page.evaluate('document.getElementById("leaveBtn").click()');page.locator('#gate').wait_for(state='visible')

        # Real legacy local login, then explicit migration into an empty D1 account.
        page.locator('#localModeBtn').click();page.locator('#tabRegister').click()
        page.locator('#authName').fill('local'+stamp[-8:]);page.locator('#authPass').fill(password);page.locator('#authConfirm').fill(password);page.locator('#authSubmit').click()
        page.wait_for_function('window.PetalRealmsInfo.snapshot() !== null')
        page.evaluate('document.getElementById("pauseBtn").click()')
        page.locator('#cfMigrateName').fill('migrate'+stamp[-8:]+'@example.com');page.locator('#cfMigratePassword').fill(password);page.locator('#cfMigrateConfirm').fill(password)
        page.once('dialog',lambda d:d.accept());page.locator('#cfMigrateForm button').click()
        page.locator('#cfRecoveryCard').wait_for()
        page.wait_for_function('document.getElementById("saveText").textContent.includes("已同步")')
        page.locator('#cfCloseRecovery').click()
        check('legacy_local_record_preserved',page.evaluate('Object.keys(JSON.parse(localStorage.getItem("petal_realms_accounts_v1"))).some(k=>k.startsWith("local"))'))
        check('local_migration_created_cloud_save',api(page,'save')['data']['payload']['p']['level']==1)
        duplicate=desktop.new_page();duplicate.goto(BASE)
        duplicate.wait_for_function('!document.getElementById("authSubmit").disabled')
        check('same_browser_second_tab_cannot_become_another_writer','标签页' in duplicate.locator('#authError').inner_text() and duplicate.evaluate('window.PetalRealmsInfo.snapshot()') is None)
        duplicate.close()
        check('normal_account_and_local_migration_send_no_mail',not mail)
        check('no_browser_runtime_errors',not errors)
        desktop.close();mobile.close();browser.close()
    print(json.dumps(checks,ensure_ascii=False,indent=2))
    print('PASSED',len(checks),'/',len(checks))
finally:
    server.terminate()
    try: server.wait(timeout=10)
    except subprocess.TimeoutExpired: server.kill();server.wait()
    log.close()
    state.cleanup()
    (OUT/'v511_runtime_results.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2))
