"""从唯一编辑源 index.html 同步设计演示页；--check 只读核对。"""

import argparse
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent


def design_page(source):
    return (source.replace('="assets/', '="../../assets/')
            .replace('="examples/', '="../../examples/')
            .replace('="评分规则.html"', '="../../评分规则.html"'))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="只检查，不写入文件")
    args = parser.parse_args()
    target = ROOT / "gallery-prototype/design-demos/dir-1.html"
    expected = design_page((ROOT / "index.html").read_text(encoding="utf-8")).encode("utf-8")
    if target.exists() and target.read_bytes() == expected:
        print("画廊设计页已同步")
        return 0
    if args.check:
        print("画廊设计页不同步，请运行 python3 bench/sync_gallery.py", file=sys.stderr)
        return 1
    target.write_bytes(expected)
    print("已同步 gallery-prototype/design-demos/dir-1.html")
    return 0


if __name__ == "__main__":
    sys.exit(main())
