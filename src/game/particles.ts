import type { Floater, Particle, SmasherId } from "./types";

export function spawnHitParticles(
  particles: Particle[],
  x: number,
  y: number,
  smasherId: SmasherId,
) {
  const chipCount = 10 + Math.floor(Math.random() * 6);
  for (let i = 0; i < chipCount; i += 1) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
    const speed = 80 + Math.random() * 160;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 40,
      life: 0.35 + Math.random() * 0.35,
      maxLife: 0.7,
      size: 2 + Math.random() * 3,
      color: ["#78716c", "#a8a29e", "#57534e", "#d6d3d1"][i % 4],
      gravity: 420,
      kind: "chip",
    });
  }

  if (smasherId === "lightning") {
    for (let i = 0; i < 14; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 220;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.2 + Math.random() * 0.25,
        maxLife: 0.45,
        size: 1.5 + Math.random() * 2,
        color: i % 2 === 0 ? "#e0f2fe" : "#38bdf8",
        gravity: 0,
        kind: "spark",
      });
    }
  }

  if (smasherId === "fire") {
    for (let i = 0; i < 16; i += 1) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.4;
      const speed = 40 + Math.random() * 140;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        life: 0.3 + Math.random() * 0.4,
        maxLife: 0.7,
        size: 2 + Math.random() * 3.5,
        color: ["#fb923c", "#f97316", "#ef4444", "#fde68a"][i % 4],
        gravity: 80,
        kind: "ember",
      });
    }
  }

  if (smasherId === "diamond") {
    for (let i = 0; i < 18; i += 1) {
      const angle = (i / 18) * Math.PI * 2 + Math.random() * 0.2;
      const speed = 90 + Math.random() * 180;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.35 + Math.random() * 0.3,
        maxLife: 0.65,
        size: 2 + Math.random() * 2.5,
        color: i % 2 === 0 ? "#a5f3fc" : "#ffffff",
        gravity: 40,
        kind: "star",
      });
    }
  }
}

export function spawnBreakBurst(particles: Particle[], x: number, y: number) {
  for (let i = 0; i < 22; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 50 + Math.random() * 200;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 30,
      life: 0.4 + Math.random() * 0.5,
      maxLife: 0.9,
      size: 2 + Math.random() * 4,
      color: ["#78716c", "#57534e", "#a8a29e", "#44403c"][i % 4],
      gravity: 380,
      kind: "chip",
    });
  }
}

export function spawnCrystalSparkles(
  particles: Particle[],
  x: number,
  y: number,
  color: string,
) {
  for (let i = 0; i < 20; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 20 + Math.random() * 90;
    particles.push({
      x: x + (Math.random() - 0.5) * 40,
      y: y + (Math.random() - 0.5) * 40,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 30,
      life: 0.5 + Math.random() * 0.6,
      maxLife: 1.1,
      size: 1.5 + Math.random() * 2.5,
      color: i % 3 === 0 ? "#ffffff" : color,
      gravity: 20,
      kind: "star",
    });
  }
}

export function updateParticles(particles: Particle[], dt: number) {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    p.vy += p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
}

export function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    if (p.kind === "star") {
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      ctx.fillRect(p.x - p.size * 1.4, p.y - 0.5, p.size * 2.8, 1);
      ctx.fillRect(p.x - 0.5, p.y - p.size * 1.4, 1, p.size * 2.8);
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

export function addFloater(
  floaters: Floater[],
  x: number,
  y: number,
  text: string,
  color: string,
) {
  floaters.push({
    x,
    y,
    text,
    color,
    life: 1.1,
    maxLife: 1.1,
    vy: -42,
  });
}

export function updateFloaters(floaters: Floater[], dt: number) {
  for (let i = floaters.length - 1; i >= 0; i -= 1) {
    const f = floaters[i];
    f.life -= dt;
    if (f.life <= 0) {
      floaters.splice(i, 1);
      continue;
    }
    f.y += f.vy * dt;
  }
}

export function drawFloaters(ctx: CanvasRenderingContext2D, floaters: Floater[]) {
  ctx.textAlign = "center";
  ctx.font = '700 20px "IBM Plex Sans", system-ui, sans-serif';
  for (const f of floaters) {
    const alpha = Math.min(1, f.life / 0.35) * Math.min(1, (f.maxLife - f.life) / 0.1 + 0.2);
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}
