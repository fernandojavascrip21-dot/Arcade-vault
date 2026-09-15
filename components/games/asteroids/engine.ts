// Puerto a TypeScript de references/started-games/02-asteroids/game.js.
// Misma mecánica que el original (rotación, empuje, drag, cooldown de disparo,
// puntos por tamaño de asteroide, invencibilidad al reaparecer, bomba nova).
// Diferencias deliberadas respecto al original, ver specs/06-juego-asteroides-real.md:
// - drawHUD se mantiene y sigue dibujando dentro del canvas.
// - El overlay de "GAME OVER" y el reinicio con Espacio no se portan: el fin
//   de partida lo controla en exclusiva el modal de React (onGameOver).

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;

const wrap = (v: number, max: number) => ((v % max) + max) % max;
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));

const RADII = [0, 16, 30, 50]; // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32]; // velocidad base por tamaño
const POINTS = [0, 100, 50, 20]; // puntos por tamaño

// Silueta fija (con muesca cóncava) usada para los asteroides grandes (size 3),
// escalada a RADII[3].
const LARGE_ASTEROID_SHAPE: Array<[number, number]> = [
  [1, -49],
  [28, -40],
  [23, -9],
  [50, 2],
  [42, 25],
  [33, 30],
  [5, 44],
  [-24, 35],
  [-44, 18],
  [-50, -1],
  [-41, -20],
  [-24, -34],
];

interface KeyState {
  [code: string]: boolean;
}

class Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ttl: number;
  radius: number;
  dead: boolean;

  constructor(x: number, y: number, angle: number) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, GAME_WIDTH);
    this.y = wrap(this.y + this.vy * dt, GAME_HEIGHT);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

class Asteroid {
  x: number;
  y: number;
  size: number;
  radius: number;
  dead: boolean;
  vx: number;
  vy: number;
  rotSpeed: number;
  rot: number;
  verts: Array<[number, number]>;

  constructor(x: number, y: number, size = 3) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    if (size === 3) {
      // Los asteroides grandes usan siempre la silueta fija.
      this.verts = LARGE_ASTEROID_SHAPE;
    } else {
      // Polígono irregular
      const n = randInt(8, 13);
      this.verts = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const r = this.radius * rand(0.6, 1.0);
        this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
    }
  }

  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, GAME_WIDTH);
    this.y = wrap(this.y + this.vy * dt, GAME_HEIGHT);
    this.rot += this.rotSpeed * dt;
  }

  split(): Asteroid[] {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++) {
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

class Ship {
  x = GAME_WIDTH / 2;
  y = GAME_HEIGHT / 2;
  angle = -Math.PI / 2;
  vx = 0;
  vy = 0;
  radius = 12;
  thrusting = false;
  invincible = 3;
  shootCooldown = 0;
  dead = false;

  reset() {
    this.x = GAME_WIDTH / 2;
    this.y = GAME_HEIGHT / 2;
    this.angle = -Math.PI / 2;
    this.vx = 0;
    this.vy = 0;
    this.thrusting = false;
    this.invincible = 3;
    this.shootCooldown = 0;
    this.dead = false;
  }

  update(dt: number, keys: KeyState) {
    if (this.dead) return;
    if (this.invincible > 0) this.invincible -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;

    const ROT = 3.5; // rad/s
    const THRUST = 260; // px/s²
    const DRAG = 0.987;

    if (keys.ArrowLeft) this.angle -= ROT * dt;
    if (keys.ArrowRight) this.angle += ROT * dt;

    this.thrusting = !!keys.ArrowUp;
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, GAME_WIDTH);
    this.y = wrap(this.y + this.vy * dt, GAME_HEIGHT);
  }

  tryShoot(): Bullet[] {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    return [new Bullet(ox, oy, this.angle)];
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0)
      return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";

    // Silueta clásica: triángulo con muesca trasera
    ctx.beginPath();
    ctx.moveTo(20, 0); // nariz
    ctx.lineTo(-12, -9); // ala izquierda
    ctx.lineTo(-7, 0); // muesca trasera
    ctx.lineTo(-12, 9); // ala derecha
    ctx.closePath();
    ctx.stroke();

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8, 4);
      ctx.strokeStyle = "rgba(255, 130, 0, 0.85)";
      ctx.stroke();
    }

    ctx.restore();
  }
}

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  dead: boolean;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl = this.life;
    this.dead = false;
  }

  update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

