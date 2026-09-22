#!/usr/bin/env python3
"""Re-slice sprite sheets into assets/sprites/. Requires Pillow.

Crystal extraction peels light sheet-bleed fringe that flood-fill alone leaves behind.
Ultimate uses a protected flood so gold/cyan pixels are never cleared as background.
"""

from PIL import Image
from collections import deque
import os

ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT = os.path.join(ROOT, "assets", "sprites")


def sat_of(r, g, b):
    return max(r, g, b) - min(r, g, b)


def avg_of(r, g, b):
    return (r + g + b) / 3.0


def is_background(r, g, b, a):
    if a < 20:
        return True
    if min(r, g, b) >= 240:
        return True
    if r >= 235 and g >= 235 and b >= 235:
        return True
    if 145 <= r <= 235 and 160 <= g <= 245 and 170 <= b <= 250 and abs(r - g) < 50 and abs(g - b) < 50 and abs(r - b) < 60:
        return True
    avg = avg_of(r, g, b)
    if abs(r - g) <= 14 and abs(g - b) <= 14 and abs(r - b) <= 14:
        if 100 <= avg <= 230 or avg >= 240:
            return True
    if abs(r - g) < 28 and abs(g - b) < 28 and abs(r - b) < 38 and 100 <= avg <= 220:
        return True
    if abs(r - g) < 28 and abs(g - b) < 28 and abs(r - b) < 38 and 65 <= avg <= 120 and sat_of(r, g, b) <= 45:
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


def morph_open(img, iters=1):
    img = img.copy()
    w, h = img.size
    for _ in range(iters):
        px = img.load()
        to_clear = []
        for y in range(h):
            for x in range(w):
                if px[x, y][3] < 10:
                    continue
                n = sum(
                    1
                    for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1))
                    if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] >= 10
                )
                if n <= 1:
                    to_clear.append((x, y))
        for x, y in to_clear:
            px[x, y] = (0, 0, 0, 0)
    return img


def is_light_fringe(r, g, b, a, family):
    if a < 40:
        return True
    if is_background(r, g, b, a):
        return True
    avg = avg_of(r, g, b)
    sat = sat_of(r, g, b)
    if avg >= 170 and sat <= 75:
        return True
    if avg >= 140 and sat <= 62:
        return True
    if avg >= 125 and sat <= 48:
        return True
    if family == "blue" and b >= r and sat <= 62 and 75 <= avg <= 160:
        return True
    if family == "green" and g >= r and g >= b and sat <= 50 and 75 <= avg <= 155 and avg < 180:
        return True
    if family == "green" and g >= 180 and g >= r and g >= b and sat >= 30 and avg < 235:
        return False
    if family == "green" and avg >= 220 and sat <= 55 and min(r, g, b) >= 185:
        return True
    if family == "purple" and sat <= 58 and 75 <= avg <= 170 and min(r, b) >= g - 5:
        return True
    if family == "orange" and ((avg >= 160 and r > 170 and sat <= 60) or (sat <= 55 and avg >= 135 and r >= 145)):
        return True
    return False


def peel_crystal_fringe(img, family, rounds=12):
    img = img.copy()
    w, h = img.size
    neighbors = (
        (1, 0), (-1, 0), (0, 1), (0, -1),
        (1, 1), (-1, -1), (1, -1), (-1, 1),
    )
    for _ in range(rounds):
        px = img.load()
        to_clear = []
        for y in range(h):
            for x in range(w):
                r, g, b, a = px[x, y]
                if a < 10:
                    continue
                touches = any(
                    (not (0 <= nx < w and 0 <= ny < h) or px[nx, ny][3] < 10)
                    for dx, dy in neighbors
                    for nx, ny in ((x + dx, y + dy),)
                )
                if touches and is_light_fringe(r, g, b, a, family):
                    to_clear.append((x, y))
        if not to_clear:
            break
        for x, y in to_clear:
            px[x, y] = (0, 0, 0, 0)
    return img


def is_ultimate_gold(r, g, b):
    sat = sat_of(r, g, b)
    avg = avg_of(r, g, b)
    if r >= 145 and g >= 110 and r >= g - 8 and b <= min(r, g) - 12 and sat >= 40:
        return True
    if r >= 55 and g >= 30 and b <= 55 and r >= g and sat >= 25 and avg < 195 and b < (r + g) / 2 - 12:
        return True
    if r >= 220 and g >= 200 and b <= 210 and (r - b) >= 25 and sat >= 25:
        return True
    return False


def is_ultimate_cyan(r, g, b):
    sat = sat_of(r, g, b)
    avg = avg_of(r, g, b)
    if b >= 170 and g >= 155 and r <= g - 22 and sat >= 48 and avg >= 155:
        return True
    if b >= 200 and g >= 170 and r < 160 and sat >= 55:
        return True
    if b >= 210 and g >= 200 and 80 <= r <= 170 and sat >= 50:
        return True
    return False


def is_ultimate_crystal(r, g, b):
    return is_ultimate_gold(r, g, b) or is_ultimate_cyan(r, g, b)


def is_ultimate_sheetish(r, g, b, a):
    if a < 20:
        return True
    if is_ultimate_crystal(r, g, b):
        return False
    avg = avg_of(r, g, b)
    sat = sat_of(r, g, b)
    if min(r, g, b) >= 235:
        return True
    if avg >= 240 and sat <= 25:
        return True
    if 140 <= r <= 240 and 150 <= g <= 250 and 160 <= b <= 255 and abs(r - g) < 55 and abs(g - b) < 55 and sat < 60:
        return True
    if abs(r - g) <= 18 and abs(g - b) <= 18 and abs(r - b) <= 18 and 90 <= avg <= 235:
        return True
    if sat <= 42 and 50 <= avg <= 175 and abs(r - g) < 32 and abs(g - b) < 32:
        return True
    if g >= r - 2 and sat <= 45 and 160 <= avg <= 240 and b >= 170:
        return True
    if sat <= 40 and avg >= 200:
        return True
    return False


