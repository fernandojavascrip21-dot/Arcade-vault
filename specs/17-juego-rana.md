# SPEC 17 — Motor del juego Rana

> **Status:** Aprovado
> **Depends on:** SPEC 06, SPEC 07, SPEC 15, SPEC 16
> **Date:** 2026-10-05
> **Objective:** Crear desde cero el motor del juego RANA (una rana que cruza cinco carriles de tráfico y cinco de río para llenar cinco casas) e integrarlo en `/play/rana`, con su fila nueva `rana` en la tabla `games` y su carátula de catálogo.

---

## 1 — Por qué existe este spec

RANA es la versión propia de Frogger. El `game-planner` ya la evaluó y la dejó en "❌ Descartados" de `references/games-suggestion-all.md` (33/40) por dos motivos: "satura Clásico" y "la puntuación depende del tiempo". El usuario decidió rescatarla, y este spec resuelve las dos objeciones de forma explícita:

- **Categoría Acción**, no Clásico (Clásico ya tiene `serpiente` y `laberinto`).
- **Puntuación sin bono de tiempo**: el reloj solo quita una vida si se agota; nunca suma puntos.

No hay `game.js` de referencia en `references/started-games/` ni assets en `references/source-assets/`. El motor se diseña desde cero, igual que Serpiente (spec 11) y Bombardero (spec 16), con el mismo contrato: `createRanaEngine(canvas, handlers)`, `RanaState`, rama explícita por `game.id` en `play-room.tsx` y una fila nueva en `public.games`.

---

## 2 — Scope

**In:**

- Nuevo módulo `components/games/rana/engine.ts`: motor completo en un único archivo, framework-free, sin imágenes ni assets (todo con primitivas de canvas).
  - **Canvas 1280×800** (16:10 exacto, llena `CrtFrame` sin franjas).
  - **Tablero 20×13**: 20 columnas de 64 px y 13 filas de 60 px (`y = 0..780`). La franja `y = 780..800` es la barra de tiempo.
  - **Filas** (fila 0 arriba): `0` casas · `1–5` río · `6` mediana segura · `7–11` carretera · `12` salida segura.
  - **Carriles**: cada carril tiene objetos idénticos, equiespaciados sobre un bucle de 24 celdas (1536 px) que se repite sin fin. Valores de nivel 1 en la tabla `LANES` de la sección 3.
    - Carretera: cuatro carriles de coches de 1 celda y uno de camiones de 2 celdas, con sentidos alternos.
    - Río: tres carriles de troncos (3, 5 y 4 celdas, hacia la derecha) y dos de tortugas (grupos de 3 y de 2, hacia la izquierda). Las tortugas nunca se sumergen.
  - **Dificultad por nivel**: todas las velocidades se multiplican por `min(2.2, 1 + (level - 1) * 0.12)`. Nada más cambia entre niveles.
  - **La rana**: ocupa una celda. Arranca en la fila 12, columna 10. Cada pulsación es un salto de una celda (64 px en horizontal, 60 px en vertical) con una animación de `HOP_MS = 100`. Mantener la tecla no repite (`e.repeat` se ignora). Las pulsaciones durante un salto o durante la animación de muerte se ignoran.
  - La posición lógica cambia al instante al iniciar el salto; la animación es solo visual.
  - **En tierra** (filas 6–12) la rana está alineada a la rejilla. Un salto que la sacaría del tablero se ignora.
  - **En el río** (filas 1–5) la rana se mueve con la plataforma que tiene debajo (`x` continua). Los saltos horizontales son de 64 px desde su `x` actual. Al saltar del río a la mediana, `x` se ajusta a la columna más cercana.
  - **Casas**: 5 bahías de 2 columnas en la fila 0 (columnas `1–2`, `5–6`, `9–10`, `13–14`, `17–18`; centros en `x = 128, 384, 640, 896, 1152`). Al saltar a la fila 0, si el centro de la rana queda a ≤ 48 px del centro de una bahía libre, la rana entra, la bahía queda ocupada y aparece una rana nueva en la salida.
  - **Muertes** (cada una resta 1 vida):
    1. Atropello: el hitbox de la rana (celda con 10 px de margen por lado) se solapa con un vehículo (4 px de margen).
    2. Agua: en una fila de río sin plataforma bajo el centro de la rana.
    3. Arrastre: el centro de la rana sale de `x = 0..1280` llevada por una plataforma.
    4. Seto o bahía ocupada: salta a la fila 0 fuera de una bahía libre.
    5. Reloj: `timeLeft` llega a 0.
  - Tras una muerte: animación de `DEATH_MS = 600` (rana congelada, tráfico en marcha) y reaparición en la salida con el reloj reiniciado. Las casas ya ocupadas se conservan.
  - **Reloj**: `FROG_TIME_MS = 30000` por rana. Se reinicia en cada aparición (inicio, muerte, casa, nivel). No corre en pausa ni durante la animación de muerte. Se dibuja como barra en `y = 780..800`, verde y roja por debajo de 10 s.
  - **Vidas**: `LIVES_START = 3` para toda la partida; no se reponen al subir de nivel. Al llegar a 0, `onGameOver(finalScore)` una sola vez y el motor queda congelado hasta `restart()`.
  - **Nivel**: se completa al ocupar las 5 casas. Se suma el bono, `level += 1`, las casas se vacían, la rana reaparece y los carriles aceleran. Sin pantalla de transición.
  - **Puntuación** (entero creciente, compatible con `scores`):
    - `POINTS_PER_ROW = 10` por cada fila nueva alcanzada por la rana actual (la marca se reinicia en cada aparición; retroceder y volver a subir no puntúa).
    - `POINTS_HOME = 50` por cada rana en casa. La fila 0 también cuenta como fila nueva, así que entrar en una casa suma 60 puntos en total (10 + 50).
    - `BONUS_LEVEL = 500 × level` al completar las 5 casas.
    - Ningún punto por tiempo sobrante.
  - **Controles**: `← ↑ ↓ →` / `WASD` saltar, `Escape` / `P` pausa interna sincronizada con `PlayRoom` (mismo patrón que `SerpienteState.paused`). El motor lee `e.key` y hace `preventDefault` en las teclas de juego. No usa `F` (pantalla completa, spec 15).
  - **Dibujado**: todos los colores viven en una única constante `PALETTE` del motor (facilita el pase posterior de skins). Carretera oscura con líneas discontinuas, río azul, mediana y salida en violeta, seto verde con bahías oscuras, rana verde con ojos, troncos marrones, tortugas rojizas, vehículos de colores por carril, rana pequeña en cada casa ocupada. Sin HUD dentro del canvas salvo la barra de tiempo.
  - El motor no dibuja "GAME OVER" ni overlay de pausa, ni se reinicia solo con ninguna tecla.
