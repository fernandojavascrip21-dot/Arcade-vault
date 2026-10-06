# SPEC 16 — Motor del juego Bombardero

> **Status:** Aprovado
> **Depends on:** SPEC 01, SPEC 06, SPEC 07, SPEC 11
> **Date:** 2026-09-29
> **Objective:** Crear desde cero el motor del juego BOMBARDERO (un biplano que arrasa a bombazos una ciudad generada de forma procedural en cada partida) e integrarlo en `/play/bombardero`, con su fila nueva `bombardero` en la tabla `games`.

---

## 1 — Por qué existe este spec

BOMBARDERO es el juego **3. BOMBARDERO** de la sección "⏳ Pendientes" de `references/games-suggestion-all.md`: categoría Acción, puntuación de evaluación 34/40 (🟡 alternativa), frase de catálogo ya fijada ("Arrasa la ciudad antes de tocar tierra.") y un riesgo/requisito explícito — **la ciudad debe generarse de forma procedural en cada partida para evitar repetición**. Ese documento es la fuente de verdad para categoría y frase; este spec no las reinterpreta, las aterriza en una mecánica concreta y numérica.

A diferencia de los cuatro juegos ya implementados (`asteroides`, `bloques`, `rompemuros`, `serpiente`), BOMBARDERO no tiene ningún `game.js` de referencia en `references/started-games/` ni assets reutilizables en `references/source-assets/` (que hoy solo contiene sprites de Serpiente). Por eso se diseña en modo "desde cero", exactamente como hizo el spec 11 con Serpiente: `createBombarderoEngine(canvas, handlers)`, `BombarderoState`, integración explícita por `game.id` en `play-room.tsx`, y una fila nueva en `public.games` (a diferencia de Serpiente/Rompemuros, que reutilizaron una fila ya existente).

La mecánica central — un biplano que sobrevuela una ciudad, la bombardea y puede estrellarse contra un tejado — no se parece a ningún juego ya implementado ni a los otros tres pendientes del to-do (INVASORES es un disparo vertical contra un enjambre, CIEMPIÉS es un shooter de plataforma fija, LABERINTO es un Pac-Man): aquí el reto es de altitud y puntería contra un terreno que cambia de forma en cada partida, con una ciudad que nunca es igual dos veces (resuelve directamente el riesgo de repetición señalado en el to-do) y una recompensa por volar bajo que le da profundidad rejugable pese a su puntuación de evaluación más modesta (34/40).

---

## 2 — Scope

**In:**

