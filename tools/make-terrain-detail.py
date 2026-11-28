"""Crop NASA Blue Marble's August 2004 topography into overlapping close-zoom regions.

Use NASA's world.topo.200408.3x21600x10800.jpg with Pillow:
https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-topography/
"""
from pathlib import Path
import sys

from PIL import Image

Image.MAX_IMAGE_PIXELS = 21600 * 10800
OUTPUT = Path(__file__).resolve().parents[1] / "public/earth/detail"

with Image.open(sys.argv[1]) as source:
    if source.size != (21600, 10800):
        raise SystemExit("Expected NASA's 21600 × 10800 globe")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for row in range(4):
        latitude = min(63, max(-63, -67.5 + row * 45))
        top = round((90 - latitude - 27) * 60)
        for col in range(8):
            left = (col * 45 + 180 - 36) * 60 % source.width
            width, height = 72 * 60, 54 * 60
            right = min(source.width, left + width)
            crop = source.crop((left, top, right, top + height))
            if crop.width < width:
                region = Image.new("RGB", (width, height))
                region.paste(crop)
                region.paste(source.crop((0, top, width - crop.width, top + height)), (crop.width, 0))
                crop = region
            crop.resize((2560, 1920), Image.Resampling.LANCZOS).save(
                OUTPUT / f"{col}-{row}.webp", quality=82, method=5
            )