- Nuevo componente `components/games/rana/rana-game.tsx` ("use client"): mismo patrón que `bombardero-game.tsx` antes de su addendum de skins (refs para callbacks, motor montado una vez, `setPaused` en un efecto, `restart()` por `useImperativeHandle`, canvas 1280×800 con `h-full w-full bg-black object-contain`).
- Rama `game.id === "rana"` (bandera `isRana`) en `app/play/[id]/play-room.tsx`:
  - `ranaGameRef` y `isRana` añadido a `isRealGame` (fondo `#000`, sin "SIMULAR FIN DE PARTIDA", `ROOM_OVERHEAD_GAME`).
  - Slot `art` del `CrtFrame`: `<RanaGame ref={ranaGameRef} paused={paused} onStateChange={handleRanaStateChange} onGameOver={handleRanaGameOver} />`, con `label=""`.
  - `handleRanaStateChange(state)`: `setScore`, `setLives`, `setLevel`, `setPaused(state.paused)`.
  - `handleRanaGameOver(finalScore)`: `setScore(finalScore)`, `setPaused(false)`, `setOver(true)`.
  - `keyboardHelp`: `← ↑ ↓ → / WASD SALTAR · ESC / P PAUSA`.
  - `replay()`: `if (isRana) { ranaGameRef.current?.restart(); setLives(3); setLevel(1); }`.
  - La barra de stats (PUNTUACIÓN, VIDAS, NIVEL, JUGADOR) no cambia: `hasBarStats` ya es `true` y VIDAS ya se muestra para todo lo que no sea `serpiente`.
- **Nueva fila en `public.games`**, insertada como migración con el MCP de Supabase durante `/spec-impl`, nunca desde código de la app:
  - `id`: `rana`
  - `title`: `RANA`
  - `category`: `Acción`
  - `desc`: `Cruza la autopista y el río sin perder el salto.`
  - `long`: `Lleva a cada rana desde la orilla hasta su casa al otro lado. Primero cinco carriles de tráfico que no frenan; después un río que solo se cruza saltando entre troncos y tortugas. Llena las cinco casas para subir de nivel: todo se acelera y sigues con las mismas tres vidas.`
  - `thumb`: `linear-gradient(165deg, #0b2a5a 0%, #1f7a3a 50%, #1a1a22 100%)`
