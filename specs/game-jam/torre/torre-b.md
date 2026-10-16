# SPEC TORRE — Motor del juego Torre (Enfoque B: grúa con péndulo, equilibrio por centro de masa y vidas)

> **Status:** Draft
> **Depends on:** SPEC 01, SPEC 06, SPEC 07, SPEC 11, SPEC 15, SPEC 17
> **Date:** 2026-10-15
> **Objective:** Crear desde cero el motor de Torre (una grúa balancea bloques de ancho variable; la torre se mantiene en pie mientras el centro de masa de cada tramo apoye, y si no, el tramo superior se derrumba y cuesta una vida) e integrarlo en `/play/torre`, con su fila nueva `torre` en la tabla `games` (categoría nueva "Casual") y su carátula de catálogo.

---

## 1 — Por qué existe este spec

TORRE es el juego de apilar bloques "hasta el cielo". El `game-planner` la dejó en "⏳ Pendientes" de `references/games-suggestion-all.md` (37/40, "Apila sin fallar y llega al cielo.") con dos riesgos: **se parece a BLOQUES** y **las partidas son muy cortas**. Hay dos specs de la misma TORRE (mismo id, categoría y fila de catálogo); este es el **Enfoque B: variante con twist**. El otro (`torre-a.md`) es la variante clásica de corte.

**Cómo aterriza la idea en el Enfoque B.** Una grúa fija en lo alto de la pantalla balancea un bloque como un péndulo; `ESPACIO` lo suelta y cae. **Los bloques nunca se cortan**: cada uno conserva su ancho (de 112 a 240 px) y se apoya donde cae. La torre se sostiene por **equilibrio real**: para cada junta, el centro de masa de todo lo que hay encima debe caer dentro de la zona de contacto de esa junta. Si no, **el tramo superior se derrumba**, cuesta 1 vida y la torre vuelve a la última junta estable. Con 3 vidas, un error no acaba la partida: obliga a reconstruir y a pensar en contrapesos.

**Cómo resuelve los dos riesgos:**

- _Se parece a BLOQUES_: ni rejilla ni líneas; el movimiento es un péndulo, el ancho de las piezas es variable y la regla central es el equilibrio (centro de masa), algo que BLOQUES no tiene. Se juega con una tecla y se lee con el ojo en el balanceo.
- _Partidas muy cortas_: **3 vidas** (hasta 5 con +1 cada 12 pisos nuevos), el derrumbe solo quita el tramo inestable (no toda la torre) y el péndulo parte lento (periodo ≈ 3,1 s).

Es un juego creado desde cero siguiendo el contrato de los specs 06/08/10/11 (sin código ni assets de referencia).

---

## 2 — Scope

**In:**

