#!/usr/bin/env python3
"""Copy the runtime files to a locally loaded (unpacked) extension folder,
e.g. the directory Brave/Chrome loads in developer mode. Keeps that copy in
sync with the repo.

Target folder resolution (first match wins):
  1) command-line argument:  python tools/sync-to-brave.py "C:\\path\\to\\folder"
  2) env var BRAVE_UNPACKED_DIR
  3) tools/.sync-target file (a single line with the path; git-ignored)

After syncing, press the reload button on the extension in brave://extensions.
"""

from __future__ import annotations

import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from package import FILES, ROOT  # reuse the exact runtime file list


def resolve_target(argv: list[str]) -> str:
    if len(argv) > 1 and argv[1].strip():
        return argv[1].strip()
    env = os.environ.get("BRAVE_UNPACKED_DIR")
    if env and env.strip():
        return env.strip()
    cfg = os.path.join(HERE, ".sync-target")
    if os.path.exists(cfg):
        with open(cfg, encoding="utf-8") as fh:
            line = fh.read().strip()
        if line:
            return line
    raise SystemExit(
        "No target folder. Pass it as an argument, set BRAVE_UNPACKED_DIR, or "
        "create tools/.sync-target with the unpacked extension path."
    )


def main() -> None:
    target = resolve_target(sys.argv)
    if not os.path.isdir(target):
        raise SystemExit(f"Target folder does not exist: {target}")

    for rel in FILES:
        src = os.path.join(ROOT, rel)
        if not os.path.exists(src):
            raise SystemExit(f"Missing source file: {rel}")
        dst = os.path.join(target, rel)
        os.makedirs(os.path.dirname(dst) or target, exist_ok=True)
        shutil.copy2(src, dst)

    print(f"Synced {len(FILES)} files to: {target}")
    print("Now press the reload button on the extension in brave://extensions.")


if __name__ == "__main__":
    main()
