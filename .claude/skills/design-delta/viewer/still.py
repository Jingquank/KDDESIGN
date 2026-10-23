"""Encode captured screenshots as Design Changelog stills.

    python3 still.py <capture.png> <out.avif> [<capture.png> <out.avif> ...]

A still is at most 960px wide (a side-by-side pane shows about 600 CSS px, so
960 covers a 1.6x screen), keeps its aspect ratio and full height, and is AVIF
at quality 45. On the devpage run this cut 40 stills from 2.2 MB (WebP q78 at
capture width) to 1.0 MB with no difference visible at display size. When
Pillow cannot write AVIF, it writes WebP at quality 70 next to the requested
path and prints that path, so delta.json must use the printed name.
"""
import sys
from pathlib import Path

from PIL import Image, features

MAX_W, AVIF_Q, WEBP_Q = 960, 45, 70


def encode(src: Path, out: Path) -> Path:
    im = Image.open(src).convert("RGB")
    if im.width > MAX_W:
        im = im.resize((MAX_W, round(im.height * MAX_W / im.width)), Image.LANCZOS)
    out.parent.mkdir(parents=True, exist_ok=True)
    if features.check("avif"):
        im.save(out, "AVIF", quality=AVIF_Q, speed=4)
        return out
    out = out.with_suffix(".webp")
    im.save(out, "WEBP", quality=WEBP_Q, method=6)
    return out


def main() -> None:
    args = sys.argv[1:]
    if not args or len(args) % 2:
        sys.exit(__doc__)
    for src, out in zip(args[::2], args[1::2]):
        p = encode(Path(src), Path(out))
        print(f"{p} {p.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
