export const RANA_WIDTH = 1280;
export const RANA_HEIGHT = 800;

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

const FROG_TIME_MS = 30000;
const TIMER_WARN_MS = 10000;
const LIVES_START = 3;
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

// Todos los colores del juego: el pase de skins parte de esta tabla.
const PALETTE = {
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
  } as Record<number, string>,
  truckCab: "#e8eef5",
  vehicleWindow: "#0b1a10",
  headlight: "#ffffff",
  timerTrack: "#1a1a22",
  timerOk: "#5fe04a",
  timerWarn: "#ff2d6f",
};

function mod(value: number, size: number): number {
  return ((value % size) + size) % size;
}

function speedMult(level: number): number {
  return Math.min(SPEED_MAX_MULT, 1 + (level - 1) * SPEED_STEP);
}

interface Frog {
  x: number; // px, borde izquierdo de su celda
  row: number;
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
}

export function createRanaEngine(
  canvas: HTMLCanvasElement,
  handlers: RanaHandlers,
): RanaEngine {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");
  const g: CanvasRenderingContext2D = ctx;

  canvas.width = RANA_WIDTH;
  canvas.height = RANA_HEIGHT;

  let offsets: number[] = createOffsets(); // px, uno por carril de LANES
  let homes: boolean[] = HOME_COLS.map(() => false);
  let frog: Frog = createFrog();
  let timeLeft = FROG_TIME_MS;
  let score = 0;
  let lives = LIVES_START;
  let level = 1;
  let paused = false;
  let lastTime = 0;
  let rafId = 0;
  let running = false;
  let lastEmitted: RanaState | null = null;

  function createOffsets(): number[] {
    return LANES.map((lane) => lane.row * LANE_PHASE);
  }

  function createFrog(): Frog {
    return { x: START_COL * CELL_W, row: ROW_START };
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

  function drawBoard() {
    g.fillStyle = PALETTE.water;
    g.fillRect(0, 0, RANA_WIDTH, ROW_MEDIAN * CELL_H);
    g.fillStyle = PALETTE.waterLine;
    for (let row = ROW_HOME + 1; row < ROW_MEDIAN; row++) {
      for (let x = (row % 2) * 80; x < RANA_WIDTH; x += 160) {
        g.fillRect(x + 20, row * CELL_H + 46, 36, 3);
      }
    }

    g.fillStyle = PALETTE.road;
    g.fillRect(
      0,
      (ROW_MEDIAN + 1) * CELL_H,
      RANA_WIDTH,
      (ROW_START - ROW_MEDIAN - 1) * CELL_H,
    );
    g.fillStyle = PALETTE.roadLine;
    for (let row = ROW_MEDIAN + 2; row < ROW_START; row++) {
      for (let x = 16; x < RANA_WIDTH; x += CELL_W) {
        g.fillRect(x, row * CELL_H - 2, 32, 4);
      }
    }

    for (const row of [ROW_MEDIAN, ROW_START]) {
      g.fillStyle = PALETTE.safe;
      g.fillRect(0, row * CELL_H, RANA_WIDTH, CELL_H);
      g.fillStyle = PALETTE.safeEdge;
      g.fillRect(0, row * CELL_H, RANA_WIDTH, 4);
      g.fillRect(0, (row + 1) * CELL_H - 4, RANA_WIDTH, 4);
    }

    g.fillStyle = PALETTE.hedge;
    g.fillRect(0, 0, RANA_WIDTH, CELL_H);
    HOME_COLS.forEach((col, i) => {
      const x = col * CELL_W;
      g.fillStyle = PALETTE.bay;
      g.fillRect(x, HOME_INSET_Y, HOME_WIDTH, CELL_H - HOME_INSET_Y);
      if (homes[i]) drawFrog(x + HOME_WIDTH / 2, CELL_H / 2 + 4, 0.8);
    });
  }

  function drawLog(x: number, y: number, width: number) {
    g.fillStyle = PALETTE.log;
    g.fillRect(x, y + 8, width, CELL_H - 16);
    g.fillStyle = PALETTE.logEdge;
    g.fillRect(x, y + 8, width, 6);
    g.fillRect(x, y + 14, 10, CELL_H - 28);
    g.fillStyle = PALETTE.logGrain;
    for (let gx = x + 40; gx < x + width - 30; gx += 72) {
      g.fillRect(gx, y + 26 + ((gx - x) % 3) * 6, 28, 3);
    }
  }

  function drawTurtles(x: number, y: number, length: number, dir: 1 | -1) {
    for (let i = 0; i < length; i++) {
      const cx = x + i * CELL_W + CELL_W / 2;
      const cy = y + CELL_H / 2;
      g.fillStyle = PALETTE.turtle;
      g.fillRect(cx + dir * 22 - 5, cy - 5, 10, 10); // cabeza
      g.fillRect(cx - 22, cy - 22, 8, 8);
      g.fillRect(cx + 14, cy - 22, 8, 8);
      g.fillRect(cx - 22, cy + 14, 8, 8);
      g.fillRect(cx + 14, cy + 14, 8, 8);
      g.beginPath();
      g.arc(cx, cy, 20, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = PALETTE.turtleShell;
      g.beginPath();
      g.arc(cx, cy, 12, 0, Math.PI * 2);
      g.fill();
    }
  }

  function drawVehicle(x: number, y: number, lane: Lane) {
    const width = lane.length * CELL_W;
    const front = lane.dir === 1 ? x + width - 4 : x + 4;
    const color = PALETTE.vehicles[lane.row];
    if (lane.kind === "truck") {
      const cabX = lane.dir === 1 ? x + width - 40 : x + 4;
      const boxX = lane.dir === 1 ? x + 4 : x + 44;
      g.fillStyle = color;
      g.fillRect(boxX, y + 8, width - 48, CELL_H - 16);
      g.fillStyle = PALETTE.truckCab;
      g.fillRect(cabX, y + 10, 36, CELL_H - 20);
      g.fillStyle = PALETTE.vehicleWindow;
      g.fillRect(cabX + (lane.dir === 1 ? 18 : 6), y + 16, 12, CELL_H - 32);
    } else {
      g.fillStyle = color;
      g.fillRect(x + 4, y + 12, width - 8, CELL_H - 24);
      g.fillStyle = PALETTE.vehicleWindow;
      g.fillRect(x + 20, y + 18, width - 40, CELL_H - 36);
    }
    g.fillStyle = PALETTE.headlight;
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

  // Rana vista desde arriba, mirando hacia la fila de casas.
  function drawFrog(cx: number, cy: number, scale = 1) {
    g.save();
    g.translate(cx, cy);
    g.scale(scale, scale);
    g.fillStyle = PALETTE.frog;
    g.fillRect(-16, -14, 32, 30); // cuerpo
    g.fillRect(-16, -22, 10, 10); // ojos
    g.fillRect(6, -22, 10, 10);
    g.fillRect(-24, -10, 8, 10); // patas delanteras
    g.fillRect(16, -10, 8, 10);
    g.fillRect(-24, 8, 8, 14); // patas traseras
    g.fillRect(16, 8, 8, 14);
    g.fillStyle = PALETTE.frogBelly;
    g.fillRect(-8, -4, 16, 14);
    g.fillStyle = PALETTE.frogEye;
    g.fillRect(-14, -22, 5, 5);
    g.fillRect(9, -22, 5, 5);
    g.restore();
  }

  function drawTimer() {
    const height = RANA_HEIGHT - TIMER_BAR_Y;
    g.fillStyle = PALETTE.timerTrack;
    g.fillRect(0, TIMER_BAR_Y, RANA_WIDTH, height);
    g.fillStyle =
      timeLeft <= TIMER_WARN_MS ? PALETTE.timerWarn : PALETTE.timerOk;
    g.fillRect(
      4,
      TIMER_BAR_Y + 4,
      (RANA_WIDTH - 8) * (timeLeft / FROG_TIME_MS),
      height - 8,
    );
  }

  function draw() {
    drawBoard();
    drawLanes();
    drawFrog(frog.x + CELL_W / 2, frog.row * CELL_H + CELL_H / 2);
    drawTimer();
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

  function update(dt: number) {
    updateLanes(dt);
    emitState();
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
      lastTime = performance.now();
      emitState();
      rafId = requestAnimationFrame(loop);
    },
    stop() {
      running = false;
      cancelAnimationFrame(rafId);
    },
    setPaused(value: boolean) {
      if (paused === value) return;
      paused = value;
      emitState();
    },
    restart() {
      score = 0;
      lives = LIVES_START;
      level = 1;
      paused = false;
      offsets = createOffsets();
      homes = HOME_COLS.map(() => false);
      frog = createFrog();
      timeLeft = FROG_TIME_MS;
      emitState();
    },
  };
}
