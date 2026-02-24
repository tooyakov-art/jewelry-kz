from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8080)
    parser.add_argument("--directory", type=Path, required=True)
    args = parser.parse_args()

    directory = args.directory.resolve()
    if not directory.exists():
        print(f"directory_not_found: {directory}")
        return 1

    subprocess.Popen(
        [sys.executable, "-m", "http.server", str(args.port), "--directory", str(directory)],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        creationflags=0x00000008 | 0x00000200,
    )
    print(f"started:{args.port}:{directory}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
