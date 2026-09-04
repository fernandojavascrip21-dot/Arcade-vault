import type { ReactNode } from "react";

// Carátulas: ilustración pixel-art por juego, sobre el gradiente `thumb` del
// contenedor. viewBox 16:10 para encajar en el marco sin deformar.
function Frame({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 160 100"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      style={{ display: "block" }}
      shapeRendering="crispEdges"
    >
      <rect width="160" height="100" fill="rgba(4,4,10,0.42)" />
      {children}
    </svg>
  );
}

function Rompemuros() {
  const rows = [
    { y: 16, fill: "#ff2d6f" },
    { y: 26, fill: "#ffd23f" },
    { y: 36, fill: "#00f5ff" },
  ];
  return (
    <Frame>
      {rows.map((r) =>
        Array.from({ length: 8 }, (_, i) => (
          <rect
            key={`${r.y}-${i}`}
            x={5 + i * 19}
            y={r.y}
            width={16}
            height={7}
            fill={r.fill}
            opacity={0.92}
          />
        )),
      )}
      <rect x={66} y={84} width={30} height={5} fill="#00f5ff" />
      <rect x={90} y={70} width={5} height={5} fill="#ffffff" />
      <rect x={78} y={58} width={3} height={3} fill="#ffffff" opacity={0.6} />
    </Frame>
  );
}

function Serpiente() {
  const body = [
    [36, 60],
    [44, 60],
    [52, 60],
    [60, 60],
    [60, 52],
    [60, 44],
    [68, 44],
    [76, 44],
  ];
  return (
    <Frame>
      {Array.from({ length: 9 }, (_, i) => (
        <line
          key={`v${i}`}
          x1={16 + i * 16}
          y1={12}
          x2={16 + i * 16}
          y2={88}
          stroke="#00f5ff"
          strokeWidth={0.5}
          opacity={0.12}
        />
      ))}
      {body.map(([x, y], i) => (
        <rect
          key={`s${i}`}
          x={x}
          y={y}
          width={7}
          height={7}
          fill={i === body.length - 1 ? "#c8ffff" : "#00f5ff"}
          opacity={0.95}
        />
      ))}
      <rect x={100} y={44} width={7} height={7} fill="#ff2d6f" />
    </Frame>
  );
}

function Invasores() {
  const alien = (x: number, y: number, fill: string) => (
    <g key={`${x}-${y}`} fill={fill}>
      <rect x={x + 2} y={y} width={8} height={3} />
      <rect x={x} y={y + 3} width={12} height={4} />
      <rect x={x + 1} y={y + 7} width={3} height={2} />
      <rect x={x + 8} y={y + 7} width={3} height={2} />
      <rect x={x + 3} y={y + 4} width={2} height={2} fill="#0a0a0f" />
      <rect x={x + 7} y={y + 4} width={2} height={2} fill="#0a0a0f" />
    </g>
  );
  const cols = [12, 40, 68, 96, 124];
  const rows = [
    { y: 14, fill: "#f5ff00" },
    { y: 30, fill: "#c8e000" },
    { y: 46, fill: "#9aad00" },
  ];
  return (
    <Frame>
      {rows.flatMap((r) => cols.map((x) => alien(x, r.y, r.fill)))}
      <rect x={12} y={80} width={2} height={14} fill="#ffffff" opacity={0.8} />
      <rect x={72} y={84} width={16} height={6} fill="#00f5ff" />
      <rect x={78} y={80} width={4} height={4} fill="#00f5ff" />
    </Frame>
  );
}

function Asteroides() {
  return (
    <Frame>
      <polygon points="80,54 72,72 88,72" fill="#d6c4ff" />
      <polygon points="80,58 76,68 84,68" fill="#3a1b6b" />
      <polygon
        points="28,28 40,22 50,30 46,42 32,44 22,36"
        fill="rgba(155,92,255,0.35)"
        stroke="#c9b8ff"
        strokeWidth={1.5}
      />
      <polygon
        points="118,20 130,18 138,28 134,40 122,42 114,30"
        fill="rgba(155,92,255,0.3)"
        stroke="#c9b8ff"
        strokeWidth={1.5}
      />
      <polygon
        points="112,60 122,56 132,64 128,76 116,76 108,68"
        fill="rgba(155,92,255,0.3)"
        stroke="#c9b8ff"
        strokeWidth={1.5}
      />
      <rect x={79} y={40} width={2} height={5} fill="#ffffff" />
      <rect x={79} y={30} width={2} height={4} fill="#ffffff" opacity={0.6} />
    </Frame>
  );
}

function Bloques() {
  const b = (x: number, y: number, fill: string) => (
    <rect key={`${x}-${y}`} x={x} y={y} width={11} height={11} fill={fill} stroke="#0a0a0f" strokeWidth={1} />
  );
  return (
    <Frame>
      {b(52, 78, "#00ff9d")}
      {b(63, 78, "#00ff9d")}
      {b(74, 78, "#00ff9d")}
      {b(85, 78, "#00ff9d")}
      {b(96, 78, "#ffd23f")}
      {b(107, 78, "#ffd23f")}
      {b(52, 67, "#ff2d6f")}
      {b(96, 67, "#ffd23f")}
      {b(107, 67, "#ffd23f")}
      {b(63, 56, "#00f5ff")}
      {b(74, 56, "#00f5ff")}
      {b(85, 56, "#00f5ff")}
      {b(85, 45, "#00f5ff")}
      {b(96, 18, "#ff2d6f")}
      {b(107, 18, "#ff2d6f")}
      {b(107, 29, "#ff2d6f")}
      {b(118, 29, "#ff2d6f")}
    </Frame>
  );
}

function Laberinto() {
  const wall = (x: number, y: number, w: number, h: number) => (
    <rect
      key={`${x}-${y}-${w}`}
      x={x}
      y={y}
      width={w}
      height={h}
      rx={2}
      fill="none"
      stroke="#ff8a00"
      strokeWidth={2}
      opacity={0.85}
    />
  );
  return (
    <Frame>
      {wall(14, 14, 132, 72)}
      {wall(28, 28, 30, 18)}
      {wall(72, 28, 18, 44)}
      {wall(102, 28, 30, 18)}
      {wall(28, 58, 26, 14)}
      {Array.from({ length: 7 }, (_, i) => (
        <circle key={`d${i}`} cx={26 + i * 16} cy={80} r={1.6} fill="#ffd6a5" />
      ))}
      <path d="M46 78 a7 7 0 1 1 0 -0.1 L46 78 L38 74 Z" fill="#f5ff00" transform="translate(-4 2)" />
      <g transform="translate(96 50)">
        <path
          d="M0 12 V4 a8 8 0 0 1 16 0 V12 l-3 -3 -3 3 -2 -3 -3 3 Z"
          fill="#ff2d6f"
        />
        <circle cx={5} cy={5} r={2} fill="#fff" />
        <circle cx={12} cy={5} r={2} fill="#fff" />
      </g>
    </Frame>
  );
}

const COVERS: Record<string, () => ReactNode> = {
  rompemuros: Rompemuros,
  serpiente: Serpiente,
  invasores: Invasores,
  asteroides: Asteroides,
  bloques: Bloques,
  laberinto: Laberinto,
};

export function GameCover({ id }: { id: string }) {
  const Cover = COVERS[id];
  return Cover ? <Cover /> : null;
}
