"""Rebuild the water histories and lava transect from the georeferenced story archives."""

from heapq import heappop, heappush
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


root = Path(__file__).resolve().parents[1]
water_archive = root / "src/sources/earth-atlas"
lava_archive = root / "src/app/kilauea"


def sample_water_history():
    metadata = json.loads((water_archive / "aral.json").read_text())
    frames = []
    for frame in metadata["frames"]:
        with Image.open(water_archive / "assets" / frame["image"]) as image:
            frames.append(np.asarray(image.convert("RGBA"))[:, :, 3])

    assert all(set(np.unique(frame)) <= {0, 175, 180, 235, 245} for frame in frames)
    # On the hatch strokes every water class, including incomplete coverage, is distinct.
    # Shoreline ink overwrites the class and cannot be sampled.
    y, x = np.indices(frames[0].shape)
    early_water = np.logical_or.reduce([np.isin(frame, [175, 245]) for frame in frames[:3]])
    usable = ((x + y) % 8 < 3) & early_water & ~np.any(np.stack(frames) == 235, axis=0)
    classes = {180: 0, 0: 1, 175: 2, 245: 3}

    samples = bytearray()
    for row in range(100):
        for col in range(125):
            candidates = [
                (dx, dy)
                for dy in range(4)
                for dx in range(4)
                if usable[4 * row + dy, 4 * col + dx]
            ]
            if not candidates:
                samples.extend([255, 0, 0, 0, 0, 0, 0])
                continue
            dx, dy = min(candidates, key=lambda p: (p[0] - 1.5) ** 2 + (p[1] - 1.5) ** 2)
            x, y = 4 * col + dx, 4 * row + dy
            history = sum(classes[frame[y, x]] << (2 * index) for index, frame in enumerate(frames))
            samples.append(4 * dy + dx)
            samples.extend(history.to_bytes(6, "little"))
    (water_archive / "aral-samples.bin").write_bytes(samples)


pitch = 75  # metres in the source survey's local grid
west, south, east, north = -1500, -4800, 12150, 6000
ocean_entry_survey = 9
neighbours = [(1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (-1, 1), (1, -1)]


def grid_point(x, y):
    return round((x - west) / pitch), round((north - y) / pitch)


def mapped_dates(snapshots):
    width = math.ceil((east - west) / pitch)
    height = math.ceil((north - south) / pitch)
    first = np.full((height, width), 255)
    for date, survey in enumerate(snapshots):
        mask = Image.new("L", (width, height))
        draw = ImageDraw.Draw(mask)
        for rings in survey["fresh"]:
            for index, ring in enumerate(rings):
                draw.polygon([grid_point(*point) for point in ring], fill=0 if index else 255)
        first[(np.asarray(mask) > 0) & (first == 255)] = date
    return first


def nearest_mapped(dates, point, latest):
    col, row = grid_point(*point)
    rows, cols = np.where(dates <= latest)
    closest = np.argmin((rows - row) ** 2 + (cols - col) ** 2)
    return int(cols[closest]), int(rows[closest])


def mapped_transect(dates, start, end):
    # A connected path inside the footprint. Early surveys favour the main channel.
    height, width = dates.shape
    distance = {start: 0}
    parent = {}
    queue = [(0, start)]
    while queue:
        cost, here = heappop(queue)
        if cost > distance[here]:
            continue
        if here == end:
            path = [end]
            while path[-1] != start:
                path.append(parent[path[-1]])
            return path[::-1]
        for dx, dy in neighbours:
            col, row = neighbour = (here[0] + dx, here[1] + dy)
            if not (0 <= col < width and 0 <= row < height):
                continue
            date = dates[row, col]
            if date > ocean_entry_survey:
                continue
            next_cost = cost + math.hypot(dx, dy) * (1 + 0.045 * date)
            if next_cost < distance.get(neighbour, math.inf):
                distance[neighbour] = next_cost
                parent[neighbour] = here
                heappush(queue, (next_cost, neighbour))
    raise ValueError("No connected path through the archived lava surveys")


def sample_lava_route():
    archive = json.loads((lava_archive / "kilauea.json").read_text())
    dates = mapped_dates(archive["snapshots"])
    vent = nearest_mapped(dates, archive["vent"], 0)
    coast = nearest_mapped(dates, (9630, 2049), ocean_entry_survey)
    path = mapped_transect(dates, vent, coast)
    latest = 0
    samples = []
    for i, (col, row) in enumerate(path):
        latest = max(latest, int(dates[row, col]))
        if i % 3 == 0 or i == len(path) - 1:
            samples.append([west + col * pitch, north - row * pitch, latest])
    samples[0] = [*archive["vent"], 0]
    output = json.dumps(samples, separators=(",", ":"))
    (lava_archive / "surveyRoute.json").write_text(output + "\n")


if __name__ == "__main__":
    sample_water_history()
    sample_lava_route()
