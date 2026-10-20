"""V5.14 real asset loading, numerical UI, transient reset and synthetic biome review."""
from pathlib import Path
import os,json,threading,http.server,functools
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent;OUT=ROOT/'artifacts/qa';OUT.mkdir(parents=True,exist_ok=True)
html=(ROOT/'site/index.html').read_text()
probe=r'''
window.__standardQA={start(){game.user='QA';game.guest=true;initGame(null);game.paused=true;},fixture(){game.bags['basic@0']=12;game.bags['prism@0']=5;game.bags['frost@0']=5;craftSelect='basic@0';if(modal==='craft')renderModal();},open(id){openPanel(id)},snapshot(){return {time:game.time,nextEvent:game.nextEventAt,nextSpawn:game.nextSpawn,seed:game.random.snapshot(),pets:Object.keys(pets).length,entities:game.mapData[game.zone].living.length}},reset(){game.p.venomUntil=game.time+100;game.skills.dash=99;transition('ocean');const region=game.p.venomUntil===0&&game.skills.dash===99;game.p.venomUntil=99;$('respawnBtn').click();return region&&game.p.venomUntil===0&&game.skills.dash===99},scene(id){game.zone=id;game.settings.quality='high';game.time=3.2;const map=game.mapData[id],l=map.landmarks[0];game.p.x=l.x;game.p.y=l.y;game.camera.x=l.x-game.width/game.zoom/2;game.camera.y=l.y-game.height/game.zoom/2;syncHud(true);minimap();drawWorld();},rng(){const before=game.random.snapshot().counts;for(let i=0;i<5;i++)drawWorld();const after=game.random.snapshot().counts;return ['world','loot','craft','combat'].every(k=>before[k]===after[k])},craft(){const a=globalThis.PetalRules.craftAnalysis(.64,12,5);return {q95:a.q95,success:a.success,outputs:a.outputs}},restart(){game.time=1000;initGame(null);game.paused=true;return game.time===0&&game.nextEventAt>=65&&game.nextEventAt<110},frostMotion(){const map=game.mapData[game.zone],p=game.p,old={rocks:map.rocks,portals:map.portals,living:map.living,x:p.x,y:p.y};p.x=1000;p.y=1000;map.rocks=[];map.portals=[];game.equipped=[];game.nextSpawn=999;const trial=chill=>{const m={id:999,t:'ant',x:1210,y:1000,r:16,level:1,rank:0,hp:10000,max:10000,dmg:8,speed:100,turn:10,shoot:10,hit:0,calmed:0,specialAt:999,stunUntil:0,chargeFor:0,poisonTime:0,frostUntil:chill?game.time+5:0,frostFactor:.88};map.living=[m];game.paused=false;update(1/60);game.paused=true;return 1210-m.x};const normal=trial(false),cold=trial(true);map.rocks=old.rocks;map.portals=old.portals;map.living=old.living;p.x=old.x;p.y=old.y;resetEquip();return Math.abs(cold/normal-.88)<1e-8},combat(){const old=game.random;game.random={...old,combat:()=>0};game.equipped=[{t:'prism',hp:1,cd:0},{t:'frost',hp:1,cd:0}];const result=criticalMultiplier()===1.6&&activeCopies('frost')===1;game.random=old;resetEquip();return result}};
'''
html=html.replace('requestAnimationFrame(loop);','').replace('})();',probe+'\n})();')
class Handler(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_GET(self):
  if self.path=='/':
   data=html.encode();self.send_response(200);self.send_header('Content-Type','text/html;charset=utf-8');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
  elif self.path.startswith('/api/'):
   self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(b'{"account":null}')
  else:super().do_GET()
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT/'site')));threading.Thread(target=server.serve_forever,daemon=True).start();checks=[]
def check(name,value):
 assert value,name;checks.append(name)
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=os.environ.get('PETAL_CHROMIUM'),args=['--no-sandbox','--disable-dev-shm-usage'])
 for label,w,h,mobile in [('desktop',1280,800,False),('phone',390,844,True),('landscape',844,390,True),('small',320,568,True)]:
  page=b.new_page(viewport={'width':w,'height':h},is_mobile=mobile,has_touch=mobile,device_scale_factor=1);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(f'http://127.0.0.1:{server.server_port}/');page.wait_for_function('window.__standardQA');page.evaluate('window.__standardQA.start()');check(label+' new petal domain',page.evaluate('window.__standardQA.snapshot().pets')==29)
  check(label+' world timer restart',page.evaluate('window.__standardQA.restart()'));check(label+' transient state clear',page.evaluate('window.__standardQA.reset()'));check(label+' critical runtime',page.evaluate('window.__standardQA.combat()'));check(label+' frost movement runtime',page.evaluate('window.__standardQA.frostMotion()'))
  page.evaluate('window.__standardQA.open("craft");window.__standardQA.fixture()');check(label+' analysis panel',page.locator('#craftProbability').is_visible());check(label+' 95 percent budget', '12 张' in page.locator('#craftProbability').inner_text());check(label+' no page overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
  page.screenshot(path=str(OUT/f'v514_{label}_craft.png'))
  page.locator('#panelClose').click();page.evaluate('window.__standardQA.open("probability")');check(label+' reward lab',page.locator('#panelBody').inner_text().find('协方差')>=0);page.screenshot(path=str(OUT/f'v514_{label}_lab.png'));page.locator('#panelClose').click()
  check(label+' render RNG isolation',page.evaluate('window.__standardQA.rng()'))
  if not mobile:
   for zone in ['garden','ocean','desert','jungle','hel','ant','sewer','factory']:
    page.evaluate('(z)=>window.__standardQA.scene(z)',zone);page.screenshot(path=str(OUT/f'v514_biome_{zone}.png'))
   page.emulate_media(reduced_motion='reduce');check('reduced motion render',page.evaluate('window.__standardQA.rng()'))
  check(label+' no runtime errors',not errors);page.close()
 b.close()
server.shutdown();(OUT/'v514_browser.json').write_text(json.dumps({'passed':len(checks),'checks':checks},indent=2)+'\n');print(json.dumps({'passed':len(checks)}))
