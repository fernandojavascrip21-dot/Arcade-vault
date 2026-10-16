export const SERPIENTE_WIDTH = 1280;
export const SERPIENTE_HEIGHT = 800;

const CELL = 40;
const COLS = 32; // 1280 / 40
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
const MAX_DT_MS = 50; // tope del delta de frame: sin ráfaga de ticks al volver a la pestaña

// Skins visuales (spec 11 §8): `clasico` es el aspecto original; `retro`
// (fósforo ámbar) y `neon` (glow) solo cambian colores y trazo. No cambian
// mecánica, rejilla, velocidades ni tamaños.
export type SerpienteSkin = "clasico" | "retro" | "neon";

export const SERPIENTE_SKINS: Array<{ id: SerpienteSkin; label: string }> = [
  { id: "clasico", label: "CLÁSICO" },
  { id: "retro", label: "RETRO" },
  { id: "neon", label: "NEÓN" },
];

export const SERPIENTE_SKIN_STORAGE_KEY = "arcadevault.serpiente.skin.v1";

interface SerpientePalette {
  /** Casillas del damero (pares / impares). */
  bgA: string;
  bgB: string;
  body: string;
  head: string;
  eye: string;
  /** Fruta dibujada como forma (null = sprite de fruits.png, como el original). */
  fruit: string | null;
  /** Líneas de barrido CRT (null = sin scanlines). */
  scanlines: string | null;
}

const SKIN_PALETTES: Record<SerpienteSkin, SerpientePalette> = {
  // Valores originales sin alterar.
  clasico: {
    bgA: "#0b1a10",
    bgB: "#0e2014",
    body: "#4ade80",
    head: "#86efac",
    eye: "#0b1a10",
    fruit: null,
    scanlines: null,
  },
  // Fósforo ámbar (el verde ya es el aspecto clásico): la intensidad
  // distingue fruta > cabeza > cuerpo.
  retro: {
    bgA: "#0a0700",
    bgB: "#0f0a02",
    body: "#b37000",
    head: "#ffb000",
    eye: "#0a0700",
    fruit: "#ffe7b0",
    scanlines: "rgba(0, 0, 0, 0.22)",
  },
  // Colores saturados con glow, alineados con --cian/--amarillo/--magenta.
  neon: {
    bgA: "#05050a",
    bgB: "#0a0a14",
    body: "#00f5ff",
    head: "#f5ff00",
    eye: "#05050a",
    fruit: "#ff2d95",
    scanlines: null,
  },
};

// Desplazamiento de los ojos por dirección (constante: sin objetos por frame).
const EYE_FORWARD = 7;
const EYE_SIDE = 8;
const EYE_OFFSET: Record<Direction, [number, number, number, number]> = {
  // [fx, fy, sx, sy]
  right: [EYE_FORWARD, 0, 0, EYE_SIDE],
  left: [-EYE_FORWARD, 0, 0, EYE_SIDE],
  up: [0, -EYE_FORWARD, EYE_SIDE, 0],
  down: [0, EYE_FORWARD, EYE_SIDE, 0],
};

const NEON_BODY_GLOW = 8;
const NEON_HEAD_GLOW = 14;
const NEON_FRUIT_GLOW = 12;
const SCANLINE_SPACING = 3;

interface SkinRenderer {
  body(cell: Cell, color: string): void;
  head(cell: Cell, color: string): void;
  fruit(cx: number, cy: number, key: string, color: string): void;
}

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
  /** Cambia la skin y redibuja al instante, incluso en pausa. */
  setSkin(next: SerpienteSkin): void;
}

export interface SerpienteEngineOptions {
  initialSkin?: SerpienteSkin; // default "clasico"
}

