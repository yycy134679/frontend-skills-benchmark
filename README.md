# 技能对照册

[English](README.en.md) | 简体中文

用相同的前端需求，对比不使用技能与使用不同前端技能时生成的页面。仓库保存了实际生成的成品、提示词和对照记录，并通过静态画廊展示，方便浏览与选型。

**在线浏览：<https://yycy134679.github.io/frontend-skills-benchmark/>**

部分案例参考了 [Oil UI](https://ui.oiloil.org)。

## 浏览画廊

可以直接打开上面的在线地址。想在本地浏览时，克隆仓库后在仓库根目录运行：

```bash
python3 -m http.server 8765 --directory .
```

在浏览器中打开 [http://localhost:8765/](http://localhost:8765/)。画廊按案例纵向排列，每个案例内横向展示各组结果；点击缩略图即可打开独立成品。部分案例可切换模型查看补充结果。也可以直接打开根目录的 `index.html`，无需构建或安装项目依赖。

目前收录的案例：

- [精品咖啡订阅官网](examples/case-01/对照记录.md)
- [绘本插画师个人网站](examples/case-02/对照记录.md)
- [黑胶播放器](examples/case-03/对照记录.md)
- [Orvo 官网落地页](examples/case-04/对照记录.md)
- [独立开发者个人主页](examples/case-05/对照记录.md)
- [《云烟成雨》歌曲宣传网页](examples/case-06/对照记录.md)
- [22 岁生日祝福网页](examples/case-07/对照记录.md)

各链接指向对照记录，完整需求见 [案例提示词](案例提示词.md)。

## 对比方法

同一案例使用相同提示词和模型，分别运行无技能对照组与各个单技能组；每组在隔离的 Claude Code 进程中生成页面。画廊展示成品、运行信息和页面观察，各案例记录保留更详细的条件与结果。

各组生成完后，由 AI 在浏览器中以桌面宽度打开页面、实际操作交互并阅读源码，按 [评分规则](评分规则.md) 从需求还原、视觉设计、交互与动效、可访问性、代码质量五个维度打分，满分 100。卡片上显示总分和一句评价，分项得分与扣分依据见各案例的评分记录。旧案例正在逐个补评分，尚未评分的卡片仍显示首屏观察。

参与对比的技能包括 [oil-ui](https://github.com/oil-oil/oil-ui)、[frontend-design](https://github.com/anthropics/skills/tree/main/skills/frontend-design)、[impeccable](https://github.com/pbakaus/impeccable)、[design-taste-frontend](https://github.com/leonxlnx/taste-skill) 和 [hallmark](https://github.com/Nutlope/hallmark)。仓库中保存的技能快照、来源与版本见 [前端技能对照库](frontend-skills/README.md)。

> [!NOTE]
> 每组通常只生成一次，结果会受到模型和服务波动影响；并发运行时，各组耗时也不能直接比较。这些案例适合观察差异，不足以给技能排名。跨模型比较还需留意各案例记录中的思考强度和技能快照差异。

## 运行自己的对照

需要安装 Claude Code、Python 3 和 Bash。直连 Anthropic 官方接口时先在命令行登录 claude，`--model` 填官方模型 ID（如 `claude-opus-5-5`）；使用其他兼容 Anthropic 接口的模型服务时，导出 `ANTHROPIC_BASE_URL` 与 `ANTHROPIC_AUTH_TOKEN`。下面以仓库已有的 `oil-ui` 技能为例；将提示词路径和模型名替换为自己的配置：

```bash
bash bench/run.sh \
  --prompt /path/to/case.md \
  --skill oil-ui \
  --skill-dir frontend-skills/oil-ui \
  --model <模型 ID> \
  --out "$HOME/Code/benchmark-runs/example-oil-ui"
```

运行无技能对照组时，去掉 `--skill` 和 `--skill-dir`，其余条件保持一致，并使用另一个输出目录。输出目录必须在仓库之外，以避免生成过程读取已归档的案例和结果。

脚本会保存生成页面、运行信息和会话记录，并核验技能清单、技能调用与实际模型。完整的隔离方式、配置和限制见 [隔离运行指南](bench/README.md)。

## 仓库结构

| 路径 | 内容 |
| --- | --- |
| [index.html](index.html) | 静态画廊首页 |
| [examples/](examples/) | 各案例的成品、对照记录和评分记录 |
| [assets/previews/](assets/previews/) | 画廊使用的首屏截图 |
| [frontend-skills/](frontend-skills/) | 参与对比的上游技能快照 |
| [bench/](bench/) | 隔离运行与结果核验脚本 |
| [评分规则.md](评分规则.md) | AI 评分的维度、分值与评价写法 |
| [案例提示词.md](案例提示词.md) | 案例需求提示词 |
| [产品概要设计.md](产品概要设计.md) | 画廊的产品定位与功能设计 |
| [gallery-prototype/](gallery-prototype/) | 首页设计方向的候选与选定记录 |

## 许可

仓库自有内容（画廊、运行与核验脚本、案例成品与记录）以 [MIT 许可证](LICENSE) 发布。[frontend-skills/](frontend-skills/) 下的技能快照不在此列，各自沿用上游许可证，见各目录内的许可文件和[前端技能对照库](frontend-skills/README.md)。