- Nuevo módulo `components/games/bombardero/engine.ts`: motor completo en un único archivo (mismo criterio que los otros cuatro motores), framework-free, sin imágenes ni assets externos (todo se dibuja con primitivas de canvas: rectángulos para la ciudad, una silueta vectorial simple para el biplano, círculos para las bombas, partículas para las explosiones):
  - **Canvas 1280×800** (16:10 exacto, mismo criterio que Serpiente: ocupa toda la caja de `CrtFrame` sin franjas negras).
  - **Ciudad procedural**: 32 columnas de 40 px (`COLUMN_WIDTH = 40`, `COLUMNS = 1280 / 40 = 32`), cada una con una altura en bloques de 20 px (`BLOCK_HEIGHT = 20`, `MAX_BLOCKS = 18`, altura máxima de un edificio = 360 px). Una franja de suelo fija de 8 px (`GROUND_HEIGHT = 8`) ocupa siempre `y = 792..800`; los edificios crecen hacia arriba desde `GROUND_Y = 792`. La ciudad se regenera con `Math.random()` (sin semilla fija) al arrancar la partida y en cada cambio de nivel, así nunca se repite:
    1. `baseHeight = clamp(4 + (level - 1), 4, 12)`.
    2. `heights[0] = clamp(baseHeight + randomInt(-2, 2), 0, MAX_BLOCKS)`.
    3. Para `i = 1..31`: `heights[i] = clamp(heights[i-1] + randomInt(-3, 3), 0, MAX_BLOCKS)` (paseo aleatorio acotado: evita tanto una ciudad plana como saltos imposibles entre columnas vecinas).
    4. `gapChance = max(0.04, 0.12 - (level - 1) * 0.02)`; para cada columna, si `Math.random() < gapChance`, `heights[i] = 0` (plaza/hueco: zona seguro de vuelo bajo y variedad visual).
    5. A partir del nivel 3, si ninguna columna llega a `MAX_BLOCKS`, se fuerza una columna aleatoria a `MAX_BLOCKS` (garantiza al menos un "rascacielos" desafiante por ciudad).
  - **El avión**: rectángulo de colisión de 56×22 px (`PLANE_WIDTH = 56`, `PLANE_HEIGHT = 22`), arranca en `x = 96`, `y = 120`. Avanza solo, en horizontal, a velocidad constante (`PLANE_SPEED_X = 200 + (level - 1) * 15`, tope `380` px/s) y rebota al llegar a 40 px de cualquier borde (vuelo de pasada en pasada, como un bombardero real haciendo corridas sobre el objetivo). El jugador solo controla la altitud: `↑`/`W` sube y `↓`/`S` baja a `PLANE_VERTICAL_SPEED = 220` px/s, acotado entre `PLANE_Y_MIN = 60` y `PLANE_Y_MAX = 760`.
  - **Bombas**: `Espacio` suelta una bomba (círculo de 6 px de radio) en la posición actual del avión, con `BOMB_COOLDOWN_MS = 280` entre disparos y un máximo de `BOMB_MAX_ACTIVE = 6` bombas activas a la vez (las pulsaciones de más se ignoran). Caen en línea recta a `BOMB_SPEED_Y = 320` px/s constante (no heredan la velocidad horizontal del avión: la columna de impacto queda fijada en el momento de soltarlas, para que la puntería sea predecible).
  - **Impacto de una bomba**: al alcanzar la altura actual del edificio de su columna (o el suelo si la columna ya está a 0), la bomba desaparece. Si la columna tenía altura > 0: `heights[col] -= 1`, se suman `POINTS_PER_BLOCK = 15` puntos (`30` si el avión iba a `y ≥ LOW_ALTITUDE_Y = 480` en el momento de soltarla — bono de vuelo bajo, `LOW_ALTITUDE_BONUS_MULTIPLIER = 2`, decidido para dar sentido a arriesgarse a bajar) y se lanzan 8 partículas de escombro (gravedad simple, 500 ms de vida). Si la columna llega a 0 por ese impacto, se suman además `BONUS_BUILDING_CLEARED = 100` puntos, una única vez por edificio. Si la bomba llega al suelo sin edificio que golpear, desaparece sin puntos (con una pequeña nube de polvo).
  - **Colisión avión-edificio (choque)**: cada frame, para las columnas que el ancho del avión cubre en `x`, si la altura actual del edificio en esa columna hace que su borde superior quede a la altura o por debajo del borde inferior del avión, el avión se estrella. Al estrellarse: pierde 1 vida, aparecen 12 partículas de explosión, y el avión reaparece en `x = 96, y = 120` con `INVULNERABLE_MS = 1500` de invulnerabilidad parpadeante (sin colisión) para poder retomar el vuelo con margen. La ciudad ya bombardeada no se regenera al perder una vida (solo el avión reaparece).
  - **Vidas**: `LIVES_START = 3`, se mantienen a través de los niveles (no se resetean al subir de nivel, mismo criterio que Rompemuros con sus 5 niveles). Al llegar a 0, `onGameOver(finalScore)` una sola vez; el motor queda congelado hasta que algo externo llame `restart()`.
  - **Nivel**: se completa cuando todas las columnas llegan a `heights[i] === 0` (ciudad arrasada). Al completarlo: se suman `BONUS_LEVEL_CLEARED = 200 * level` puntos, `level += 1`, se genera una ciudad nueva (paso de generación de arriba, con `baseHeight` y `gapChance` más duros) y sube la velocidad horizontal del avión — todo sin pantalla de transición ni pausa (el vuelo continúa, a diferencia de la transición "Nivel X completado" de Rompemuros — ver decisiones).
  - **Puntuación**: entero creciente, suma de `POINTS_PER_BLOCK`/`30` (bono de altura baja) + `BONUS_BUILDING_CLEARED` + `BONUS_LEVEL_CLEARED * level`, compatible con la tabla `scores`.
  - **Controles**: `↑`/`W` subir, `↓`/`S` bajar, `Espacio` soltar bomba, `Escape`/`P` pausa interna (sincronizada con `PlayRoom`, mismo patrón de `RompemurosState.paused`/`SerpienteState.paused`: el motor notifica `paused` por `onStateChange` cada vez que cambia, sin importar si lo disparó la tecla interna o `setPaused()` externo).
  - **Dibujado**: cielo degradado nocturno (de `#0a0e1a` arriba a `#241238` cerca del suelo) con estrellas fijas (puntos blancos); ciudad con paleta por tramo de altura (1–4 bloques gris azulado `#3a4a5a`, 5–9 magenta oscuro `#6a1f45`, 10–14 violeta `#4a1f7a`, 15–18 cian oscuro `#0f5a6a`), con pequeñas ventanas amarillas dibujadas por patrón; franja de suelo en gris claro; avión como silueta vectorial simple (triángulo + cola) en cian, inclinada ±12° según suba o baje, parpadeante mientras es invulnerable; bombas como círculos amarillos; partículas de explosión en naranja/amarillo. Sin HUD dibujado dentro del canvas (a diferencia de Asteroides/Rompemuros): todo el marcador vive en el HUD externo de `PlayRoom`, igual que Serpiente.
  - El motor no dibuja su propio "GAME OVER" ni transición de nivel, ni se reinicia solo con ninguna tecla.
