import type { CrystalDef, SmasherDef } from "./types";

export const ROCK_HP = 100;
export const SAVE_KEY = "rock-smash-save-v1";

export const SMASHERS: SmasherDef[] = [
  {
    id: "stone",
    name: "Stone Smasher",
    damage: 14,
    unlockScore: 0,
    accent: "#a8a29e",
    strikeDuration: 0.28,
  },
  {
    id: "lightning",
    name: "Lightning Smasher",
    damage: 24,
    unlockScore: 150,
    accent: "#38bdf8",
    strikeDuration: 0.24,
  },
  {
    id: "fire",
    name: "Fire Smasher",
    damage: 38,
    unlockScore: 420,
    accent: "#f97316",
    strikeDuration: 0.22,
  },
  {
    id: "diamond",
    name: "Diamond Axe",
    damage: 58,
    unlockScore: 950,
    accent: "#22d3ee",
    strikeDuration: 0.2,
  },
];

export const CRYSTALS: CrystalDef[] = [
  {
    id: "blue_pyramid",
    name: "Blue Pyramid",
    points: 18,
    weight: 34,
    color: "#60a5fa",
  },
  {
    id: "blue_cluster",
    name: "Blue Cluster",
    points: 35,
    weight: 24,
    color: "#7dd3fc",
  },
  {
    id: "orange_star",
    name: "Orange Star",
    points: 60,
    weight: 16,
    color: "#fb923c",
  },
  {
    id: "green_shield",
    name: "Green Shield",
    points: 95,
    weight: 12,
    color: "#4ade80",
  },
  {
    id: "purple_spikes",
    name: "Purple Spikes",
    points: 160,
    weight: 9,
    color: "#c084fc",
  },
  {
    id: "green_diamond",
    name: "Green Diamond",
    points: 280,
    weight: 5,
    color: "#86efac",
  },
];

export const ULTIMATE = {
  id: "ultimate_gold" as const,
  name: "Ultimate Crystal",
  points: 1000,
  color: "#fbbf24",
};

export const EMPTY_ROCK_CHANCE = 0.32;
export const REVEAL_AUTO_ADVANCE = 1.65;
export const ROCK_VARIANT_COUNT = 10;
