import type { KeyCode } from "./layouts";

// Teclado sintético (spec 13): los motores escuchan keydown/keyup en `window`,
// así que el control táctil les despacha KeyboardEvent con el mismo `code`
// (Asteroides, Bloques, Rompemuros) y `key` (Serpiente lee `e.key`).

const KEY_FOR_CODE: Record<KeyCode, string> = {
  ArrowUp: "ArrowUp",
  ArrowDown: "ArrowDown",
  ArrowLeft: "ArrowLeft",
  ArrowRight: "ArrowRight",
  Space: " ",
  KeyB: "b",
};

// Teclas que el control tiene pulsadas ahora mismo, para soltarlas todas de golpe.
const pressed = new Set<KeyCode>();

function dispatch(type: "keydown" | "keyup", code: KeyCode, repeat = false) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new KeyboardEvent(type, {
      code,
      key: KEY_FOR_CODE[code],
      repeat,
      bubbles: true,
      cancelable: true,
    }),
  );
}

// Emite keydown. Llamarla de nuevo con la tecla ya pulsada es una repetición
// (autorepeat DAS/ARR), igual que un teclado físico.
export function pressKey(code: KeyCode) {
  const repeat = pressed.has(code);
  pressed.add(code);
  dispatch("keydown", code, repeat);
}

export function releaseKey(code: KeyCode) {
  if (!pressed.delete(code)) return;
  dispatch("keyup", code);
}

export function releaseAll() {
  for (const code of [...pressed]) releaseKey(code);
}
