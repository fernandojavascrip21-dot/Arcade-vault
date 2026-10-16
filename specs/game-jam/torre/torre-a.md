# SPEC TORRE — Motor del juego Torre (Enfoque A: variante clásica, bloque deslizante que se recorta)

> **Status:** Draft
> **Depends on:** SPEC 01, SPEC 06, SPEC 07, SPEC 11, SPEC 15, SPEC 17
> **Date:** 2026-10-15
> **Objective:** Crear desde cero el motor de Torre (un bloque que se desliza de lado a lado y se suelta sobre la torre; lo que sobresale se corta y la torre se estrecha) e integrarlo en `/play/torre`, con su fila nueva `torre` en la tabla `games` (categoría nueva "Casual") y su carátula de catálogo.

---

## 1 — Por qué existe este spec

TORRE es el juego de apilar bloques "hasta el cielo": una sola tecla, una decisión de tiempo por bloque y una torre que crece sin fin. El `game-planner` la dejó en "⏳ Pendientes" de `references/games-suggestion-all.md` (37/40, frase "Apila sin fallar y llega al cielo.") con dos riesgos: **se parece a BLOQUES** y **las partidas son muy cortas**. Hay dos specs de la misma TORRE (mismo id, categoría y fila de catálogo); este es el **Enfoque A: variante clásica**. El otro (`torre-b.md`) resuelve los mismos riesgos con una mecánica distinta.

**Cómo aterriza la idea en el Enfoque A.** Un bloque de 40 px de alto se desliza horizontalmente sobre la torre; `ESPACIO` lo suelta. Lo que no apoya sobre el piso de abajo se **corta y cae**; el bloque que queda es más estrecho, así que cada fallo hace la torre más difícil. La partida termina en el primer bloque que no apoya (una sola vida). Es la mecánica "Stack" de un solo eje: máxima legibilidad, curva de dificultad que el propio jugador se fabrica.

**Cómo resuelve los dos riesgos:**

- _Se parece a BLOQUES_: aquí no hay rejilla, piezas ni líneas; el movimiento es continuo y de un solo eje, con una sola decisión (cuándo soltar), cámara que sube y fondo por altitud. Ningún elemento de BLOQUES se reutiliza.
- _Partidas muy cortas_: (1) **tolerancia de acierto** de 8 px que se ajusta al piso (perfecto) y (2) **recuperación de anchura**: tras 3 perfectos seguidos cada perfecto devuelve 24 px a la torre (hasta 400 px). Un jugador atento se recupera de los errores en vez de morir por acumulación. (3) La velocidad parte lenta (260 px/s) y sube solo 30 px/s cada 10 pisos.

Es un juego creado desde cero siguiendo el contrato de los specs 06/08/10/11 (sin código ni assets de referencia, igual que Serpiente, Bombardero y Rana).

---

## 2 — Scope

**In:**

