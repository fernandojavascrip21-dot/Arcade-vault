const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;

const SPRITESHEET_URL = "/games/rompemuros/spritesheet-breakout.png";

const BRICK_W = 100;
const BRICK_H = 24;
const BRICK_GAP = 2;
const BRICK_MARGIN_TOP = 60;

const PARTICLE_COUNT = 7;
const PARTICLE_MIN_SIZE = 6;
const PARTICLE_MAX_SIZE = 10;
const PARTICLE_SPEED_MIN = 10;
const PARTICLE_SPEED_MAX = 14;
const PARTICLE_GRAVITY = 0.15;
const PARTICLE_LIFETIME = 600;

const FRAME_MS = 1000 / 60;
const MAX_FRAME_STEP = 2;

const SOUND_BOUNCE_URL = "/games/rompemuros/ball-bounce.mp3";
const SOUND_BREAK_URL = "/games/rompemuros/break-sound.mp3";

const MUTE_RECT = { x: 636, y: 12, w: 40, h: 32 };

const LEVEL_TRANSITION_DURATION = 1500;
const LEVEL_BALL_SPEED_STEP = 0.5;

const INITIAL_LIVES = 3;
const PADDLE_START_X = 340;
const PADDLE_START_Y = 560;
const BALL_START_X = 400;
const BALL_START_Y = 544;

type Difficulty = "easy" | "medium" | "hard";

const DIFFICULTIES: Record<
  Difficulty,
  { label: string; ballSpeed: number; scoreMultiplier: number }
> = {
  easy: { label: "FÁCIL", ballSpeed: 8.5, scoreMultiplier: 1 },
  medium: { label: "MEDIO", ballSpeed: 9.5, scoreMultiplier: 1 },
  hard: { label: "DIFÍCIL", ballSpeed: 11, scoreMultiplier: 1.5 },
};

const DIFFICULTY_OPTION_ORDER: Difficulty[] = ["easy", "medium", "hard"];
const DIFFICULTY_OPTION_W = 240;
const DIFFICULTY_OPTION_H = 60;
const DIFFICULTY_OPTION_GAP = 20;

type BrickColor = "hotpink" | "magenta" | "yellow" | "green" | "cyan" | "gray";

const BLOCK_POINTS: Record<BrickColor, number> = {
  hotpink: 50,
  magenta: 30,
  yellow: 30,
  green: 20,
  cyan: 20,
  gray: 10,
};

type LevelLayout = (BrickColor | null)[][];

const LEVELS: LevelLayout[] = [
  [
    [
      "hotpink",
      "hotpink",
      "hotpink",
      "hotpink",
      "hotpink",
      "hotpink",
      "hotpink",
      "hotpink",
    ],
    [
      "magenta",
      "magenta",
      "magenta",
      "magenta",
      "magenta",
      "magenta",
      "magenta",
      "magenta",
    ],
    [
      "yellow",
      "yellow",
      "yellow",
      "yellow",
      "yellow",
      "yellow",
      "yellow",
      "yellow",
    ],
  ],
  [
    [
      "hotpink",
      "hotpink",
      "hotpink",
      "hotpink",
      "hotpink",
      "hotpink",
      "hotpink",
      "hotpink",
    ],
    [
      "magenta",
      "magenta",
      "magenta",
      "magenta",
      "magenta",
      "magenta",
      "magenta",
      "magenta",
    ],
    [
      "yellow",
      "yellow",
      "yellow",
      "yellow",
      "yellow",
      "yellow",
      "yellow",
      "yellow",
    ],
    ["green", null, "green", null, "green", null, "green", null],
  ],
  [
    [null, null, null, "hotpink", "hotpink", null, null, null],
    [null, null, "magenta", "magenta", "magenta", "magenta", null, null],
    [null, "yellow", "yellow", "yellow", "yellow", "yellow", "yellow", null],
    [null, null, "green", "green", "green", "green", null, null],
    [null, null, null, "cyan", "cyan", null, null, null],
  ],
  [
    [
      "hotpink",
      "hotpink",
      "hotpink",
      "hotpink",
      "hotpink",
      "hotpink",
      "hotpink",
      "hotpink",
    ],
    ["magenta", null, null, null, null, null, null, "magenta"],
    ["yellow", null, null, null, null, null, null, "yellow"],
    ["green", null, null, null, null, null, null, "green"],
    ["cyan", null, null, null, null, null, null, "cyan"],
    ["gray", "gray", "gray", "gray", "gray", "gray", "gray", "gray"],
  ],
  [
    [
      "hotpink",
      "hotpink",
      "hotpink",
      "hotpink",
      "hotpink",
      "hotpink",
      "hotpink",
      "hotpink",
    ],
    [
      "magenta",
      "magenta",
      "magenta",
      "magenta",
      "magenta",
      "magenta",
      "magenta",
      "magenta",
    ],
    [
      "yellow",
      "yellow",
      "yellow",
      "yellow",
      "yellow",
      "yellow",
      "yellow",
      "yellow",
    ],
    ["green", "green", "green", "green", "green", "green", "green", "green"],
    ["cyan", "cyan", "cyan", "cyan", "cyan", "cyan", "cyan", "cyan"],
    ["gray", "gray", "gray", "gray", "gray", "gray", "gray", "gray"],
  ],
];

