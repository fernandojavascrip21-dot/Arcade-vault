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
const FRIGHT_SPEED = 90; // guardián vulnerable
const EYES_SPEED = 320; // ojos de vuelta a la base
const BASE_REVIVE_ROW = 9; // fila del interior donde reviven los ojos
const FRIGHT_MS = 7000; // duración de la cápsula en nivel 1
const FRIGHT_STEP_MS = 500; // menos por nivel superado
const FRIGHT_MIN_MS = 2000;
const FRIGHT_WARN_MS = 2000; // parpadeo de aviso al final
const WARN_BLINK_MS = 200;
const CAPSULE_BLINK_MS = 400;
const READY_MS = 1500; // todo quieto al aparecer
const DEATH_MS = 1000; // animación de muerte
const HIT_DISTANCE = 20; // px entre centros
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
const POINTS_GUARDIAN = [200, 400, 800, 1600]; // cadena dentro de una cápsula
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

export type LaberintoSkin = "clasico" | "retro" | "neon";

export const LABERINTO_SKINS: Array<{ id: LaberintoSkin; label: string }> = [
  { id: "clasico", label: "CLÁSICO" },
  { id: "retro", label: "RETRO" },
  { id: "neon", label: "NEÓN" },
];

export const LABERINTO_SKIN_STORAGE_KEY = "arcadevault.laberinto.skin.v1";

interface LaberintoPalette {
  bg: string;
  wall: string;
  dot: string;
  door: string;
  player: string;
  cazador: string;
  emboscador: string;
  flanqueador: string;
  errante: string;
  vulnerable: string;
  vulnerableWarn: string;
  eye: string;
  pupil: string;
}

// Todos los colores del juego, por skin. `clasico` conserva los valores
// con los que se implementó el spec 20. `retro` es fósforo verde: los cuatro
// guardianes se distinguen por intensidad (de más a menos brillante: cazador,
// emboscador, flanqueador, errante) y el vulnerable es el más apagado, con el
// aviso en blanco.
const SKIN_PALETTES: Record<LaberintoSkin, LaberintoPalette> = {
  clasico: {
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
  },
  retro: {
    bg: "#020a04",
    wall: "#177a31",
    dot: "#5fd37a",
    door: "#5fd37a",
    player: "#e0ffe8",
    cazador: "#9af5b2",
    emboscador: "#62dd82",
    flanqueador: "#3fbf63",
    errante: "#25a049",
    vulnerable: "#127a2e",
    vulnerableWarn: "#ffffff",
    eye: "#020a04",
    pupil: "#e0ffe8",
  },
  neon: {
    bg: "#05050a",
    wall: "#7c4dff",
    dot: "#ffe08a",
    door: "#ff9ad5",
    player: "#ffee00",
    cazador: "#ff2d95",
    emboscador: "#00f0ff",
    flanqueador: "#44ff55",
    errante: "#ff8a00",
    vulnerable: "#3a5bff",
    vulnerableWarn: "#ffffff",
    eye: "#ffffff",
    pupil: "#05050a",
  },
};

// Trazo por skin: glow (shadowBlur, 0 = ninguno) en paredes (capa en caché),
// puntos, jugador y cuerpo de guardianes, y scanlines (capa en caché).
interface SkinRenderer {
  glow: number;
  wallGlow: number;
  scanlines: boolean;
}

const SKIN_RENDERERS: Record<LaberintoSkin, SkinRenderer> = {
  clasico: { glow: 0, wallGlow: 0, scanlines: false },
  retro: { glow: 0, wallGlow: 0, scanlines: true },
  neon: { glow: 10, wallGlow: 8, scanlines: false },
};

const SCANLINE_COLOR = "rgba(0,0,0,.18)";
const SCANLINE_STEP = 3;

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
const MODE_VULNERABLE = 3; // cápsula activa: huye al azar y se le puede comer
const MODE_EYES = 4; // comido: solo ojos, de vuelta a la puerta
const MODE_ENTERING = 5; // ojos bajando por la puerta para revivir

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
  setSkin(skin: LaberintoSkin): void;
}

