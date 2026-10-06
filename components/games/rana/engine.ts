export const RANA_WIDTH = 1280;
export const RANA_HEIGHT = 800;

const COLS = 20;
const ROWS = 13;
const CELL_W = 64; // 1280 / 20
const CELL_H = 60; // 13 * 60 = 780
const TIMER_BAR_Y = ROWS * CELL_H; // barra de tiempo en y = 780..800
const LOOP_CELLS = 24;
const LOOP = LOOP_CELLS * CELL_W; // bucle de cada carril: 1536 px
const LOOP_HIDDEN = LOOP - RANA_WIDTH; // tramo del bucle fuera del canvas

const ROW_HOME = 0;
const ROW_MEDIAN = 6;
const ROW_START = 12;
const START_COL = 10;

const HOME_COLS = [1, 5, 9, 13, 17]; // primera columna de cada bahía
const HOME_WIDTH = 2 * CELL_W;
const HOME_INSET_Y = 8; // seto visible sobre cada bahía
const HOME_TOLERANCE = 48; // px entre centro de rana y centro de bahía

const HOP_MS = 100;
const HOP_STRETCH = 0.18; // la rana crece a mitad de salto
const DEATH_MS = 600;
const FROG_TIME_MS = 30000;
const TIMER_WARN_MS = 10000;
const FROG_HITBOX_INSET = 10;
const VEHICLE_HITBOX_INSET = 4;
const LIVES_START = 3;
const POINTS_PER_ROW = 10;
const POINTS_HOME = 50;
const BONUS_LEVEL = 500; // multiplicado por el nivel completado
const SPEED_STEP = 0.12; // por nivel superado
const SPEED_MAX_MULT = 2.2;
const MAX_DT_MS = 50; // tope para no saltar tras pausas o cambios de pestaña

type LaneKind = "car" | "truck" | "log" | "turtle";

interface Lane {
  row: number;
  kind: LaneKind;
  length: number; // celdas
  count: number; // objetos equiespaciados en el bucle
  speed: number; // px/s en nivel 1
  dir: 1 | -1; // 1 = derecha
}

const LANES: Lane[] = [
  { row: 1, kind: "log", length: 4, count: 3, speed: 80, dir: 1 },
  { row: 2, kind: "turtle", length: 2, count: 4, speed: 100, dir: -1 },
  { row: 3, kind: "log", length: 5, count: 2, speed: 110, dir: 1 },
  { row: 4, kind: "log", length: 3, count: 3, speed: 60, dir: 1 },
  { row: 5, kind: "turtle", length: 3, count: 4, speed: 80, dir: -1 },
  { row: 7, kind: "truck", length: 2, count: 3, speed: 80, dir: -1 },
  { row: 8, kind: "car", length: 1, count: 2, speed: 180, dir: 1 },
  { row: 9, kind: "car", length: 1, count: 4, speed: 120, dir: -1 },
  { row: 10, kind: "car", length: 1, count: 3, speed: 70, dir: 1 },
  { row: 11, kind: "car", length: 1, count: 4, speed: 90, dir: -1 },
];

// Desfase inicial por carril para que no arranquen todos alineados.
const LANE_PHASE = 97;

export type RanaSkin = "clasico" | "retro" | "neon";

export const RANA_SKINS: Array<{ id: RanaSkin; label: string }> = [
  { id: "clasico", label: "CLÁSICO" },
  { id: "retro", label: "RETRO" },
  { id: "neon", label: "NEÓN" },
];

export const RANA_SKIN_STORAGE_KEY = "arcadevault.rana.skin.v1";

// Todos los colores del juego, por skin. `clasico` conserva los valores
// originales sin cambios.
interface RanaPalette {
  road: string;
  roadLine: string;
  water: string;
  waterLine: string;
  safe: string;
  safeEdge: string;
  hedge: string;
  bay: string;
  frog: string;
  frogBelly: string;
  frogEye: string;
  frogDead: string;
  frogDeadBelly: string;
  log: string;
  logEdge: string;
  logGrain: string;
  turtle: string;
  turtleShell: string;
  vehicles: Record<number, string>;
  truckCab: string;
  vehicleWindow: string;
  headlight: string;
  timerTrack: string;
  timerOk: string;
  timerWarn: string;
}

