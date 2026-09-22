import {
  CRYSTALS,
  EMPTY_ROCK_CHANCE,
  ROCK_HP,
  ROCK_VARIANT_COUNT,
  SMASHERS,
  ULTIMATE,
} from "./config";
import {
  crystalImages,
  imageReady,
  rockImages,
  smasherSprites,
} from "./assets";
import { audio } from "./audio";
import {
  addFloater,
  drawFloaters,
  drawParticles,
  spawnBreakBurst,
  spawnCrystalSparkles,
  spawnHitParticles,
  updateFloaters,
  updateParticles,
} from "./particles";
import { clearSave, defaultSave, loadSave, writeSave } from "./save";
import type {
  CrystalId,
  Floater,
  Particle,
  Rock,
  SaveData,
  Screen,
} from "./types";

type HudEls = {
  root: HTMLElement;
  score: HTMLElement;
  smasher: HTMLElement;
  unlock: HTMLElement;
  unlockFill: HTMLElement;
  rocks: HTMLElement;
  crystals: HTMLElement;
  muteBtn: HTMLButtonElement;
  toast: HTMLElement;
  overlay: HTMLElement;
  overlayTitle: HTMLElement;
  overlayBody: HTMLElement;
  overlayPrimary: HTMLButtonElement;
  overlaySecondary: HTMLButtonElement;
  hpFill: HTMLElement;
  hpWrap: HTMLElement;
};

