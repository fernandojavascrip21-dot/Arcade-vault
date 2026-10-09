export const LABERINTO_WIDTH = 1280;
export const LABERINTO_HEIGHT = 800;

const COLS = 32;
const ROWS = 20;
const CELL = 40; // 32 * 40 = 1280, 20 * 40 = 800
const HALF = CELL / 2;

// # pared · . punto · o cápsula · espacio pasillo sin punto
// - puerta de la base · G interior de la base
const MAZE = [
  "################################",
  "#..............##..............#",
  "#o####.####.##.##.##.####.####o#",
  "#.####.####.##.##.##.####.####.#",
  "#..............................#",
  "#.####.#.#####.##.#####.#.####.#",
  "#.####.#.#####.##.#####.#.####.#",
  "#......#...          ...#......#",
  "######.#### ###--### ####.######",
  "      .     #GGGGGG#     .      ",
  "######.#### ######## ####.######",
  "#......#...          ...#......#",
  "#.####.#.####.####.####.#.####.#",
  "#.####.#.####.####.####.#.####.#",
  "#..............................#",
  "#.##.####.####.##.####.####.##.#",
  "#o##.####.####.##.####.####.##o#",
  "#.##.####.####.##.####.####.##.#",
  "#..............................#",
  "################################",
];

const TUNNEL_ROW = 9;
// El túnel une dos centros virtuales fuera del canvas (columnas -1 y 32):
// quien llega a uno aparece en el otro, ya oculto, sin saltos a la vista.
const TUNNEL_WRAP = LABERINTO_WIDTH + CELL;
const PLAYER_START_COL = 15;
const PLAYER_START_ROW = 11;

const PLAYER_SPEED = 160; // px/s
const PLAYER_RADIUS = 15;
const MOUTH_MAX = 0.28 * Math.PI; // media apertura de la boca
const MOUTH_PERIOD = CELL; // px recorridos por ciclo de boca
const DOT_RADIUS = 4;
const CAPSULE_RADIUS = 10;
const WALL_WIDTH = 3;
const LIVES_START = 3;
const POINTS_DOT = 10;
const POINTS_CAPSULE = 50;
const BONUS_LEVEL = 500; // multiplicado por el nivel completado
const MAX_DT_MS = 50; // tope para no saltar tras pausas o cambios de pestaña
const EPSILON = 0.001;

// Direcciones como índices (sin objetos por frame). El orden es también el
// de desempate de los guardianes: arriba, izquierda, abajo, derecha.
const UP = 0;
const LEFT = 1;
const DOWN = 2;
const RIGHT = 3;
const NONE = -1;
const DX = [0, -1, 0, 1];
const DY = [-1, 0, 1, 0];
const ANGLE = [-Math.PI / 2, Math.PI, Math.PI / 2, 0];

const KEY_TO_DIRECTION: Record<string, number> = {
  ArrowUp: UP,
  ArrowLeft: LEFT,
  ArrowDown: DOWN,
  ArrowRight: RIGHT,
  w: UP,
  W: UP,
  a: LEFT,
  A: LEFT,
  s: DOWN,
  S: DOWN,
  d: RIGHT,
  D: RIGHT,
};

const CELL_EMPTY = 0;
const CELL_DOT = 1;
const CELL_CAPSULE = 2;

const PALETTE = {
  bg: "#000",
  wall: "#ff8a00",
  dot: "#ffd6a5",
  door: "#ffd6a5",
  player: "#f5ff00",
  cazador: "#ff2d6f",
  emboscador: "#00e5ff",
  flanqueador: "#39ff14",
  errante: "#b388ff",
  vulnerable: "#3a5bff",
  vulnerableWarn: "#ffffff",
};

function isWall(col: number, row: number): boolean {
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return false;
  return MAZE[row][col] === "#";
}

// Pasillo transitable para el jugador: ni pared, ni puerta, ni base.
function isCorridor(col: number, row: number): boolean {
  if (row < 0 || row >= ROWS) return false;
  if (col < 0 || col >= COLS) return row === TUNNEL_ROW;
  const ch = MAZE[row][col];
  return ch !== "#" && ch !== "-" && ch !== "G";
}

function cellOf(px: number): number {
  return Math.round((px - HALF) / CELL);
}

function centerOf(cell: number): number {
  return cell * CELL + HALF;
}

interface Player {
  x: number; // centro, px
  y: number;
  dir: number; // UP/LEFT/DOWN/RIGHT o NONE si está parado
  queuedDir: number; // giro en cola, o NONE
  facing: number; // última dirección, para dibujar la boca
  travelled: number; // px recorridos, anima la boca
}