- Nuevo componente `components/games/bombardero/bombardero-game.tsx` ("use client"): `forwardRef`, mismo patrón que `asteroids-game.tsx`/`serpiente-game.tsx` (refs para callbacks, motor montado una sola vez en un `useEffect`, `setPaused` en un efecto aparte, `restart()` vía `useImperativeHandle`), canvas de 1280×800 con clases `h-full w-full bg-black object-contain`. Props: `paused: boolean`, `onStateChange`, `onGameOver`.
- Rama `game.id === "bombardero"` (bandera `isBombardero`) en `app/play/[id]/play-room.tsx`:
  - `background="#000"` cuando `isBombardero` (se añade a la condición ya existente `isAsteroids || isBloques || isRompemuros || isSerpiente`).
  - Slot `art` del `CrtFrame`: `<BombarderoGame ref={bombarderoGameRef} paused={paused} onStateChange={handleBombarderoStateChange} onGameOver={handleBombarderoGameOver} />`, con `label=""`.
  - El HUD externo ya existente (condición `!isBloques && !isRompemuros`) se muestra sin cambios para este juego: PUNTUACIÓN, VIDAS (♥♥♥), NIVEL y JUGADOR — no hace falta tocar esa condición porque BOMBARDERO no es ni `bloques` ni `rompemuros`.
  - `handleBombarderoStateChange(state)`: `setScore(state.score)`, `setLives(state.lives)`, `setLevel(state.level)`, `setPaused(state.paused)`.
  - `handleBombarderoGameOver(finalScore)`: `setScore(finalScore)`, `setPaused(false)`, `setOver(true)`.
  - Ocultar "SIMULAR FIN DE PARTIDA": añadir `&& !isBombardero` a la condición ya existente.
  - Texto de controles cuando `isBombardero`: `↑ / W SUBIR · ↓ / S BAJAR · ESPACIO SOLTAR BOMBA · ESC / P PAUSA`.
  - En `replay()`: `if (isBombardero) { bombarderoGameRef.current?.restart(); setLives(3); setLevel(1); }`.
- **Nueva fila en `public.games`** (no hay ninguna fila `bombardero` hoy, a diferencia de `rompemuros`/`serpiente` que reutilizaron una existente), insertada como migración con el MCP de Supabase durante `/spec-impl`, nunca desde código de la app:
  - `id`: `bombardero`
  - `title`: `BOMBARDERO`
  - `category`: `Acción`
  - `desc`: `Arrasa la ciudad antes de tocar tierra.` (frase literal del to-do)
  - `long`: `Pilotea un bombardero nocturno sobre una ciudad que se genera de cero en cada partida. Sube y baja para esquivar los tejados y suelta bombas certeras para arrasar cada edificio antes de que uno te alcance. Bombardear a baja altura duplica los puntos, pero un solo roce con un tejado te cuesta una vida.`
  - `thumb`: `linear-gradient(165deg, #0a0e1a 0%, #241238 45%, #ff8a00 100%)` (cielo nocturno a explosión, coherente con la categoría Acción)
  - El pipeline de puntuación (`saveScoreAction`, `lib/supabase/*`) no cambia: ya es genérico por `game_id`.
- Sin assets nuevos que copiar a `public/games/bombardero/`: no hay nada reutilizable en `references/source-assets/` para este juego (solo hay sprites de Serpiente); todo el dibujado es con primitivas de canvas.

**Out of scope (para specs futuros):**

