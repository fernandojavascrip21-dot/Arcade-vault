# SPEC 11 — Motor real del juego Serpiente

> **Status:** Aprovado
> **Depends on:** SPEC 01, SPEC 06, SPEC 07, SPEC 10
> **Date:** 2026-09-23
> **Objective:** Crear desde cero el motor de Serpiente (rejilla 20×20, frutas del atlas `fruits.png`) como componente React/Canvas e integrarlo en `/play/serpiente`, reemplazando ahí el simulador de `PlayRoom`, reutilizando la fila `serpiente` ya existente en la tabla `games` de Supabase.

---

## 1 — Por qué existe este spec

A diferencia de Asteroides, Bloques y Rompemuros, Serpiente **no tiene un `game.js` de referencia**: solo hay assets en `references/source-assets/snake-assets/` — `fruits.png` (3790×442, tres filas de frutas; el atlas usa la fila mediana en `y=136–295`) y `sprites.js` (`window.SPRITE_ATLAS` con 22 frutas recortadas por `{ x, y, w, h }`). Por eso el motor se diseña aquí a partir de la descripción del usuario (modo "desde cero"), siguiendo el contrato de los specs 06, 08 y 10: `createSerpienteEngine(canvas, handlers)`, `SerpienteState`, integración explícita por `game.id` en `play-room.tsx`.

La tabla `games` ya contiene la fila `serpiente` (categoría "Clásico", "Crece sin morderte la cola.", con texto largo que coincide exactamente con la mecánica: rejilla, un solo choque termina la partida). Este spec **no toca Supabase**: es un cambio puramente de frontend, igual que el spec 10.

---

## 2 — Scope

**In:**

- Nuevo módulo `components/games/serpiente/engine.ts`: motor completo en un único archivo (mismo criterio que los otros motores), con:
  - Rejilla de 20×20 celdas de 40 px sobre un canvas cuadrado de 800×800 (1:1, letterbox por `object-contain` dentro de la `CrtFrame`).
  - Movimiento por ticks discretos por celda; muerte al chocar con el muro o con el propio cuerpo (una sola vida).
  - Una fruta a la vez en una celda libre aleatoria; al comerla, la serpiente crece 1 segmento y suma 10 puntos.
  - Nivel = `1 + floor(frutasComidas / 5)`; la velocidad aumenta con cada nivel.
  - Controles con flechas y WASD; pausa interna con `Escape` / `P` sincronizada con `PlayRoom`.
  - Fin de partida único: `onGameOver(finalScore)`, también si la serpiente llena las 400 celdas (victoria tratada igual que derrota, como en el spec 10).
  - Serpiente dibujada con formas de canvas (segmentos redondeados, cabeza con ojos); frutas dibujadas con el atlas de `fruits.png`.
- `SPRITE_ATLAS` de `sprites.js` portado como constante local del motor (sin `window`), solo con las coordenadas de las frutas.
- Copia de `fruits.png` a `public/games/serpiente/fruits.png`.
- Nuevo componente `components/games/serpiente/serpiente-game.tsx` (`forwardRef`, `restart()` vía `useImperativeHandle`).
- Rama `game.id === "serpiente"` en `app/play/[id]/play-room.tsx`: fondo `#000`, slot `art` de `CrtFrame`, texto de controles, ocultar "SIMULAR FIN DE PARTIDA", ocultar el bloque VIDAS del HUD externo, sincronizar `paused`, y llamar a `restart()` en `replay()`.

**Out of scope (para futuros specs):**

- Cambios en Supabase (la fila `serpiente` ya existe) o en el pipeline de puntuaciones (`saveScoreAction`, `lib/supabase/*`).
- Sonido, controles táctiles/móviles, selección de dificultad, obstáculos, power-ups, modo multijugador.
- Puntos distintos por tipo de fruta (todas valen 10).
- Sprites para la serpiente (el atlas solo contiene frutas).
- Cambiar la economía de créditos o `CrtFrame`.
- Hacer genérico el registro de juegos en `PlayRoom`.

