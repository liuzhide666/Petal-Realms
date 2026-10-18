# Cloudflare 发布与迁移

正式站：https://petal-realms.pages.dev/

仓库：liuzhide666/Petal-Realms，生产分支 main，静态目录 site。V5.11 新增 Pages Functions 与 D1。生产是否已到 V5.11，必须读取 Cloudflare 的真实部署 SHA 和状态，不能仅凭仓库文档认定。

## 配置与数据库

`wrangler.jsonc` 是绑定与兼容日期的可复现配置；Pages Git 构建自动编译仓库 `functions/`。

| 环境 | D1 名称 | ID |
| --- | --- | --- |
| 生产 | petal-realms-accounts | 9ec11aae-8c72-4e78-a32e-79b9525e7d1d |
| 预览 | petal-realms-accounts-preview | 92c62437-5604-46c2-821c-8999cf739d90 |

两库均已通过 Cloudflare API 创建，并应用 `database/cloudflare/0001_accounts.sql`。初始结构为 additive/IF NOT EXISTS；不要对后续变更盲目重放或重建数据库。

Pages 构建环境使用 Node.js 24，发布目录 site，构建命令建议 `npm test`。该命令检查静态与 API 回归；浏览器测试由 GitHub Actions 执行。每次合并必须先查该提交 CI 成功；主分支保护是否强制执行须单独核对管理配置，本文不代表已经设置。

仅同步 public 配置，禁止将 Cloudflare API Token、Supabase secret/service_role、密码、会话、恢复码或玩家进度提交到仓库。

## 交付顺序

1. `npm ci`、`npm test`、Worker 编译与浏览器回归成功。
2. 预览部署使用预览 D1；检查 `/api/health` 和 `/api/session`。
3. 在隔离预览账号中验收注册直达、Secure Cookie、双设备保存、冲突、改密、恢复码和旧本机进度迁移；核对实际 CPU/错误，不因本地成功而默认套餐额度足够。
4. CI 成功后合并；核对生产部署 SHA、`uses_functions` 和 D1 绑定。
5. 生产只做无账号的健康／会话检查和页面检查；真实旧云角色由其所有者登录后迁移，不收集其密码。

## 账号、冲突与迁移

账号密码：PBKDF2-SHA256，600000 iterations，随机盐。恢复码为 32 随机字节，仅存其摘要；登录令牌也仅在数据库存摘要。Cookie 使用 HttpOnly/Secure/SameSite=Strict。改密与恢复会增加 credential_version，使旧会话立即失效；所有写入要求相同 Origin 和 JSON，另有持久限流。账号相关请求携带 X-Petal-Account 并与 Cookie 身份比对，防止其他标签页换号后写错角色。同一浏览器同一账号只允许一个持有 Web Lock 的活动标签页；不支持 Web Locks 的旧浏览器可选择本机角色。错误和限流不会授予身份。

保存通过 `expectedRevision` 条件写入；新存档使用 null。冲突返回 409，客户端保留本机待同步记录，不自动强行合并库存。选择云端版本前下载本机备份并另存回退副本；选择本机版本前备份云端，再按读取到的当前版本条件写入。

本机角色迁移仅向空目标云存档写入。旧邮箱角色迁移在服务器验证 Supabase `/auth/v1/user`，再用同一令牌读取受 RLS 保护的存档；旧 UID 绑定与新存档写入为同一 D1 batch，禁止认领其他账号、重复复制及覆盖已有目标。旧 Supabase 存档不会被修改或删除。

## 回退

回退页面代码不会自动回退 D1 数据。V5.10 不认识新 D1 账号，不能把页面降级当成账号恢复。保留当前 D1 和旧 Supabase 数据；必要时暂时关闭新注册／写入并保留进度导出，再前向修复。数据库恢复应先在预览库演练，禁止用旧备份覆盖迁移后新进度。

## 已知后续工作

- 真正多人战斗尚未迁移到 Durable Objects；原房间只是过渡位置预览。
- Supabase 实际邮箱设置不由本轮改变，其项目还承载其他应用。
- Netlify 远程退役在数据迁移后执行，参见 DEPLOYMENT.md。
- 手机原生 Safari/HarmonyOS 长时间运行、真实旧邮箱用户迁移仍需单独验收。

官方依据：
- https://developers.cloudflare.com/pages/functions/bindings/
- https://developers.cloudflare.com/workers/runtime-apis/nodejs/crypto/
- https://developers.cloudflare.com/d1/worker-api/d1-database/
- https://developers.cloudflare.com/workers/platform/limits/
