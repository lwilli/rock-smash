# Rock Smash — Design Decisions

Completed revitalization of the v0.1 prototype into a polished single-session incremental game.

## Vision
Tap to smash rocks, crack them open, discover crystals, unlock stronger smashers, and chase the Ultimate Crystal.

## Tech
- Pure frontend TypeScript + Vite + Canvas 2D (no framework)
- Web Audio API for synthesized SFX (no audio files)
- `localStorage` for light progress persistence
- Sprite sheets sliced into `assets/sprites/`

## Smashers (aligned to art sheet)

| Tier | Name | Damage | Unlock score | Feel |
|------|------|--------|--------------|------|
| 1 | Stone Smasher | 14 | 0 | Crack hit effect |
| 2 | Lightning Smasher | 24 | 150 | Electric burst |
| 3 | Fire Smasher | 38 | 420 | Ember spray |
| 4 | Diamond Axe | 58 | 950 | Crystal starburst |

Rock HP is always **100**. Higher tiers break rocks in fewer hits and play stronger swing/hit VFX.

## Crystals

| Crystal | Points | Relative weight |
|---------|--------|-----------------|
| Blue Pyramid | 18 | Common |
| Blue Cluster | 35 | Uncommon |
| Orange Star | 60 | Uncommon |
| Green Shield | 95 | Rare |
| Purple Spikes | 160 | Rare |
| Green Diamond | 280 | Epic |
| Ultimate Gold | 1000 | Special |

- ~32% chance a rock is empty
- Weighted roll among the six standard crystals when not empty
- Ultimate Crystal: guaranteed on every 8th rock after Diamond Axe is unlocked; also possible as a tiny weighted roll late-game

## Loop
1. **Title** → Start / Continue
2. **Ready** → tap to strike
3. **Striking** → swing frames + hit effect + particles + shake
4. Rock HP drains; procedural crack overlays intensify with damage
5. At 100 damage → **Revealing** (crystal or empty)
6. Auto-advance after ~1.6s, or tap/button to continue
7. Score unlocks next smasher with a banner
8. Finding Ultimate Crystal → **Victory** screen (can keep playing)

## Polish shipped
- 10 rock variants, 7 crystals, 4 smashers with idle/swing/effect frames
- Damage-linked crack stages, screen shake, floating text, rock chips
- Per-smasher hit particles and SFX
- HUD: score, smasher, unlock progress, rock HP bar, rocks smashed
- Title + victory overlays, unlock toast
- Save/load + New Game

## Out of scope (intentional)
- Backend / accounts / leaderboards
- Shop economy beyond score unlocks
- Separate cracked-rock sprite sheets (procedural cracks instead)
