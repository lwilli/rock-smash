import { SAVE_KEY } from "./config";
import type { SaveData } from "./types";

export function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveData;
    if (data.version !== 1) return null;
    return data;
  } catch {
    return null;
  }
}

export function writeSave(data: SaveData) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // ignore quota / private mode
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}

export function defaultSave(): SaveData {
  return {
    version: 1,
    score: 0,
    smasherIndex: 0,
    rockCount: 0,
    bestScore: 0,
    crystalsFound: 0,
    victories: 0,
    hasWon: false,
  };
}
