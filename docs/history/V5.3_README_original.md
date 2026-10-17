# Petal Realms V5.3 — cloud recovery preview

**目标：** 在同一个 Netlify 站点更新，不改变 `https://stellular-khapse-5c19f8.netlify.app`。

- 固定 Netlify Site ID：`2b2abcc1-06c1-4098-b0aa-373d2de3caf3`
- 上次经连接器核实的线上部署：`6ad2229bd10bcedfa6c6d6a4`（手动 Drop；`ready`）。**本包尚未发布到 Netlify。**
- Supabase 项目：`bfipozjqhzsbdvmisoct`，游戏表 `public.petal_realms_saves` 已建且已启用 RLS（与其他应用分表）。
- GitHub 身份：`liuzhide666`。当前可访问仓库仅 `Windesk`（**无关项目，不要提交**）；本包尚未提交 GitHub。

## 本轮代码修正

1. 云端异常时，把未同步完整快照连同基线 `revision` 保存到浏览器本地；不是只保存一个标志位。
2. 再次登录时：只有云端 `revision` 与本地原基线相同时才自动续传；有差异时停止覆盖，并保留本地与云端两份状态。
3. 云端写入期间又产生新存档时，写入失败不会让旧快照覆盖内存/本地中更新的快照。
4. Postgres BIGINT `revision` 转安全整数，拒绝异常值。
5. 增加「导出本机云存档备份」按钮；仅导出当前识别的云端账号的存档，不导出密码、令牌。
6. 页面进入后台或关闭时先保存本地；恢复网络后尝试续传。保留 V5.2 离线账号系统作为回退。

**目前仍是客户端权威的单机游戏**，不能用于具有经济利益的物品交易、公共排行榜。正式推广前应把关键奖励和物品变更置于服务端权威交易中。

## 发布到原 Netlify 站点（不是创建新站点）

1. 打开 `https://app.netlify.com/projects/stellular-khapse-5c19f8` → **Deploys**。
2. 将 `Petal_Realms_V5_3_Netlify.zip` 解压；把得到的**只含 index.html 的文件夹**拖到**当前站点 Deploys 页的部署区域**。不要到 Netlify Drop 创建新项目。
3. 核对新部署 `ready` 且部署 ID 已发生变化，再用原网址测试页面。
4. 对于长期维护，建议先建立独立私有 GitHub `Petal-Realms` 仓库，再把本工程包内容提交到 `main`；在原 Netlify 站点关联仓库，Publish directory 为 `site`，无需 build command。`.netlify/` 已加入 `.gitignore`。
5. 切换 Git 自动部署前请先检查已有手动生产版本；后续推送默认生产分支会代替手动发布版本。

如在你自己的已登录终端使用 Netlify CLI，运行 `./deploy-existing-site.sh` 会生成**草稿部署**（不替换正式版本）。运行 `./deploy-existing-site.sh --prod` 才可能替换正式版本，请先测试草稿并确认站点 ID。

## Supabase Authentication 配置与数据迁移

- 在 Supabase Dashboard → **Authentication → URL Configuration** 检查 **Site URL** 和 Redirect URLs，允许精确的正式 HTTPS 网址 `https://stellular-khapse-5c19f8.netlify.app`。当前没有通过插件修改此设置。
- 首次使用新邮箱创建一个受控测试账号并完成邮件验证，然后验证首次读写、重新登录、另一设备读取、冲突恢复；这些真实端到端环节**尚未测试**。
- 旧本地账号的进度不会自动导入云端。务必在旧站点同一 origin 上备份 localStorage，设计显式导入和授权确认流程后再迁移。
- `sql/` 目录记录**已执行**的 Supabase 数据库迁移，勿在现有项目重跑。
- 只允许 Publishable Key 出现在静态 HTML，绝不在前端放入 Secret / Service Role Key。

## 复核

```bash
node tests/js_syntax.cjs
node tests/cloud_unit.cjs
python tests/browser_smoke.py
python tests/browser_cloud_auth.py
```

浏览器测试使用 Chromium 的模拟环境和模拟 Supabase API，不能替代真实域名、HTTPS、真实邮箱与跨设备端到端验收。
