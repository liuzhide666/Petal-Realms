# 仓库目录规范与本次归档

## 整理原则

1. `site/` 为唯一公开发布根目录，目前只有 `index.html`；配置由根目录 `netlify.toml` 读取。
2. 测试源码进 `tests/`，运行生成的临时截图和 JSON 进 `artifacts/qa/`（不纳入 Git）。
3. 旧版报告、截图、SQL、压缩包分离保存，不把历史资料误当现行线上版本。
4. 过去的根目录 `index.html` 与 `site/index.html` Blob SHA 完全相同，因此仅保留后者作为有效入口；原始重复文件仍可从 Git 历史恢复。
5. `docs/history/` 存放历史 README 原文，**其中关于当时仓库和部署的描述已过时**。

## 重要文件

- `releases/v5.2/Petal_Realms_V5_2.html`：V5.2 参考版
- `releases/v5.3/Petal_Realms_V5_3_Source.zip`：V5.3 历史源代码包
- `docs/qa/V5.3_QA.md`：原有 QA 声明（模拟与真实验收需区分）
- `docs/qa/browser_qa_v5.3.json`：当时的浏览器烟测结果
- `docs/qa/screenshots/`：V5.3 历史截图
- `database/migrations/20261017053742_create_petal_realms_saves_v1.sql`：已应用的数据库迁移

**安全提示**：当前仓库是公开的。今后源文件仅允许公开配置，不得提交密钥、用户存档或浏览器 Token。
