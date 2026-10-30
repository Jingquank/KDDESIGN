"""Contact sheet of stills, labelled with their film time, for the visual pass.

    python3 sheet.py <frames-dir> <prefix> <out.png> [columns]

Reads <frames-dir>/<prefix>-<time>.png (as tools/frames.mjs writes them), in time order.
"""
import glob
import os
import sys

from PIL import Image, ImageDraw

folder, pre, out = sys.argv[1], sys.argv[2], sys.argv[3]
cols = int(sys.argv[4]) if len(sys.argv) > 4 else 3
files = sorted(glob.glob(os.path.join(folder, f"{pre}-*.png")),
               key=lambda f: float(os.path.basename(f)[len(pre) + 1:-4].replace("_", ".")))
if not files:
    sys.exit(f"no {pre}-*.png in {folder}")
ims = [Image.open(f).convert("RGB") for f in files]
W = 720 if ims[0].width >= ims[0].height else 360
h = int(ims[0].height * W / ims[0].width)
rows = (len(ims) + cols - 1) // cols
sheet = Image.new("RGB", (cols * W + (cols - 1) * 6, rows * (h + 22)), "#777")
d = ImageDraw.Draw(sheet)
for i, (f, im) in enumerate(zip(files, ims)):
    x, y = (i % cols) * (W + 6), (i // cols) * (h + 22)
    sheet.paste(im.resize((W, h)), (x, y))
    d.text((x + 4, y + h + 4), os.path.basename(f)[len(pre) + 1:-4].replace("_", ".") + " s", fill="white")
sheet.save(out)
print(out, len(ims), "stills")
