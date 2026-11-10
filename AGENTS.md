## 仓库用途

前端技能横向对比仓库：用完全相同的提示词与模型，分别在不挂载技能、挂载单个技能的隔离 Claude Code 进程中生成前端页面，把成品与指标归档，供静态画廊展示。根目录 `index.html` 是画廊首页，`bench/` 负责隔离运行与核验，`frontend-skills/` 保存上游技能快照，`examples/` 保存每个案例的成品与对照记录，`assets/previews/` 保存画廊使用的页面截图。

## 常用命令

运行一组生成任务，输出目录必须是仓库外尚不存在的新目录。脚本先解析符号链接与 `..` 后检查位置，再原子创建目录；失败重跑使用新目录：

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

核验默认只读，要求结果成功且有非空 `index.html`；多页案例追加可重复的 `--require-file work.html`。模型默认必须只有 `--model` 指定的一种；官方接口确有辅助模型时，按 [bench/README.md](bench/README.md) 显式追加可重复的 `--allow-extra-model <名称>`，`run.sh` 支持同名参数透传。只有显式指定 `--meta <路径>` 才会写元信息，`--effort` 指定其中的思考强度。

对照记录、评分记录、评分规则、案例提示词与技能库 README 由 Markdown 渲染成同名 `.html`（只用标准库、样式内联），首页链接指向 `.html`。修改任何这些 `.md` 后重新生成并一起提交：

```bash
python3 bench/render_md.py
```

本地预览画廊首页：

```bash
python3 -m http.server 8765 --directory .
```

然后打开 `http://localhost:8765/`。首页的预览图与示例链接都使用相对路径，直接打开 `index.html` 也能浏览，通过本地服务器预览更接近发布环境。

仓库没有构建步骤。运行链路改动后运行 `python3 -m unittest bench/test_timing.py bench/test_verify_run.py`，用假 `claude` 和临时日志验证隔离参数、核验失败路径、计时及并发目录认领，不调用真实模型。渲染器改动后运行 `python3 -m unittest bench/test_render_md.py`。首页改动后运行 `node --test bench/test_gallery.js`、`python3 -m unittest bench/test_sync_gallery.py` 和同步检查，并在 1440 与 375 两个宽度下检查案例轨道、图片与跳转链接。

未另行说明时，同一案例的多组生成默认三路并发：调度脚本写在 `.tmp/` 下（该目录已忽略），同时保持三个生成进程，任一组结束后补入下一组。每组使用各自的新输出目录；调度器只创建父目录，把组目录留给 `run.sh` 原子认领。

## 静态画廊

- 根 `index.html` 是正式首页，采用纵向案例、横向结果轨道的版式，点击缩略图在新标签页打开 `examples/` 下的成品，滚动位置存入 `sessionStorage`。
- `assets/previews/case-NN/<技能目录名>.jpg` 是 1440×900 的首屏截图，由首页直接引用；文件名用 `frontend-skills/` 下的目录名，对照组为 `no-skill`（如 `taste-skill.jpg`，不是 `design-taste-frontend.jpg`）。新增案例时同步补齐截图。
- 部分案例在章节色带上提供模型切换，补充模型的结果放在 `examples/case-NN/<模型>-<思考强度>/<技能目录名>/`，截图放在 `assets/previews/case-NN/<模型>-<思考强度>/<技能目录名>.jpg`（如 `deepseek-v4.1-flash-1017-max/`），对照记录中另起一节记录。
- `index.html` 是首页的唯一编辑源。修改后运行 `python3 bench/sync_gallery.py` 生成 `gallery-prototype/design-demos/dir-1.html`，仅改写资源相对路径；用 `python3 bench/sync_gallery.py --check` 只读检查字节一致性，再运行同步测试。设计演示页由脚本生成并一起提交。
- [gallery-prototype/direction-approved.md](gallery-prototype/direction-approved.md) 记录选定方向与用户原话，[gallery-prototype/directions.md](gallery-prototype/directions.md) 保存全部候选与筛选理由。`gallery-prototype/` 已入库，用于追溯设计过程，不属于归档案例。
- 归档新案例时，需要把成品放进 `examples/case-NN/`，补齐 `对照记录.md` 与 `assets/previews/case-NN/`，运行 `python3 bench/render_md.py` 生成对应 html，按下方「AI 评分」完成评分，再更新首页的案例目录、章节色带、提示词、结果卡片、生成说明与评分说明。
- 首页文案只写用户需要知道的信息：案例不写描述段落，案例目录与色带不写结果数量；生成说明格式为「日期 生成 · Claude Code · 模型展示名 · 思考强度 xx · 完整记录」，用模型展示名（如 GPT-6.1 Terra），不写 `codex/`、`cline/` 等内部路由名。
- 结果卡片写技能名、总分（`.c-score`）、「N 轮 / X min」与一句评价，评价按 [评分规则](评分规则.md) 的「评价写法」。已评分的案例在生成说明下加一行评分说明，格式为「日期 评分 · 评分模型展示名 · 规则 vN · 评分记录」。旧案例正在逐个回填，未评分的卡片暂时保留一句首屏观察，不显示分数。

