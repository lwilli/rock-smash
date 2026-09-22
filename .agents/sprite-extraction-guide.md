# Sprite Extraction Guide (Rocks & Crystals)

Step-by-step process for turning `assets/rocks-and-crystals.png` (and similar opaque sheets) into clean game sprites under `assets/sprites/`. Written so future agents can reproduce good edges without repeating failed approaches.

## Why this is hard

The source sheet is **fully opaque**. Background is white plus a blue-grey checker / layout grid, not a real alpha channel. Rock and crystal edges **blend into** that background:

| Symptom | Cause |
|---------|--------|
| Cool-grey halo on outline | Checker / mid-grey sheet bleed left on exterior |
| Whiskers / thin spurs | 1–2 px leftovers after flood-fill |
| Ground-bar under rock | Crop box includes a layout line or cell border |
| Checker static in ultimate glow | Semi-transparent cyan aura was painted *over* the checker; flood cannot separate them |
| Swiss-cheese / holes | Over-aggressive peel, or AI chromakey + downsample without hole-fill |
| Magenta / purple edge halo | Magenta key + `Image.BOX` downsample blends key color into outline |

**`scripts/extract-sprites.py` is the first path.** Use the rebuild path below when sheet extraction still fails QA (see rock_08, rock_10, ultimate_gold).

## Golden rules

1. **Judge with metrics + composites, not vision alone.** Vision models over-report fringe on *good* sprites (including `rock_01`). Prefer pixel metrics.
2. **Never `BOX`-downsample a magenta-keyed image without scrubbing magenta afterward.** Prefer **NEAREST** after a hard alpha mask.
3. **Protect intentional bright interiors.** Marble veins (`rock_08`) and gold/sparkle pixels must not be treated as “light fringe.”
4. **Fill holes after any mask or chromakey** (morphological close + nearest-color fill) before shipping.
5. **Compare against a known-good sprite** (`rock_01.png`, `blue_cluster.png`) at the same zoom/background.

---

## Path A — Sheet extract (default)

Use for most rocks and non-ultimate crystals.

### Steps

1. **Open the sheet**  
   `assets/rocks-and-crystals.png` (1024×768, opaque RGBA).

2. **Crop a tight box** around one sprite. Prefer slightly tight over generous — loose crops pull in ground bars and neighbor cells. Current boxes live in `scripts/extract-sprites.py` (`rock_boxes`, `crystals`).

3. **Flood-clear background from the crop border**  
   Treat white / near-white / low-sat mid greys as background (`flood_clear_rock_bg` / `flood_clear_bg`). Do not clear warm marble or saturated crystal colors.

4. **Keep largest connected opaque component** (rocks). Crystals may keep small nearby sparkles.

5. **Optional morph open** (remove 1-px dust).  
   **Skip morph for marble rocks** (`rock_08`): morph eats thin cream veins.

6. **Peel exterior fringe only** (`peel_rock_fringe` / `peel_crystal_fringe`):
   - Only pixels with a transparent 4-neighbor.
   - Drop light / cool-grey exterior.
   - `warm_protect=True` for marble (keep warm white/cream edge veins).
   - `aggressive_cool=True` for stubborn cool fringe (`rock_10`).
   - Never peel dark outline (`max(r,g,b)` very low).

7. **Drop orphans + peel thin spurs** (`drop_rock_orphans`, `peel_thin_spurs`).

8. **Crop to bbox**, save PNG with binary-ish alpha (opaque sprite pixels at 255).

9. **Run extraction:**

```bash
python3 scripts/extract-sprites.py
```

### Per-sprite knobs (already in script)

| Sprite | Notes |
|--------|--------|
| rock_08 (marble) | `morph=False`, `warm_protect=True`, higher `fringe_avg` |
| rock_10 | Tighter box + `aggressive_cool=True` |
| ultimate_gold | Protected gold/cyan flood + peel — **often still leaves checker in glow** → use Path B |

---

## Path B — Rebuild when sheet extract fails

Use when Path A still leaves fringe, whiskers, ground-bar, or checker-in-glow after tuning. This is what fixed `rock_08`, `rock_10`, and `ultimate_gold`.

### Step 1 — Reference crops from the sheet

Crop the problem region (and a known-good rock for style):

