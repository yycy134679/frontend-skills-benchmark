# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 仓库用途

前端技能横向对比仓库：用完全相同的提示词与模型，分别在不挂载技能、挂载单个技能的隔离 Claude Code 进程中生成前端页面，把成品与指标归档，供静态画廊展示。根目录 `index.html` 是画廊首页，`bench/` 负责隔离运行与核验，`frontend-skills/` 保存上游技能快照，`examples/` 保存每个案例的成品与对照记录，`assets/previews/` 保存画廊使用的页面截图。

## 常用命令

运行一组生成任务，输出目录必须位于仓库之外：

```bash
export ANTHROPIC_BASE_URL=http://127.0.0.1:3425
export ANTHROPIC_AUTH_TOKEN=magpie
bash bench/run.sh --prompt <提示词文件> --model codex/gpt-6.1-terra --out ~/Code/benchmark-runs/<案例>/<组名>
```

直连 Anthropic 官方接口时不导出上面两个变量（在 Claude Code 会话里还要 `env -u ANTHROPIC_BASE_URL` 去掉会话注入的值），`run.sh` 会读取命令行 claude 的登录令牌，`--model` 填官方模型 ID，如 `claude-opus-5-5`。

技能组追加 `--skill <技能名> --skill-dir frontend-skills/<目录>`，对照组只去掉这两个参数，其余保持一致。思考强度用 `--effort` 指定，默认 `high`；同一案例的各组必须相同。

技能名由技能的 `SKILL.md` 中 `name` 字段决定，与目录名无关：`frontend-skills/taste-skill` 的技能名是 `design-taste-frontend`，挂载时必须使用这个名字。

核验脚本可以单独重跑：

```bash
python3 bench/verify_run.py --cfg <cfg 目录> --skill <技能名|none> --model <模型> --result <result.json> --html <页面>
```

本地预览画廊首页：

```bash
python3 -m http.server 8765 --directory .
```

然后打开 `http://localhost:8765/`。首页的预览图与示例链接都使用相对路径，直接打开 `index.html` 也能浏览，通过本地服务器预览更接近发布环境。

仓库没有构建步骤。唯一的自动测试是 `python3 -m unittest bench/test_timing.py`，用假的 `claude` 进程检查 `run.sh` 的计时与轮次汇总，改动 `run.sh`、`timed_run.py` 或 `verify_run.py` 后运行。其余改动的验证方式是实际跑一组生成任务，查看 `verify_run.py` 的输出与生成的页面；改动首页时，在 1440 与 375 两个宽度下检查案例轨道、图片与跳转链接。

未另行说明时，同一案例的多组生成默认三路并发：调度脚本写在 `.tmp/` 下（该目录已忽略），同时保持三个生成进程，任一组结束后补入下一组。

## 静态画廊

- 根 `index.html` 是正式首页，采用纵向案例、横向结果轨道的版式，点击缩略图在新标签页打开 `examples/` 下的成品，滚动位置存入 `sessionStorage`。
- `assets/previews/case-NN/<技能目录名>.jpg` 是 1440×900 的首屏截图，由首页直接引用；文件名用 `frontend-skills/` 下的目录名，对照组为 `no-skill`（如 `taste-skill.jpg`，不是 `design-taste-frontend.jpg`）。新增案例时同步补齐截图。
- 部分案例在章节色带上提供模型切换，补充模型的结果放在 `examples/case-NN/<模型>-<思考强度>/<技能目录名>/`，截图放在 `assets/previews/case-NN/<模型>-<思考强度>/<技能目录名>.jpg`（如 `deepseek-v4.1-flash-1017-max/`），对照记录中另起一节记录。
- `gallery-prototype/design-demos/dir-1.html` 是首页的设计源文件，与根首页内容同步，仅资源路径不同（`../../assets/`、`../../examples/`）。
- [gallery-prototype/direction-approved.md](gallery-prototype/direction-approved.md) 记录选定方向与用户原话，[gallery-prototype/directions.md](gallery-prototype/directions.md) 保存全部候选与筛选理由。`gallery-prototype/` 已入库，用于追溯设计过程，不属于归档案例。
- 归档新案例时，需要把成品放进 `examples/case-NN/`，补齐 `对照记录.md` 与 `assets/previews/case-NN/`，再更新首页的案例目录、章节色带、提示词、结果卡片与生成说明。
- 首页文案只写用户需要知道的信息：案例不写描述段落，案例目录与色带不写结果数量；生成说明格式为「日期 生成 · Claude Code · 模型展示名 · 思考强度 xx · 完整记录」，用模型展示名（如 GPT-6.1 Terra），不写 `codex/`、`cline/` 等内部路由名；结果卡片只写技能名、「N 轮 / X min」、一句首屏观察，观察从用户视角描述，不写像素测量或实现术语。

## 运行链路

`bench/run.sh` 承担全部隔离工作：检查参数 → 把提示词复制到输出目录 → 技能组把技能目录复制成单技能插件（`.claude-plugin/plugin.json` 加上 `skills/<技能名>`）→ 用 `env -i` 启动 `claude -p`，由 `timed_run.py` 独立计时并写入 `elapsed_ms` → 调用 `verify_run.py` → 从完整会话记录汇总轮次，写 `run.meta`。

隔离依赖五层同时生效：一次性 `CLAUDE_CONFIG_DIR`、`CLAUDE_CODE_DISABLE_CLAUDE_MDS=1`、`CLAUDE_CODE_DISABLE_BUNDLED_SKILLS=1`、空 MCP 配置、`--plugin-dir` 只挂载一个技能。`HOME` 必须保留真实主目录，改动 `HOME` 会让 `~/.claude/skills` 下的个人技能全部进入技能清单。细节与失败过的配置写法见 [bench/README.md](bench/README.md)。

`verify_run.py` 读取 `cfg-*/projects/*/*.jsonl` 会话记录，取出 `skill_listing` 附件与 `Skill` 工具调用，核对四件事：技能清单只含被测技能与 `plugin-authoring`；对照组没有调用任何技能；技能组确实调用了被测技能；`result.json` 的 `modelUsage` 与 `--model` 一致。任一不符即以非零状态退出。

## 目录约定

- `examples/case-NN/<技能目录名>-claude-code/`：单个结果的成品目录（对照组为 `no-skill-claude-code`），自包含、无外部依赖，样式与脚本内联，图片内嵌。通常包含 `index.html`；提示词要求多页时还会有 `work.html` 等页面，页面之间用相对链接。
- `examples/case-NN/对照记录.md`：汇总该案例的运行条件、各组指标与页面观察；`examples/case-NN` 的编号递增。
- 原始运行目录（`result.json`、`cfg-*` 会话记录、`run.meta`）放在仓库外的 `~/Code/benchmark-runs/<案例>/`，体积大且只用于追溯，不入库。
- `frontend-skills/` 是上游技能的只读快照，来源仓库、提交号与许可证记录在 [frontend-skills/README.md](frontend-skills/README.md)，不要修改其中的技能内容。
- [案例提示词.md](案例提示词.md) 保存各案例的提示词原文；实际运行时在提示词末尾补一段「交付要求」，写明文件名、单文件与内联约束。

## 结果记录

`run.meta` 与 `verify_run.py` 的输出给出模型、技能、思考强度、轮次、耗时与页面大小，耗时统一以分钟（min）记录。Claude Code 调用第三方模型时统计的费用不准确，对照记录与首页都不记录费用。并发运行时单组耗时不可比，必须在 `对照记录.md` 中注明；单次样本受服务波动影响，不能据此判断技能优劣。
