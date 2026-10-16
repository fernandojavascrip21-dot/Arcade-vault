# SPEC 18 — Motor del juego Laberinto

> **Status:** Draft
> **Depends on:** SPEC 06, SPEC 07, SPEC 15, SPEC 17
> **Date:** 2026-10-09
> **Objective:** Crear desde cero el motor del juego LABERINTO (recorrer un laberinto fijo comiendo puntos mientras cuatro guardianes con comportamiento propio te persiguen) e integrarlo en `/play/laberinto`, que hoy es un simulador.

---

## 1 — Por qué existe este spec

LABERINTO es el juego **4. LABERINTO** de "⏳ Pendientes" en `references/games-suggestion-all.md` (Clásico, 33/40, "esfuerzo alto (IA de guardianes)"). Es el último juego del catálogo original que sigue sin motor junto a `invasores`.

A diferencia de Rana (spec 17) y Bombardero (spec 16), **no necesita fila nueva ni carátula**: la fila `laberinto` ya existe en `public.games` y `Laberinto` ya está en `COVERS` de `components/game-cover.tsx`. El texto largo del catálogo ya promete la mecánica: "cuatro guardianes patrullan los pasillos", "las cápsulas de energía invierten la persecución" y "vacía el tablero para pasar al siguiente plano". Este spec la aterriza en números.

No hay `game.js` de referencia en `references/started-games/` ni assets en `references/source-assets/`. El motor se diseña desde cero con primitivas de canvas, con el contrato de los motores anteriores: `createLaberintoEngine(canvas, handlers)`, `LaberintoState` y rama explícita por `game.id` en `play-room.tsx`.

El laberinto es de diseño propio y apaisado (32×20), no una copia del mapa del arcade original, y los guardianes se nombran por su rol.

---

## 2 — Scope

**In:**

