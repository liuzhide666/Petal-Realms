const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const math=Object.create(Math);math.random=()=>{throw Error('Presentation consumed gameplay randomness')};const c={Math:math};vm.createContext(c);vm.runInContext(fs.readFileSync('site/art.js','utf8'),c);const A=c.PetalArt;
assert.equal(typeof A.presentation,'function','presentation settings must have a bounded sanitizer');
let checks=1;const check=x=>{assert.ok(x);checks++};
for(const x of [undefined,null,[],{},'invalid',{visualStyle:'unknown',motion:7,hud:'other',showGrid:'yes',orbitGuide:1}]){const s=A.presentation(x);check(s.visualStyle==='field'&&s.motion==='auto'&&s.hud==='compact'&&s.showGrid===false&&s.orbitGuide===false)}
const settings=A.presentation({visualStyle:'botanical',motion:'reduced',hud:'full',showGrid:true,orbitGuide:true});check(settings.visualStyle==='botanical'&&settings.motion==='reduced'&&settings.hud==='full'&&settings.showGrid&&settings.orbitGuide);
const families=['basic','rose','leaf','stinger','cactus','bubble','sand','claw','iris','lightning','gear','fang','magma','shell','antenna','poison','starpetal','nectar','missile','grape','puff','bloom','glass','root','soil','wing','magnet','prism','frost'];
let depth=0,calls=0;const paint=new Proxy({save(){depth++},restore(){depth--},createRadialGradient(){throw Error('Flat art used a gradient')},createLinearGradient(){throw Error('Flat art used a gradient')}},{get:(o,k)=>k in o?o[k]:(...args)=>{check(args.every(x=>typeof x!=='number'||Number.isFinite(x)));calls++},set:(o,k,v)=>(o[k]=v,true)});
for(const t of families)for(const size of [4,12,28]){A.fieldPetal(paint,t,size,'#bada88','#4a6451');check(depth===0)}
for(const zone of ['garden','ocean','desert','jungle','hel','ant','sewer','factory']){A.fieldTerrain(paint,zone,813);check(depth===0);check(/^#[\da-f]{6}$/i.test(A.fieldColors[zone][0]))}
for(const mode of ['normal','attack','defend'])for(const reduced of [false,true]){A.fieldAvatar(paint,{radius:20,time:2.4,reduced,mode,vx:30,vy:12,hurt:true});check(depth===0)}
check(calls>100);console.log(JSON.stringify({passed:checks,scope:'bounded presentation settings; 29 petal families at three sizes; eight terrain palettes; no gradients or gameplay RNG'}));
