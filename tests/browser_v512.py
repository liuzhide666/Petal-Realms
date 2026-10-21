"""Controls, collection and responsive UI on an isolated synthetic account."""

from pathlib import Path
import re
_ASSET_ROOT=Path(__file__).resolve().parent.parent/'site'
def inline_assets(source):
    for asset in ['workshop','interface','rules','art']:
        source=re.sub(r'<script src="'+re.escape(asset)+r'\.js\?v=[^"]+"></script>',lambda _: '<script>'+(_ASSET_ROOT/(asset+'.js')).read_text()+'</script>',source)
    return source
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'artifacts/qa'
OUT.mkdir(parents=True, exist_ok=True)
HTML = (ROOT / 'site/index.html').read_text()
HTML=inline_assets(HTML)
checks = []

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path=os.environ.get('PETAL_CHROMIUM'), args=['--no-sandbox', '--disable-dev-shm-usage'])
    for label, width, height, mobile in [('desktop',1280,800,False), ('portrait',390,844,True), ('landscape',844,390,True), ('small',320,568,True), ('small_landscape',568,320,True), ('inset_portrait',390,844,True), ('inset_landscape',844,390,True)]:
        ctx = browser.new_context(viewport={'width':width,'height':height},has_touch=mobile,is_mobile=mobile,device_scale_factor=1)
        page = ctx.new_page()
        errors = []
        page.on('pageerror',lambda e:errors.append(str(e)))
        variant=HTML
        if label.startswith('inset_'):
            # Synthetic inset model checks CSS arithmetic; it is not hardware Safari evidence.
            insets={'top':47,'bottom':34,'left':0,'right':0} if label.endswith('portrait') else {'top':0,'bottom':21,'left':47,'right':47}
            for side, pixels in insets.items():
                variant=variant.replace(f'env(safe-area-inset-{side})',f'{pixels}px')
        page.route('https://petal-qa.invalid/**',lambda r:r.fulfill(status=200,content_type='text/html',body=variant))
        page.goto('https://petal-qa.invalid/')
        page.locator('#welcomeContinue').click()
        page.wait_for_function('!document.getElementById("authSubmit").disabled')
        def check(name, condition):
            checks.append({'viewport':label,'test':name,'passed':bool(condition)})
            assert condition, f'{label}: {name}'
        check('legacy_entry_collapsed',not page.locator('#cloudModeBtn').is_visible())
        check('input_stays_selectable_at_16px',page.locator('#authName').evaluate('(e)=>getComputedStyle(e).userSelect==="text" && parseFloat(getComputedStyle(e).fontSize)>=16'))
        check('controls_unselectable',page.locator('#authSubmit').evaluate('(e)=>getComputedStyle(e).userSelect==="none"'))
        page.locator('#localModeBtn').click()
        page.evaluate("""localStorage.setItem('petal_realms_save_controlqa',JSON.stringify({version:5,zone:'garden',p:{level:60,xp:0,kills:0,hp:1000},bag:{'rose@0':5},codex:{guardianGarden:{seen:true,kills:1,maxLevel:12}},slots:Array.from({length:10},()=>({t:'basic',r:0}))}))""")
        page.locator('#tabRegister').click()
        page.locator('#authName').fill('controlqa')
        page.locator('#authPass').fill('control-password-2026')
        page.locator('#authConfirm').fill('control-password-2026')
        page.locator('#authSubmit').click()
        page.wait_for_function('window.PetalRealmsInfo.snapshot()?.slots===10')
        page.locator('#bagBtn').click()
        page.locator('[data-equip="rose@0"]').click()
        if mobile:
            slot=page.locator('[data-slot="0"]')
            slot.scroll_into_view_if_needed()
            target=slot.bounding_box()
            point={'pointerId':31,'pointerType':'touch','clientX':target['x']+target['width']/2,'clientY':target['y']+target['height']/2}
            original=page.locator('#slots .slot').first.get_attribute('title')
            page.locator('[data-equip="rose@0"]').dispatch_event('pointerdown',{'pointerId':31,'pointerType':'touch','clientX':0,'clientY':0})
            page.dispatch_event('body','pointermove',point)
            page.dispatch_event('body','pointercancel',point)
            check('cancelled_inventory_drag_does_not_equip',page.locator('#slots .slot').first.get_attribute('title')==original)
            check('cancelled_drag_cleans_ghost',page.locator('.drag-ghost').count()==0)
            page.locator('[data-equip="rose@0"]').dispatch_event('pointerdown',{'pointerId':31,'pointerType':'touch','clientX':0,'clientY':0})
            page.dispatch_event('body','pointermove',point)
            page.dispatch_event('body','pointerup',point)
            check('completed_inventory_drag_equips', '玫瑰' in page.locator('#slots .slot').first.get_attribute('title'))
        page.locator('#trackPetal').click()
        check('goal_has_real_sources',page.locator('[data-goal-zone]').count()>0)
        page.locator('[data-goal-zone]').first.click()
        check('tracking_closes_panel',page.locator('#panelLayer').is_hidden())
        check('goal_matches_next_quality',page.evaluate('window.PetalRealmsInfo.snapshot().goal.r')==1)
        page.locator('#mapBtn').click()
        check('map_shows_goal_routes',page.locator('.collection-guide').count()==1 and page.locator('[data-goal-zone]').count()>0)
        page.locator('#panelClose').click()
        check('secondary_tools_collapsed',not page.locator('#codexBtn').is_visible() and page.locator('#toolsMenuBtn').get_attribute('aria-expanded')=='false')
        page.locator('#toolsMenuBtn').click()
        check('secondary_tools_expanded',page.locator('#codexBtn').is_visible() and page.locator('#toolsMenuBtn').get_attribute('aria-expanded')=='true')
        page.locator('#codexBtn').click()
        page.locator('[data-creature="guardianGarden"]').click()
        check('guardian_habitat_visible','出没地区：花园' in page.locator('.codex-detail').inner_text())
        page.locator('#codexGoalRank').select_option('1')
        page.locator('[data-track-drop="cactus"]').click()
        check('codex_drop_sets_goal',page.evaluate('window.PetalRealmsInfo.snapshot().goal.t')=='cactus')
        page.screenshot(path=str(OUT/f'v512_{label}_codex.png'))
        page.locator('#panelClose').click()
        page.wait_for_timeout(100)
        check('no_page_overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth && document.documentElement.scrollHeight<=innerHeight'))
        check('canvas_fills_viewport',page.locator('#game').evaluate('(e)=>Math.abs(e.clientWidth-innerWidth)<2 && Math.abs(e.clientHeight-innerHeight)<2'))
        def disjoint(a,b):
            return page.evaluate('''([a,b])=>{const x=document.querySelector(a).getBoundingClientRect(),y=document.querySelector(b).getBoundingClientRect();return x.right<=y.left||y.right<=x.left||x.bottom<=y.top||y.bottom<=x.top}''',[a,b])
        if mobile:
            page.screenshot(path=str(OUT/f'v512_{label}_layout.png'))
            check('inventory_touch_targets',page.locator('#slots .slot').first.evaluate('(e)=>e.getBoundingClientRect().width>=40'))
            check('touch_controls_above_inventory',disjoint('#joystick','#bottom') and disjoint('.action-buttons','#bottom'))
            check('actions_clear_side_menu',disjoint('.action-buttons','#sideBtns'))
            page.locator('#skillMenuBtn').tap()
            check('skill_tray_expands',page.locator('#skillDock').is_visible())
            check('skills_clear_inventory',disjoint('#skillDock','#bottom'))
            check('skill_tray_clear_of_controls',disjoint('#skillDock','.action-buttons') and disjoint('#skillDock','#joystick') and disjoint('#skillDock','#sideBtns'))
            page.screenshot(path=str(OUT/f'v512_{label}_skills.png'))
            page.locator('#skillMenuBtn').tap()
            page.locator('#touchAtk').dispatch_event('pointerdown',{'pointerId':21,'pointerType':'touch','button':0})
            page.wait_for_function('window.PetalRealmsInfo.snapshot().mode==="attack"')
            page.locator('#touchAtk').dispatch_event('pointercancel',{'pointerId':21,'pointerType':'touch'})
            page.wait_for_function('window.PetalRealmsInfo.snapshot().mode==="normal"')
            check('touch_cancel_releases_attack',True)
        else:
            check('desktop_skills_clear_inventory',disjoint('#skillDock','#bottom'))
            check('ten_slots_fit_one_row',page.evaluate('new Set([...document.querySelectorAll("#slots .slot")].map(e=>e.offsetTop)).size===1'))
            page.locator('#orbitBtn').click()
            direction=page.evaluate('window.PetalRealmsInfo.snapshot().orbitDirection')
            page.keyboard.down(' ')
            page.wait_for_function('window.PetalRealmsInfo.snapshot().mode==="attack"')
            page.keyboard.up(' ')
            check('mouse_hud_click_does_not_capture_space',page.evaluate('window.PetalRealmsInfo.snapshot().orbitDirection')==direction)
            page.keyboard.down('d')
            before=page.evaluate('window.PetalRealmsInfo.snapshot().position.x')
            page.wait_for_timeout(250)
            page.keyboard.up('d')
            after=page.evaluate('window.PetalRealmsInfo.snapshot().position.x')
            check('keyboard_moves_character',after>before+5)
            page.keyboard.down('Shift')
            page.wait_for_function('window.PetalRealmsInfo.snapshot().mode==="defend"')
            page.keyboard.press('Escape')
            page.keyboard.up('Shift')
            page.locator('#settingsFromPause').click()
            page.locator('#movementSelect').select_option('keyboard')
            page.locator('#panelClose').click()
            check('keyboard_preference_applied',page.evaluate('window.PetalRealmsInfo.snapshot().movement')=='keyboard')
            page.mouse.move(1000,400)
            before=page.evaluate('window.PetalRealmsInfo.snapshot().position.x')
            page.wait_for_timeout(200)
            check('keyboard_mode_ignores_mouse',abs(page.evaluate('window.PetalRealmsInfo.snapshot().position.x')-before)<1)
            page.keyboard.down(' ')
            page.wait_for_function('window.PetalRealmsInfo.snapshot().mode==="attack"')
            page.evaluate('window.dispatchEvent(new Event("blur"))')
            page.keyboard.up(' ')
            page.wait_for_function('window.PetalRealmsInfo.snapshot().mode==="normal"')
            check('blur_clears_attack',True)
        page.screenshot(path=str(OUT/f'v512_{label}_gameplay.png'))
        page.locator('#pauseBtn').click()
        page.locator('#manualSave').click()
        page.reload()
        page.locator('#welcomeContinue').click()
        page.wait_for_function('!document.getElementById("authSubmit").disabled')
        page.locator('#localModeBtn').click()
        page.locator('#authName').fill('controlqa');page.locator('#authPass').fill('control-password-2026');page.locator('#authSubmit').click()
        page.wait_for_function('window.PetalRealmsInfo.snapshot()?.goal?.r===1')
        check('goal_survives_save_and_login',True)
        check('no_runtime_errors',not errors)
        ctx.close()
    browser.close()
print(json.dumps(checks,ensure_ascii=False,indent=2))
print('PASSED',len(checks),'/',len(checks))