- Nuevo módulo `components/games/laberinto/engine.ts` (nuevo): motor completo en un único archivo, framework-free, sin imágenes ni assets.
  - **Canvas 1280×800** (16:10 exacto, llena `CrtFrame` sin franjas).
  - **Tablero 32×20** celdas de 40 px. Ocupa todo el canvas; no hay HUD dentro del canvas.
  - **Laberinto fijo**: la constante `MAZE` de la sección 3 (simétrica izquierda-derecha). Contiene 228 puntos y 4 cápsulas de energía. Es el mismo en todos los niveles.
  - **Jugador**:
    - Arranca en la celda `(15, 11)` mirando a la izquierda.
    - Avanza solo a `PLAYER_SPEED = 160` px/s en su dirección actual y se detiene al chocar con una pared.
    - **Giro en cola**: una pulsación guarda `queuedDir`. Se aplica en el primer centro de celda donde esa dirección esté libre. Se conserva hasta aplicarse o ser sustituida por otra pulsación.
    - Invertir el sentido (180°) se aplica al instante, sin esperar al centro de celda.
    - No puede cruzar la puerta de la base.
  - **Puntos y cápsulas**: se comen cuando el centro del jugador llega al centro de la celda. Comer no frena al jugador.
  - **Túnel lateral**: la fila 9 está abierta en ambos bordes. Quien sale por la columna 0 reaparece en la 31 y viceversa. Los guardianes en estado normal circulan a `TUNNEL_SPEED = 80` px/s en las columnas `0–5` y `26–31` de esa fila.
  - **Cuatro guardianes**, cada uno con un objetivo propio en persecución y una esquina propia en dispersión (tabla `GUARDIANS` de la sección 3):
    - `cazador`: apunta a la celda del jugador.
    - `emboscador`: apunta 4 celdas por delante del jugador.
    - `flanqueador`: toma el punto 2 celdas por delante del jugador y lo refleja respecto a la posición del `cazador` (dobla ese vector).
    - `errante`: a más de 8 celdas del jugador lo persigue; a 8 o menos se retira a su esquina.
  - **Regla de movimiento de los guardianes**: deciden solo en los centros de celda. Nunca invierten el sentido por decisión propia. Entre las salidas libres eligen la de menor distancia euclídea a su objetivo; en empate, el orden es arriba, izquierda, abajo, derecha. El túnel no cuenta como atajo al medir distancias.
  - **Fases** (reloj por vida, se reinicia en cada aparición y cada nivel): dispersión 7 s → persecución 20 s → dispersión 7 s → persecución 20 s → dispersión 5 s → persecución indefinida. Al cambiar de fase todos los guardianes en estado normal invierten el sentido. El reloj de fases se detiene mientras haya una cápsula activa.
  - **Salida de la base**: `cazador` empieza fuera, en `(15, 7)`. `emboscador`, `flanqueador` y `errante` empiezan dentro, en `(14, 9)`, `(16, 9)` y `(18, 9)`, y salen a los 0, 4 y 8 s de cada aparición. Salen por la puerta `(15, 8)` hasta `(15, 7)`.
  - **Cápsula de energía**: todos los guardianes fuera de la base pasan a `vulnerable`, invierten el sentido y circulan a `FRIGHT_SPEED = 90` px/s eligiendo salida al azar en cada cruce (sin invertir). Dura `max(2000, 7000 − (level − 1) × 500)` ms. En los últimos `FRIGHT_WARN_MS = 2000` parpadean. Comer otra cápsula reinicia la duración y la cadena de puntos.
  - **Comer un guardián vulnerable**: suma puntos y lo convierte en `ojos`. Los `ojos` vuelven a `(15, 7)` a `EYES_SPEED = 320` px/s, entran a `(15, 9)`, reviven en estado normal y salen de inmediato. Los `ojos` no dañan ni puntúan.
  - **Colisión**: jugador y guardián chocan cuando sus centros están a menos de `HIT_DISTANCE = 20` px. Con un guardián normal el jugador muere; con uno vulnerable se lo come.
  - **Muerte**: animación de `DEATH_MS = 1000` (guardianes ocultos, jugador que se encoge), resta 1 vida, jugador y guardianes vuelven a sus posiciones iniciales. Los puntos y cápsulas ya comidos no se reponen.
  - **Pausa de preparado**: `READY_MS = 1500` con todo quieto al empezar la partida, tras cada muerte y al empezar cada nivel. Sin texto en el canvas. Las pulsaciones durante esa pausa sí se guardan en `queuedDir`.
  - **Vidas**: `LIVES_START = 3` para toda la partida, sin reponer ni vida extra. Al llegar a 0, `onGameOver(finalScore)` una sola vez y el motor queda congelado hasta `restart()`.
  - **Nivel**: se completa al comer los 228 puntos y las 4 cápsulas. Se suma el bono, `level += 1`, el tablero se rellena, todos vuelven a su posición inicial y hay pausa de preparado. Sin pantalla de transición.
  - **Dificultad por nivel**: velocidad de los guardianes `min(168, 144 + (level − 1) × 6)` px/s y duración de la cápsula según la fórmula de arriba. Nada más cambia.
  - **Puntuación** (entero creciente, compatible con `scores`):
    - `POINTS_DOT = 10` por punto.
    - `POINTS_CAPSULE = 50` por cápsula.
    - Guardianes dentro de una misma cápsula: 200, 400, 800 y 1600.
    - `BONUS_LEVEL = 500 × level` al vaciar el tablero.
    - Un nivel sin comer guardianes vale 2.480 puntos más el bono.
  - **Controles**: `← ↑ ↓ →` / `WASD` dirección, `Escape` / `P` pausa interna sincronizada con `PlayRoom` (patrón de `RanaState.paused`). El motor lee `e.key` y hace `preventDefault` en las teclas de juego. No usa `F` (pantalla completa, spec 15).
  - **Dibujado**: todos los colores viven en una única constante `PALETTE`. Fondo `#000`. Paredes con trazo naranja `#ff8a00` (como la carátula). Puntos `#ffd6a5`. Cápsulas más grandes que parpadean cada 400 ms. Jugador: disco amarillo `#f5ff00` con boca animada orientada a su dirección. Guardianes: cuerpo de cúpula con falda ondulada y dos ojos, `cazador` `#ff2d6f`, `emboscador` `#00e5ff`, `flanqueador` `#39ff14`, `errante` `#b388ff`. Vulnerables `#3a5bff`, alternando con `#ffffff` durante el aviso. `ojos`: solo los dos ojos. Puerta de la base: línea `#ffd6a5`.
  - **Rendimiento** (reglas del spec 17, de nacimiento): un único RAF que `stop()` limpia, `dt` real con tope de 50 ms, movimiento escalado por `dt`, `onStateChange` solo cuando cambia algún campo, sin asignaciones por frame, y las paredes pintadas una vez en un canvas fuera de pantalla que se copia en cada frame.
  - El motor no dibuja "GAME OVER" ni overlay de pausa, ni se reinicia solo con ninguna tecla.
