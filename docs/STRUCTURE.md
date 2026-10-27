# 当前目录职责

- `site/index.html`：现有 Canvas 2D 游戏与客户端账号／存档界面；唯一游戏页面。公开静态目录仅为 `site/`。
- `site/_headers`：Cloudflare 静态安全与缓存响应头。
- `functions/api/[[path]].js`：Cloudflare 服务器账号、会话、恢复码、限流、存档与受验证的旧云角色迁移。
- `database/cloudflare/`：本游戏专用 D1 结构迁移。
- `database/migrations/`：已应用的历史 Supabase SQL，仅供来源留档，勿盲目重放。
- `wrangler.jsonc`：生产／预览绑定、运行时兼容配置。
- `package.json`、`package-lock.json`：锁定开发与测试工具；没有新增客户端框架。
- `tests/`：静态、API、浏览器回归。运行输出位于被 Git 忽略的 `artifacts/qa/`。
- `docs/qa/`：有版本边界的验证记录；`docs/history/`、`releases/`：历史资料。
- `netlify.toml`：远程旧站退役前的构建停止保护，不是发布入口。

后续随实际修改逐步拆出客户端账号、存档和游戏配置，不整体重写框架。当前单文件体积与客户端权威进度仍是明确的维护／反作弊边界。

- `site/Petal_Realms_{Handbook,Player_Guide}.pdf`：公开完整手册与玩家手册；帮助面板可直接下载。
- `scripts/build-release-handbook.py`、`docs/manual/`：手册生成源、固定工具链与运行时哈希清单。
- `docs/history/Petal_Realms_Manual_V5.19_Pages.pdf`：仅供复现的历史 354 页，不是当前上线状态。
- `scripts/audit-release-files.py`、`docs/qa/V5.21_FILE_AUDIT.json`：全文件结构审计及摘要，排除自引用回执。
