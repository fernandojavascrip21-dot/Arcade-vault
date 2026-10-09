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

const TUNNEL_SLOW_COLS = 6; // columnas 0–5 y 26–31 de la fila del túnel
const BASE_EXIT_COL = 15; // columna de la puerta
const BASE_EXIT_ROW = 7; // celda de salida, justo encima de la puerta

const PLAYER_SPEED = 160; // px/s
const GUARDIAN_SPEED = 144; // px/s en nivel 1
const GUARDIAN_SPEED_STEP = 6; // por nivel superado
const GUARDIAN_SPEED_MAX = 168;
const TUNNEL_SPEED = 80;
const GUARDIAN_RADIUS = 15;
// Dispersión y persecución alternadas (ms); la última persecución no termina.
const PHASES_MS = [7000, 20000, 7000, 20000, 5000];
const AMBUSH_CELLS = 4; // emboscador: celdas por delante del jugador
const FLANK_CELLS = 2; // flanqueador: celdas por delante del jugador
const WANDER_CELLS = 8; // errante: distancia a la que se retira
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
  eye: "#ffffff",
  pupil: "#1a1a40",
};

type GuardianId = "cazador" | "emboscador" | "flanqueador" | "errante";

// Posición inicial, esquina de dispersión y salida de la base (ms desde la
// aparición). El cazador empieza ya fuera, sobre la puerta.
const GUARDIANS: Array<{
  id: GuardianId;
  col: number;
  row: number;
  cornerCol: number;
  cornerRow: number;
  releaseMs: number;
}> = [
  { id: "cazador", col: 15, row: 7, cornerCol: 30, cornerRow: 1, releaseMs: 0 },
  {
    id: "emboscador",
    col: 14,
    row: 9,
    cornerCol: 1,
    cornerRow: 1,
    releaseMs: 0,
  },
  {
    id: "flanqueador",
    col: 16,
    row: 9,
    cornerCol: 30,
    cornerRow: 18,
    releaseMs: 4000,
  },
  {
    id: "errante",
    col: 18,
    row: 9,
    cornerCol: 1,
    cornerRow: 18,
    releaseMs: 8000,
  },
];
const CAZADOR = 0; // índice en GUARDIANS; el flanqueador lo usa de referencia

const MODE_BASE = 0; // esperando dentro de la base
const MODE_LEAVING = 1; // saliendo por la puerta
const MODE_NORMAL = 2; // dispersión o persecución, según la fase

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

interface Guardian {
  x: number; // centro, px
  y: number;
  dir: number; // UP/LEFT/DOWN/RIGHT, o NONE antes de la primera decisión
  mode: number; // MODE_*
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
  const guardians: Guardian[] = GUARDIANS.map(() => ({
    x: 0,
    y: 0,
    dir: NONE,
    mode: MODE_BASE,
  }));
  let spawnMs = 0; // tiempo desde la última aparición (salidas de la base)
  let phaseIndex = 0; // índice en PHASES_MS; par = dispersión
  let phaseMs = 0; // tiempo dentro de la fase actual
  let targetCol = 0; // objetivo del guardián que está decidiendo
  let targetRow = 0;
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
  resetGuardians();

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

