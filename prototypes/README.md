# 前端技能对比画廊

在项目根目录启动服务后，访问 [画廊首页](http://127.0.0.1:8765/)：

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

默认采用纸感设计刊物风格。上下浏览案例，点击截图在新标签页体验完整页面；展开案例信息可以查看和复制原始提示词，并了解模型、生成工具、思考强度和日期。

当前收录三个案例的无技能基准与 Anthropic `frontend-design` 单技能对照：寻常科技「加入我们」、同频 SaaS 官网、林间个人作品集。由 pi 使用 `command-code/deepseek-deepseek-v4.1-flash-fast`、`high` 独立生成，成品位于 `examples/case-01` 至 `case-03` 的 `no-skill-pi` 与 `frontend-design-pi` 目录。两个版本使用相同案例提示词、模型与思考强度；技能对照仅额外读取指定技能快照。

技能来源：[Anthropic frontend-design](https://github.com/anthropics/skills/tree/main/skills/frontend-design)。固定提交及许可保存在 `docs/技能快照/frontend-design/`，生成记录位于 `docs/基准生成记录/`。

## 加入对照版本

在 `gallery-data.js` 对应案例的 `versions` 中追加版本，填写名称、页面入口、截图、模型、生成日期、技能版本及 GitHub 仓库地址。基准版始终排在首位，各案例的技能顺序保持一致。

截图统一使用 1440 × 960 桌面首屏。单个版本放大展示；两个版本在桌面并排，手机支持横向滑动；更多版本沿用横向画廊及左右箭头。

## 文件入口

- `gallery.html`：画廊页面，默认纸感设计刊物风格。
- `gallery-data.js`：案例提示词与真实版本数据。
- `gallery.js`：卡片、复制提示词和浏览位置记忆。
- `index.html`：三种展示风格的入口；另外两种保留作参考。
- `demo.html` 与旧截图：早期示意素材，不进入当前画廊。

视觉规范见项目根目录的 `DESIGN.md`。