- **Carátula** en `components/game-cover.tsx`: nuevo componente `Rana` registrado en `COVERS` bajo `rana`, con el mismo `Frame` (viewBox 160×100): franja de río con un tronco, franja de carretera con dos vehículos, una rana verde en la mediana y dos casas arriba. Solo SVG estático.
- **Documentación**:
  - `references/games-suggestion-all.md`: quitar RANA de "❌ Descartados", añadirla a "✅ Hechos" (`rana` · Acción · Frogger · `components/games/rana/`) y ajustar los contadores del Resumen (Hechos +1, Descartados −1).
  - `references/implementd-game.md`: fila y ficha de RANA en "Jugables".
  - `CLAUDE.md`: añadir `rana` a la lista de juegos jugables de la sección Games.

**Out of scope (para specs futuros o addenda):**

- Skins `clasico`/`retro`/`neon`, `setSkin()` y chips SKIN: addendum del agente `skin-designer` tras `/spec-impl`.
- Entrada en `TOUCH_LAYOUTS` y revisión de la sala móvil: addendum del agente `mobile-porter` (hasta entonces `/play/rana` no muestra mando táctil).
- Tortugas que se sumergen, cocodrilos, mosca de bonificación, rana acompañante, serpiente en la mediana.
- Bono de puntos por tiempo sobrante.
- Sonido.
- Selección de dificultad.
- Pantalla de transición "Nivel X completado" dentro del canvas.
- Disposición de carriles distinta por nivel (solo cambia la velocidad).
- Un registro genérico de juegos en `PlayRoom`.
- Corregir la línea de BOMBARDERO en `references/games-suggestion-all.md`, que sigue en "Pendientes".

---

## 3 — Modelo de datos

Sin tipos de dominio nuevos (`lib/types.ts` y la tabla `scores` no cambian). La única persistencia nueva es la fila `rana` de `public.games`.

```ts
// components/games/rana/engine.ts
export const RANA_WIDTH = 1280;
export const RANA_HEIGHT = 800;

const COLS = 20;
const ROWS = 13;
const CELL_W = 64; // 1280 / 20
const CELL_H = 60; // 13 * 60 = 780
const TIMER_BAR_Y = 780; // barra de tiempo en y = 780..800
const LOOP_CELLS = 24; // bucle de cada carril: 1536 px

const ROW_HOME = 0;
const ROW_MEDIAN = 6;
const ROW_START = 12;
const START_COL = 10;

const HOME_COLS = [1, 5, 9, 13, 17]; // primera columna de cada bahía (2 de ancho)
const HOME_TOLERANCE = 48; // px entre centro de rana y centro de bahía

const HOP_MS = 100;
const DEATH_MS = 600;
const FROG_TIME_MS = 30000;
const TIMER_WARN_MS = 10000;
const FROG_HITBOX_INSET = 10;
const VEHICLE_HITBOX_INSET = 4;

const LIVES_START = 3;
const POINTS_PER_ROW = 10;
const POINTS_HOME = 50;
const BONUS_LEVEL = 500; // multiplicado por el nivel completado
const SPEED_STEP = 0.12; // por nivel superado
const SPEED_MAX_MULT = 2.2;

type LaneKind = "car" | "truck" | "log" | "turtle";
interface Lane {
  row: number;
  kind: LaneKind;
  length: number; // celdas
  count: number; // objetos equiespaciados en el bucle
  speed: number; // px/s en nivel 1
  dir: 1 | -1; // 1 = derecha
}

const LANES: Lane[] = [
  { row: 1, kind: "log", length: 4, count: 3, speed: 80, dir: 1 },
  { row: 2, kind: "turtle", length: 2, count: 4, speed: 100, dir: -1 },
  { row: 3, kind: "log", length: 5, count: 2, speed: 110, dir: 1 },
  { row: 4, kind: "log", length: 3, count: 3, speed: 60, dir: 1 },
  { row: 5, kind: "turtle", length: 3, count: 4, speed: 80, dir: -1 },
  { row: 7, kind: "truck", length: 2, count: 3, speed: 80, dir: -1 },
  { row: 8, kind: "car", length: 1, count: 2, speed: 180, dir: 1 },
  { row: 9, kind: "car", length: 1, count: 4, speed: 120, dir: -1 },
  { row: 10, kind: "car", length: 1, count: 3, speed: 70, dir: 1 },
  { row: 11, kind: "car", length: 1, count: 4, speed: 90, dir: -1 },
];

export interface RanaState {
  score: number;
  lives: number;
  level: number;
  paused: boolean; // notificado también cuando cambia por Escape/P interno
}

export interface RanaHandlers {
  onStateChange(state: RanaState): void; // solo cuando cambia
  onGameOver(finalScore: number): void; // una sola vez, al perder la última vida
}

export interface RanaEngine {
  start(): void;
  stop(): void;
  setPaused(paused: boolean): void;
  restart(): void;
}

export function createRanaEngine(
  canvas: HTMLCanvasElement,
  handlers: RanaHandlers,
): RanaEngine;
```

