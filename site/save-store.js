/* One browser-local previous generation per character; cloud CAS stays independent. */
(()=>{'use strict';
function decode(raw,validate){const payload=JSON.parse(raw);validate(payload);return payload}
function read(storage,key,validate){
 const raw=storage.getItem(key),previous=storage.getItem(key+'.previous');
 if(raw!==null){try{return{payload:decode(raw,validate),recovered:false}}catch{}}
 if(previous!==null){try{return{payload:decode(previous,validate),recovered:true}}catch{}}
 if(raw!==null||previous!==null){const error=Error('本机存档损坏，已停止载入并保留原始记录；请使用有效备份恢复，勿清理浏览器数据。');error.code='CORRUPT_LOCAL_SAVE';throw error}
 return{payload:null,recovered:false};
}
function write(storage,key,payload,validate){
 validate(payload);const next=JSON.stringify(payload),raw=storage.getItem(key);
 if(raw===next)return;
 if(raw!==null){
  let valid=false;try{decode(raw,validate);valid=true}catch{}
  // Preserve damaged input before allowing the recovered/current character to replace it.
  storage.setItem(key+(valid?'.previous':'.damaged'),raw);
 }
 storage.setItem(key,next);
}
globalThis.PetalSaveStore=Object.freeze({read,write});
})();
