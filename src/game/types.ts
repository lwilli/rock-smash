export type GamePhase = "ready" | "striking" | "revealing";
export type Screen = "title" | "playing" | "victory";

export type CrystalId =
  | "none"
  | "blue_pyramid"
  | "blue_cluster"
  | "orange_star"
  | "green_shield"
  | "purple_spikes"
  | "green_diamond"
  | "ultimate_gold";

export type SmasherId = "stone" | "lightning" | "fire" | "diamond";

export type Rock = {
  id: number;
  variant: number;
  damage: number;
  maxHp: number;
  phase: GamePhase;
  crystalId: CrystalId;
  points: number;
  revealTimer: number;
  hitFlash: number;
  shake: number;
};

export type SmasherDef = {
  id: SmasherId;
  name: string;
  damage: number;
  unlockScore: number;
  accent: string;
  strikeDuration: number;
};

export type CrystalDef = {
  id: CrystalId;
  name: string;
  points: number;
  weight: number;
  color: string;
};

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
  kind: "chip" | "spark" | "ember" | "star";
};

export type Floater = {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  vy: number;
};

export type SaveData = {
  version: 1;
  score: number;
  smasherIndex: number;
  rockCount: number;
  bestScore: number;
  crystalsFound: number;
  victories: number;
  hasWon: boolean;
};