- Nuevo componente `components/games/laberinto/laberinto-game.tsx` (nuevo, "use client"): mismo patrón que `components/games/rana/rana-game.tsx` sin la prop `skin` (refs para callbacks, motor montado una vez, `setPaused` en un efecto, `restart()` por `useImperativeHandle`, canvas 1280×800 con `h-full w-full bg-black object-contain`).
- Rama `game.id === "laberinto"` (bandera `isLaberinto`) en `app/play/[id]/play-room.tsx`:
  - `laberintoGameRef` e `isLaberinto` añadido a `isRealGame` (sin "SIMULAR FIN DE PARTIDA", `ROOM_OVERHEAD_GAME`).
  - `isLaberinto` añadido a la condición de fondo `#000` del `CrtFrame`.
  - Slot `art`: `<LaberintoGame ref={laberintoGameRef} paused={paused} onStateChange={handleLaberintoStateChange} onGameOver={handleLaberintoGameOver} />`.
  - `handleLaberintoStateChange(state)`: `setScore`, `setLives`, `setLevel`, `setPaused(state.paused)`.
  - `handleLaberintoGameOver(finalScore)`: `setScore(finalScore)`, `setPaused(false)`, `setOver(true)`.
  - `keyboardHelp`: `← ↑ ↓ → / WASD MOVER · ESC / P PAUSA`.
  - `replay()`: `if (isLaberinto) { laberintoGameRef.current?.restart(); setLives(3); setLevel(1); }`.
  - La barra de stats (PUNTUACIÓN, VIDAS, NIVEL, JUGADOR) no cambia: `hasBarStats` ya es `true` y VIDAS ya se muestra para todo lo que no sea `serpiente`.
- **Documentación**:
  - `references/games-suggestion-all.md`: pasar LABERINTO y BOMBARDERO (que sigue en "Pendientes" aunque ya es jugable) a "✅ Hechos", renumerar los pendientes que quedan (INVASORES 1, CIEMPIÉS 2) y ajustar el Resumen (Hechos 7, Pendientes 2).
  - `references/implementd-game.md`: mover `laberinto` de "Solo en el catálogo" a "Jugables", con su fila y su ficha.
  - `CLAUDE.md`: añadir `laberinto` (y `bombardero`, que falta) a la lista de juegos jugables de la sección Games.

**Not in:**

| Qué                                                                | Destino     | Motivo                                                                                                                    |
| ------------------------------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------- |
| Skins `clasico` / `retro` / `neon`, `setSkin()` y chips SKIN       | Follow-up   | Addendum del agente `skin-designer` tras la implementación, como en Rana y Bombardero. El motor nace con `PALETTE` única. |
| Entrada `laberinto` en `TOUCH_LAYOUTS` y revisión de la sala móvil | Follow-up   | Addendum del agente `mobile-porter`. Hasta entonces `/play/laberinto` no muestra mando táctil.                            |
| Auditoría de rendimiento                                           | Follow-up   | Addendum del agente `game-performance-booster`. El motor ya nace con las reglas del spec 17.                              |
| Un registro genérico de juegos en `PlayRoom`                       | Spec propio | Refactor de otra área del sistema, con sus propias decisiones.                                                            |
| Objeto de bonificación en el centro                                | No se hace  | Descartado por el usuario: añade temporizador, dibujo y regla de puntuación propios.                                      |
| Vida extra a los 10.000 puntos                                     | No se hace  | Descartado por el usuario: 3 vidas fijas.                                                                                 |
| Varios laberintos en rotación o generación procedural              | No se hace  | Descartado por el usuario: un laberinto fijo.                                                                             |
| Sonido, escenas intermedias, selector de dificultad                | No se hace  | Nadie los pidió y el objetivo se cumple sin ellos.                                                                        |
| Texto de puntos flotante al comer un guardián y congelación breve  | No se hace  | Nadie lo pidió; exige texto dentro del canvas, que ningún motor dibuja.                                                   |

