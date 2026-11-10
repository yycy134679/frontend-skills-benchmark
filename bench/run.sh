set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd -P)"

die() {
  printf '错误：%s\n' "$1" >&2
  exit 1
}

usage() {
  cat <<'USAGE'
用法：
  bash bench/run.sh --prompt <提示词文件> --model <模型> --out <输出目录> [选项]

选项：
  --skill <名称>       一起运行的技能名；不传或填 none 表示无技能对照组
  --skill-dir <目录>   技能目录，必须包含 SKILL.md；指定 --skill 时必填
  --effort <级别>      思考强度，默认 high
  --allow-extra-model <名称>  允许的辅助模型，可重复；默认只允许 --model
  --require-file <文件>      额外必需文件，相对输出目录，可重复
  -h, --help           显示帮助

鉴权（二选一）：
  代理：导出 ANTHROPIC_BASE_URL 与 ANTHROPIC_AUTH_TOKEN
  直连：不导出上面两个变量，使用 CLAUDE_CODE_OAUTH_TOKEN；
        未设置时从钥匙串读取命令行 claude 的登录令牌（需先 claude 登录）

示例：
  export ANTHROPIC_BASE_URL=http://127.0.0.1:3425
  export ANTHROPIC_AUTH_TOKEN=magpie
  bash bench/run.sh \
    --prompt case.md \
    --skill frontend-design \
    --skill-dir frontend-skills/frontend-design \
    --model codex/gpt-6.1-terra \
    --out "$HOME/Code/benchmark-runs/coffee-fd"
USAGE
}

PROMPT_FILE=""
SKILL_NAME="none"
SKILL_DIR=""
MODEL=""
EFFORT="high"
OUT_DIR=""
EXTRA_MODELS=()
REQUIRED_FILES=()

while [ $# -gt 0 ]; do
  case "$1" in
    --prompt|--skill|--skill-dir|--model|--effort|--out|--allow-extra-model|--require-file)
      [ $# -ge 2 ] && [ -n "$2" ] || die "参数 $1 缺少值"
      ;;
  esac
  case "$1" in
    --prompt) PROMPT_FILE="$2"; shift 2 ;;
    --skill) SKILL_NAME="$2"; shift 2 ;;
    --skill-dir) SKILL_DIR="$2"; shift 2 ;;
    --model) MODEL="$2"; shift 2 ;;
    --effort) EFFORT="$2"; shift 2 ;;
    --out) OUT_DIR="$2"; shift 2 ;;
    --allow-extra-model) EXTRA_MODELS+=("$2"); shift 2 ;;
    --require-file) REQUIRED_FILES+=("$2"); shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) die "未知参数：$1" ;;
  esac
done

[ -n "$PROMPT_FILE" ] || die "缺少 --prompt"
[ -f "$PROMPT_FILE" ] || die "提示词文件不存在：$PROMPT_FILE"
[ -n "$MODEL" ] || die "缺少 --model"
[ -n "$OUT_DIR" ] || die "缺少 --out"

if [ "$SKILL_NAME" != "none" ]; then
  [ -n "$SKILL_DIR" ] || die "指定 --skill 时必须同时指定 --skill-dir"
  [ -f "$SKILL_DIR/SKILL.md" ] || die "技能目录缺少 SKILL.md：$SKILL_DIR"
fi

AUTH_ENV=()
if [ -n "${ANTHROPIC_BASE_URL:-}" ]; then
  : "${ANTHROPIC_AUTH_TOKEN:?使用代理时请同时导出 ANTHROPIC_AUTH_TOKEN}"
  AUTH_ENV=(ANTHROPIC_BASE_URL="$ANTHROPIC_BASE_URL" ANTHROPIC_AUTH_TOKEN="$ANTHROPIC_AUTH_TOKEN")
else
  # 一次性 CLAUDE_CONFIG_DIR 对应不同的钥匙串条目，隔离进程读不到登录状态，需显式传入令牌。
  if [ -z "${CLAUDE_CODE_OAUTH_TOKEN:-}" ]; then
    CLAUDE_CODE_OAUTH_TOKEN="$(security find-generic-password -s 'Claude Code-credentials' -a "$USER" -w 2>/dev/null \
      | python3 -c 'import json,sys; print(json.load(sys.stdin)["claudeAiOauth"]["accessToken"])' 2>/dev/null)" \
      || die "未导出 ANTHROPIC_BASE_URL，且读不到命令行 claude 的登录令牌，请先运行 claude 登录"
  fi
  AUTH_ENV=(CLAUDE_CODE_OAUTH_TOKEN="$CLAUDE_CODE_OAUTH_TOKEN")
