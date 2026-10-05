# BotPixel

会变形的像素画。来自 [BotHarness](https://github.com/BotHarness/BotHarness) 的两个零依赖小包：

- **`@botharness/pixel-morph`**：任意一组像素变成另一组像素。每个像素按极角配对，沿小弧线跳到目标，并始终对齐网格。只认 `{ x, y, c }`，不限于头像。
- **`@botharness/pixel-avatar`**：按名字生成、可编辑的 32×32 Q 版像素头像，加上 16 个状态符号（思考、读文件、编辑、搜索……），Agent 工作时头像可以变形成这些符号。

用法、原理和贡献方式见 [README.md](README.md)。

已保存的头像不能变：`packages/avatar/test/fixtures/botharness-golden.json` 锁住了每个选项和种子的输出。
