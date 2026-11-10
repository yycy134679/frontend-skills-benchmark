"""核验隔离运行，只在显式指定 --meta 时写入元信息。"""

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import NoReturn


def fail(message) -> NoReturn:
    print(f"核验失败：{message}", file=sys.stderr)
    sys.exit(1)


def parse_args():
    parser = argparse.ArgumentParser(description="核验一次技能隔离运行")
    parser.add_argument("--cfg", required=True, help="本次运行使用的 CLAUDE_CONFIG_DIR")
    parser.add_argument("--skill", required=True, help="被测技能名，none 表示对照组")
    parser.add_argument("--model", required=True, help="期望使用的模型")
    parser.add_argument("--allow-extra-model", action="append", default=[], help="允许的辅助模型，可重复")
    parser.add_argument("--result", required=True, help="claude 的 JSON 输出文件")
    parser.add_argument("--html", help="首页路径，默认是结果文件同目录的 index.html")
    parser.add_argument("--require-file", action="append", default=[], help="额外必需文件，相对结果目录，可重复")
    parser.add_argument("--meta", help="核验成功后写入 run.meta 的路径；省略时只读")
    parser.add_argument("--effort", default="high", help="写入元信息的思考强度，默认 high")
    return parser.parse_args()


def load_records(cfg_dir, session_id):
    """只读取结果对应的主会话和其目录下的子代理，路径本身不参与通配。"""
    if not isinstance(session_id, str) or not re.fullmatch(r"[\w-]+", session_id):
        fail("结果缺少有效的 session_id")
    paths = list((Path(cfg_dir) / "projects").glob(f"*/{session_id}.jsonl"))
    if len(paths) != 1:
        fail(f"找不到唯一的主会话记录：{session_id}")
    main = paths[0]
    paths += sorted(main.with_suffix("").glob("subagents/*.jsonl"))
    records = []
    for path in paths:
        with path.open(encoding="utf-8") as handle:
            for number, line in enumerate(handle, 1):
                if not line.strip():
                    continue
                try:
                    record = json.loads(line)
                except json.JSONDecodeError:
                    fail(f"会话记录不是合法 JSON：{path}:{number}")
                if not isinstance(record, dict):
                    fail(f"会话记录不是对象：{path}:{number}")
                # 辅助元数据可以没有 sessionId；不能用别的会话提供核验证据。
                if record.get("sessionId") == session_id:
                    record["_agent"] = path.stem if path != main else record.get("agentId")
                    records.append(record)
                elif record.get("attachment") or record.get("message"):
                    fail(f"会话记录的 sessionId 不匹配：{path}:{number}")
    if not any(not r.get("isSidechain") for r in records):
        fail(f"主会话没有对应记录：{session_id}")
    return records


def skill_names_from_listing(records):
    names = set()
    found = False
    for record in records:
        attachment = record.get("attachment")
        if not isinstance(attachment, dict) or attachment.get("type") != "skill_listing":
            continue
        found = True
        content = attachment.get("content")
        if not isinstance(content, str):
            fail("技能清单格式无法识别")
        for line in content.splitlines():
            if not line.strip():
                continue
            match = re.fullmatch(r"- ([\w-]+(?::[\w-]+)*): .+", line.strip())
            if not match:
                fail("技能清单格式无法识别：" + line)
            names.add(match.group(1))
    if not found:
        fail("会话记录里没有技能清单，无法核验隔离")
    return names


def matches(skill, expected):
    return isinstance(skill, str) and skill in (expected, f"{expected}:{expected}")


def skill_calls(records, expected):
    """同一调用可能重复记入日志；用代理及调用 ID 关联成功返回。"""
    calls, results = {}, {}
    for record in records:
        message = record.get("message")
        content = message.get("content") if isinstance(message, dict) else None
        if not isinstance(content, list):
            continue
        for item in content:
            if not isinstance(item, dict):
                continue
            if record.get("type") == "assistant" and item.get("type") == "tool_use" and item.get("name") == "Skill":
                args = item.get("input")
                skill = args.get("skill") if isinstance(args, dict) else None
                call_id = item.get("id")
                if not isinstance(call_id, str) or not call_id or not isinstance(skill, str):
                    fail("技能调用缺少有效的 ID 或技能名")
                key = (record.get("_agent"), call_id)
                if key in calls and calls[key] != skill:
                    fail("同一技能调用 ID 对应了不同技能")
                calls[key] = skill
            elif record.get("type") == "user" and item.get("type") == "tool_result":
                key = (record.get("_agent"), item.get("tool_use_id"))
                results.setdefault(key, []).append(item)

    allowed = {"plugin-authoring", expected, f"{expected}:{expected}"}
    if expected == "none" and calls:
        fail("对照组调用了技能：" + "、".join(calls.values()))
    for key, skill in calls.items():
        if skill not in allowed:
            fail("调用了不该调用的技能：" + skill)
        returned = results.get(key, [])
        if not returned or any(item.get("is_error", False) is not False for item in returned):
            fail("技能调用失败或缺少返回：" + skill)
        # Claude Code 的成功返回可以省略 is_error，但会明确报告加载的技能名。
        launched = False
        for item in returned:
            content = item.get("content")
            if isinstance(content, list):
                content = "\n".join(
                    block.get("text", "") for block in content
                    if isinstance(block, dict) and block.get("type") == "text"
                )
            if isinstance(content, str) and content.strip() == f"Launching skill: {skill}":
                launched = True
        if not launched:
            fail("缺少技能成功加载的证据：" + skill)
    if expected != "none" and not any(matches(skill, expected) for skill in calls.values()):
        fail(f"被测技能 {expected} 没有被成功调用，本次不能作为技能组结果")
    return list(calls.values())