fi
command -v claude >/dev/null 2>&1 || die "找不到 claude 命令"
command -v python3 >/dev/null 2>&1 || die "找不到 python3 命令"

# 解析现有父目录的符号链接与 ..，通过检查后才创建目录。
OUT_DIR="$(python3 - "$REPO_ROOT" "$OUT_DIR" <<'PY'
from pathlib import Path
import sys
repo, out = (Path(value).resolve() for value in sys.argv[1:])
if out == repo or repo in out.parents:
    sys.exit(f"错误：输出目录必须位于仓库之外：{out}")
print(out)
PY
)"
mkdir -p "$(dirname "$OUT_DIR")"
mkdir "$OUT_DIR" 2>/dev/null || die "输出目录必须是新目录，请换一个路径：$OUT_DIR"

CFG_DIR="$OUT_DIR/cfg-$(date +%Y%m%d-%H%M%S)-$$"
mkdir -p "$CFG_DIR"
cp "$PROMPT_FILE" "$OUT_DIR/prompt.md"

RUN_ARGS=(
  --model "$MODEL"
  --effort "$EFFORT"
  --strict-mcp-config
  --mcp-config '{"mcpServers":{}}'
  --permission-mode bypassPermissions
  --output-format json
)

if [ "$SKILL_NAME" != "none" ]; then
  PLUGIN_DIR="$OUT_DIR/plugin"
  [ -e "$PLUGIN_DIR" ] && die "插件目录已存在，请换一个输出目录：$PLUGIN_DIR"
  mkdir -p "$PLUGIN_DIR/.claude-plugin" "$PLUGIN_DIR/skills"
  cp -RL "$SKILL_DIR" "$PLUGIN_DIR/skills/$SKILL_NAME"
  printf '{"name":"%s","version":"1.0.0","description":"benchmark snapshot"}\n' "$SKILL_NAME" > "$PLUGIN_DIR/.claude-plugin/plugin.json"
  RUN_ARGS+=(--plugin-dir "$PLUGIN_DIR")
fi

PROMPT_TEXT="$(cat "$OUT_DIR/prompt.md")"
cd "$OUT_DIR"

printf '开始运行：模型 %s，技能 %s，输出 %s\n' "$MODEL" "$SKILL_NAME" "$OUT_DIR"

if ! python3 "$SCRIPT_DIR/timed_run.py" "$OUT_DIR/elapsed_ms" env -i \
  PATH="$PATH" \
  HOME="$HOME" \
  CLAUDE_CONFIG_DIR="$CFG_DIR" \
  CLAUDE_CODE_DISABLE_CLAUDE_MDS=1 \
  CLAUDE_CODE_DISABLE_BUNDLED_SKILLS=1 \
  "${AUTH_ENV[@]}" \
  claude -p "$PROMPT_TEXT" "${RUN_ARGS[@]}" > result.json 2>&1; then
  die "claude 执行失败，查看 $OUT_DIR/result.json"
fi

VERIFY_ARGS=(--cfg "$CFG_DIR" --skill "$SKILL_NAME" --model "$MODEL" --result "$OUT_DIR/result.json"
  --meta "$OUT_DIR/run.meta" --effort "$EFFORT")
# macOS Bash 3.2 在 set -u 下不能直接展开空数组。
if [ ${#EXTRA_MODELS[@]} -gt 0 ]; then
  for extra_model in "${EXTRA_MODELS[@]}"; do
    VERIFY_ARGS+=(--allow-extra-model "$extra_model")
  done
fi
if [ ${#REQUIRED_FILES[@]} -gt 0 ]; then
  for required_file in "${REQUIRED_FILES[@]}"; do
    VERIFY_ARGS+=(--require-file "$required_file")
  done
fi
python3 "$SCRIPT_DIR/verify_run.py" "${VERIFY_ARGS[@]}"

printf '完成：%s\n' "$OUT_DIR"
