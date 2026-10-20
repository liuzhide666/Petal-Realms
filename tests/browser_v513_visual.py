"""Synthetic render gallery, RNG isolation and geometry invariants; no live accounts."""

from pathlib import Path
import re
_ASSET_ROOT=Path(__file__).resolve().parent.parent/'site'
def inline_assets(source):
    for asset in ['rules','art']:
        source=re.sub(r'<script src="'+re.escape(asset)+r'\.js\?v=[^"]+"></script>',lambda _: '<script>'+(_ASSET_ROOT/(asset+'.js')).read_text()+'</script>',source)
    return source
import json,os,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'artifacts/qa';OUT.mkdir(parents=True,exist_ok=True)
html=(ROOT/'site/index.html').read_text()
baseline=subprocess.check_output(['git','show','385d3fb72b7a9959a6e5b57702f6fe56c68f6921:site/index.html'],cwd=ROOT,text=True)
for a,b in [('function mobCollider(','function mobSupportRadius(')]:
 assert html[html.index(a):html.index(b,html.index(a))]==baseline[baseline.index(a):baseline.index(b,baseline.index(a))],a+' changed in a visual release'
probe=r'''
window.__visualQA=(page=0)=>{game.zoom=1;game.settings.quality='high';game.time=2.4;game.p={x:-10000,y:-10000};ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#f1f0e3';ctx.fillRect(0,0,1000,870);ctx.fillStyle='#25493d';ctx.font='600 25px system-ui';ctx.textAlign='left';ctx.fillText('PETAL REALMS / CREATURE MATERIAL STUDY',32,40);ctx.font='14px system-ui';ctx.fillText('Synthetic poses. Dashed ellipses show gameplay body proxies; legs and wings are decorative.',32,66);
const species=['ladybug','bee','spider','ant','beetle','crab','jelly','starfish','slime','mechaSpider','drone','wildFlower','scorpion','urchin','guardianGarden','guardianFactory'];
let tested=0;const random=Math.random;Math.random=()=>{throw Error('Renderer consumed gameplay randomness')};
try{for(const [t,def]of Object.entries(mobs))for(const size of [.6,1,1.6]){const m={id:3,t,r:def.size*size,speed:def.speed,facing:.2,x:0,y:0};const before=JSON.stringify(mobCollider(m));creatureVisualProfile(m);if(before!==JSON.stringify(mobCollider(m)))throw Error('Visual modified collider');ctx.save();ctx.translate(-1000,-1000);drawCreatureModel(m);ctx.restore();tested++}
for(let i=0;i<8;i++){const t=species[page*8+i],d=mobs[t],x=32+(i%2)*480,y=94+Math.floor(i/2)*190;ctx.fillStyle='#e5e8d7';ctx.beginPath();ctx.roundRect(x,y,456,174,15);ctx.fill();ctx.fillStyle='#355747';ctx.font='600 19px system-ui';ctx.textAlign='left';ctx.fillText(t,x+18,y+27);for(let k=0;k<3;k++){const r=[18,30,44][k],m={id:i+1,t,r,speed:d.speed,facing:0};ctx.save();ctx.translate(x+85+k*142,y+94);drawCreatureModel(m);ctx.setLineDash([3,4]);ctx.lineWidth=.8;ctx.strokeStyle='#35574765';const proxy=mobCollider(m);ctx.beginPath();ctx.ellipse(0,0,proxy.rx,proxy.ry,0,0,TAU);ctx.stroke();ctx.restore();ctx.fillStyle='#53695b';ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillText('r = '+r,x+85+k*142,y+156)}}
}finally{Math.random=random}return {tested,geometryUnchanged:true,rngIsolated:true,reducedMotion:reducedMotion.matches,phase:creatureVisualProfile({id:3,t:"ladybug",r:30,speed:40}).phase};};
'''
html=inline_assets(html.replace('requestAnimationFrame(loop);','').replace('})();',probe+'\n})();'))
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=os.environ.get('PETAL_CHROMIUM'),args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1000,'height':870},device_scale_factor=1)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='domcontentloaded')
 page.locator('#gate').evaluate('(e)=>e.remove()')
 for n in range(2):
  result=page.evaluate('(n)=>window.__visualQA(n)',n)
  page.screenshot(path=str(OUT/f'v513_creatures_{n+1}.png'))
 assert result['tested']>=120 and not errors,errors
 page.emulate_media(reduced_motion='reduce')
 motion=page.evaluate('window.__visualQA(0)')
 assert motion['reducedMotion'] and motion['phase']==0,motion
 b.close()
print(json.dumps(result))
