type GamePhase = "ready" | "striking" | "revealing";
type CrystalType = "none" | "common" | "rare" | "gold" | "final";

type Rock = {
  id: number;
  damage: number;
  phase: GamePhase;
  hasCrystal: boolean;
  crystalType: CrystalType;
  points: number;
  isFinalRock: boolean;
  revealTimer: number;
};

type Smasher = {
  name: string;
  damage: number;
  unlockScore: number;
  color: string;
};

import regularSmasherIdleUrl from "../assets/regular_smasher_idle.png";
import regularSmasherEffectUrl from "../assets/regular_smasher_effect.png";
import rock1BaseUrl from "../assets/rock_1_base.png";
import crystal25Url from "../assets/crystal_25.png";

const smashers: Smasher[] = [
  { name: "Stone Smasher", damage: 12, unlockScore: 0, color: "#d97706" },
  { name: "Crack Hammer", damage: 18, unlockScore: 120, color: "#2563eb" },
  { name: "Meteor Maul", damage: 26, unlockScore: 300, color: "#facc15" },
];

const canvas = document.createElement("canvas");
const app = document.querySelector("#app");
if (!app) throw new Error("Missing app root");
app.appendChild(canvas);

const ctx = canvas.getContext("2d");
if (!ctx) throw new Error("Could not create 2D canvas context");

const drawingContext = ctx as CanvasRenderingContext2D;

const ui = document.createElement("div");
ui.className = "hud";
ui.innerHTML = `
  <div class="panel">
    <div class="title">Rock Smash</div>
    <div class="stats">
      <div>Score: <strong id="score">0</strong></div>
      <div>Smasher: <strong id="smasher">Stone Smasher</strong></div>
      <div>Next unlock: <strong id="unlock">120</strong></div>
    </div>
    <div class="hint">Tap or click to smash</div>
    <button id="next-rock" class="next-button" disabled>Next rock</button>
  </div>
`;
app.appendChild(ui);

const scoreEl = document.getElementById("score");
const smasherEl = document.getElementById("smasher");
const unlockEl = document.getElementById("unlock");
const nextRockButton = document.getElementById("next-rock") as HTMLButtonElement | null;

let score = 0;
let currentSmasherIndex = 0;
let rockCount = 0;
let currentRock!: Rock;
let animationTime = 0;
let lastTime = 0;
let pointerActive = false;

const loadImage = (src: string) => {
  const image = new Image();
  image.src = src;
  return image;
};

const smasherImage = loadImage(regularSmasherIdleUrl);
const effectImage = loadImage(regularSmasherEffectUrl);
const rockImage = loadImage(rock1BaseUrl);
const crystalImage = loadImage(crystal25Url);

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * ratio);
  canvas.height = Math.floor(window.innerHeight * ratio);
  drawingContext.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function createRock(): Rock {
  rockCount += 1;
  const isFinalRock = rockCount % 6 === 0;
  const hasCrystal = Math.random() < 0.65;

  let crystalType: CrystalType = "none";
  let points = 0;

  if (hasCrystal) {
    const roll = Math.random();
    if (roll < 0.6) {
      crystalType = "common";
      points = 25;
    } else if (roll < 0.9) {
      crystalType = "rare";
      points = 70;
    } else {
      crystalType = "gold";
      points = 140;
    }
  }

  if (isFinalRock && currentSmasherIndex >= 2) {
    crystalType = "final";
    points = 1000;
  }

  return {
    id: rockCount,
    damage: 0,
    phase: "ready",
    hasCrystal: crystalType !== "none",
    crystalType,
    points,
    isFinalRock,
    revealTimer: 0,
  };
}

function resetRock() {
  currentRock = createRock();
  animationTime = 0;
}

function handleNextRock() {
  if (currentRock.phase !== "revealing") return;
  resetRock();
}

function updateHud() {
  if (scoreEl) scoreEl.textContent = score.toString();
  if (smasherEl) smasherEl.textContent = smashers[currentSmasherIndex].name;
  if (unlockEl) {
    const nextUnlock = smashers[currentSmasherIndex + 1]?.unlockScore ?? "Max";
    unlockEl.textContent = typeof nextUnlock === "number" ? nextUnlock.toString() : nextUnlock;
  }

  if (nextRockButton) {
    nextRockButton.disabled = currentRock.phase !== "revealing";
    nextRockButton.style.opacity = currentRock.phase === "revealing" ? "1" : "0.45";
  }
}

function checkUnlocks() {
  if (currentSmasherIndex < smashers.length - 1 && score >= smashers[currentSmasherIndex + 1].unlockScore) {
    currentSmasherIndex += 1;
  }
}

function handleStrike() {
  if (currentRock.phase !== "ready") return;

  const currentSmasher = smashers[currentSmasherIndex];
  currentRock.damage = Math.min(100, currentRock.damage + currentSmasher.damage);
  currentRock.phase = "striking";
  animationTime = 0;

  if (currentRock.damage >= 100) {
    currentRock.phase = "revealing";
    currentRock.revealTimer = 0;

    if (currentRock.crystalType !== "none") {
      score += currentRock.points;
    }

    checkUnlocks();
  }
}

function update(delta: number) {
  animationTime += delta;

  if (currentRock.phase === "striking") {
    if (animationTime > 0.8) {
      currentRock.phase = currentRock.damage >= 100 ? "revealing" : "ready";
      animationTime = 0;
    }
  }

  if (currentRock.phase === "revealing") {
    currentRock.revealTimer += delta;
  }

  updateHud();
}