export class RockSmashGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private hud: HudEls;

  private screen: Screen = "title";
  private score = 0;
  private smasherIndex = 0;
  private rockCount = 0;
  private bestScore = 0;
  private crystalsFound = 0;
  private victories = 0;
  private hasWon = false;

  private rock!: Rock;
  private animationTime = 0;
  private lastTime = 0;
  private pointerActive = false;
  private screenShake = 0;
  private particles: Particle[] = [];
  private floaters: Floater[] = [];
  private toastTimer = 0;
  private bgDust: { x: number; y: number; s: number; a: number }[] = [];
  private pendingVictory = false;
  private pendingBreak = false;
  private hitQueued = false;
  /** Blocks advancing past a reveal so the breaking tap can't skip the gem. */
  private revealLock = 0;

  constructor(app: HTMLElement) {
    this.canvas = document.createElement("canvas");
    app.appendChild(this.canvas);
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("Could not create 2D canvas context");
    this.ctx = ctx;

    this.hud = this.buildHud(app);
    this.initBgDust();
    this.bindInput();
    this.hydrateFromSave();
    this.resetRock(false);
    this.showTitle();
    this.resize();
    window.addEventListener("resize", () => this.resize());
    requestAnimationFrame((t) => this.loop(t));
  }

  private buildHud(app: HTMLElement): HudEls {
    const root = document.createElement("div");
    root.className = "hud";
    root.innerHTML = `
      <div class="top-bar">
        <div class="brand">
          <span class="brand-mark">◆</span>
          <span class="brand-name">Rock Smash</span>
        </div>
        <div class="top-actions">
          <button type="button" class="icon-btn" id="mute-btn" title="Mute">SFX</button>
        </div>
      </div>

      <div class="panel play-panel" id="play-panel">
        <div class="stat-row"><span>Score</span><strong id="score">0</strong></div>
        <div class="stat-row"><span>Smasher</span><strong id="smasher">Stone Smasher</strong></div>
        <div class="stat-row unlock-row">
          <span>Next unlock</span><strong id="unlock">150</strong>
        </div>
        <div class="progress"><div class="progress-fill" id="unlock-fill"></div></div>
        <div class="meta-row">
          <span>Rocks <strong id="rocks">0</strong></span>
          <span>Crystals <strong id="crystals">0</strong></span>
        </div>
      </div>

      <div class="hp-wrap" id="hp-wrap">
        <div class="hp-label">Rock integrity</div>
        <div class="hp-bar"><div class="hp-fill" id="hp-fill"></div></div>
      </div>

      <div class="toast" id="toast" hidden></div>

      <div class="overlay" id="overlay">
        <div class="overlay-card">
          <div class="overlay-eyebrow" id="overlay-eyebrow">Incremental smash</div>
          <h1 class="overlay-title" id="overlay-title">Rock Smash</h1>
          <p class="overlay-body" id="overlay-body">
            Crack open rocks, uncover crystals, and unlock legendary smashers.
          </p>
          <div class="overlay-actions">
            <button type="button" class="primary-btn" id="overlay-primary">Start smashing</button>
            <button type="button" class="ghost-btn" id="overlay-secondary">New game</button>
          </div>
        </div>
      </div>
    `;
    app.appendChild(root);

    return {
      root,
      score: root.querySelector("#score")!,
      smasher: root.querySelector("#smasher")!,
      unlock: root.querySelector("#unlock")!,
      unlockFill: root.querySelector("#unlock-fill")!,
      rocks: root.querySelector("#rocks")!,
      crystals: root.querySelector("#crystals")!,
      muteBtn: root.querySelector("#mute-btn") as HTMLButtonElement,
      toast: root.querySelector("#toast")!,
      overlay: root.querySelector("#overlay")!,
      overlayTitle: root.querySelector("#overlay-title")!,
      overlayBody: root.querySelector("#overlay-body")!,
      overlayPrimary: root.querySelector("#overlay-primary") as HTMLButtonElement,
      overlaySecondary: root.querySelector("#overlay-secondary") as HTMLButtonElement,
      hpFill: root.querySelector("#hp-fill")!,
      hpWrap: root.querySelector("#hp-wrap")!,
    };
  }

  private initBgDust() {
    for (let i = 0; i < 40; i += 1) {
      this.bgDust.push({
        x: Math.random(),
        y: Math.random(),
        s: 1 + Math.random() * 2,
        a: 0.08 + Math.random() * 0.18,
      });
    }
  }

  private hydrateFromSave() {
    const save = loadSave();
    if (!save) return;
    this.applySave(save);
  }

  private applySave(save: SaveData) {
    this.score = save.score;
    this.smasherIndex = Math.min(save.smasherIndex, SMASHERS.length - 1);
    this.rockCount = save.rockCount;
    this.bestScore = save.bestScore;
    this.crystalsFound = save.crystalsFound;
    this.victories = save.victories;
    this.hasWon = save.hasWon;
  }

  private persist() {
    const data: SaveData = {
      version: 1,
      score: this.score,
      smasherIndex: this.smasherIndex,
      rockCount: this.rockCount,
      bestScore: Math.max(this.bestScore, this.score),
      crystalsFound: this.crystalsFound,
      victories: this.victories,
      hasWon: this.hasWon,
    };
    this.bestScore = data.bestScore;
    writeSave(data);
  }

  private showTitle() {
    this.screen = "title";
    const hasProgress =
      this.score > 0 ||
      this.smasherIndex > 0 ||
      this.bestScore > 0 ||
      this.crystalsFound > 0 ||
      this.victories > 0;
    this.hud.overlay.hidden = false;
    this.hud.overlay.classList.remove("victory");
    (this.hud.overlay.querySelector("#overlay-eyebrow") as HTMLElement).textContent =
      "Incremental smash";
    this.hud.overlayTitle.textContent = "Rock Smash";
    this.hud.overlayBody.textContent = hasProgress
      ? `Continue your streak — score ${this.score}, best ${this.bestScore}.`
      : "Crack open rocks, uncover crystals, and unlock legendary smashers.";
    this.hud.overlayPrimary.textContent = hasProgress ? "Continue" : "Start smashing";
    this.hud.overlaySecondary.hidden = !hasProgress;
    this.hud.overlaySecondary.textContent = "New game";
    this.hud.root.classList.add("on-title");
    this.syncHud();
  }

  private showVictory() {
    this.screen = "victory";
    this.pendingVictory = false;
    this.victories += 1;
    this.hasWon = true;
    this.persist();
    audio.victory();
    this.hud.overlay.hidden = false;
    this.hud.overlay.classList.add("victory");
    (this.hud.overlay.querySelector("#overlay-eyebrow") as HTMLElement).textContent =
      "Legendary find";
    this.hud.overlayTitle.textContent = "Ultimate Crystal!";
    this.hud.overlayBody.textContent =
      `You unearthed the Ultimate Crystal for +${ULTIMATE.points} pts. Score ${this.score}. Keep smashing or start fresh.`;
    this.hud.overlayPrimary.textContent = "Keep smashing";
    this.hud.overlaySecondary.hidden = false;
    this.hud.overlaySecondary.textContent = "New game";
    this.hud.root.classList.add("on-title");
  }

  private startPlaying(fresh: boolean) {
    if (fresh) {
      clearSave();
      this.applySave(defaultSave());
      this.resetRock(false);
    }
    this.screen = "playing";
    this.hud.overlay.hidden = true;
    this.hud.root.classList.remove("on-title");
    audio.resume();
    audio.ui();
    this.syncHud();
  }

  private bindInput() {
    const onDown = (e: PointerEvent) => {
      if (this.pointerActive) return;
      if (this.screen !== "playing") return;
      if ((e.target as HTMLElement).closest("button, .panel, .top-bar")) return;
      this.pointerActive = true;
      audio.resume();
      this.handleStrike();
    };
    const onUp = () => {
      this.pointerActive = false;
    };

    this.canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    this.hud.muteBtn.addEventListener("click", () => {
      audio.setMuted(!audio.isMuted());
      this.hud.muteBtn.textContent = audio.isMuted() ? "OFF" : "SFX";
      this.hud.muteBtn.title = audio.isMuted() ? "Unmute" : "Mute";
      this.hud.muteBtn.classList.toggle("muted", audio.isMuted());
    });

    this.hud.overlayPrimary.addEventListener("click", () => {
      if (this.screen === "victory") {
        this.startPlaying(false);
        this.advanceRock();
        return;
      }
      this.startPlaying(false);
    });

    this.hud.overlaySecondary.addEventListener("click", () => {
      this.startPlaying(true);
    });
  }

  private resize() {
    const ratio = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(window.innerWidth * ratio);
    this.canvas.height = Math.floor(window.innerHeight * ratio);
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  private createRock(): Rock {
    this.rockCount += 1;
    const diamondUnlocked = this.smasherIndex >= SMASHERS.length - 1;
    const forceUltimate = diamondUnlocked && this.rockCount % 8 === 0;

    let crystalId: CrystalId = "none";
    let points = 0;

    if (forceUltimate) {
      crystalId = ULTIMATE.id;
      points = ULTIMATE.points;
    } else if (Math.random() >= EMPTY_ROCK_CHANCE) {
      const roll = this.rollCrystal(diamondUnlocked);
      crystalId = roll.id;
      points = roll.points;
    }

    return {
      id: this.rockCount,
      variant: Math.floor(Math.random() * ROCK_VARIANT_COUNT),
      damage: 0,
      maxHp: ROCK_HP,
      phase: "ready",
      crystalId,
      points,
      revealTimer: 0,
      hitFlash: 0,
      shake: 0,
    };
  }

  private rollCrystal(allowUltimate: boolean): { id: CrystalId; points: number } {
    if (allowUltimate && Math.random() < 0.035) {
      return { id: ULTIMATE.id, points: ULTIMATE.points };
    }
    const total = CRYSTALS.reduce((sum, c) => sum + c.weight, 0);
    let r = Math.random() * total;
    for (const c of CRYSTALS) {
      r -= c.weight;
      if (r <= 0) return { id: c.id, points: c.points };
    }
    const last = CRYSTALS[CRYSTALS.length - 1];
    return { id: last.id, points: last.points };
  }

  private resetRock(fromAdvance: boolean) {
    this.rock = this.createRock();
    this.animationTime = 0;
    if (fromAdvance) this.persist();
  }

  private advanceRock() {
    if (this.rock.phase !== "revealing") return;
    if (this.revealLock > 0) return;
    if (this.pendingVictory) {
      this.showVictory();
      return;
    }
    this.resetRock(true);
    this.syncHud();
  }

  private handleStrike() {
    if (this.screen !== "playing") return;

    if (this.rock.phase === "revealing") {
      if (this.revealLock > 0) return;
      this.advanceRock();
      return;
    }
    if (this.rock.phase === "striking") {
      // Buffer a hit once the swing has landed so rapid taps feel responsive
      const t = this.animationTime / SMASHERS[this.smasherIndex].strikeDuration;
      if (t >= 0.45) this.hitQueued = true;
      return;
    }
    if (this.rock.phase !== "ready") return;

    this.performStrike();
  }

  private performStrike() {
    this.hitQueued = false;
    const smasher = SMASHERS[this.smasherIndex];
    this.rock.damage = Math.min(this.rock.maxHp, this.rock.damage + smasher.damage);
    this.rock.phase = "striking";
    this.rock.hitFlash = 0.18;
    this.rock.shake = 10 + smasher.damage * 0.15;
    this.animationTime = 0;
    this.screenShake = 6 + this.smasherIndex * 2;

    const center = this.rockCenter();
    spawnHitParticles(this.particles, center.x, center.y, smasher.id);
    addFloater(this.floaters, center.x, center.y - 50, `-${smasher.damage}`, "#f8fafc");
    audio.hit(this.smasherIndex);

    if (this.rock.damage >= this.rock.maxHp) {
      this.pendingBreak = true;
    }
  }

  private breakRock() {
    this.pendingBreak = false;
    this.hitQueued = false;
    const center = this.rockCenter();
    spawnBreakBurst(this.particles, center.x, center.y);
    audio.breakRock();

    this.rock.phase = "revealing";
    this.rock.revealTimer = 0;
    this.animationTime = 0;
    // Require a deliberate follow-up tap; ignore the breaking strike / queued hits
    this.revealLock = 0.6;

    if (this.rock.crystalId !== "none") {
      this.score += this.rock.points;
      this.crystalsFound += 1;
      const color =
        this.rock.crystalId === ULTIMATE.id
          ? ULTIMATE.color
          : CRYSTALS.find((c) => c.id === this.rock.crystalId)?.color ?? "#fff";
      spawnCrystalSparkles(this.particles, center.x, center.y, color);
      addFloater(
        this.floaters,
        center.x,
        center.y - 20,
        `+${this.rock.points}`,
        color,
      );
      audio.crystal(this.rock.points);

      if (this.rock.crystalId === ULTIMATE.id) {
        this.pendingVictory = true;
      }
    } else {
      addFloater(this.floaters, center.x, center.y - 10, "Empty", "#94a3b8");
      audio.empty();
    }

    this.checkUnlocks();
    this.persist();
    this.syncHud();
  }

  private checkUnlocks() {
    let unlocked = false;
    while (
      this.smasherIndex < SMASHERS.length - 1 &&
      this.score >= SMASHERS[this.smasherIndex + 1].unlockScore
    ) {
      this.smasherIndex += 1;
      unlocked = true;
    }
    if (unlocked) {
      const s = SMASHERS[this.smasherIndex];
      this.showToast(`Unlocked: ${s.name}!`);
      audio.unlockFanfare();
    }
  }

  private showToast(text: string) {
    this.hud.toast.hidden = false;
    this.hud.toast.textContent = text;
    this.toastTimer = 2.4;
  }

  private rockCenter() {
    return {
      x: window.innerWidth / 2,
      y: window.innerHeight * 0.52,
    };
  }

  private syncHud() {
    const smasher = SMASHERS[this.smasherIndex];
    this.hud.score.textContent = this.score.toLocaleString();
    this.hud.smasher.textContent = smasher.name;
    this.hud.smasher.style.color = smasher.accent;
    this.hud.rocks.textContent = String(this.rockCount);
    this.hud.crystals.textContent = String(this.crystalsFound);

    const next = SMASHERS[this.smasherIndex + 1];
    if (!next) {
      this.hud.unlock.textContent = "MAX";
      this.hud.unlockFill.style.width = "100%";
    } else {
      this.hud.unlock.textContent = `${this.score} / ${next.unlockScore}`;
      const prev = smasher.unlockScore;
      const pct = Math.min(1, (this.score - prev) / (next.unlockScore - prev));
      this.hud.unlockFill.style.width = `${Math.max(0, pct) * 100}%`;
      this.hud.unlockFill.style.background = next.accent;
    }

    const hpLeft = Math.max(0, 1 - this.rock.damage / this.rock.maxHp);
    this.hud.hpFill.style.width = `${hpLeft * 100}%`;
    this.hud.hpWrap.classList.toggle("hidden-hp", this.rock.phase === "revealing" || this.screen !== "playing");
  }

  private update(dt: number) {
    this.animationTime += dt;
    this.screenShake = Math.max(0, this.screenShake - dt * 28);
    this.rock.hitFlash = Math.max(0, this.rock.hitFlash - dt);
    this.rock.shake = Math.max(0, this.rock.shake - dt * 36);
    this.revealLock = Math.max(0, this.revealLock - dt);

    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.hud.toast.hidden = true;
    }

    if (this.rock.phase === "striking") {
      const dur = SMASHERS[this.smasherIndex].strikeDuration;
      if (this.animationTime >= dur) {
        if (this.pendingBreak || this.rock.damage >= this.rock.maxHp) {
          this.breakRock();
        } else {
          this.rock.phase = "ready";
          this.animationTime = 0;
          if (this.hitQueued) this.performStrike();
        }
      }
    }

    if (this.rock.phase === "revealing" && this.screen === "playing") {
      this.rock.revealTimer += dt;
      // No auto-advance — player must tap / press Next to continue
    }

    updateParticles(this.particles, dt);
    updateFloaters(this.floaters, dt);
    this.syncHud();
  }

  private drawBackground() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const g = this.ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#1a1410");
    g.addColorStop(0.45, "#2a2118");
    g.addColorStop(1, "#0c0a09");
    this.ctx.fillStyle = g;
    this.ctx.fillRect(0, 0, w, h);

    // Warm cave glow behind rock
    const glow = this.ctx.createRadialGradient(w / 2, h * 0.55, 20, w / 2, h * 0.55, Math.min(w, h) * 0.45);
    glow.addColorStop(0, "rgba(251, 146, 60, 0.14)");
    glow.addColorStop(0.5, "rgba(120, 53, 15, 0.08)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    this.ctx.fillStyle = glow;
    this.ctx.fillRect(0, 0, w, h);

    // Floor plane
    this.ctx.fillStyle = "rgba(28, 25, 23, 0.85)";
    this.ctx.beginPath();
    this.ctx.ellipse(w / 2, h * 0.72, Math.min(w * 0.38, 280), 28, 0, 0, Math.PI * 2);
    this.ctx.fill();

    for (const d of this.bgDust) {
      this.ctx.globalAlpha = d.a;
      this.ctx.fillStyle = "#e7e5e4";
      this.ctx.fillRect(d.x * w, d.y * h, d.s, d.s);
    }
    this.ctx.globalAlpha = 1;

    // Vignette
    const vig = this.ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.75);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(0,0,0,0.55)");
    this.ctx.fillStyle = vig;
    this.ctx.fillRect(0, 0, w, h);
  }

  private drawCracks(width: number, height: number, damageRatio: number) {
    if (damageRatio <= 0.04) return;
    const stages = damageRatio < 0.28 ? 1 : damageRatio < 0.5 ? 2 : damageRatio < 0.72 ? 3 : 4;
    this.ctx.save();
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";

    const paths: [number, number][][] = [
      [[-0.05, -0.35], [0.02, -0.05], [0.18, 0.15], [0.08, 0.38]],
      [[0.12, -0.28], [0.05, 0.0], [-0.15, 0.12], [-0.22, 0.32]],
      [[-0.25, -0.05], [-0.05, 0.08], [0.2, 0.02], [0.3, -0.18]],
      [[0.0, -0.4], [-0.08, -0.1], [-0.02, 0.2], [0.12, 0.42]],
    ];

    for (let s = 0; s < stages; s += 1) {
      const path = paths[s];
      // Outer bright seam
      this.ctx.strokeStyle = `rgba(250, 250, 249, ${0.25 + stages * 0.08})`;
      this.ctx.lineWidth = 3.5;
      this.ctx.beginPath();
      path.forEach(([px, py], i) => {
        const x = px * width;
        const y = py * height;
        if (i === 0) this.ctx.moveTo(x, y);
        else this.ctx.lineTo(x, y);
      });
      this.ctx.stroke();

      // Inner dark crack
      this.ctx.strokeStyle = `rgba(12, 10, 9, ${0.55 + stages * 0.1})`;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      path.forEach(([px, py], i) => {
        const x = px * width;
        const y = py * height;
        if (i === 0) this.ctx.moveTo(x, y);
        else this.ctx.lineTo(x, y);
      });
      this.ctx.stroke();

      if (stages >= 3 && s < 2) {
        this.ctx.beginPath();
        this.ctx.moveTo(path[1][0] * width, path[1][1] * height);
        this.ctx.lineTo((path[1][0] + 0.12) * width, (path[1][1] - 0.08) * height);
        this.ctx.stroke();
      }
    }
    this.ctx.restore();
  }

  private drawRock() {
    if (this.rock.phase === "revealing") return;

    const { x: cx, y: cy } = this.rockCenter();
    const img = rockImages[this.rock.variant];
    const maxW = Math.min(window.innerWidth * 0.55, 240);
    const maxH = Math.min(window.innerHeight * 0.38, 220);
    let rw = maxW;
    let rh = maxH;
    if (imageReady(img)) {
      const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
      rw = img.naturalWidth * scale;
      rh = img.naturalHeight * scale;
    }

    const shakeX = this.rock.shake > 0 ? (Math.random() - 0.5) * this.rock.shake : 0;
    const shakeY = this.rock.shake > 0 ? (Math.random() - 0.5) * this.rock.shake * 0.5 : 0;

    this.ctx.save();
    this.ctx.translate(cx + shakeX, cy + shakeY);

    if (imageReady(img)) {
      this.ctx.drawImage(img, -rw / 2, -rh / 2, rw, rh);
    } else {
      this.ctx.fillStyle = "#57534e";
      this.ctx.beginPath();
      this.ctx.ellipse(0, 0, rw / 2, rh / 2, 0, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.drawCracks(rw, rh, this.rock.damage / this.rock.maxHp);

    // Strike effect overlay
    if (this.rock.phase === "striking") {
      const sprites = smasherSprites[SMASHERS[this.smasherIndex].id];
      const effect = sprites.effect;
      if (imageReady(effect)) {
        const t = this.animationTime / SMASHERS[this.smasherIndex].strikeDuration;
        const alpha = t < 0.35 ? 1 : Math.max(0, 1 - (t - 0.35) / 0.65);
        const size = Math.min(rw, rh) * (0.7 + this.smasherIndex * 0.08);
        this.ctx.globalAlpha = alpha;
        this.ctx.drawImage(effect, -size / 2, -size / 2, size, size);
        this.ctx.globalAlpha = 1;
      }
    }

    this.ctx.restore();
  }

  private drawCrystal() {
    if (this.rock.phase !== "revealing" || this.rock.crystalId === "none") return;

    const { x: cx, y: cy } = this.rockCenter();
    const img = crystalImages[this.rock.crystalId];
    const pulse = 1 + Math.sin(this.rock.revealTimer * 7) * 0.07;
    const pop = Math.min(1, this.rock.revealTimer * 4);
    const scale = (0.55 + pop * 0.45) * pulse;
    const max = this.rock.crystalId === ULTIMATE.id ? 180 : 110;
    let cw = max;
    let ch = max;
    if (imageReady(img)) {
      const s = Math.min(max / img.naturalWidth, max / img.naturalHeight) * scale;
      cw = img.naturalWidth * s;
      ch = img.naturalHeight * s;
    }

    // Soft glow
    const color =
      this.rock.crystalId === ULTIMATE.id
        ? ULTIMATE.color
        : CRYSTALS.find((c) => c.id === this.rock.crystalId)?.color ?? "#fff";
    const glow = this.ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(cw, ch));
    glow.addColorStop(0, `${color}55`);
    glow.addColorStop(1, "transparent");
    this.ctx.fillStyle = glow;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, Math.max(cw, ch), 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.save();
    this.ctx.translate(cx, cy - 8);
    if (imageReady(img)) {
      this.ctx.drawImage(img, -cw / 2, -ch / 2, cw, ch);
    }
    this.ctx.restore();

    // Label
    this.ctx.fillStyle = "#fafaf9";
    this.ctx.font = '700 18px "IBM Plex Sans", system-ui, sans-serif';
    this.ctx.textAlign = "center";
    const name =
      this.rock.crystalId === ULTIMATE.id
        ? ULTIMATE.name
        : CRYSTALS.find((c) => c.id === this.rock.crystalId)?.name ?? "Crystal";
    this.ctx.fillText(name, cx, cy + ch / 2 + 28);
    this.ctx.fillStyle = color;
    this.ctx.font = '700 22px "IBM Plex Sans", system-ui, sans-serif';
    this.ctx.fillText(`+${this.rock.points} pts`, cx, cy + ch / 2 + 54);
  }

  private drawEmptyReveal() {
    if (this.rock.phase !== "revealing" || this.rock.crystalId !== "none") return;
    const { x: cx, y: cy } = this.rockCenter();
    this.ctx.fillStyle = "rgba(148, 163, 184, 0.9)";
    this.ctx.font = '600 20px "IBM Plex Sans", system-ui, sans-serif';
    this.ctx.textAlign = "center";
    this.ctx.fillText("Nothing inside…", cx, cy);
  }

  private drawSmasher() {
    if (this.screen !== "playing") return;

    const smasher = SMASHERS[this.smasherIndex];
    const sprites = smasherSprites[smasher.id];
    const { x: cx, y: cy } = this.rockCenter();
    const baseX = cx + Math.min(window.innerWidth * 0.18, 90);
    const baseY = cy - Math.min(window.innerHeight * 0.16, 90);

    let frame = sprites.idle;
    let angle = -0.22;
    let bob = Math.sin(performance.now() / 500) * 3;

    if (this.rock.phase === "striking") {
      const t = Math.min(1, this.animationTime / smasher.strikeDuration);
      const swingFrames = sprites.swings;
      if (swingFrames.length > 1) {
        // Wind-up frame first, impact frame as the swing lands
        frame = t < 0.55 ? swingFrames[0] : swingFrames[1];
      } else {
        frame = swingFrames[0] ?? sprites.idle;
      }
      // One-way clockwise strike (head is on the left of each sprite)
      const ease = 1 - (1 - t) * (1 - t);
      angle = -0.55 + ease * 0.85;
      bob = 6 + ease * 10;
    }

    const maxW = Math.min(window.innerWidth * 0.42, smasher.id === "fire" && this.rock.phase === "striking" ? 320 : 200);
    const maxH = Math.min(window.innerHeight * 0.18, 90);
    let sw = maxW;
    let sh = maxH;
    if (imageReady(frame)) {
      const scale = Math.min(maxW / frame.naturalWidth, maxH / frame.naturalHeight);
      sw = frame.naturalWidth * scale;
      sh = frame.naturalHeight * scale;
    }

    this.ctx.save();
    this.ctx.translate(baseX, baseY + bob);
    this.ctx.rotate(angle);
    if (imageReady(frame)) {
      // Pivot near the handle (right side); head is on the left and arcs into the rock
      this.ctx.drawImage(frame, -sw * 0.72, -sh / 2, sw, sh);
    } else {
      this.ctx.fillStyle = smasher.accent;
      this.ctx.fillRect(-40, -12, 90, 24);
    }
    this.ctx.restore();
  }

  private drawFlash() {
    // Full-screen hit flash — avoids a rectangular AABB overlay on the rock sprite
    if (this.rock.hitFlash > 0) {
      const a = Math.min(0.32, this.rock.hitFlash * 1.5);
      this.ctx.fillStyle = `rgba(255,255,255,${a})`;
      this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    }

    if (this.rock.phase !== "revealing" || this.rock.crystalId === "none") return;
    const alpha = this.rock.revealTimer < 0.25 ? 0.28 : 0.08;
    const color =
      this.rock.crystalId === ULTIMATE.id
        ? `rgba(251, 191, 36, ${alpha})`
        : `rgba(255,255,255,${alpha})`;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  }

  private render() {
    const shakeX = this.screenShake > 0 ? (Math.random() - 0.5) * this.screenShake : 0;
    const shakeY = this.screenShake > 0 ? (Math.random() - 0.5) * this.screenShake : 0;

    this.ctx.save();
    this.ctx.translate(shakeX, shakeY);

    this.drawBackground();
    this.drawRock();
    this.drawCrystal();
    this.drawEmptyReveal();
    this.drawFlash();
    this.drawSmasher();
    drawParticles(this.ctx, this.particles);
    drawFloaters(this.ctx, this.floaters);

    this.ctx.restore();
  }

  private loop(timestamp: number) {
    if (!this.lastTime) this.lastTime = timestamp;
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.033);
    this.lastTime = timestamp;
    this.update(dt);
    this.render();
    requestAnimationFrame((t) => this.loop(t));
  }
}
