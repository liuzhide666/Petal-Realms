# Netlify / GitHub / Supabase 部署指南

## 固定目标

- 网站：https://stellular-khapse-5c19f8.netlify.app
- Netlify 项目 ID：`2b2abcc1-06c1-4098-b0aa-373d2de3caf3`
- GitHub：https://github.com/liuzhide666/Petal-Realms
- Supabase：https://supabase.com/dashboard/project/bfipozjqhzsbdvmisoct
- 正式构建分支：`main`；发布目录：`site`；构建命令：留空。

## 首次连接 GitHub 自动部署

打开既有 Netlify 项目 `https://app.netlify.com/projects/stellular-khapse-5c19f8`。在 **Project configuration → Developer settings → Continuous deployment → Repository → Link repository** 中连接仓库 `liuzhide666/Petal-Realms`，分支选 `main`，发布目录选 `site`。

**不要**创建新 Netlify 站点，也不要选择仓库根目录作为发布目录。现有站点原来通过 Drop 手动发布；连接 Git 时可能立刻触发生产构建。在完成真实云端账号验证前，应先检查部署预览、旧玩家存档备份与回退计划。

## 预览和手动发布

`scripts/deploy-existing-site.sh` 始终指定同一个站点 ID：

```bash
sh scripts/deploy-existing-site.sh           # 草稿/预览，不替换生产
sh scripts/deploy-existing-site.sh --prod    # 显式替换生产，谨慎使用
```

需在**你自己已登录 Netlify CLI** 的开发环境执行；仓库不储存登录 Token。Git 自动部署启用后，直接手动推送生产可能被下一次 Git 推送覆盖。

## Supabase 云存档

- 已执行迁移存于 `database/migrations/`。**不要再次应用到同一个项目**。
- 在 Authentication → URL Configuration 核实网站 Site URL 与允许的 Redirect URLs；不要修改其他应用的表。
- 真实登录、邮件验证、首次上传、刷新恢复、跨设备读取、RLS 负向测试、旧 `localStorage` 迁移还需要单独验收。
- 云端存档是客户端权威的测试功能；没有服务端反作弊保障。

## 发版门禁

1. 核实 `site/index.html` 与预期发行版本一致。
2. Node.js 静态检查和单元测试通过，Chromium 测试通过。
3. 在 Netlify Deploy Preview 或草稿地址测试游戏、登录及存档。
4. 备份现有玩家本地存档，确认数据结构迁移。
5. 再将新版发布到原站点并查看部署状态；不得以“上传到 GitHub”代替生产验收。