- Nuevo módulo `components/games/torre/engine.ts`: motor completo en un único archivo, framework-free, sin imágenes (todo con primitivas de canvas).
  - **Canvas 1280×800** (16:10 exacto, llena `CrtFrame` sin franjas).
  - **Mundo**: suelo en `y = 720..800`. Bloques de **40 px** de alto. Piso 0 = plataforma base de 400 px de ancho en `x = 440..840`, `y = 680..720` (no cuenta como piso ni puntúa).
  - **Bloque móvil**: aparece justo encima de la torre (`y = topY − 40`) con el ancho del piso actual y se desliza en `x ∈ [40, 1240 − w]`, rebotando en los extremos. Arranca desde el extremo izquierdo si el siguiente piso es par y desde el derecho si es impar.
  - **Velocidad**: `min(640, 260 + 30 × (level − 1))` px/s.
  - **Arranque**: 600 ms de bloque quieto (`START_DELAY_MS`) en la partida nueva y en `restart()`; después se mueve solo. `ESPACIO` durante esos 600 ms se ignora.
  - **Soltar**: `ESPACIO`, `↓` o `S`. Se ignora `e.repeat` y se ignora durante la caída, la animación de fallo y la pausa. Soltar es instantáneo en la lógica (la caída de 90 ms es solo visual).
  - **Resolución del soltado** (sea `x, w` el bloque y `tx, tw` el piso superior):
    1. Si `|x − tx| ≤ 8` (`PERFECT_TOL`): **perfecto**. El bloque se ajusta a `x = tx`, `w = tw` y no se corta nada.
    2. Si no: `overlap = min(x + w, tx + tw) − max(x, tx)`. Si `overlap < 12` (`MIN_OVERLAP`, incluye no solapar) la partida termina (ver abajo).
    3. Si no: el bloque queda con `w = overlap`, `x = max(x, tx)`; el trozo sobrante se convierte en un fragmento que cae girando (900 ms, solo visual).
  - **Recuperación de anchura**: en un perfecto con `streak ≥ 3` el bloque gana `24` px (`x −= 12`, `w += 24`), con tope `w ≤ 400`.
  - **Racha** (`streak`): +1 por perfecto, vuelve a 0 con cualquier colocación no perfecta.
  - **Puntuación** (entero creciente, compatible con `scores`):
    - Colocación no perfecta: `10` puntos.
    - Perfecto: `10 + 10 × min(streak, 10)` (20, 30, 40… hasta 110 con racha ≥ 10; `streak` ya incluye este perfecto).
    - Sin bono por tiempo ni por altura.
  - **Piso / nivel**: `floors` = bloques colocados. `level = 1 + floor(floors / 10)`; el nivel solo acelera el deslizamiento.
  - **Fin de partida**: al soltar con `overlap < 12`, el bloque cae entero fuera de pantalla (`FAIL_MS = 700`) y entonces se llama a `onGameOver(finalScore)` **una sola vez**; el motor queda congelado hasta `restart()`. Una sola vida.
  - **Cámara**: `camY = max(0, 560 − topY)` con `topY = 680 − 40 × floors`; el movimiento de cámara se suaviza con `lerp` a `8 / s`. El bloque móvil siempre se ve a `y ≈ 520` en pantalla desde el piso 5.
  - **Fondo por altitud**: 4 franjas de 25 pisos (`band = min(3, floor(floors / 25))`): amanecer azul, cielo con nubes, atmósfera violeta, espacio con estrellas. Cambio con fundido de 800 ms.
  - **HUD en el canvas** (mínimo): `PISO NN` arriba a la izquierda y un rótulo `PERFECTO ×N` de 800 ms sobre el bloque cuando hay racha ≥ 2. No dibuja puntuación ni nivel (los muestra el HUD de `PlayRoom`).
  - **Controles**: `ESPACIO` / `↓` / `S` soltar, `Escape` / `P` pausa interna sincronizada con `PlayRoom` (mismo patrón que `SerpienteState.paused`). El motor lee `e.code`/`e.key`, hace `preventDefault` en las teclas de juego y no usa `F` (pantalla completa, spec 15).
  - **Dibujado**: todos los colores en una constante `PALETTE` (facilita el pase de skins posterior); 8 colores de bloque que ciclan por piso.
  - El motor no dibuja "GAME OVER" ni overlay de pausa ni se reinicia con ninguna tecla.
- Nuevo componente `components/games/torre/torre-game.tsx` ("use client"): `forwardRef`, refs para callbacks, motor montado una vez, `setPaused` en un efecto, `restart()` por `useImperativeHandle`, canvas 1280×800 con `h-full w-full bg-black object-contain`.
- Rama `game.id === "torre"` (bandera `isTorre`) en `app/play/[id]/play-room.tsx`:
  - `torreGameRef` e `isTorre` añadido a `isRealGame` (fondo `#000`, sin "SIMULAR FIN DE PARTIDA", `ROOM_OVERHEAD_GAME`).
  - Slot `art` del `CrtFrame`: `<TorreGame ref={torreGameRef} paused={paused} onStateChange={handleTorreStateChange} onGameOver={handleTorreGameOver} />`, con `label=""`.
  - HUD externo: PUNTUACIÓN, NIVEL y JUGADOR; **sin VIDAS** (una sola vida), como `serpiente`.
  - `handleTorreStateChange(state)`: `setScore`, `setLevel`, `setPaused(state.paused)`. `handleTorreGameOver(finalScore)`: `setScore(finalScore)`, `setPaused(false)`, `setOver(true)` (modal "FIN DEL JUEGO").
  - `keyboardHelp`: `ESPACIO / ↓ SOLTAR · ESC / P PAUSA`.
  - `replay()`: `spendCredit()` y `if (isTorre) { torreGameRef.current?.restart(); setLevel(1); }`.