---

## 3 — Data model

```ts
// components/games/serpiente/engine.ts
export const SERPIENTE_WIDTH = 800;
export const SERPIENTE_HEIGHT = 800;

const CELL = 40;
const COLS = 20; // 800 / 40
const ROWS = 20; // 800 / 40
const INITIAL_LENGTH = 3;
const POINTS_PER_FRUIT = 10;
const FRUITS_PER_LEVEL = 5;
const TICK_BASE_MS = 140;
const TICK_STEP_MS = 10; // se resta por nivel superado
const TICK_MIN_MS = 60;
const FRUIT_SPRITE_URL = "/games/serpiente/fruits.png";

type Direction = "up" | "down" | "left" | "right";
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
const SPRITE_ATLAS: Record<string, SpriteRect> = {
  banana: { x: 34, y: 136, w: 110, h: 160 },
  apple: { x: 2786, y: 136, w: 110, h: 160 },
  // ... las 22 frutas de references/source-assets/snake-assets/sprites.js, sin cambios
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
): SerpienteEngine;
```

```ts
// components/games/serpiente/serpiente-game.tsx
export interface SerpienteGameHandle {
  restart(): void;
}
interface SerpienteGameProps {
  paused: boolean;
  onStateChange: (state: SerpienteState) => void;
  onGameOver: (finalScore: number) => void;
}
```

Reglas internas del motor:

- La serpiente es un arreglo `Cell[]` (cabeza en índice 0); arranca con 3 celdas en la fila 10, cabeza en `x=6`, mirando a la derecha.
- La partida arranca **quieta** hasta la primera tecla de dirección (válida: no puede ser `left`); a partir de ahí avanza un paso por tick.
- Se encola como máximo un giro por tick; se ignora el giro de 180° respecto a la dirección actual.
- Duración del tick: `max(TICK_MIN_MS, TICK_BASE_MS - (level - 1) * TICK_STEP_MS)`.
- La fruta se elige al azar entre las 22 claves de `SPRITE_ATLAS` y se dibuja escalada a ~34 px de alto, centrada en su celda, preservando la proporción `w/h` del recorte.
- Si `fruits.png` no ha cargado (o falla), la fruta se dibuja como círculo de color; el juego no espera a la imagen.
- El motor no dibuja overlay de fin de partida, ni overlay de pausa (lo pinta React), ni escucha `R`.
- Convención: `start()` registra el `keydown` sobre `window` y el RAF; `stop()` los elimina; `restart()` reinicia serpiente, fruta, puntuación y nivel, y notifica el estado inicial.

Sin cambios en la base de datos: la fila `serpiente` de `public.games` ya existe.

---

## 4 — Implementation plan

1. Copiar `references/source-assets/snake-assets/fruits.png` a `public/games/serpiente/fruits.png`.
2. Crear `components/games/serpiente/engine.ts` con constantes, `SPRITE_ATLAS`, tipos exportados y una fábrica que ya dibuja el tablero vacío y la serpiente inmóvil (sin lógica de juego). Prueba manual: importar temporalmente y ver el canvas con la serpiente en el centro.
3. Añadir en el motor el bucle RAF con paso fijo por tick, entrada de teclado (flechas/WASD, cola de giro, sin 180°) y movimiento; arranque quieto hasta la primera tecla.
4. Añadir fruta (celda libre aleatoria, sprite del atlas con carga asíncrona y fallback de círculo), crecimiento, puntuación, nivel y velocidad; emitir `onStateChange` solo cuando cambia.
5. Añadir colisión con muro y cuerpo, condición de tablero lleno, `onGameOver(finalScore)` una sola vez, `setPaused`, pausa interna `Escape`/`P` (emite `paused` en el estado) y `restart()`.
6. Crear `components/games/serpiente/serpiente-game.tsx` (mismo patrón que `asteroids-game.tsx`: refs para callbacks, motor montado una vez, `setPaused` en efecto, `restart()` por `useImperativeHandle`, canvas 800×800 con `h-full w-full bg-black object-contain`).
7. Integrar en `app/play/[id]/play-room.tsx`: `isSerpiente`, `serpienteGameRef`, `handleSerpienteStateChange` (score, level, `setPaused(state.paused)`), `handleSerpienteGameOver`; fondo `#000`; `art`; texto de controles `← ↑ ↓ → / WASD MOVER · ESC / P PAUSA`; ocultar el simulador; mostrar en el HUD externo solo PUNTUACIÓN y NIVEL (sin VIDAS) para este juego; en `replay()` llamar a `restart()` y `setLevel(1)`.
8. Verificar el flujo completo en `/play/serpiente` (jugar, morir, guardar puntuación, ver el ranking, jugar de nuevo) y ejecutar `npm run lint` y `npm run build`.

