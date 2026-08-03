#!/usr/bin/env python3
"""Empaqueta la extensión en dist/ para subir a las tiendas.
El manifest.json queda en la raíz del ZIP (requisito de Chrome y Firefox).
Uso: python tools/package.py"""

from __future__ import annotations

import json
import os
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, "dist")

# Solo archivos de ejecución (nada de docs, tooling ni config de dev).
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
    out = os.path.join(DIST, f"yt-restaurar-fechas-v{version}.zip")

    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zf:
        for rel in FILES:
            src = os.path.join(ROOT, rel)
            if not os.path.exists(src):
                raise SystemExit(f"Falta el archivo: {rel}")
            zf.write(src, rel)  # rel conserva la ruta relativa (icons/...)

    size_kb = os.path.getsize(out) / 1024
    print(f"Generado {out} ({size_kb:.1f} KB, {len(FILES)} archivos)")


if __name__ == "__main__":
    main()
