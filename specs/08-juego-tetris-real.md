# SPEC 08 — Motor real del juego Tetris (Bloques)

> **Status:** Implementado
> **Depends on:** SPEC 01, SPEC 06, SPEC 07
> **Date:** 2026-09-21
> **Objective:** Portar el motor real del modo Clásico de `references/started-games/03-tetris/game.js` a un componente React/Canvas e integrarlo en `/play/bloques`, reemplazando ahí el simulador de `PlayRoom`, reutilizando tal cual la fila `bloques` ya existente en la tabla `games` de Supabase.

---

## 1 — Por qué existe este spec

`app/data.ts`/la tabla `games` (spec 07) ya tiene una fila `bloques` (categoría "Puzzle") cuya descripción — "Encaja las piezas que caen sin dejar huecos... completa líneas horizontales... cuatro líneas de golpe valen el máximo de puntos" — describe exactamente Tetris, pero hoy `/play/bloques` sigue siendo el simulador genérico de `PlayRoom` (botón "SIMULAR FIN DE PARTIDA"). En `references/started-games/03-tetris/` existe una implementación completa y funcional (`game.js`, canvas puro, sin dependencias) probada de forma independiente.

Este es el segundo juego real de la plataforma, siguiendo el mismo contrato que estableció el spec 06 para Asteroides (`create<Nombre>Engine(canvas, handlers)`, `<Nombre>State`, integración explícita por `game.id` en `play-room.tsx`). A diferencia de Asteroides, el `README.md` de esta referencia solo describe el modo Clásico del juego, pero el `game.js` real implementa además un "Modo Desafío" completo (selector de modo, 5 niveles con límite de tiempo, filas de basura, obstáculos, retraso de bloqueo y rotación invertida) que el README nunca menciona. Y a diferencia también de Asteroides (canvas 800×600, 4:3), el tablero real de Tetris es 300×600 (1:2, mucho más alto que ancho), lo que exige una decisión de encaje distinta dentro de la caja 16:10 de `CrtFrame`.

Como ya existe una fila de catálogo que encaja con esta mecánica, este spec no toca Supabase en absoluto: es un cambio puramente de frontend.

---

## 2 — Scope

**In:**

- Nuevo módulo `components/games/bloques/engine.ts`: puerto a TypeScript del **modo Clásico únicamente** de `game.js` — modelo de tablero (`COLS=10`, `ROWS=20`, `BLOCK=30`), las 7 piezas (`PIECES`, `COLORS`), `collide`, `rotateCW`, `tryRotate` (wall kicks ±1/±2 columnas), `merge`, `clearLines`, `ghostY`, `hardDrop`, `softDrop`, `lockPiece`, `spawn`, puntuación (`LINE_SCORES = [0,100,300,500,800]` × nivel, +2 puntos/celda en hard drop, +1 punto/fila en soft drop), progresión de nivel (`Math.floor(lines/10)+1`) y velocidad de caída (`max(100, 1000-(nivel-1)*90)` ms). Mecánica sin cambios respecto al modo Clásico original.
  - Diferencias deliberadas respecto al original (ver decisiones en sección 6):
    - Sin selector de modo ni Modo Desafío (ni basura, ni obstáculos, ni retraso de bloqueo, ni rotación invertida): el motor arranca directamente en modo Clásico al llamar `start()`, igual que `initGame()` en Asteroides.
    - Sin manipulación directa del DOM: recibe un único `canvas` inyectado por la factoría; no toca `next-canvas`, elementos de texto de score/lines/level, overlays ni botones. Todo el estado externo se comunica por `onStateChange({ score, lines, level })` (lo sigue necesitando `PlayRoom` para el modal "FIN DEL JUEGO" y el guardado, aunque el HUD externo ya no muestre esos números en vivo — ver más abajo).
    - **El panel HUD original (SCORE, LINES, LEVEL y la vista previa NEXT) se conserva tal cual dentro del juego**, dibujado dentro del mismo canvas en un panel lateral a la derecha del tablero (igual que hace Asteroides con su `drawHUD` interno: `CrtFrame` no tiene un slot HTML aparte para un panel — todo lo que se ve dentro del marco del juego debe dibujarse dentro del único `<canvas>`). Estilo fiel al original: fondo oscuro, texto blanco/gris monoespaciado, mismas etiquetas (SCORE/LINES/LEVEL/NEXT). Se excluyen del panel el interruptor de tema (descartado) y la lista de controles (ya se muestra como texto debajo del `CrtFrame` en `PlayRoom`, sería redundante repetirla dentro del canvas).
    - Resolución total del canvas: **460×600** (tablero 300×600 a la izquierda + panel lateral de 160px a la derecha con SCORE/LINES/LEVEL/NEXT), en vez de letterboxear el tablero de 300×600 tal cual dentro de la caja 16:10 de `CrtFrame`.
    - Sin tecla `P` interna para pausar ni overlay de pausa/game over dibujado por el motor: la pausa la controla en exclusiva `setPaused(paused)` desde React (botón "PAUSA" ya existente), y el fin de partida se notifica una sola vez con `onGameOver(finalScore)` cuando `spawn()` detecta que la nueva pieza colisiona de inmediato — el modal "FIN DEL JUEGO" de React se encarga del resto, igual que en Asteroides.
    - Expone una factoría `createBloquesEngine(canvas, handlers)` que devuelve `{ start(): void; stop(): void; setPaused(paused: boolean): void; restart(): void }`.