```ts
// components/games/rana/rana-game.tsx
export interface RanaGameHandle {
  restart(): void;
}
interface RanaGameProps {
  paused: boolean;
  onStateChange: (state: RanaState) => void;
  onGameOver: (finalScore: number) => void;
}
```

Reglas internas del motor:

- Coordenadas: origen arriba-izquierda; la fila `r` ocupa `y = r * 60 .. r * 60 + 60`.
- La rana es `{ x, row, bestRow, hopUntil, deadUntil }`: `x` en px (borde izquierdo), `row` entero. `bestRow` es la fila más alta alcanzada por la rana actual.
- Cada carril guarda un único `offset` en px que avanza `speed * mult * dir * dt`; la posición del objeto `i` es `(offset + i * LOOP / count) mod LOOP`, desplazada para que entre y salga por fuera del canvas.
- `homes: boolean[5]` es la única fuente de verdad de las casas; se vacía al subir de nivel y en `restart()`.
- `timeLeft` vive solo en el motor (barra del canvas); no se notifica a React.
- Todo el movimiento se escala por `dt` real con tope de 50 ms.
- `start()` registra `keydown` sobre `window` y el RAF; `stop()` los elimina; `restart()` reinicia rana, casas, vidas, nivel, puntuación y reloj, y notifica el estado inicial.

---

## 4 — Plan de implementación

1. **Migración de catálogo.** Insertar vía MCP de Supabase la fila `rana` con los valores literales de la sección 2. Verificación: `select * from games where id = 'rana'`; `/games` y `/game/rana` la muestran; `/play/rana` sigue en modo simulador.
2. **Carátula.** Añadir `Rana` a `COVERS` en `components/game-cover.tsx`. Verificación: la tarjeta de `/games` muestra la carátula.
3. **Motor — tablero estático.** Crear `components/games/rana/engine.ts` con constantes, `LANES`, `PALETTE`, tipos y una fábrica que dibuja filas, casas, objetos quietos, rana en la salida y barra de tiempo llena.
4. **Motor — carriles en movimiento.** Bucle RAF con `dt`, avance y repetición de los carriles, multiplicador de velocidad por nivel.
5. **Motor — saltos.** Entrada de teclado (flechas/WASD, sin repetición, ignorada en salto), animación de salto, límites en tierra, puntos por fila nueva. Emitir `onStateChange` solo cuando cambia.
6. **Motor — río y casas.** Arrastre sobre plataformas, saltos horizontales continuos, ajuste a rejilla al volver a tierra, entrada en bahías, `POINTS_HOME`, reaparición.
7. **Motor — muertes, reloj, niveles y fin.** Las cinco causas de muerte, animación de muerte, reloj y su barra, vidas, nivel completado con `BONUS_LEVEL`, `onGameOver` una sola vez, `setPaused`, pausa interna `Escape`/`P` y `restart()`.
8. **Componente canvas.** Crear `components/games/rana/rana-game.tsx` según la sección 2.
9. **Integración en `PlayRoom`.** Aplicar las ramas `isRana` de la sección 2 en `app/play/[id]/play-room.tsx`. Prueba manual en `npm run dev`: cruzar, llenar las 5 casas, morir por cada causa, perder las 3 vidas, guardar puntuación, jugar de nuevo, pausar con botón y con tecla.
10. **Documentación y remate.** Actualizar `references/games-suggestion-all.md`, `references/implementd-game.md` y `CLAUDE.md` según la sección 2. `npm run lint` y `npm run build` sin errores. Si `next dev` regeneró el bloque de `AGENTS.md`, commitearlo.

---

## 5 — Criterios de aceptación

