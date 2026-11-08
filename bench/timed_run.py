"""记录子进程的实际运行时间，保留其输出和退出状态。"""

import subprocess
import sys
import time
from pathlib import Path


def main():
    if len(sys.argv) < 3:
        print("用法：timed_run.py <耗时文件> <命令> [参数...]", file=sys.stderr)
        return 2
    elapsed_file = Path(sys.argv[1])
    start = time.monotonic_ns()
    try:
        result = subprocess.run(sys.argv[2:], check=False)
    finally:
        elapsed_ms = (time.monotonic_ns() - start) // 1_000_000
        elapsed_file.write_text(f"{elapsed_ms}\n", encoding="utf-8")
    return result.returncode if result.returncode >= 0 else 128 - result.returncode


if __name__ == "__main__":
    sys.exit(main())
