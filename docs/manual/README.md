# V5.21 手册源与复现

网站帮助面板提供 [完整手册](../../site/Petal_Realms_Handbook.pdf) 和 [玩家手册](../../site/Petal_Realms_Player_Guide.pdf)。完整手册 365 页：当前说明 1 页、保留历史 354 页、玩家版 6 页、工程补编 4 页。旧封面、旧源码计数和旧部署状态仅适用于相应历史版本。

`scripts/build-release-handbook.py` 从现行配置读取 29 类花瓣、43 种生物、8 个区域、品质、天赋及槽位，结合脚本中的说明生成 PDF。历史页副本见 `docs/history/Petal_Realms_Manual_V5.19_Pages.pdf`；它去除了原文档整体 Content Credentials 附件，不能冒用旧凭据证明新组合文件。

复现环境：Python 3、PyMuPDF **1.26.6**、Node **24.22.1**、XeLaTeX **TeX Live 2023**，以及 fontspec、geometry、longtable、array、booktabs、fancyhdr、hyperref、needspace。字体使用 Noto Sans CJK SC、Noto Serif CJK SC、DejaVu Sans；CJK 原始字体 SHA-256 固定在构建脚本中，缺失或不同会停止，不能静默替换。

```sh
python3 scripts/build-release-handbook.py
node tests/manual_integrity.cjs
```

生成清单记录运行时全部来源哈希、字体和两个 PDF 的摘要。完整手册逐页比对历史正文的提取文本与解码绘制流；新增页检查字体映射、文字边界和 TeX 溢出。表格续页重复表头，第二张花瓣目录从新页开始。相同已验证工具链连续两次构建得到完全相同字节；不承诺不同 TeX / 字体 / PyMuPDF 版本之间的字节一致。

`--output-dir artifacts/manual/rebuild` 可输出第二份用于复核。新增页仍须渲染后人工检查，结构检查不能替代排版验收。CI 检查成品与代码的哈希一致性，不安装整个文档工具链。
