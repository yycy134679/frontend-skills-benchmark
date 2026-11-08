import argparse
import glob
import json
import os
import sys
from typing import NoReturn


def fail(message) -> NoReturn:
    print(f"核验失败：{message}", file=sys.stderr)
    sys.exit(1)


def parse_args():
    parser = argparse.ArgumentParser(description="核验一次技能隔离运行")
    parser.add_argument("--cfg", required=True, help="本次运行使用的 CLAUDE_CONFIG_DIR")
    parser.add_argument("--skill", required=True, help="被测技能名，none 表示对照组")
    parser.add_argument("--model", required=True, help="期望使用的模型")
    parser.add_argument("--result", required=True, help="claude 的 JSON 输出文件")
    parser.add_argument("--html", help="生成页面的路径，可选")
    return parser.parse_args()


def load_records(cfg_dir):
    pattern = os.path.join(cfg_dir, "projects", "*", "*.jsonl")
    paths = glob.glob(pattern)
    if not paths:
        fail(f"找不到会话记录：{pattern}")
    records = []
    for path in paths:
        with open(path, encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if not line:
                    continue
                try:
                    records.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
    return records


def skill_names_from_listing(records):
    content = None
    for record in records:
        attachment = record.get("attachment")
        if isinstance(attachment, dict) and attachment.get("type") == "skill_listing":
            content = attachment.get("content") or ""
    if content is None:
        return None
    names = set()
    for line in content.splitlines():
        line = line.strip()
        if not line.startswith("- "):
            continue
        name = line[2:].split(": ")[0].strip()
        if name:
            names.add(name)
    return names


def skill_calls(records):
    calls = []
    for record in records:
        message = record.get("message")
        if not isinstance(message, dict):
            continue
        content = message.get("content")
        if not isinstance(content, list):
            continue
        for item in content:
            if isinstance(item, dict) and item.get("type") == "tool_use" and item.get("name") == "Skill":
                calls.append((item.get("input") or {}).get("skill"))
    return calls


def matches(skill, expected):
    if not skill:
        return False
    return skill == expected or skill.split(":")[-1] == expected


def main():
    args = parse_args()
    records = load_records(args.cfg)

    listed = skill_names_from_listing(records)
    if listed is None:
        fail("会话记录里没有技能清单，无法核验隔离")

    allowed_base = {"plugin-authoring"}
    if args.skill != "none":
        allowed_base |= {args.skill, f"{args.skill}:{args.skill}"}

    unexpected = sorted(
        name for name in listed
        if name not in allowed_base and not (args.skill != "none" and matches(name, args.skill))
    )
    if unexpected:
        fail("技能清单出现了不该出现的技能：" + "、".join(unexpected))

    calls = skill_calls(records)
    if args.skill == "none":
        if calls:
            fail("对照组调用了技能：" + "、".join(str(call) for call in calls))
    elif not any(matches(call, args.skill) for call in calls):
        fail(f"被测技能 {args.skill} 没有被调用，本次不能作为技能组结果")

    with open(args.result, encoding="utf-8") as handle:
        lines = [line for line in handle.read().splitlines() if line.strip()]
    if not lines:
        fail("结果文件为空")
    try:
        data = json.loads(lines[-1])
    except json.JSONDecodeError:
        fail("结果文件的最后一行不是合法 JSON")

    models = list((data.get("modelUsage") or {}).keys())
    if args.model not in models:
        fail(f"实际模型与指定模型不一致，期望 {args.model}，实际 {models}")

    if args.html:
        if not os.path.isfile(args.html):
            fail(f"没有生成页面文件：{args.html}")
        if os.path.getsize(args.html) == 0:
            fail(f"页面文件为空：{args.html}")

    print("隔离核验通过")
    print("技能清单：" + ("、".join(sorted(listed)) if listed else "（空）"))
    print("技能调用：" + ("、".join(str(call) for call in calls) if calls else "（无）"))
    print(f"实际模型：{models}")
    duration_ms = data.get("duration_ms")
    duration = f"{duration_ms / 60000:.1f} min" if isinstance(duration_ms, (int, float)) else "未知"
    print(f"轮次：{data.get('num_turns')}，耗时：{duration}")
    if args.html:
        print(f"页面大小：{os.path.getsize(args.html)} 字节")


if __name__ == "__main__":
    main()