- Nuevo componente `components/games/bloques/bloques-game.tsx` ("use client"), análogo a `asteroids-game.tsx`: un `<canvas>` de resolución interna 460×600 con clases `h-full w-full object-contain` (letterboxea dentro de la caja 16:10 de `CrtFrame` sin tocar ese componente), que monta/desmonta el motor en un `useEffect` y expone `restart()` vía `ref` (`useImperativeHandle`). Props: `paused: boolean`, `onStateChange`, `onGameOver`.
- Cambios en `app/play/[id]/play-room.tsx`, solo activos cuando `game.id === "bloques"` (bandera `isBloques`, análoga a `isAsteroids`):
  - Se reemplaza el fondo estático del `CrtFrame` (`art`) por `<BloquesGame />`, con `label=""`.
  - **HUD externo simplificado para este juego:** como SCORE/LINES/LEVEL ya se ven dentro del canvas (panel conservado del original), el HUD externo de `PlayRoom` para `isBloques` oculta los stats PUNTUACIÓN/VIDAS/NIVEL y muestra solo JUGADOR (más los botones PAUSA/SALIR, que no cambian) — evita duplicar los mismos números dos veces. `score`/`lines`/`level` se siguen guardando en el estado de React (vía `onStateChange`) porque `PlayRoom` los necesita igual para el modal "FIN DEL JUEGO" y para `saveScoreAction`.
  - El botón "SIMULAR FIN DE PARTIDA" se oculta para este juego también.
  - El texto de controles bajo el `CrtFrame` cambia a `← → MOVER · ↑ / X ROTAR · ↓ BAJAR · ESPACIO CAÍDA`.
  - `onGameOver(finalScore)` dispara el mismo modal "FIN DEL JUEGO" ya existente.
  - "JUGAR DE NUEVO" (`replay`), tras gastar el crédito con `spendCredit()` (sin cambios en esa lógica), llama `restart()` del motor y resetea `lines`/`level` a sus valores iniciales (0/1) además de `score` a 0.
  - Pausa (botón "PAUSA", ya existente): al activarse, el motor deja de correr su loop de actualización/dibujo (congelado) mientras se sigue mostrando el overlay "EN PAUSA" ya existente; al reanudar continúa desde donde quedó.
- **Sin cambios en Supabase**: la fila `bloques` de la tabla `games` ya existe con `id`, `title`, `category` ("Puzzle"), `desc`, `long` y `thumb` coherentes con Tetris — se reutiliza tal cual, sin ninguna migración. El guardado de puntuación (`saveScoreAction` → tabla `scores`, ya genérica por `game_id`) tampoco cambia.