function drawBackground() {
  const gradient = drawingContext.createLinearGradient(0, 0, 0, window.innerHeight);
  gradient.addColorStop(0, "#111827");
  gradient.addColorStop(0.5, "#1f2937");
  gradient.addColorStop(1, "#0f172a");
  drawingContext.fillStyle = gradient;
  drawingContext.fillRect(0, 0, window.innerWidth, window.innerHeight);
}

function drawRock() {
  if (currentRock.phase === "revealing") return;

  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2 - 20;
  const rockWidth = Math.min(window.innerWidth * 0.6, 220);
  const rockHeight = Math.min(window.innerHeight * 0.45, 240);

  drawingContext.save();
  drawingContext.translate(centerX, centerY);

  if (rockImage.complete) {
    drawingContext.drawImage(rockImage, -rockWidth / 2, -rockHeight / 2, rockWidth, rockHeight);
  } else {
    drawingContext.fillStyle = "#4b5563";
    drawingContext.beginPath();
    drawingContext.roundRect(-rockWidth / 2, -rockHeight / 2, rockWidth, rockHeight, 26);
    drawingContext.fill();
  }

  if (currentRock.phase === "striking") {
    const effectAlpha = Math.max(0.15, 1 - animationTime / 0.8);
    if (effectImage.complete) {
      drawingContext.save();
      drawingContext.globalAlpha = effectAlpha;
      drawingContext.drawImage(effectImage, -rockWidth / 2, -rockHeight / 2, rockWidth, rockHeight);
      drawingContext.restore();
    }
  }

  drawingContext.restore();
}

function drawCrystal() {
  if (currentRock.crystalType === "none" || currentRock.phase !== "revealing") return;

  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2 - 15;
  const pulse = 1 + Math.sin(currentRock.revealTimer * 8) * 0.06;
  const crystalWidth = 90;
  const crystalHeight = 90;

  drawingContext.save();
  drawingContext.translate(centerX, centerY);
  drawingContext.scale(pulse, pulse);

  if (crystalImage.complete) {
    drawingContext.drawImage(crystalImage, -crystalWidth / 2, -crystalHeight / 2, crystalWidth, crystalHeight);
  } else {
    drawingContext.fillStyle = "#8b5cf6";
    drawingContext.beginPath();
    drawingContext.moveTo(0, -40);
    drawingContext.lineTo(28, -8);
    drawingContext.lineTo(10, 36);
    drawingContext.lineTo(-10, 36);
    drawingContext.lineTo(-28, -8);
    drawingContext.closePath();
    drawingContext.fill();
  }

  drawingContext.restore();
}

function drawSmasher() {
  const currentSmasher = smashers[currentSmasherIndex];
  const rockCenterX = window.innerWidth / 2;
  const rockCenterY = window.innerHeight / 2 - 20;
  const baseX = rockCenterX + Math.min(window.innerWidth * 0.16, 70);
  const baseY = rockCenterY - Math.min(window.innerHeight * 0.12, 70);
  const smasherWidth = Math.min(window.innerWidth * 0.25, 140);
  const smasherHeight = Math.min(window.innerHeight * 0.2, 140);
  const swingAmount = currentRock.phase === "striking"
    ? Math.sin(animationTime * 12) * 0.18 - 0.2
    : -0.2;

  drawingContext.save();
  drawingContext.translate(baseX, baseY);
  drawingContext.rotate(swingAmount);

  if (smasherImage.complete) {
    drawingContext.drawImage(smasherImage, -smasherWidth / 2, -smasherHeight / 2, smasherWidth, smasherHeight);
  } else {
    drawingContext.fillStyle = currentSmasher.color;
    drawingContext.fillRect(-18, -70, 36, 80);
    drawingContext.fillStyle = "#f5f5f5";
    drawingContext.fillRect(-8, -90, 16, 28);
  }

  drawingContext.restore();
}

function drawFlash() {
  if (currentRock.phase !== "revealing") return;
  const alpha = currentRock.revealTimer < 0.3 ? 0.35 : 0.12;
  drawingContext.fillStyle = `rgba(255,255,255,${alpha})`;
  drawingContext.fillRect(0, 0, window.innerWidth, window.innerHeight);
}

function render() {
  drawBackground();
  drawRock();
  drawCrystal();
  drawFlash();
  drawSmasher();

  if (currentRock.phase === "revealing" && currentRock.crystalType !== "none") {
    drawingContext.fillStyle = "white";
    drawingContext.font = "bold 22px sans-serif";
    drawingContext.textAlign = "center";
    drawingContext.fillText(`+${currentRock.points} pts`, window.innerWidth / 2, 70);
  }
}

function gameLoop(timestamp: number) {
  if (!lastTime) lastTime = timestamp;
  const delta = Math.min((timestamp - lastTime) / 1000, 0.03);
  lastTime = timestamp;
  update(delta);
  render();
  requestAnimationFrame(gameLoop);
}

function bindInput() {
  const onPointerDown = () => {
    if (pointerActive) return;
    pointerActive = true;
    handleStrike();
  };

  const onPointerUp = () => {
    pointerActive = false;
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointerleave", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  nextRockButton?.addEventListener("click", handleNextRock);
}

resizeCanvas();
bindInput();
resetRock();
updateHud();
requestAnimationFrame(gameLoop);
window.addEventListener("resize", resizeCanvas);