- Sonido (ningún asset de audio disponible para este juego).
- Controles táctiles/móviles.
- Selección de dificultad al estilo Rompemuros (velocidad/multiplicador fijos por nivel, no elegibles).
- Pantalla de transición "Nivel X completado" dentro del canvas (el vuelo continúa sin interrupción al pasar de nivel).
- Carátula pixel-art para `bombardero` en `components/game-cover.tsx` (queda sin cover hasta un spec de arte visual, igual que otras filas de catálogo añadidas antes de su pase de arte — `GameCover` ya devuelve `null` con gracia para cualquier `id` no registrado).
- Un registro genérico de juegos en `PlayRoom` (sigue siendo por rama explícita `game.id === "<slug>"`).
- Cambiar la economía de créditos o `CrtFrame`.
- Escalado por `devicePixelRatio` / mayor resolución de renderizado.
- Guardar o reanudar el estado de una partida en curso al salir con "SALIR".
- Control horizontal manual del avión (se decide que el avance sea automático, ver sección 6).
- Los otros juegos pendientes del to-do (`invasores`, `ciempies`, `laberinto`).

---

## 3 — Modelo de datos

Este feature no introduce ningún tipo de dominio nuevo (no hay cambios a `Game`, `ScoreEntry`, `BoardRow` de `lib/types.ts`, ni a la tabla `scores`). La única persistencia nueva es la fila `bombardero` de `public.games` descrita en la sección 2.

```ts
// components/games/bombardero/engine.ts
export const BOMBARDERO_WIDTH = 1280;
export const BOMBARDERO_HEIGHT = 800;

const COLUMN_WIDTH = 40;
const COLUMNS = 32; // 1280 / 40
const BLOCK_HEIGHT = 20;
const MAX_BLOCKS = 18;
const GROUND_HEIGHT = 8;
const GROUND_Y = BOMBARDERO_HEIGHT - GROUND_HEIGHT; // 792

const PLANE_WIDTH = 56;
const PLANE_HEIGHT = 22;
const PLANE_X_START = 96;
const PLANE_Y_START = 120;
const PLANE_Y_MIN = 60;
const PLANE_Y_MAX = 760;
const PLANE_VERTICAL_SPEED = 220; // px/s mientras se mantiene ↑/↓
const PLANE_SPEED_X_BASE = 200; // px/s en nivel 1
const PLANE_SPEED_X_STEP = 15; // por nivel superado
const PLANE_SPEED_X_MAX = 380;
const PLANE_TURN_MARGIN = 40; // px desde el borde donde rebota
const INVULNERABLE_MS = 1500;

const BOMB_RADIUS = 6;
const BOMB_SPEED_Y = 320; // px/s, constante
const BOMB_COOLDOWN_MS = 280;
const BOMB_MAX_ACTIVE = 6;

const LIVES_START = 3;
const POINTS_PER_BLOCK = 15;
const LOW_ALTITUDE_Y = 480; // y >= esto al soltar la bomba = "vuelo bajo"
const LOW_ALTITUDE_BONUS_MULTIPLIER = 2;
const BONUS_BUILDING_CLEARED = 100;
const BONUS_LEVEL_CLEARED = 200; // multiplicado por el nivel completado

export interface BombarderoState {
  score: number;
  lives: number;
  level: number;
  paused: boolean; // notificado también cuando cambia por Escape/P interno
}

export interface BombarderoHandlers {
  onStateChange(state: BombarderoState): void; // solo cuando cambia
  onGameOver(finalScore: number): void; // una sola vez, al perder la última vida
}

export interface BombarderoEngine {
  start(): void;
  stop(): void;
  setPaused(paused: boolean): void;
  restart(): void;
}

export function createBombarderoEngine(
  canvas: HTMLCanvasElement,
  handlers: BombarderoHandlers,
): BombarderoEngine;
```

```ts
// components/games/bombardero/bombardero-game.tsx
export interface BombarderoGameHandle {
  restart(): void;
}
interface BombarderoGameProps {
  paused: boolean;
  onStateChange: (state: BombarderoState) => void;
  onGameOver: (finalScore: number) => void;
}
```

Reglas internas del motor:

