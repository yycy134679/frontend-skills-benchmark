set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

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

while [ $# -gt 0 ]; do
  case "$1" in
    --prompt) PROMPT_FILE="$2"; shift 2 ;;
    --skill) SKILL_NAME="$2"; shift 2 ;;
    --skill-dir) SKILL_DIR="$2"; shift 2 ;;
    --model) MODEL="$2"; shift 2 ;;
    --effort) EFFORT="$2"; shift 2 ;;
    --out) OUT_DIR="$2"; shift 2 ;;
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

case "$OUT_DIR" in
  /*) ;;
  *) OUT_DIR="$PWD/$OUT_DIR" ;;
esac
case "$OUT_DIR/" in
  "$REPO_ROOT"/*) die "输出目录必须位于仓库之外，避免模型读到仓库内的案例与基准文件：$OUT_DIR" ;;
esac
mkdir -p "$OUT_DIR"
OUT_DIR="$(cd "$OUT_DIR" && pwd)"

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

VERIFY_ARGS=(--cfg "$CFG_DIR" --skill "$SKILL_NAME" --model "$MODEL" --result "$OUT_DIR/result.json")
if [ -f "$OUT_DIR/index.html" ]; then
  VERIFY_ARGS+=(--html "$OUT_DIR/index.html")
fi
python3 "$SCRIPT_DIR/verify_run.py" "${VERIFY_ARGS[@]}"

# 多段会话汇总主会话轮次；耗时由外部计时器测量。
read -r TURNS DURATION_MIN < <(python3 - "$SCRIPT_DIR" "$CFG_DIR" "$OUT_DIR/result.json" "$OUT_DIR/elapsed_ms" <<'PY'
import json, sys
sys.path.insert(0, sys.argv[1])
from verify_run import load_records, total_turns
lines = [line for line in open(sys.argv[3], encoding="utf-8").read().splitlines() if line.strip()]
data = json.loads(lines[-1])
turns = total_turns(data, load_records(sys.argv[2]))
ms = int(open(sys.argv[4], encoding="utf-8").read().strip())
print(turns if turns is not None else "unknown", f"{ms / 60000:.1f}")
PY
)

{
  printf 'model=%s\n' "$MODEL"
  printf 'skill=%s\n' "$SKILL_NAME"
  printf 'effort=%s\n' "$EFFORT"
  printf 'turns=%s\n' "$TURNS"
  printf 'duration_min=%s\n' "$DURATION_MIN"
  printf 'date=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  printf 'config_dir=%s\n' "$CFG_DIR"
} > "$OUT_DIR/run.meta"

printf '完成：%s\n' "$OUT_DIR"