- Nuevo módulo `components/games/torre/engine.ts`: motor completo en un único archivo, framework-free, sin imágenes.
  - **Canvas 1280×800** (16:10 exacto, llena `CrtFrame` sin franjas).
  - **Mundo**: suelo en `y = 720..800`. Bloques de **40 px** de alto. Piso 0 = plataforma base fija de 360 px de ancho centrada en `x = 0` (coordenadas de mundo), `y = 680..720`. Nunca se cae.
  - **Cámara**: horizontal `camX` sigue el centro del piso superior con `lerp` de 6 / s (la grúa siempre queda sobre la cima); vertical `camY = max(0, 560 − topY)` con `topY = 680 − 40 × floors`, suavizada a 8 / s. Pantalla: `sx = 640 + (wx − camX)`, `sy = wy + camY`.
  - **Grúa**: ancla fija en pantalla `(640, 40)`, cuerda de `ROPE_LEN = 300` px. Ángulo `θ(t) = 0.80 · sin(ω t) + wind · sin(1.7 ω t + 1.3)`, acotado a `±1.0` rad. El bloque cuelga del extremo de la cuerda con su borde superior en el extremo; su centro `x = 640 + 300 sin θ` (en mundo, `camX + 300 sin θ`).
  - **Ritmo del péndulo**: `ω = min(3.4, 2.0 + 0.2 × (level − 1))` rad/s (periodo 3,14 s en nivel 1). `wind = 0` en niveles 1–2 y `min(0.30, 0.10 × (level − 2))` desde el 3 ("viento").
  - **Bloques**: anchos de una bolsa barajada `[112, 144, 176, 208, 240]`; al vaciarse se rebaraja. El siguiente ancho se muestra en un recuadro `SIGUIENTE` (arriba a la derecha) como una barra de `w / 2` px.
  - **Soltar**: `ESPACIO`, `↓` o `S`. Se ignora `e.repeat`, y se ignora si no hay bloque colgando (espera, caída, derrumbe), y en pausa. Al soltar el bloque conserva su `x` (sin inercia horizontal) y cae con `g = 2600` px/s².
  - **Aterrizaje**: al cruzar `bottom = topY` se calcula `overlap` con el piso superior:
    - `overlap ≤ 0`: **fallo**. El bloque sigue cayendo fuera de pantalla (600 ms), −1 vida, sin puntos.
    - `overlap > 0`: el bloque se coloca en `y = topY − 40` con su ancho completo (no se corta).
  - **Perfecto**: `|cx − cx_piso_superior| ≤ 6` px. El bloque se ajusta a `cx = cx_piso_superior` y suma el bono.
  - **Equilibrio** (se evalúa tras cada aterrizaje). Sea `n` el piso recién colocado. Para cada junta `i` (entre el piso `i` y el `i + 1`, `i = 0..n−1`):
    - Zona de contacto `S_i = [max(l_i, l_{i+1}), min(r_i, r_{i+1})]`.
    - `COM_i = Σ(w_j · cx_j) / Σ w_j`, con `j = i+1..n` (el ancho pesa como masa; todos tienen 40 px de alto).
    - La junta es **estable** si `COM_i ∈ S_i` (con tolerancia 0,5 px). La junta 0 solo apoya en el suelo y nunca se evalúa como fallo de la base.
    - Si alguna junta es inestable: se toma la **más alta** `i*` inestable, se retiran los pisos `i*+1..n` y se **vuelve a evaluar**, hasta que no quede ninguna inestable. Es decir, el derrumbe puede ser mayor que el bloque recién puesto si el tramo restante tampoco aguanta.
    - Si hubo derrumbe: −1 vida, animación `COLLAPSE_MS = 1000` (los pisos retirados caen girando hacia el lado del `COM`, con destello), el reloj del péndulo sigue corriendo, sin puntos por el bloque derrumbado.
  - **Margen visible**: tras cada colocación se calcula la junta con menor margen `m = min(COM − l, r − COM) / ((r − l) / 2)` en `S_i`. Se dibuja sobre esa junta la zona `S_i` como línea amarilla de 4 px y una plomada en `COM_x`; con `m < 0,15` ambas pasan a rojo y parpadean a 4 Hz. Es la única ayuda: el motor no corrige nada.
  - **Respawn**: 250 ms (`SPAWN_DELAY_MS`) tras una colocación estable; tras fallo o derrumbe, cuando termina su animación.
  - **Vidas**: `LIVES_START = 3`, máximo 5. +1 vida cada vez que `bestFloors` alcanza un múltiplo de 12 (12, 24, 36…). Con 0 vidas: `onGameOver(finalScore)` una sola vez, tras la animación, y el motor queda congelado hasta `restart()`.
  - **Puntuación** (entero creciente, compatible con `scores`):
    - Colocación estable: `10 + 5 × min(n, 18)` puntos (15 en el piso 1; 100 desde el piso 18).
    - Perfecto: `+50`.
    - Fallo y derrumbe no restan ni suman. Reconstruir pisos vuelve a puntuar (la altura es lo que se pierde, no los puntos).
  - **Piso / nivel**: `floors` = pisos de la torre actual. `bestFloors` = máximo alcanzado en la partida. `level = 1 + floor(bestFloors / 8)`.
  - **HUD en el canvas** (mínimo): `PISO NN` arriba a la izquierda, `SIGUIENTE` arriba a la derecha y rótulos `PERFECTO` (800 ms), `+1 VIDA` (1000 ms) y `DERRUMBE` (1000 ms). No dibuja puntuación, nivel ni vidas.
  - **Controles**: `ESPACIO` / `↓` / `S` soltar, `Escape` / `P` pausa interna sincronizada con `PlayRoom`. `preventDefault` en las teclas de juego; no usa `F` (spec 15).
  - **Dibujado**: todos los colores en una constante `PALETTE`; bloques en 8 colores que ciclan por piso; grúa, cuerda y gancho en gris; plataforma base a rayas; cielo por franjas cada 25 pisos de `bestFloors`.
  - El motor no dibuja "GAME OVER" ni overlay de pausa ni se reinicia con ninguna tecla.