export function createSerpienteEngine(
  canvas: HTMLCanvasElement,
  handlers: SerpienteHandlers,
  options?: SerpienteEngineOptions,
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
  let gameOver = false;
  let fruit: { cell: Cell; key: string } | null = null;
  let fruitsEaten = 0;
  let lastEmitted: SerpienteState | null = null;
  let skin: SerpienteSkin = options?.initialSkin ?? "clasico";

  // El juego no espera a la imagen: hasta que cargue (o si falla) la fruta
  // se dibuja como círculo de color.
  // Capas estáticas cacheadas (se regeneran solo en `setSkin`): damero y
  // scanlines. Se pintan con un único drawImage por frame.
  const boardLayer = document.createElement("canvas");
  boardLayer.width = SERPIENTE_WIDTH;
  boardLayer.height = SERPIENTE_HEIGHT;
  const boardCtx = boardLayer.getContext("2d");
  const scanlineLayer = document.createElement("canvas");
  scanlineLayer.width = SERPIENTE_WIDTH;
  scanlineLayer.height = SERPIENTE_HEIGHT;
  const scanlineCtx = scanlineLayer.getContext("2d");
  // Color de la fruta-fallback por clave (evita construir el string cada frame).
  const fallbackColors: Record<string, string> = {};

  const fruitImage = new Image();
  let fruitImageReady = false;
  fruitImage.onload = () => {
    fruitImageReady = true;
  };
  fruitImage.onerror = () => {
    fruitImageReady = false;
  };
  fruitImage.src = FRUIT_SPRITE_URL;

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

  function spawnFruit() {
    const occupied = new Set(snake.map((c) => c.y * COLS + c.x));
    const free: Cell[] = [];
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (!occupied.has(y * COLS + x)) free.push({ x, y });
      }
    }
    if (free.length === 0) {
      fruit = null;
      return;
    }
    const keys = Object.keys(SPRITE_ATLAS);
    fruit = {
      cell: free[Math.floor(Math.random() * free.length)],
      key: keys[Math.floor(Math.random() * keys.length)],
    };
  }

  function emitState() {
    const next: SerpienteState = {
      score,
      level,
      length: snake.length,
      paused,
    };
    const prev = lastEmitted;
    if (
      prev &&
      prev.score === next.score &&
      prev.level === next.level &&
      prev.length === next.length &&
      prev.paused === next.paused
    ) {
      return;
    }
    lastEmitted = next;
    handlers.onStateChange(next);
  }

  function renderStaticLayers() {
    const palette = SKIN_PALETTES[skin];
    if (boardCtx) {
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          boardCtx.fillStyle = (x + y) % 2 === 0 ? palette.bgA : palette.bgB;
          boardCtx.fillRect(x * CELL, y * CELL, CELL, CELL);
        }
      }
    }
    if (scanlineCtx) {
      scanlineCtx.clearRect(0, 0, SERPIENTE_WIDTH, SERPIENTE_HEIGHT);
      if (palette.scanlines) {
        scanlineCtx.fillStyle = palette.scanlines;
        for (let y = 0; y < SERPIENTE_HEIGHT; y += SCANLINE_SPACING) {
          scanlineCtx.fillRect(0, y, SERPIENTE_WIDTH, 1);
        }
      }
    }
  }

  function drawBoard() {
    g.drawImage(boardLayer, 0, 0);
  }

  function cellPath(cell: Cell) {
    const pad = 3;
    g.beginPath();
    g.roundRect(
      cell.x * CELL + pad,
      cell.y * CELL + pad,
      CELL - pad * 2,
      CELL - pad * 2,
      10,
    );
  }

  function roundedCell(cell: Cell, color: string) {
    g.fillStyle = color;
    cellPath(cell);
    g.fill();
  }

  function fruitCircle(cx: number, cy: number, color: string) {
    g.fillStyle = color;
    g.beginPath();
    g.arc(cx, cy, FRUIT_DRAW_HEIGHT / 2 - 2, 0, Math.PI * 2);
    g.fill();
  }

  function resetGlow() {
    g.shadowBlur = 0;
    g.shadowColor = "transparent";
  }

  // Un renderer por skin (mismo patrón que SKIN_RENDERERS de Bloques): el
  // trazo cambia por skin sin `if` dispersos por el código de dibujo.
  const SKIN_RENDERERS: Record<SerpienteSkin, SkinRenderer> = {
    clasico: {
      body: roundedCell,
      head: roundedCell,
      fruit(cx, cy, key) {
        const rect = SPRITE_ATLAS[key];
        if (fruitImageReady) {
          const dh = FRUIT_DRAW_HEIGHT;
          const dw = dh * (rect.w / rect.h);
          g.drawImage(
            fruitImage,
            rect.x,
            rect.y,
            rect.w,
            rect.h,
            cx - dw / 2,
            cy - dh / 2,
            dw,
            dh,
          );
          return;
        }
        let color = fallbackColors[key];
        if (!color) {
          let hash = 0;
          for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) % 360;
          color = fallbackColors[key] = `hsl(${hash}, 80%, 55%)`;
        }
        fruitCircle(cx, cy, color);
      },
    },
    retro: {
      body: roundedCell,
      head: roundedCell,
      fruit(cx, cy, _key, color) {
        // Fruta genérica en fósforo: círculo + rabito, mismo tamaño que el
        // fallback original.
        fruitCircle(cx, cy + 1, color);
        g.fillStyle = color;
        g.fillRect(cx - 1.5, cy - FRUIT_DRAW_HEIGHT / 2 - 1, 3, 6);
      },
    },
    neon: {
      body(cell, color) {
        g.globalAlpha = 0.25;
        roundedCell(cell, color);
        g.globalAlpha = 1;
        g.shadowColor = color;
        g.shadowBlur = NEON_BODY_GLOW;
        g.strokeStyle = color;
        g.lineWidth = 2;
        cellPath(cell);
        g.stroke();
        resetGlow();
      },
      head(cell, color) {
        g.shadowColor = color;
        g.shadowBlur = NEON_HEAD_GLOW;
        roundedCell(cell, color);
        resetGlow();
      },
      fruit(cx, cy, _key, color) {
        g.shadowColor = color;
        g.shadowBlur = NEON_FRUIT_GLOW;
        fruitCircle(cx, cy, color);
        resetGlow();
      },
    },
  };

  function drawHead(cell: Cell) {
    const palette = SKIN_PALETTES[skin];
    SKIN_RENDERERS[skin].head(cell, palette.head);
    const cx = cell.x * CELL + CELL / 2;
    const cy = cell.y * CELL + CELL / 2;
    // Ojos desplazados según la dirección de la cabeza.
    const off = EYE_OFFSET[direction];
    g.fillStyle = palette.eye;
    for (let sign = -1; sign <= 1; sign += 2) {
      g.beginPath();
      g.arc(
        cx + off[0] + off[2] * sign,
        cy + off[1] + off[3] * sign,
        3.5,
        0,
        Math.PI * 2,
      );
      g.fill();
    }
  }

  function drawFruit() {
    if (!fruit) return;
    const cx = fruit.cell.x * CELL + CELL / 2;
    const cy = fruit.cell.y * CELL + CELL / 2;
    const palette = SKIN_PALETTES[skin];
    SKIN_RENDERERS[skin].fruit(cx, cy, fruit.key, palette.fruit ?? "");
  }

  function drawSnake() {
    const palette = SKIN_PALETTES[skin];
    const renderer = SKIN_RENDERERS[skin];
    for (let i = snake.length - 1; i >= 1; i--) {
      renderer.body(snake[i], palette.body);
    }
    drawHead(snake[0]);
  }

  function drawScanlines() {
    if (!SKIN_PALETTES[skin].scanlines) return;
    g.drawImage(scanlineLayer, 0, 0);
  }

  function draw() {
    drawBoard();
    drawFruit();
    drawSnake();
    drawScanlines();
  }

  function step() {
    if (pendingDirection) {
      direction = pendingDirection;
      pendingDirection = null;
    }
    const v = DIRECTION_VECTOR[direction];
    const head = snake[0];
    const newHead = { x: head.x + v.x, y: head.y + v.y };
    const eats =
      fruit !== null &&
      newHead.x === fruit.cell.x &&
      newHead.y === fruit.cell.y;

    const hitsWall =
      newHead.x < 0 || newHead.x >= COLS || newHead.y < 0 || newHead.y >= ROWS;
    // Si no come, la cola se retira en este mismo tick: su celda queda libre.
    const bodyLen = eats ? snake.length : snake.length - 1;
    let hitsSelf = false;
    for (let i = 0; i < bodyLen; i++) {
      if (snake[i].x === newHead.x && snake[i].y === newHead.y) {
        hitsSelf = true;
        break;
      }
    }
    if (hitsWall || hitsSelf) {
      endGame();
      return;
    }

    snake.unshift(newHead);
    if (eats) {
      // Comer: la cola no se retira, la serpiente crece 1 segmento.
      score += POINTS_PER_FRUIT;
      fruitsEaten += 1;
      level = 1 + Math.floor(fruitsEaten / FRUITS_PER_LEVEL);
      spawnFruit();
    } else {
      snake.pop();
    }
    emitState();
    // Tablero lleno: la victoria se trata igual que la derrota.
    if (snake.length === COLS * ROWS) endGame();
  }

  function endGame() {
    if (gameOver) return;
    gameOver = true;
    moving = false;
    emitState();
    handlers.onGameOver(score);
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
    const next = KEY_TO_DIRECTION[e.key];
    if (!next) return;
    e.preventDefault();
    if (paused || gameOver) return;
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
    const delta = Math.min(now - lastTime, MAX_DT_MS);
    lastTime = now;
    if (moving && !paused) {
      accumulator += delta;
      const tick = tickDuration(level);
      // `moving` corta la ráfaga si un paso termina la partida.
      while (moving && accumulator >= tick) {
        accumulator -= tick;
        step();
      }
    }
    draw();
    rafId = requestAnimationFrame(loop);
  }

  resetSnake();
  spawnFruit();
  renderStaticLayers();

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
      level = 1;
      fruitsEaten = 0;
      gameOver = false;
      paused = false;
      resetSnake();
      spawnFruit();
      emitState();
    },
    setSkin(next: SerpienteSkin) {
      if (next === skin) return;
      skin = next;
      renderStaticLayers();
      // Redibuja ya: no depende de que el loop siga activo (pausa, fin).
      draw();
    },
  };
}
