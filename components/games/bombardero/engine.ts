export const BOMBARDERO_WIDTH = 1280;
export const BOMBARDERO_HEIGHT = 800;

const COLUMN_WIDTH = 40;
const COLUMNS = 32; // 1280 / 40
const BLOCK_HEIGHT = 20;
const MAX_BLOCKS = 18;
const GROUND_HEIGHT = 8;
const GROUND_Y = BOMBARDERO_HEIGHT - GROUND_HEIGHT; // 792

const PLANE_WIDTH = 56;
const PLANE_HEIGHT = 22;
const PLANE_X_START = 96;
const PLANE_Y_START = 120;
const PLANE_Y_MIN = 60;
const PLANE_Y_MAX = 760;
const PLANE_VERTICAL_SPEED = 220; // px/s mientras se mantiene ↑/↓
const PLANE_SPEED_X_BASE = 200; // px/s en nivel 1
const PLANE_SPEED_X_STEP = 15; // por nivel superado
const PLANE_SPEED_X_MAX = 380;
const PLANE_TURN_MARGIN = 40; // px desde el borde donde rebota
const INVULNERABLE_MS = 1500;
const BLINK_MS = 100; // parpadeo mientras es invulnerable
const MAX_DT_MS = 50; // tope para no saltar tras pausas o cambios de pestaña

const BOMB_RADIUS = 6;
const BOMB_SPEED_Y = 320; // px/s, constante
const BOMB_COOLDOWN_MS = 280;
const BOMB_MAX_ACTIVE = 6;

const LIVES_START = 3;
const POINTS_PER_BLOCK = 15;
const LOW_ALTITUDE_Y = 480; // y >= esto al soltar la bomba = "vuelo bajo"
const LOW_ALTITUDE_BONUS_MULTIPLIER = 2;
const BONUS_BUILDING_CLEARED = 100;
const BONUS_LEVEL_CLEARED = 200; // multiplicado por el nivel completado

const PARTICLE_LIFE_MS = 500;
const PARTICLE_GRAVITY = 900; // px/s²
const DEBRIS_PARTICLES = 8;
const DUST_PARTICLES = 4;
const CRASH_PARTICLES = 12;

// Generación de la ciudad (spec 16 §2).
const BASE_HEIGHT_MIN = 4;
const BASE_HEIGHT_MAX = 12;
const FIRST_COLUMN_JITTER = 2;
const COLUMN_STEP_MAX = 3; // delta máximo entre columnas vecinas
const GAP_CHANCE_BASE = 0.12;
const GAP_CHANCE_STEP = 0.02; // se resta por nivel superado
const GAP_CHANCE_MIN = 0.04;
const SKYSCRAPER_FROM_LEVEL = 3;

// Dibujado.
const SKY_TOP = "#0a0e1a";
const SKY_BOTTOM = "#241238";
const STAR_COLOR = "#ffffff";
const STAR_COUNT = 90;
const STAR_MAX_Y = 520;
const GROUND_COLOR = "#aab2bd";
const WINDOW_COLOR = "#f5d94a";
const WINDOW_SIZE = 8;
const PLANE_COLOR = "#00f5ff";
const PLANE_TILT = (12 * Math.PI) / 180;
const BOMB_COLOR = "#f5ff00";
const DEBRIS_COLORS = ["#ff8a00", "#f5d94a"];
const DUST_COLOR = "#8a93a0";

// Color del edificio según su altura actual en bloques.
const BUILDING_TIERS: Array<{ upTo: number; color: string }> = [
  { upTo: 4, color: "#3a4a5a" },
  { upTo: 9, color: "#6a1f45" },
  { upTo: 14, color: "#4a1f7a" },
  { upTo: MAX_BLOCKS, color: "#0f5a6a" },
];

const KEY_TO_CLIMB: Record<string, "up" | "down"> = {
  ArrowUp: "up",
  ArrowDown: "down",
  w: "up",
  s: "down",
  W: "up",
  S: "down",
};

