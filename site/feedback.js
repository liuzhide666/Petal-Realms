/* Present settled receipts only. This module never owns inventory or randomness. */
(()=>{'use strict';
function renderCraft(host,receipt,{color,motion='auto'}={}){
 if(!host||!receipt)return;
 const root=document.createElement('section');root.id='craftReceipt';root.className='craft-receipt';root.tabIndex=-1;root.dataset.motion=motion;root.dataset.outcome=receipt.success?(receipt.failed?'mixed':'success'):'failure';root.dataset.phase='settled';root.style.setProperty('--craft-color',color);
 const label=document.createElement('p');label.className='craft-eyebrow';label.textContent=receipt.rank===7?'BOTANICAL FORGE · 花瓣锻造':'BOTANICAL SYNTHESIS · 花瓣合成';
 const stage=document.createElement('div');stage.className='craft-stage';stage.setAttribute('aria-hidden','true');
 for(let i=0;i<5;i++){const part=document.createElement('span');part.className='craft-material';const angle=i*Math.PI*2/5-Math.PI/2;part.style.setProperty('--dx',Math.cos(angle)*62+'px');part.style.setProperty('--dy',Math.sin(angle)*62+'px');part.style.setProperty('--turn',i*72+'deg');const icon=document.createElement('canvas');icon.dataset.petalIcon=receipt.key;part.append(icon);stage.append(part)}
 const center=document.createElement('span');center.className='craft-product';const icon=document.createElement('canvas');icon.dataset.petalIcon=receipt.type+'@'+(receipt.rank+(receipt.success?1:0));center.append(icon);stage.append(center);
 const title=document.createElement('h3');title.textContent=receipt.success?(receipt.failed?'合成完成 · 部分成功':'合成成功'):'合成未成功';
 const summary=document.createElement('p');summary.className='craft-receipt-summary';summary.setAttribute('role','status');summary.textContent='尝试 '+receipt.attempts+' 次 · 成功 '+receipt.success+' · 失败 '+receipt.failed+' · 消耗 '+receipt.spent+' 片 · 材料剩余 '+receipt.remaining+' 片';
 const output=document.createElement('p');output.textContent=receipt.success?'获得 '+receipt.success+' 片 '+receipt.rarity+' '+receipt.name:'未生成新花瓣；保留未消耗的材料。';
 const persistence=document.createElement('small');persistence.textContent=receipt.localSaved===true?'结算已保存到本机；云端同步以存档状态为准。':receipt.localSaved===null?'游客进度不会保存。':'本机保存失败：本次结果仅在当前页面，请立即导出角色进度。';
 const skip=document.createElement('button');skip.id='craftSkip';skip.type='button';skip.className='small-primary';skip.textContent='跳过动画 · 查看结果';skip.hidden=true;
 root.append(label,stage,title,summary,output,persistence,skip);host.replaceChildren(root);
}
function animateCraft(root,{reduced=false}={}){
 let resolve,done=false,timer;const finished=new Promise(r=>resolve=r);
 const skip=root?.querySelector('#craftSkip');
 function finish(){if(done)return;done=true;clearTimeout(timer);document.removeEventListener('visibilitychange',onVisibility);if(root){root.classList.remove('craft-running');root.dataset.phase='settled';if(skip){if(document.activeElement===skip&&root.isConnected)root.focus({preventScroll:true});skip.hidden=true;skip.onclick=null}}resolve()}
 function onVisibility(){if(document.hidden)finish()}
 if(!root){finish();return{finished,finish}}
 root.dataset.motion=reduced?'reduced':'auto';root.dataset.phase='animating';root.classList.add('craft-running');if(skip){skip.hidden=false;skip.onclick=finish}
 document.addEventListener('visibilitychange',onVisibility);timer=setTimeout(finish,reduced?180:950);if(document.hidden)finish();
 return{finished,finish};
}
globalThis.PetalFeedback=Object.freeze({renderCraft,animateCraft});
})();