**Constraints:**

- No se toca Supabase: la fila `laberinto` de `games` y las 10 puntuaciones ya guardadas en `scores` (11.250–45.930) se quedan como están.
- `components/game-cover.tsx` y `.cover-laberinto` de `app/globals.css` no cambian.
- Los demás motores, `lib/types.ts`, `components/touch-controller/` y `lib/skin-store.ts` no cambian.

---

## 3 — Modelo de datos

Sin tipos de dominio nuevos (`lib/types.ts` y las tablas `games` y `scores` no cambian). No hay persistencia nueva.

```ts
// components/games/laberinto/engine.ts
export const LABERINTO_WIDTH = 1280;
export const LABERINTO_HEIGHT = 800;

const COLS = 32;
const ROWS = 20;
const CELL = 40; // 32 * 40 = 1280, 20 * 40 = 800

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
const TUNNEL_SLOW_COLS = 6; // columnas 0–5 y 26–31
const PLAYER_START = { col: 15, row: 11 };
const DOOR = { col: 15, row: 8 };
const BASE_EXIT = { col: 15, row: 7 };
const BASE_REVIVE = { col: 15, row: 9 };

const PLAYER_SPEED = 160; // px/s
const GUARDIAN_SPEED = 144; // px/s en nivel 1
const GUARDIAN_SPEED_STEP = 6; // por nivel superado
const GUARDIAN_SPEED_MAX = 168;
const FRIGHT_SPEED = 90;
const EYES_SPEED = 320;
const TUNNEL_SPEED = 80;

const FRIGHT_MS = 7000; // nivel 1
const FRIGHT_STEP_MS = 500; // menos por nivel superado
const FRIGHT_MIN_MS = 2000;
const FRIGHT_WARN_MS = 2000;
const CAPSULE_BLINK_MS = 400;
const READY_MS = 1500;
const DEATH_MS = 1000;
const HIT_DISTANCE = 20; // px entre centros
const MAX_DT_MS = 50;

// Dispersión y persecución alternadas; la última persecución no termina.
const PHASES_MS = [7000, 20000, 7000, 20000, 5000];

const LIVES_START = 3;
const POINTS_DOT = 10;
const POINTS_CAPSULE = 50;
const POINTS_GUARDIAN = [200, 400, 800, 1600];
const BONUS_LEVEL = 500; // multiplicado por el nivel completado

type Direction = "up" | "left" | "down" | "right"; // también el orden de desempate
type GuardianId = "cazador" | "emboscador" | "flanqueador" | "errante";
type GuardianMode = "base" | "normal" | "vulnerable" | "ojos";

const GUARDIANS: Array<{
  id: GuardianId;
  start: { col: number; row: number };
  corner: { col: number; row: number }; // objetivo en dispersión
  releaseMs: number; // desde la aparición
}> = [
  {
    id: "cazador",
    start: { col: 15, row: 7 },
    corner: { col: 30, row: 1 },
    releaseMs: 0,
  },
  {
    id: "emboscador",
    start: { col: 14, row: 9 },
    corner: { col: 1, row: 1 },
    releaseMs: 0,
  },
  {
    id: "flanqueador",
    start: { col: 16, row: 9 },
    corner: { col: 30, row: 18 },
    releaseMs: 4000,
  },
  {
    id: "errante",
    start: { col: 18, row: 9 },
    corner: { col: 1, row: 18 },
    releaseMs: 8000,
  },
];

const AMBUSH_CELLS = 4; // emboscador
const FLANK_CELLS = 2; // flanqueador
const WANDER_CELLS = 8; // errante

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
}

export function createLaberintoEngine(
  canvas: HTMLCanvasElement,
  handlers: LaberintoHandlers,
): LaberintoEngine;
```