function planeSpeedX(level: number): number {
  return Math.min(
    PLANE_SPEED_X_MAX,
    PLANE_SPEED_X_BASE + (level - 1) * PLANE_SPEED_X_STEP,
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Entero aleatorio en [min, max], ambos incluidos. */
function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

// Paseo aleatorio acotado + huecos + un rascacielos garantizado desde el
// nivel 3. Sin semilla: ninguna ciudad se repite.
function generateCity(level: number): number[] {
  const baseHeight = clamp(
    BASE_HEIGHT_MIN + (level - 1),
    BASE_HEIGHT_MIN,
    BASE_HEIGHT_MAX,
  );
  const heights: number[] = [
    clamp(
      baseHeight + randomInt(-FIRST_COLUMN_JITTER, FIRST_COLUMN_JITTER),
      0,
      MAX_BLOCKS,
    ),
  ];
  for (let i = 1; i < COLUMNS; i++) {
    heights.push(
      clamp(
        heights[i - 1] + randomInt(-COLUMN_STEP_MAX, COLUMN_STEP_MAX),
        0,
        MAX_BLOCKS,
      ),
    );
  }
  const gapChance = Math.max(
    GAP_CHANCE_MIN,
    GAP_CHANCE_BASE - (level - 1) * GAP_CHANCE_STEP,
  );
  for (let i = 0; i < COLUMNS; i++) {
    if (Math.random() < gapChance) heights[i] = 0;
  }
  // El avión gira a PLANE_TURN_MARGIN del borde y las bombas caen rectas:
  // las columnas de los extremos son inalcanzables, así que van vacías.
  heights[0] = 0;
  heights[COLUMNS - 1] = 0;
  if (
    level >= SKYSCRAPER_FROM_LEVEL &&
    !heights.some((h) => h === MAX_BLOCKS)
  ) {
    heights[randomInt(1, COLUMNS - 2)] = MAX_BLOCKS;
  }
  return heights;
}

// Estrellas fijas: generador determinista para que no cambien entre partidas.
function createStars(): Array<{ x: number; y: number; size: number }> {
  let seed = 20260929;
  const next = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const stars = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
      x: Math.floor(next() * BOMBARDERO_WIDTH),
      y: Math.floor(next() * STAR_MAX_Y),
      size: next() < 0.2 ? 2 : 1,
    });
  }
  return stars;
}

interface Plane {
  x: number; // esquina superior izquierda del rectángulo de colisión
  y: number;
  vx: number;
  vy: number;
  invulnerableMs: number; // ms restantes sin colisión (parpadea)
}

interface Bomb {
  x: number;
  y: number;
  col: number; // columna de impacto, fijada al soltarla
  low: boolean; // soltada en vuelo bajo: sus puntos por bloque valen doble
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // ms restantes
  color: string;
}

export interface BombarderoState {
  score: number;
  lives: number;
  level: number;
  paused: boolean; // notificado también cuando cambia por Escape/P interno
}

export interface BombarderoHandlers {
  onStateChange(state: BombarderoState): void; // solo cuando cambia
  onGameOver(finalScore: number): void; // una sola vez, al perder la última vida
}

export interface BombarderoEngine {
  start(): void;
  stop(): void;
  setPaused(paused: boolean): void;
  restart(): void;
}