**Out of scope (para specs futuros):**

- Modo Desafío completo (selector de modo, HUD de desafío, niveles con basura/obstáculos/retraso de bloqueo/rotación invertida) — el `README.md` de la referencia no lo menciona y el usuario decidió portar solo lo ya documentado y de menor riesgo.
- Interruptor de tema claro/oscuro (el original lo persiste en `localStorage` bajo `tetris-theme`) — ningún otro juego de la plataforma lo tiene.
- Tecla `P` interna para pausar — la pausa vive exclusivamente en el botón externo de React.
- Controles táctiles/móviles.
- Cambiar la economía de créditos (`CreditsProvider`/`spendCredit`/`insertCoin`).
- Cambiar el título/categoría/descripción/thumb de la fila `bloques` del catálogo.
- Adaptar cualquier otro juego pendiente del catálogo (rompemuros, serpiente, invasores, laberinto).
- Renderizado a mayor resolución por `devicePixelRatio`.
- Guardar o reanudar el estado de una partida en curso al salir con "SALIR".

---

## 3 — Modelo de datos

Este feature no introduce ningún tipo de dominio nuevo (no hay cambios a `Game`, `ScoreEntry`, `BoardRow` de `lib/types.ts`, ni a las tablas `games`/`scores`). Introduce el contrato del motor portado, análogo al de Asteroides (spec 06):

```ts
// components/games/bloques/engine.ts
export interface BloquesState {
  score: number;
  lines: number;
  level: number;
}

export interface BloquesHandlers {
  onStateChange: (state: BloquesState) => void; // cada vez que score/lines/level cambian
  onGameOver: (finalScore: number) => void; // una sola vez, cuando spawn() colisiona de inmediato
}

export interface BloquesEngine {
  start(): void; // agrega listeners de teclado y arranca el loop (requestAnimationFrame), modo Clásico directo
  stop(): void; // cancela el loop y quita los listeners (cleanup en unmount)
  setPaused(paused: boolean): void; // congela/descongela el loop sin perder estado
  restart(): void; // equivalente a init(): score=0, lines=0, level=1, nueva partida
}

export const BLOQUES_WIDTH = 460; // 300 tablero + 160 panel HUD (SCORE/LINES/LEVEL/NEXT)
export const BLOQUES_HEIGHT = 600;

export function createBloquesEngine(
  canvas: HTMLCanvasElement,
  handlers: BloquesHandlers,
): BloquesEngine;
```

```ts
// components/games/bloques/bloques-game.tsx
export interface BloquesGameHandle {
  restart(): void;
}

export function BloquesGame(props: {
  paused: boolean;
  onStateChange: (state: BloquesState) => void;
  onGameOver: (finalScore: number) => void;
}): JSX.Element; // usar con ref: BloquesGameHandle
```

No hay persistencia nueva: la puntuación final se guarda exactamente igual que hoy, vía `saveScoreAction(game.id, playerName, score)` en `app/play/[id]/actions.ts` (spec 07), sin cambios a ese módulo. La fila `games` con `id: "bloques"` no cambia.

---

## 4 — Plan de implementación