```ts
// components/games/laberinto/laberinto-game.tsx
export interface LaberintoGameHandle {
  restart(): void;
}
interface LaberintoGameProps {
  paused: boolean;
  onStateChange: (state: LaberintoState) => void;
  onGameOver: (finalScore: number) => void;
}
```

Reglas internas del motor:

- Coordenadas: origen arriba-izquierda. La celda `(col, row)` ocupa `x = col * 40 .. col * 40 + 40`, `y = row * 40 .. row * 40 + 40`. La posición de cada entidad es su centro en px.
- `MAZE` se lee una vez al crear el motor. Los puntos y cápsulas vivos se guardan en un `Uint8Array(COLS * ROWS)` que se rellena desde `MAZE` en cada nivel y en `restart()`; `dotsLeft` cuenta lo que queda.
- Las entidades se mueven por los pasillos de centro a centro. Si el avance del frame sobrepasa un centro de celda, se detiene en él, decide ahí y gasta la distancia sobrante en la nueva dirección.
- En el túnel, un centro con `x < -20` pasa a `x + 1280` y uno con `x > 1300` pasa a `x − 1280`.
- La puerta `-` y el interior `G` solo son transitables para un guardián que sale de la base o para unos `ojos` que vuelven.
- El objetivo de `emboscador` y `flanqueador` puede caer fuera del tablero o en una pared; solo se usa para medir distancias.
- El reloj de fases, el reloj de cápsula y los de preparado y muerte viven solo en el motor; no se notifican a React.
- `start()` registra `keydown` sobre `window` y el RAF; `stop()` los elimina; `restart()` reinicia tablero, jugador, guardianes, vidas, nivel, puntuación y relojes, y notifica el estado inicial.

---

## 4 — Plan de implementación

1. **Motor — tablero estático.** Crear `components/games/laberinto/engine.ts` con constantes, `MAZE`, `PALETTE`, tipos y una fábrica que dibuja paredes (capa fuera de pantalla), puerta, puntos, cápsulas, jugador y guardianes quietos en sus posiciones iniciales. Check: `npm run build` sin errores.
2. **Componente canvas.** Crear `components/games/laberinto/laberinto-game.tsx` según la sección 2. Check: `npm run build` sin errores.
3. **Integración en `PlayRoom`.** Aplicar las ramas `isLaberinto` de la sección 2 en `app/play/[id]/play-room.tsx`. Check: `/play/laberinto` muestra el laberinto estático llenando el `CrtFrame`, sin "SIMULAR FIN DE PARTIDA"; los demás juegos abren igual que antes.
4. **Motor — jugador.** Bucle RAF con `dt`, teclado (flechas/WASD), avance continuo, giro en cola, inversión inmediata, parada contra pared, túnel lateral. Check: en `/play/laberinto` el jugador recorre todo el laberinto, gira en el primer cruce tras pulsar y cruza el túnel.
5. **Motor — puntos, cápsulas y nivel.** Comer puntos y cápsulas, `POINTS_DOT`, `POINTS_CAPSULE`, `onStateChange` solo en cambio, nivel completado con `BONUS_LEVEL` y relleno del tablero. Check: PUNTUACIÓN sube de 10 en 10; vaciar el tablero sube NIVEL y suma 500.
6. **Motor — guardianes en movimiento.** Regla de movimiento, objetivo de dispersión, salida de la base por tiempo, fases con inversión de sentido, velocidad por nivel y lentitud en el túnel. Check: cada guardián sale a su tiempo y en dispersión rodea su esquina; ninguno atraviesa paredes ni se da la vuelta fuera de un cambio de fase.
7. **Motor — persecución.** Los cuatro objetivos de persecución (`cazador`, `emboscador`, `flanqueador`, `errante`). Check: tras 7 s el `cazador` sigue al jugador y el `errante` se aleja al acercarse a menos de 8 celdas.
8. **Motor — colisión, muerte y fin.** `HIT_DISTANCE`, animación de muerte, vidas, reinicio de posiciones, pausa de preparado, `onGameOver` una sola vez, `setPaused`, pausa interna `Escape`/`P` y `restart()`. Check: tocar un guardián resta 1 vida; perder la tercera abre el modal "FIN DEL JUEGO"; "JUGAR DE NUEVO" reinicia todo.
9. **Motor — cápsula de energía.** Estado `vulnerable`, duración por nivel, parpadeo de aviso, cadena 200/400/800/1600, `ojos` que vuelven a la base y reviven, reloj de fases detenido. Check: comer una cápsula invierte a los guardianes y los vuelve azules; comer los cuatro suma 3.000; los `ojos` entran en la base y salen como guardián normal.
10. **Documentación y remate.** Actualizar `references/games-suggestion-all.md`, `references/implementd-game.md` y `CLAUDE.md` según la sección 2. Check: `npm run lint` y `npm run build` terminan sin errores. Si `next dev` regeneró el bloque de `AGENTS.md`, commitearlo.

