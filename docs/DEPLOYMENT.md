# Netlify 退役清单

Cloudflare 是唯一正式发布目标：https://petal-realms.pages.dev/ 。不要重新启用 Netlify 发布或把新版本手工推回旧站。

## 当前事实

旧项目 stellular-khapse-5c19f8，Site ID 2b2abcc1-06c1-4098-b0aa-373d2de3caf3，仍有 V5.8 ready 部署，SHA 62bc03ce7f836b0e7da2a86d612d5ed99025bb97。

本次删除仓库手动 Netlify 部署脚本，移除现行双平台发布说明。`netlify.toml` 暂时仅保留 `ignore = "exit 0"` 防止旧连接意外继续构建；它不是旧站删除回执。

## 顺序

1. 保存旧站部署和配置的回退依据。
2. 旧站域名与 Cloudflare 域名的 localStorage 不互通。先为尚未上传的旧角色提供导出／迁移；不能假设两条 Supabase 云存档涵盖所有浏览器中的本地进度。
3. 旧邮箱角色在 Cloudflare 的旧邮箱入口登录，并迁移到新的空游戏账号。未确认身份不能因邮件限流而认领旧角色。
4. 完成数据迁移验收后，解除**该项目**的 Netlify 仓库连接、构建和部署钩子；不要撤销影响其他项目的整个组织集成。
5. 退役／删除该旧站，检查相关域名和回调；移除仓库的 Netlify 构建停止配置。
6. Supabase 回调白名单与全局认证策略可能影响同项目其他应用，需按应用检查，不能直接清空项目配置。

当前 Netlify 连接器没有删除站点或解除仓库关联的操作。远程退役尚未执行；不能用删除本地文件冒充平台操作成功。当前界面入口是 https://app.netlify.com/projects/stellular-khapse-5c19f8 。

历史 Netlify ZIP 与 QA 仅作为发布来源保留，不作为有效部署配置。


### 2026-10-18 实际退役状态

Netlify 所有部署现已启用受邀团队登录限制，旧生产地址公开访问显示 `This site is private`，不再向访客提供旧游戏。Cloudflare 为公开运行基准。历史部署保留，永久删除和仓库解绑尚未完成，构建停止保护仍需保留。Google 登录回调报 `Invalid state key`，没有据此声称后台退役已全部完成。
