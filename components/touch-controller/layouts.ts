// Mapeo del control táctil por juego (spec 13). Datos puros, sin React: cada
// pieza del "Arcade Universal Controller" emite las mismas teclas que ya
// escucha el motor del juego.

export type KeyCode =
  "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight" | "Space" | "KeyB";

export type DpadDirection = "up" | "down" | "left" | "right";

export type ActionIcon = "fire" | "bomb" | "rotate" | "drop" | "launch";

export type TouchAction = {
  id: string;
  label: string;
  code: KeyCode;
  icon: ActionIcon;
};

export type TouchLayout = {
  // Direcciones ausentes = inactivas (se pintan atenuadas y no emiten nada).
  dpad?: Partial<Record<DpadDirection, KeyCode>>;
  // Autorepeat DAS/ARR para las teclas indicadas mientras se mantienen.
  repeat?: { delayMs: number; intervalMs: number; codes: KeyCode[] };
  paddleSlider?: boolean;
  actions: TouchAction[];
};

export type TouchGameId =
  | "asteroides"
  | "bloques"
  | "rompemuros"
  | "serpiente"
  | "bombardero"
  | "rana";

export const TOUCH_LAYOUTS: Record<TouchGameId, TouchLayout> = {
  asteroides: {
    dpad: { left: "ArrowLeft", right: "ArrowRight", up: "ArrowUp" },
    actions: [
      { id: "fire", label: "DISPARO", code: "Space", icon: "fire" },
      { id: "bomb", label: "BOMBA", code: "KeyB", icon: "bomb" },
    ],
  },
  bloques: {
    dpad: { left: "ArrowLeft", right: "ArrowRight", down: "ArrowDown" },
    repeat: {
      delayMs: 170,
      intervalMs: 50,
      codes: ["ArrowLeft", "ArrowRight", "ArrowDown"],
    },
    actions: [
      { id: "rotate", label: "ROTAR", code: "ArrowUp", icon: "rotate" },
      { id: "drop", label: "CAÍDA", code: "Space", icon: "drop" },
    ],
  },
  rompemuros: {
    paddleSlider: true,
    actions: [{ id: "launch", label: "LANZAR", code: "Space", icon: "launch" }],
  },
  serpiente: {
    dpad: {
      up: "ArrowUp",
      down: "ArrowDown",
      left: "ArrowLeft",
      right: "ArrowRight",
    },
    actions: [],
  },
  bombardero: {
    // El avión avanza solo: solo subir/bajar (se mantienen) + soltar bomba.
    dpad: { up: "ArrowUp", down: "ArrowDown" },
    actions: [{ id: "bomb", label: "BOMBA", code: "Space", icon: "bomb" }],
  },
  rana: {
    // Un salto por pulsación: sin `repeat` (mantener no encadena saltos).
    dpad: {
      up: "ArrowUp",
      down: "ArrowDown",
      left: "ArrowLeft",
      right: "ArrowRight",
    },
    actions: [],
  },
};