- `heights: number[]` (longitud `COLUMNS`, 0–`MAX_BLOCKS`) es la única fuente de verdad de la ciudad; se regenera por completo (nuevo arreglo) al arrancar la partida y en cada cambio de nivel, siguiendo el algoritmo de la sección 2 — siempre con `Math.random()`, nunca con una semilla fija, para que ninguna ciudad se repita.
- El avión es un único objeto `{ x, y, vx, invulnerableUntil }`; `x`/`vx` los gestiona el propio motor (rebote automático en los bordes), `y` lo mueve el jugador con `↑`/`↓`/`W`/`S`.
- Las bombas activas son un arreglo `Array<{ x: number; y: number; col: number }>`; se les asigna la columna de impacto (`Math.floor(x / COLUMN_WIDTH)`) en el momento de soltarlas y no cambia mientras caen.
- Las partículas son un arreglo simple `{ x, y, vx, vy, life }` con gravedad constante, reutilizado tanto para escombros de edificio como para la explosión del avión; se purgan cuando `life <= 0`.
- Todo movimiento (avión, bombas, partículas) se escala por el tiempo real transcurrido entre frames (`dt`, con tope para evitar saltos tras pausas), no por frame fijo — mismo criterio ya adoptado por Rompemuros para no depender de la frecuencia de pantalla.
- El motor no dibuja overlay de fin de partida ni de "nivel completado" (los pinta React o no existen, ver sección 2), ni escucha ninguna tecla de reinicio.
- Convención: `start()` registra el `keydown`/`keyup` sobre `window` y el RAF; `stop()` los elimina; `restart()` regenera la ciudad desde el nivel 1, reinicia avión, vidas, nivel y puntuación, y notifica el estado inicial.

---

## 4 — Plan de implementación

1. **Migración de catálogo.** Insertar, vía MCP de Supabase, la fila `bombardero` en `public.games` con los valores literales de la sección 2 (`id`, `title`, `category`, `desc`, `long`, `thumb`). Verificación: `select * from games where id = 'bombardero'` devuelve la fila; `/games` (catálogo) y `/game/bombardero` (ficha) ya la muestran, aunque `/play/bombardero` siga en modo simulador hasta el paso 7.
2. **Motor — ciudad y dibujado estático (`components/games/bombardero/engine.ts`).** Crear el archivo con las constantes de la sección 3, la función de generación procedural de `heights`, y un `createBombarderoEngine` que ya dibuja el cielo, la ciudad generada y el avión quieto en su posición inicial (sin lógica de juego todavía). Verificación manual: importarlo temporalmente y ver una ciudad distinta cada vez que se recarga.
3. **Motor — vuelo y controles de altitud.** Añadir el bucle RAF con `dt` real, el avance horizontal automático con rebote en los bordes (`PLANE_TURN_MARGIN`), y el control de altitud con `↑`/`↓`/`W`/`S` acotado a `[PLANE_Y_MIN, PLANE_Y_MAX]`. Verificación manual: el avión cruza la pantalla de un lado a otro y el jugador puede subirlo/bajarlo.
4. **Motor — bombas, impacto y puntuación.** Añadir `Espacio` para soltar bombas (con `BOMB_COOLDOWN_MS` y `BOMB_MAX_ACTIVE`), su caída a velocidad constante, la colisión contra la columna de la ciudad (reduce `heights[col]`, suma `POINTS_PER_BLOCK` o el doble en vuelo bajo, suma `BONUS_BUILDING_CLEARED` al vaciar una columna) y las partículas de escombro. Emitir `onStateChange` solo cuando `score` cambia. Verificación manual: bombardear reduce visualmente los edificios y el marcador externo sube en vivo.
5. **Motor — colisión avión-edificio, vidas, niveles y fin de partida.** Añadir la detección de choque avión-edificio, la pérdida de vida con reaparición e invulnerabilidad parpadeante (`INVULNERABLE_MS`), la detección de ciudad arrasada (regenera la ciudad, sube el nivel, suma `BONUS_LEVEL_CLEARED * level`, sube `PLANE_SPEED_X`), `onGameOver(finalScore)` una sola vez al perder la 3ª vida, `setPaused()` externo y la pausa interna `Escape`/`P` (notificada en `BombarderoState.paused`), y `restart()`. Verificación manual: completar una ciudad genera una nueva y sube el nivel; chocar contra un edificio resta una vida y hace reaparecer al avión; perder las 3 vidas detiene el motor sin overlay propio.
6. **Componente canvas (`components/games/bombardero/bombardero-game.tsx`).** Mismo patrón que `serpiente-game.tsx`: refs para callbacks, motor montado una sola vez, `setPaused` en un efecto, `restart()` por `useImperativeHandle`, canvas 1280×800 con `h-full w-full bg-black object-contain`.
7. **Integración en `PlayRoom`.** Modificar `app/play/[id]/play-room.tsx` según la sección 2: `isBombardero`, `bombarderoGameRef`, `handleBombarderoStateChange`, `handleBombarderoGameOver`, añadir `isBombardero` al fondo negro y a la condición que oculta "SIMULAR FIN DE PARTIDA", nuevo texto de controles, y `restart()` + reseteo de `lives`/`level` en `replay()`. Prueba manual completa en `npm run dev`: entrar a `/play/bombardero`, volar de un lado a otro, subir/bajar, soltar bombas y ver caer edificios, comprobar el bono de puntos al bombardear volando bajo, vaciar una ciudad completa y ver la siguiente (distinta), chocar contra un tejado y ver reaparecer al avión con parpadeo, perder las 3 vidas y ver el modal "FIN DEL JUEGO" con la puntuación real, "GUARDAR PUNTUACIÓN", ver el ranking en `/hall-of-fame` con `game_id = "bombardero"`, "JUGAR DE NUEVO", pausar con el botón y con `Escape`/`P`. Confirmar que el resto de juegos (`asteroides`, `bloques`, `rompemuros`, `serpiente`) no cambia.
8. **Remate.** `npm run build` y `npm run lint` sin errores ni warnings nuevos. Confirmar que no queda ningún listener de teclado ni RAF activo tras navegar fuera de `/play/bombardero`. Si `next dev` regeneró el bloque `<!-- BEGIN:nextjs-agent-rules -->` de `AGENTS.md`, commitearlo junto al resto.

