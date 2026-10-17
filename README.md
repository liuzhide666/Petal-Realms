# Petal Realms · 花瓣之境

基于 HTML、CSS 和 JavaScript 的独立浏览器游戏。当前代码版本：**V5.7（战术怪物、主动技能与动态世界）**。

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

- 正式网址：https://stellular-khapse-5c19f8.netlify.app
- GitHub 仓库：https://github.com/liuzhide666/Petal-Realms
- Netlify 项目：`stellular-khapse-5c19f8`（固定项目 ID：`2b2abcc1-06c1-4098-b0aa-373d2de3caf3`）
- Supabase 项目：`bfipozjqhzsbdvmisoct`；游戏存档表：`public.petal_realms_saves`

## 仓库目录

| 目录 | 用途 |
| --- | --- |
| `site/index.html` | **唯一的线上游戏入口**，Netlify 发布此目录 |
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
- Netlify 站点存在且线上部署为 `ready`；最近核实的生产部署仍来自手动上传（Drop）。**代码上传到 GitHub 不等于已经启用 Netlify 自动部署。**
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

发布步骤和上线前的注意事项见 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)。目录调整历史见 [docs/STRUCTURE.md](docs/STRUCTURE.md)。

> 本次目录整理保留 `site/index.html` 原始 Git Blob 不变，未触碰真实玩家数据或 Supabase 现有表。