interface SpriteFrame {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

const SPRITES = {
  paddle: { sx: 32, sy: 112, sw: 162, sh: 14 },
  ball: { sx: 32, sy: 32, sw: 16, sh: 16 },
  blocks: {
    gray: { sx: 32, sy: 288, sw: 32, sh: 16 },
    yellow: { sx: 32, sy: 240, sw: 32, sh: 16 },
    cyan: { sx: 32, sy: 192, sw: 32, sh: 16 },
    magenta: { sx: 32, sy: 224, sw: 32, sh: 16 },
    hotpink: { sx: 32, sy: 256, sw: 32, sh: 16 },
    green: { sx: 32, sy: 208, sw: 32, sh: 16 },
  } satisfies Record<BrickColor, SpriteFrame>,
};

interface Brick {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BrickColor;
  points: number;
  alive: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  elapsed: number;
}

type Screen =
  "difficulty" | "start" | "playing" | "level-complete" | "gameover" | "win";

class LevelManager {
  private currentLevelValue = 1;

  get currentLevel(): number {
    return this.currentLevelValue;
  }

  get totalLevels(): number {
    return LEVELS.length;
  }

  get isFinalLevel(): boolean {
    return this.currentLevelValue === this.totalLevels;
  }

  createBricksForCurrentLevel(): Brick[] {
    const bricks: Brick[] = [];
    const layout = LEVELS[this.currentLevelValue - 1];
    for (let r = 0; r < layout.length; r++) {
      const row = layout[r];
      for (let c = 0; c < row.length; c++) {
        const color = row[c];
        if (color === null) continue;
        bricks.push({
          x: c * BRICK_W,
          y: BRICK_MARGIN_TOP + r * (BRICK_H + BRICK_GAP),
          w: BRICK_W,
          h: BRICK_H,
          color,
          points: BLOCK_POINTS[color],
          alive: true,
        });
      }
    }
    return bricks;
  }

  getSpeedForCurrentLevel(baseSpeed: number, speedStep: number): number {
    return baseSpeed + (this.currentLevelValue - 1) * speedStep;
  }

  advance() {
    this.currentLevelValue += 1;
  }

