"""Rebuild the V5.21 handbook from source and the retained 354 historical pages.
Requires PyMuPDF and XeLaTeX; CJK fonts are verified by SHA-256, never substituted.
The historical page-copy PDF deliberately carries no prior whole-document credentials.
"""
import argparse,hashlib,html,json,re,subprocess
from pathlib import Path
import fitz
ROOT=Path(__file__).resolve().parents[1]
VERSION='5.21.0'; DATE='2026-10-27'
EXPECTED_BASE='d46fafd9d5067d1999bf4cd077797d06ff7c530c2da3169b6321ece1e085a8b4'
FONT_HASHES={'NotoSansCJKsc-Regular.otf':'2c76254f6fc379fddfce0a7e84fb5385bb135d3e399294f6eeb6680d0365b74b','NotoSerifCJKsc-Regular.otf':'2a2eae2628df83556c54018c41e20fa532c1b862c5256ae8b3f23feb918d12ca'}
sha=lambda b:hashlib.sha256(b).hexdigest()
def tx(value):
 return ''.join('<span class="latin">'+html.escape(s)+'</span>' if s.isascii() else html.escape(s) for s in re.split(r'([\x20-\x7e]+)',str(value)) if s)
def para(s,cls=''):return '<p class="'+cls+'">'+tx(s)+'</p>'
def heading(s):return '<h2>'+tx(s)+'</h2>'
def table(headers,rows):
 return '<table><thead><tr>'+''.join('<th>'+tx(h)+'</th>' for h in headers)+'</tr></thead><tbody>'+''.join('<tr>'+''.join('<td>'+tx(c)+'</td>' for c in row)+'</tr>' for row in rows)+'</tbody></table>'
def section(title,*parts):return '<section'+(' style="page-break-before:always"' if title=='03 花瓣目录 2 / 2' else '')+'>'+heading(title)+''.join(parts)+'</section>'
def load_source():
 js="""const fs=require('fs'),vm=require('vm'),h=fs.readFileSync('site/index.html','utf8'),c={};vm.runInNewContext(h.slice(h.indexOf('const rarity='),h.indexOf('const SHRINE_TYPES='))+h.match(/^const SLOT_MILESTONES=[^\\n]+/m)[0]+h.match(/^function xpNeed\\([^\\n]+/m)[0]+'\\nglobalThis.data={rarity,pets,mobs,zones,TALENTS,slots:SLOT_MILESTONES,progression:[1,5,12,20,30,60,61,120,999].map(level=>({level,xp:xpNeed(level),talents:talentEarned(level)}))};',c);process.stdout.write(JSON.stringify(c.data));"""
 d=json.loads(subprocess.check_output(['node','-e',js],cwd=ROOT,text=True));assert (len(d['pets']),len(d['mobs']),len(d['zones']))==(29,43,8);return d

def fonts():
 paths={}
 for family,name in [('Noto Sans CJK SC','NotoSansCJKsc-Regular.otf'),('Noto Serif CJK SC','NotoSerifCJKsc-Regular.otf')]:
  p=Path(subprocess.check_output(['fc-match','-f','%{file}',family],text=True));assert sha(p.read_bytes())==FONT_HASHES[name],family+' must use the retained verified font';paths[name]=p
 latin=Path(subprocess.check_output(['fc-match','-f','%{file}','DejaVu Sans'],text=True));assert latin.name=='DejaVuSans.ttf'
 arc=fitz.Archive();[arc.add(str(p.parent)) for p in [*paths.values(),latin]];return arc,paths,latin

