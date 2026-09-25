export const SERPIENTE_WIDTH = 800;
export const SERPIENTE_HEIGHT = 800;

const CELL = 40;
const COLS = 20; // 800 / 40
const ROWS = 20; // 800 / 40
const INITIAL_LENGTH = 3;
const INITIAL_HEAD_X = 6;
const INITIAL_ROW = 10;
const POINTS_PER_FRUIT = 10;
const FRUITS_PER_LEVEL = 5;
const TICK_BASE_MS = 140;
const TICK_STEP_MS = 10; // se resta por nivel superado
const TICK_MIN_MS = 60;
const FRUIT_SPRITE_URL = "/games/serpiente/fruits.png";
const FRUIT_DRAW_HEIGHT = 34;

const COLOR_BG_A = "#0b1a10";
const COLOR_BG_B = "#0e2014";
const COLOR_SNAKE_BODY = "#4ade80";
const COLOR_SNAKE_HEAD = "#86efac";
const COLOR_EYE = "#0b1a10";

type Direction = "up" | "down" | "left" | "right";

const KEY_TO_DIRECTION: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
  W: "up",
  S: "down",
  A: "left",
  D: "right",
};

const DIRECTION_VECTOR: Record<Direction, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

function tickDuration(level: number): number {
  return Math.max(TICK_MIN_MS, TICK_BASE_MS - (level - 1) * TICK_STEP_MS);
}

interface Cell {
  x: number;
  y: number;
} // coordenadas de celda, origen arriba-izquierda

interface SpriteRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Portado de references/source-assets/snake-assets/sprites.js (solo frutas).
const SPRITE_ATLAS: Record<string, SpriteRect> = {
  banana: { x: 34, y: 136, w: 110, h: 160 },
  orange: { x: 186, y: 136, w: 150, h: 160 },
  grape: { x: 378, y: 136, w: 110, h: 160 },
  garlic: { x: 540, y: 136, w: 130, h: 160 },
  eggplant: { x: 712, y: 136, w: 130, h: 160 },
  strawberry: { x: 894, y: 136, w: 110, h: 160 },
  cherry: { x: 1066, y: 136, w: 110, h: 160 },
  carrot: { x: 1228, y: 136, w: 130, h: 160 },
  mushroom: { x: 1400, y: 136, w: 130, h: 160 },
  broccoli: { x: 1582, y: 136, w: 110, h: 160 },
  watermelon: { x: 1734, y: 136, w: 150, h: 160 },
  pepper: { x: 1906, y: 136, w: 150, h: 160 },
  kiwi: { x: 2068, y: 136, w: 170, h: 160 },
  lemon: { x: 2250, y: 136, w: 140, h: 160 },
  peach: { x: 2432, y: 136, w: 130, h: 160 },
  peanut: { x: 2604, y: 136, w: 130, h: 160 },
  apple: { x: 2786, y: 136, w: 110, h: 160 },
  tomato: { x: 2948, y: 136, w: 130, h: 160 },
  berries: { x: 3110, y: 136, w: 150, h: 160 },
  grapes2: { x: 3302, y: 136, w: 110, h: 160 },
  pineapple: { x: 3454, y: 136, w: 150, h: 160 },
  melon: { x: 3637, y: 136, w: 130, h: 160 },
};

export interface SerpienteState {
  score: number;
  level: number;
  length: number;
  paused: boolean; // notificado también cuando cambia por Escape/P interno
}

export interface SerpienteHandlers {
  onStateChange(state: SerpienteState): void; // solo cuando cambia
  onGameOver(finalScore: number): void;
}

export interface SerpienteEngine {
  start(): void;
  stop(): void;
  setPaused(paused: boolean): void;
  restart(): void;
}