---

## 5 — Criterios de aceptación

- [ ] (manual) `/play/laberinto` muestra el canvas 1280×800 llenando el `CrtFrame`, sin franjas y sin "SIMULAR FIN DE PARTIDA".
- [ ] (manual) El laberinto dibujado coincide con `MAZE`: 228 puntos, 4 cápsulas, base central con puerta y túnel abierto en la fila 9.
- [ ] (manual) El jugador avanza solo, se detiene contra una pared y no puede entrar en la base.
- [ ] (manual) Pulsar una dirección antes de un cruce hace que gire al llegar a él; pulsar la dirección contraria lo invierte al instante.
- [ ] (manual) Salir por un borde de la fila 9 hace reaparecer al jugador por el borde opuesto.
- [ ] (manual) Cada punto suma exactamente 10 y cada cápsula 50.
- [ ] (manual) `cazador` empieza fuera de la base; los otros tres salen a los 0, 4 y 8 s.
- [ ] (manual) Durante los primeros 7 s cada guardián se dirige a una esquina distinta; después persiguen, y todos invierten el sentido en el cambio.
- [ ] (manual) Ningún guardián atraviesa paredes ni se da la vuelta fuera de un cambio de fase o de una cápsula.
- [ ] (manual) Tocar un guardián normal resta 1 vida, reproduce la animación de muerte y devuelve a todos a su posición inicial tras 1,5 s quietos; los puntos comidos no reaparecen.
- [ ] (manual) Comer una cápsula vuelve vulnerables a los guardianes que están fuera de la base durante 7 s en el nivel 1, y parpadean los últimos 2 s.
- [ ] (manual) Comer cuatro guardianes con una misma cápsula suma 200, 400, 800 y 1600; una cápsula nueva reinicia la cadena en 200.
- [ ] (manual) Un guardián comido vuelve a la base como ojos, sin dañar al jugador, y sale de nuevo en estado normal.
- [ ] (manual) Vaciar el tablero suma `500 × nivel`, rellena puntos y cápsulas, sube NIVEL en la barra y no repone vidas ni muestra transición.
- [ ] (manual) En el nivel 2 los guardianes son más rápidos que en el 1 y la cápsula dura 6,5 s.
- [ ] (manual) Perder la tercera vida abre el modal "FIN DEL JUEGO" con la puntuación final, una sola vez, y el canvas no dibuja overlay propio.
- [ ] (manual) La barra superior muestra PUNTUACIÓN, VIDAS, NIVEL y JUGADOR actualizados en vivo.
- [ ] (manual) El botón PAUSA y `Escape`/`P` pausan y reanudan, siempre sincronizados; en pausa no avanza ningún reloj del motor.
- [ ] (manual) "GUARDAR PUNTUACIÓN" inserta en `scores` con `game_id = 'laberinto'` y aparece en `/game/laberinto` y `/hall-of-fame` junto a las puntuaciones ya existentes.
- [ ] (manual) "JUGAR DE NUEVO" consume un crédito y reinicia puntuación, vidas, nivel, tablero y posiciones.
- [ ] (manual) La tecla `F` sigue alternando la pantalla completa en `/play/laberinto`.
- [ ] (manual) Salir de `/play/laberinto` y volver no deja errores en la consola (listeners y RAF eliminados).
- [ ] (manual) Los demás juegos no cambian de comportamiento.
- [ ] El motor tiene un único `requestAnimationFrame`, el delta está limitado a 50 ms y las paredes se pintan desde una capa en caché (revisión de `components/games/laberinto/engine.ts`).
- [ ] `select count(*) from scores where game_id = 'laberinto'` devuelve 10 antes de guardar ninguna partida nueva (Supabase intacto).
- [ ] LABERINTO y BOMBARDERO figuran en "✅ Hechos" de `references/games-suggestion-all.md`, y `laberinto` en "Jugables" de `references/implementd-game.md` y en la lista de juegos de `CLAUDE.md`.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

