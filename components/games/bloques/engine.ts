// Puerto a TypeScript del modo Clásico de
// references/started-games/03-tetris/game.js. Misma mecánica que el original
// (tablero 10x20, las 7 piezas, wall kicks, ghost piece, hard/soft drop,
// puntuación y progresión de nivel/velocidad).
// Diferencias deliberadas respecto al original, ver specs/08-juego-tetris-real.md:
// - Sin selector de modo ni Modo Desafío (basura, obstáculos, retraso de
//   bloqueo, rotación invertida): arranca directamente en modo Clásico.
// - El panel HUD original (SCORE/LINES/LEVEL/NEXT) se conserva, pero se
//   dibuja dentro del mismo canvas en un panel lateral (sin DOM aparte).
// - Sin tecla P interna ni overlays de pausa/game over propios: la pausa la
//   controla setPaused(paused) y el fin de partida onGameOver(finalScore).

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const BOARD_WIDTH = COLS * BLOCK; // 300
const BOARD_HEIGHT = ROWS * BLOCK; // 600
const PANEL_WIDTH = 160;
const PANEL_X = BOARD_WIDTH;

const GAME_WIDTH = BOARD_WIDTH + PANEL_WIDTH; // 460
const GAME_HEIGHT = BOARD_HEIGHT; // 600

// Paleta fiel a references/started-games/03-tetris/style.css (tema oscuro, único soportado).
const BG = "#0f0f17";
const SURFACE = "#1a1a25";
const BORDER = "#2a2a3a";
const GRID = "#22222e";
const HIGHLIGHT = "rgba(255,255,255,0.12)";
const MUTED_LABEL = "#555570";
const ACCENT = "#7aa2f7";

const COLORS: Array<string | null> = [
  null,
  "#4dd0e1", // I - cyan
  "#ffd54f", // O - yellow
  "#ba68c8", // T - purple
  "#81c784", // S - green
  "#e57373", // Z - red
  "#90caf9", // J - azul pálido
  "#ffb74d", // L - orange
];

const PIECES: Array<number[][] | null> = [
  null,
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
];

const LINE_SCORES = [0, 100, 300, 500, 800];

interface Piece {
  type: number;
  shape: number[][];
  x: number;
  y: number;
}

type Board = number[][];

export interface BloquesState {
  score: number;
  lines: number;
  level: number;
}

export interface BloquesHandlers {
  onStateChange: (state: BloquesState) => void;
  onGameOver: (finalScore: number) => void;
}

export interface BloquesEngine {
  start(): void;
  stop(): void;
  setPaused(paused: boolean): void;
  restart(): void;
}

export const BLOQUES_WIDTH = GAME_WIDTH;
export const BLOQUES_HEIGHT = GAME_HEIGHT;

const GAME_KEYS = [
  "ArrowLeft",
  "ArrowRight",
  "ArrowDown",
  "ArrowUp",
  "KeyX",
  "Space",
];

