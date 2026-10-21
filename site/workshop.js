/* Additive build planning. Scores are preferences, never DPS or combat guarantees. */
(()=>{'use strict';
const weights=Object.freeze({attack:Object.freeze([.8,.15,.05]),sustain:Object.freeze([.15,.35,.5]),balanced:Object.freeze([.4,.3,.3])});
function plan(bag,slots,defs,policy){
 if(!weights[policy]||!Array.isArray(slots)||slots.length<1||slots.length>10)throw Error('Invalid build request');
 const pool=Object.create(null),keys=Object.keys(defs).sort();
 for(const [k,n]of Object.entries(bag)){if(!Object.hasOwn(defs,k)||!Number.isSafeInteger(n)||n<0||n>99999)throw Error('Invalid inventory');pool[k]=n}
 for(const k of slots){if(!Object.hasOwn(defs,k))throw Error('Invalid equipped item');pool[k]=(pool[k]||0)+1}
 const maxima=[0,0,0];for(const k of keys){const d=defs[k],v=[d.attack,d.renewal,d.support];if(v.some(x=>!Number.isFinite(x)||x<0))throw Error('Invalid item features');v.forEach((x,i)=>maxima[i]=Math.max(maxima[i],x))}
 const score=k=>[defs[k].attack,defs[k].renewal,defs[k].support].reduce((s,x,i)=>s+weights[policy][i]*(maxima[i]?x/maxima[i]:0),0);
 const candidates=keys.filter(k=>pool[k]>0).sort((a,b)=>score(b)-score(a)||(a<b?-1:a>b?1:0));
 const result=[];for(const k of candidates)for(let j=0,n=Math.min(pool[k],slots.length-result.length);j<n;j++){result.push(k);pool[k]--}
 if(result.length!==slots.length)throw Error('Insufficient inventory');
 // A full bag stack cannot overflow when the previous deck is returned.
 if(Object.values(pool).some(n=>n>99999))throw Error('Inventory stack would overflow');
 return {slots:result,bag:Object.fromEntries(Object.entries(pool).filter(([,n])=>n>0)),before:slots.reduce((s,k)=>s+score(k),0),after:result.reduce((s,k)=>s+score(k),0),scores:Object.fromEntries(candidates.map(k=>[k,score(k)])),weights:[...weights[policy]]};
}
function release(x){
 const text=s=>typeof s==='string'&&s.length>0&&s.length<=240&&!/[<>\x00-\x08]/.test(s);
 if(!x||x.schema!==1||!/^\d+\.\d+\.\d+$/.test(x.version)||!text(x.title)||!text(x.developer)||!text(x.introduction)||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(x.updatedAt)||!Number.isFinite(Date.parse(x.updatedAt))||!Array.isArray(x.highlights)||!x.highlights.length||x.highlights.length>20||!x.highlights.every(text))return null;
 return {schema:1,version:x.version,title:x.title,developer:x.developer,introduction:x.introduction,updatedAt:x.updatedAt,highlights:[...x.highlights]};
}
globalThis.PetalWorkshop=Object.freeze({plan,release,weights});
})();
