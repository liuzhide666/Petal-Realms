# Petal Realms · 花瓣之境

基于 HTML、CSS 和 JavaScript 的独立浏览器游戏。当前代码版本：**V5.9.1（安全批量合成与战斗界面回归）**。

## V5.9.1 · 安全批量合成

- 在原合成页面增加**批量尝试（最多 5 次）**，只有同阶同种花瓣库存至少 10 张时才可发起。点击后必须确认本次风险，取消不会消耗道具。
- 逐次验证至少 5 张原料才执行，材料不足立即停止。单次合成和批量合成共用原概率与失败时损失 1–4 张的计算；每批结束只保存一次、展示成功／失败／材料总消耗。
- 不自动把新产出的更高阶花瓣再拿去合成，不修改原十阶稀有度、装备、云存档结构与邮箱验证政策。
- 自动化测试加入确定性概率和库存守恒检查；桌面与手机端检查批量按钮存在与状态。

## V5.9 · 花瓣命中盒、怪物朝向和库存合成体验

- **花瓣直径收敛：** 在世界空间中将花瓣视觉尺寸调整为原来的 80%，命中／障碍交互共用缩放后的碰撞半径；仍遵守 60Hz 固定战斗模拟、十次打击上限及原耐久／装填公式。
- **生物朝向与体型：** 怪物按运动方向平滑转身，头部标记随朝向旋转；蚂蚁、甲虫、飞行昆虫等按类型使用不同宽高的方向性椭圆碰撞轮廓，怪物身体、怪物互推与花瓣攻击不再一律使用完整的外观圆形半径。
- **背包：** 全部品质完整呈现，支持名称搜索、品质过滤、数量／名称／品质排序。A/B 构筑和选定槽位明确标示，原有点击装备、拖拽与旧背包数据保留。
- **合成：** 增加搜索、品质过滤和“仅显示可合成”；操作前提示 5 张原料、成功率、失败时损失 1–4 张的风险。原概率、强制锻造与库存增减算法不变。
- **账号策略恢复邮箱验证：** 注册前检查 Supabase 是否已开启 Confirm Email。注册／找回密码使用 Cloudflare Pages 正式站点回跳；真实邮件投递须另行配置 SMTP 并验证。
- **不变更云存档表及账号主键**，也不修改任何现有用户或背包数据。专项测试见 [V5.9 QA](docs/qa/V5.9_QA.md)。

## V5.7.2 · 注册邮件诊断

- 注册请求已被 Supabase 接收，不等于确认邮件成功投递；前端现在会明确说明这一点。
- 对邮箱发信未授权、SMTP 发信失败提供中文原因和处理建议；登录及旧存档格式不变。
- **面向普通玩家的邮件投递尚未验收。** 必须为 Supabase 配置生产级自定义 SMTP，再实际测试注册、邮件链接、密码重置。
- 操作指南：[邮箱投递诊断与 SMTP 配置](docs/EMAIL_DELIVERY_SETUP.md)。

## Cloudflare Pages 正式主站

**正式游戏地址： https://petal-realms.pages.dev**。Cloudflare Pages 是唯一推荐对外公开的游戏入口；GitHub `main` 负责版本管理和自动发布，输出目录 `site`。V5.7.1 固定主站邮箱回跳地址、标记旧 Netlify 迁移入口、改善自动登录提示，且配置了 Pages 安全响应头和 HTML 缓存复核。

**仍需完成：** 在 Supabase Auth → Email 开启 Confirm Email，并配置可用的自定义 SMTP；之后用真实测试邮箱验收注册验证邮件、密码找回和跨设备云存档。不要清除 Netlify 域名上的 localStorage；两个域名的本地存储彼此独立。详见 [Cloudflare Pages 部署和验收指南](docs/CLOUDFLARE_PAGES.md)。原 Netlify 网站与数据均保留。

## V5.7 · 战术怪物、主动花瓣与动态事件

- **6 种怪物战术：** 有预警的冲锋、施毒减速、预测弹道、召唤增援、范围爆发、护甲强化。等级、地区和精英阶位影响强度，采用本游戏原创平衡系数。
- **5 个新主动技能：** Z 花瓣风暴、V 螺旋散射、F 守护屏障、E 生长治愈、G 花瓣超载，桌面和手机均有快捷操作与冷却。原 Q 闪避、R 双构筑保留。
- **5 个装备协同套装：** 锐袭、堡垒、共生、远程、游猎。2 件/4 件有分级加成，切换 A/B 构筑会重算。
- **5 类随机地图事件：** 群落入侵、稀有花瓣雨、危险狂潮、复苏季风和带落点预警的坠星。
- **P 联机房间（实验）：** 已登录邮箱玩家可以自愿使用 Supabase Realtime 位置房间看到其他玩家的“影子”；尚未共享怪物、伤害、掉落和背包，**不是完整权威多人联机**。详情见 [多人架构和安全边界](docs/MULTIPLAYER_ARCHITECTURE.md)。
- 不更改现有 Supabase 存档表和 RLS，原 V5 角色、装备、十阶稀有度和天赋存档保持兼容。
- QA：[V5.7 测试与未验收事项](docs/qa/V5.7_QA.md)。

