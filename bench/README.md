# 技能基准隔离运行指南

`bench/run.sh` 用独立的 Claude Code 进程运行前端技能，保证技能组与对照组之间只有「挂载了哪个技能」这一处差异。隔离参数曾在 2.1.318 版本上实际跑过；脚本的参数传递和核验逻辑由本地测试及历史日志复核。

## 快速开始

```bash
export ANTHROPIC_BASE_URL=http://127.0.0.1:3425
export ANTHROPIC_AUTH_TOKEN=magpie

bash bench/run.sh \
  --prompt /path/to/case.md \
  --skill frontend-design \
  --skill-dir frontend-skills/frontend-design \
  --model codex/gpt-6.1-terra \
  --out "$HOME/Code/benchmark-runs/coffee-fd"
```

不导出 `ANTHROPIC_BASE_URL` 时脚本直连 Anthropic 官方接口：优先使用 `CLAUDE_CODE_OAUTH_TOKEN`，未设置时从 macOS 钥匙串读取命令行 claude 的登录令牌（需先在命令行登录）。一次性配置目录对应另一个钥匙串条目，隔离进程自己读不到登录状态，所以必须显式传入令牌。在 Claude Code 会话里调用时，会话会注入 `ANTHROPIC_BASE_URL`，需要用 `env -u ANTHROPIC_BASE_URL -u ANTHROPIC_AUTH_TOKEN` 去掉。直连时 `--model` 填官方模型 ID，如 `claude-opus-5-5`。

对照组去掉 `--skill` 与 `--skill-dir`，其余参数保持不变：

```bash
bash bench/run.sh \
  --prompt /path/to/case.md \
  --model codex/gpt-6.1-terra \
  --out "$HOME/Code/benchmark-runs/coffee-control"
```

思考强度用 `--effort` 指定，默认 `high`，写入 `run.meta`；同一案例的技能组与对照组必须使用相同的值。

`--out` 必须是仓库外尚不存在的新目录，连已有空目录也拒绝复用。脚本先解析仓库根与输出路径的符号链接、`..`（包括 macOS 的 `/tmp` 链接），检查通过后才创建目录，并用原子的目录创建防止两个进程认领同一路径。失败重跑换新目录；默认三路并发时，每组使用不同目录，调度器只预建父目录。

默认必须生成非空 `index.html`。多页任务用可重复的 `--require-file` 指定额外必需文件，例如 `--require-file work.html` 或 `--require-file '文章 详情.html'`；文件路径相对输出目录，必须留在目录内。这些参数只影响核验，提示词仍需写明交付要求。

## 隔离的五个层次

| 机制 | 作用 | 实际观察 |
| --- | --- | --- |
| 一次性 `CLAUDE_CONFIG_DIR` | 隔离用户设置、钩子、已安装插件、会话记录 | 用户插件与个人技能不再自动生效 |
| `CLAUDE_CODE_DISABLE_CLAUDE_MDS=1` | 不读取全局 `~/.claude/CLAUDE.md` | 只换配置目录时全局规则仍会注入，模型能复述其中的条目 |
| `CLAUDE_CODE_DISABLE_BUNDLED_SKILLS=1` | 关闭 Claude Code 自带技能 | 内置技能从 13 个降到 1 个，只剩 `plugin-authoring` |
| `--strict-mcp-config` 加空 `mcpServers` | 不加载任何 MCP 服务 | 模型只看见内置工具 |
| `--plugin-dir` 指向单技能插件目录 | 只多出被测技能 | 技能清单只多出 `frontend-design` |

## 必须避开的四个坑

**不要修改 `HOME`。** 把 `HOME` 指向临时目录时，`~/.claude/skills` 下的全部个人技能会进入技能清单。用 `env -i` 清空环境本身没有问题，只要把 `HOME` 设为真实主目录即可。保留真实 `HOME` 时清单只有内置技能。

**只换配置目录不够。** `CLAUDE_CONFIG_DIR` 管不住全局 `CLAUDE.md`，必须同时设置 `CLAUDE_CODE_DISABLE_CLAUDE_MDS`。

**`--safe-mode` 会连插件一起禁用。** 它确实能关掉全部自定义内容，但 `--plugin-dir` 也会失效，技能组无法挂载被测技能。

**`--bare` 会关闭技能机制。** 精简模式下技能清单为空，被测技能无法调用；它还要求使用 `ANTHROPIC_API_KEY` 鉴权，与本地代理的令牌方式不兼容。

## 输出结构

```text
<out>/
  prompt.md                    本次使用的提示词副本
  cfg-<时间戳>-<进程号>/        一次性配置目录，保存会话记录
  plugin/                      仅技能组存在，含被测技能快照
  result.json                  claude 的 JSON 输出
  elapsed_ms                   生成进程的实际运行时间（毫秒）
  index.html                   提示词要求模型生成的页面
  run.meta                     模型、技能、思考强度、轮次、耗时（分钟）、时间与配置目录
```

## 自动核验

`run.sh` 结束前调用 `verify_run.py`，以下任意一项不符就以非零状态退出：