def total_turns(data, records):
    """多段会话的最终结果仅包含末段轮次，从主会话记录汇总。"""
    if not data.get("result_index"):
        return data.get("num_turns")
    session_id = data.get("session_id")
    turns = sum(
        1 for record in records
        if record.get("type") == "user"
        and record.get("sessionId") == session_id
        and not record.get("isSidechain")
    )
    last_turns = data.get("num_turns")
    if not turns or (isinstance(last_turns, int) and turns < last_turns):
        return None
    return turns


def main():
    args = parse_args()
    with open(args.result, encoding="utf-8") as handle:
        lines = [line for line in handle.read().splitlines() if line.strip()]
    if not lines:
        fail("结果文件为空")
    try:
        data = json.loads(lines[-1])
    except json.JSONDecodeError:
        fail("结果文件的最后一行不是合法 JSON")
    if not isinstance(data, dict) or data.get("is_error") is not False or data.get("subtype") != "success":
        fail("结果没有成功完成（is_error / subtype）")

    usage = data.get("modelUsage")
    if not isinstance(usage, dict):
        fail("结果缺少 modelUsage")
    models = set(usage)
    allowed_models = {args.model} | set(args.allow_extra_model)
    if args.model not in models or models - allowed_models:
        fail(f"实际模型与指定模型不一致，期望 {args.model}，允许辅助模型 {args.allow_extra_model}，实际 {sorted(models)}")

    records = load_records(args.cfg, data.get("session_id"))
    listed = skill_names_from_listing(records)
    allowed_skills = {"plugin-authoring"}
    if args.skill != "none":
        allowed_skills |= {args.skill, f"{args.skill}:{args.skill}"}
    unexpected = sorted(listed - allowed_skills)
    if unexpected:
        fail("技能清单出现了不该出现的技能：" + "、".join(unexpected))
    if args.skill != "none" and not any(matches(skill, args.skill) for skill in listed):
        fail("技能清单缺少被测技能：" + args.skill)
    calls = skill_calls(records, args.skill)

    result_dir = Path(args.result).resolve().parent
    pages = [Path(args.html) if args.html else result_dir / "index.html"]
    for name in args.require_file:
        page = (result_dir / name).resolve()
        if Path(name).is_absolute() or result_dir not in page.parents:
            fail("额外必需文件必须位于结果目录内：" + name)
        pages.append(page)
    for page in pages:
        if not page.is_file():
            fail(f"没有生成页面文件：{page}")
        if page.stat().st_size == 0:
            fail(f"页面文件为空：{page}")

    elapsed_path = result_dir / "elapsed_ms"
    elapsed_ms = None
    if elapsed_path.exists():
        try:
            elapsed_ms = int(elapsed_path.read_text(encoding="utf-8").strip())
            if elapsed_ms < 0:
                raise ValueError("负数耗时")
        except (OSError, ValueError):
            fail(f"实际耗时文件无效：{elapsed_path}")
    duration_min = f"{elapsed_ms / 60000:.1f}" if elapsed_ms is not None else "unknown"
    duration = f"{duration_min} min" if elapsed_ms is not None else "未知（未记录实际运行时间）"
    turns = total_turns(data, records)
    if args.meta:
        if elapsed_ms is None:
            fail("写入 run.meta 需要实际耗时文件")
        fields = {
            "model": args.model, "skill": args.skill, "effort": args.effort,
            "turns": turns if turns is not None else "unknown",
            "duration_min": duration_min,
            "date": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "config_dir": args.cfg,
        }
        Path(args.meta).write_text("".join(f"{key}={value}\n" for key, value in fields.items()), encoding="utf-8")
    print("隔离核验通过")
    print("技能清单：" + ("、".join(sorted(listed)) if listed else "（空）"))
    print("技能调用：" + ("、".join(calls) if calls else "（无）"))
    print(f"实际模型：{sorted(models)}")
    print(f"轮次：{turns if turns is not None else '未知'}，耗时：{duration}")
    print(f"页面大小：{pages[0].stat().st_size} 字节")


if __name__ == "__main__":
    main()
