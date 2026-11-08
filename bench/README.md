# 技能基准隔离运行指南

`bench/run.sh` 用独立的 Claude Code 进程运行前端技能，保证技能组与对照组之间只有「挂载了哪个技能」这一处差异。所有参数都在 2.1.318 版本上实际跑过并核验。

## 快速开始

```bash
export ANTHROPIC_BASE_URL=http://127.0.0.1:3425
export ANTHROPIC_AUTH_TOKEN=magpie

bash bench/run.sh \
  --prompt /path/to/case.md \
  --skill frontend-design \
  --skill-dir "$HOME/.config/magpie/library/skills/frontend-design" \
  --model codex/gpt-6.1-terra \
  --out "$HOME/Code/benchmark-runs/coffee-fd"
```

对照组去掉 `--skill` 与 `--skill-dir`，其余参数保持不变：

```bash
bash bench/run.sh \
  --prompt /path/to/case.md \
  --model codex/gpt-6.1-terra \
  --out "$HOME/Code/benchmark-runs/coffee-control"
```

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

核验通过时打印技能清单、技能调用、实际模型、轮次、耗时（分钟）与页面大小，可直接写入对照记录。Claude Code 调用第三方模型时统计的费用不准确，脚本不再读取或记录费用。

## 模型选择

优先级从高到低为 `--model` 参数、`ANTHROPIC_MODEL` 环境变量、设置文件里的 `model` 字段、Claude Code 默认模型。脚本始终传 `--model`，避免升级后默认模型变化导致结果不可复现。不要设置 `--fallback-model`，模型过载时会自动切换，同一条结果会混入两种模型。

## 已知限制

- `plugin-authoring` 不随 `CLAUDE_CODE_DISABLE_BUNDLED_SKILLS` 关闭，它与网页设计无关，两组中同样存在。
- 插件名与技能名相同时，技能清单可能出现 `frontend-design:frontend-design` 这种带命名空间的写法，指向同一个技能。
- 单个样本的轮次与耗时受模型波动影响，比较技能效果时应多轮采样，并在记录里保留 `run.meta` 与 `cfg-*` 会话记录。
- 不同 Claude Code 版本的环境变量与参数可能变化，脚本只保证在 2.1.318 上验证过的行为。
