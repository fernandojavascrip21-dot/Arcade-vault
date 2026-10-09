export const LABERINTO_WIDTH = 1280;
export const LABERINTO_HEIGHT = 800;

export const COLS = 32;
export const ROWS = 20;
export const CELL = 40; // 32 * 40 = 1280, 20 * 40 = 800

// # pared · . punto · o cápsula · espacio pasillo sin punto
// - puerta de la base · G interior de la base
export const MAZE = [
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

export const PALETTE = {
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

export interface LaberintoState {
  score: number;
  lives: number;
  level: number;
  paused: boolean;
}

export interface LaberintoHandlers {
  onStateChange(state: LaberintoState): void;
  onGameOver(finalScore: number): void;
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
  const ctx = canvas.getContext("2d")!;
  
  // Offscreen canvas for walls (performance optimization)
  const bgCanvas = document.createElement("canvas");
  bgCanvas.width = LABERINTO_WIDTH;
  bgCanvas.height = LABERINTO_HEIGHT;
  const bgCtx = bgCanvas.getContext("2d")!;
  
  let animationFrameId: number;
  let isRunning = false;
  
  // Pre-draw walls
  function drawBackground() {
    bgCtx.fillStyle = PALETTE.bg;
    bgCtx.fillRect(0, 0, LABERINTO_WIDTH, LABERINTO_HEIGHT);
    
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const char = MAZE[r][c];
        if (char === "#") {
          bgCtx.strokeStyle = PALETTE.wall;
          bgCtx.lineWidth = 2;
          bgCtx.strokeRect(c * CELL + 2, r * CELL + 2, CELL - 4, CELL - 4);
        } else if (char === "-") {
          bgCtx.strokeStyle = PALETTE.door;
          bgCtx.lineWidth = 2;
          bgCtx.beginPath();
          bgCtx.moveTo(c * CELL, r * CELL + CELL / 2);
          bgCtx.lineTo((c + 1) * CELL, r * CELL + CELL / 2);
          bgCtx.stroke();
        }
      }
    }
  }
  
  drawBackground();
  
  function render() {
    // 1. Draw static background (walls)
    ctx.drawImage(bgCanvas, 0, 0);
    
    // 2. Draw dots and capsules (mock for Step 1)
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const char = MAZE[r][c];
        if (char === ".") {
          ctx.fillStyle = PALETTE.dot;
          ctx.beginPath();
          ctx.arc(c * CELL + CELL / 2, r * CELL + CELL / 2, 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (char === "o") {
          ctx.fillStyle = PALETTE.dot;
          ctx.beginPath();
          ctx.arc(c * CELL + CELL / 2, r * CELL + CELL / 2, 8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
  
  function loop(time: number) {
    if (!isRunning) return;
    render();
    animationFrameId = requestAnimationFrame(loop);
  }

  return {
    start() {
      if (isRunning) return;
      isRunning = true;
      animationFrameId = requestAnimationFrame(loop);
    },
    stop() {
      isRunning = false;
      cancelAnimationFrame(animationFrameId);
    },
    setPaused(paused: boolean) {
      // Stub for Step 1
    },
    restart() {
      // Stub for Step 1
    },
  };
}