def render(body,label,archive):
 # XeLaTeX supplies repeated table headers and heading/page-break ownership.
 # Use the verified CJK fonts directly; no system-font substitution is accepted.
 import os,datetime,xml.etree.ElementTree as ET
 def esc(s):
  mapping={'\\':r'\textbackslash{}','{':r'\{','}':r'\}','%':r'\%','&':r'\&','#':r'\#','$':r'\$','_':r'\_','^':r'\textasciicircum{}','~':r'\textasciitilde{}'}
  out=''.join(mapping.get(c,c) for c in str(s))
  out=re.sub(r'([0-9a-f]{8})(?=[0-9a-f]{8})',r'\1\\allowbreak{}',out)
  return out.replace('/',r'/\allowbreak{}').replace('-',r'-\allowbreak{}').replace(r'\_',r'\_\allowbreak{}')
 def content(e):
  result=esc(e.text or '')
  for child in e:result+=node(child)+esc(child.tail or '')
  return result
 def node(e):
  tag=e.tag
  if tag=='span':return r'\allowbreak{}{\LatinFont '+content(e)+r'}\allowbreak{}'
  if tag=='section':return ('\n\\clearpage\n' if e.get('style') else '')+content(e)
  if tag in ['h1','h2']:
   size='20' if tag=='h1' else '14'
   return '\n\\Needspace{6\\baselineskip}\\section*{{\\sffamily\\fontsize{'+size+'}{19}\\selectfont '+content(e)+'}}\n'
  if tag=='p':return '\n'+content(e)+'\\par\n'
  if tag=='table':
   head=e.find('thead/tr');rows=e.findall('tbody/tr');n=len(head)
   weights={2:[.30,.70],3:[.20,.37,.43],4:[.08,.34,.33,.25],5:[.20,.08,.08,.10,.54]}[n]
   if ''.join(head.itertext()).startswith('来源文件'):weights=[.55,.45]
   def row(x):return ' & '.join(content(c) for c in x)+r' \\'+'\n'
   spec='@{}'+''.join('>{\\raggedright\\arraybackslash}p{'+str(w)+'\\tablewidth}' for w in weights)+'@{}'
   return '\n{\\fontsize{9}{13}\\selectfont\\setlength{\\tabcolsep}{4pt}\\setlength{\\tablewidth}{\\dimexpr\\linewidth-'+str((n-1)*8)+'pt\\relax}\\begin{longtable}{'+spec+'}\n\\toprule\n'+row(head)+'\\midrule\\endfirsthead\n\\toprule\n'+row(head)+'\\midrule\\endhead\n\\midrule\\endfoot\n\\bottomrule\\endlastfoot\n'+''.join(row(r) for r in rows)+'\\end{longtable}}\n'
  return content(e)
 tree=ET.fromstring('<root>'+body+'</root>');folder=ROOT/'artifacts/manual/tex';folder.mkdir(parents=True,exist_ok=True)
 preamble=r'''\documentclass[10pt,a4paper]{article}
\usepackage{fontspec,geometry,longtable,array,booktabs,fancyhdr,hyperref,needspace}
\geometry{left=16mm,right=16mm,top=20mm,bottom=18mm,headheight=14pt,footskip=18pt}
\setmainfont{NotoSerifCJKsc-Regular.otf}[Path={FONTDIR},AutoFakeBold=1.3]
\setsansfont{NotoSansCJKsc-Regular.otf}[Path={FONTDIR},AutoFakeBold=1.3]
\newfontfamily\LatinFont{DejaVu Sans}[Ligatures=NoCommon]
\XeTeXlinebreaklocale "zh"
\XeTeXlinebreakskip=0pt plus 1pt
\setlength{\parindent}{0pt}\setlength{\parskip}{5pt}
\newlength{\tablewidth}\renewcommand{\arraystretch}{1.12}
\pagestyle{fancy}\fancyhf{}\fancyhead[L]{\LatinFont\fontsize{8}{10}\selectfont PETAL REALMS / V5.21.0 / 2026-10-27}
\fancyfoot[L]{\LatinFont\fontsize{8}{10}\selectfont LABEL-\thepage\ | Source-bound handbook supplement}
\renewcommand{\headrulewidth}{0.4pt}\renewcommand{\footrulewidth}{0pt}
\hypersetup{hidelinks}\emergencystretch=2em
\begin{document}\fontsize{10.5}{16}\selectfont
'''.replace('LABEL',label).replace('FONTDIR',str(Path(subprocess.check_output(['fc-match','-f','%{file}','Noto Sans CJK SC'],text=True)).parent)+'/')
 source=preamble+content(tree)+'\n\\end{document}\n';tex=folder/(label+'.tex');tex.write_text(source)
 env={**os.environ,'SOURCE_DATE_EPOCH':str(int(datetime.datetime(2026,10,27,tzinfo=datetime.timezone.utc).timestamp())),'FORCE_SOURCE_DATE':'1'}
 for i in range(2):
  r=subprocess.run(['xelatex','-interaction=nonstopmode','-halt-on-error','-output-directory',str(folder),str(tex)],cwd=ROOT,env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
  (folder/(label+'-compile.log')).write_text(r.stdout)
  if r.returncode:raise RuntimeError(r.stdout[-3500:])
 log=(folder/(label+'.log')).read_text();assert 'Missing character:' not in log,'Missing PDF glyph';assert 'Overfull \\hbox' not in log,'PDF text overflow; inspect '+str(tex)
 d=fitz.open(folder/(label+'.pdf'));d.xref_set_key(-1,'ID','null');return d,[]

def write(d,path,title):
 d.set_metadata({'title':title,'author':'Petal Realms','subject':'V5.21 source-bound rules, player operations and release boundaries','producer':'Petal Realms Handbook Builder','creationDate':'D:20261027000000Z','modDate':'D:20261027000000Z'});d.save(path,garbage=4,deflate=True,no_new_id=True)

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--baseline',default='docs/history/Petal_Realms_Manual_V5.19_Pages.pdf');ap.add_argument('--output-dir',default='site');args=ap.parse_args();out=ROOT/args.output_dir;out.mkdir(parents=True,exist_ok=True)
 baseline=ROOT/args.baseline;assert sha(baseline.read_bytes())==EXPECTED_BASE;old=fitz.open(baseline);assert len(old)==354 and old.embfile_count()==0
 d=load_source();pets=d['pets'];zones=d['zones'];mobs=d['mobs'];rarity=d['rarity'];arc,fontpaths,latin=fonts()
 runtime_paths=sorted(['site/index.html','site/feedback.css','site/release.json','functions/api/[[path]].js','wrangler.jsonc','package.json','package-lock.json','docs/standard/ruleset.json','docs/standard/mechanisms.json']+[str(p.relative_to(ROOT)) for p in (ROOT/'site').glob('*.js')])
 source_hashes={p:sha((ROOT/p).read_bytes()) for p in runtime_paths};bundle=sha(json.dumps(source_hashes,sort_keys=True,separators=(',',':')).encode())
 guide='<h1>'+tx('花瓣之境 · 玩家手册')+'</h1>'+para('V5.21 / 2026-10-27。本文说明当前实现，不把同类游戏的社区机制当作本游戏规则。数值均来自当前源代码；历史手册中的旧封面、候选状态与源码计数属于相应历史版本。','notice')
 guide+=section('01 上手与操作',para('先选择角色类型，再开始探索。建议第一次进入先使用键盘移动或手机摇杆，在花园中心熟悉攻击、防御和闪避。世界地图的连线代表传送门关系，不代表点击后直接传送。'),table(['设备 / 操作','方法'],[['电脑移动','WASD / 方向键；设置中可切换鼠标跟随或仅键盘'],['攻击 / 防御','左键或空格攻击；右键或 Shift 防御'],['手机','左侧摇杆移动；按住攻击 / 防御，点击闪避与技能'],['主要面板','B 背包，C 合成，M 地图，J 图鉴，T 任务，X 天赋'],['战斗快捷键','Q 闪避；H 反转环绕；R 切换构筑；Z / V / F / E / G 主动技能'],['暂停与返回','Esc 暂停 / 返回；手机使用暂停按钮；弹窗内先阅读确认内容']]),para('精简 HUD 下部分按钮放在“更多”和“技能”菜单中。屏幕较矮时可滚动面板，横向导航也可滑动。操作按钮被菜单隐藏，不代表对应功能不可用。'))
 guide+=section('02 攻防、技能与状态',para('花瓣同时承担输出与耐久消耗。攻击时轨道外扩，防御时收拢；破损花瓣等待自己的装填倒计时后恢复。防御姿态下，本体和该花瓣连续 1.2 秒未受伤后，完整花瓣每秒修复 6% 耐久；已经破损的花瓣不会因此跳过装填。'),table(['技能 / 按键','冷却','当前基础行为'],[['花瓣风暴 Z','14 秒','半径 170；伤害 (35 + 3×等级)；普通目标眩晕 0.75 秒，守卫 0.25 秒'],['螺旋散射 V','12 秒','10 枚弹体；单枚基础伤害 17 + 1.7×等级；射程 430'],['守护屏障 F','20 秒','基础持续 4.5 秒；受到的伤害乘以 0.58'],['生长治愈 E','25 秒','基础回复至多最大生命的 13%；满血不消耗冷却'],['花瓣超载 G','28 秒','持续 7 秒；接触花瓣伤害乘以 1.17']]),para('天赋与套装可以改变上述伤害、范围、治疗或持续时间，技能面板显示当前构筑数值。闪避持续 0.20 秒，基础无敌时间 0.27 秒，冷却 5.2 秒。'),para('本次修正：眩晕会停止正在执行的冲锋，取消特殊攻击前摇；恢复行动后，特殊攻击需要重新预警。已经离手的弹体和实体碰撞仍然存在，不能把眩晕理解为敌人消失或玩家完全无敌。冰霜花瓣提供减速，不等同于风暴的眩晕。'))
 entries=list(pets.items())
 for part,rows in enumerate([entries[:15],entries[15:]],1):
  guide+=section('03 花瓣目录 '+str(part)+' / 2',para('下表为普通品质的基础单次伤害、耐久与破损装填秒数，不是实际 DPS。属性随品质缩放，实战还受耐久比例、护甲、暴击、天赋、套装和命中次数影响。'),table(['花瓣 / 标识','伤害','耐久','装填秒','基础定位'],[[v['name']+' / '+k,v['dmg'],v['hp'],v['cd'],v['desc']] for k,v in rows]))
 rate_rows=[]
 for r,v in enumerate(rarity):
  chance='终点，不可再合' if r==9 else f"{100*v['chance']:.3f}%"
  rate_rows.append([r,v['name']+' / '+v['en'],chance,f"{v['scale']:.3f}"])
 guide+=section('04 品质与合成',table(['阶','品质','升级单次成功率','属性缩放'],rate_rows),para('每次至少需要 5 张同类同品质材料。成功消耗 5 张并产生 1 张下一品质；失败等概率消耗 1、2、3 或 4 张，不产生新花瓣。每次独立，没有隐藏保底。超凡到独一必成；独一到永恒仍是低概率步骤。'),table(['方式','停止条件','确认范围'],[['单合','最多 1 次尝试','当前材料组；成功与失败成本在按钮旁显示'],['批量合','最多 5 次；不足 5 张或产物满仓立即停止','先确认当前种类、品质、库存与损失规则'],['全合','当前组剩余不足 5 张或产物达到 99999 张','只消耗选中组，不处理其他组，不把新产物连续升级']]),para('例如库存 12 张：第一次成功后余 7 张，第二次失败损失 3 张后余 4 张，操作停止；合计尝试 2 次、产出 1 张、消耗 8 张。全合的实际尝试次数取决于每次损耗，不是简单把初始库存除以五。'),para('左侧搜索或按品质筛选，右侧查看选中材料、配方、概率与按钮。已经装备的花瓣不在可消耗背包中；材料保护同时阻止单合、批量和全合。产物满仓时不会继续扣料。概率详情里的图表示“最多五次”的分布，不是全合的总体分布。'))
 guide+=section('05 构筑与成长',para('背包先选当前 / 备用构筑和槽位，再选择花瓣比较属性。替换后旧花瓣返还背包；拖拽需使用卡片上的拖动柄。切换 A/B 构筑有 2.6 秒冷却，当前花瓣重新装填至少 2.5 秒。材料锁保护合成材料，不等于锁定装备槽。'),table(['达到等级','槽位数量'],[[x['level'],x['slots']] for x in d['slots']]),table(['天赋','每级收益','最高等级'],[[v['name'],v['desc'],v['max']] for v in d['TALENTS'].values()]),para('升级需要经验 XP(L)=35+floor(18L+0.9L²)，等级上限 999。每两个等级增加一个天赋点，准确式为 floor((L-1)/2)，所以首点在 LV3。当前六项天赋合计最多投入 30 点；LV61 后继续升级可能产生暂时无法投入的点，这是后期成长内容缺口，不应解释成已经完成的突破系统。'),para('同系列 2 / 4 片会激活一阶 / 二阶套装。伤害、耐久、回复和移动各有代价，图鉴与技能面板用于核对当前构筑，工作台评分不代表绝对最优装备。'))
 guardians={'garden':'guardianGarden','ocean':'guardianOcean','desert':'guardianDesert','jungle':'guardianJungle','hel':'guardianHel','ant':'guardianAnt','sewer':'guardianSewer','factory':'guardianFactory'}
 guide+=section('06 区域与探索',table(['区域','可连接区域','守卫'],[[v['name'],'、'.join(zones[x[0]]['name'] for x in v['ports']),mobs[guardians[k]]['name']] for k,v in zones.items()]),para('地图从中心到边缘划分七档危险带。中心相对安全，边缘的等级、品质和精英压力更大；实际敌人等级由区域、危险带及生成随机量共同决定。图鉴记录已发现物种、击败数量和最高遭遇等级。当前共有 43 种生物定义，其中包含区域守卫。'),para('花园、海洋、沙漠、丛林、地狱、蚁穴、下水道与工厂构成探索网络。选择目标后应到游戏中的对应传送门；任务、掉落、收集目标和构筑升级共同形成循环。世界事件包含群落入侵、稀有花瓣雨、危险狂潮、复苏季风和落星预警。事件持续时间不同，选择概率不等于游玩时间占比。'),para('区域守卫低生命时会狂暴。先观察攻击预警，再决定输出、防御或撤退。死亡后从当前区域安全点重新生长，装备与背包保留；仍需以存档状态确认最近进度是否已保存。'))
 guide+=section('07 存档、备份与恢复',table(['角色类型','存储与恢复','边界'],[['Cloudflare 云端角色','邮箱作为登录标识；密码登录；恢复码找回；本机副本和云端版本同步','邮箱不用于发验证或找回邮件；云端写入需要有效会话和正确版本'],['本机角色','当前浏览器、当前网站来源的本地存储；可导出 / 导入进度 JSON','不自动跨设备同步；清理浏览器数据前先备份'],['旧邮箱云角色','保留旧账号入口及显式迁移流程','不能把新云角色、本机角色和旧邮箱角色当作同一份存档']]),para('本机写入成功不等于云端同步成功。以“云端已同步”等明确状态为准；离线时保留待同步副本。云端版本冲突会停止自动覆盖，摘要分别显示等级、库存、区域、版本与时间，不能只看等级或片数决定哪份更好。'),para('正常本机保存会保留上一份有效副本；相同的自动保存不会挤掉恢复点。当前存档损坏时，先读取有效副本；两份都不可用时停止载入，不能静默创建一级角色覆盖原进度。通过本机账号密码校验后，可直接选择之前导出的角色进度文件恢复，损坏原记录保留一份。'),para('合成先结算到独立库存副本，再写入本机。写入失败会撤销本次材料和产物变化；已经成功写入后，即使云端排队失败，也不会错误撤销结果。导出直接读取当前页面进度，避免存储失败时导出旧磁盘副本。'),para('处理冲突前先下载备份并确认文件已保存。选择云端会保留本机回退；选择本机会先备份云端，再按当前版本尝试写入。不会自动把两份库存相加。恢复码文件、待同步文件和角色进度文件用途不同，不能互相冒充导入。不要分享密码、Cookie、恢复码或私有进度。'))
 guide+=section('08 战术训练与常见问题',table(['模式','目标与资源','边界'],[['四面楚歌','每波识别并穿过金色突破区，再清理敌群；方向随三波轮换','侧翼冲锋、前排牵制和远程压制迫使选择突破方向'],['背水一战','以 35% 生命进入，三波共用 3 次主动技能；花瓣治疗仍可用','需要在恢复、防守和爆发之间分配有限次数']]),para('训练有 1.5 秒方向预警、180 秒总时限和最多 24 个训练敌人的上界。训练复制当前构筑到独立场景，不写主线，不发永久奖励；退出会恢复主线现场与随机状态。刷新会结束训练，并从已保存的主线进度继续。'),table(['现象','处理'],[['合成按钮不可用','检查是否选中材料、至少五张、材料未保护、非最高品质、产物未满仓'],['提示本机保存失败','保留当前页面，立即导出当前进度；检查浏览器存储权限和容量'],['云端版本冲突','先导出备份，再比较；不要重复强行覆盖或清理待同步记录'],['账号入口不同','确认使用的是新云端、本机还是旧邮箱角色；不同来源的网站也有不同本机存储'],['手机掉帧或耗电','使用省电画质、减少动画或关闭装饰粒子；这不应隐藏攻击预警与实际冷却'],['找不到某按钮','精简 HUD 中展开“更多”或“技能”；也可用对应快捷键']]),para('当前房间功能属于实验性位置预览，不是已经完成的服务器权威多人战斗。物理 iPhone Safari、Android 和低性能设备的长时间体验，需要真机验收；模拟触控通过不等于这些平台已经验收。'))
 expected_rows=[[r,rarity[r]['name'],f"{5+2.5*(1-rarity[r]['chance'])/rarity[r]['chance']:.3f}"] for r in range(9)]
 eng='<h1>'+tx('S4 / S5 现行机制与工程补编')+'</h1>'+para('S4 对应 V5.20 的结算演出、技能反馈和独立训练；S5 对应 V5.21 的存档恢复、单 / 批量 / 全合及本次控制状态修复。本补编仅覆盖明确更新的条款，其余历史数学说明按原有适用条件阅读。')
 eng+=section('S-01 概率与数值契约',para('合成成功概率为 p；成功消耗 5，失败损耗 C_f 均匀分布于 {1,2,3,4}。在持续补充同阶材料、独立固定概率且目标有产物空位的条件下，首次成功的期望材料成本为 E[C]=5+2.5(1-p)/p。它不是有限库存的成功保证。'),table(['来源阶','品质','持续补料的平均首次成功成本'],expected_rows),para('固定最多五次的有限库存分布必须逐步检查剩余材料；独立 Bernoulli 的 1-(1-p)^5 仅在五次尝试都能进行时才适用。全合终止条件不同，不使用五次分布冒充全合统计。'),para('伤害预测区分名义伤害、扣护甲后的实际伤害与剩余生命截断后的有效伤害。耐久、暴击、套装、护盾和无敌窗口须按真实调用顺序计算。单次期望伤害不能直接当作稳定 DPS；工作台效用权重也不是概率。'),para('等级上限、槽位里程碑和天赋预算保持现有规则；本轮没有调整掉落、经验、合成成功率或装备强度。后期天赋点闲置、部分构筑在护甲下落入最低伤害等问题属于已识别的后续平衡议题。'))
 eng+=section('S-02 状态、提交与动画',table(['路径','不变量'],[['合成','单个界面操作只接受一次；材料及产物在同一库存副本结算；本机提交成功后才呈现结果'],['写入失败','恢复原库存；不展示已获得产物；已消耗的会话随机抽样不会回退'],['云端排队失败','不能把已成功的本机提交改判失败；队列持有脱离游戏可变对象的快照'],['演出取消','跳过、关闭、降低动画或切到后台都不能再次结算、抽样或撤销已保存结果'],['眩晕','中断当前冲锋并取消特殊前摇；眩晕期间不能派发特殊攻击；恢复后需要新的特殊预警'],['版本冲突','以账号、界面、角色对象与版本共同绑定确认；不自动合并库存，不借用另一份待同步版本']]),para('Cloudflare API 使用 expectedRevision 条件写入。版本不符返回冲突，客户端保留待同步记录。服务器的 updatedAt 为 Unix 秒，本机记录为 ISO 时间；摘要分别按对应格式解析，避免有效时间显示为未知。健康接口返回完整版本 5.21.0，供部署验收与页面版本比较。'),para('服务端负责身份、会话、输入范围、版本和写入约束；当前客户端战斗没有被服务端重演，不把这套单机存档结构称作防作弊竞技经济。'))
 eng+=section('S-03 代码与验证边界',table(['模块','职责'],[['site/index.html','主循环、实体、输入、角色、各面板、账号与同步编排'],['site/rules.js / docs/standard','概率模型、条件预测、固定步长换算与可追溯契约'],['site/save-store.js','本机有效副本、损坏检测及原记录保留'],['site/interface.js / workshop.js','确认对话框、公告、构筑规划与库存守恒'],['site/art.js / effects.js / feedback.*','共享矢量美术、技能图形与已结算回执的演出'],['site/trials.js','无永久奖励的训练模式和确定性波次布局'],['functions/api/[[path]].js','Cloudflare 账号、Cookie 会话、限流、条件存档及显式迁移'],['database / wrangler.jsonc','既有存储结构与环境绑定；数据库名不等于环境身份']]),table(['验证层','能证明什么','不能代替什么'],[['Node + 内存 SQLite 适配器','API 状态、校验、并发条件与身份逻辑','不是 workerd，也不证明线上 CPU 和 D1 行为'],['Wrangler 编译 / 本地 runtime','可构建与对应运行时可执行性','不是线上真实部署和绑定'],['浏览器 fixture 回归','实际渲染、输入、布局、状态转换','不是跨设备服务或物理手机长稳测试'],['隔离预览站','真实 Workers/D1、会话、跨上下文保存与冲突','不能代替真实旧用户数据迁移验收'],['生产只读检查','提交、版本、函数、绑定、匿名健康、公开资源字节','不应为了测试而写入真实玩家账号']]),para('完整审核按文件角色记录：现行程序和高风险路径深查；测试与配置执行对应门禁；历史 HTML、ZIP、旧 QA 和旧手册保留归档身份。第三方依赖使用锁文件和漏洞扫描，不声称逐行审完全部依赖源码。'))
 eng+=section('S-04 发布、回滚与复现',para('当前正式入口 https://petal-realms.pages.dev/ 。发布前先核对 PR 的当前 head、CI 和预览部署；完成隔离账号验收后才合并。部署成功还需检查新提交、uses_functions、数据库绑定、/api/health、匿名会话与页面资源的实际字节。'),table(['环境','PETAL_DB ID','用途'],[['生产','92c62437-5604-46c2-821c-8999cf739d90','既有玩家库，历史名称带 preview；不可因名称交换库'],['预览','9ec11aae-8c72-4e78-a32e-79b9525e7d1d','隔离验收账号与测试存档']]),para('本轮保持角色 version 5 和既有数据库结构，不重建、清空或批量迁移生产存档。页面代码回退不会回退数据库；出现问题优先保留数据与导出，再修复或回退页面。旧页面和新数据之间的兼容性必须单独判断。'),para('开发验证入口：npm ci；npm test；node scripts/build-rules.cjs --check；npm run build:worker；GitHub 完整浏览器工作流。真实站 smoke 使用 tests/browser_live.mjs，并比较手册、保存模块和页面资源；不创建生产云账号。'),para('文档复现：python3 scripts/build-release-handbook.py。需要 PyMuPDF、XeLaTeX、Node、fc-match 及经哈希校验的 Noto CJK 衬线 / 无衬线字体。构建不缩小正文掩盖溢出；新增内容连续分页，历史 354 页的文本和绘制内容流必须保持。'),para('发布回执写明实际提交、部署和检查结果。手册中的版本声明描述软件目标，不预先替代真实发布回执。'))
 eng+=section('S-05 来源与一致性',para('本次运行时文件集指纹 SHA-256：','small'),para(bundle[:32]+'\n'+bundle[32:],'hash'),para('指纹由以下文件的 SHA-256 映射按路径排序后计算，不包含 PDF 自身或会变化的发布回执，避免自引用。文件和完整摘要存于 docs/manual/V5.21_MANUAL_MANIFEST.json。','small'),table(['来源文件','SHA-256（前 24 位）'],[[p,h[:24]] for p,h in source_hashes.items()]),para('历史正文来源：354 页 V5.19 手册页副本。原 Library 文档 SHA-256 为 d2a34c075c4c213c950953a2e1af067691d6afaf53ff1a1f2c2ef25a21ae3732。仓库页副本只用于可复现补编，不携带原整体文档的 Content Credentials；新组合文件不冒用旧文件的签署或生成凭据。','small'),para('官方 Florr 入口与社区研究属于参考，不构成本游戏公式的来源保证。尚未建立完整 Florr 战斗试玩会话，不声称服务器机制一致，不复制其代码、图片、声音或独特资产。','small'))
 guide_doc,gfilled=render(guide,'G',arc);eng_doc,efilled=render(eng,'S',arc)
 cover='<h1>'+tx('Petal Realms 现行手册')+'</h1>'+para('V5.21 / S4 + S5 / 2026-10-27','notice')+para('本卷保留历史 354 页，并增加现行玩家操作和工程补编。先阅读文末的中文玩家手册，再按需要查阅历史数学推导和当前工程规则。旧封面的“候选”“阻断”和生产版本是当时记录，不代表今天的上线状态。')+table(['内容','本文件物理页码'],[['当前版本与阅读说明','1'],['历史规则正文，原编号保留','2-355'],['现行玩家手册','356-'+str(355+len(guide_doc))],['S4 / S5 机制与工程补编',str(356+len(guide_doc))+'-'+str(355+len(guide_doc)+len(eng_doc))]])+para('当前补充重点：存档损坏停止静默重建、有效副本与备份恢复；单合 / 批量 / 此组全合；保存后短演出；风暴眩晕中断冲锋；版本与存档时间一致；隔离预览和发布验收。')+para('软件入口：https://petal-realms.pages.dev/ 。源代码：https://github.com/liuzhide666/Petal-Realms 。帮助面板提供玩家版与完整手册下载。实际发布以 GitHub、Cloudflare 部署和健康接口的相互核对为准。')+para('运行时文件集指纹：','small')+para(bundle[:32]+'\n'+bundle[32:],'hash')+para('历史 354 页不重新冒充当前源码的逐行计数。当前机制目录仍有 143 个稳定标识；已实现、设计提案和待验证内容的身份按目录及补编说明区分。物理手机长时间运行、全面多人战斗和后期经济平衡不在此文档中虚报为完成。','small')
 cover_doc,cfilled=render(cover,'CURRENT',arc);assert len(cover_doc)==1
 full=fitz.open();full.insert_pdf(cover_doc);full.insert_pdf(old);full.insert_pdf(guide_doc);full.insert_pdf(eng_doc)
 full.set_toc([[1,'当前版本说明',1],[1,'历史正文（354 页）',2],[1,'现行玩家手册',356],[1,'S4 / S5 现行机制与工程补编',356+len(guide_doc)]])
 fullpath=out/'Petal_Realms_Handbook.pdf';guidepath=out/'Petal_Realms_Player_Guide.pdf';write(full,fullpath,'Petal Realms V5.21 - Historical foundations and current S4/S5 handbook');write(guide_doc,guidepath,'Petal Realms V5.21 - Player Guide')
 check=fitz.open(fullpath);assert len(check)==355+len(guide_doc)+len(eng_doc)
 for i,p in enumerate(old):
  q=check[i+1];assert p.rect==q.rect and p.get_text()==q.get_text(),f'historical text page {i+1}'
  assert b''.join(old.xref_stream(x) for x in p.get_contents())==b''.join(check.xref_stream(x) for x in q.get_contents()),f'historical drawing stream page {i+1}'
 for doc in [check,fitz.open(guidepath)]:
  assert doc.embfile_count()==0
  for i,p in enumerate(doc):
   if doc is check and 1<=i<=354:continue
   text=p.get_text();assert len(text.strip())>50 and '\ufffd' not in text
   assert not any(0xF600<=ord(c)<=0xF8FF for c in text),'private-use digit mapping in new pages'
   for block in p.get_text('blocks'):
    assert block[0]>=35 and block[2]<=560 and block[1]>=20 and block[3]<=825,(i,block[:4])
 manifest={'version':VERSION,'date':DATE,'historicalPages':354,'guidePages':len(guide_doc),'engineeringPages':len(eng_doc),'completePages':len(check),'retainedHistoricalTextAndDrawingStreams':True,'baselineSha256':EXPECTED_BASE,'runtimeBundleSha256':bundle,'runtimeFiles':source_hashes,'fonts':{n:sha(p.read_bytes()) for n,p in fontpaths.items()},'latinFontSha256':sha(latin.read_bytes()),'pdfs':{p.name:{'bytes':p.stat().st_size,'sha256':sha(p.read_bytes())} for p in [fullpath,guidepath]}}
 (ROOT/'docs/manual').mkdir(parents=True,exist_ok=True);(ROOT/'docs/manual/V5.21_MANUAL_MANIFEST.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:manifest[k] for k in ['version','guidePages','engineeringPages','completePages','runtimeBundleSha256','pdfs']},ensure_ascii=False))
if __name__=='__main__':main()