const SKIN_PALETTES: Record<RanaSkin, RanaPalette> = {
  clasico: {
    road: "#1a1a22",
    roadLine: "#aab2bd",
    water: "#0b2a5a",
    waterLine: "#1d4f9c",
    safe: "#3a1f5a",
    safeEdge: "#5a2d8a",
    hedge: "#1f7a3a",
    bay: "#0b1a10",
    frog: "#5fe04a",
    frogBelly: "#b6ff7a",
    frogEye: "#0b1a10",
    frogDead: "#ff2d6f",
    frogDeadBelly: "#ffd6e4",
    log: "#8a5a2b",
    logEdge: "#b47a3c",
    logGrain: "#5c3a1a",
    turtle: "#d9442e",
    turtleShell: "#f08a4b",
    vehicles: {
      7: "#ffd23f",
      8: "#ff2d6f",
      9: "#00f5ff",
      10: "#ff8a00",
      11: "#c58cff",
    },
    truckCab: "#e8eef5",
    vehicleWindow: "#0b1a10",
    headlight: "#ffffff",
    timerTrack: "#1a1a22",
    timerOk: "#5fe04a",
    timerWarn: "#ff2d6f",
  },
  // Fósforo verde: plataformas a media intensidad, rana y aviso a la máxima.
  retro: {
    road: "#04140a",
    roadLine: "#177a31",
    water: "#020a04",
    waterLine: "#145c26",
    safe: "#0a2a14",
    safeEdge: "#1f9e45",
    hedge: "#145c26",
    bay: "#020a04",
    frog: "#e0ffe8",
    frogBelly: "#8dffa8",
    frogEye: "#020a04",
    frogDead: "#e0ffe8",
    frogDeadBelly: "#020a04",
    log: "#177a31",
    logEdge: "#1f9e45",
    logGrain: "#0f5a22",
    turtle: "#1f9e45",
    turtleShell: "#177a31",
    vehicles: {
      7: "#8dffa8",
      8: "#33ff66",
      9: "#1f9e45",
      10: "#2bd05a",
      11: "#177a31",
    },
    truckCab: "#b8ffcc",
    vehicleWindow: "#04140a",
    headlight: "#e0ffe8",
    timerTrack: "#04140a",
    timerOk: "#1f9e45",
    timerWarn: "#e0ffe8",
  },
  neon: {
    road: "#0a0a14",
    roadLine: "#3a3a66",
    water: "#04081c",
    waterLine: "#133a9c",
    safe: "#120a24",
    safeEdge: "#8a2be2",
    hedge: "#0a6a30",
    bay: "#05050a",
    frog: "#ccff33",
    frogBelly: "#f0ffb0",
    frogEye: "#05050a",
    frogDead: "#ffffff",
    frogDeadBelly: "#ff2d95",
    log: "#b35f00",
    logEdge: "#cc7000",
    logGrain: "#6a3800",
    turtle: "#c4208f",
    turtleShell: "#e0309f",
    vehicles: {
      7: "#ff8a00",
      8: "#ff2d95",
      9: "#00f5ff",
      10: "#b46bff",
      11: "#4d7cff",
    },
    truckCab: "#e8f0ff",
    vehicleWindow: "#05050a",
    headlight: "#ffffff",
    timerTrack: "#0a0a14",
    timerOk: "#00f5ff",
    timerWarn: "#ff2d95",
  },
};

// Trazo por skin: glow (shadowBlur, 0 = ninguno) en rana, plataformas,
// vehículos y barra de tiempo, y scanlines sobre todo el frame.
interface SkinRenderer {
  glow: number;
  scanlines: boolean;
}

