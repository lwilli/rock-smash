import type { SmasherId } from "./types";

const loadImage = (src: string): HTMLImageElement => {
  const image = new Image();
  image.src = src;
  return image;
};

import rock01 from "../../assets/sprites/rocks/rock_01.png";
import rock02 from "../../assets/sprites/rocks/rock_02.png";
import rock03 from "../../assets/sprites/rocks/rock_03.png";
import rock04 from "../../assets/sprites/rocks/rock_04.png";
import rock05 from "../../assets/sprites/rocks/rock_05.png";
import rock06 from "../../assets/sprites/rocks/rock_06.png";
import rock07 from "../../assets/sprites/rocks/rock_07.png";
import rock08 from "../../assets/sprites/rocks/rock_08.png";
import rock09 from "../../assets/sprites/rocks/rock_09.png";
import rock10 from "../../assets/sprites/rocks/rock_10.png";

import bluePyramid from "../../assets/sprites/crystals/blue_pyramid.png";
import blueCluster from "../../assets/sprites/crystals/blue_cluster.png";
import orangeStar from "../../assets/sprites/crystals/orange_star.png";
import greenShield from "../../assets/sprites/crystals/green_shield.png";
import purpleSpikes from "../../assets/sprites/crystals/purple_spikes.png";
import greenDiamond from "../../assets/sprites/crystals/green_diamond.png";
import ultimateGold from "../../assets/sprites/crystals/ultimate_gold.png";

import stoneIdle from "../../assets/sprites/smashers/stone_idle.png";
import stoneSwing1 from "../../assets/sprites/smashers/stone_swing1.png";
import stoneSwing2 from "../../assets/sprites/smashers/stone_swing2.png";
import stoneEffect from "../../assets/sprites/smashers/stone_effect.png";

import lightningIdle from "../../assets/sprites/smashers/lightning_idle.png";
import lightningSwing1 from "../../assets/sprites/smashers/lightning_swing1.png";
import lightningSwing2 from "../../assets/sprites/smashers/lightning_swing2.png";
import lightningEffect from "../../assets/sprites/smashers/lightning_effect.png";

import fireIdle from "../../assets/sprites/smashers/fire_idle.png";
import fireSwing1 from "../../assets/sprites/smashers/fire_swing1.png";
import fireEffect from "../../assets/sprites/smashers/fire_effect.png";

import diamondIdle from "../../assets/sprites/smashers/diamond_idle.png";
import diamondSwing1 from "../../assets/sprites/smashers/diamond_swing1.png";
import diamondEffect from "../../assets/sprites/smashers/diamond_effect.png";

export type SmasherSprites = {
  idle: HTMLImageElement;
  swings: HTMLImageElement[];
  effect: HTMLImageElement;
};

export const rockImages = [
  loadImage(rock01),
  loadImage(rock02),
  loadImage(rock03),
  loadImage(rock04),
  loadImage(rock05),
  loadImage(rock06),
  loadImage(rock07),
  loadImage(rock08),
  loadImage(rock09),
  loadImage(rock10),
];

export const crystalImages: Record<string, HTMLImageElement> = {
  blue_pyramid: loadImage(bluePyramid),
  blue_cluster: loadImage(blueCluster),
  orange_star: loadImage(orangeStar),
  green_shield: loadImage(greenShield),
  purple_spikes: loadImage(purpleSpikes),
  green_diamond: loadImage(greenDiamond),
  ultimate_gold: loadImage(ultimateGold),
};

export const smasherSprites: Record<SmasherId, SmasherSprites> = {
  stone: {
    idle: loadImage(stoneIdle),
    swings: [loadImage(stoneSwing1), loadImage(stoneSwing2)],
    effect: loadImage(stoneEffect),
  },
  lightning: {
    idle: loadImage(lightningIdle),
    swings: [loadImage(lightningSwing1), loadImage(lightningSwing2)],
    effect: loadImage(lightningEffect),
  },
  fire: {
    idle: loadImage(fireIdle),
    swings: [loadImage(fireSwing1)],
    effect: loadImage(fireEffect),
  },
  diamond: {
    idle: loadImage(diamondIdle),
    swings: [loadImage(diamondSwing1)],
    effect: loadImage(diamondEffect),
  },
};

export function imageReady(img: HTMLImageElement): boolean {
  return img.complete && img.naturalWidth > 0;
}