- Nuevo componente `components/games/torre/torre-game.tsx` ("use client"): `forwardRef`, refs para callbacks, motor montado una vez, `setPaused` en un efecto, `restart()` por `useImperativeHandle`, canvas 1280×800 con `h-full w-full bg-black object-contain`.
- Rama `game.id === "torre"` (bandera `isTorre`) en `app/play/[id]/play-room.tsx`:
  - `torreGameRef` e `isTorre` añadido a `isRealGame` (fondo `#000`, sin "SIMULAR FIN DE PARTIDA", `ROOM_OVERHEAD_GAME`).
  - Slot `art` del `CrtFrame`: `<TorreGame ref={torreGameRef} paused={paused} onStateChange={handleTorreStateChange} onGameOver={handleTorreGameOver} />`, con `label=""`.
  - `handleTorreStateChange(state)`: `setScore`, `setLives`, `setLevel`, `setPaused(state.paused)`. `handleTorreGameOver(finalScore)`: `setScore(finalScore)`, `setPaused(false)`, `setOver(true)` (modal "FIN DEL JUEGO").
  - `keyboardHelp`: `ESPACIO / ↓ SOLTAR · ESC / P PAUSA`.
  - `replay()`: `spendCredit()` y `if (isTorre) { torreGameRef.current?.restart(); setLives(3); setLevel(1); }`.
  - La barra de stats (PUNTUACIÓN, VIDAS, NIVEL, JUGADOR) no cambia: VIDAS ya se muestra para todo lo que no sea `serpiente`.
- **Categoría nueva "Casual"** (decisión del usuario): añadir `"Casual"` a `CategoryLabel` en `lib/types.ts` y a `CATEGORIES` en `app/data.ts` (después de "Puzzle").
- **Nueva fila en `public.games`**, insertada como migración con el MCP de Supabase durante `/spec-impl`, nunca desde código de la app. El pipeline de puntuación no cambia. **Esta fila es idéntica en los dos enfoques**:
  - `id`: `torre`
  - `title`: `TORRE`
  - `category`: `Casual`
  - `desc`: `Apila sin fallar y llega al cielo.`
  - `long`: `Suelta cada bloque justo encima del anterior y levanta la torre lo más alto que puedas. Cuanto mejor lo coloques, más puntos suma y más rápido se mueve el siguiente. Un descuido y la torre se resiente: ¿hasta qué piso llegas?`
  - `thumb`: `linear-gradient(180deg, #0b1a3a 0%, #2f6fd0 55%, #f5b84a 100%)`
- **Carátula** en `components/game-cover.tsx`: nuevo componente `Torre` registrado en `COVERS` bajo `torre`, con el mismo `Frame` (viewBox 160×100): grúa arriba con un bloque colgando y cuatro bloques apilados de distinto ancho. Solo SVG estático.
- Documentación: `references/implementd-game.md` y `CLAUDE.md` (añadir `torre`). `references/games-suggestion-all.md` **no** lo toca este spec: lo actualiza el agente `game-planner`.
- Sin assets de `references/source-assets/`.

**Out of scope (para specs futuros o addenda):**

- Skins `clasico`/`retro`/`neon`, `setSkin()` y chips SKIN: addendum de `skin-designer`.
- Entrada en `TOUCH_LAYOUTS` (acción `ESPACIO`) y revisión de la sala móvil: addendum de `mobile-porter`.
- Optimización de rendimiento: addendum de `game-performance-booster`.
- Física con rotación y fricción completas (los bloques no se inclinan; la torre se resuelve por centro de masa), viento que empuje la torre, sonido.
- Cortar el sobrante (es la identidad del otro enfoque).
- Bono por tiempo, selección de dificultad, modo de dos jugadores.
- Cambios en `CrtFrame`, créditos, `devicePixelRatio` y reanudar partidas.
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
const BASE_WIDTH = 360;
const BLOCK_WIDTHS = [112, 144, 176, 208, 240]; // bolsa barajada

