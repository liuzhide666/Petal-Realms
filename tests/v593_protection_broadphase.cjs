const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../site/index.html'),'utf8');
const a=html.indexOf('function sanitizeProtectedPetals('),b=html.indexOf('function inventoryKey(',a),c=html.indexOf('function craftBatch('),d=html.indexOf('function renderModal(){',c);
assert.ok(a>0&&b>a&&c>0&&d>c,'Expected protection and crafting sections');
let passed=0;function ok(value,label){assert.ok(value,label);passed++}
const bags={'basic@0':25,'leaf@4':15};
const rarity=Array.from({length:10},(_,i)=>({chance:i===7?1:i===9?0:.64/Math.pow(2,i)}));
const pets={basic:{name:'基础'},leaf:{name:'绿叶'}};
const game={active:true,bags,protectedPetals:{}};
let saves=0,modal=0,randomUsed=0;
const math=Object.create(Math);math.random=()=>{randomUsed++;return .1};
const ctx={console,Math:math,game,rarity,pets,saveGame:()=>saves++,renderModal:()=>modal++,toast:()=>{},
 itemOf:k=>{const v=String(k).split('@');return pets[v[0]]&&Number.isInteger(+v[1])&&+v[1]>=0&&+v[1]<10?[v[0],+v[1]]:null},
 takeBag:(type,rank,num)=>{const key=type+'@'+rank;if((bags[key]||0)<num)return false;bags[key]-=num;return true},
 addBag:(type,rank,num=1)=>{const k=type+'@'+rank;bags[k]=(bags[k]||0)+num}
};
vm.createContext(ctx);vm.runInContext(html.slice(a,b)+html.slice(c,d),ctx);
const run=x=>vm.runInContext(x,ctx);
ok(Object.keys(run("sanitizeProtectedPetals({})")).length===0,'old save missing protection field');
ok(run("JSON.stringify(sanitizeProtectedPetals({'basic@0':true,'leaf@4':true,'evil':true,'basic@9':'yes'}))")==='{"basic@0":true,"leaf@4":true}','malformed protection data sanitized');
ok(run("togglePetalProtection('basic@0')")===true&&run("isPetalProtected('basic@0')"),'lock held petal type');
ok(saves===1&&modal===1&&bags['basic@0']===25,'locking saves without consuming items');
const before=randomUsed;let r=run("craftBatch('basic@0',5)");
ok(r.attempts===0&&r.spent===0&&r.success===0,'locked bulk synthesis blocked');
ok(randomUsed===before&&bags['basic@0']===25,'locked forging consumes neither RNG nor materials');
ok(run("craftBatch('basic@0',1)").attempts===0,'locked single synthesis blocked');
ok(run("craftBatch('leaf@4',1)").attempts===1,'other unlocked item unaffected');
ok(run("togglePetalProtection('basic@0')")===true&&!run("isPetalProtected('basic@0')"),'unlock works');
r=run("craftBatch('basic@0',1)");ok(r.attempts===1&&r.success===1,'unlocked crafting resumes');
ok(run("togglePetalProtection('not-an-item')")===false,'invalid item cannot be protected');
ok(html.includes('protectedPetals:game.protectedPetals')&&html.includes('game.protectedPetals=sanitizeProtectedPetals(a.protectedPetals)'),'protection round-trips via version-5 save JSON');
ok(html.includes('id="toggleCraftLock"')&&html.includes("lockBtn.onclick=()=>"),'touch-accessible crafting lock action wired');
ok(html.includes("available<10||!rate||isPetalProtected(craftSelect)")&&html.includes("available<5||!rate||isPetalProtected(craftSelect)"),'UI disables crafting actions for locked inputs');
ok(html.includes("craftReadyOnly&&(count<5||rank>=rarity.length-1||isPetalProtected(card.dataset.craft))"),'craft-ready filter excludes protected inputs');
const gStart=html.indexOf('function mobCollider('),gEnd=html.indexOf('function mobCircleOverlap(',gStart);
ok(gStart>0&&gEnd>gStart,'directional ellipse geometry available');
const geom={console,Math};vm.createContext(geom);vm.runInContext(html.slice(gStart,gEnd),geom);
const maxReach=(m,dx,dy)=>vm.runInContext('mobSupportRadius('+JSON.stringify(m)+','+dx+','+dy+')',geom);
for(let i=0;i<1200;i++){
 const ang=i*.6180339887,dist=5+(i%103),sizeA=8+i%23,sizeB=11+(i*7)%25;
 const a={r:sizeA,t:['ant','beetle','wasp','spider','slime'][i%5],facing:ang};
 const b={r:sizeB,t:['ant','beetle','wasp','spider','slime'][(i+1)%5],facing:ang*.67};
 const dx=Math.cos(ang)*dist,dy=Math.sin(ang)*dist;
 const actual=maxReach(a,dx,dy)+maxReach(b,-dx,-dy)+1;
 const upper=sizeA+sizeB+2;
 ok(actual<upper,'broadphase envelope strictly contains exact ellipse contact');
 if(dist<actual)ok(dx*dx+dy*dy<upper*upper,'candidate includes every exact-contact pair');
}
ok(html.includes('if(dx*dx+dy*dy>=upper*upper)continue;'),'broadphase guards present');
const placed=Array.from({length:40},(_,i)=>({x:(i%8)*220,y:Math.floor(i/8)*220,r:20}));
let candidate=0;
for(let i=0;i<placed.length;i++)for(let j=i+1;j<placed.length;j++){
 const x=placed[i],y=placed[j],dx=x.x-y.x,dy=x.y-y.y,upper=x.r+y.r+2;
 if(dx*dx+dy*dy<upper*upper)candidate++;
}
ok(candidate===0,'far-apart mobs skip all costly ellipse pair evaluations');
console.log(JSON.stringify({passed,scope:'save compatibility, deterministic material locks, and conservative collision broadphase'}));