  function resetGuardians() {
    for (let i = 0; i < guardians.length; i++) {
      const def = GUARDIANS[i];
      const guardian = guardians[i];
      guardian.x = centerOf(def.col);
      guardian.y = centerOf(def.row);
      guardian.dir = NONE;
      guardian.mode = def.row === BASE_EXIT_ROW ? MODE_NORMAL : MODE_BASE;
    }
    spawnMs = 0;
    phaseIndex = 0;
    phaseMs = 0;
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

  function drawGuardian(guardian: Guardian, color: string) {
    const { x, y } = guardian;
    const r = GUARDIAN_RADIUS;
    const third = (r * 2) / 3;
    // Cúpula, costados rectos y falda en tres picos.
    g.fillStyle = color;
    g.beginPath();
    g.arc(x, y - 2, r, Math.PI, 0);
    g.lineTo(x + r, y + r);
    g.lineTo(x + r - third / 2, y + r - 5);
    g.lineTo(x + r - third, y + r);
    g.lineTo(x, y + r - 5);
    g.lineTo(x - r + third, y + r);
    g.lineTo(x - r + third / 2, y + r - 5);
    g.lineTo(x - r, y + r);
    g.closePath();
    g.fill();

    // Los ojos miran hacia donde avanza.
    const lookX = guardian.dir === NONE ? 0 : DX[guardian.dir] * 2;
    const lookY = guardian.dir === NONE ? 0 : DY[guardian.dir] * 2;
    g.fillStyle = PALETTE.eye;
    g.beginPath();
    g.arc(x - 5.5, y - 3, 4, 0, Math.PI * 2);
    g.arc(x + 5.5, y - 3, 4, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = PALETTE.pupil;
    g.beginPath();
    g.arc(x - 5.5 + lookX, y - 3 + lookY, 2, 0, Math.PI * 2);
    g.arc(x + 5.5 + lookX, y - 3 + lookY, 2, 0, Math.PI * 2);
    g.fill();
  }

  function draw() {
    g.drawImage(wallLayer, 0, 0);
    drawCells();
    drawPlayer();
    for (let i = 0; i < guardians.length; i++) {
      drawGuardian(guardians[i], PALETTE[GUARDIANS[i].id]);
    }
  }

  // Tablero vacío: bono, nivel siguiente y todo vuelve a su sitio.
  function nextLevel() {
    score += BONUS_LEVEL * level;
    level += 1;
    fillCells();
    resetPlayer();
    resetGuardians();
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

  function isScatter(): boolean {
    return phaseIndex < PHASES_MS.length && phaseIndex % 2 === 0;
  }

  function guardianSpeed(guardian: Guardian): number {
    const col = cellOf(guardian.x);
    if (
      cellOf(guardian.y) === TUNNEL_ROW &&
      (col < TUNNEL_SLOW_COLS || col >= COLS - TUNNEL_SLOW_COLS)
    ) {
      return TUNNEL_SPEED;
    }
    return Math.min(
      GUARDIAN_SPEED_MAX,
      GUARDIAN_SPEED + (level - 1) * GUARDIAN_SPEED_STEP,
    );
  }

  // Deja en targetCol/targetRow la celda a la que apunta el guardián. Puede
  // caer fuera del tablero o en una pared: solo sirve para medir distancias.
  function setTarget(index: number) {
    const def = GUARDIANS[index];
    if (isScatter()) {
      targetCol = def.cornerCol;
      targetRow = def.cornerRow;
      return;
    }
    const playerCol = cellOf(player.x);
    const playerRow = cellOf(player.y);
    const aheadX = DX[player.facing];
    const aheadY = DY[player.facing];
    if (def.id === "cazador") {
      targetCol = playerCol;
      targetRow = playerRow;
    } else if (def.id === "emboscador") {
      targetCol = playerCol + aheadX * AMBUSH_CELLS;
      targetRow = playerRow + aheadY * AMBUSH_CELLS;
    } else if (def.id === "flanqueador") {
      // Dobla el vector que va del cazador al punto por delante del jugador.
      const pivotCol = playerCol + aheadX * FLANK_CELLS;
      const pivotRow = playerRow + aheadY * FLANK_CELLS;
      const cazador = guardians[CAZADOR];
      targetCol = pivotCol * 2 - cellOf(cazador.x);
      targetRow = pivotRow * 2 - cellOf(cazador.y);
    } else {
      // Errante: persigue de lejos y se retira a su esquina al acercarse.
      const guardian = guardians[index];
      const dCol = cellOf(guardian.x) - playerCol;
      const dRow = cellOf(guardian.y) - playerRow;
      if (dCol * dCol + dRow * dRow > WANDER_CELLS * WANDER_CELLS) {
        targetCol = playerCol;
        targetRow = playerRow;
      } else {
        targetCol = def.cornerCol;
        targetRow = def.cornerRow;
      }
    }
  }

  // Entre las salidas libres elige la más cercana al objetivo (distancia
  // euclídea; el túnel no cuenta como atajo). Nunca invierte el sentido y,
  // en empate, gana el orden arriba, izquierda, abajo, derecha.
  function chooseDirection(index: number, col: number, row: number): number {
    const guardian = guardians[index];
    const reverse = guardian.dir === NONE ? NONE : (guardian.dir + 2) % 4;
    setTarget(index);
    let best = NONE;
    let bestDistance = Infinity;
    for (let dir = 0; dir < 4; dir++) {
      if (dir === reverse) continue;
      const nextCol = col + DX[dir];
      const nextRow = row + DY[dir];
      if (!isCorridor(nextCol, nextRow)) continue;
      const dCol = nextCol - targetCol;
      const dRow = nextRow - targetRow;
      const distance = dCol * dCol + dRow * dRow;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = dir;
      }
    }
    return best === NONE ? reverse : best;
  }

  // Sale de la base: primero hasta la columna de la puerta, luego hacia
  // arriba hasta la celda de salida. Devuelve la distancia que sobra.
  function leaveBase(guardian: Guardian, distance: number): number {
    const exitX = centerOf(BASE_EXIT_COL);
    const exitY = centerOf(BASE_EXIT_ROW);
    let remaining = distance;
    if (guardian.x !== exitX) {
      const gap = exitX - guardian.x;
      const step = Math.min(remaining, Math.abs(gap));
      guardian.dir = gap > 0 ? RIGHT : LEFT;
      guardian.x =
        step === Math.abs(gap) ? exitX : guardian.x + step * DX[guardian.dir];
      remaining -= step;
    }
    if (remaining > EPSILON && guardian.x === exitX) {
      const gap = guardian.y - exitY;
      const step = Math.min(remaining, gap);
      guardian.dir = UP;
      guardian.y = step === gap ? exitY : guardian.y - step;
      remaining -= step;
      if (guardian.y === exitY) {
        guardian.mode = MODE_NORMAL;
        guardian.dir = NONE; // decide libremente en la celda de salida
      }
    }
    return remaining;
  }

  // Mismo avance de centro a centro que el jugador, decidiendo en cada uno.
  function updateGuardian(index: number, dt: number) {
    const guardian = guardians[index];
    if (guardian.mode === MODE_BASE) {
      if (spawnMs < GUARDIANS[index].releaseMs) return;
      guardian.mode = MODE_LEAVING;
    }
    let remaining = guardianSpeed(guardian) * dt;
    if (guardian.mode === MODE_LEAVING) {
      remaining = leaveBase(guardian, remaining);
      if (guardian.mode === MODE_LEAVING) return;
    }
    while (remaining > EPSILON) {
      const col = cellOf(guardian.x);
      const row = cellOf(guardian.y);
      const atCenter =
        Math.abs(guardian.x - centerOf(col)) < EPSILON &&
        Math.abs(guardian.y - centerOf(row)) < EPSILON;
      if (atCenter) {
        guardian.x = centerOf(col);
        guardian.y = centerOf(row);
        guardian.dir = chooseDirection(index, col, row);
        if (guardian.dir === NONE) return;
      }

      const dx = DX[guardian.dir];
      const dy = DY[guardian.dir];
      const offset =
        dx !== 0
          ? (guardian.x - centerOf(col)) * dx
          : (guardian.y - centerOf(row)) * dy;
      const toNext = offset < -EPSILON ? -offset : CELL - offset;
      const step = Math.min(remaining, toNext);
      guardian.x += dx * step;
      guardian.y += dy * step;
      remaining -= step;

      if (dx < 0 && guardian.x <= -HALF + EPSILON) guardian.x += TUNNEL_WRAP;
      else if (dx > 0 && guardian.x >= LABERINTO_WIDTH + HALF - EPSILON) {
        guardian.x -= TUNNEL_WRAP;
      }
    }
  }

  // Al cambiar de fase, los guardianes en pasillo invierten el sentido.
  function updatePhase(dt: number) {
    if (phaseIndex >= PHASES_MS.length) return;
    phaseMs += dt * 1000;
    if (phaseMs < PHASES_MS[phaseIndex]) return;
    phaseMs -= PHASES_MS[phaseIndex];
    phaseIndex += 1;
    for (let i = 0; i < guardians.length; i++) {
      const guardian = guardians[i];
      if (guardian.mode === MODE_NORMAL && guardian.dir !== NONE) {
        guardian.dir = (guardian.dir + 2) % 4;
      }
    }
  }

  function update(dt: number) {
    if (gameOver) return;
    const levelBefore = level;
    updatePlayer(dt);
    if (level !== levelBefore) return; // tablero nuevo: todos en su sitio
    spawnMs += dt * 1000;
    updatePhase(dt);
    for (let i = 0; i < guardians.length; i++) updateGuardian(i, dt);
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
      resetGuardians();
      emitState();
    },
  };
}
