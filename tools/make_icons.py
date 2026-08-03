#!/usr/bin/env python3
"""Generate the PNG icons (16/32/48/128) with Pillow: red square and a clock.
Usage: python tools/make_icons.py"""

from __future__ import annotations

import os
from PIL import Image, ImageDraw

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "icons")
RED = (204, 0, 0, 255)
WHITE = (255, 255, 255, 255)
SIZES = (16, 32, 48, 128)
SCALE = 8  # supersampling for smooth edges


def make_icon(size: int) -> Image.Image:
    big = size * SCALE
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    margin = int(big * 0.06)
    draw.rounded_rectangle(
        (margin, margin, big - margin, big - margin),
        radius=int(big * 0.22),
        fill=RED,
    )

    cx = cy = big / 2
    r = big * 0.30
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), outline=WHITE, width=max(2, int(big * 0.05)))

    hand = max(2, int(big * 0.045))
    draw.line((cx, cy, cx, cy - r * 0.70), fill=WHITE, width=hand)
    draw.line((cx, cy, cx + r * 0.55, cy), fill=WHITE, width=hand)
    dot = max(1, int(big * 0.03))
    draw.ellipse((cx - dot, cy - dot, cx + dot, cy + dot), fill=WHITE)

    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    for size in SIZES:
        icon = make_icon(size)
        path = os.path.join(OUT_DIR, f"icon-{size}.png")
        icon.save(path, "PNG")
        print(f"generated {path}")


if __name__ == "__main__":
    main()