```python
from PIL import Image
src = Image.open("assets/rocks-and-crystals.png").convert("RGBA")
# example boxes from extract-sprites.py
src.crop((470, 236, 560, 320)).save("/tmp/ref_rock_08.png")   # rock_08
src.crop((860, 224, 958, 330)).save("/tmp/ref_rock_10.png")   # rock_10
src.crop((375, 542, 645, 756)).save("/tmp/ref_ultimate.png")
```

Zoom ×3 nearest for reference images if generating AI art.

### Step 2 — Generate a clean pixel-art rebuild

GenerateImage (or equivalent) with:

- **Flat pure magenta `#FF00FF` background** — no checker, no grey, no white outside the sprite.
- Match silhouette / veins / facets from the reference crop.
- Crisp 1-px dark outline; solid opaque body; **no internal holes**.
- For ultimate: prefer **gold + outline + sparkle**; either omit cyan glow or use a clean solid cyan (never checker-mixed glow).
- Style reference: `assets/sprites/rocks/rock_01.png`.

Save the large RGB output (often ~1024²).

### Step 3 — Chromakey magenta (broad)

```python
# Magenta / pink / purple leftovers — be broad; AI anti-aliases into purple
mag = (
    ((r > 180) & (b > 180) & (g < 90))
    | ((r > 160) & (b > 140) & (g < 110) & (r > g + 40) & (b > g + 30))
    | ((r > 140) & (b > 120) & (g < 100) & (r > g + 35) & (b > g + 20))
)
alpha[mag] = 0
```

Also clear any remaining **cool cyan glow** if you want a hard gold-only ultimate (or rebuild glow later as a clean 1–2px rim).

### Step 4 — Morphological close + hole fill

AI + keying leaves swiss-cheese. **Always close before downsampling:**

1. Binary close on alpha (`MaxFilter` then `MinFilter`, several iters).
2. For newly filled pixels, copy color from nearest opaque neighbor (expanding ring).
3. Keep largest connected component (plus small bright sparkles for crystals).

### Step 5 — Scrub edge contaminants at hi-res

Exterior-only peel (transparent 4-neighbor):

- Near-magenta / purple leftovers
- Very light sheet whites
- Cool mid-greys (unless warm vein / intentional cyan)
- Thin spurs (`opaque 8-neighbors ≤ 1`)

For marble: **do not** remove warm cream exterior pixels that are veins.

### Step 6 — Downsample with NEAREST (not BOX)

```python
scale = target_long_side / max(w, h)
small = hi.resize((nw, nh), Image.NEAREST)
# hard alpha
arr[arr[:, :, 3] < 200, 3] = 0
arr[arr[:, :, 3] >= 200, 3] = 255
```

Target long side ~90–110 for rocks, ~150–160 for ultimate.

**Why not BOX?** BOX averages magenta into the outline → purple fringe that looks like sheet bleed.

### Step 7 — Final cleanup at game size

1. Scrub magenta-tinted exterior again.
2. Snap near-black exterior to pure outline `(0,0,0)` or dark brown for crystals.
3. Peel thin spurs; keep largest component; crop bbox.
4. For ultimate muddy olive/green AI base: remap `g > r` muddy pixels to nearby gold/amber, or drop non-gold body and keep gold+outline+sparkle only.

### Step 8 — Install

Write to:

- `assets/sprites/rocks/rock_XX.png`
- `assets/sprites/crystals/<name>.png`

Do **not** overwrite a Path-B result by blindly re-running `extract-sprites.py` unless you re-apply Path B afterward (or teach the script to skip curated sprites).

---

## QA checklist (required before shipping)

### A. Composites (save at 4–5× NEAREST)

Composite the sprite on:

1. Magenta `(255, 0, 255)`
2. Dark `(28, 32, 40)`
3. Green `(70, 190, 90)` (catches dark fringe vision misses on dark bg)

### B. Metrics (trust these over “vision says fringe”)

```python
# For each exterior opaque pixel (has transparent 4-neighbor):
# thin  = opaque 8-neighbors <= 1
# cool  = mid grey, low chroma, b ~>= g  (sheet fringe)
# mag   = purple/magenta leftover from key
```

**Ship bar (match or beat `rock_01`):**

| Metric | Target |
|--------|--------|
| `thin` | 0 |
| `mag` exterior | 0 |
| `cool` exterior | ~0 (rocks); ultimate gold-only also 0 |
| Internal 4-surrounded holes | 0 |
| Body | Solid; marble veins / gold facets intact |

`rock_01` itself can have non-zero cool exterior from authentic anti-aliased outline greys — new rebuilds should aim for **0 cool / 0 mag / 0 thin**.