## AI 评分

规则、分值、档位与评价写法全部在 [评分规则.md](评分规则.md)，改规则要升版本号。一个案例的各组都归档后，由主会话用 Claude Code 内置浏览器直接打开页面验收，不另写截图脚本：

1. 对照提示词写出验收清单，六组共用。
2. 用 `gallery` 预览服务（`.claude/launch.json`）打开 `examples/case-NN/<组>/index.html`，先把六组的首屏看一遍，以无技能组为参照。
3. 逐组只在 1440×900 桌面视口下从头滚到尾查看，不看手机宽度；逐条实际操作清单里的功能项，查看控制台报错，用页面脚本检查横向溢出与对外部地址的请求，切换深色配色与减弱动态效果核对表现。
4. 读源码，重点看核心交互、样式组织、无障碍，以及提示词要求时的移动端适配规则（桌面视口看不到，只凭源码判断），扣分写出 `文件:行号`。内嵌 base64 图片的大文件用 grep 定位后按行段读取。
5. 打分、校准、写评价，产出 `examples/case-NN/评分记录.md`，在 `对照记录.md` 结果表加「AI 评分」列，再更新首页卡片与评分说明。

多页或体积大的案例（如案例 05）一个案例开一个会话评分，避免上下文不够。内置浏览器只在桌面版 Claude Code 中可用。

## 运行链路

`bench/run.sh` 承担全部隔离工作：检查参数与输出真实路径、原子认领新目录 → 复制提示词 → 技能组把技能目录复制成单技能插件（`.claude-plugin/plugin.json` 加上 `skills/<技能名>`）→ 用 `env -i` 启动 `claude -p`，由 `timed_run.py` 独立计时并写入 `elapsed_ms` → 调用 `verify_run.py` 核验，由它使用已计算的轮次、耗时写 `run.meta`。

隔离依赖五层同时生效：一次性 `CLAUDE_CONFIG_DIR`、`CLAUDE_CODE_DISABLE_CLAUDE_MDS=1`、`CLAUDE_CODE_DISABLE_BUNDLED_SKILLS=1`、空 MCP 配置、`--plugin-dir` 只挂载一个技能。`HOME` 必须保留真实主目录，改动 `HOME` 会让 `~/.claude/skills` 下的个人技能全部进入技能清单。细节与失败过的配置写法见 [bench/README.md](bench/README.md)。

`verify_run.py` 按 `result.json` 的 `session_id` 定位主会话与关联子代理，检查所有技能清单、调用和成功返回；损坏日志或无法识别的清单直接失败。目标技能只接受裸名与 `<技能名>:<技能名>`；`plugin-authoring` 允许出现在清单中，也允许技能组调用，但对照组要求零技能调用。核验还要求成功结果、模型集合符合显式白名单、首页与额外必需文件非空。详细参数和兼容说明见 [bench/README.md](bench/README.md)。

## 目录约定

- `examples/case-NN/<技能目录名>-claude-code/`：单个结果的成品目录（对照组为 `no-skill-claude-code`），自包含、无外部依赖，样式与脚本内联，图片内嵌。通常包含 `index.html`；提示词要求多页时还会有 `work.html` 等页面，页面之间用相对链接。
- `examples/case-NN/对照记录.md`：汇总该案例的运行条件、各组指标与页面观察；`examples/case-NN` 的编号递增。
- `examples/case-NN/评分记录.md`：验收清单、各组分项得分与依据、卡片评价，格式见 [评分规则.md](评分规则.md)。
- 原始运行目录（`result.json`、`cfg-*` 会话记录、`run.meta`）放在仓库外的 `~/Code/benchmark-runs/<案例>/`，体积大且只用于追溯，不入库。
- `frontend-skills/` 是上游技能的只读快照，来源仓库、提交号与许可证记录在 [frontend-skills/README.md](frontend-skills/README.md)，不要修改其中的技能内容。
- [评分规则.md](评分规则.md) 是 AI 评分的唯一标准，首页「方法」一节链接它。
- [案例提示词.md](案例提示词.md) 保存各案例的提示词原文；实际运行时在提示词末尾补一段「交付要求」，写明文件名、单文件与内联约束。

## 结果记录

`run.meta` 与 `verify_run.py` 的输出给出模型、技能、思考强度、轮次、耗时与页面大小，耗时统一以分钟（min）记录。Claude Code 调用第三方模型时统计的费用不准确，对照记录与首页都不记录费用。并发运行时单组耗时不可比，必须在 `对照记录.md` 中注明；单次样本受服务波动影响，不能据此判断技能优劣。
