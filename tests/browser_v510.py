
from pathlib import Path
_ASSET_ROOT=Path(__file__).resolve().parent.parent/'site'
def inline_assets(source):
    for asset in ['rules','art']:
        source=source.replace('<script src="'+asset+'.js?v=5.14.0"></script>','<script>'+(_ASSET_ROOT/(asset+'.js')).read_text()+'</script>')
    return source
import os
"""Isolated HTTPS-origin account/backup/workbench acceptance; never creates live users."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright

HTML = (Path(__file__).resolve().parent.parent / 'site/index.html').read_text()
HTML=inline_assets(HTML)
OUT = Path('artifacts/qa')
OUT.mkdir(parents=True, exist_ok=True)
checks = []
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path=os.environ.get('PETAL_CHROMIUM'), args=['--no-sandbox', '--disable-dev-shm-usage'])
    for label, viewport in [('desktop', {'width': 1280, 'height': 800}), ('mobile', {'width': 390, 'height': 844})]:
        ctx = browser.new_context(viewport=viewport, has_touch=label == 'mobile', is_mobile=label == 'mobile')
        page = ctx.new_page()
        errors, network = [], []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.route('https://petal-qa.invalid/**', lambda r: r.fulfill(status=200, content_type='text/html', body=HTML))

        def auth_route(route):
            network.append(route.request.url)
            headers = {'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': 'Retry-After'}
            if route.request.method == 'OPTIONS':
                return route.fulfill(status=200, headers=headers, body='{}')
            if '/auth/v1/settings' in route.request.url:
                return route.fulfill(status=200, headers=headers, json={'autoconfirm': False})
            return route.fulfill(status=429, headers={**headers, 'Retry-After': '180'}, json={'code': 'over_email_send_rate_limit', 'msg': 'Email rate limit exceeded'})

        page.route('https://*.supabase.co/**', auth_route)
        page.goto('https://petal-qa.invalid/')
        page.wait_for_function('!document.getElementById("authSubmit").disabled')
        page.locator('#localModeBtn').click()
        def check(name, value):
            checks.append({'viewport': label, 'test': name, 'passed': bool(value)})
            assert value, f'{label}: {name}'

        check('default_password_account', page.locator('#authName').get_attribute('type') == 'text')
        page.locator('#tabRegister').click()
        page.locator('#authName').fill('petaltest')
        page.locator('#authPass').fill('petal-pass-2026')
        page.locator('#authConfirm').fill('petal-pass-2026')
        page.locator('#authSubmit').click()
        page.wait_for_function('window.PetalRealmsInfo.snapshot() !== null')
        check('local_signup_without_any_email_request', len(network) == 0)
        # Use pause-save before reload so the persistence check is independent of autosave timing.
        page.evaluate("document.getElementById('pauseBtn').click()")
        page.locator('#manualSave').click()
        check('backup_controls_for_local_character', page.locator('#exportLocalSave').count() == 1)
        page.reload()
        page.wait_for_function('!document.getElementById("authSubmit").disabled')
        page.locator('#localModeBtn').click()
        page.locator('#authName').fill('petaltest')
        page.locator('#authPass').fill('petal-pass-2026')
        page.locator('#authSubmit').click()
        page.wait_for_function('window.PetalRealmsInfo.snapshot() !== null')
        check('password_login_after_reload', page.evaluate('window.PetalRealmsInfo.snapshot().level') == 1)
        page.screenshot(path=str(OUT / f'v510_{label}_gameplay.png'))
        page.evaluate("document.getElementById('bagBtn').click()")
        page.locator('[data-equip="rose@0"]').click()
        check('preview_before_equipping', '玫瑰' in page.locator('#petalWorkbench').inner_text())
        page.locator('#protectPreview').click()
        check('protected_material_visible', '材料已保护' in page.locator('#petalWorkbench').inner_text())
        page.locator('#equipPreview').click()
        check('confirmed_equip', '玫瑰' in page.locator('#slots .slot').first.get_attribute('title'))
        page.locator('#panelBody').evaluate('(el) => el.scrollTop = 0')
        page.screenshot(path=str(OUT / f'v510_{label}_workbench.png'))
        page.locator('#craftPreview').click()
        check('locked_recipe_cannot_craft', page.locator('#doCraft').is_disabled() and page.locator('#batchCraft').is_disabled())
        page.locator('#panelClose').click()
        page.evaluate("document.getElementById('pauseBtn').click()")
        with page.expect_download() as downloaded:
            page.locator('#exportLocalSave').click()
        download = downloaded.value
        exported = Path(download.path()).read_text()
        data = json.loads(exported)
        check('export_has_progress_without_password', data['payload']['p']['level'] == 1 and 'petal-pass-2026' not in exported)
        data['payload']['p']['level'] = 9
        page.once('dialog', lambda d: d.accept())
        page.locator('#importLocalSave').set_input_files({'name': 'backup.json', 'mimeType': 'application/json', 'buffer': json.dumps(data).encode()})
        page.wait_for_function('window.PetalRealmsInfo.snapshot().level === 9')
        check('backup_import_applied', True)
        page.evaluate("document.getElementById('pauseBtn').click()")
        page.once('dialog', lambda d: d.accept())
        page.locator('#restoreLocalSave').click()
        check('import_can_be_rolled_back', page.evaluate('window.PetalRealmsInfo.snapshot().level') == 1)
        page.evaluate("document.getElementById('logoutBtn').click()")
        page.locator('#legacyAccounts').evaluate('(e)=>e.open=true');page.locator('#cloudModeBtn').click()
        page.locator('#tabRegister').click()
        page.locator('#authName').fill('qa@example.invalid')
        page.locator('#authPass').fill('petal-pass-2026')
        page.locator('#authConfirm').fill('petal-pass-2026')
        page.locator('#authSubmit').click()
        page.wait_for_function("!document.getElementById('localFallbackBtn').classList.contains('hidden')")
        check('rate_limit_has_countdown_and_local_entry', page.locator('#authSubmit').is_disabled() and bool(page.locator('#mailCooldown').inner_text()))
        sent = len([u for u in network if '/signup?' in u])
        page.locator('#tabLogin').click()
        check('mail_cooldown_does_not_disable_password_login', page.locator('#authSubmit').is_enabled())
        page.locator('#tabRegister').click()
        check('repeat_mail_submission_is_blocked', page.locator('#authSubmit').is_disabled() and len([u for u in network if '/signup?' in u]) == sent)
        page.screenshot(path=str(OUT / f'v510_{label}_mail_limit.png'))
        page.locator('#localFallbackBtn').click()
        check('fallback_requires_independent_username_and_password', page.locator('#authName').get_attribute('type') == 'text' and page.locator('#authPass').input_value() == '' and page.evaluate('window.PetalCloudStatus.isCloudLogin()') is False and page.locator('#authSubmit').is_enabled())
        check('no_runtime_errors', not errors)
        ctx.close()
    browser.close()
print(json.dumps(checks, ensure_ascii=False, indent=2))
print('PASSED', sum(x['passed'] for x in checks), '/', len(checks))
