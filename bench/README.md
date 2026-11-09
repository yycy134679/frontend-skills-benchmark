# 技能基准隔离运行指南

`bench/run.sh` 用独立的 Claude Code 进程运行前端技能，保证技能组与对照组之间只有「挂载了哪个技能」这一处差异。所有参数都在 2.1.318 版本上实际跑过并核验。

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

`--out` 必须位于仓库之外，脚本会直接拒绝仓库内的路径，避免模型读到案例提示词、基准记录和画廊数据。

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

- 技能清单出现被测技能与 `plugin-authoring` 之外的名称；
- 对照组调用了任何技能；
- 技能组没有实际调用被测技能；
- `result.json` 里的实际模型与 `--model` 不一致；
- 生成了 `index.html` 但文件为空。

生成进程由 `timed_run.py` 使用单调时钟独立计时，耗时覆盖进程启动到退出，不包括隔离准备与核验。核验通过时打印技能清单、技能调用、实际模型、轮次、实测耗时（分钟）与页面大小；`run.meta` 使用同一份耗时。后台代理通知可能触发新一轮处理，此时结果文件的 `duration_ms` 和 `num_turns` 只表示最后一段；脚本改从完整主会话记录汇总轮次。旧运行没有 `elapsed_ms` 时，单独运行核验脚本会显示耗时未知，不把可能偏短的自报耗时当作实测耗时。Claude Code 调用第三方模型时统计的费用不准确，脚本不再读取或记录费用。

计时与轮次汇总有一组集成测试，用假的 `claude` 进程跑完整的 `run.sh`，不调用真实模型。改动 `run.sh`、`timed_run.py` 或 `verify_run.py` 后运行：

```bash
python3 -m unittest bench/test_timing.py
```

## 模型选择

优先级从高到低为 `--model` 参数、`ANTHROPIC_MODEL` 环境变量、设置文件里的 `model` 字段、Claude Code 默认模型。脚本始终传 `--model`，避免升级后默认模型变化导致结果不可复现。不要设置 `--fallback-model`，模型过载时会自动切换，同一条结果会混入两种模型。

## 已知限制

- `plugin-authoring` 不随 `CLAUDE_CODE_DISABLE_BUNDLED_SKILLS` 关闭，它与网页设计无关，两组中同样存在。
- 插件名与技能名相同时，技能清单可能出现 `frontend-design:frontend-design` 这种带命名空间的写法，指向同一个技能。
- 单个样本的轮次与耗时受模型波动影响，比较技能效果时应多轮采样，并在记录里保留 `run.meta` 与 `cfg-*` 会话记录。
- 不同 Claude Code 版本的环境变量与参数可能变化，脚本只保证在 2.1.318 上验证过的行为。