- [ ] `/games` y `/game/rana` muestran RANA en la categoría Acción con la frase "Cruza la autopista y el río sin perder el salto." y su carátula.
- [ ] `/play/rana` muestra el canvas 1280×800 llenando el `CrtFrame`, sin franjas y sin "SIMULAR FIN DE PARTIDA".
- [ ] Cada pulsación de flecha o WASD mueve la rana exactamente una celda; mantener la tecla no encadena saltos.
- [ ] En tierra, un salto hacia fuera del tablero no hace nada.
- [ ] Alcanzar una fila nueva suma exactamente 10 puntos; bajar y volver a subir a una fila ya alcanzada no suma.
- [ ] Sobre un tronco o tortuga la rana se desplaza con él; saltar al agua sin plataforma resta 1 vida.
- [ ] Ser arrastrada fuera del canvas resta 1 vida.
- [ ] Tocar un vehículo resta 1 vida.
- [ ] Entrar en una bahía libre suma 60 puntos (10 de la fila nueva + 50 de la casa), deja una rana dibujada en la casa y hace aparecer una rana nueva en la salida.
- [ ] Saltar al seto o a una bahía ocupada resta 1 vida.
- [ ] La barra de tiempo se vacía en 30 s, se pone roja por debajo de 10 s y agotarla resta 1 vida; llegar a casa con tiempo sobrante no suma puntos.
- [ ] El reloj no avanza en pausa.
- [ ] Ocupar las 5 casas suma `500 × nivel`, vacía las casas, sube NIVEL en la barra y acelera los carriles, sin reponer vidas ni mostrar transición.
- [ ] Perder la 3ª vida abre el modal "FIN DEL JUEGO" con la puntuación final; `onGameOver` se llama una sola vez y el canvas no dibuja overlay propio.
- [ ] La barra superior muestra PUNTUACIÓN, VIDAS, NIVEL y JUGADOR actualizados en vivo.
- [ ] El botón PAUSA y `Escape`/`P` pausan y reanudan, siempre sincronizados.
- [ ] "GUARDAR PUNTUACIÓN" inserta en `scores` con `game_id = 'rana'` y aparece en `/game/rana` y `/hall-of-fame`.
- [ ] "JUGAR DE NUEVO" consume un crédito y reinicia puntuación, vidas, nivel, casas y reloj.
- [ ] La tecla `F` sigue alternando la pantalla completa en `/play/rana`.
- [ ] Salir de `/play/rana` elimina listeners y RAF (sin errores en consola al volver).
- [ ] Los demás juegos no cambian de comportamiento.
- [ ] RANA figura en "✅ Hechos" y ya no en "❌ Descartados" de `references/games-suggestion-all.md`.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

---

## 6 — Decisiones tomadas y descartadas

