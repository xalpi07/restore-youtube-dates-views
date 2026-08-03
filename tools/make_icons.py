#!/usr/bin/env python3
"""
make_icons.py
------------------------------------------------------------------------------
Genera los iconos PNG de la extension (16, 32, 48, 128 px) a partir de codigo,
sin dependencias externas mas alla de Pillow.

Diseno: cuadrado redondeado en rojo YouTube con un reloj blanco (alude a la
restauracion de fechas/tiempo).

Uso:
    python tools/make_icons.py
"""

from __future__ import annotations

import os
from PIL import Image, ImageDraw

# Directorio de salida (../icons respecto a este script)
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "icons")

# Paleta
RED = (204, 0, 0, 255)       # rojo YouTube
WHITE = (255, 255, 255, 255)

# Tamanos requeridos por el manifest
SIZES = (16, 32, 48, 128)

# Supermuestreo para bordes suaves (se dibuja grande y se reduce)
SCALE = 8


def rounded_rect(draw: ImageDraw.ImageDraw, box, radius, fill):
    """Dibuja un rectangulo con esquinas redondeadas."""
    draw.rounded_rectangle(box, radius=radius, fill=fill)


def make_icon(size: int) -> Image.Image:
    """Crea un icono cuadrado del tamano indicado."""
    big = size * SCALE
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Fondo redondeado
    margin = int(big * 0.06)
    rounded_rect(
        draw,
        (margin, margin, big - margin, big - margin),
        radius=int(big * 0.22),
        fill=RED,
    )

    # Reloj: circulo blanco
    cx = cy = big / 2
    r = big * 0.30
    ring = max(2, int(big * 0.05))
    draw.ellipse(
        (cx - r, cy - r, cx + r, cy + r),
        outline=WHITE,
        width=ring,
    )

    # Manecillas (12h -> 3h aprox.)
    hand = max(2, int(big * 0.045))
    # Manecilla larga (hacia arriba)
    draw.line((cx, cy, cx, cy - r * 0.70), fill=WHITE, width=hand)
    # Manecilla corta (hacia la derecha)
    draw.line((cx, cy, cx + r * 0.55, cy), fill=WHITE, width=hand)
    # Punto central
    dot = max(1, int(big * 0.03))
    draw.ellipse((cx - dot, cy - dot, cx + dot, cy + dot), fill=WHITE)

    # Reducir con antialiasing
    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    for size in SIZES:
        icon = make_icon(size)
        path = os.path.join(OUT_DIR, f"icon-{size}.png")
        icon.save(path, "PNG")
        print(f"generado {path}")


if __name__ == "__main__":
    main()
