/* Native top-layer dialogs keep keyboard focus and background input isolated. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
let fallback=null,news=null,checkedAt=null,loading=null,welcomeResolve=null,asking=null,lastFocus=null;
function closeWelcome(){if($('welcomeDialog').open)$('welcomeDialog').close()}
function paintNews(state){
 const root=$('releaseHighlights');root.replaceChildren();const x=news||fallback;if(!x)return;
 $('releaseVersion').textContent='V'+x.version;$('releaseTitle').textContent=x.title;
 $('developerName').textContent=x.developer;$('developerIntro').textContent=x.introduction;
 $('releaseDate').textContent='公告更新：'+new Date(x.updatedAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false})+'（北京时间）';
 for(const text of x.highlights){const li=document.createElement('li');li.textContent=text;root.append(li)}
 $('releaseState').textContent=state;$('refreshRelease').disabled=!!loading;
}
async function refresh(){
 if(loading)return loading;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
 loading=(async()=>{try{const r=await fetch('release.json',{cache:'no-store',signal:controller.signal});if(!r.ok)throw Error('Unavailable');const raw=await r.text();if(raw.length>16384)throw Error('Too large');const x=globalThis.PetalWorkshop.release(JSON.parse(raw));if(!x)throw Error('Invalid');news=x;checkedAt=new Date();paintNews('已获取本站最新公告 · '+checkedAt.toLocaleTimeString('zh-CN',{hour12:false}));}catch{paintNews(news?'刷新未完成，保留上次获取的公告':'暂时无法获取公告，显示随版本附带的内容');}finally{clearTimeout(timer);loading=null;$('refreshRelease').disabled=false}})();
 $('refreshRelease').disabled=true;return loading;
}
function welcome(){
 if($('gate').classList.contains('hidden'))return Promise.resolve();
 if($('welcomeDialog').open)return welcomeResolve?.promise||Promise.resolve();
 let resolve;const promise=new Promise(r=>resolve=r);welcomeResolve={resolve,promise};lastFocus=document.activeElement;
 paintNews(news?'显示上次获取的公告':'显示随版本附带的公告');$('welcomeDialog').showModal();$('welcomeContinue').focus();void refresh();return promise;
}
function ask(message,title='请确认本次操作'){
 if(asking)return Promise.resolve(false);
 const origin=document.activeElement;
 return new Promise(resolve=>{asking={resolve,origin};$('confirmTitle').textContent=title;$('confirmMessage').textContent=message;$('confirmDialog').returnValue='cancel';$('confirmDialog').showModal();$('confirmCancel').focus()});
}
function install(feed){
 fallback=globalThis.PetalWorkshop.release(feed);if(!fallback)throw Error('Invalid bundled announcement');
 $('welcomeContinue').onclick=closeWelcome;$('welcomeClose').onclick=closeWelcome;$('refreshRelease').onclick=refresh;
 $('welcomeDialog').addEventListener('close',()=>{welcomeResolve?.resolve();welcomeResolve=null;if(lastFocus?.isConnected&&!lastFocus.closest('.hidden'))lastFocus.focus({preventScroll:true})});
 $('confirmAccept').onclick=()=>{$('confirmDialog').close('accept')};$('confirmCancel').onclick=()=>{$('confirmDialog').close('cancel')};
 $('confirmDialog').addEventListener('close',()=>{const a=asking;asking=null;if(!a)return;a.resolve($('confirmDialog').returnValue==='accept');if(a.origin?.isConnected)a.origin.focus({preventScroll:true})});
 new MutationObserver(()=>{if($('gate').classList.contains('hidden'))closeWelcome();else void welcome()}).observe($('gate'),{attributes:true,attributeFilter:['class']});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&$('welcomeDialog').open)void refresh()});
 document.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]'))e.stopImmediatePropagation()},true);
 setInterval(()=>{if(!document.hidden&&$('welcomeDialog').open)void refresh()},60000);
 return welcome;
}
globalThis.PetalUI=Object.freeze({install,welcome,refresh,ask});
})();