const SKIN_RENDERERS: Record<RanaSkin, SkinRenderer> = {
  clasico: { glow: 0, scanlines: false },
  retro: { glow: 0, scanlines: true },
  neon: { glow: 10, scanlines: false },
};

const SCANLINE_COLOR = "rgba(0,0,0,.18)";
const SCANLINE_STEP = 3;

function mod(value: number, size: number): number {
  return ((value % size) + size) % size;
}

function isRiver(row: number): boolean {
  return row > ROW_HOME && row < ROW_MEDIAN;
}

function speedMult(level: number): number {
  return Math.min(SPEED_MAX_MULT, 1 + (level - 1) * SPEED_STEP);
}

type Direction = "up" | "down" | "left" | "right";

const KEY_TO_DIRECTION: Record<string, Direction> = {
  ArrowUp: "up",
  w: "up",
  W: "up",
  ArrowDown: "down",
  s: "down",
  S: "down",
  ArrowLeft: "left",
  a: "left",
  A: "left",
  ArrowRight: "right",
  d: "right",
  D: "right",
};

const DIRECTION_ANGLE: Record<Direction, number> = {
  up: 0,
  right: Math.PI / 2,
  down: Math.PI,
  left: -Math.PI / 2,
};

interface Frog {
  x: number; // px, borde izquierdo de su celda
  row: number;
  bestRow: number; // fila más alta alcanzada por esta rana
  facing: Direction;
  // Animación del salto: la posición lógica ya es la de destino.
  hopMs: number; // ms que quedan de salto; 0 = quieta
  fromX: number;
  fromRow: number;
  deadMs: number; // ms que quedan de animación de muerte; 0 = viva
}

export interface RanaState {
  score: number;
  lives: number;
  level: number;
  paused: boolean; // notificado también cuando cambia por Escape/P interno
}

export interface RanaHandlers {
  onStateChange(state: RanaState): void; // solo cuando cambia
  onGameOver(finalScore: number): void; // una sola vez, al perder la última vida
}

export interface RanaEngine {
  start(): void;
  stop(): void;
  setPaused(paused: boolean): void;
  restart(): void;
  setSkin(skin: RanaSkin): void;
}