## V5.6 · 花朵天赋与地图探索

- 每提升 2 级获得 1 点天赋，生命、伤害、范围、装填、移动、拾取六系可自由分配，每系最多 5 级。键盘 X 或右侧按钮进入天赋面板。
- 每张地图 3 处探索花坛，共 24 处。触发恢复生命、短时疾风或庇护效果，冷却 100 游戏秒，小地图可定位。
- 老存档向后兼容，天赋作为原存档 JSON 的可选字段保存；未改变邮箱登录、数据库结构与十连击规则。
- 测试与限制参见 [V5.6 QA](docs/qa/V5.6_QA.md)。

## V5.5 云端账号默认登录

- **邮箱地址 + 密码**成为默认登录入口；注册需要两次输入密码，至少 8 位。
- 可以选择在当前设备保持登录；通过 Supabase Refresh Token 续签会话，退出时清除本地会话。
- 支持邮件确认回跳、找回密码邮件及设置新密码。
- 旧版浏览器本地账号仍可通过“旧账号入口”访问，**不会自动迁移到云存档**。
- 断网本机快照和 Supabase 版本冲突保护保留，不变更 `public.petal_realms_saves`。
- [V5.5 身份验证 QA](docs/qa/V5.5_QA.md)：本地模拟完成，**真实邮件/跨设备尚未验收**。

## V5.4 玩法更新

- 七秒内连续击杀增加 XP 奖励，最多 +50%；跨地图或死亡会重置连杀。
- 区域守卫低于 35% HP 会进入狂暴阶段，获得更高速度及攻击频率；靠近时显示守卫生命条。
- 小地图标示 epic 及以上战利品，拾取 ultra 及以上品质时提示。
- 原十连击/耐久机制、十阶品质、八张地图和云存档数据格式保持兼容。

回归记录：[V5.4 QA](docs/qa/V5.4_QA.md)。

- **正式主站：** https://petal-realms.pages.dev
- 旧版迁移入口：https://stellular-khapse-5c19f8.netlify.app（暂不删除）
- GitHub 仓库：https://github.com/liuzhide666/Petal-Realms
- Netlify 项目：`stellular-khapse-5c19f8`（固定项目 ID：`2b2abcc1-06c1-4098-b0aa-373d2de3caf3`）
- Supabase 项目：`bfipozjqhzsbdvmisoct`；游戏存档表：`public.petal_realms_saves`

## 仓库目录

| 目录 | 用途 |
| --- | --- |
| `site/index.html` | **游戏唯一源码入口**，Cloudflare Pages 主站和旧 Netlify 兼容站均发布该目录 |
| `tests/` | JavaScript 语法、云存档单元测试、Chromium 烟测 |
| `database/migrations/` | 已执行的 Supabase 迁移留档，勿重复运行 |
| `scripts/` | 指定现有 Netlify Site ID 的手动预览部署脚本 |
| `docs/qa/` | V5.3 QA 记录、历史测试数据和截图 |
| `docs/history/` | 历史版本说明原文 |
| `releases/` | 历史 HTML 和源代码压缩包，仅供存档 |
| `.github/workflows/` | GitHub Actions 自动静态测试 |
| `netlify.toml` | Netlify 发布目录与响应头配置 |

不要将 `releases/`、`tests/` 或 SQL 文件设置为公开网站发布目录。正式发布目录固定为 **`site`**。

## 当前集成状态

- Supabase 游戏表已经创建并启用 RLS，但**不能据此宣称真实邮箱登录、跨设备云存档已验收**。
- Cloudflare Pages 已连 GitHub 并经过真实生产自动部署验证；**Netlify 已降为旧账号／旧本地存档迁移入口**。旧站仍可能有人使用，暂不删除。
- 本仓库目前是 **Public**。发布代码中只允许 Supabase Publishable Key，禁止提交密码、`service_role`、`sb_secret_*`、`.env` 和玩家私密存档。

## 快速测试

需要 Node.js；浏览器测试需要 Python、Playwright 和 Chromium：

```bash
node tests/js_syntax.cjs
node tests/cloud_unit.cjs
python tests/browser_smoke.py
python tests/browser_cloud_auth.py
```

浏览器测试会把生成的新结果写入 `artifacts/qa/`（已 Git 忽略），而 `docs/qa/` 保留历史验收证据。模拟 API 的测试**不是**真实 Supabase 生产读写测试。

正式发布和邮箱回跳验收见 [Cloudflare Pages 主站指南](docs/CLOUDFLARE_PAGES.md)。旧 Netlify 的回滚及迁移管理见 [旧部署说明](docs/DEPLOYMENT.md)。目录调整历史见 [docs/STRUCTURE.md](docs/STRUCTURE.md)。

> Cloudflare 主站切换未删除旧站本地存档、未修改 Supabase 表或账号数据。此版不是服务器权威多人战斗，真实邮件送达和跨设备存档仍需现场验收。