---

## 5 — Criterios de aceptación

- [ ] `/games` y `/game/bombardero` muestran la nueva fila del catálogo (categoría Acción, frase "Arrasa la ciudad antes de tocar tierra.").
- [ ] `/play/bombardero` muestra el canvas del juego (1280×800) ocupando todo el marco de `CrtFrame`, sin franjas negras, y ya no muestra "SIMULAR FIN DE PARTIDA".
- [ ] Cada partida nueva (`restart()` tras "JUGAR DE NUEVO" o recargar la página) genera una ciudad con un perfil de alturas distinto al de la partida anterior.
- [ ] `↑`/`W` sube el avión y `↓`/`S` lo baja, sin salir de `[60, 760]`; el avión cruza la pantalla solo y rebota en los bordes sin intervención del jugador.
- [ ] `Espacio` suelta una bomba (respetando el cooldown de 280 ms y el máximo de 6 activas) que cae en línea recta y reduce en 1 bloque el edificio de su columna al impactar.
- [ ] Destruir un bloque de edificio suma exactamente 15 puntos, o 30 si el avión estaba a `y ≥ 480` al soltar la bomba.
- [ ] Vaciar por completo un edificio suma 100 puntos adicionales una sola vez.
- [ ] Vaciar toda la ciudad suma `200 × nivel` puntos, genera una ciudad nueva y aumenta la velocidad horizontal del avión, sin pantalla de transición ni pérdida de vidas.
- [ ] Chocar el avión contra un tejado resta 1 vida, muestra una explosión, y hace reaparecer al avión en su posición inicial con parpadeo de invulnerabilidad durante 1.5 s.
- [ ] Perder la 3ª vida abre el modal "FIN DEL JUEGO" con la puntuación final correcta; `onGameOver` se llama una sola vez y el motor no dibuja ningún overlay propio.
- [ ] El HUD externo muestra PUNTUACIÓN, VIDAS (♥♥♥), NIVEL y JUGADOR, actualizados en vivo.
- [ ] El botón "PAUSA" y las teclas `Escape`/`P` pausan y reanudan el vuelo; ambos quedan siempre sincronizados con el estado real del motor.
- [ ] "GUARDAR PUNTUACIÓN" guarda una fila en `scores` con `game_id = 'bombardero'` y aparece en el ranking de `/game/bombardero` y en `/hall-of-fame`.
- [ ] "JUGAR DE NUEVO" consume un crédito, reinicia puntuación, vidas, nivel y genera una ciudad nueva.
- [ ] Navegar fuera de `/play/bombardero` elimina los listeners de teclado y el RAF (sin errores en consola al volver, sin efecto sobre otras páginas).
- [ ] El resto de juegos (`asteroides`, `bloques`, `rompemuros`, `serpiente`) y los aún simulados (`invasores`, `laberinto`) no cambian de comportamiento.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

---

## 6 — Decisiones tomadas y descartadas