- **Categoría nueva "Casual"** (decisión del usuario): añadir `"Casual"` a `CategoryLabel` en `lib/types.ts` y a `CATEGORIES` en `app/data.ts` (después de "Puzzle"), para que `/games` muestre el filtro CASUAL.
- **Nueva fila en `public.games`**, insertada como migración con el MCP de Supabase durante `/spec-impl`, nunca desde código de la app. El pipeline de puntuación (`saveScoreAction`, `lib/supabase/*`) no cambia. **Esta fila es idéntica en los dos enfoques**:
  - `id`: `torre`
  - `title`: `TORRE`
  - `category`: `Casual`
  - `desc`: `Apila sin fallar y llega al cielo.`
  - `long`: `Suelta cada bloque justo encima del anterior y levanta la torre lo más alto que puedas. Cuanto mejor lo coloques, más puntos suma y más rápido se mueve el siguiente. Un descuido y la torre se resiente: ¿hasta qué piso llegas?`
  - `thumb`: `linear-gradient(180deg, #0b1a3a 0%, #2f6fd0 55%, #f5b84a 100%)`
- **Carátula** en `components/game-cover.tsx`: nuevo componente `Torre` registrado en `COVERS` bajo `torre`, con el mismo `Frame` (viewBox 160×100): cinco bloques apilados con ligeros desajustes sobre el suelo y un fragmento cayendo. Solo SVG estático.
- Documentación: `references/implementd-game.md` (fila y ficha de TORRE en "Jugables") y `CLAUDE.md` (añadir `torre` a la lista de juegos jugables). `references/games-suggestion-all.md` **no** lo toca este spec: lo actualiza el agente `game-planner`.
- Sin assets de `references/source-assets/` (todo es geometría).

**Out of scope (para specs futuros o addenda):**

- Skins `clasico`/`retro`/`neon`, `setSkin()` y chips SKIN: addendum de `skin-designer` tras `/spec-impl`.
- Entrada en `TOUCH_LAYOUTS` (acción `ESPACIO`) y revisión de la sala móvil: addendum de `mobile-porter`.
- Optimización de rendimiento (capas estáticas, `shadowBlur`): addendum de `game-performance-booster`.
- Sonido, bloques con ancho variable, objetos de bonificación, viento, modo de dos jugadores.
- Vidas o continuaciones (es la identidad del otro enfoque).
- Bono por tiempo o por altura.
- Cambios en `CrtFrame`, en el sistema de créditos, `devicePixelRatio` y reanudar partidas.
- Un registro genérico de juegos en `PlayRoom`.

---

## 3 — Modelo de datos

Sin tipos de dominio nuevos (`lib/types.ts` solo amplía la unión `CategoryLabel`; la tabla `scores` no cambia). La única persistencia nueva es la fila `torre` de `public.games`.

