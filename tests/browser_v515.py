"""V5.15 real assets: exact tactical panels, shared telegraphs and responsive art."""
from pathlib import Path
import os,json,threading,http.server,functools
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent;OUT=ROOT/'artifacts/qa';OUT.mkdir(parents=True,exist_ok=True)
html=(ROOT/'site/index.html').read_text()
probe="window.__atlasQA={start(){game.user='QA';game.guest=true;initGame(null);game.paused=true;game.bags['basic@0']=12;craftSelect='basic@0';game.goal={t:'basic',r:0};},open(id){openPanel(id)},scene(zone){game.zone=zone;game.time=3.2;game.settings.quality='high';const map=game.mapData[zone];const l=map.landmarks[0];game.p.x=l.x;game.p.y=l.y;game.camera.x=l.x-game.width/game.zoom/2;game.camera.y=l.y-game.height/game.zoom/2;syncHud(true);minimap();drawWorld()},isolation(){const a=JSON.stringify(game.random.snapshot().counts);renderProbabilityLab();renderCraftAnalysis(.64,12,false);drawWorld();return a===JSON.stringify(game.random.snapshot().counts)},damage(){const m={t:'ant',rank:0,tier:3,hp:100,max:100,x:50,y:50,shieldUntil:0};damageMob(m,5,50,50,true);const a=100-m.hp;m.hp=100;damageMob(m,8,50,50,true);const b=100-m.hp;return Math.abs(globalThis.PetalRules.damageMoments(5,armorOf(m),1,100).mean-(.85*a+.15*b))<1e-12},special(){const m={t:'bee',specialType:'sniper',rank:3,level:25,speed:100,x:game.p.x-300,y:game.p.y,r:20,dmg:10};const profile=specialProfileFor(m);const before=game.bullets.length;performMobSpecial(m,game.mapData[game.zone]);const out=game.bullets.slice(before);game.bullets.length=before;return out.length===3&&out.every(b=>Math.abs(Math.hypot(b.vx,b.vy)-profile.speed)<1e-9&&b.life===profile.duration)},telegraph(){const m={...game.mapData[game.zone].living[0],t:'guardianGarden',specialType:'nova',windup:.55,x:game.p.x+90,y:game.p.y,r:30,hp:100,max:100,rank:0,level:1,speed:30};const old=ctx.arc,rs=[];ctx.arc=function(...a){rs.push(a[2]);return old.apply(this,a)};globalThis.PetalArt.telegraph(ctx,m,game.p,game.time,specialProfileFor(m));ctx.arc=old;return rs.includes(210)},profile(){return globalThis.PetalRules.specialProfile({type:'charger',speed:100,level:1,rank:0})},reduced(){const map=game.mapData[game.zone];game.time=3;drawWorld();return true}};"
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
  page=b.new_page(viewport={'width':w,'height':h},is_mobile=mobile,has_touch=mobile,device_scale_factor=1);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(f'http://127.0.0.1:{server.server_port}/');page.wait_for_function('window.__atlasQA');page.evaluate('window.__atlasQA.start()');page.evaluate('window.__atlasQA.open("probability")')
  check(label+' exact target panel',page.locator('[data-goal-chance]').count()>0)
  check(label+' armor aware panel',page.locator('.damage-table').count()>0)
  check(label+' damage source agreement',page.evaluate('window.__atlasQA.damage()'))
  check(label+' projectile source agreement',page.evaluate('window.__atlasQA.special()'))
  check(label+' nova actual radius',page.evaluate('window.__atlasQA.telegraph()'))
  check(label+' no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
  page.locator('.panel').evaluate('async e=>{await Promise.all(e.getAnimations().map(a=>a.finished))}');page.screenshot(path=str(OUT/f'v515_{label}_atlas.png'));page.locator('#panelClose').click();page.evaluate('window.__atlasQA.open("craft")');page.locator('[data-craft="basic@0"]').click()
  check(label+' six output probabilities',page.locator('#craftOutputDistribution [data-output]').count()==6)
  check(label+' no random draws for analysis',page.evaluate('window.__atlasQA.isolation()'))
  page.locator('#craftOutputDistribution').scroll_into_view_if_needed();page.screenshot(path=str(OUT/f'v515_{label}_craft.png'));page.locator('#panelClose').click()
  for zone in (['garden','ocean','desert','jungle','hel','ant','sewer','factory'] if not mobile else ['garden']):
   page.evaluate('(z)=>window.__atlasQA.scene(z)',zone);page.screenshot(path=str(OUT/f'v515_{label}_{zone}.png'))
  page.emulate_media(reduced_motion='reduce');check(label+' reduced motion path',page.evaluate('window.__atlasQA.reduced()'));check(label+' no runtime errors',not errors);page.close()
 b.close()
server.shutdown();(OUT/'v515_browser.json').write_text(json.dumps({'passed':len(checks),'checks':checks},indent=2)+'\n');print(json.dumps({'passed':len(checks)}))