### C. Side-by-side

Compare BEFORE (sheet extract or previous PR) vs AFTER on the same dark background. Ultimate success looks like: cyan checker aura gone, silhouette closed, no floating whiskers.

---

## Decision tree

```
Need a sprite from the sheet?
        │
        ▼
Run Path A (extract-sprites.py)
        │
        ▼
QA metrics + magenta/dark composites
        │
   ┌────┴────┐
  Pass      Fail (fringe / whiskers / checker-in-glow / ground-bar)
   │          │
   │          ▼
   │     Tune box / peel / warm_protect / aggressive_cool once
   │          │
   │     Still fail?
   │          │
   │          ▼
   │     Path B: magenta AI rebuild → chromakey → hole-fill
   │             → NEAREST down → scrub → metrics
   │
   ▼
Commit PNG under assets/sprites/
```

---

## Anti-patterns (do not repeat)

1. **Peeling mid-body fringe by morph radius** — ate rocks down to stubs.
2. **Flooding “cool grey barrier” into the rock body** — destroyed `rock_10`, then under-cleared.
3. **Shipping AI BOX downsamples without hole-fill** — swiss-cheese `rock_08`.
4. **Hard-masking ultimate glow while keeping sheet cyan** — checker stays in the aura; better to drop glow or synthesize a clean rim.
5. **Accepting vision QA alone** — rejects clean `rock_01`-quality edges; always run metrics.
6. **Re-running extract-sprites over curated Path-B PNGs** without restoring Path B.

---

## Quick reference — important files

| Path | Role |
|------|------|
| `assets/rocks-and-crystals.png` | Opaque source sheet |
| `scripts/extract-sprites.py` | Path A automation |
| `assets/sprites/rocks/` | Rock outputs (`rock_01`…`rock_10`) |
| `assets/sprites/crystals/` | Crystal outputs |
| `assets/sprites/rocks/rock_01.png` | Style / edge quality reference |
| `assets/sprites/crystals/blue_cluster.png` | Clean crystal reference |

## Example sizes (post Path B rebuild)

| Sprite | Approx size | Notes |
|--------|-------------|--------|
| rock_08 | ~96×84 | Marble veins preserved |
| rock_10 | ~93×104 | No cool fringe |
| ultimate_gold | ~117×138 | Gold + sparkle; no checker glow |

---

## Minimal Python skeleton (Path B)

```python
from PIL import Image, ImageFilter
import numpy as np

def chromakey_magenta(im):
    a = np.array(im.convert("RGBA"))
    r, g, b = a[:, :, 0].astype(int), a[:, :, 1].astype(int), a[:, :, 2].astype(int)
    mag = ((r > 160) & (b > 140) & (g < 110) & (r > g + 40)) | ((r > 180) & (b > 180) & (g < 90))
    a[mag, 3] = 0
    return Image.fromarray(a, "RGBA")

def fill_holes(im, iters=5):
    a = np.array(im)
    m = Image.fromarray(((a[:, :, 3] >= 200) * 255).astype(np.uint8), "L")
    for _ in range(iters):
        m = m.filter(ImageFilter.MaxFilter(3))
    for _ in range(iters):
        m = m.filter(ImageFilter.MinFilter(3))
    closed = np.array(m) >= 128
    orig = a[:, :, 3] >= 200
    out = a.copy()
    out[~orig, 3] = 0
    newly = closed & ~orig
    for _ in range(16):
        ys, xs = np.where(newly & (out[:, :, 3] < 200))
        if len(ys) == 0:
            break
        for y, x in zip(ys, xs):
            for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                ny, nx = y + dy, x + dx
                if 0 <= ny < a.shape[0] and 0 <= nx < a.shape[1] and out[ny, nx, 3] >= 200:
                    out[y, x, :3] = out[ny, nx, :3]
                    out[y, x, 3] = 255
                    break
        newly = closed & (out[:, :, 3] < 200)
    out[~closed, 3] = 0
    return Image.fromarray(out, "RGBA")

def to_game_size(im, long_side):
    w, h = im.size
    s = long_side / max(w, h)
    return im.resize((max(1, round(w * s)), max(1, round(h * s))), Image.NEAREST)

# pipeline: chromakey → fill_holes → scrub edges → to_game_size → scrub → crop → save
```

Extend with largest-component keep, exterior fringe peel, and metrics from the sections above before committing.