1. **Motor portado (`components/games/bloques/engine.ts`).** Trasladar a TypeScript la lógica de modo Clásico de `game.js` descrita en la sección 2: tablero, las 7 piezas, `collide`, `rotateCW`, `tryRotate` con wall kicks, `merge`, `clearLines`, `ghostY`, `hardDrop`, `softDrop`, `lockPiece`, `spawn`, puntuación y progresión de nivel/velocidad. Envolver en `createBloquesEngine(canvas, handlers)` sobre un canvas de 460×600: la región izquierda (0,0)-(300,600) dibuja tablero + grid + ghost piece + pieza actual (igual que `draw()` del original); la región derecha (300,0)-(460,600) dibuja el panel HUD conservado del original — SCORE, LINES, LEVEL (texto blanco/gris monoespaciado sobre fondo oscuro, fiel al original) y la caja NEXT con la vista previa de la siguiente pieza (adaptación de `drawNext()` al nuevo panel). Sin selector de modo, sin Modo Desafío, sin overlay de pausa/game over propio, sin tecla `P`, sin interruptor de tema ni lista de controles dentro del panel. Notifica `onStateChange({score, lines, level})` cuando cambian (para que `PlayRoom` los use en el modal y el guardado) y `onGameOver(finalScore)` una sola vez al perder. Sin JSX, sin usarse todavía desde ninguna página. Verificación: `npx tsc --noEmit` sin errores en el archivo nuevo.
2. **Componente canvas (`components/games/bloques/bloques-game.tsx`).** Mismo patrón que `asteroids-game.tsx`: monta el motor en un `useEffect` (`start()` al montar, `stop()` en el cleanup) y expone `restart()` por `ref`. Verificación manual puntual: montarlo temporalmente en una página de prueba (revertida antes del siguiente paso) y confirmar en el navegador que se comporta igual que abrir `references/started-games/03-tetris/index.html` en modo Clásico (movimiento, rotación con wall kicks, soft/hard drop, ghost piece, panel HUD con SCORE/LINES/LEVEL/NEXT visible dentro del canvas, limpieza de líneas, aumento de nivel y velocidad, y al perder el juego queda congelado sin overlay "GAME OVER" propio ni reinicio automático).
3. **Integración en `PlayRoom`.** Modificar `app/play/[id]/play-room.tsx` según la sección 2: bandera `isBloques = game.id === "bloques"`, estado nuevo para `lines` (default 0, junto al `level` ya existente por defecto 1) que se sigue actualizando vía `onStateChange` aunque no se muestre en el HUD externo, render condicional de `<BloquesGame />` dentro de `CrtFrame`, ocultar "SIMULAR FIN DE PARTIDA" y actualizar el texto de controles cuando `isBloques`, ocultar los stats PUNTUACIÓN/VIDAS/NIVEL del HUD externo (dejando solo JUGADOR) cuando `isBloques`, conectar `onStateChange`/`onGameOver`, y ajustar `replay()` para llamar `restart()` y resetear `lines`/`level` a 0/1. Los demás juegos (`isBloques === false`) no cambian ni un pixel de comportamiento. Verificación manual en `npm run dev`: jugar `/play/bloques` completo — mover, rotar con wall kicks, soft/hard drop, ver el ghost piece y el panel HUD (SCORE/LINES/LEVEL/NEXT) dentro del canvas actualizarse en vivo, confirmar que el HUD externo arriba del `CrtFrame` solo muestra JUGADOR para este juego, pausar y confirmar que se congela, provocar un top-out y ver aparecer el modal "FIN DEL JUEGO" con la puntuación real, "GUARDAR PUNTUACIÓN" la persiste (verificable en `/hall-of-fame` con `game_id = "bloques"`), "JUGAR DE NUEVO" gasta un crédito y reinicia desde cero. Confirmar además que `/play/asteroides` y cualquier otro `/play/[id]` siguen idénticos a como estaban antes de este spec.
4. **Remate.** `npm run build` y `npm run lint` sin errores ni warnings nuevos. Confirmar que no queda ningún listener de teclado activo tras navegar fuera de `/play/bloques`. Si `next dev` regeneró el bloque `<!-- BEGIN:nextjs-agent-rules -->` de `AGENTS.md`, commitearlo junto al resto.

---

## 5 — Criterios de aceptación

