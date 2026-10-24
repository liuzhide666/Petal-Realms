/* Original, deterministic training layouts. These rules grant no persistent rewards. */
(()=>{'use strict';const TAU=Math.PI*2;
const limits=Object.freeze({waves:3,warning:1.5,time:180,population:24,radius:620});
const modes=Object.freeze({
 surround:Object.freeze({name:'四面楚歌',health:1,skills:null,breach:true,description:'三侧敌群施压；每波先识别并穿过金色突破区，再清理敌群。突破方向每波轮换。'}),
 laststand:Object.freeze({name:'背水一战',health:.35,skills:3,breach:false,description:'以35%生命起步，三波共用3次主动技能。治疗花瓣仍有效；选择恢复、防守或爆发的时机。'})
});
function plan(mode,wave,cx,cy){
 const opening=-(wave-1)*Math.PI/2,spawns=[];
 function add(t,role,a,r){spawns.push({t,role,x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r})}
 for(let i=0;i<wave+1;i++)add('ant','frontline',opening+Math.PI+(i-wave/2)*.24,360+(i%2)*52);
 for(const side of [-1,1])add('beetle','flank',opening+side*Math.PI/2,380);
 if(wave>=2)add('wasp','ranged',opening+Math.PI-.75,455);
 if(wave>=3)add('wasp','ranged',opening+Math.PI+.75,455);
 return{opening,spawns,breachRequired:!!modes[mode]?.breach};
}
function breached(layout,p,cx,cy){const dx=p.x-cx,dy=p.y-cy,angle=Math.atan2(dy,dx)-layout.opening;return Math.hypot(dx,dy)>=260&&Math.abs(Math.atan2(Math.sin(angle),Math.cos(angle)))<=.62}
function draw(c,state,time,cx,cy){
 c.save();c.translate(cx,cy);c.strokeStyle='#e8d7ab';c.lineWidth=3;c.setLineDash([10,8]);c.beginPath();c.arc(0,0,limits.radius,0,TAU);c.stroke();c.setLineDash([]);
 if(state.plan.breachRequired){const a=state.plan.opening;c.strokeStyle=state.breached?'#b4e3ab':'#f0d998';c.lineWidth=5;c.beginPath();c.arc(0,0,280,a-.42,a+.42);c.stroke();c.font='600 13px system-ui';c.textAlign='center';c.fillStyle=c.strokeStyle;c.fillText(state.breached?'突破已完成':'穿过此处 · 突破',Math.cos(a)*310,Math.sin(a)*310-12)}
 if(state.phase==='warning')for(const m of state.plan.spawns){c.strokeStyle='#e7ba98';c.lineWidth=2;c.setLineDash([5,6]);c.beginPath();c.arc(m.x-cx,m.y-cy,35,0,TAU);c.stroke();c.setLineDash([]);c.fillStyle='#f1e3be';c.font='11px system-ui';c.textAlign='center';c.fillText({frontline:'牵制',flank:'冲锋',ranged:'远程'}[m.role],m.x-cx,m.y-cy-44)}
 c.restore();
}
globalThis.PetalTrials=Object.freeze({limits,modes,plan,breached,draw});
})();
