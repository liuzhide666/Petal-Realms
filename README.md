# Petal Realms · 花瓣之境

当前源码版本：**V5.11 · Cloudflare 云账号与跨设备存档**。正式入口：[petal-realms.pages.dev](https://petal-realms.pages.dev/)。源码：[liuzhide666/Petal-Realms](https://github.com/liuzhide666/Petal-Realms)。源码版本与生产部署状态分别记录；见 [QA](docs/qa/V5.11_QA.md)。

## 游戏账号

默认使用邮箱＋密码注册 Cloudflare 云账号并直接进入，不验证邮箱、不发送邮件。邮箱只作为登录标识；旧游戏名账号仍可登录和恢复。账号和进度通过 Pages Functions 与 D1 管理；注册时显示一次恢复码，忘记密码时用恢复码设置新密码并轮换恢复码。请保存恢复码。改密或恢复会撤销旧会话。

- 浏览器会话使用 HttpOnly、Secure、SameSite=Strict Cookie；不把服务器会话令牌写入 localStorage。
- 本机快照和待同步副本仍保留在浏览器。断网不会自动删除进度，恢复网络后有限次重试。
- 同一浏览器的同一云账号只允许一个活动标签页，避免多个标签页互相覆盖；不支持 Web Locks 的旧浏览器可用本机角色。换设备仍可登录并受云端版本冲突保护。
- 云存档使用版本号条件写入。发生冲突时停止覆盖；重新登录后可导出备份并明确选择云端或本机版本。选择本机版本也需要再次核对当前云端版本。
- 暂停菜单可导出／导入角色进度，并保留导入前回退。进度文件不包含账号密码；恢复码文件与进度文件用途不同。
- 「本机角色（离线）」保留旧本机账号。暂停菜单可以创建或登录一个空的 Cloudflare 云账号，再明确迁移当前角色，原本机数据保留。
- 旧邮箱云账号是过渡兼容入口，仍受原 Supabase 配置影响。迁移由服务器验证其会话并读取其自己的旧云存档，不会仅凭相同邮箱认领角色，不覆盖已有目标云存档。

Cloudflare 原生账号的正常注册、登录和存档不调用 Supabase。旧邮箱认证、旧云角色迁移和原位置房间仍是明确隔离的过渡功能；真实旧云角色迁移需由其所有者登录验收。

## 本批战斗改进

- H 或触屏“环绕”按钮反转花瓣旋转方向，保持当前角度，方便控制接触时机。
- 防御时，本体和每片完整花瓣连续 1.2 秒未受击后，该花瓣每秒修复 6% 耐久；破损花瓣仍须装填。
- 装备槽显示耐久百分比及装填倒计时，换构筑使用实际装填总时长计算进度。
- 这些是围绕花瓣间距与攻防节奏的原创扩充，不宣称复刻 Florr 的全部规则。

## 游戏内容

保留 8 张地图、43 类怪物、27 类花瓣、10 阶品质、6–10 个装备槽、A/B 构筑、六系天赋、地图探索点、主动技能、套装与动态事件。花瓣工坊支持基础属性对比、装备确认、拖动换装、材料保护及有上限的批量合成。旋转椭圆碰撞和保守距离筛选保留；怪物两两遍历仍为 O(n²)。

多人房间目前仍是旧 Supabase 的位置预览，不是共享战斗。真正合作房间、服务器伤害／奖励、生态与平衡完善属于后续里程碑，不能从当前账号迁移推定已经完成。

## 开发与测试

需要 Node.js 24。`npm ci` 安装锁定版本的 Wrangler 开发工具；游戏与账号 API 不依赖第三方运行时库。

```sh
npm ci
npm test
npx wrangler d1 migrations apply PETAL_DB --local
npm run dev
```

浏览器回归需要 Python、Playwright 1.58.0 与 Chromium：

```sh
python -m pip install playwright==1.58.0
python -m playwright install --with-deps chromium
python tests/browser_v59.py
python tests/browser_v510.py
python tests/browser_v511.py
```

V5.11 浏览器测试自行启动**本地** workerd/D1，创建隔离测试账号；不要改成生产地址运行。单元测试中的 SQLite 适配器、真实本地 workerd 测试和 Cloudflare 生产验证是三种不同证据。

## 发布与数据边界

- 唯一发布目录：`site/`；Functions 源码位于 `functions/`，测试、数据库文件和历史 ZIP 不作为静态站点公开。
- 生产与预览使用不同 D1 数据库，配置在 `wrangler.jsonc`。
- 发布步骤见 [Cloudflare 部署指南](docs/CLOUDFLARE_PAGES.md)，旧站退役见 [Netlify 退役清单](docs/DEPLOYMENT.md)。
- 已删除旧 Netlify 手动发布脚本；`netlify.toml` 仅是阻止旧服务构建的临时退役保护。远程旧站已改为全部部署仅限受邀团队访问，停止公开运行；**尚未永久删除或解除仓库关联。**
- 不删除或修改原 Supabase 项目中的其他应用、用户或表。旧游戏存档迁移前后均需保留回退依据。
- 当前进度仍由客户端产生，云存档不构成反作弊证明。不要在此基础上直接开放交易或竞技排行榜。