  reset() {
    this.currentLevelValue = 1;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getInitialBallVelocity(speed: number) {
  return { vx: speed * Math.SQRT1_2, vy: -speed * Math.SQRT1_2 };
}

function getDifficultyOptionRects() {
  const totalH =
    DIFFICULTY_OPTION_ORDER.length * DIFFICULTY_OPTION_H +
    (DIFFICULTY_OPTION_ORDER.length - 1) * DIFFICULTY_OPTION_GAP;
  const startY = GAME_HEIGHT / 2 - totalH / 2;
  return DIFFICULTY_OPTION_ORDER.map((key, i) => ({
    key,
    x: GAME_WIDTH / 2 - DIFFICULTY_OPTION_W / 2,
    y: startY + i * (DIFFICULTY_OPTION_H + DIFFICULTY_OPTION_GAP),
    w: DIFFICULTY_OPTION_W,
    h: DIFFICULTY_OPTION_H,
  }));
}

export interface RompemurosState {
  score: number;
  lives: number;
  level: number;
  paused: boolean;
}

export interface RompemurosHandlers {
  onStateChange: (state: RompemurosState) => void;
  onGameOver: (finalScore: number) => void;
}

export interface RompemurosEngine {
  start(): void;
  stop(): void;
  setPaused(paused: boolean): void;
  restart(): void;
}

export const ROMPEMUROS_WIDTH = GAME_WIDTH;
export const ROMPEMUROS_HEIGHT = GAME_HEIGHT;

const GAME_KEYS = [
  "ArrowLeft",
  "ArrowRight",
  "KeyA",
  "KeyD",
  "Space",
  "Escape",
  "KeyP",
];

export function createRompemurosEngine(
  canvas: HTMLCanvasElement,
  handlers: RompemurosHandlers,
): RompemurosEngine {
  const ctx2d = canvas.getContext("2d");
  if (!ctx2d) {
    throw new Error("No se pudo obtener el contexto 2D del canvas");
  }
  const ctx: CanvasRenderingContext2D = ctx2d;

  const levelManager = new LevelManager();

  let screen: Screen = "difficulty";
  let difficulty: Difficulty = "medium";
  let levelTransitionElapsed = 0;
  let score = 0;
  let lives = INITIAL_LIVES;
  let paused = false;
  let muted = false;
  let finished = false;
  const paddle = {
    x: PADDLE_START_X,
    y: PADDLE_START_Y,
    w: 120,
    h: 16,
    speed: 8,
  };
  const ball = {
    x: BALL_START_X,
    y: BALL_START_Y,
    vx: 0,
    vy: 0,
    speed: DIFFICULTIES.medium.ballSpeed,
    radius: 8,
    attached: true,
  };
  let bricks: Brick[] = [];
  let particles: Particle[] = [];

  const keys: Record<string, boolean> = {};

  const bounceSound = new Audio(SOUND_BOUNCE_URL);
  const breakSound = new Audio(SOUND_BREAK_URL);

  function playSound(sound: HTMLAudioElement) {
    if (muted) return;
    sound.currentTime = 0;
    sound.play().catch(() => {});
  }

  let spritesheet: HTMLImageElement | null = null;
  let stopped = false;
  let rafId: number | null = null;
  let lastTimestamp: number | null = null;

  let prevSnapshot: RompemurosState | null = null;

  function notifyStateChange() {
    const snapshot: RompemurosState = {
      score,
      lives,
      level: levelManager.currentLevel,
      paused,
    };
    if (
      prevSnapshot &&
      prevSnapshot.score === snapshot.score &&
      prevSnapshot.lives === snapshot.lives &&
      prevSnapshot.level === snapshot.level &&
      prevSnapshot.paused === snapshot.paused
    ) {
      return;
    }
    prevSnapshot = snapshot;
    handlers.onStateChange(snapshot);
  }

  function resetBall(speed: number) {
    Object.assign(ball, getInitialBallVelocity(speed));
    ball.speed = speed;
  }

  function currentBallSpeed(): number {
    return levelManager.getSpeedForCurrentLevel(
      DIFFICULTIES[difficulty].ballSpeed,
      LEVEL_BALL_SPEED_STEP,
    );
  }

  function initGame() {
    screen = "difficulty";
    levelManager.reset();
    score = 0;
    lives = INITIAL_LIVES;
    paused = false;
    finished = false;
    levelTransitionElapsed = 0;
    paddle.x = PADDLE_START_X;
    paddle.y = PADDLE_START_Y;
    ball.x = BALL_START_X;
    ball.y = BALL_START_Y;
    ball.attached = true;
    resetBall(DIFFICULTIES[difficulty].ballSpeed);
    bricks = levelManager.createBricksForCurrentLevel();
    particles = [];
    prevSnapshot = null;
    notifyStateChange();
  }

  function endGame(finalScreen: "gameover" | "win") {
    screen = finalScreen;
    finished = true;
    notifyStateChange();
    handlers.onGameOver(score);
  }

  function selectDifficulty(key: Difficulty) {
    if (screen !== "difficulty") return;
    difficulty = key;
    const speed = levelManager.getSpeedForCurrentLevel(
      DIFFICULTIES[key].ballSpeed,
      LEVEL_BALL_SPEED_STEP,
    );
    resetBall(speed);
    screen = "start";
  }

  function launchBall() {
    if (!ball.attached) return;
    if (screen !== "start" && screen !== "playing") return;
    ball.attached = false;
    if (screen === "start") screen = "playing";
  }

  function loseLife() {
    lives -= 1;
    paddle.x = PADDLE_START_X;
    ball.attached = true;
    resetBall(currentBallSpeed());
    if (lives <= 0) {
      endGame("gameover");
    } else {
      screen = "playing";
      notifyStateChange();
    }
  }

  function advanceLevel() {
    levelManager.advance();
    bricks = levelManager.createBricksForCurrentLevel();
    ball.attached = true;
    resetBall(currentBallSpeed());
    particles = [];
    screen = "playing";
    notifyStateChange();
  }

  function spawnParticles(brick: Brick) {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed =
        PARTICLE_SPEED_MIN +
        Math.random() * (PARTICLE_SPEED_MAX - PARTICLE_SPEED_MIN);
      particles.push({
        x: brick.x + Math.random() * brick.w,
        y: brick.y + Math.random() * brick.h,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size:
          PARTICLE_MIN_SIZE +
          Math.random() * (PARTICLE_MAX_SIZE - PARTICLE_MIN_SIZE),
        color: brick.color,
        elapsed: 0,
      });
    }
  }

  function checkBrickCollision() {
    for (const brick of bricks) {
      if (!brick.alive) continue;

      const closestX = clamp(ball.x, brick.x, brick.x + brick.w);
      const closestY = clamp(ball.y, brick.y, brick.y + brick.h);
      const dx = ball.x - closestX;
      const dy = ball.y - closestY;

      if (dx * dx + dy * dy > ball.radius * ball.radius) continue;

      brick.alive = false;
      score += Math.round(
        brick.points * DIFFICULTIES[difficulty].scoreMultiplier,
      );
      playSound(breakSound);
      spawnParticles(brick);

      const overlapX = ball.radius - Math.abs(dx);
      const overlapY = ball.radius - Math.abs(dy);
      if (overlapX < overlapY) {
        ball.vx = -ball.vx;
      } else {
        ball.vy = -ball.vy;
      }

      notifyStateChange();

      if (bricks.every((bk) => !bk.alive)) {
        if (!levelManager.isFinalLevel) {
          screen = "level-complete";
          levelTransitionElapsed = 0;
        } else {
          endGame("win");
        }
      }
      break;
    }
  }

  function updatePaddle(step: number) {
    if (keys.ArrowLeft || keys.KeyA) paddle.x -= paddle.speed * step;
    if (keys.ArrowRight || keys.KeyD) paddle.x += paddle.speed * step;
    paddle.x = clamp(paddle.x, 0, GAME_WIDTH - paddle.w);
  }

  function updateBall(step: number) {
    if (ball.attached) {
      ball.x = paddle.x + paddle.w / 2;
      ball.y = paddle.y - ball.radius * 2;
      return;
    }

    ball.x += ball.vx * step;
    ball.y += ball.vy * step;

    if (ball.x - ball.radius <= 0) {
      ball.x = ball.radius;
      ball.vx = Math.abs(ball.vx);
      playSound(bounceSound);
    } else if (ball.x + ball.radius >= GAME_WIDTH) {
      ball.x = GAME_WIDTH - ball.radius;
      ball.vx = -Math.abs(ball.vx);
      playSound(bounceSound);
    }

    if (ball.y - ball.radius <= 0) {
      ball.y = ball.radius;
      ball.vy = Math.abs(ball.vy);
      playSound(bounceSound);
    }

    const hitsPaddle =
      ball.vy > 0 &&
      ball.y + ball.radius >= paddle.y &&
      ball.y - ball.radius <= paddle.y + paddle.h &&
      ball.x + ball.radius >= paddle.x &&
      ball.x - ball.radius <= paddle.x + paddle.w;
    if (hitsPaddle) {
      const hitPos = clamp(
        (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2),
        -1,
        1,
      );
      const angle = hitPos * (Math.PI / 3);
      ball.vx = ball.speed * Math.sin(angle);
      ball.vy = -ball.speed * Math.cos(angle);
      ball.y = paddle.y - ball.radius;
      playSound(bounceSound);
    }

    checkBrickCollision();
    if (finished) return;

    if (ball.y - ball.radius > GAME_HEIGHT) {
      loseLife();
    }
  }

  function updateParticles(dt: number, step: number) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i];
      particle.vy += PARTICLE_GRAVITY * step;
      particle.x += particle.vx * step;
      particle.y += particle.vy * step;
      particle.elapsed += dt;
      if (particle.elapsed >= PARTICLE_LIFETIME) {
        particles.splice(i, 1);
      }
    }
  }

  function drawSprite(
    frame: SpriteFrame,
    x: number,
    y: number,
    w: number,
    h: number,
  ) {
    if (!spritesheet) return;
    ctx.drawImage(
      spritesheet,
      frame.sx,
      frame.sy,
      frame.sw,
      frame.sh,
      x,
      y,
      w,
      h,
    );
  }

  function drawBricks() {
    for (const brick of bricks) {
      if (!brick.alive) continue;
      drawSprite(
        SPRITES.blocks[brick.color],
        brick.x,
        brick.y,
        brick.w,
        brick.h,
      );
    }
  }

  function drawParticles() {
    for (const particle of particles) {
      ctx.globalAlpha = 1 - particle.elapsed / PARTICLE_LIFETIME;
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    }
    ctx.globalAlpha = 1;
  }

  const HUD_LIFE_RADIUS = 8;
  const HUD_LIFE_GAP = 24;

  function drawMuteButton() {
    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    ctx.fillRect(MUTE_RECT.x, MUTE_RECT.y, MUTE_RECT.w, MUTE_RECT.h);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "20px sans-serif";
    ctx.fillText(
      muted ? "🔇" : "🔊",
      MUTE_RECT.x + MUTE_RECT.w / 2,
      MUTE_RECT.y + MUTE_RECT.h / 2 + 7,
    );
    ctx.textAlign = "left";
  }

  function drawHUD() {
    ctx.fillStyle = "#fff";
    ctx.textAlign = "left";
    ctx.font = "bold 22px sans-serif";
    ctx.fillText(`Score: ${score}`, 12, 36);

    drawMuteButton();

    const startX = GAME_WIDTH - 12 - HUD_LIFE_RADIUS;
    for (let i = 0; i < lives; i++) {
      const cx = startX - i * HUD_LIFE_GAP;
      drawSprite(
        SPRITES.ball,
        cx - HUD_LIFE_RADIUS,
        36 - HUD_LIFE_RADIUS * 2,
        HUD_LIFE_RADIUS * 2,
        HUD_LIFE_RADIUS * 2,
      );
    }
  }

  function drawDifficultyScreen() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "bold 40px sans-serif";
    ctx.fillText("ELEGÍ LA DIFICULTAD", GAME_WIDTH / 2, GAME_HEIGHT / 2 - 160);

    for (const rect of getDifficultyOptionRects()) {
      const isSelected = rect.key === difficulty;
      ctx.fillStyle = isSelected ? "#fff" : "rgba(255, 255, 255, 0.15)";
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.fillStyle = isSelected ? "#000" : "#fff";
      ctx.font = "bold 24px sans-serif";
      ctx.fillText(
        DIFFICULTIES[rect.key].label,
        rect.x + rect.w / 2,
        rect.y + rect.h / 2 + 8,
      );
    }

    ctx.fillStyle = "#fff";
    ctx.font = "18px sans-serif";
    ctx.fillText(
      "Presioná 1, 2 o 3, o hacé click en una opción",
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 + 170,
    );
  }

  function draw() {
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    drawBricks();
    drawSprite(SPRITES.paddle, paddle.x, paddle.y, paddle.w, paddle.h);
    drawSprite(
      SPRITES.ball,
      ball.x - ball.radius,
      ball.y - ball.radius,
      ball.radius * 2,
      ball.radius * 2,
    );
    drawParticles();
    drawHUD();

    if (screen === "start") {
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.font = "bold 48px sans-serif";
      ctx.fillText("ARKANOID", GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20);
      ctx.font = "20px sans-serif";
      ctx.fillText("Presiona para jugar", GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20);
    }

    if (screen === "level-complete") {
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.font = "bold 40px sans-serif";
      ctx.fillText(
        `Nivel ${levelManager.currentLevel} completado`,
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 - 10,
      );
      ctx.font = "20px sans-serif";
      ctx.fillText(`Puntaje: ${score}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30);
    }

    if (screen === "difficulty") {
      drawDifficultyScreen();
    }

    if (paused) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.font = "bold 48px sans-serif";
      ctx.fillText("PAUSADO", GAME_WIDTH / 2, GAME_HEIGHT / 2);
    }
  }

  function setPausedInternal(next: boolean) {
    if (finished || next === paused) return;
    paused = next;
    notifyStateChange();
  }

  function pointerToCanvas(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / GAME_WIDTH, rect.height / GAME_HEIGHT);
    const offsetX = (rect.width - GAME_WIDTH * scale) / 2;
    const offsetY = (rect.height - GAME_HEIGHT * scale) / 2;
    return {
      x: (e.clientX - rect.left - offsetX) / scale,
      y: (e.clientY - rect.top - offsetY) / scale,
    };
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (GAME_KEYS.includes(e.code)) e.preventDefault();
    keys[e.code] = true;

    if (finished) return;

    if (e.code === "Escape" || e.code === "KeyP") {
      if (paused) setPausedInternal(false);
      else if (screen === "playing") setPausedInternal(true);
      return;
    }

    if (paused) return;

    if (screen === "difficulty") {
      if (e.code === "Digit1") selectDifficulty("easy");
      if (e.code === "Digit2") selectDifficulty("medium");
      if (e.code === "Digit3") selectDifficulty("hard");
    }
    if (e.code === "Space") launchBall();
  }

  function handleKeyUp(e: KeyboardEvent) {
    keys[e.code] = false;
  }

  function handleMouseMove(e: MouseEvent) {
    if (paused || finished) return;
    const { x } = pointerToCanvas(e);
    paddle.x = clamp(x - paddle.w / 2, 0, GAME_WIDTH - paddle.w);
  }

  function handleClick(e: MouseEvent) {
    if (finished) return;
    const pointer = pointerToCanvas(e);
    if (
      pointer.x >= MUTE_RECT.x &&
      pointer.x <= MUTE_RECT.x + MUTE_RECT.w &&
      pointer.y >= MUTE_RECT.y &&
      pointer.y <= MUTE_RECT.y + MUTE_RECT.h
    ) {
      muted = !muted;
      return;
    }
    if (paused) return;
    if (screen === "difficulty") {
      const { x, y } = pointerToCanvas(e);
      const option = getDifficultyOptionRects().find(
        (r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h,
      );
      if (option) selectDifficulty(option.key);
      return;
    }
    launchBall();
  }

  function loop(ts: number) {
    rafId = null;
    const dt = lastTimestamp === null ? 0 : ts - lastTimestamp;
    lastTimestamp = ts;
    const step = Math.min(dt / FRAME_MS, MAX_FRAME_STEP);

    if (!paused) {
      updatePaddle(step);
      if (screen !== "level-complete") updateBall(step);
      updateParticles(dt, step);

      if (screen === "level-complete") {
        levelTransitionElapsed += dt;
        if (levelTransitionElapsed >= LEVEL_TRANSITION_DURATION) {
          advanceLevel();
        }
      }
    }

    draw();
    if (finished || stopped) return;
    rafId = requestAnimationFrame(loop);
  }

  function startLoop() {
    if (stopped || !spritesheet || rafId !== null) return;
    lastTimestamp = null;
    rafId = requestAnimationFrame(loop);
  }

  function cancelLoop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  return {
    start() {
      stopped = false;
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
      canvas.addEventListener("mousemove", handleMouseMove);
      canvas.addEventListener("click", handleClick);
      initGame();

      const image = new Image();
      image.onload = () => {
        if (stopped) return;
        spritesheet = image;
        draw();
        startLoop();
      };
      image.onerror = () => console.error("No se pudo cargar el spritesheet");
      image.src = SPRITESHEET_URL;
    },
    stop() {
      stopped = true;
      cancelLoop();
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("click", handleClick);
    },
    setPaused(next: boolean) {
      setPausedInternal(next);
    },
    restart() {
      cancelLoop();
      initGame();
      draw();
      startLoop();
    },
  };
}