```ts
// components/games/torre/engine.ts
export const TORRE_WIDTH = 1280;
export const TORRE_HEIGHT = 800;

const GROUND_Y = 720;
const BLOCK_H = 40;
const BASE_X = 440;
const BASE_WIDTH = 400; // también el ancho máximo recuperable
const SLIDE_MIN_X = 40;
const SLIDE_MAX_X = 1240; // borde derecho máximo del bloque

const START_DELAY_MS = 600;
const SPEED_BASE = 260; // px/s en nivel 1
const SPEED_STEP = 30; // por nivel superado
const SPEED_MAX = 640;
const FLOORS_PER_LEVEL = 10;

const PERFECT_TOL = 8; // px entre x del bloque y x del piso
const MIN_OVERLAP = 12; // por debajo, fin de partida
const REGROW_STREAK = 3;
const REGROW_PX = 24;

const POINTS_PLACE = 10;
const POINTS_PERFECT_STEP = 10;
const STREAK_CAP = 10;

const CAMERA_TARGET_Y = 560; // y de pantalla de la cima de la torre
const CAMERA_LERP = 8; // por segundo
const DROP_MS = 90; // caída visual
const DEBRIS_MS = 900;
const FAIL_MS = 700;
const MAX_DT_MS = 50;

interface Floor {
  x: number; // borde izquierdo, px
  w: number; // ancho, px
}

export interface TorreState {
  score: number;
  level: number;
  floors: number;
  paused: boolean; // notificado también cuando cambia por Escape/P interno
}

export interface TorreHandlers {
  onStateChange(state: TorreState): void; // solo cuando cambia
  onGameOver(finalScore: number): void; // una sola vez, al soltar sin apoyo
}

export interface TorreEngine {
  start(): void;
  stop(): void;
  setPaused(paused: boolean): void;
  restart(): void;
}

export function createTorreEngine(
  canvas: HTMLCanvasElement,
  handlers: TorreHandlers,
): TorreEngine;
```

```ts
// components/games/torre/torre-game.tsx
export interface TorreGameHandle {
  restart(): void;
}
interface TorreGameProps {
  paused: boolean;
  onStateChange: (state: TorreState) => void;
  onGameOver: (finalScore: number) => void;
}
```

Reglas internas del motor:

- La lógica solo necesita el último piso (`top: Floor`) y el contador `floors`; para dibujar se conserva un arreglo acotado de los pisos visibles (≤ 20), reiniciado en `restart()`.
- Coordenadas de mundo con `y` hacia abajo; el piso `k` (base = 0) ocupa `y = 680 − 40k .. 720 − 40k`. Pantalla = mundo + `camY`.
- Fragmentos: pool fijo de 6 `{x, y, w, vy, rot}`; se reutilizan sin asignar por frame.
- Todo movimiento se escala por `dt` real con tope `MAX_DT_MS`.
- `start()` registra `keydown` sobre `window` y el RAF; `stop()` los elimina; `restart()` reinicia torre, racha, puntuación, nivel y cámara y notifica el estado inicial.

---

## 4 — Plan de implementación

1. **Migración y categoría.** Comprobar con el MCP si `games.category` tiene un `check`/enum que excluya "Casual"; si lo tiene, ampliarlo en la misma migración. Insertar la fila `torre` con los valores literales de §2. Añadir `"Casual"` a `CategoryLabel` y a `CATEGORIES`. Verificación: `select * from games where id = 'torre'`; `/games` muestra el filtro CASUAL y la tarjeta; `/game/torre` carga; `/play/torre` sigue en modo simulador.
2. **Carátula.** Añadir `Torre` a `COVERS` en `components/game-cover.tsx`. Verificación: la tarjeta de `/games` muestra la carátula, también en tema claro.
3. **Motor — escena estática.** Crear `engine.ts` con constantes, `PALETTE`, tipos y una fábrica que dibuja fondo, suelo, base y un bloque quieto. Verificación: montar temporalmente y ver la escena a 1280×800.
4. **Motor — deslizamiento y soltado.** RAF con `dt` (tope 50 ms), rebote, velocidad por nivel, arranque con 600 ms de espera, entrada de teclado (sin `repeat`), corte, perfecto con ajuste, recuperación de anchura y fragmentos.
5. **Motor — puntuación, nivel, cámara y fin.** Racha, puntos, `level`, cámara con `lerp`, fondo por altitud, rótulos `PISO` y `PERFECTO ×N`, `onStateChange` solo al cambiar, `onGameOver` una sola vez tras `FAIL_MS`, `setPaused`, pausa interna `Escape`/`P` y `restart()`.
6. **Componente canvas.** Crear `torre-game.tsx` según §2.
7. **Integración en `PlayRoom`.** Aplicar las ramas `isTorre` de §2. Prueba manual completa en `npm run dev`: jugar, perfectos y racha, recuperar anchura, fallar y ver el modal, guardar puntuación, jugar de nuevo, pausar con botón y con tecla.
8. **Remate.** Documentación de §2, `npm run build` y `npm run lint` sin errores, sin listeners activos al salir de `/play/torre`; commitear el bloque de `AGENTS.md` si `next dev` lo regeneró.

