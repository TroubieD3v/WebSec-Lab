"""Stitch the frames from demo-frames.mjs into docs/screenshots/demo.gif (needs Pillow)."""

import json
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
FRAMES = HERE.parent / "test-results" / "demo-frames"
OUT = HERE.parent.parent.parent / "docs" / "screenshots" / "demo.gif"
WIDTH = 880  # README column width; keeps the file small

meta = json.loads((FRAMES / "frames.json").read_text())
images, durations = [], []
for frame in meta:
    image = Image.open(frame["file"]).convert("RGB")
    image = image.resize((WIDTH, round(image.height * WIDTH / image.width)), Image.LANCZOS)
    images.append(image)
    durations.append(max(40, min(frame["ms"], 160)) + frame.get("hold", 0))

# One shared palette keeps colours stable between frames (no flicker in the dark background).
palette = images[len(images) // 2].quantize(colors=128, method=Image.Quantize.MEDIANCUT)
frames = [image.quantize(palette=palette, dither=Image.Dither.NONE) for image in images]
frames[0].save(OUT, save_all=True, append_images=frames[1:], duration=durations, loop=0, optimize=True, disposal=1)
print(f"{OUT} {len(frames)} frames, {sum(durations) / 1000:.1f}s, {OUT.stat().st_size / 1024:.0f} KiB")