- **Sí:** rescatar RANA de "Descartados" y catalogarla en Acción. Motivo: resuelve la objeción "satura Clásico". — decisión del usuario.
- **No:** categoría Clásico. Motivo: ya tiene `serpiente` y `laberinto`.
- **Sí:** puntuación sin bono de tiempo; el reloj solo mata. Motivo: resuelve la objeción "la puntuación depende del tiempo" y deja un ranking comparable. — decisión del usuario.
- **No:** bono por segundos sobrantes (arcade original) ni partida sin reloj. Motivo: el primero reproduce la objeción; el segundo quita presión.
- **Sí:** mecánica "clásico base": 5 carriles de carretera, 5 de río con troncos y tortugas, 5 casas. — decisión del usuario.
- **No:** tortugas que se sumergen, cocodrilos, mosca, serpiente. Motivo: más reglas y esfuerzo; otro spec si llega.
- **No:** solo carretera. Motivo: se solapa con la sugerencia AUTOPISTA.
- **Sí:** `id` `rana` y título `RANA`. Motivo: slug ya usado por el `game-planner` y nombre propio en español. — decisión del usuario.
- **No:** `frogger` / `FROGGER`. Motivo: marca registrada y rompe la convención de títulos.
- **Sí:** canvas 1280×800 con 20×13 celdas de 64×60 y barra de tiempo de 20 px. Motivo: llena el `CrtFrame` y conserva las 13 filas del clásico. — decisión del usuario.
- **No:** 800×600 vertical (franjas, pequeño en móvil) ni 16×10 (pierde carriles).
- **Sí:** 3 vidas para toda la partida y 30 s por rana. — decisión del usuario.
- **Sí:** un salto por pulsación, sin repetición al mantener. Motivo: fiel al original y evita saltos de más. — decisión del usuario.
- **Sí:** este spec incluye motor, sala, fila de catálogo y carátula; skins y móvil quedan para `skin-designer` y `mobile-porter`. — decisión del usuario.
- **Sí:** `desc`, `long` y `thumb` redactados por el agente. — decisión del agente (pendiente de revisar).
- **Sí:** valores numéricos de `LANES`, puntos (10 / 50 / 500 × nivel), `SPEED_STEP`, `HOP_MS`, `DEATH_MS`, hitboxes y tolerancia de bahía. Motivo: punto de partida ajustable en `/spec-impl` sin cambiar la mecánica. — decisión del agente (pendiente de revisar).
- **Sí:** entrar en una casa suma 60 puntos: los 10 de la fila 0 como fila nueva más los 50 de `POINTS_HOME`. Motivo: el spec admitía dos lecturas (50 o 60); se aclaró durante `/spec-impl` (2026-10-05). — decisión del usuario.
- **Sí:** bahías de 2 columnas con tolerancia de 48 px. Motivo: en un tablero de 20 columnas una bahía de 1 celda sería demasiado estrecha para una rana con `x` continua tras el río. — decisión del agente (pendiente de revisar).
- **Sí:** la posición lógica cambia al iniciar el salto y la animación es solo visual. Motivo: colisiones deterministas y sin estados intermedios. — decisión del agente (pendiente de revisar).
- **Sí:** ignorar las pulsaciones durante un salto, sin cola de entrada. Motivo: con 100 ms de salto una cola provoca saltos no deseados. — decisión del agente (pendiente de revisar).
- **Sí:** el reloj corre desde la aparición de la rana, sin esperar a la primera tecla. Motivo: una sola regla para todas las apariciones. — decisión del agente (pendiente de revisar).
- **Sí:** el nivel solo acelera los carriles; la disposición no cambia. Motivo: una tabla `LANES` única y dificultad predecible. — decisión del agente (pendiente de revisar).
- **Sí:** barra de tiempo dentro del canvas y sin `timeLeft` en `RanaState`. Motivo: evita un re-render de React por frame y no toca la barra de stats. — decisión del agente (pendiente de revisar).
- **Sí:** todos los colores en una constante `PALETTE`. Motivo: el pase de skins la convertirá en `SKIN_PALETTES` sin reescribir el dibujado.
- **No:** incluir `setSkin` y skins en este spec. Motivo: lo hace `skin-designer` como addendum, igual que en Bombardero.
- **No:** pantalla de transición de nivel ni overlay de pausa en el canvas. Motivo: mismo criterio que Serpiente y Bombardero.
- **Sí:** todo el motor en un único `engine.ts`. Motivo: criterio de los cinco motores anteriores.

---

## 7 — Riesgos identificados

| Riesgo                                                                                             | Mitigación                                                                                                                            |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Una combinación de carriles deja un cruce imposible o trivial a velocidades altas.                 | Todos los carriles comparten bucle de 24 celdas y el multiplicador tiene tope 2.2; los valores de `LANES` se ajustan en `/spec-impl`. |
| La rana con `x` continua cae "entre" dos columnas al volver a tierra y el salto se siente injusto. | Ajuste a la columna más cercana al aterrizar en la mediana; tolerancia de 48 px en las bahías.                                        |
| Física dependiente de la frecuencia de pantalla.                                                   | Todo se escala por `dt` real con tope de 50 ms.                                                                                       |
| El mando táctil dispara `keydown` repetidos y encadena saltos.                                     | El motor ignora `e.repeat` y las pulsaciones durante un salto; el layout táctil (addendum) no debe declarar `repeat`.                 |
| `paused` desincronizado entre motor y `PlayRoom`.                                                  | El motor emite `paused` por `onStateChange` en cada cambio (patrón de Serpiente/Bombardero).                                          |
| Sin skins ni mando táctil hasta los addenda, el juego queda incompleto en móvil.                   | Implementar con `/spec-impl-game`, que encadena `skin-designer` y `mobile-porter`.                                                    |

---

## Lo que **no** entra en este spec

- Skins y `setSkin()` (addendum de `skin-designer`).
- Mando táctil y revisión móvil (addendum de `mobile-porter`).
- Tortugas que se sumergen, cocodrilos, mosca, rana acompañante, serpiente.
- Bono de puntos por tiempo.
- Sonido y selección de dificultad.
- Pantalla de transición de nivel dentro del canvas.
- Un registro genérico de juegos en `PlayRoom`.

Cada uno de estos, si se aborda, va en su propio spec o addendum.
