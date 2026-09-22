#!/usr/bin/env python3
"""Re-slice sprite sheets into assets/sprites/. Requires Pillow."""

from PIL import Image
from collections import deque
import os

ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT = os.path.join(ROOT, "assets", "sprites")


def is_background(r, g, b, a):
    if a < 20:
        return True
    if 145 <= r <= 230 and 160 <= g <= 240 and 175 <= b <= 250 and abs(r - g) < 45 and abs(g - b) < 45 and abs(r - b) < 55:
        return True
    avg = (r + g + b) / 3
    if abs(r - g) <= 12 and abs(g - b) <= 12 and abs(r - b) <= 12:
        if 115 <= avg <= 215 or avg >= 248:
            return True
    return False


def flood_clear_bg(img):
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()
    visited = [[False] * w for _ in range(h)]
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if is_background(*px[x, y]):
                q.append((x, y))
                visited[y][x] = True
    for y in range(h):
        for x in (0, w - 1):
            if not visited[y][x] and is_background(*px[x, y]):
                q.append((x, y))
                visited[y][x] = True
    while q:
        x, y = q.popleft()
        px[x, y] = (0, 0, 0, 0)
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx]:
                visited[ny][nx] = True
                if is_background(*px[nx, ny]):
                    q.append((nx, ny))
    return img


def extract(src, box, outpath, pad=4):
    x0, y0, x1, y1 = box
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(src.width, x1 + pad)
    y1 = min(src.height, y1 + pad)
    crop = flood_clear_bg(src.crop((x0, y0, x1, y1)))
    bbox = crop.getbbox()
    if bbox:
        crop = crop.crop(bbox)
    os.makedirs(os.path.dirname(outpath), exist_ok=True)
    crop.save(outpath)
    print(f"  {os.path.relpath(outpath, ROOT)}: {crop.size}")


def main():
    rocks_raw = Image.open(os.path.join(ROOT, "assets/rocks-and-crystals.png")).convert("RGBA")
    smash_raw = Image.open(os.path.join(ROOT, "assets/smashers.png")).convert("RGBA")

    rock_boxes = [
        (72, 104, 168, 182), (248, 103, 369, 192), (458, 96, 570, 191),
        (658, 89, 762, 199), (851, 103, 964, 192), (73, 216, 160, 329),
        (250, 234, 370, 320), (466, 232, 563, 327), (653, 234, 772, 327),
        (855, 219, 963, 339),
    ]
    print("Rocks:")
    for i, box in enumerate(rock_boxes, 1):
        extract(rocks_raw, box, os.path.join(OUT, f"rocks/rock_{i:02d}.png"))

    crystals = [
        ("blue_pyramid", (65, 408, 140, 480)),
        ("blue_cluster", (224, 408, 305, 480)),
        ("orange_star", (396, 405, 473, 480)),
        ("green_shield", (555, 408, 625, 480)),
        ("purple_spikes", (705, 395, 785, 495)),
        ("green_diamond", (866, 392, 964, 497)),
        ("ultimate_gold", (375, 542, 645, 756)),
    ]
    print("Crystals:")
    for name, box in crystals:
        extract(rocks_raw, box, os.path.join(OUT, f"crystals/{name}.png"), pad=2)

    smashers = {
        "stone": {
            "idle": (23, 157, 296, 242),
            "swing1": (370, 157, 642, 242),
            "swing2": (697, 157, 961, 242),
            "effect": (1050, 152, 1130, 238),
        },
        "lightning": {
            "idle": (23, 344, 287, 453),
            "swing1": (365, 343, 628, 453),
            "swing2": (702, 335, 957, 446),
            "effect": (1034, 339, 1145, 445),
        },
        "fire": {
            "idle": (23, 565, 286, 635),
            "swing1": (360, 536, 924, 641),
            "effect": (1049, 559, 1120, 631),
        },
        "diamond": {
            "idle": (29, 748, 281, 842),
            "swing1": (328, 757, 549, 843),
            "effect": (602, 736, 715, 847),
        },
    }
    print("Smashers:")
    for key, frames in smashers.items():
        for frame, box in frames.items():
            extract(smash_raw, box, os.path.join(OUT, f"smashers/{key}_{frame}.png"))


if __name__ == "__main__":
    main()