---

## 5 — Acceptance criteria

- [ ] `/play/serpiente` muestra el canvas del juego en la `CrtFrame` con franjas negras laterales (tablero 1:1 dentro de 16:10) y ya no muestra el botón "SIMULAR FIN DE PARTIDA".
- [ ] Al cargar, la serpiente (3 celdas) permanece quieta hasta pulsar una dirección distinta de `←`.
- [ ] Las flechas y WASD cambian la dirección; pulsar la dirección opuesta a la actual no hace nada.
- [ ] Comer una fruta suma exactamente 10 puntos y alarga la serpiente 1 segmento.
- [ ] La fruta aparece siempre en una celda no ocupada por la serpiente y se dibuja con un sprite de `fruits.png`.
- [ ] Con `fruits.png` bloqueada en la red del navegador, el juego funciona y la fruta se dibuja como círculo de color.
- [ ] Tras comer 5 frutas el HUD externo muestra NIVEL 02 y la serpiente avanza más rápido; el tick nunca baja de 60 ms.
- [ ] Chocar contra cualquier borde o contra el propio cuerpo abre el modal "FIN DEL JUEGO" con la puntuación final correcta, y `onGameOver` se llama una sola vez.
- [ ] El HUD externo muestra PUNTUACIÓN, NIVEL y JUGADOR, y no muestra VIDAS.
- [ ] El botón "PAUSA" y las teclas `Escape`/`P` pausan y reanudan; el texto del botón y el overlay "EN PAUSA" quedan siempre sincronizados con el estado del motor.
- [ ] "GUARDAR PUNTUACIÓN" guarda una fila en `scores` con `game_id = 'serpiente'` y aparece en el ranking de `/game/serpiente`.
- [ ] "JUGAR DE NUEVO" consume un crédito, reinicia puntuación, nivel y serpiente, y el juego vuelve a arrancar quieto.
- [ ] Navegar fuera de `/play/serpiente` elimina los listeners de teclado y el RAF (sin errores en consola al volver).
- [ ] El resto de juegos (`asteroides`, `bloques`, `rompemuros`) y los aún simulados se comportan exactamente igual que antes.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

---

## 6 — Decisions taken and discarded