export interface LaberintoState {
  score: number;
  lives: number;
  level: number;
  paused: boolean; // notificado también cuando cambia por Escape/P interno
}

export interface LaberintoHandlers {
  onStateChange(state: LaberintoState): void; // solo cuando cambia
  onGameOver(finalScore: number): void; // una sola vez, al perder la última vida
}

export interface LaberintoEngine {
  start(): void;
  stop(): void;
  setPaused(paused: boolean): void;
  restart(): void;
}

export function createLaberintoEngine(
  canvas: HTMLCanvasElement,
  handlers: LaberintoHandlers,
): LaberintoEngine {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");
  const g: CanvasRenderingContext2D = ctx;

  canvas.width = LABERINTO_WIDTH;
  canvas.height = LABERINTO_HEIGHT;

  // Las paredes no cambian: se pintan una vez y se copian en cada frame.
  const wallLayer = document.createElement("canvas");
  wallLayer.width = LABERINTO_WIDTH;
  wallLayer.height = LABERINTO_HEIGHT;
  drawWallLayer();

  const cells = new Uint8Array(COLS * ROWS); // puntos y cápsulas vivos
  const player: Player = {
    x: 0,
    y: 0,
    dir: NONE,
    queuedDir: NONE,
    facing: LEFT,
    travelled: 0,
  };
  let dotsLeft = 0; // puntos y cápsulas que quedan en el tablero
  let score = 0;
  let lives = LIVES_START;
  let level = 1;
  let paused = false;
  let gameOver = false;
  let lastTime = 0;
  let rafId = 0;
  let running = false;
  let lastEmitted: LaberintoState | null = null;

  fillCells();
  resetPlayer();

  function fillCells() {
    dotsLeft = 0;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const ch = MAZE[row][col];
        cells[row * COLS + col] =
          ch === "." ? CELL_DOT : ch === "o" ? CELL_CAPSULE : CELL_EMPTY;
        if (ch === "." || ch === "o") dotsLeft += 1;
      }
    }
  }

  function resetPlayer() {
    player.x = centerOf(PLAYER_START_COL);
    player.y = centerOf(PLAYER_START_ROW);
    player.dir = LEFT;
    player.queuedDir = NONE;
    player.facing = LEFT;
    player.travelled = 0;
  }

  function emitState() {
    const next: LaberintoState = { score, lives, level, paused };
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

  // Solo el contorno: un trazo en cada lado de pared que da a un pasillo.
  function drawWallLayer() {
    const w = wallLayer.getContext("2d");
    if (!w) throw new Error("Canvas 2D no disponible");
    w.fillStyle = PALETTE.bg;
    w.fillRect(0, 0, LABERINTO_WIDTH, LABERINTO_HEIGHT);
    w.lineWidth = WALL_WIDTH;
    w.lineCap = "round";
    w.strokeStyle = PALETTE.wall;
    w.beginPath();
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (!isWall(col, row)) continue;
        const x = col * CELL;
        const y = row * CELL;
        if (row > 0 && !isWall(col, row - 1)) {
          w.moveTo(x, y);
          w.lineTo(x + CELL, y);
        }
        if (row < ROWS - 1 && !isWall(col, row + 1)) {
          w.moveTo(x, y + CELL);
          w.lineTo(x + CELL, y + CELL);
        }
        if (col > 0 && !isWall(col - 1, row)) {
          w.moveTo(x, y);
          w.lineTo(x, y + CELL);
        }
        if (col < COLS - 1 && !isWall(col + 1, row)) {
          w.moveTo(x + CELL, y);
          w.lineTo(x + CELL, y + CELL);
        }
      }
    }
    w.stroke();

    w.strokeStyle = PALETTE.door;
    w.beginPath();
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (MAZE[row][col] !== "-") continue;
        w.moveTo(col * CELL, centerOf(row));
        w.lineTo(col * CELL + CELL, centerOf(row));
      }
    }
    w.stroke();
  }

  function drawCells() {
    g.fillStyle = PALETTE.dot;
    g.beginPath();
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const kind = cells[row * COLS + col];
        if (kind === CELL_EMPTY) continue;
        const x = centerOf(col);
        const y = centerOf(row);
        const radius = kind === CELL_DOT ? DOT_RADIUS : CAPSULE_RADIUS;
        g.moveTo(x + radius, y);
        g.arc(x, y, radius, 0, Math.PI * 2);
      }
    }
    g.fill();
  }

  function drawPlayer() {
    // La boca se abre y se cierra una vez por celda recorrida.
    const phase = (player.travelled % MOUTH_PERIOD) / MOUTH_PERIOD;
    const mouth = MOUTH_MAX * Math.abs(1 - 2 * phase);
    const angle = ANGLE[player.facing];
    g.fillStyle = PALETTE.player;
    g.beginPath();
    g.moveTo(player.x, player.y);
    g.arc(
      player.x,
      player.y,
      PLAYER_RADIUS,
      angle + mouth,
      angle - mouth + Math.PI * 2,
    );
    g.closePath();
    g.fill();
  }

  function draw() {
    g.drawImage(wallLayer, 0, 0);
    drawCells();
    drawPlayer();
  }

  // Tablero vacío: bono, nivel siguiente y todo vuelve a su sitio.
  function nextLevel() {
    score += BONUS_LEVEL * level;
    level += 1;
    fillCells();
    resetPlayer();
  }

  // Come lo que haya en la celda. Devuelve true si con ello cambió el nivel.
  function eatAt(col: number, row: number): boolean {
    if (col < 0 || col >= COLS) return false; // centros virtuales del túnel
    const index = row * COLS + col;
    const kind = cells[index];
    if (kind === CELL_EMPTY) return false;
    cells[index] = CELL_EMPTY;
    dotsLeft -= 1;
    score += kind === CELL_DOT ? POINTS_DOT : POINTS_CAPSULE;
    if (dotsLeft === 0) {
      nextLevel();
      emitState();
      return true;
    }
    emitState();
    return false;
  }

  function canPlayerGo(col: number, row: number, dir: number): boolean {
    return isCorridor(col + DX[dir], row + DY[dir]);
  }

  // Avanza de centro a centro: si el paso del frame alcanza un centro de
  // celda, se detiene en él, decide ahí (giro en cola, pared) y gasta el
  // resto en la nueva dirección. Así nunca se salta un cruce ni una pared.
  function updatePlayer(dt: number) {
    let remaining = PLAYER_SPEED * dt;
    while (remaining > EPSILON) {
      const col = cellOf(player.x);
      const row = cellOf(player.y);
      const atCenter =
        Math.abs(player.x - centerOf(col)) < EPSILON &&
        Math.abs(player.y - centerOf(row)) < EPSILON;

      if (atCenter) {
        player.x = centerOf(col);
        player.y = centerOf(row);
        if (eatAt(col, row)) return;
        if (
          player.queuedDir !== NONE &&
          canPlayerGo(col, row, player.queuedDir)
        ) {
          player.dir = player.queuedDir;
          player.queuedDir = NONE;
        }
        if (player.dir === NONE) return;
        if (!canPlayerGo(col, row, player.dir)) {
          player.dir = NONE;
          return;
        }
        player.facing = player.dir;
      }

      const dx = DX[player.dir];
      const dy = DY[player.dir];
      // Distancia al siguiente centro en la dirección de avance.
      const offset =
        dx !== 0
          ? (player.x - centerOf(col)) * dx
          : (player.y - centerOf(row)) * dy;
      const toNext = offset < -EPSILON ? -offset : CELL - offset;
      const step = Math.min(remaining, toNext);
      player.x += dx * step;
      player.y += dy * step;
      player.travelled += step;
      remaining -= step;

      if (dx < 0 && player.x <= -HALF + EPSILON) player.x += TUNNEL_WRAP;
      else if (dx > 0 && player.x >= LABERINTO_WIDTH + HALF - EPSILON) {
        player.x -= TUNNEL_WRAP;
      }
    }
  }

  function update(dt: number) {
    if (gameOver) return;
    updatePlayer(dt);
  }

  function steer(direction: number) {
    // Invertir el sentido se aplica al instante; el resto espera al cruce.
    if (player.dir !== NONE && direction === (player.dir + 2) % 4) {
      player.dir = direction;
      player.facing = direction;
      player.queuedDir = NONE;
      return;
    }
    player.queuedDir = direction;
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
    const direction = KEY_TO_DIRECTION[e.key];
    if (direction === undefined) return;
    e.preventDefault();
    if (paused || gameOver) return;
    steer(direction);
  }

  function loop(now: number) {
    if (!running) return;
    const dt = Math.min(now - lastTime, MAX_DT_MS) / 1000;
    lastTime = now;
    if (!paused) update(dt);
    draw();
    rafId = requestAnimationFrame(loop);
  }

  return {
    start() {
      if (running) return;
      running = true;
      window.addEventListener("keydown", handleKeyDown);
      lastTime = performance.now();
      emitState();
      rafId = requestAnimationFrame(loop);
    },
    stop() {
      running = false;
      window.removeEventListener("keydown", handleKeyDown);
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
      fillCells();
      resetPlayer();
      emitState();
    },
  };
}