export function createSerpienteEngine(
  canvas: HTMLCanvasElement,
  handlers: SerpienteHandlers,
): SerpienteEngine {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");
  const g: CanvasRenderingContext2D = ctx;

  canvas.width = SERPIENTE_WIDTH;
  canvas.height = SERPIENTE_HEIGHT;

  let direction: Direction = "right";
  let snake: Cell[] = [];
  let score = 0;
  let level = 1;
  let paused = false;
  let moving = false; // la partida arranca quieta hasta la primera dirección
  let pendingDirection: Direction | null = null; // un solo giro por tick
  let accumulator = 0;
  let lastTime = 0;
  let rafId = 0;
  let running = false;

  function resetSnake() {
    snake = [];
    for (let i = 0; i < INITIAL_LENGTH; i++) {
      snake.push({ x: INITIAL_HEAD_X - i, y: INITIAL_ROW });
    }
    direction = "right";
    moving = false;
    pendingDirection = null;
    accumulator = 0;
  }

  function emitState() {
    handlers.onStateChange({ score, level, length: snake.length, paused });
  }

  function drawBoard() {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        g.fillStyle = (x + y) % 2 === 0 ? COLOR_BG_A : COLOR_BG_B;
        g.fillRect(x * CELL, y * CELL, CELL, CELL);
      }
    }
  }

  function roundedCell(cell: Cell, color: string) {
    const pad = 3;
    g.fillStyle = color;
    g.beginPath();
    g.roundRect(
      cell.x * CELL + pad,
      cell.y * CELL + pad,
      CELL - pad * 2,
      CELL - pad * 2,
      10,
    );
    g.fill();
  }

  function drawHead(cell: Cell) {
    roundedCell(cell, COLOR_SNAKE_HEAD);
    const cx = cell.x * CELL + CELL / 2;
    const cy = cell.y * CELL + CELL / 2;
    // Ojos desplazados según la dirección de la cabeza.
    const forward = 7;
    const side = 8;
    const vec: Record<Direction, [number, number]> = {
      right: [forward, 0],
      left: [-forward, 0],
      up: [0, -forward],
      down: [0, forward],
    };
    const [fx, fy] = vec[direction];
    const [sx, sy] = [Math.abs(fy) > 0 ? side : 0, Math.abs(fx) > 0 ? side : 0];
    g.fillStyle = COLOR_EYE;
    for (const sign of [-1, 1]) {
      g.beginPath();
      g.arc(cx + fx + sx * sign, cy + fy + sy * sign, 3.5, 0, Math.PI * 2);
      g.fill();
    }
  }

  function drawSnake() {
    for (let i = snake.length - 1; i >= 1; i--) {
      roundedCell(snake[i], COLOR_SNAKE_BODY);
    }
    drawHead(snake[0]);
  }

  function draw() {
    drawBoard();
    drawSnake();
  }

  function step() {
    if (pendingDirection) {
      direction = pendingDirection;
      pendingDirection = null;
    }
    const v = DIRECTION_VECTOR[direction];
    const head = snake[0];
    snake.unshift({ x: head.x + v.x, y: head.y + v.y });
    snake.pop();
  }

  function handleKeyDown(e: KeyboardEvent) {
    const next = KEY_TO_DIRECTION[e.key];
    if (!next) return;
    e.preventDefault();
    if (paused) return;
    if (!moving) {
      // Primera tecla: cualquier dirección salvo la opuesta a la inicial.
      if (next === OPPOSITE[direction]) return;
      pendingDirection = next;
      moving = true;
      lastTime = performance.now();
      return;
    }
    // Se valida contra la dirección ya aplicada, no contra la última tecla.
    if (next === direction || next === OPPOSITE[direction]) return;
    if (!pendingDirection) pendingDirection = next;
  }

  function loop(now: number) {
    if (!running) return;
    const delta = now - lastTime;
    lastTime = now;
    if (moving && !paused) {
      accumulator += delta;
      const tick = tickDuration(level);
      while (accumulator >= tick) {
        accumulator -= tick;
        step();
      }
    }
    draw();
    rafId = requestAnimationFrame(loop);
  }

  resetSnake();

  // Referencias a constantes de pasos posteriores (fruta, puntos, nivel).
  void [POINTS_PER_FRUIT, FRUITS_PER_LEVEL, FRUIT_SPRITE_URL];
  void [FRUIT_DRAW_HEIGHT, SPRITE_ATLAS];

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
      paused = value;
    },
    restart() {
      score = 0;
      level = 1;
      resetSnake();
      emitState();
    },
  };
}