export function createLaberintoEngine(
  canvas: HTMLCanvasElement,
  handlers: LaberintoHandlers,
  options?: { initialSkin?: LaberintoSkin },
): LaberintoEngine {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");
  const g: CanvasRenderingContext2D = ctx;

  canvas.width = LABERINTO_WIDTH;
  canvas.height = LABERINTO_HEIGHT;

  let skin: LaberintoSkin = options?.initialSkin ?? "clasico";
  let palette = SKIN_PALETTES[skin];
  let renderer = SKIN_RENDERERS[skin];

  // Las paredes no cambian: se pintan una vez (y al cambiar de skin) y se
  // copian en cada frame.
  const wallLayer = document.createElement("canvas");
  wallLayer.width = LABERINTO_WIDTH;
  wallLayer.height = LABERINTO_HEIGHT;
  drawWallLayer();
  // Scanlines: capa en caché, creada la primera vez que una skin las usa.
  let scanlineLayer: HTMLCanvasElement | null = null;

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
  let frightMs = 0; // cuenta atrás de la cápsula activa
  let chain = 0; // guardianes comidos con la cápsula actual
  let blinkMs = 0; // reloj de los parpadeos (cápsulas y aviso)
  let readyMs = READY_MS; // cuenta atrás de la pausa de preparado
  let deathMs = 0; // cuenta atrás de la animación de muerte
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
    frightMs = 0;
    chain = 0;
    readyMs = READY_MS;
    deathMs = 0;
  }

  function emitState() {
    const prev = lastEmitted;
    if (
      prev &&
      prev.score === score &&
      prev.lives === lives &&
      prev.level === level &&
      prev.paused === paused
    ) {
      return;
    }
    // El objeto solo se crea cuando algo cambió.
    const next: LaberintoState = { score, lives, level, paused };
    lastEmitted = next;
    handlers.onStateChange(next);
  }

  // Solo el contorno: un trazo en cada lado de pared que da a un pasillo.
  function drawWallLayer() {
    const w = wallLayer.getContext("2d");
    if (!w) throw new Error("Canvas 2D no disponible");
    w.fillStyle = palette.bg;
    w.fillRect(0, 0, LABERINTO_WIDTH, LABERINTO_HEIGHT);
    w.lineWidth = WALL_WIDTH;
    w.lineCap = "round";
    w.strokeStyle = palette.wall;
    w.shadowColor = palette.wall;
    w.shadowBlur = renderer.wallGlow;
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

    w.strokeStyle = palette.door;
    w.shadowColor = palette.door;
    w.beginPath();
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (MAZE[row][col] !== "-") continue;
        w.moveTo(col * CELL, centerOf(row));
        w.lineTo(col * CELL + CELL, centerOf(row));
      }
    }
    w.stroke();
    w.shadowBlur = 0;
    w.shadowColor = "transparent";
  }

  function drawScanlines() {
    if (!renderer.scanlines) return;
    if (!scanlineLayer) {
      const layer = document.createElement("canvas");
      layer.width = LABERINTO_WIDTH;
      layer.height = LABERINTO_HEIGHT;
      const c = layer.getContext("2d");
      if (!c) throw new Error("Canvas 2D no disponible");
      c.fillStyle = SCANLINE_COLOR;
      for (let y = 0; y < LABERINTO_HEIGHT; y += SCANLINE_STEP) {
        c.fillRect(0, y, LABERINTO_WIDTH, 1);
      }
      scanlineLayer = layer;
    }
    g.drawImage(scanlineLayer, 0, 0);
  }

  function setGlow(color: string) {
    g.shadowColor = color;
    g.shadowBlur = renderer.glow;
  }

  function clearGlow() {
    g.shadowBlur = 0;
    g.shadowColor = "transparent";
  }

  function drawCells() {
    // Las cápsulas parpadean; los puntos no.
    const capsulesOn = Math.floor(blinkMs / CAPSULE_BLINK_MS) % 2 === 0;
    g.fillStyle = palette.dot;
    if (renderer.glow > 0) setGlow(palette.dot);
    g.beginPath();
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const kind = cells[row * COLS + col];
        if (kind === CELL_EMPTY) continue;
        if (kind === CELL_CAPSULE && !capsulesOn) continue;
        const x = centerOf(col);
        const y = centerOf(row);
        const radius = kind === CELL_DOT ? DOT_RADIUS : CAPSULE_RADIUS;
        g.moveTo(x + radius, y);
        g.arc(x, y, radius, 0, Math.PI * 2);
      }
    }
    g.fill();
    if (renderer.glow > 0) clearGlow();
  }

  function drawPlayer() {
    // La boca se abre y se cierra una vez por celda recorrida.
    const phase = (player.travelled % MOUTH_PERIOD) / MOUTH_PERIOD;
    const mouth = MOUTH_MAX * Math.abs(1 - 2 * phase);
    const angle = ANGLE[player.facing];
    // Al morir se encoge hasta desaparecer.
    const radius =
      deathMs > 0 ? (PLAYER_RADIUS * deathMs) / DEATH_MS : PLAYER_RADIUS;
    g.fillStyle = palette.player;
    if (renderer.glow > 0) setGlow(palette.player);
    g.beginPath();
    g.moveTo(player.x, player.y);
    g.arc(
      player.x,
      player.y,
      radius,
      angle + mouth,
      angle - mouth + Math.PI * 2,
    );
    g.closePath();
    g.fill();
    if (renderer.glow > 0) clearGlow();
  }

  function guardianColor(index: number): string {
    if (guardians[index].mode !== MODE_VULNERABLE) {
      return palette[GUARDIANS[index].id];
    }
    // En el aviso final alterna con blanco.
    const warning =
      frightMs < FRIGHT_WARN_MS &&
      Math.floor(frightMs / WARN_BLINK_MS) % 2 === 0;
    return warning ? palette.vulnerableWarn : palette.vulnerable;
  }

  function drawGuardian(guardian: Guardian, color: string) {
    const { x, y } = guardian;
    const r = GUARDIAN_RADIUS;
    const third = (r * 2) / 3;
    // Comido: solo quedan los ojos.
    if (guardian.mode !== MODE_EYES && guardian.mode !== MODE_ENTERING) {
      // Cúpula, costados rectos y falda en tres picos.
      g.fillStyle = color;
      if (renderer.glow > 0) setGlow(color);
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
      if (renderer.glow > 0) clearGlow();
    }

    // Los ojos miran hacia donde avanza.
    const lookX = guardian.dir === NONE ? 0 : DX[guardian.dir] * 2;
    const lookY = guardian.dir === NONE ? 0 : DY[guardian.dir] * 2;
    g.fillStyle = palette.eye;
    g.beginPath();
    g.arc(x - 5.5, y - 3, 4, 0, Math.PI * 2);
    g.arc(x + 5.5, y - 3, 4, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = palette.pupil;
    g.beginPath();
    g.arc(x - 5.5 + lookX, y - 3 + lookY, 2, 0, Math.PI * 2);
    g.arc(x + 5.5 + lookX, y - 3 + lookY, 2, 0, Math.PI * 2);
    g.fill();
  }

  function draw() {
    g.drawImage(wallLayer, 0, 0);
    drawCells();
    if (!gameOver) {
      // Tablero vacío bajo el modal de fin de partida.
      drawPlayer();
      // Durante la muerte los guardianes se ocultan.
      if (deathMs <= 0) {
        for (let i = 0; i < guardians.length; i++) {
          drawGuardian(guardians[i], guardianColor(i));
        }
      }
    }
    drawScanlines();
  }

  // Tablero vacío: bono, nivel siguiente y todo vuelve a su sitio.
  function nextLevel() {
    score += BONUS_LEVEL * level;
    level += 1;
    fillCells();
    resetPlayer();
    resetGuardians();
  }

  // Cápsula: los guardianes que están fuera de la base se vuelven vulnerables
  // e invierten el sentido. Otra cápsula reinicia la duración y la cadena.
  function startFright() {
    frightMs = Math.max(
      FRIGHT_MIN_MS,
      FRIGHT_MS - (level - 1) * FRIGHT_STEP_MS,
    );
    chain = 0;
    for (let i = 0; i < guardians.length; i++) {
      const guardian = guardians[i];
      if (guardian.mode !== MODE_NORMAL) continue;
      guardian.mode = MODE_VULNERABLE;
      if (guardian.dir !== NONE) guardian.dir = (guardian.dir + 2) % 4;
    }
  }

  function endFright() {
    frightMs = 0;
    for (let i = 0; i < guardians.length; i++) {
      if (guardians[i].mode === MODE_VULNERABLE) {
        guardians[i].mode = MODE_NORMAL;
      }
    }
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
    if (kind === CELL_CAPSULE) startFright();
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
    if (guardian.mode === MODE_EYES || guardian.mode === MODE_ENTERING) {
      return EYES_SPEED;
    }
    if (guardian.mode === MODE_VULNERABLE) return FRIGHT_SPEED;
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
    if (guardians[index].mode === MODE_EYES) {
      targetCol = BASE_EXIT_COL;
      targetRow = BASE_EXIT_ROW;
      return;
    }
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

  // Vulnerable: una salida libre al azar, sin invertir el sentido.
  function randomDirection(col: number, row: number, reverse: number): number {
    let exits = 0;
    for (let dir = 0; dir < 4; dir++) {
      if (dir !== reverse && isCorridor(col + DX[dir], row + DY[dir])) {
        exits += 1;
      }
    }
    if (exits === 0) return reverse;
    let pick = Math.floor(Math.random() * exits);
    for (let dir = 0; dir < 4; dir++) {
      if (dir === reverse || !isCorridor(col + DX[dir], row + DY[dir])) {
        continue;
      }
      if (pick === 0) return dir;
      pick -= 1;
    }
    return reverse;
  }

  // Entre las salidas libres elige la más cercana al objetivo (distancia
  // euclídea; el túnel no cuenta como atajo). Nunca invierte el sentido y,
  // en empate, gana el orden arriba, izquierda, abajo, derecha.
  function chooseDirection(index: number, col: number, row: number): number {
    const guardian = guardians[index];
    const reverse = guardian.dir === NONE ? NONE : (guardian.dir + 2) % 4;
    if (guardian.mode === MODE_VULNERABLE) {
      return randomDirection(col, row, reverse);
    }
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
    if (guardian.mode === MODE_ENTERING) {
      // Los ojos bajan por la puerta, reviven dentro y vuelven a salir.
      const reviveY = centerOf(BASE_REVIVE_ROW);
      guardian.y = Math.min(reviveY, guardian.y + remaining);
      if (guardian.y === reviveY) guardian.mode = MODE_LEAVING;
      return;
    }
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
        if (
          guardian.mode === MODE_EYES &&
          col === BASE_EXIT_COL &&
          row === BASE_EXIT_ROW
        ) {
          guardian.mode = MODE_ENTERING;
          guardian.dir = DOWN;
          return;
        }
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
    if (frightMs > 0) return; // el reloj de fases se detiene con la cápsula
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

  // Un guardián vulnerable se come (200, 400, 800, 1600 dentro de la misma
  // cápsula) y vuelve como ojos; uno normal mata. Devuelve true si mata.
  function hitByGuardian(): boolean {
    for (let i = 0; i < guardians.length; i++) {
      const guardian = guardians[i];
      if (guardian.mode !== MODE_NORMAL && guardian.mode !== MODE_VULNERABLE) {
        continue;
      }
      const dx = guardian.x - player.x;
      const dy = guardian.y - player.y;
      if (dx * dx + dy * dy >= HIT_DISTANCE * HIT_DISTANCE) continue;
      if (guardian.mode === MODE_NORMAL) return true;
      score += POINTS_GUARDIAN[Math.min(chain, POINTS_GUARDIAN.length - 1)];
      chain += 1;
      guardian.mode = MODE_EYES;
      emitState();
    }
    return false;
  }

  // Fin de la animación de muerte: una vida menos y, si quedan, todos a su
  // posición inicial (los puntos ya comidos no se reponen).
  function finishDeath() {
    lives -= 1;
    if (lives <= 0) {
      gameOver = true;
      emitState();
      handlers.onGameOver(score);
      return;
    }
    resetPlayer();
    resetGuardians();
    emitState();
  }

  function update(dt: number) {
    if (gameOver) return;
    if (deathMs > 0) {
      deathMs -= dt * 1000;
      if (deathMs <= 0) {
        deathMs = 0;
        finishDeath();
      }
      return;
    }
    if (readyMs > 0) {
      readyMs -= dt * 1000;
      return;
    }
    blinkMs += dt * 1000;
    const levelBefore = level;
    updatePlayer(dt);
    if (level !== levelBefore) return; // tablero nuevo: todos en su sitio
    if (frightMs > 0) {
      frightMs -= dt * 1000;
      if (frightMs <= 0) endFright();
    }
    spawnMs += dt * 1000;
    updatePhase(dt);
    for (let i = 0; i < guardians.length; i++) updateGuardian(i, dt);
    if (hitByGuardian()) deathMs = DEATH_MS;
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
    if (paused || gameOver || deathMs > 0) return;
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
    setSkin(next: LaberintoSkin) {
      if (next === skin) return;
      skin = next;
      palette = SKIN_PALETTES[skin];
      renderer = SKIN_RENDERERS[skin];
      drawWallLayer();
      draw(); // redibuja al instante, también en pausa
    },
  };
}