---

## 5 — Criterios de aceptación

- [ ] `/games` muestra el filtro CASUAL y TORRE en él con la frase "Apila sin fallar y llega al cielo." y su carátula; `/game/torre` carga.
- [ ] `/play/torre` muestra el canvas 1280×800 llenando el `CrtFrame`, sin franjas y sin "SIMULAR FIN DE PARTIDA".
- [ ] El primer bloque permanece quieto 600 ms y luego se desliza; `ESPACIO`, `↓` y `S` lo sueltan; mantener la tecla no encadena soltados.
- [ ] Un bloque soltado con 30 px de desfase queda con 30 px menos de ancho y el sobrante cae girando.
- [ ] Un soltado con desfase ≤ 8 px conserva el ancho exacto del piso inferior (perfecto) y suma exactamente 20 puntos si es el primero.
- [ ] La racha de perfectos puntúa 20, 30, 40… hasta 110; cualquier colocación no perfecta suma 10 y reinicia la racha.
- [ ] Tras 3 perfectos seguidos, cada perfecto siguiente devuelve 24 px de ancho, sin pasar de 400 px.
- [ ] Con 10 pisos el HUD externo muestra NIVEL 02 y el bloque se mueve a 290 px/s; la velocidad nunca pasa de 640 px/s.
- [ ] Soltar con solapamiento < 12 px (o sin solapar) hace caer el bloque, abre el modal "FIN DEL JUEGO" tras ~700 ms con la puntuación final correcta, y `onGameOver` se llama una sola vez.
- [ ] La cámara sube con la torre; el bloque móvil nunca sale de pantalla ni cambia de altura visible desde el piso 5.
- [ ] El fondo cambia de franja en los pisos 25, 50 y 75 con fundido, sin saltos bruscos.
- [ ] El canvas muestra `PISO NN` y el HUD externo PUNTUACIÓN, NIVEL y JUGADOR, y no muestra VIDAS.
- [ ] El botón PAUSA y `Escape`/`P` pausan y reanudan, siempre sincronizados; el bloque no avanza en pausa.
- [ ] "GUARDAR PUNTUACIÓN" inserta en `scores` con `game_id = 'torre'` y aparece en `/game/torre` y `/hall-of-fame`.
- [ ] "JUGAR DE NUEVO" consume un crédito y reinicia puntuación, nivel, pisos y racha.
- [ ] La tecla `F` sigue alternando la pantalla completa en `/play/torre`.
- [ ] Salir de `/play/torre` elimina listeners y RAF (sin errores en consola al volver).
- [ ] Los demás juegos y filtros de `/games` no cambian de comportamiento.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

---

## 6 — Decisiones tomadas y descartadas