- [ ] `/play/bloques` muestra el juego real (canvas) dentro del `CrtFrame`, no el fondo de gradiente estático.
- [ ] La pieza se mueve con `←`/`→`, rota en sentido horario con `↑` o `X` (con wall kicks de ±1/±2 columnas cuando choca pegada a un borde), baja más rápido con `↓` (soft drop, +1 punto por fila) y cae instantáneamente con `Espacio` (hard drop, +2 puntos por celda recorrida) — mismo comportamiento que `references/started-games/03-tetris/game.js` en modo Clásico.
- [ ] La pieza fantasma (ghost piece) se dibuja en la posición final proyectada, con transparencia, igual que el original.
- [ ] El panel HUD del original (SCORE, LINES, LEVEL y la vista previa NEXT) se ve dentro del panel lateral del mismo canvas, con estilo fiel al original (fondo oscuro, texto blanco/gris monoespaciado), sin un segundo `<canvas>`.
- [ ] Completar 1/2/3/4 líneas de una vez suma 100/300/500/800 puntos multiplicado por el nivel actual.
- [ ] El nivel sube cada 10 líneas acumuladas y la velocidad de caída aumenta según `max(100, 1000-(nivel-1)*90)` ms.
- [ ] El HUD externo de `PlayRoom` arriba del `CrtFrame` solo muestra JUGADOR (y los botones PAUSA/SALIR) para este juego — no duplica PUNTUACIÓN/LÍNEAS/NIVEL, que ya se ven dentro del canvas.
- [ ] El botón "PAUSA" congela visualmente el juego; "SEGUIR" continúa exactamente desde donde quedó; no existe ninguna tecla `P` interna que también pause.
- [ ] Cuando una pieza nueva no puede aparecer (colisiona al hacer spawn), no se dibuja ningún overlay "GAME OVER" del motor — aparece el modal "FIN DEL JUEGO" de `PlayRoom` con la puntuación final real.
- [ ] "GUARDAR PUNTUACIÓN" persiste la puntuación real con `game_id = "bloques"` (verificable en `/hall-of-fame`), igual que el flujo ya existente.
- [ ] "JUGAR DE NUEVO" gasta 1 crédito y reinicia una partida completamente nueva (puntuación 0, líneas 0, nivel 1).
- [ ] El botón "SIMULAR FIN DE PARTIDA" no aparece en `/play/bloques`, pero sigue apareciendo sin cambios en cualquier otro `/play/[id]` que aún no tenga motor real.
- [ ] Ningún otro juego del catálogo (`/play/asteroides`, `/play/rompemuros`, etc.) cambia de comportamiento o apariencia respecto a antes de este spec.
- [ ] La fila `bloques` en la tabla `games` de Supabase no cambia (mismo título/categoría/descripción/thumb que antes de este spec).
- [ ] Salir de `/play/bloques` (botón "SALIR" o navegación) detiene el loop del juego y quita los listeners de teclado.
- [ ] `npm run build` y `npm run lint` terminan sin errores ni warnings nuevos.

---

## 6 — Decisiones tomadas y descartadas

