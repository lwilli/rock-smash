#!/usr/bin/env python3
"""Re-slice sprite sheets into assets/sprites/. Requires Pillow.

Crystal extraction peels light sheet-bleed fringe that flood-fill alone leaves behind.
Ultimate uses a protected flood so gold/cyan pixels are never cleared as background.

When flood+peel still leaves fringe, whiskers, ground-bar bleed, or checker-in-glow
(see rock_08 / rock_10 / ultimate_gold), do not keep tuning forever — follow the
rebuild path in .agents/sprite-extraction-guide.md (magenta AI rebuild → chromakey
→ hole-fill → NEAREST downsample → edge metrics).
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
    # Strong cyan/teal only — mid blue-greys from the sheet checker are NOT cyan.
    if sat < 55:
        return False
    if b >= 175 and g >= 160 and r <= g - 28 and avg >= 165 and (b - r) >= 35:
        return True
    if b >= 205 and g >= 175 and r < 155 and sat >= 60 and (b - r) >= 45:
        return True
    if b >= 215 and g >= 205 and 70 <= r <= 165 and sat >= 55 and (b - r) >= 40:
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
    # Darker checker squares (blue-grey) trapped in the glow halo
    if sat <= 48 and 40 <= avg <= 185 and abs(r - g) < 36 and abs(g - b) < 36 and b >= r - 4:
        return True
    if g >= r - 2 and sat <= 50 and 140 <= avg <= 240 and b >= 160 and (b - r) < 55:
        return True
    if sat <= 40 and avg >= 200:
        return True
    # Muddy pale yellow-white sheet bleed (not gold specular)
    if avg >= 210 and sat <= 50 and b >= 190 and r >= 200 and g >= 200 and not is_ultimate_gold(r, g, b):
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


def component_is_sparkle(px, cells):
    """Keep small bright gold/white sparkle clusters; drop grey sheet junk."""
    if not (5 <= len(cells) <= 28):
        return False
    goldish = 0
    for x, y in cells:
        r, g, b, a = px[x, y]
        if is_ultimate_gold(r, g, b):
            goldish += 1
            continue
        avg = avg_of(r, g, b)
        sat = sat_of(r, g, b)
        if avg >= 230 and sat <= 55 and b <= 230:
            goldish += 1
        elif r >= 210 and g >= 190 and b <= 210 and (r - b) >= 20:
            goldish += 1
    return goldish >= max(4, int(len(cells) * 0.6))


def keep_main_components(img, dist=88):
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
            cx = sum(p[0] for p in c) / len(c)
            cy = sum(p[1] for p in c) / len(c)
            near = abs(cx - mcx) < dist and abs(cy - mcy) < dist + 12
            if not near:
                continue
            # Only keep intentional sparkles. Detached glow islands are sheet noise.
            if component_is_sparkle(px, c):
                keep.update(c)
    for y in range(h):
        for x in range(w):
            if (x, y) not in keep:
                px[x, y] = (0, 0, 0, 0)
    return img


def is_rock_sheet_bg(r, g, b, a):
    """Sheet background only — never treat bright interior whites as bg."""
    if a < 20:
        return True
    if 145 <= r <= 230 and 160 <= g <= 240 and 175 <= b <= 250 and abs(r - g) < 45 and abs(g - b) < 45 and abs(r - b) < 55:
        return True
    avg = avg_of(r, g, b)
    chroma = max(abs(r - g), abs(g - b), abs(r - b))
    if chroma <= 10 and 115 <= avg <= 210:
        return True
    return False


def is_rock_sheet_fringe(r, g, b, fringe_avg, warm_protect=False, aggressive_cool=False):
    avg = avg_of(r, g, b)
    chroma = max(abs(r - g), abs(g - b), abs(r - b))
    # Cool / blue-grey sheet bleed clinging to silhouette
    if chroma <= 32 and 110 <= avg <= 190 and b >= r + 3:
        return True
    if chroma <= 26 and 115 <= avg <= 180 and b >= g - 2 and b >= r:
        return True
    if chroma <= 18 and 125 <= avg <= 170:
        return True
    if aggressive_cool:
        if avg >= 145 and chroma <= 28 and b >= r + 3:
            return True
        if b >= r + 6 and 120 <= avg <= 180 and chroma <= 32:
            return True
        if b >= r + 8 and chroma <= 30 and avg >= 125:
            return True
    if avg >= fringe_avg and chroma <= 38:
        if warm_protect and r >= g - 4 and g >= b - 2 and avg >= 170 and chroma >= 8:
            # Marble / sedimentary warm vein highlight — keep
            return False
        return True
    return False


def flood_clear_rock_bg(img):
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()
    visited = [[False] * w for _ in range(h)]
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if is_rock_sheet_bg(*px[x, y]):
                q.append((x, y))
                visited[y][x] = True
    for y in range(h):
        for x in (0, w - 1):
            if not visited[y][x] and is_rock_sheet_bg(*px[x, y]):
                q.append((x, y))
                visited[y][x] = True
    while q:
        x, y = q.popleft()
        px[x, y] = (0, 0, 0, 0)
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx]:
                visited[ny][nx] = True
                if is_rock_sheet_bg(*px[nx, ny]):
                    q.append((nx, ny))
    return img


def keep_largest_component(img, alpha_min=30):
    w, h = img.size
    px = img.load()
    visited = [[False] * w for _ in range(h)]
    best = []
    for y in range(h):
        for x in range(w):
            if visited[y][x] or px[x, y][3] < alpha_min:
                continue
            q = deque([(x, y)])
            visited[y][x] = True
            cells = []
            while q:
                cx, cy = q.popleft()
                cells.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx] and px[nx, ny][3] >= alpha_min:
                        visited[ny][nx] = True
                        q.append((nx, ny))
            if len(cells) > len(best):
                best = cells
    keep = set(best)
    for y in range(h):
        for x in range(w):
            if (x, y) not in keep:
                px[x, y] = (0, 0, 0, 0)
    return img


def morph_open_mask(img, alpha_min=30):
    """One light morphological opening to strip 1px filaments."""
    w, h = img.size
    px = img.load()
    mask = Image.new("L", (w, h), 0)
    mp = mask.load()
    for y in range(h):
        for x in range(w):
            if px[x, y][3] >= alpha_min:
                mp[x, y] = 255
    er = Image.new("L", (w, h), 0)
    ep = er.load()
    for y in range(1, h - 1):
        for x in range(1, w - 1):
            if mp[x, y] >= 128 and mp[x - 1, y] >= 128 and mp[x + 1, y] >= 128 and mp[x, y - 1] >= 128 and mp[x, y + 1] >= 128:
                ep[x, y] = 255
    di = Image.new("L", (w, h), 0)
    dp = di.load()
    for y in range(h):
        for x in range(w):
            if ep[x, y] < 128:
                continue
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h:
                        dp[nx, ny] = 255
    for y in range(h):
        for x in range(w):
            if dp[x, y] < 128:
                px[x, y] = (0, 0, 0, 0)
    return img


def peel_rock_fringe(img, fringe_avg=175, warm_protect=False, rounds=8, aggressive_cool=False):
    img = img.copy()
    w, h = img.size
    neighbors = (
        (-1, 0), (1, 0), (0, -1), (0, 1),
        (-1, -1), (-1, 1), (1, -1), (1, 1),
    )
    for _ in range(rounds):
        px = img.load()
        to_clear = []
        for y in range(h):
            for x in range(w):
                r, g, b, a = px[x, y]
                if a < 30:
                    continue
                nempty = sum(
                    1
                    for dx, dy in neighbors
                    if (not (0 <= x + dx < w and 0 <= y + dy < h)) or px[x + dx, y + dy][3] < 30
                )
                if nempty == 0:
                    continue
                if is_rock_sheet_fringe(r, g, b, fringe_avg, warm_protect=warm_protect, aggressive_cool=aggressive_cool):
                    to_clear.append((x, y))
                elif nempty >= 6:
                    to_clear.append((x, y))
                elif aggressive_cool and nempty >= 5 and avg_of(r, g, b) >= 125 and max(abs(r - g), abs(g - b), abs(r - b)) <= 30 and b >= r + 4:
                    to_clear.append((x, y))
        if not to_clear:
            break
        for x, y in to_clear:
            px[x, y] = (0, 0, 0, 0)
    return img


def drop_rock_orphans(img, rounds=3):
    img = img.copy()
    w, h = img.size
    neighbors = (
        (-1, 0), (1, 0), (0, -1), (0, 1),
        (-1, -1), (-1, 1), (1, -1), (1, 1),
    )
    for _ in range(rounds):
        px = img.load()
        to_clear = []
        for y in range(h):
            for x in range(w):
                if px[x, y][3] < 30:
                    continue
                n = sum(
                    1
                    for dx, dy in neighbors
                    if 0 <= x + dx < w and 0 <= y + dy < h and px[x + dx, y + dy][3] >= 30
                )
                if n < 2:
                    to_clear.append((x, y))
        if not to_clear:
            break
        for x, y in to_clear:
            px[x, y] = (0, 0, 0, 0)
    return img


def peel_thin_spurs(img, rounds=4):
    """Remove 1px outline whiskers / filaments that touch transparency."""
    img = img.copy()
    w, h = img.size
    n4 = ((-1, 0), (1, 0), (0, -1), (0, 1))
    for _ in range(rounds):
        px = img.load()
        to_clear = []
        for y in range(h):
            for x in range(w):
                if px[x, y][3] < 30:
                    continue
                opaque = []
                empty = 0
                for dx, dy in n4:
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] >= 30:
                        opaque.append((nx, ny))
                    else:
                        empty += 1
                if empty == 0:
                    continue
                if len(opaque) <= 1:
                    to_clear.append((x, y))
                    continue
                # 1px line: exactly two opposite neighbors
                if len(opaque) == 2:
                    (x1, y1), (x2, y2) = opaque
                    if (x1 - x, y1 - y) == (x - x2, y - y2):
                        to_clear.append((x, y))
        if not to_clear:
            break
        for x, y in to_clear:
            px[x, y] = (0, 0, 0, 0)
    return img


def extract_rock(src, box, outpath, pad=6, morph=True, fringe_avg=175, warm_protect=False, aggressive_cool=False):
    x0, y0, x1, y1 = box
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(src.width, x1 + pad)
    y1 = min(src.height, y1 + pad)
    img = flood_clear_rock_bg(src.crop((x0, y0, x1, y1)).copy())
    img = keep_largest_component(img)
    if morph:
        img = morph_open_mask(img)
    img = peel_rock_fringe(img, fringe_avg=fringe_avg, warm_protect=warm_protect, rounds=10, aggressive_cool=aggressive_cool)
    img = drop_rock_orphans(img, rounds=4)
    img = keep_largest_component(img)
    img = peel_rock_fringe(img, fringe_avg=fringe_avg, warm_protect=warm_protect, rounds=6, aggressive_cool=aggressive_cool)
    img = drop_rock_orphans(img, rounds=3)
    img = peel_thin_spurs(img, rounds=4)
    img = keep_largest_component(img)
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    os.makedirs(os.path.dirname(outpath), exist_ok=True)
    img.save(outpath)
    print(f"  {os.path.relpath(outpath, ROOT)}: {img.size}")


def strip_stone_right_head(img, idle_img, right_start=160, cut_y=47):
    """Stone swing frames in the sheet have a second head on the handle end.

    Keep only the left striking head and rebuild a plain handle tip from idle.
    """
    out = img.convert("RGBA").copy()
    idle = idle_img.convert("RGBA")
    sw, sh = out.size
    iw, ih = idle.size
    op = out.load()
    ip = idle.load()
    for y in range(cut_y, sh):
        for x in range(right_start, sw):
            op[x, y] = (0, 0, 0, 0)
    for y in range(min(cut_y, ih, sh)):
        for x in range(right_start, sw):
            ix = min(max(x, 0), iw - 1)
            r, g, b, a = ip[ix, y]
            op[x, y] = (r, g, b, a) if a > 20 else (0, 0, 0, 0)
    for y in range(sh):
        for x in range(230, sw):
            ix = min(x, iw - 1)
            iy = min(y, ih - 1)
            if y >= 48:
                op[x, y] = (0, 0, 0, 0)
            else:
                r, g, b, a = ip[ix, iy]
                op[x, y] = (r, g, b, a) if a > 20 else (0, 0, 0, 0)
    bbox = out.getbbox()
    return out.crop(bbox) if bbox else out


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


def clean_smasher_bottom(img):
    """Drop sheet frame labels below the weapon and peel soft underside fringe/whiskers.

    Keeps saturated lightning cyan; removes detached label glyphs (e.g. IDLE) and
    light sheet bleed clinging under the silhouette.
    """
    img = img.convert("RGBA").copy()
    w, h = img.size
    px = img.load()

    visited = [[False] * w for _ in range(h)]
    comps = []
    for y in range(h):
        for x in range(w):
            if visited[y][x] or px[x, y][3] < 30:
                continue
            q = deque([(x, y)])
            visited[y][x] = True
            cells = []
            while q:
                cx, cy = q.popleft()
                cells.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx] and px[nx, ny][3] >= 30:
                        visited[ny][nx] = True
                        q.append((nx, ny))
            comps.append(cells)
    if not comps:
        return img
    comps.sort(key=len, reverse=True)
    main = comps[0]
    main_ymax = max(y for _, y in main)
    keep = set(main)
    for c in comps[1:]:
        y0 = min(y for _, y in c)
        if y0 >= main_ymax:
            continue
        if len(c) < 40:
            continue
        keep.update(c)
    for y in range(h):
        for x in range(w):
            if (x, y) not in keep:
                px[x, y] = (0, 0, 0, 0)

    n4 = ((-1, 0), (1, 0), (0, -1), (0, 1))
    for _ in range(8):
        to_clear = []
        for y in range(h):
            for x in range(w):
                r, g, b, a = px[x, y]
                if a < 30:
                    continue
                empty = sum(
                    1
                    for dx, dy in n4
                    if (not (0 <= x + dx < w and 0 <= y + dy < h)) or px[x + dx, y + dy][3] < 30
                )
                if empty == 0:
                    continue
                avg = avg_of(r, g, b)
                chroma = max(abs(r - g), abs(g - b), abs(r - b))
                lightning = b >= r + 25 and b >= 120 and chroma >= 40
                on8 = sum(
                    1
                    for dx in (-1, 0, 1)
                    for dy in (-1, 0, 1)
                    if not (dx == 0 and dy == 0)
                    and 0 <= x + dx < w
                    and 0 <= y + dy < h
                    and px[x + dx, y + dy][3] >= 30
                )
                if on8 <= 1:
                    to_clear.append((x, y))
                    continue
                if not lightning and avg >= 100 and chroma <= 50 and max(r, g, b) <= 175:
                    to_clear.append((x, y))
                    continue
                # Tip whisker under the head
                if x < w * 0.4 and y > h * 0.65:
                    up = y > 0 and px[x, y - 1][3] >= 30
                    down = y + 1 < h and px[x, y + 1][3] >= 30
                    left = x > 0 and px[x - 1, y][3] >= 30
                    right = x + 1 < w and px[x + 1, y][3] >= 30
                    if up and not down and not left and not right:
                        to_clear.append((x, y))
                    elif up and not down and (int(left) + int(right)) <= 1 and on8 <= 4 and max(r, g, b) <= 90:
                        to_clear.append((x, y))
        if not to_clear:
            break
        for x, y in to_clear:
            px[x, y] = (0, 0, 0, 0)

    bbox = img.getbbox()
    return img.crop(bbox) if bbox else img


def extract_smasher(src, box, outpath, pad=4, clean_bottom=False):
    x0, y0, x1, y1 = box
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(src.width, x1 + pad)
    y1 = min(src.height, y1 + pad)
    crop = flood_clear_bg(src.crop((x0, y0, x1, y1)))
    if clean_bottom:
        crop = clean_smasher_bottom(crop)
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
        img = peel_non_crystal_edge(img, rounds=10)
        img = morph_open(img, iters=2)
        img = keep_main_components(img)
        img = peel_non_crystal_edge(img, rounds=6)
        img = morph_open(img, iters=2)
        img = peel_non_crystal_edge(img, rounds=4)
        img = keep_main_components(img)
        img = peel_thin_spurs(img, rounds=5)
        img = peel_non_crystal_edge(img, rounds=2)
        img = keep_main_components(img)
        img = peel_thin_spurs(img, rounds=2)
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

    # Tightened boxes (esp. rock_10) avoid sheet ground-bar / cell outline bleed.
    rock_boxes = [
        (74, 106, 166, 180), (252, 106, 365, 188), (462, 100, 566, 188),
        (662, 92, 758, 196), (855, 108, 960, 188), (76, 220, 156, 324),
        (254, 236, 366, 316), (470, 236, 560, 320), (658, 238, 768, 322),
        (860, 224, 958, 330),
    ]
    # Marble (8) keeps warm white veins: no morph, higher fringe threshold + warm protect.
    rock_fringe_avg = {4: 200, 8: 200, 10: 150}
    print("Rocks:")
    for i, box in enumerate(rock_boxes, 1):
        extract_rock(
            rocks_raw,
            box,
            os.path.join(OUT, f"rocks/rock_{i:02d}.png"),
            morph=(i != 8),
            fringe_avg=rock_fringe_avg.get(i, 175),
            warm_protect=(i in (4, 8)),
            aggressive_cool=(i == 10),
        )

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
            # Idle y1 tightened to exclude the "IDLE" sheet label under the weapon.
            "idle": (23, 344, 287, 448),
            "swing1": (365, 343, 628, 450),
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
            extract_smasher(
                smash_raw,
                box,
                os.path.join(OUT, f"smashers/{key}_{frame}.png"),
                clean_bottom=(key == "lightning"),
            )


if __name__ == "__main__":
    main()