export function createRanaEngine(
  canvas: HTMLCanvasElement,
  handlers: RanaHandlers,
  options?: { initialSkin?: RanaSkin },
): RanaEngine {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");
  const g: CanvasRenderingContext2D = ctx;

  canvas.width = RANA_WIDTH;
  canvas.height = RANA_HEIGHT;

  let skin: RanaSkin = options?.initialSkin ?? "clasico";
  let palette = SKIN_PALETTES[skin];
  let renderer = SKIN_RENDERERS[skin];
  let offsets: number[] = createOffsets(); // px, uno por carril de LANES
  let homes: boolean[] = HOME_COLS.map(() => false);
  let frog: Frog = createFrog();
  let timeLeft = FROG_TIME_MS;
  let score = 0;
  let lives = LIVES_START;
  let level = 1;
  let paused = false;
  let gameOver = false;
  let lastTime = 0;
  let rafId = 0;
  let running = false;
  let lastEmitted: RanaState | null = null;

  function createOffsets(): number[] {
    return LANES.map((lane) => lane.row * LANE_PHASE);
  }

  function createFrog(): Frog {
    const x = START_COL * CELL_W;
    return {
      x,
      row: ROW_START,
      bestRow: ROW_START,
      facing: "up",
      hopMs: 0,
      fromX: x,
      fromRow: ROW_START,
      deadMs: 0,
    };
  }

  function emitState() {
    const next: RanaState = { score, lives, level, paused };
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

  // Bordes izquierdos (px) de los objetos de un carril que tocan el canvas.
  // El carril es un bucle de LOOP px del que el canvas ve 1280: un objeto que
  // sale por un lado asoma por el otro sin saltos.
  function laneObjects(index: number): number[] {
    const lane = LANES[index];
    const width = lane.length * CELL_W;
    const xs: number[] = [];
    for (let i = 0; i < lane.count; i++) {
      const base =
        mod(offsets[index] + (i * LOOP) / lane.count, LOOP) - LOOP_HIDDEN;
      for (const x of [base, base - LOOP]) {
        if (x < RANA_WIDTH && x + width > 0) xs.push(x);
      }
    }
    return xs;
  }

  // Glow solo en el relleno principal de cada entidad; glowOff lo restablece
  // para no contaminar el resto del frame.
  function glowOn(color: string) {
    if (renderer.glow <= 0) return;
    g.shadowColor = color;
    g.shadowBlur = renderer.glow;
  }

  function glowOff() {
    if (renderer.glow <= 0) return;
    g.shadowBlur = 0;
    g.shadowColor = "transparent";
  }

  function drawScanlines() {
    if (!renderer.scanlines) return;
    g.fillStyle = SCANLINE_COLOR;
    for (let y = 0; y < RANA_HEIGHT; y += SCANLINE_STEP) {
      g.fillRect(0, y, RANA_WIDTH, 1);
    }
  }

  function drawBoard() {
    g.fillStyle = palette.water;
    g.fillRect(0, 0, RANA_WIDTH, ROW_MEDIAN * CELL_H);
    g.fillStyle = palette.waterLine;
    for (let row = ROW_HOME + 1; row < ROW_MEDIAN; row++) {
      for (let x = (row % 2) * 80; x < RANA_WIDTH; x += 160) {
        g.fillRect(x + 20, row * CELL_H + 46, 36, 3);
      }
    }

    g.fillStyle = palette.road;
    g.fillRect(
      0,
      (ROW_MEDIAN + 1) * CELL_H,
      RANA_WIDTH,
      (ROW_START - ROW_MEDIAN - 1) * CELL_H,
    );
    g.fillStyle = palette.roadLine;
    for (let row = ROW_MEDIAN + 2; row < ROW_START; row++) {
      for (let x = 16; x < RANA_WIDTH; x += CELL_W) {
        g.fillRect(x, row * CELL_H - 2, 32, 4);
      }
    }

    for (const row of [ROW_MEDIAN, ROW_START]) {
      g.fillStyle = palette.safe;
      g.fillRect(0, row * CELL_H, RANA_WIDTH, CELL_H);
      g.fillStyle = palette.safeEdge;
      g.fillRect(0, row * CELL_H, RANA_WIDTH, 4);
      g.fillRect(0, (row + 1) * CELL_H - 4, RANA_WIDTH, 4);
    }

    g.fillStyle = palette.hedge;
    g.fillRect(0, 0, RANA_WIDTH, CELL_H);
    HOME_COLS.forEach((col, i) => {
      const x = col * CELL_W;
      g.fillStyle = palette.bay;
      g.fillRect(x, HOME_INSET_Y, HOME_WIDTH, CELL_H - HOME_INSET_Y);
      if (homes[i]) drawFrog(x + HOME_WIDTH / 2, CELL_H / 2 + 4, 0.8);
    });
  }

  function drawLog(x: number, y: number, width: number) {
    g.fillStyle = palette.log;
    glowOn(palette.log);
    g.fillRect(x, y + 8, width, CELL_H - 16);
    glowOff();
    g.fillStyle = palette.logEdge;
    g.fillRect(x, y + 8, width, 6);
    g.fillRect(x, y + 14, 10, CELL_H - 28);
    g.fillStyle = palette.logGrain;
    for (let gx = x + 40; gx < x + width - 30; gx += 72) {
      g.fillRect(gx, y + 26 + ((gx - x) % 3) * 6, 28, 3);
    }
  }

  function drawTurtles(x: number, y: number, length: number, dir: 1 | -1) {
    for (let i = 0; i < length; i++) {
      const cx = x + i * CELL_W + CELL_W / 2;
      const cy = y + CELL_H / 2;
      g.fillStyle = palette.turtle;
      glowOn(palette.turtle);
      g.fillRect(cx + dir * 22 - 5, cy - 5, 10, 10); // cabeza
      g.fillRect(cx - 22, cy - 22, 8, 8);
      g.fillRect(cx + 14, cy - 22, 8, 8);
      g.fillRect(cx - 22, cy + 14, 8, 8);
      g.fillRect(cx + 14, cy + 14, 8, 8);
      g.beginPath();
      g.arc(cx, cy, 20, 0, Math.PI * 2);
      g.fill();
      glowOff();
      g.fillStyle = palette.turtleShell;
      g.beginPath();
      g.arc(cx, cy, 12, 0, Math.PI * 2);
      g.fill();
    }
  }

  function drawVehicle(x: number, y: number, lane: Lane) {
    const width = lane.length * CELL_W;
    const front = lane.dir === 1 ? x + width - 4 : x + 4;
    const color = palette.vehicles[lane.row];
    if (lane.kind === "truck") {
      const cabX = lane.dir === 1 ? x + width - 40 : x + 4;
      const boxX = lane.dir === 1 ? x + 4 : x + 44;
      g.fillStyle = color;
      glowOn(color);
      g.fillRect(boxX, y + 8, width - 48, CELL_H - 16);
      glowOff();
      g.fillStyle = palette.truckCab;
      g.fillRect(cabX, y + 10, 36, CELL_H - 20);
      g.fillStyle = palette.vehicleWindow;
      g.fillRect(cabX + (lane.dir === 1 ? 18 : 6), y + 16, 12, CELL_H - 32);
    } else {
      g.fillStyle = color;
      glowOn(color);
      g.fillRect(x + 4, y + 12, width - 8, CELL_H - 24);
      glowOff();
      g.fillStyle = palette.vehicleWindow;
      g.fillRect(x + 20, y + 18, width - 40, CELL_H - 36);
    }
    g.fillStyle = palette.headlight;
    const lightX = lane.dir === 1 ? front - 6 : front;
    g.fillRect(lightX, y + 14, 6, 6);
    g.fillRect(lightX, y + CELL_H - 20, 6, 6);
  }

  function drawLanes() {
    LANES.forEach((lane, index) => {
      const y = lane.row * CELL_H;
      for (const x of laneObjects(index)) {
        if (lane.kind === "log") drawLog(x, y, lane.length * CELL_W);
        else if (lane.kind === "turtle") {
          drawTurtles(x, y, lane.length, lane.dir);
        } else drawVehicle(x, y, lane);
      }
    });
  }

  // Rana vista desde arriba; con ángulo 0 mira hacia la fila de casas.
  function drawFrog(
    cx: number,
    cy: number,
    scale = 1,
    angle = 0,
    dead = false,
  ) {
    g.save();
    g.translate(cx, cy);
    g.rotate(angle);
    g.scale(scale, scale);
    const bodyColor = dead ? palette.frogDead : palette.frog;
    g.fillStyle = bodyColor;
    glowOn(bodyColor);
    g.fillRect(-16, -14, 32, 30); // cuerpo
    g.fillRect(-16, -22, 10, 10); // ojos
    g.fillRect(6, -22, 10, 10);
    g.fillRect(-24, -10, 8, 10); // patas delanteras
    g.fillRect(16, -10, 8, 10);
    g.fillRect(-24, 8, 8, 14); // patas traseras
    g.fillRect(16, 8, 8, 14);
    glowOff();
    g.fillStyle = dead ? palette.frogDeadBelly : palette.frogBelly;
    g.fillRect(-8, -4, 16, 14);
    g.fillStyle = palette.frogEye;
    g.fillRect(-14, -22, 5, 5);
    g.fillRect(9, -22, 5, 5);
    g.restore();
  }

  function drawActiveFrog() {
    if (frog.deadMs > 0 || gameOver) {
      // Rana congelada donde murió; se encoge mientras dura la animación.
      drawFrog(
        frog.x + CELL_W / 2,
        frog.row * CELL_H + CELL_H / 2,
        0.6 + 0.4 * (frog.deadMs / DEATH_MS),
        DIRECTION_ANGLE[frog.facing],
        true,
      );
      return;
    }
    const t = 1 - frog.hopMs / HOP_MS; // 0 = origen, 1 = destino
    const x = frog.fromX + (frog.x - frog.fromX) * t;
    const y = (frog.fromRow + (frog.row - frog.fromRow) * t) * CELL_H;
    drawFrog(
      x + CELL_W / 2,
      y + CELL_H / 2,
      1 + HOP_STRETCH * Math.sin(Math.PI * t),
      DIRECTION_ANGLE[frog.facing],
    );
  }

  function drawTimer() {
    const height = RANA_HEIGHT - TIMER_BAR_Y;
    g.fillStyle = palette.timerTrack;
    g.fillRect(0, TIMER_BAR_Y, RANA_WIDTH, height);
    const barColor =
      timeLeft <= TIMER_WARN_MS ? palette.timerWarn : palette.timerOk;
    g.fillStyle = barColor;
    glowOn(barColor);
    g.fillRect(
      4,
      TIMER_BAR_Y + 4,
      (RANA_WIDTH - 8) * (timeLeft / FROG_TIME_MS),
      height - 8,
    );
    glowOff();
  }

  function draw() {
    drawBoard();
    drawLanes();
    drawActiveFrog();
    drawTimer();
    drawScanlines();
  }

  function updateLanes(dt: number) {
    const mult = speedMult(level);
    LANES.forEach((lane, index) => {
      offsets[index] = mod(
        offsets[index] + lane.speed * mult * lane.dir * dt,
        LOOP,
      );
    });
  }

  // Índice en LANES del carril de la fila de la rana, o -1 en filas sin carril.
  function frogLane(): number {
    return LANES.findIndex((lane) => lane.row === frog.row);
  }

  // Índice en LANES del carril cuya plataforma queda bajo el centro de la
  // rana, o -1 si no está en el río o no tiene ninguna debajo.
  function platformUnderFrog(): number {
    if (!isRiver(frog.row)) return -1;
    const index = frogLane();
    const center = frog.x + CELL_W / 2;
    const width = LANES[index].length * CELL_W;
    const covered = laneObjects(index).some(
      (x) => center >= x && center <= x + width,
    );
    return covered ? index : -1;
  }

  // Bahía libre en la que entra una rana con ese centro, o -1.
  function freeHomeAt(center: number): number {
    return HOME_COLS.findIndex(
      (col, i) =>
        !homes[i] &&
        Math.abs(center - (col * CELL_W + HOME_WIDTH / 2)) <= HOME_TOLERANCE,
    );
  }

  function hitByVehicle(): boolean {
    const index = frogLane();
    if (index < 0 || isRiver(frog.row)) return false;
    const width = LANES[index].length * CELL_W;
    const left = frog.x + FROG_HITBOX_INSET;
    const right = frog.x + CELL_W - FROG_HITBOX_INSET;
    return laneObjects(index).some(
      (x) =>
        right > x + VEHICLE_HITBOX_INSET &&
        left < x + width - VEHICLE_HITBOX_INSET,
    );
  }

  function die() {
    if (frog.deadMs > 0) return;
    frog.deadMs = DEATH_MS;
    frog.hopMs = 0;
    lives -= 1;
  }

  function endGame() {
    if (gameOver) return;
    gameOver = true;
    emitState();
    handlers.onGameOver(score);
  }

  function nextLevel() {
    score += BONUS_LEVEL * level;
    level += 1;
    homes = HOME_COLS.map(() => false);
  }

  function spawnFrog() {
    frog = createFrog();
    timeLeft = FROG_TIME_MS;
  }

  function reachRow(row: number) {
    if (row >= frog.bestRow) return;
    frog.bestRow = row;
    score += POINTS_PER_ROW;
  }

  function hop(direction: Direction) {
    if (frog.hopMs > 0) return; // sin cola de entrada
    const row =
      frog.row + (direction === "up" ? -1 : direction === "down" ? 1 : 0);
    let x =
      frog.x +
      (direction === "left" ? -CELL_W : direction === "right" ? CELL_W : 0);
    if (row > ROW_START) return;

    if (row === ROW_HOME) {
      const home = freeHomeAt(x + CELL_W / 2);
      if (home < 0) {
        // Seto o bahía ocupada: la rana muere donde cae.
        frog.x = x;
        frog.row = row;
        frog.facing = direction;
        die();
        return;
      }
      reachRow(row);
      score += POINTS_HOME;
      homes[home] = true;
      if (homes.every(Boolean)) nextLevel();
      spawnFrog();
      return;
    }

    if (isRiver(row)) {
      // En el río la x es continua: basta con que el centro siga a la vista.
      const center = x + CELL_W / 2;
      if (center < 0 || center > RANA_WIDTH) return;
    } else {
      // De vuelta a tierra, la rana se ajusta a la columna más cercana.
      if (isRiver(frog.row)) {
        const col = Math.round(x / CELL_W);
        x = Math.min(COLS - 1, Math.max(0, col)) * CELL_W;
      }
      if (x < 0 || x > (COLS - 1) * CELL_W) return;
    }

    frog.fromX = frog.x;
    frog.fromRow = frog.row;
    frog.x = x;
    frog.row = row;
    frog.facing = direction;
    frog.hopMs = HOP_MS;
    reachRow(row);
  }

  // Animación de muerte: la rana no se mueve ni corre el reloj; el tráfico sí.
  function updateDeath(dt: number) {
    frog.deadMs = Math.max(0, frog.deadMs - dt * 1000);
    if (frog.deadMs > 0) return;
    if (lives <= 0) endGame();
    else spawnFrog();
  }

  function updateFrog(dt: number, riding: number) {
    if (riding >= 0) {
      const lane = LANES[riding];
      const dx = lane.speed * speedMult(level) * lane.dir * dt;
      frog.x += dx;
      if (isRiver(frog.fromRow)) frog.fromX += dx;
    }
    frog.hopMs = Math.max(0, frog.hopMs - dt * 1000);
    timeLeft = Math.max(0, timeLeft - dt * 1000);

    const center = frog.x + CELL_W / 2;
    const drowned = isRiver(frog.row) && platformUnderFrog() < 0;
    const carriedOut = center < 0 || center > RANA_WIDTH;
    if (drowned || carriedOut || hitByVehicle() || timeLeft <= 0) die();
  }

  function update(dt: number) {
    if (gameOver) return;
    const riding = frog.deadMs > 0 ? -1 : platformUnderFrog();
    updateLanes(dt);
    if (frog.deadMs > 0) updateDeath(dt);
    else updateFrog(dt, riding);
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
    const direction = KEY_TO_DIRECTION[e.key];
    if (!direction) return;
    e.preventDefault();
    // Un salto por pulsación: mantener la tecla no repite.
    if (e.repeat || paused || gameOver || frog.deadMs > 0) return;
    hop(direction);
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
    setSkin(next: RanaSkin) {
      if (next === skin) return;
      skin = next;
      palette = SKIN_PALETTES[skin];
      renderer = SKIN_RENDERERS[skin];
      draw(); // redibuja al instante, también en pausa o con la partida terminada
    },
    restart() {
      score = 0;
      lives = LIVES_START;
      level = 1;
      paused = false;
      gameOver = false;
      offsets = createOffsets();
      homes = HOME_COLS.map(() => false);
      frog = createFrog();
      timeLeft = FROG_TIME_MS;
      emitState();
    },
  };
}