- **Sí:** portar solo el modo Clásico, sin el Modo Desafío (selector de modo, 5 niveles, basura, obstáculos, retraso de bloqueo, rotación invertida). Motivo: decisión explícita del usuario — mismo criterio que con Asteroides (spec 06): portar lo ya documentado y probado, minimizando riesgo; el Modo Desafío queda para un spec futuro si se decide abordarlo.
- **Sí:** reutilizar tal cual la fila `bloques` ya existente en `games` (id, categoría "Puzzle", descripción y thumb sin cambios) en vez de crear una fila `tetris` nueva. Motivo: decisión explícita del usuario — la descripción ya presente coincide exactamente con la mecánica de Tetris; este spec no requiere ninguna migración de catálogo.
- **Sí:** canvas ampliado a 460×600 (tablero 300×600 + panel lateral de 160px con NEXT) en vez de letterbox simple del tablero 300×600 dentro de la caja 16:10 de `CrtFrame`. Motivo: decisión explícita del usuario — reduce las barras negras del letterbox sin inventar información nueva ni modificar `CrtFrame`.
- **Sí:** la vista previa NEXT se dibuja dentro del mismo canvas del tablero, no como dato en el estado ni como segundo `<canvas>`. Motivo: decisión explícita del usuario — mantiene el contrato de un único canvas por motor (`create<Nombre>Engine(canvas, handlers)`).
- **Sí:** sin tecla `P` interna de pausa; la pausa la controla en exclusiva el botón "PAUSA" externo vía `setPaused(paused)`, igual que Asteroides. Motivo: decisión explícita del usuario — evita dos caminos de pausa que puedan desincronizarse.
- **Sí:** el panel HUD original (SCORE, LINES, LEVEL, NEXT) se conserva tal cual dentro del juego, dibujado dentro del mismo canvas con estilo fiel al original (fondo oscuro, texto blanco/gris monoespaciado). Motivo: decisión explícita del usuario — a diferencia de lo decidido inicialmente (que asumía, por fidelidad al original DOM, no dibujar nada dentro del canvas), el usuario pidió explícitamente mantener ese HUD "tal cual" dentro del juego; como `CrtFrame` no tiene slot HTML aparte, la única forma de lograrlo es dibujándolo dentro del canvas, igual que hace el `drawHUD` de Asteroides.
- **Sí:** el HUD externo de `PlayRoom` oculta PUNTUACIÓN/VIDAS/NIVEL y muestra solo JUGADOR cuando `isBloques`, en vez de duplicar esos valores como hace Asteroides. Motivo: decisión explícita del usuario — con el panel HUD ya visible dentro del canvas, repetir los mismos números arriba del `CrtFrame` sería redundante.
- **No:** portar el interruptor de tema claro/oscuro (`tetris-theme` en `localStorage`) ni la lista de controles dentro del panel del canvas (ya se muestra como texto debajo del `CrtFrame`). Motivo: decisión explícita del usuario — ningún otro juego de la plataforma tiene el interruptor de tema, y la lista de controles sería redundante con la que ya existe en `PlayRoom`.
- **No:** controles táctiles/móviles. Motivo: heredado del criterio de spec 06 — el original solo soporta teclado.
- **No:** cambiar la economía de créditos. Motivo: fuera de alcance — comportamiento de plataforma compartido.
- **Sí:** ubicar el código portado en `components/games/bloques/` (motor + componente en la misma carpeta), usando `bloques` como slug/Nombre del contrato (`createBloquesEngine`, `BloquesState`, etc.) en vez de `tetris`, coherente con la decisión de reutilizar esa fila del catálogo. Motivo: decisión explícita del usuario.

---

## 7 — Riesgos identificados

| Riesgo                                                                                                                                                                                                 | Mitigación                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| En modo Clásico no hay retraso de bloqueo (`lockDelayMs = 0`): la pieza se fija apenas colisiona al bajar, sin ventana de gracia para reacomodarla contra una pared.                                   | Aceptado como fiel al original: el modo Clásico de `game.js` nunca tuvo retraso de bloqueo — eso es exclusivo del Modo Desafío, fuera de alcance de este spec.                     |
| El canvas ampliado (460×600) sigue siendo más alto que ancho (~0.77:1), por lo que persisten barras negras notables a los lados dentro de la caja 16:10 de `CrtFrame`, aunque menores que con 300×600. | Aceptado como compromiso explícito (sección 6): no se modifica `CrtFrame` porque lo comparten los demás juegos; se puede revisar en un spec de pulido visual si se vuelve notorio. |
| Si en el futuro se aborda el Modo Desafío como spec aparte, habrá que decidir cómo convive con `createBloquesEngine` (extenderlo o separarlo) — este spec no deja ese camino diseñado.                 | Aceptado como fuera de alcance; se resuelve en el spec del Modo Desafío si se decide abordarlo.                                                                                    |

---

## Lo que **no** entra en este spec

- Modo Desafío completo (selector de modo, niveles con basura/obstáculos/retraso de bloqueo/rotación invertida).
- Interruptor de tema claro/oscuro.
- Tecla `P` interna de pausa.
- Controles táctiles/móviles.
- Cambios a la economía de créditos.
- Cambios al título/categoría/descripción/thumb de la fila `bloques` del catálogo.
- Escalado por `devicePixelRatio` / mayor resolución de renderizado.
- Persistir o reanudar una partida abandonada al salir con "SALIR".
- Adaptar cualquier otro juego pendiente del catálogo (rompemuros, serpiente, invasores, laberinto).

Cada uno de estos, si se aborda, va en su propio spec.
