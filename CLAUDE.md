# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 仓库用途

前端技能横向对比仓库：用完全相同的提示词与模型，分别在不挂载技能、挂载单个技能的隔离 Claude Code 进程中生成前端页面，把成品与指标归档，供静态画廊展示。`bench/` 负责隔离运行与核验，`frontend-skills/` 保存上游技能快照，`examples/` 保存每个案例的成品与对照记录。

## 常用命令

运行一组生成任务，输出目录必须位于仓库之外：

```bash
export ANTHROPIC_BASE_URL=http://127.0.0.1:3425
export ANTHROPIC_AUTH_TOKEN=magpie
bash bench/run.sh --prompt <提示词文件> --model codex/gpt-6.1-terra --out ~/Code/benchmark-runs/<案例>/<组名>
```

技能组追加 `--skill <技能名> --skill-dir frontend-skills/<目录>`，对照组只去掉这两个参数，其余保持一致。

技能名由技能的 `SKILL.md` 中 `name` 字段决定，与目录名无关：`frontend-skills/taste-skill` 的技能名是 `design-taste-frontend`，挂载时必须使用这个名字。

核验脚本可以单独重跑：

```bash
python3 bench/verify_run.py --cfg <cfg 目录> --skill <技能名|none> --model <模型> --result <result.json> --html <页面>
```

仓库没有构建步骤与单元测试，改动后的验证方式是实际跑一组生成任务，查看 `verify_run.py` 的输出与生成的页面。

未另行说明时，同一案例的多组生成默认三路并发：调度脚本写在 `.tmp/` 下（该目录已忽略），同时保持三个生成进程，任一组结束后补入下一组。

## 运行链路

`bench/run.sh` 承担全部隔离工作：检查参数 → 把提示词复制到输出目录 → 技能组把技能目录复制成单技能插件（`.claude-plugin/plugin.json` 加上 `skills/<技能名>`）→ 用 `env -i` 启动 `claude -p` → 调用 `verify_run.py` → 写 `run.meta`。

隔离依赖五层同时生效：一次性 `CLAUDE_CONFIG_DIR`、`CLAUDE_CODE_DISABLE_CLAUDE_MDS=1`、`CLAUDE_CODE_DISABLE_BUNDLED_SKILLS=1`、空 MCP 配置、`--plugin-dir` 只挂载一个技能。`HOME` 必须保留真实主目录，改动 `HOME` 会让 `~/.claude/skills` 下的个人技能全部进入技能清单。细节与失败过的配置写法见 [bench/README.md](bench/README.md)。

`verify_run.py` 读取 `cfg-*/projects/*/*.jsonl` 会话记录，取出 `skill_listing` 附件与 `Skill` 工具调用，核对四件事：技能清单只含被测技能与 `plugin-authoring`；对照组没有调用任何技能；技能组确实调用了被测技能；`result.json` 的 `modelUsage` 与 `--model` 一致。任一不符即以非零状态退出。

## 目录约定

- `examples/case-NN/<技能名>-claude-code/index.html`：单文件成品，样式与脚本内联，图片内嵌。案例编号递增，同目录的 `对照记录.md` 汇总运行条件与指标。
- 原始运行目录（`result.json`、`cfg-*` 会话记录、`run.meta`）放在仓库外的 `~/Code/benchmark-runs/<案例>/`，体积大且只用于追溯，不入库。
- `frontend-skills/` 是上游技能的只读快照，来源仓库、提交号与许可证记录在 [frontend-skills/README.md](frontend-skills/README.md)，不要修改其中的技能内容。
- [案例提示词.md](案例提示词.md) 保存各案例的提示词原文；实际运行时在提示词末尾补一段「交付要求」，写明文件名、单文件与内联约束。
- `gallery-prototype/` 当前未被 Git 跟踪，由画廊工作线维护，不要当作已归档案例。

## 结果记录

`run.meta` 与 `verify_run.py` 的输出给出模型、技能、思考强度、轮次、耗时、费用与页面大小。并发运行时单组耗时不可比，必须在 `对照记录.md` 中注明；单次样本的费用受服务波动影响，不能据此判断技能优劣。