---

## 6 — Decisiones tomadas y descartadas

- **Sí:** cuatro guardianes con objetivo propio y fases de dispersión/persecución. Motivo: es lo que da profundidad al género y lo que promete el catálogo. — decisión del usuario.
- **No:** dos personalidades, o cuatro guardianes iguales con giros al azar. Motivo: se amontonan y el juego se vuelve predecible.
- **Sí:** un único laberinto fijo; el nivel solo acelera a los guardianes y acorta la cápsula. Motivo: dificultad predecible y un solo mapa que ajustar. — decisión del usuario.
- **No:** tres laberintos en rotación ni generación procedural. Motivo: triplican el diseño o arriesgan mapas injustos.
- **Sí:** tablero apaisado 32×20 de 40 px en un canvas 1280×800. Motivo: llena el `CrtFrame`, se ve grande en móvil horizontal y no copia el mapa original. — decisión del usuario.
- **No:** proporción vertical del arcade con franjas laterales. Motivo: pequeño en pantalla y demasiado cercano al original.
- **Sí:** movimiento continuo con giro en cola. Motivo: es el tacto del género y funciona con el D-pad táctil. — decisión del usuario.
- **No:** giro solo en el instante exacto del cruce, ni movimiento paso a paso por celda. Motivo: frustrante o a saltos.
- **Sí:** escala clásica de puntos (10 / 50 / 200–1600 / 500 × nivel). Motivo: queda en el rango de las puntuaciones ya guardadas. — decisión del usuario.
- **Sí:** 3 vidas fijas, sin vida extra. — decisión del usuario.
- **Sí:** túnel lateral; **No:** objeto de bonificación. — decisión del usuario.
- **Sí:** conservar las 10 puntuaciones existentes de `laberinto`. Motivo: son alcanzables con esta escala en 3–8 niveles. — decisión del usuario.
- **Sí:** skins, mando táctil y auditoría de rendimiento como addenda de los agentes. Motivo: patrón de Rana y Bombardero. — decisión del usuario.
- **Sí:** no hay migración de catálogo ni carátula nueva. Motivo: la fila `laberinto` y `COVERS.laberinto` ya existen; se verificó en Supabase y en `components/game-cover.tsx`.
- **Sí:** trazado concreto de `MAZE`. Motivo: se comprobó que es conexo, sin callejones sin salida y sin pasillos de 2 celdas de ancho. — decisión del agente (pendiente de revisar).
- **Sí:** nombres por rol (`cazador`, `emboscador`, `flanqueador`, `errante`) y colores propios. Motivo: evita los nombres y la paleta del original. — decisión del agente (pendiente de revisar).
- **Sí:** paredes naranja `#ff8a00`. Motivo: coincide con la carátula ya publicada y se aleja del azul del original. — decisión del agente (pendiente de revisar).
- **Sí:** valores numéricos de velocidades, `PHASES_MS`, `FRIGHT_MS`, tiempos de salida de la base, `READY_MS`, `DEATH_MS` y `HIT_DISTANCE`. Motivo: punto de partida ajustable en `/spec-impl` sin cambiar la mecánica. — decisión del agente (pendiente de revisar).
- **Sí:** el jugador va a 160 px/s fijos y los guardianes de 144 a 168 px/s. Motivo: al principio se puede huir en línea recta; desde el nivel 5 solo los giros y las cápsulas salvan. — decisión del agente (pendiente de revisar).
- **Sí:** salida de la base por tiempo (0, 4 y 8 s). Motivo: más simple que el contador de puntos comidos del original y fácil de verificar. — decisión del agente (pendiente de revisar).
- **Sí:** el túnel no cuenta como atajo al medir distancias de los guardianes. Motivo: mantiene el túnel como vía de escape real. — decisión del agente (pendiente de revisar).
- **Sí:** comer un punto no frena al jugador y comer un guardián no congela la partida. Motivo: menos estados intermedios. — decisión del agente (pendiente de revisar).
- **Sí:** pausa de preparado sin texto. Motivo: ningún motor dibuja texto de estado en el canvas.
- **Sí:** relojes internos fuera de `LaberintoState`. Motivo: evita un re-render de React por frame.
- **Sí:** todos los colores en una constante `PALETTE` y todo el motor en un único `engine.ts`. Motivo: el pase de skins la convertirá en `SKIN_PALETTES`; criterio de los motores anteriores.
- **Sí:** arreglar de paso la línea de BOMBARDERO en `references/games-suggestion-all.md` y su ausencia en `CLAUDE.md`. Motivo: mismos archivos que ya se editan y sin decisión nueva.