- 结果不是 `is_error: false`、`subtype: success`；
- 结果的 `session_id` 找不到唯一对应的主会话；
- 主会话及关联子代理的 JSONL 有损坏行，或任一技能清单格式无法识别；
- 任一技能清单出现被测技能与 `plugin-authoring` 之外的名称；
- 对照组调用了任何技能；
- 技能组调用了目标技能和 `plugin-authoring` 之外的技能，或目标技能没有出现在清单中；
- 技能调用失败、没有对应返回，或没有 `Launching skill: <实际调用名>` 的成功加载证据；
- 技能组没有成功调用被测技能；
- `result.json` 的模型集合不符合下述显式白名单；
- `index.html` 或 `--require-file` 指定的文件缺失、为空。

主会话位于 `cfg-*/projects/*/<session_id>.jsonl`，关联子代理位于同项目的 `<session_id>/subagents/*.jsonl`。其他会话不能提供调用证据。重复记录的同一技能调用按代理及调用 ID 去重，并与同一代理的返回关联。目标技能名只接受裸名和脚本创建的 `<技能名>:<技能名>`。内置 `plugin-authoring` 保持原有语义：清单允许出现；技能组可调用，但不能替代目标技能；对照组仍要求零技能调用。现有历史运行没有发现对它的实际调用，测试覆盖这两个分支。

生成进程由 `timed_run.py` 使用单调时钟独立计时，耗时覆盖进程启动到退出，不包括隔离准备与核验。核验通过时打印技能清单、技能调用、实际模型、轮次、实测耗时（分钟）与页面大小。`run.sh` 传入 `--meta <out>/run.meta --effort <级别>`，由核验器用已算好的值写元信息，字段、顺序和格式不变；失败时不写。后台代理通知可能触发新一轮处理，此时结果文件的 `duration_ms` 和 `num_turns` 只表示最后一段，轮次从完整主会话记录汇总。旧运行没有 `elapsed_ms` 时，单独核验会显示耗时未知，不采用自报耗时；这种运行不能生成新的元信息。Claude Code 调用第三方模型时统计的费用不准确，脚本不再读取或记录费用。

单独重跑核验默认只读，不指定 `--meta` 就不会改写原始运行目录：

```bash
python3 bench/verify_run.py \
  --cfg /path/to/run/cfg-xxx --skill frontend-design --model codex/gpt-6.1-terra \
  --result /path/to/run/result.json
```

首页默认取 `result.json` 同目录的 `index.html`，也可用 `--html` 显式指定；多页任务同样追加 `--require-file`。历史目录搬迁后，`--cfg` 指向现有配置目录，元信息中原有的绝对路径可能已经过期。

改动 `run.sh`、`timed_run.py` 或 `verify_run.py` 后运行以下测试。集成测试使用假的 `claude`，检查真实 HOME、隔离环境、空 MCP、单技能插件、计时与并发目录认领；核验测试构造成功及失败日志，不调用真实模型：

```bash
python3 -m unittest bench/test_timing.py
python3 -m unittest bench/test_verify_run.py
```

## 模型选择

优先级从高到低为 `--model` 参数、`ANTHROPIC_MODEL` 环境变量、设置文件里的 `model` 字段、Claude Code 默认模型。脚本始终传 `--model`，避免升级后默认模型变化导致结果不可复现。不要设置 `--fallback-model`，模型过载时会自动切换，同一条结果会混入两种模型。

默认要求 `modelUsage` 的模型集合严格等于 `{--model}`。直连官方接口时，Claude Code 可能记录辅助小模型；确认用途后用可重复的 `--allow-extra-model <名称>` 显式允许，`run.sh` 会透传给核验器，例如：

```bash
python3 bench/verify_run.py \
  --cfg /path/to/run/cfg-xxx --skill none --model claude-opus-5-5 \
  --result /path/to/run/result.json \
  --allow-extra-model helper-model-a --allow-extra-model helper-model-b
```

指定的主模型必须出现，辅助模型可以不出现，未显式允许的模型一律拒绝。`run.sh` 默认不传任何辅助模型白名单；不要为了放行样本而把其他生成模型加入名单。

## 画廊同步

`index.html` 是唯一编辑源。修改后运行 `python3 bench/sync_gallery.py` 生成设计演示页，仅改写资源相对路径；运行 `python3 bench/sync_gallery.py --check` 只读核对字节一致性。检查与页面脚本测试使用以下命令：

```bash
python3 -m unittest bench/test_sync_gallery.py
node --test bench/test_gallery.js
```

记录类 Markdown 修改后运行 `python3 bench/render_md.py`，渲染器测试为 `python3 -m unittest bench/test_render_md.py`。所有页面仍是可直接打开的静态文件，没有构建步骤。

## 已知限制

- `plugin-authoring` 不随 `CLAUDE_CODE_DISABLE_BUNDLED_SKILLS` 关闭，它与网页设计无关，两组中同样存在。
- 插件名与技能名相同时，技能清单可能出现 `frontend-design:frontend-design` 这种带命名空间的写法，指向同一个技能。
- 单个样本的轮次与耗时受模型波动影响，比较技能效果时应多轮采样，并在记录里保留 `run.meta` 与 `cfg-*` 会话记录。
- 不同 Claude Code 版本的环境变量与参数可能变化，脚本只保证在 2.1.318 上验证过的行为。