- **Sí:** diseñar el motor desde cero (modo "sin carpeta de referencia"). Motivo: solo existen assets, no hay `game.js` que portar.
- **Sí:** rejilla 20×20 con celdas de 40 px sobre 800×800 (decisión explícita del usuario: tablero más grande). Motivo: tablero cuadrado con más espacio de juego y celdas donde el sprite de fruta se ve bien.
- **No:** 20×15 sobre 800×600 (4:3), 32×24 de 25 px y 640×400 (16:10). Motivo: el usuario pidió un tablero más grande (800×800); 32×24 hace la fruta muy pequeña.
- **Sí:** muerte al chocar con muro o cuerpo, una sola vida. Motivo: coincide con el texto largo ya publicado en `games.long` ("Un solo choque contra el muro o contra ti mismo termina la partida").
- **No:** paredes que envuelven y dificultad elegible. Motivo: contradicen `games.long` y amplían alcance.
- **Sí:** 10 puntos fijos por fruta; el nivel sube cada 5 frutas y acelera el tick. Motivo: regla simple que alimenta los campos NIVEL y PUNTUACIÓN ya existentes en el HUD.
- **No:** puntos distintos por tipo de fruta. Motivo: más reglas sin aportar a la jugabilidad; puede ser otro spec.
- **Sí:** serpiente con formas de canvas y frutas aleatorias del atlas (22). Motivo: el atlas no trae sprites de serpiente.
- **Sí:** `SPRITE_ATLAS` como constante local del motor y `fruits.png` copiada a `public/games/serpiente/`; el juego arranca sin esperar la imagen y usa un círculo de color como fallback. Motivo: elimina el acoplamiento con `window` del original y evita una pantalla vacía si la carga falla.
- **Sí:** pausa interna `Escape`/`P` sincronizada, con `paused` en `SerpienteState` (decisión explícita del usuario, mismo criterio que Rompemuros). Motivo: un solo estado de verdad entre el botón "PAUSA" y la tecla.
- **Sí:** el overlay de pausa lo pinta únicamente React ("EN PAUSA"); el canvas no dibuja el suyo. Motivo: al no haber HUD dentro del canvas, un segundo overlay sería redundante (a diferencia de Rompemuros).
- **Sí:** HUD externo con PUNTUACIÓN y NIVEL, sin VIDAS. Motivo: solo hay una vida; mostrar `♥` fijo sería engañoso.
- **No:** HUD dentro del canvas. Motivo: duplicaría el HUD de `PlayRoom` y añade dibujo de texto sin necesidad.
- **Sí:** arranque quieto hasta la primera tecla de dirección. Motivo: comportamiento del Snake clásico; evita morir antes de que el jugador esté listo tras pagar un crédito.
- **Sí:** victoria (tablero lleno) tratada como fin de partida vía `onGameOver`, sin overlay propio. Motivo: `PlayRoom` solo tiene un modal de cierre (criterio del spec 10).
- **No:** sonido. Motivo: no hay audio en los assets; sin política de autoplay que resolver.
- **No:** controles táctiles. Motivo: heredado de los specs 06/08/10.
- **No:** tocar Supabase. Motivo: la fila `serpiente` ya existe y coincide con la mecánica.
- **Sí:** todo el motor en un único `engine.ts`. Motivo: mismo criterio de los motores anteriores.

---

## 7 — Riesgos identificados

| Riesgo                                                                                                                     | Mitigación                                                                                                                                  |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `fruits.png` pesa varios MB (3790×442) y tarda en cargar                                                                   | El juego arranca sin esperarla y usa el círculo de color hasta que carga; se puede recortar la fila útil en un spec futuro.                 |
| Coordenadas del atlas ligeramente desalineadas (fueron detectadas por análisis de píxeles) y fruta recortada de forma rara | Verificar visualmente en el paso 4 las 22 frutas; corregir la constante local si alguna sale cortada, sin cambiar la lógica.                |
| Dos pulsaciones muy rápidas en un mismo tick permiten un giro de 180° "indirecto" y morder el cuello                       | Se encola un solo giro por tick y se valida contra la dirección ya aplicada, no contra la última tecla.                                     |
| `paused` desincronizado entre motor y `PlayRoom`                                                                           | El motor emite `paused` por `onStateChange` cada vez que cambia, y `PlayRoom` lo copia a su estado local (patrón ya probado en Rompemuros). |
| Listeners de teclado del motor interfieren con otros controles de la página (scroll con flechas)                           | `preventDefault` en las teclas de juego mientras el motor está activo; el listener se retira en `stop()`.                                   |

---

## What is **not** in this spec

- Cambios en Supabase, en `saveScoreAction` o en el ranking.
- Sonido, controles táctiles, dificultades, obstáculos, power-ups o multijugador.
- Puntos distintos por fruta.
- Un registro genérico de juegos en `PlayRoom`.

Cada uno de esos puntos, si llega, va en su propio spec.