def protected_flood_ultimate(img):
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()
    visited = [[False] * w for _ in range(h)]
    q = deque()

    def try_seed(x, y):
        if visited[y][x]:
            return
        r, g, b, a = px[x, y]
        if is_ultimate_crystal(r, g, b):
            return
        if is_ultimate_sheetish(r, g, b, a):
            q.append((x, y))
            visited[y][x] = True

    for x in range(w):
        try_seed(x, 0)
        try_seed(x, h - 1)
    for y in range(h):
        try_seed(0, y)
        try_seed(w - 1, y)
    for y in range(h):
        for x in range(w):
            if visited[y][x]:
                continue
            r, g, b, a = px[x, y]
            if is_ultimate_crystal(r, g, b):
                continue
            if min(r, g, b) >= 250 or (avg_of(r, g, b) >= 248 and sat_of(r, g, b) <= 10):
                q.append((x, y))
                visited[y][x] = True
    while q:
        x, y = q.popleft()
        px[x, y] = (0, 0, 0, 0)
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx]:
                visited[ny][nx] = True
                r, g, b, a = px[nx, ny]
                if is_ultimate_crystal(r, g, b):
                    continue
                if is_ultimate_sheetish(r, g, b, a):
                    q.append((nx, ny))
                else:
                    visited[ny][nx] = False
    return img


def peel_non_crystal_edge(img, rounds=5):
    img = img.copy()
    w, h = img.size
    neighbors = (
        (1, 0), (-1, 0), (0, 1), (0, -1),
        (1, 1), (-1, -1), (1, -1), (-1, 1),
    )
    for _ in range(rounds):
        px = img.load()
        to_clear = []
        for y in range(h):
            for x in range(w):
                r, g, b, a = px[x, y]
                if a < 10:
                    continue
                if is_ultimate_crystal(r, g, b):
                    continue
                touches = any(
                    (not (0 <= nx < w and 0 <= ny < h) or px[nx, ny][3] < 10)
                    for dx, dy in neighbors
                    for nx, ny in ((x + dx, y + dy),)
                )
                if touches:
                    to_clear.append((x, y))
        if not to_clear:
            break
        for x, y in to_clear:
            px[x, y] = (0, 0, 0, 0)
    return img


def keep_main_components(img, dist=95):
    w, h = img.size
    px = img.load()
    visited = [[False] * w for _ in range(h)]
    comps = []
    for y in range(h):
        for x in range(w):
            if visited[y][x] or px[x, y][3] < 10:
                continue
            q = deque([(x, y)])
            visited[y][x] = True
            cells = []
            while q:
                cx, cy = q.popleft()
                cells.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx] and px[nx, ny][3] >= 10:
                        visited[ny][nx] = True
                        q.append((nx, ny))
            comps.append(cells)
    comps.sort(key=len, reverse=True)
    keep = set()
    if comps:
        keep.update(comps[0])
        mxs = [p[0] for p in comps[0]]
        mys = [p[1] for p in comps[0]]
        mcx = (min(mxs) + max(mxs)) / 2
        mcy = (min(mys) + max(mys)) / 2
        for c in comps[1:]:
            if len(c) < 5:
                continue
            cx = sum(p[0] for p in c) / len(c)
            cy = sum(p[1] for p in c) / len(c)
            if abs(cx - mcx) < dist and abs(cy - mcy) < dist + 15:
                keep.update(c)
    for y in range(h):
        for x in range(w):
            if (x, y) not in keep:
                px[x, y] = (0, 0, 0, 0)
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


def extract_crystal(src, box, outpath, family, pad=2):
    x0, y0, x1, y1 = box
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(src.width, x1 + pad)
    y1 = min(src.height, y1 + pad)
    crop = src.crop((x0, y0, x1, y1))
    if family == "ultimate":
        img = protected_flood_ultimate(crop)
        img = peel_non_crystal_edge(img, rounds=6)
        img = morph_open(img, iters=1)
        img = keep_main_components(img)
        img = peel_non_crystal_edge(img, rounds=3)
    else:
        img = flood_clear_bg(crop)
        img = peel_crystal_fringe(img, family, rounds=12)
        img = morph_open(img, iters=1)
        img = peel_crystal_fringe(img, family, rounds=3)
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    os.makedirs(os.path.dirname(outpath), exist_ok=True)
    img.save(outpath)
    print(f"  {os.path.relpath(outpath, ROOT)}: {img.size}")


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
        ("blue_pyramid", (65, 408, 140, 480), "blue"),
        ("blue_cluster", (224, 408, 305, 480), "blue"),
        ("orange_star", (396, 405, 473, 480), "orange"),
        ("green_shield", (555, 408, 625, 480), "green"),
        ("purple_spikes", (705, 395, 785, 495), "purple"),
        ("green_diamond", (866, 392, 964, 497), "green"),
        ("ultimate_gold", (375, 542, 645, 756), "ultimate"),
    ]
    print("Crystals:")
    for name, box, family in crystals:
        extract_crystal(rocks_raw, box, os.path.join(OUT, f"crystals/{name}.png"), family, pad=2)

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
