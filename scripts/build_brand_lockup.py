"""One-time asset build: extract the hero lockup from the revisioned logo art.

Input : "Adamantite (revisioned logo).png" (2560x1440, opaque black background)
Output: public/brand/adamantite-lockup.webp (luminance-keyed alpha, 2x for retina)

The source is neon-on-black, so the mask is a luminance key: alpha = max(R,G,B)
with a low-floor lift so the deep-blue letter fill survives and only true black
dissolves. Colour is boosted slightly to compensate for the semi-transparent
glow pixels. Run from the repo root:  python scripts/build_brand_lockup.py
"""

from __future__ import annotations

import os

from PIL import Image

SRC = "Adamantite (revisioned logo).png"
OUT_DIR = "public/brand"
OUT_NAME = "adamantite-lockup.webp"

# Crop to the lockup band: fingers above, "Adamantite", "Agent" below.
# Source-space coords (2560x1440) chosen by eye against the art; the wordmark
# spans nearly the full source width.
CROP = (48, 176, 2560, 1088)

# The hero renders around 800px wide; 1600 keeps the key crisp at 2x.
TARGET_WIDTH = 1600

# Luminance key: below FLOOR fully transparent, above CEILING fully opaque.
FLOOR = 8
CEILING = 64

COLOR_BOOST = 1.18


def main() -> None:
    src_path = os.path.join(os.pardir, os.pardir, SRC)  # script lives in scripts/
    # Be forgiving about where it is run from: prefer repo root next to this file's parent.
    for candidate in (SRC, src_path):
        if os.path.exists(candidate):
            src_path = candidate
            break

    img = Image.open(src_path).convert("RGB")
    img = img.crop(CROP)
    if img.width > TARGET_WIDTH:
        img = img.resize(
            (TARGET_WIDTH, round(img.height * TARGET_WIDTH / img.width)),
            Image.LANCZOS,
        )

    px = img.load()
    w, h = img.size
    out = Image.new("RGBA", (w, h))
    opx = out.load()

    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            key = max(r, g, b)
            if key <= FLOOR:
                opx[x, y] = (0, 0, 0, 0)
                continue
            if key >= CEILING:
                alpha = 255
            else:
                # Smoothstep between floor and ceiling keeps the halo soft.
                t = (key - FLOOR) / (CEILING - FLOOR)
                alpha = round(255 * t * t * (3 - 2 * t))
            opx[x, y] = (
                min(255, round(r * COLOR_BOOST)),
                min(255, round(g * COLOR_BOOST)),
                min(255, round(b * COLOR_BOOST)),
                alpha,
            )

    os.makedirs(OUT_DIR, exist_ok=True)
    out_path = os.path.join(OUT_DIR, OUT_NAME)
    out.save(out_path, quality=90, method=6)
    print(f"wrote {out_path} ({w}x{h}, {os.path.getsize(out_path) / 1024:.0f} KiB)")


if __name__ == "__main__":
    main()