export function createBloquesEngine(
  canvas: HTMLCanvasElement,
  handlers: BloquesHandlers,
): BloquesEngine {
  const ctx2d = canvas.getContext("2d");
  if (!ctx2d) {
    throw new Error("No se pudo obtener el contexto 2D del canvas");
  }
  const ctx: CanvasRenderingContext2D = ctx2d;

  let board: Board;
  let current: Piece;
  let next: Piece;
  let score: number;
  let lines: number;
  let level: number;
  let dropInterval: number;
  let dropAccum: number;
  let gameOver: boolean;

  let prevSnapshot: BloquesState | null = null;

  function notifyStateChange() {
    const snapshot: BloquesState = { score, lines, level };
    if (
      prevSnapshot &&
      prevSnapshot.score === snapshot.score &&
      prevSnapshot.lines === snapshot.lines &&
      prevSnapshot.level === snapshot.level
    ) {
      return;
    }
    prevSnapshot = snapshot;
    handlers.onStateChange(snapshot);
  }

  function createBoard(): Board {
    return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
  }

  function randomPiece(): Piece {
    const type = Math.floor(Math.random() * 7) + 1;
    const template = PIECES[type];
    if (!template) throw new Error("Pieza inválida");
    const shape = template.map((row) => [...row]);
    return {
      type,
      shape,
      x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
      y: 0,
    };
  }

  function collide(shape: number[][], ox: number, oy: number): boolean {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const nx = ox + c;
        const ny = oy + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && board[ny][nx]) return true;
      }
    }
    return false;
  }

  function rotateCW(shape: number[][]): number[][] {
    const rows = shape.length;
    const cols = shape[0].length;
    const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
    return result;
  }

  function tryRotate() {
    const rotated = rotateCW(current.shape);
    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
      if (!collide(rotated, current.x + kick, current.y)) {
        current.shape = rotated;
        current.x += kick;
        return;
      }
    }
  }

  function merge() {
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c])
          board[current.y + r][current.x + c] = current.shape[r][c];
  }

  function clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every((v) => v !== 0)) {
        board.splice(r, 1);
        board.unshift(new Array(COLS).fill(0));
        cleared++;
        r++;
      }
    }
    if (cleared) {
      lines += cleared;
      score += (LINE_SCORES[cleared] || 0) * level;
      level = Math.floor(lines / 10) + 1;
      dropInterval = Math.max(100, 1000 - (level - 1) * 90);
      notifyStateChange();
    }
  }

  function ghostY(): number {
    let gy = current.y;
    while (!collide(current.shape, current.x, gy + 1)) gy++;
    return gy;
  }

  function hardDrop() {
    const gy = ghostY();
    score += (gy - current.y) * 2;
    current.y = gy;
    lockPiece();
    notifyStateChange();
  }

  function softDrop() {
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
      score += 1;
      notifyStateChange();
    } else {
      lockPiece();
      notifyStateChange();
    }
  }

  function lockPiece() {
    merge();
    clearLines();
    spawn();
  }

  function spawn() {
    current = next;
    next = randomPiece();
    if (collide(current.shape, current.x, current.y)) {
      endGame();
    }
  }

  function endGame() {
    gameOver = true;
    handlers.onGameOver(score);
  }

  function drawBlock(
    px: number,
    py: number,
    colorIndex: number,
    size: number,
    alpha = 1,
  ) {
    if (!colorIndex) return;
    const color = COLORS[colorIndex];
    if (!color) return;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(px + 1, py + 1, size - 2, size - 2);
    ctx.fillStyle = HIGHLIGHT;
    ctx.fillRect(px + 1, py + 1, size - 2, 4);
    ctx.globalAlpha = 1;
  }

  function drawGrid() {
    ctx.strokeStyle = GRID;
    ctx.lineWidth = 0.5;
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * BLOCK, 0);
      ctx.lineTo(c * BLOCK, BOARD_HEIGHT);
      ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * BLOCK);
      ctx.lineTo(BOARD_WIDTH, r * BLOCK);
      ctx.stroke();
    }
  }

  function drawNextPreview(offsetX: number, offsetY: number, boxSize: number) {
    const nb = boxSize / 4;
    const shape = next.shape;
    const offX = Math.floor((4 - shape[0].length) / 2);
    const offY = Math.floor((4 - shape.length) / 2);
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++)
        drawBlock(
          offsetX + (offX + c) * nb,
          offsetY + (offY + r) * nb,
          shape[r][c],
          nb,
        );
  }

  function drawLabelValue(
    label: string,
    value: string,
    labelY: number,
    valueY: number,
  ) {
    ctx.textAlign = "left";
    ctx.fillStyle = MUTED_LABEL;
    ctx.font = "11px monospace";
    ctx.fillText(label, PANEL_X + 16, labelY);
    ctx.fillStyle = ACCENT;
    ctx.font = "bold 22px 'Courier New', monospace";
    ctx.fillText(value, PANEL_X + 16, valueY);
  }

  function drawPanel() {
    ctx.fillStyle = SURFACE;
    ctx.fillRect(PANEL_X, 0, PANEL_WIDTH, GAME_HEIGHT);
    ctx.strokeStyle = BORDER;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PANEL_X + 0.5, 0);
    ctx.lineTo(PANEL_X + 0.5, GAME_HEIGHT);
    ctx.stroke();

    drawLabelValue("SCORE", score.toLocaleString(), 28, 54);
    drawLabelValue("LINES", String(lines), 94, 120);
    drawLabelValue("LEVEL", String(level), 160, 186);

    ctx.textAlign = "left";
    ctx.fillStyle = MUTED_LABEL;
    ctx.font = "11px monospace";
    ctx.fillText("NEXT", PANEL_X + 16, 222);

    const boxX = PANEL_X + 16;
    const boxY = 234;
    const boxSize = 128;
    ctx.strokeStyle = BORDER;
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX, boxY, boxSize, boxSize);
    drawNextPreview(boxX, boxY, boxSize);
  }

  function draw() {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.fillStyle = SURFACE;
    ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);

    drawGrid();

    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        drawBlock(c * BLOCK, r * BLOCK, board[r][c], BLOCK);

    const gy = ghostY();
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c])
          drawBlock(
            (current.x + c) * BLOCK,
            (gy + r) * BLOCK,
            current.shape[r][c],
            BLOCK,
            0.2,
          );

    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        drawBlock(
          (current.x + c) * BLOCK,
          (current.y + r) * BLOCK,
          current.shape[r][c],
          BLOCK,
        );

    drawPanel();
  }

  function initGame() {
    board = createBoard();
    score = 0;
    lines = 0;
    level = 1;
    dropInterval = 1000;
    dropAccum = 0;
    gameOver = false;
    prevSnapshot = null;
    next = randomPiece();
    spawn();
    notifyStateChange();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (paused || gameOver) return;
    switch (e.code) {
      case "ArrowLeft":
        if (!collide(current.shape, current.x - 1, current.y)) current.x--;
        break;
      case "ArrowRight":
        if (!collide(current.shape, current.x + 1, current.y)) current.x++;
        break;
      case "ArrowDown":
        softDrop();
        break;
      case "ArrowUp":
      case "KeyX":
        tryRotate();
        break;
      case "Space":
        hardDrop();
        break;
      default:
        return;
    }
    if (GAME_KEYS.includes(e.code)) e.preventDefault();
    notifyStateChange();
  }

  let rafId: number | null = null;
  let lastTime: number | null = null;
  let paused = false;

  function loop(ts: number) {
    if (lastTime === null) lastTime = ts;
    const dt = ts - lastTime;
    lastTime = ts;
    dropAccum += dt;

    if (dropAccum >= dropInterval) {
      dropAccum = 0;
      if (!collide(current.shape, current.x, current.y + 1)) {
        current.y++;
      } else {
        lockPiece();
        notifyStateChange();
      }
    }

    draw();
    if (gameOver) return;
    rafId = requestAnimationFrame(loop);
  }

  return {
    start() {
      window.addEventListener("keydown", handleKeyDown);
      paused = false;
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
    },
    setPaused(next: boolean) {
      if (next === paused) return;
      paused = next;
      if (paused) {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      } else if (!gameOver) {
        lastTime = null;
        rafId = requestAnimationFrame(loop);
      }
    },
    restart() {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      paused = false;
      initGame();
      draw();
      lastTime = null;
      rafId = requestAnimationFrame(loop);
    },
  };
}
