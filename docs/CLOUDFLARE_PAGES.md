# Cloudflare Pages — Petal Realms 正式主站

V5.10 起 Cloudflare 是唯一正式入口与邮箱认证回跳地址；默认本机账号不发邮件。`netlify.toml` 的 `ignore = "exit 0"` 用于跳过旧 Netlify 自动构建；没有删除旧站及其浏览器存档。以下首次上线记录属于历史证据，当前生产 SHA 每次发版都需重新读取 Cloudflare 验证。

**状态：Cloudflare Pages 已创建，GitHub 关联成功，V5.7 首次生产构建与部署已通过。** 项目 `petal-realms`，访问域名 https://petal-realms.pages.dev ，部署源为 `liuzhide666/Petal-Realms` 的 `main` 分支。首次成功部署 ID `5510e895-f477-4b2a-8bc4-013f1193d6d3`，对应提交 `2f7331f1c8a3362c3595522a0b4d3cc71fc48069`。该状态由 Cloudflare API 返回；真实手机浏览器及邮箱验证尚待独立验收。

**管理位置：** https://dash.cloudflare.com/2ebb112a603a5703f40ca2a1f6edd263/pages/view/petal-realms



## 1. 已应用的 GitHub 部署配置（供复核或重建使用）

1. 使用自己的 Cloudflare 账户打开 https://dash.cloudflare.com/ ，进入 **Workers & Pages → Create application → Pages → Connect to Git**。
2. 授权 Cloudflare GitHub 应用访问仓库 `liuzhide666/Petal-Realms`，选择该仓库。请选择仅授权所需仓库（可行时）。
3. 部署设置：

| 字段 | 值 |
| --- | --- |
| Framework preset | None（无框架） |
| Production branch | `main` |
| Root directory | 留空（仓库根目录） |
| Build command | 留空 |
| Build output directory | `site` |
| Project name | 推荐 `petal-realms`（若已占用按 Cloudflare 提示选其他名称） |

4. 选择 **Save and Deploy**；务必以 Cloudflare 显示的真实 `https://<project>.pages.dev` 地址为准，不要从项目名猜网址。
5. Pages 会自动部署以后提交到 `main` 的代码，PR 的其他分支可形成预览环境。第一次部署成功后检查 200 状态、登录页面和开发者控制台报错。

官方指南：https://developers.cloudflare.com/pages/get-started/git-integration/

## 2. 账号回跳和 Supabase 设置（重要）

游戏仍使用既有 Supabase 项目 `bfipozjqhzsbdvmisoct`、邮箱密码认证及 `public.petal_realms_saves`，**不要新建空数据库或移走玩家数据**。

V5.7.1 将 **Cloudflare 主站 `https://petal-realms.pages.dev` 固定为新网站（包括预览页）的注册验证／密码重置回跳地址**，防止把一次性邮件链接送到临时预览域名；只有旧 Netlify 的确切正式域名继续使用 Netlify 回跳。但 Supabase Auth 有重定向白名单，必须在 https://supabase.com/dashboard/project/bfipozjqhzsbdvmisoct/auth/url-configuration 手工添加：

- **Redirect URLs**：`https://petal-realms.pages.dev/**`（准确复制此值，不要使用 `https://**.pages.dev/**`）。
- PR 预览的邮件认证也固定回到正式主站，因此不必为每一个随机预览域名添加白名单。
- **正式运营的建议 Site URL**：`https://petal-realms.pages.dev`。修改之前核对其他使用该 Supabase 项目的应用及其默认邮件链接，避免影响兼容系统；现有 Netlify Redirect URL 要继续保留。Supabase 连接器目前没有 Auth URL Configuration 写入能力，该项需要在控制台完成。
- 旧的 `https://stellular-khapse-5c19f8.netlify.app/**` 白名单应保留，直到有明确迁移计划。
- 检查 Email Provider、Confirm Email 和实际 SMTP 发信限制，不要将模拟测试视为真实邮件验收。

官方指南：https://supabase.com/docs/guides/auth/redirect-urls

## 3. 存档与风险

**Cloudflare 与 Netlify 是不同 origin。** 旧站浏览器中尚未上传的 localStorage 存档/账号记录不会自动出现在新域名；切换前在旧站导出备份。已实际同步到 Supabase 的云账号存档在两站用**同一个邮箱账号**登录后才有机会恢复（仍应实测），不要同时在两个域名修改同一角色并忽略冲突提示。

- 公共仓库仅含 Supabase `sb_publishable_*` 客户端公钥，严禁写入 `service_role`、`sb_secret_*`、Cloudflare API Token 等。
- `site/_headers` 提供静态响应头；`netlify.toml` 只负责原 Netlify 发布。
- `site` 目录是**唯一**发布目录，切勿把整个仓库根目录公开（包含旧 SQL、测试结果、ZIP）。
- 此版本的多人房间仍是非权威 Presence 预览，绝不是共享怪物和服务器伤害判定。
- 启用双平台自动发布后，两个独立域名都会指向同一 Supabase 云存档服务，不表示不同设备本地数据自动共享。

## 4. 验收步骤

1. Cloudflare Deploy 状态成功，返回的真实 `pages.dev` 网址可以打开页面。
2. 用受控测试邮箱注册并完成验证邮件的正确域名回跳。
3. 登录后建立测试存档，刷新页面并重新登录检查读取与恢复。
4. 用另一台设备打开 Cloudflare 域名登录并检查数据一致性。
5. 测试密码找回、无效密码提示、账号退出、断网待同步与跨设备冲突保护。
6. 查看 Cloudflare 部署详情的 Commit SHA，确认与 GitHub `main` 完全一致。不要只看绿色构建状态。

## 5. 后续发布

Cloudflare 是正式主站：每次将通过测试的 PR 合并到 GitHub `main` 即可触发 Cloudflare Pages Production 自动部署；需核对部署 SHA、状态及真实浏览器加载。旧 Netlify 当前仅用作历史用户兼容及本地存档迁移，**不得贸然强制转址或删除**。跨域数据迁移和新域名真实邮箱恢复验证完成后再讨论退役旧站。