const ANCHOR_X = 640; // pantalla
const ANCHOR_Y = 40;
const ROPE_LEN = 300;
const SWING_AMP = 0.8; // rad
const THETA_MAX = 1.0;
const OMEGA_BASE = 2.0; // rad/s
const OMEGA_STEP = 0.2;
const OMEGA_MAX = 3.4;
const WIND_START_LEVEL = 3;
const WIND_STEP = 0.1;
const WIND_MAX = 0.3;

const GRAVITY = 2600; // px/s²
const PERFECT_TOL = 6; // px entre centros
const COM_EPS = 0.5; // tolerancia del equilibrio, px
const WARN_MARGIN = 0.15;

const LIVES_START = 3;
const LIVES_MAX = 5;
const FLOORS_PER_LIFE = 12;
const FLOORS_PER_LEVEL = 8;

const POINTS_BASE = 10;
const POINTS_PER_FLOOR = 5;
const FLOOR_BONUS_CAP = 18;
const POINTS_PERFECT = 50;

const SPAWN_DELAY_MS = 250;
const MISS_MS = 600;
const COLLAPSE_MS = 1000;
const CAMERA_TARGET_Y = 560;
const CAMERA_X_LERP = 6;
const CAMERA_Y_LERP = 8;
const MAX_DT_MS = 50;

interface Floor {
  cx: number; // centro, mundo
  w: number; // ancho, px
}

export interface TorreState {
  score: number;
  lives: number;
  level: number;
  floors: number; // pisos de la torre actual
  paused: boolean; // notificado también cuando cambia por Escape/P interno
}

