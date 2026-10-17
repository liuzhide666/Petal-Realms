# Petal Realms · 花瓣之境

基于 HTML、CSS 和 JavaScript 的独立浏览器游戏。当前代码版本：**V5.4（守卫狂暴、连杀与稀有战利品定位）**。

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