- **Sí:** diseñar el motor desde cero (modo "sin carpeta de referencia"), igual que Serpiente. Motivo: no existe `game.js` ni assets reutilizables para BOMBARDERO en `references/`. — decisión del agente (pendiente de revisar).
- **Sí:** tomar categoría ("Acción"), frase de catálogo ("Arrasa la ciudad antes de tocar tierra.") y el riesgo principal (regeneración procedural de la ciudad) literalmente de `references/games-suggestion-all.md`, sin reinterpretarlos. Motivo: es la fuente de verdad ya aprobada para este juego; solo faltaba concretarlos en mecánica numérica.
- **Sí:** generar la ciudad con `Math.random()` (paseo aleatorio acotado + huecos + garantía de un rascacielos desde el nivel 3), sin semilla fija, tanto al iniciar partida como en cada nivel. Motivo: resuelve de forma directa el riesgo señalado en el to-do ("la ciudad debe generarse de forma procedural en cada partida para evitar repetición"). — decisión del agente (pendiente de revisar).
- **Sí:** canvas 1280×800 (16:10 exacto, llena la `CrtFrame` sin franjas), igual que Serpiente, en vez de un canvas 4:3 letterboxeado como Asteroides/Rompemuros. Motivo: es un juego de vuelo horizontal amplio; un 4:3 recortaría el campo de visión lateral que necesita el avance de pasada en pasada. — decisión del agente (pendiente de revisar).
- **Sí:** avance horizontal automático del avión (rebote en los bordes) y control del jugador limitado a la altitud + soltar bombas. Motivo: mantiene los controles aprendibles en segundos (2 teclas + disparo + pausa) y concentra el reto en la puntería/altitud, que es el corazón de la mecánica descrita en la frase de catálogo. — decisión del agente (pendiente de revisar).
- **No:** control horizontal manual del avión (acelerar/frenar/invertir el sentido de vuelo a voluntad). Motivo: añadiría una dimensión de control redundante con la de altitud sin aportar profundidad proporcional al esfuerzo; se descarta como sobre-ingeniería para un juego "alternativo" (34/40). — decisión del agente (pendiente de revisar).
- **No:** que el avión reaparezca (`wrap`) al llegar al borde, como en Asteroides. Motivo: un rebote (vuelo de pasada en pasada) es más legible sobre una ciudad fija que un teletransporte instantáneo al otro lado. — decisión del agente (pendiente de revisar).
- **Sí:** bono de puntuación ×2 por bombardear "a baja altura" (`y ≥ 480` al soltar la bomba). Motivo: sin este bono, bajar de altitud solo añade riesgo de choque sin ninguna recompensa (la puntería no mejora con la altura, ya que las bombas caen en línea recta); el bono crea una decisión de riesgo/recompensa real en cada pasada, dándole profundidad rejugable al margen del riesgo de repetición ya resuelto con la ciudad procedural. — decisión del agente (pendiente de revisar).
- **No:** que la bomba herede la velocidad horizontal del avión al caer. Motivo: haría la puntería dependiente de la velocidad de vuelo (variable por nivel) y menos predecible; se prefiere una caída vertical fija, más legible en un juego de puntería. — decisión del agente (pendiente de revisar).
- **Sí:** 3 vidas que se mantienen a través de los niveles (no se resetean al completar una ciudad), igual que Rompemuros con sus 5 niveles. Motivo: coherencia con el precedente ya establecido para juegos con niveles múltiples; una vida sola (como Serpiente) sería demasiado punitivo para un juego con colisión constante contra el terreno. — decisión del agente (pendiente de revisar).
- **Sí:** invulnerabilidad parpadeante de 1.5 s tras reaparecer. Motivo: sin ella, reaparecer sobre una ciudad ya parcialmente bombardeada podría encadenar choques instantáneos si el jugador no recupera el control a tiempo. — decisión del agente (pendiente de revisar).
- **No:** pantalla de transición "Nivel X completado" dentro del canvas, a diferencia de Rompemuros. Motivo: el vuelo es continuo por diseño (el avión nunca se detiene); interrumpirlo para mostrar un cartel rompería el ritmo de "pasada tras pasada" que define al juego. El nivel ya se refleja en el HUD externo. — decisión del agente (pendiente de revisar).
- **No:** HUD dibujado dentro del canvas (a diferencia de Asteroides/Rompemuros), a favor de usar solo el HUD externo de `PlayRoom`, igual que Serpiente. Motivo: evita duplicar la misma información y simplifica el dibujado de un motor ya con bastantes elementos (ciudad, avión, bombas, partículas). — decisión del agente (pendiente de revisar).
- **No:** overlay de pausa propio dentro del canvas (a diferencia de Rompemuros, que mantiene uno dual). Motivo: sin HUD propio dentro del canvas, un segundo overlay de pausa sería redundante con "EN PAUSA" de React — mismo criterio que adoptó Serpiente. — decisión del agente (pendiente de revisar).
- **Sí:** pausa interna `Escape`/`P` sincronizada vía `BombarderoState.paused`, mismo mecanismo ya probado en Rompemuros/Serpiente. Motivo: un solo estado de verdad entre el botón "PAUSA" externo y la tecla interna. — decisión del agente (pendiente de revisar).
- **Sí:** crear una fila nueva en `public.games` (no hay ninguna fila `bombardero` existente, a diferencia de `rompemuros`/`serpiente`). Motivo: confirmado por el propio to-do ("fila nueva en `games`"); valores de `id`/`title`/`category`/`desc` tomados literalmente, `long` y `thumb` redactados por el agente al no estar definidos en la fuente. — decisión del agente (pendiente de revisar) en cuanto a `long` y `thumb`.
- **No:** copiar o reutilizar assets de `references/source-assets/`. Motivo: esa carpeta solo contiene sprites de Serpiente (frutas), sin nada aplicable a un biplano o una ciudad; todo el dibujado usa primitivas de canvas, como ya hacen Asteroides y Serpiente para sus naves/serpiente. — decisión del agente (pendiente de revisar).
- **No:** agregar una carátula pixel-art para `bombardero` en `components/game-cover.tsx`. Motivo: ningún spec de motor (06/08/10/11) toca ese archivo; es un pase de arte visual independiente, fuera del contrato reutilizable de `/add-game`. `GameCover` ya renderiza `null` con gracia para IDs sin cover. — decisión del agente (pendiente de revisar).
- **No:** sonido, controles táctiles, selección de dificultad elegible. Motivo: heredado del criterio de los specs 06/08/10/11 y sin assets de audio disponibles para este juego. — decisión del agente (pendiente de revisar).
- **Sí:** todo el motor en un único `engine.ts`. Motivo: mismo criterio de los cuatro motores anteriores.

