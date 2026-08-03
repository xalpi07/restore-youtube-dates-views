#!/usr/bin/env python3
"""Package the extension into dist/ for the stores.
The manifest.json stays at the root of the ZIP (required by Chrome and Firefox).
Usage: python tools/package.py"""

from __future__ import annotations

import json
import os
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, "dist")

# Runtime files only (no docs, tooling or dev config).
FILES = [
    "manifest.json",
    "constants.js",
    "utils.js",
    "content.js",
    "options.html",
    "options.js",
    "style.css",
    "icons/icon-16.png",
    "icons/icon-32.png",
    "icons/icon-48.png",
    "icons/icon-128.png",
    "LICENSE",
]


def main() -> None:
    with open(os.path.join(ROOT, "manifest.json"), encoding="utf-8") as fh:
        version = json.load(fh)["version"]

    os.makedirs(DIST, exist_ok=True)
    out = os.path.join(DIST, f"restore-youtube-dates-views-v{version}.zip")

    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zf:
        for rel in FILES:
            src = os.path.join(ROOT, rel)
            if not os.path.exists(src):
                raise SystemExit(f"Missing file: {rel}")
            zf.write(src, rel)  # rel keeps the relative path (icons/...)

    size_kb = os.path.getsize(out) / 1024
    print(f"Generated {out} ({size_kb:.1f} KB, {len(FILES)} files)")


if __name__ == "__main__":
    main()