export interface AsteroidsState {
  score: number;
  lives: number;
  level: number;
  novaBombs: number;
}

export interface AsteroidsHandlers {
  onStateChange: (state: AsteroidsState) => void;
  onGameOver: (finalScore: number) => void;
}

export interface AsteroidsEngine {
  start(): void;
  stop(): void;
  setPaused(paused: boolean): void;
  restart(): void;
}

export const ASTEROIDS_WIDTH = GAME_WIDTH;
export const ASTEROIDS_HEIGHT = GAME_HEIGHT;

const GAME_KEYS = [
  "Space",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "KeyB",
];

export function createAsteroidsEngine(
  canvas: HTMLCanvasElement,
  handlers: AsteroidsHandlers,
): AsteroidsEngine {
  const ctx2d = canvas.getContext("2d");
  if (!ctx2d) {
    throw new Error("No se pudo obtener el contexto 2D del canvas");
  }
  const ctx: CanvasRenderingContext2D = ctx2d;

  const keys: KeyState = {};
  const justPressed: KeyState = {};

  function pressed(code: string): boolean {
    const val = justPressed[code];
    justPressed[code] = false;
    return val;
  }

  function handleKeyDown(e: KeyboardEvent) {
    justPressed[e.code] = !keys[e.code];
    keys[e.code] = true;
    if (GAME_KEYS.includes(e.code)) e.preventDefault();
  }

  function handleKeyUp(e: KeyboardEvent) {
    keys[e.code] = false;
  }

  let ship: Ship;
  let bullets: Bullet[];
  let asteroids: Asteroid[];
  let particles: Particle[];
  let score: number;
  let lives: number;
  let level: number;
  let state: "playing" | "dead" | "gameover";
  let deadTimer: number;
  let novaBombs: number;
  let nextNovaBombLevel: number | null;

  let prevSnapshot: AsteroidsState | null = null;

  function notifyStateChange() {
    const snapshot: AsteroidsState = { score, lives, level, novaBombs };
    if (
      prevSnapshot &&
      prevSnapshot.score === snapshot.score &&
      prevSnapshot.lives === snapshot.lives &&
      prevSnapshot.level === snapshot.level &&
      prevSnapshot.novaBombs === snapshot.novaBombs
    ) {
      return;
    }
    prevSnapshot = snapshot;
    handlers.onStateChange(snapshot);
  }

  function spawnAsteroids(count: number) {
    const SAFE_DIST = 130;
    for (let i = 0; i < count; i++) {
      let x: number;
      let y: number;
      do {
        x = rand(0, GAME_WIDTH);
        y = rand(0, GAME_HEIGHT);
      } while (Math.hypot(x - GAME_WIDTH / 2, y - GAME_HEIGHT / 2) < SAFE_DIST);
      asteroids.push(new Asteroid(x, y, 3));
    }
  }

  function initGame() {
    ship = new Ship();
    bullets = [];
    asteroids = [];
    particles = [];
    score = 0;
    lives = 3;
    level = 1;
    state = "playing";
    novaBombs = 1;
    nextNovaBombLevel = null;
    spawnAsteroids(4);
    notifyStateChange();
  }

  function nextLevel() {
    level++;
    bullets = [];
    particles = [];
    ship.reset();
    if (nextNovaBombLevel !== null && level >= nextNovaBombLevel) {
      novaBombs = 1;
      nextNovaBombLevel = null;
    }
    spawnAsteroids(3 + level);
    notifyStateChange();
  }

  function explode(x: number, y: number, count = 8) {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
  }

  function killShip() {
    explode(ship.x, ship.y, 14);
    ship.dead = true;
    lives--;
    if (lives <= 0) {
      state = "gameover";
      notifyStateChange();
      handlers.onGameOver(score);
    } else {
      state = "dead";
      deadTimer = 2;
      notifyStateChange();
    }
  }

  function update(dt: number) {
    if (state === "gameover") {
      particles.forEach((p) => p.update(dt));
      particles = particles.filter((p) => !p.dead);
      return;
    }

    if (state === "dead") {
      deadTimer -= dt;
      particles.forEach((p) => p.update(dt));
      particles = particles.filter((p) => !p.dead);
      asteroids.forEach((a) => a.update(dt));
      if (deadTimer <= 0) {
        state = "playing";
        ship.reset();
      }
      return;
    }

    // Disparar
    if (pressed("Space")) {
      bullets.push(...ship.tryShoot());
    }

    // Bomba Nova
    if (pressed("KeyB") && novaBombs > 0) {
      for (const a of asteroids) {
        if (a.dead) continue;
        score += POINTS[a.size];
        explode(a.x, a.y, a.size * 5);
        a.dead = true;
      }
      asteroids = asteroids.filter((a) => !a.dead);
      novaBombs = 0;
      nextNovaBombLevel = level + 3;
    }

    ship.update(dt, keys);
    bullets.forEach((b) => b.update(dt));
    asteroids.forEach((a) => a.update(dt));
    particles.forEach((p) => p.update(dt));

    bullets = bullets.filter((b) => !b.dead);
    particles = particles.filter((p) => !p.dead);

    // Bala vs asteroide
    const newAsteroids: Asteroid[] = [];
    for (const b of bullets) {
      for (const a of asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          a.dead = true;
          score += POINTS[a.size];
          explode(a.x, a.y, a.size * 5);
          newAsteroids.push(...a.split());
        }
      }
    }
    asteroids = asteroids.filter((a) => !a.dead).concat(newAsteroids);
    bullets = bullets.filter((b) => !b.dead);

    // Nave vs asteroide
    if (ship.invincible <= 0) {
      for (const a of asteroids) {
        if (dist(ship, a) < ship.radius + a.radius * 0.82) {
          killShip();
          break;
        }
      }
    }

    // Nivel completado
    if (asteroids.length === 0) nextLevel();

    notifyStateChange();
  }

  function drawLifeIcon(x: number, y: number) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-Math.PI / 2);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.2;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.lineTo(-6, -5);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-6, 5);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  function drawHUD() {
    ctx.fillStyle = "#fff";
    ctx.font = "15px monospace";

    ctx.textAlign = "left";
    ctx.fillText(`SCORE  ${score}`, 14, 26);

    ctx.textAlign = "center";
    ctx.fillText(`NIVEL ${level}`, GAME_WIDTH / 2, 26);

    for (let i = 0; i < lives; i++) drawLifeIcon(GAME_WIDTH - 16 - i * 22, 18);

    if (novaBombs > 0) {
      ctx.textAlign = "left";
      ctx.fillStyle = "#0ff";
      ctx.fillText("BOMBA NOVA [B]", 14, 48);
    }
  }

  function draw() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    particles.forEach((p) => p.draw(ctx));
    asteroids.forEach((a) => a.draw(ctx));
    bullets.forEach((b) => b.draw(ctx));
    ship.draw(ctx);

    drawHUD();
  }

  let rafId: number | null = null;
  let lastTime: number | null = null;
  let paused = false;

  function loop(ts: number) {
    if (paused) {
      rafId = requestAnimationFrame(loop);
      return;
    }
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;
    update(dt);
    draw();
    rafId = requestAnimationFrame(loop);
  }

  return {
    start() {
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
      initGame();
      draw();
      lastTime = null;
      rafId = requestAnimationFrame(loop);
    },
    stop() {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    },
    setPaused(next: boolean) {
      if (next === paused) return;
      paused = next;
      if (!paused) lastTime = null;
    },
    restart() {
      initGame();
    },
  };
}