---

## 7 — Riesgos identificados

| Riesgo                                                                                     | Mitigación                                                                                                                |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Con `dt` variable una entidad se salta un centro de celda y atraviesa una pared o no gira. | El avance se parte en el centro de celda: se decide ahí y se gasta el resto en la nueva dirección. Tope de `dt` de 50 ms. |
| Un guardián queda oscilando o atrapado junto a la base o al túnel.                         | Regla sin inversión + desempate fijo; el laberinto no tiene callejones. Se observa en el check del paso 6.                |
| La dificultad queda imposible o trivial en niveles altos.                                  | Velocidad con tope (168 px/s) y cápsula con mínimo (2 s); todos los valores son constantes ajustables en `/spec-impl`.    |
| El mando táctil emite `keydown` repetidos.                                                 | Una pulsación repetida solo reescribe `queuedDir`; no tiene efecto acumulado.                                             |
| `paused` desincronizado entre motor y `PlayRoom`.                                          | El motor emite `paused` por `onStateChange` en cada cambio (patrón de Serpiente, Bombardero y Rana).                      |
| Sin skins ni mando táctil hasta los addenda, el juego queda incompleto en móvil.           | Implementar con `/spec-impl-game`, que encadena `skin-designer`, `mobile-porter` y `game-performance-booster`.            |
| Parecido excesivo con el arcade original.                                                  | Mapa apaisado propio, nombres por rol, paredes naranja y paleta propia; título y `id` ya son `LABERINTO` / `laberinto`.   |

---

## Lo que **no** entra en este spec

- **Follow-up (addendum de este spec):** skins `clasico`/`retro`/`neon` y `setSkin()` (`skin-designer`); entrada en `TOUCH_LAYOUTS` y revisión móvil (`mobile-porter`); auditoría de rendimiento (`game-performance-booster`).
- **Spec propio:** un registro genérico de juegos en `PlayRoom`.
- **No se hace:** objeto de bonificación, vida extra, varios laberintos o generación procedural, sonido, escenas intermedias, selector de dificultad, texto de puntos flotante y congelación al comer un guardián.