- **Sí:** categoría nueva "Casual" para TORRE y ampliar `CategoryLabel`/`CATEGORIES`. Motivo: lo fijó el usuario; el catálogo solo tenía Acción/Clásico/Espacio/Puzzle. — decisión del usuario.
- **No:** reutilizar "Puzzle" para evitar tocar el filtro. Motivo: es la categoría de BLOQUES y reforzaría el parecido que se quiere evitar.
- **Sí:** comprobar en la migración si `games.category` es un enum/`check` y ampliarlo si hace falta. Motivo: no se ha verificado el esquema (este agente no toca Supabase). — decisión del agente (pendiente de revisar).
- **Sí:** mecánica de corte (el sobrante cae y la torre se estrecha). Motivo: la dificultad nace del propio jugador, es legible de un vistazo y una sola decisión por bloque; frente a una física de equilibrio, es la que menos reglas pide aprender.
- **Sí:** una sola vida. Motivo: un solo fallo duro da el "casi llego" que hace rejugable; las partidas largas se logran con tolerancia y recuperación de anchura, no con vidas. — decisión del agente (pendiente de revisar).
- **Sí:** recuperación de anchura tras 3 perfectos seguidos (+24 px, tope 400). Motivo: es la mitigación de "partidas muy cortas": sin ella un error pequeño condena la torre. — decisión del agente (pendiente de revisar).
- **Sí:** tolerancia de perfecto de 8 px con ajuste al piso. Motivo: a 1280 px de ancho el perfecto exacto es injusto con teclado. — decisión del agente (pendiente de revisar).
- **No:** deslizamiento en dos ejes alternos (el Stack 3D) ni bloques de ancho aleatorio. Motivo: más reglas y un segundo eje que complica la cámara; el ancho variable pertenece a la otra variante.
- **Sí:** velocidad inicial 260 px/s y +30 px/s cada 10 pisos, tope 640. Motivo: apunta a partidas de 1–3 minutos para un jugador atento. — decisión del agente (pendiente de revisar).
- **Sí:** puntuación por racha (10 + 10 × min(streak, 10)). Motivo: premia la precisión sin bono de tiempo y mantiene un entero creciente comparable.
- **Sí:** `MIN_OVERLAP = 12` px. Motivo: evita torres de ancho invisible que no se pueden jugar pero tampoco terminan. — decisión del agente (pendiente de revisar).
- **Sí:** 600 ms de espera inicial. Motivo: tras gastar un crédito el jugador no debe perder el primer bloque. — decisión del agente (pendiente de revisar).
- **Sí:** `PISO NN` dentro del canvas. Motivo: la altura es la métrica del juego y `PlayRoom` no tiene un campo de pisos; el resto del HUD queda fuera para no duplicarlo. — decisión del agente (pendiente de revisar).
- **Sí:** pausa interna `Escape`/`P` sincronizada con `paused` en `TorreState`; overlay "EN PAUSA" solo de React. Motivo: mismo criterio que Serpiente y Rana.
- **Sí:** canvas 1280×800 y todo el motor en un único `engine.ts`. Motivo: criterio de los motores anteriores.
- **No:** sonido, táctil, skins, rendimiento en este spec. Motivo: los hacen `skin-designer`, `mobile-porter` y `game-performance-booster` como addenda.
- **Sí:** `desc`, `long` y `thumb` redactados por el agente; `long` en términos neutros para valer en los dos enfoques. — decisión del agente (pendiente de revisar).

---

## 7 — Riesgos identificados

| Riesgo                                                                                   | Mitigación                                                                                                                                         |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Se parece a BLOQUES (riesgo del `game-planner`).                                         | Sin rejilla, piezas ni líneas; movimiento continuo de un eje, cámara vertical y fondo por altitud; categoría Casual distinta de Puzzle.            |
| Partidas muy cortas (riesgo del `game-planner`).                                         | Tolerancia de 8 px, recuperación de anchura tras 3 perfectos y velocidad inicial baja; valores ajustables en `/spec-impl` sin cambiar la mecánica. |
| La física depende de la frecuencia de pantalla.                                          | Todo se mueve por `dt` real con tope de 50 ms; a 60 y 120 Hz la velocidad en px/s es la misma.                                                     |
| `games.category` puede tener un `check`/enum que rechace "Casual" y romper la migración. | Paso 1 inspecciona el esquema antes de insertar y amplía la restricción en la misma migración.                                                     |
| `paused` desincronizado entre motor y `PlayRoom`, o `ESPACIO` desplazando la página.     | El motor emite `paused` en cada cambio y hace `preventDefault` en las teclas de juego mientras está activo; el listener se retira en `stop()`.     |

---

## Lo que **no** entra en este spec

- Skins y `setSkin()`.
- Mando táctil y revisión móvil.
- Auditoría de rendimiento.
- Sonido, vidas, bloques de ancho variable, viento, bonos de tiempo o altura y multijugador.
- Cambios en Supabase fuera de la fila `torre` (y, si existiera, la restricción de categoría).
- Un registro genérico de juegos en `PlayRoom`.

Cada uno de estos, si se aborda, va en su propio spec.