export interface TorreHandlers {
  onStateChange(state: TorreState): void; // solo cuando cambia
  onGameOver(finalScore: number): void; // una sola vez, al perder la última vida
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

- `floors: Floor[]` con la base en índice 0; el piso `k` ocupa `y = 680 − 40k .. 720 − 40k`.
- Evaluación de equilibrio: acumulados `sumW` y `sumWX` recorriendo de arriba abajo (O(n), sin asignar), compara `COM` con `S_i` en cada junta; se repite tras cada recorte.
- Los pisos derrumbados pasan a un pool fijo de 24 fragmentos `{cx, y, w, vx, vy, rot}` para la animación; los que no quepan se descartan sin dibujar.
- El tiempo del péndulo `t` solo avanza fuera de pausa; la bolsa de anchos se rehace en `restart()`.
- Todo movimiento se escala por `dt` real con tope `MAX_DT_MS`.
- `start()` registra `keydown` sobre `window` y el RAF; `stop()` los elimina; `restart()` reinicia torre, vidas, nivel, puntuación, bolsa, péndulo y cámara, y notifica el estado inicial.

---

## 4 — Plan de implementación

1. **Migración y categoría.** Comprobar con el MCP si `games.category` tiene un `check`/enum que excluya "Casual" y ampliarlo si es así. Insertar la fila `torre` con los valores de §2. Añadir `"Casual"` a `CategoryLabel` y a `CATEGORIES`. Verificación: `select * from games where id = 'torre'`; `/games` muestra el filtro CASUAL; `/game/torre` carga; `/play/torre` sigue en modo simulador.
2. **Carátula.** Añadir `Torre` a `COVERS` en `components/game-cover.tsx`. Verificación: la tarjeta de `/games` muestra la carátula, también en tema claro.
3. **Motor — escena y péndulo.** `engine.ts` con constantes, `PALETTE`, tipos, fondo, base, grúa y un bloque que se balancea con `θ(t)`, incluido el viento a partir del nivel 3. Verificación: ver el balanceo a 1280×800, también en un monitor de 120 Hz.
4. **Motor — soltado y aterrizaje.** Entrada de teclado sin `repeat`, caída con gravedad, cálculo de `overlap`, fallo, perfecto, bolsa de anchos y respawn.
5. **Motor — equilibrio y derrumbe.** Evaluación de juntas, recorte iterativo, animación de fragmentos, margen visible (línea amarilla/roja y plomada) y vida perdida. Verificación manual: colocar bloques deliberadamente descentrados hasta provocar un derrumbe parcial y comprobar que la torre queda en la junta estable.
6. **Motor — puntuación, vidas, nivel y fin.** Puntos, +1 vida cada 12 pisos, nivel por `bestFloors`, cámara, cielo por franjas, `onStateChange` solo al cambiar, `onGameOver` una sola vez, `setPaused`, pausa interna `Escape`/`P`, `restart()`.
7. **Componente canvas.** Crear `torre-game.tsx` según §2.
8. **Integración en `PlayRoom`.** Aplicar las ramas `isTorre` de §2. Prueba manual completa en `npm run dev`: perfectos, derrumbe parcial y total, fallo, ganar vida, perder las 3, guardar puntuación, jugar de nuevo, pausar.
9. **Remate.** Documentación de §2, `npm run build` y `npm run lint` sin errores, sin listeners activos al salir; commitear el bloque de `AGENTS.md` si `next dev` lo regeneró.

---

## 5 — Criterios de aceptación

- [ ] `/games` muestra el filtro CASUAL y TORRE en él con la frase "Apila sin fallar y llega al cielo." y su carátula.
- [ ] `/play/torre` muestra el canvas 1280×800 llenando el `CrtFrame`, sin franjas y sin "SIMULAR FIN DE PARTIDA".
- [ ] La grúa balancea el bloque con periodo ≈ 3,1 s en nivel 1; `ESPACIO`, `↓` y `S` lo sueltan y mantener la tecla no encadena soltados.
- [ ] Los bloques conservan su ancho completo al aterrizar (nunca se cortan) y los anchos salen de la bolsa `[112, 144, 176, 208, 240]` sin repetir hasta vaciarla.
- [ ] El primer bloque centrado (`|Δ| ≤ 6`) suma exactamente 15 + 50 = 65 puntos; uno colocado estable pero no perfecto suma 15.
- [ ] En el piso 18 o superior un bloque estable suma 100 puntos (más 50 si es perfecto).
- [ ] Un bloque cuyo centro queda fuera del piso de abajo provoca derrumbe del tramo, −1 vida y la torre vuelve a la junta estable más alta.
- [ ] El derrumbe puede retirar varios pisos y se repite hasta que todas las juntas apoyan.
- [ ] Un bloque que no solapa nada con la cima cae fuera de pantalla, resta 1 vida y no suma puntos.
- [ ] La zona de contacto y la plomada de la junta más comprometida se ven siempre, y se vuelven rojas y parpadean con margen < 15 %.
- [ ] Al alcanzar 12 pisos suma +1 vida (máx. 5); reconstruir y volver a 12 no la repite.
- [ ] Con 8 pisos máximos el HUD externo muestra NIVEL 02 y el péndulo es más rápido; desde el nivel 3 el balanceo incorpora viento.
- [ ] Perder la 3ª vida abre el modal "FIN DEL JUEGO" tras la animación, con la puntuación final correcta; `onGameOver` una sola vez.
- [ ] Los puntos nunca bajan: el derrumbe no resta puntuación.
- [ ] El HUD externo muestra PUNTUACIÓN, VIDAS, NIVEL y JUGADOR actualizados en vivo; el canvas muestra `PISO NN` y `SIGUIENTE`.
- [ ] El botón PAUSA y `Escape`/`P` pausan y reanudan; el péndulo no avanza en pausa.
- [ ] "GUARDAR PUNTUACIÓN" inserta en `scores` con `game_id = 'torre'` y aparece en `/game/torre` y `/hall-of-fame`.
- [ ] "JUGAR DE NUEVO" consume un crédito y reinicia puntuación, vidas, nivel, torre y bolsa.
- [ ] La tecla `F` sigue alternando la pantalla completa; salir de `/play/torre` elimina listeners y RAF.
- [ ] Los demás juegos y filtros de `/games` no cambian.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

---

## 6 — Decisiones tomadas y descartadas

- **Sí:** categoría nueva "Casual" y ampliar `CategoryLabel`/`CATEGORIES`. — decisión del usuario.
- **No:** reutilizar "Puzzle". Motivo: es la categoría de BLOQUES.
- **Sí:** comprobar el esquema de `games.category` en la migración. Motivo: no verificado por este agente. — decisión del agente (pendiente de revisar).
- **Sí:** equilibrio por centro de masa por junta, sin cortar bloques. Motivo: es el twist que separa TORRE de BLOQUES y del apilado clásico; permite descentrar a propósito y compensar con contrapesos, algo que el corte clásico no ofrece. — decisión del agente (pendiente de revisar).
- **No:** simulación de física con rotación y rozamiento. Motivo: es cara de probar, no determinista entre frecuencias de pantalla y difícil de cuadrar con "una tecla"; el centro de masa da el mismo reto de forma determinista.
- **Sí:** el derrumbe retira solo el tramo por encima de la junta inestable más alta, iterando. Motivo: es la mitigación de "partidas muy cortas": un error cuesta pisos, no la partida. — decisión del agente (pendiente de revisar).
- **Sí:** 3 vidas, +1 cada 12 pisos de `bestFloors` (máx. 5). Motivo: alarga la partida a 2–5 minutos y premia el progreso, no la repetición. — decisión del agente (pendiente de revisar).
- **Sí:** los puntos de reconstruir cuentan otra vez. Motivo: puntuación entera creciente y sin castigar doblemente; la penalización es la altura perdida y la vida. — decisión del agente (pendiente de revisar).
- **Sí:** nivel por `bestFloors` (no por la altura actual). Motivo: el nivel no puede bajar tras un derrumbe. — decisión del agente (pendiente de revisar).
- **Sí:** péndulo con `θ = 0,8 sin(ωt)` más viento armónico desde el nivel 3. Motivo: la dificultad escala con una sola variable de ritmo y un término de irregularidad sin azar. — decisión del agente (pendiente de revisar).
- **Sí:** soltar sin inercia horizontal. Motivo: fácil de leer y de predecir con una sola tecla. — decisión del agente (pendiente de revisar).
- **Sí:** bolsa barajada de 5 anchos. Motivo: evita rachas de anchos injustas y da un `SIGUIENTE` honesto.
- **Sí:** ayuda visual de margen (línea amarilla, plomada roja con < 15 %). Motivo: sin ella el equilibrio es opaco; es información, no corrección. — decisión del agente (pendiente de revisar).
- **Sí:** cámara también en horizontal. Motivo: sin cortar bloques la torre puede derivar; así la grúa siempre queda sobre la cima. — decisión del agente (pendiente de revisar).
- **Sí:** pausa interna `Escape`/`P` sincronizada, overlay "EN PAUSA" solo de React; canvas 1280×800; un único `engine.ts`.
- **No:** sonido, táctil, skins ni rendimiento en este spec (addenda de los agentes).
- **Sí:** `desc`, `long` y `thumb` redactados por el agente, `long` neutro para ambos enfoques. — decisión del agente (pendiente de revisar).

---

## 7 — Riesgos identificados

| Riesgo                                                                                            | Mitigación                                                                                                                             |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Se parece a BLOQUES (riesgo del `game-planner`).                                                  | Péndulo, anchos variables y equilibrio por centro de masa; sin rejilla ni líneas; categoría Casual.                                    |
| Partidas muy cortas (riesgo del `game-planner`).                                                  | 3 vidas, vida extra cada 12 pisos, derrumbe parcial y péndulo inicial lento; todo ajustable en `/spec-impl` sin cambiar la mecánica.   |
| La regla de equilibrio se siente arbitraria o injusta (el derrumbe "sorprende").                  | Ayuda de margen visible tras cada colocación y rótulo `DERRUMBE`; si aun así confunde, se ajusta `COM_EPS`/`WARN_MARGIN`, no la regla. |
| Balance: anchos grandes sobre pequeños vuelven la torre imposible, o el viento la hace injugable. | Bolsa barajada (nunca dos del mismo ancho seguidos), tope de viento 0,30 y `OMEGA_MAX` 3,4 rad/s; valores de tablas ajustables.        |
| La física depende de la frecuencia de pantalla (péndulo, caída, cámara).                          | Todo por `dt` real con tope de 50 ms; el péndulo es función de un reloj acumulado, no de frames.                                       |
| `games.category` puede rechazar "Casual", o `paused` se desincroniza.                             | Paso 1 inspecciona y amplía la restricción; el motor emite `paused` en cada cambio y retira listeners en `stop()`.                     |

---

## Lo que **no** entra en este spec

- Skins y `setSkin()`.
- Mando táctil y revisión móvil.
- Auditoría de rendimiento.
- Física completa con rotación, corte del sobrante, bonos de tiempo, sonido y multijugador.
- Cambios en Supabase fuera de la fila `torre` (y, si existiera, la restricción de categoría).
- Un registro genérico de juegos en `PlayRoom`.

Cada uno de estos, si se aborda, va en su propio spec.