export function createBombarderoEngine(
  canvas: HTMLCanvasElement,
  handlers: BombarderoHandlers,
): BombarderoEngine {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");
  const g: CanvasRenderingContext2D = ctx;

  canvas.width = BOMBARDERO_WIDTH;
  canvas.height = BOMBARDERO_HEIGHT;

  const stars = createStars();
  const sky = g.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, SKY_TOP);
  sky.addColorStop(1, SKY_BOTTOM);

  let heights: number[] = [];
  let score = 0;
  let lives = LIVES_START;
  let level = 1;
  let plane: Plane = createPlane(); // después de `level`: fija su velocidad
  let paused = false;
  let climbUp = false;
  let climbDown = false;
  let bombs: Bomb[] = [];
  let particles: Particle[] = [];
  let bombCooldown = 0; // ms hasta poder soltar otra bomba
  let gameOver = false;
  let lastTime = 0;
  let rafId = 0;
  let running = false;
  let lastEmitted: BombarderoState | null = null;

  function createPlane(): Plane {
    return {
      x: PLANE_X_START,
      y: PLANE_Y_START,
      vx: planeSpeedX(level),
      vy: 0,
      invulnerableMs: 0,
    };
  }

  function emitState() {
    const next: BombarderoState = { score, lives, level, paused };
    const prev = lastEmitted;
    if (
      prev &&
      prev.score === next.score &&
      prev.lives === next.lives &&
      prev.level === next.level &&
      prev.paused === next.paused
    ) {
      return;
    }
    lastEmitted = next;
    handlers.onStateChange(next);
  }

  function drawSky() {
    g.fillStyle = sky;
    g.fillRect(0, 0, BOMBARDERO_WIDTH, GROUND_Y);
    g.fillStyle = STAR_COLOR;
    for (const star of stars) {
      g.fillRect(star.x, star.y, star.size, star.size);
    }
  }

  function buildingColor(blocks: number): string {
    const tier = BUILDING_TIERS.find((t) => blocks <= t.upTo);
    return (tier ?? BUILDING_TIERS[BUILDING_TIERS.length - 1]).color;
  }

  function drawCity() {
    for (let col = 0; col < COLUMNS; col++) {
      const blocks = heights[col];
      if (blocks === 0) continue;
      const x = col * COLUMN_WIDTH;
      const top = GROUND_Y - blocks * BLOCK_HEIGHT;
      g.fillStyle = buildingColor(blocks);
      g.fillRect(x + 1, top, COLUMN_WIDTH - 2, blocks * BLOCK_HEIGHT);
      // Ventanas: dos por bloque, encendidas según un patrón fijo por celda.
      g.fillStyle = WINDOW_COLOR;
      for (let block = 0; block < blocks; block++) {
        const y = GROUND_Y - (block + 1) * BLOCK_HEIGHT + 6;
        for (let side = 0; side < 2; side++) {
          if ((col * 7 + block * 3 + side * 5) % 4 === 0) continue;
          g.fillRect(x + 8 + side * 16, y, WINDOW_SIZE, WINDOW_SIZE);
        }
      }
    }
    g.fillStyle = GROUND_COLOR;
    g.fillRect(0, GROUND_Y, BOMBARDERO_WIDTH, GROUND_HEIGHT);
  }

  function drawPlane() {
    if (gameOver) return;
    if (
      plane.invulnerableMs > 0 &&
      Math.floor(plane.invulnerableMs / BLINK_MS) % 2 === 0
    ) {
      return;
    }
    const facing = plane.vx < 0 ? -1 : 1;
    const tilt = plane.vy < 0 ? -PLANE_TILT : plane.vy > 0 ? PLANE_TILT : 0;
    const halfW = PLANE_WIDTH / 2;
    const halfH = PLANE_HEIGHT / 2;
    g.save();
    g.translate(plane.x + halfW, plane.y + halfH);
    g.scale(facing, 1);
    g.rotate(tilt);
    g.fillStyle = PLANE_COLOR;
    // Fuselaje: triángulo con el morro hacia delante.
    g.beginPath();
    g.moveTo(halfW, 2);
    g.lineTo(-halfW + 8, -halfH + 6);
    g.lineTo(-halfW + 8, halfH);
    g.closePath();
    g.fill();
    // Cola.
    g.beginPath();
    g.moveTo(-halfW + 12, -halfH + 8);
    g.lineTo(-halfW, -halfH);
    g.lineTo(-halfW, halfH - 6);
    g.lineTo(-halfW + 12, halfH - 2);
    g.closePath();
    g.fill();
    g.restore();
  }

  function drawBombs() {
    g.fillStyle = BOMB_COLOR;
    for (const bomb of bombs) {
      g.beginPath();
      g.arc(bomb.x, bomb.y, BOMB_RADIUS, 0, Math.PI * 2);
      g.fill();
    }
  }

  function drawParticles() {
    for (const particle of particles) {
      g.globalAlpha = Math.min(1, particle.life / (PARTICLE_LIFE_MS / 2));
      g.fillStyle = particle.color;
      g.fillRect(particle.x - 2, particle.y - 2, 4, 4);
    }
    g.globalAlpha = 1;
  }

  function draw() {
    drawSky();
    drawCity();
    drawBombs();
    drawPlane();
    drawParticles();
  }

  function spawnParticles(
    x: number,
    y: number,
    count: number,
    speed: number,
    colors: string[],
  ) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = speed * (0.4 + Math.random() * 0.6);
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - speed * 0.5,
        life: PARTICLE_LIFE_MS,
        color: colors[i % colors.length],
      });
    }
  }

  function dropBomb() {
    if (bombCooldown > 0 || bombs.length >= BOMB_MAX_ACTIVE) return;
    const x = plane.x + PLANE_WIDTH / 2;
    bombs.push({
      x,
      y: plane.y + PLANE_HEIGHT,
      col: clamp(Math.floor(x / COLUMN_WIDTH), 0, COLUMNS - 1),
      low: plane.y >= LOW_ALTITUDE_Y,
    });
    bombCooldown = BOMB_COOLDOWN_MS;
  }

  function hitColumn(bomb: Bomb, impactY: number) {
    if (heights[bomb.col] === 0) {
      // Suelo sin edificio: nube de polvo, sin puntos.
      spawnParticles(bomb.x, impactY, DUST_PARTICLES, 90, [DUST_COLOR]);
      return;
    }
    heights[bomb.col] -= 1;
    score += POINTS_PER_BLOCK * (bomb.low ? LOW_ALTITUDE_BONUS_MULTIPLIER : 1);
    if (heights[bomb.col] === 0) score += BONUS_BUILDING_CLEARED;
    spawnParticles(bomb.x, impactY, DEBRIS_PARTICLES, 220, DEBRIS_COLORS);
  }

  function updateBombs(dt: number) {
    bombCooldown = Math.max(0, bombCooldown - dt * 1000);
    const falling: Bomb[] = [];
    for (const bomb of bombs) {
      bomb.y += BOMB_SPEED_Y * dt;
      const impactY = GROUND_Y - heights[bomb.col] * BLOCK_HEIGHT;
      if (bomb.y + BOMB_RADIUS >= impactY) hitColumn(bomb, impactY);
      else falling.push(bomb);
    }
    bombs = falling;
  }

  function updateParticles(dt: number) {
    for (const particle of particles) {
      particle.vy += PARTICLE_GRAVITY * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.life -= dt * 1000;
    }
    particles = particles.filter((particle) => particle.life > 0);
  }

  function updatePlane(dt: number) {
    // Avance automático de pasada en pasada: rebota cerca de cada borde.
    plane.x += plane.vx * dt;
    const maxX = BOMBARDERO_WIDTH - PLANE_TURN_MARGIN - PLANE_WIDTH;
    if (plane.x >= maxX) {
      plane.x = maxX;
      plane.vx = -Math.abs(plane.vx);
    } else if (plane.x <= PLANE_TURN_MARGIN) {
      plane.x = PLANE_TURN_MARGIN;
      plane.vx = Math.abs(plane.vx);
    }
    plane.vy =
      (climbDown ? PLANE_VERTICAL_SPEED : 0) -
      (climbUp ? PLANE_VERTICAL_SPEED : 0);
    plane.y = clamp(plane.y + plane.vy * dt, PLANE_Y_MIN, PLANE_Y_MAX);
  }

  function planeHitsCity(): boolean {
    const bottom = plane.y + PLANE_HEIGHT;
    const first = clamp(Math.floor(plane.x / COLUMN_WIDTH), 0, COLUMNS - 1);
    const last = clamp(
      Math.floor((plane.x + PLANE_WIDTH - 1) / COLUMN_WIDTH),
      0,
      COLUMNS - 1,
    );
    for (let col = first; col <= last; col++) {
      if (heights[col] === 0) continue;
      if (GROUND_Y - heights[col] * BLOCK_HEIGHT <= bottom) return true;
    }
    return false;
  }

  function crash() {
    spawnParticles(
      plane.x + PLANE_WIDTH / 2,
      plane.y + PLANE_HEIGHT / 2,
      CRASH_PARTICLES,
      260,
      DEBRIS_COLORS,
    );
    lives -= 1;
    if (lives <= 0) {
      endGame();
      return;
    }
    // Solo reaparece el avión: la ciudad ya bombardeada no se regenera.
    plane = createPlane();
    plane.invulnerableMs = INVULNERABLE_MS;
  }

  function endGame() {
    if (gameOver) return;
    gameOver = true;
    bombs = [];
    emitState();
    handlers.onGameOver(score);
  }

  function nextLevel() {
    score += BONUS_LEVEL_CLEARED * level;
    level += 1;
    heights = generateCity(level);
    // Las bombas en vuelo apuntaban a la ciudad anterior.
    bombs = [];
    plane.vx = Math.sign(plane.vx || 1) * planeSpeedX(level);
    // La ciudad nueva puede aparecer sobre el avión: margen para remontar
    // sin perder una vida por el cambio de nivel.
    plane.invulnerableMs = INVULNERABLE_MS;
  }

  function update(dt: number) {
    updateParticles(dt);
    if (gameOver) return;
    updatePlane(dt);
    updateBombs(dt);
    if (heights.every((h) => h === 0)) nextLevel();
    if (plane.invulnerableMs > 0) {
      plane.invulnerableMs = Math.max(0, plane.invulnerableMs - dt * 1000);
    } else if (planeHitsCity()) {
      crash();
    }
    emitState();
  }

  function setPausedState(value: boolean) {
    if (paused === value) return;
    paused = value;
    emitState(); // también cuando cambia por Escape/P interno
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape" || e.key === "p" || e.key === "P") {
      e.preventDefault();
      if (!gameOver) setPausedState(!paused);
      return;
    }
    if (e.key === " " || e.code === "Space") {
      e.preventDefault();
      if (!paused && !gameOver) dropBomb();
      return;
    }
    const climb = KEY_TO_CLIMB[e.key];
    if (!climb) return;
    e.preventDefault();
    if (climb === "up") climbUp = true;
    else climbDown = true;
  }

  function handleKeyUp(e: KeyboardEvent) {
    const climb = KEY_TO_CLIMB[e.key];
    if (!climb) return;
    if (climb === "up") climbUp = false;
    else climbDown = false;
  }

  function loop(now: number) {
    if (!running) return;
    const dt = Math.min(now - lastTime, MAX_DT_MS) / 1000;
    lastTime = now;
    if (!paused) update(dt);
    draw();
    rafId = requestAnimationFrame(loop);
  }

  heights = generateCity(level);

  return {
    start() {
      if (running) return;
      running = true;
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
      lastTime = performance.now();
      emitState();
      rafId = requestAnimationFrame(loop);
    },
    stop() {
      running = false;
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      climbUp = false;
      climbDown = false;
      cancelAnimationFrame(rafId);
    },
    setPaused(value: boolean) {
      setPausedState(value);
    },
    restart() {
      score = 0;
      lives = LIVES_START;
      level = 1;
      paused = false;
      gameOver = false;
      climbUp = false;
      climbDown = false;
      bombs = [];
      particles = [];
      bombCooldown = 0;
      heights = generateCity(level);
      plane = createPlane();
      emitState();
    },
  };
}
