# 前端技能对照库

这里保存用于对照测试的五个前端技能快照，每个目录都可以直接交给 `bench/run.sh` 的 `--skill-dir` 参数挂载。内容按仓库原样保留，只取技能运行所需的文件。

| 目录 | 技能名 | 来源 | 提交 | 许可 | 大小 |
| --- | --- | --- | --- | --- | --- |
| `oil-ui` | `oil-ui` | [oil-oil/oil-ui](https://github.com/oil-oil/oil-ui) | `98187634fc45c934d36f71d050e8773d6bdea83b` | MIT | 2.1 MB |
| `frontend-design` | `frontend-design` | [anthropics/skills · skills/frontend-design](https://github.com/anthropics/skills/tree/main/skills/frontend-design) | `ca45fc496a3436251f191354091d557da31c15b5` | Apache 2.0 | 24 KB |
| `impeccable` | `impeccable` | [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | `c3bb418ee38ee49a6b999b7752c1368f3123a2bd` | Apache 2.0 | 2.2 MB |
| `taste-skill` | `design-taste-frontend` | [leonxlnx/taste-skill](https://github.com/leonxlnx/taste-skill) | `f6b76575f949707b4e3c37cd86cb44b0b98643e8` | MIT | 39 MB |
| `hallmark` | `hallmark` | [Nutlope/hallmark](https://github.com/Nutlope/hallmark) | `407fa689f4a276f2fd389208d271d0fef08f5058` | MIT | 7.1 MB |

## 各技能内容

- **oil-ui**：中文界面设计与评审技能，包含设计方向探索、多风格对比页与截图打磨流程，自带 `references`、`scripts` 与示例资源。
- **frontend-design**：Anthropic 官方前端设计技能，提供视觉方向、字体与布局的判断方法。
- **impeccable**：设计与打磨技能，内置审计、批判、排版、动效等参考文档与检测脚本。快照取自仓库的 `plugin/skills/impeccable` 目录，附带仓库的许可与第三方声明。
- **design-taste-frontend**：反模板化建站技能，包含素材库、参考文档与检查脚本。目录名沿用仓库名 `taste-skill`，技能自身名称是 `design-taste-frontend`。
- **hallmark**：面向新页面的设计技能，附带参考文档与检查脚本。

## 与基准脚本配合

```bash
bash bench/run.sh \
  --prompt /path/to/case.md \
  --skill oil-ui \
  --skill-dir frontend-skills/oil-ui \
  --model codex/gpt-6.1-terra \
  --out "$HOME/Code/benchmark-runs/coffee-oil-ui"
```

`--skill` 填写技能自身的名称，`--skill-dir` 填写上表中的目录。`taste-skill` 的技能名是 `design-taste-frontend`，其余三个与目录名一致。

## 更新方式

```bash
git clone --depth 1 https://github.com/oil-oil/oil-ui.git /path/to/oil-ui
```

重新下载后覆盖对应目录，并把新的提交号写回上表。`impeccable` 取 `plugin/skills/impeccable`，`frontend-design` 取 `skills/frontend-design`，`taste-skill` 取 `skills/taste-skill`，`hallmark` 取 `skills/hallmark`。

快照不包含各仓库的命令行工具、构建配置、测试与示例站点，只保留技能运行所需的 `SKILL.md`、`references`、`scripts` 与 `assets`。
