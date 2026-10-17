# Petal Realms · 邮箱验证邮件投递与排障

正式游戏：https://petal-realms.pages.dev/  
Supabase 项目：`bfipozjqhzsbdvmisoct`  
主站发布：Cloudflare Pages `main`

## 一、真实检查记录（2026-10-17）

- Supabase Auth 近 24 小时日志存在两次 `mail.send` 事件，不代表 Gmail / QQ / Outlook 等收件箱必然收件。
- 至少两次邮件链接验证返回 `403 Email link is invalid or has expired`（`One-time token not found`），请不要反复点击旧链接。
- Auth 用户汇总为三名用户，其中两名最近 24 小时创建，查询时没有等待邮箱确认的账号。这只能说明数据库整体状态，不能据此确定每一次个人注册是否成功。
- 已连接的 Gmail 搜索（含垃圾邮件）没有发现可确认属于 Petal Realms 注册验证的邮件；若注册使用其他邮箱，必须到对应邮箱查询。
- 尚未取得并验证 Supabase 的自定义 SMTP 配置、发送商投递日志及实际测试邮件回执，**不能宣称邮件已经送达或生产邮件服务可用**。

## 二、当前主要风险

Supabase 提供的默认 SMTP 仅供开发测试。官方说明：若未配置自定义 SMTP，仅允许向 Supabase 项目组织的预授权团队成员邮箱发信，且存在严格限流；向普通玩家开放注册必须配置生产级 SMTP。

官方文档：https://supabase.com/docs/guides/auth/auth-smtp

重复按「注册」不等于强制重发验证邮件。对于已经创建/确认的账号，先尝试登录或申请找回密码。密码重置也依赖相同的 SMTP 发信基础设施；此问题未解决前可能同样失败。

## 三、需要项目管理员完成的配置（现有连接工具不能写 Auth SMTP）

1. 在一个可信邮件服务商开设真实发送账户，取得 SMTP **主机、端口、用户名、密码/受限凭据**。选择支持域名验证与事务邮件的服务，避免直接用私人邮箱作游戏的长期发件源。
2. 为自有域名配置并验证 SPF / DKIM，适当设置 DMARC；使用该验证通过的域名作为 From 地址。**不能把 `pages.dev` 视为自己的可验证发件域名。**
3. 登录 https://supabase.com/dashboard/project/bfipozjqhzsbdvmisoct/auth/smtp ，启用 Custom SMTP，安全填写服务器地址、端口、发件邮箱与凭据。**不要把 SMTP 密码贴入 GitHub、浏览器游戏源码、公开对话或 Pages 环境变量。**
4. 进入 https://supabase.com/dashboard/project/bfipozjqhzsbdvmisoct/auth/url-configuration ，确认 Site URL 为 `https://petal-realms.pages.dev`（若其他应用依赖旧 URL，先评估）；允许 Redirect URLs 包括 `https://petal-realms.pages.dev/**`，并暂时保留旧 Netlify 域名供迁移。
5. 在 https://supabase.com/dashboard/project/bfipozjqhzsbdvmisoct/auth/providers 检查 Email provider 已启用及邮箱确认策略。推荐正式运营要求邮箱确认，不要为了规避发信故障直接关闭验证。
6. 不要在短时间内频繁重复发送，以免触发供应商和 Auth 的冷却限制。使用**新的受控测试邮箱**仅发送一次注册验证邮件，在供应商后台核对 accepted/delivered/bounced/suppressed；检查收件箱与垃圾邮件；首次验证后返回 Cloudflare 正式主站登录。
7. 验证找回密码、过期邮件链接提示、双设备重新登录、云存档读取与冲突保护，之后才认定正式验收。

## 四、V5.7.2 前端改善

- 保留原有邮箱+密码注册与登录接口，不触碰密码或玩家存档。
- Supabase 返回成功注册响应但不包含可用会话时，明确说明「请求已受理，不代表邮件已经送达」，而非暗示发信成功。
- 对邮箱未获授权（`email_address_not_authorized` 等）及邮件发送失败显示具体中文处理说明。
- 自动化回归保护登录、注册、Cloudflare 邮件回跳和已有存档系统。

## 五、验收与安全边界

GitHub CI / Cloudflare 构建成功只能证明前端与静态资源的发布完成，**不能替代 SMTP 真实投递验收**。这次不修改 Supabase Auth SMTP、用户表、角色存档或表的 RLS。请勿复制任何验证 URL 内的 token 或验证码到日志和公开反馈。