---

## 7 — Riesgos identificados

| Riesgo                                                                                                                                                                                | Mitigación                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El paseo aleatorio de alturas podría producir, por mala suerte, una ciudad casi plana o sin huecos, restando variedad visual entre partidas.                                          | Los deltas de altura están acotados (`-3..+3` por columna) y hay una probabilidad mínima garantizada de plaza (`gapChance ≥ 0.04`) y de al menos un rascacielos desde el nivel 3 — variedad mínima garantizada sin fijar una semilla.         |
| Física dependiente de la frecuencia de pantalla: mover el avión/las bombas una cantidad fija por frame haría el juego más rápido en monitores de 120/144 Hz.                          | Todo el movimiento se escala por `dt` real (tiempo entre frames), con tope para evitar saltos tras pausas o cambios de pestaña — mismo criterio ya adoptado por Rompemuros.                                                                   |
| El balance de la colisión avión-edificio puede resultar demasiado punitivo (choques que se sienten injustos) o demasiado permisivo (nunca se choca) según cómo quede el hitbox final. | La invulnerabilidad de 1.5 s tras reaparecer y el margen de rebote en los bordes (`PLANE_TURN_MARGIN`) dan colchón; los valores numéricos de la sección 3 son el punto de partida y pueden ajustarse en `/spec-impl` sin cambiar la mecánica. |
| Ciudad oscura sobre cielo nocturno: si `CrtFrame` alguna vez dejara de forzar fondo negro para este juego, la paleta oscura podría perder contraste en tema claro.                    | El fondo del `CrtFrame` se fija en `#000` para `isBombardero` (igual que los otros cuatro motores reales), así que el tema claro/oscuro de la plataforma no afecta el lienzo interno del juego.                                               |

---

## Lo que **no** entra en este spec

- Sonido, controles táctiles, selección de dificultad elegible.
- Pantalla de transición "Nivel X completado" dentro del canvas.
- Carátula pixel-art para `bombardero` en `components/game-cover.tsx`.
- Un registro genérico de juegos en `PlayRoom`.
- Control horizontal manual del avión.
- Cambios a la economía de créditos o a `CrtFrame`.
- Escalado por `devicePixelRatio` / mayor resolución de renderizado.
- Persistir o reanudar una partida abandonada al salir con "SALIR".
- Los otros juegos pendientes del to-do (`invasores`, `ciempies`, `laberinto`).

Cada uno de estos, si se aborda, va en su propio spec.
