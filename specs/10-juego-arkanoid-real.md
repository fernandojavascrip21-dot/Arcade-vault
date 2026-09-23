# SPEC 10 — Motor real del juego Arkanoid (Rompemuros)

> **Status:** Implementado
> **Depends on:** SPEC 01, SPEC 06, SPEC 07
> **Date:** 2026-09-22
> **Objective:** Portar el motor real de `references/started-games/04-arkanoid/` (pala, pelota, ladrillos, partículas, 5 niveles y selección de dificultad) a un componente React/Canvas e integrarlo en `/play/rompemuros`, reemplazando ahí el simulador de `PlayRoom`, reutilizando tal cual la fila `rompemuros` ya existente en la tabla `games` de Supabase.

---

## 1 — Por qué existe este spec

La fila `rompemuros` de la tabla `games` (categoría "Acción", descripción "Destruye la muralla con la pala y la bola.", texto largo "Clásico de rebotes: mueve la pala y rompe cada ladrillo de la muralla antes de perder las tres vidas...") describe exactamente el juego implementado en `references/started-games/04-arkanoid/` — un clon de Arkanoid/Breakout completo y jugable de forma independiente. Hoy `/play/rompemuros` sigue siendo el simulador genérico de `PlayRoom` (botón "SIMULAR FIN DE PARTIDA").

Este es el tercer juego real de la plataforma, siguiendo el mismo contrato que establecieron los specs 06 (Asteroides) y 08 (Bloques/Tetris): `create<Nombre>Engine(canvas, handlers)`, `<Nombre>State`, integración explícita por `game.id` en `play-room.tsx`. A diferencia de los dos anteriores, esta referencia tiene tres particularidades nuevas que este spec resuelve explícitamente:

- **Assets binarios reales**: la pala, la pelota y los ladrillos se dibujan con un spritesheet PNG (`assets/spritesheet-breakout.png`, 559×337) en vez de formas planas de canvas. Ningún juego portado hasta ahora trae una imagen.
- **Múltiples pantallas internas de flujo**: a diferencia de Asteroides/Bloques (que arrancan directo a jugar), el original tiene una pantalla de selección de dificultad, una pantalla "start" (pelota pegada a la pala esperando lanzamiento), una transición "Nivel X completado" entre los 5 niveles, y un estado de **victoria real** (completar los 5 niveles), además del estado de derrota.
- **Estructura multi-archivo con ES modules** (`game.js` + `levels.js` + `level-manager.js` + `assets/spritesheet.js`), a diferencia del archivo único de `game.js` que tenían Asteroides y Tetris.

Como ya existe una fila de catálogo que encaja con esta mecánica, este spec no toca Supabase en absoluto: es un cambio puramente de frontend, igual que hizo el spec 08 con Bloques/Tetris.

---

## 2 — Scope

**In:**

- Nuevo módulo `components/games/rompemuros/engine.ts`: puerto a TypeScript, en un único archivo (mismo criterio de Asteroides/Bloques: todo el motor vive en `engine.ts`, sin separar en varios módulos aunque la referencia sí lo haga), de:
  - El modelo de niveles de `levels.js` (`LEVELS`: 5 layouts de hasta 6×8 con colores nombrados o `null`; `BLOCK_POINTS`: puntos por color) y la clase `LevelManager` de `level-manager.js` (nivel actual, creación de ladrillos por nivel, velocidad de pelota por nivel, avance, reset), sin cambios de mecánica.
  - La física y el loop de `game.js`: movimiento de pala (teclado + mouse), pelota pegada/lanzada, rebotes contra paredes y pala (con ángulo según punto de impacto, ±60°), colisión AABB-círculo contra ladrillos, partículas al romper un ladrillo (7 fragmentos, gravedad, 600ms de vida), puntuación (`points × scoreMultiplier` de la dificultad), pérdida de vida al caer la pelota, selección de dificultad (Fácil/Medio/Difícil: velocidad base y multiplicador de puntos), progresión de los 5 niveles con incremento de velocidad (`+0.5` por nivel completado), y el estado de victoria al vaciar el nivel 5. Mecánica sin cambios respecto al original.
  - El renderizado con spritesheet de `assets/spritesheet.js`: pala, pelota y ladrillos (por color) se dibujan recortando `assets/spritesheet-breakout.png`, igual que el original — no se redibujan como formas planas.
  - Diferencias deliberadas respecto al original (ver decisiones en sección 6):
    - **Con sonido (ampliación posterior a la aprobación inicial).** Se portan `ball-bounce.mp3` (rebote en paredes/techo y pala) y `break-sound.mp3` (ladrillo roto), copiados a `public/games/rompemuros/`. El botón de silencio HTML (`#mute-btn`) se reemplaza por un ícono 🔊/🔇 dibujado dentro del canvas (arriba, junto a las vidas) con su propio click. `play()` se llama con `.catch(() => {})` por la política de autoplay del navegador. El estado de silencio es interno del motor y no forma parte de `RompemurosState`.
    - **Velocidad independiente de la frecuencia de pantalla (ampliación posterior).** El original mueve pelota y pala una cantidad fija por frame, así que en monitores de 120/144 Hz el juego corre el doble de rápido. El motor escala el movimiento por el tiempo real transcurrido (`dt / (1000/60)`, con tope para evitar saltos tras pausas o cambios de pestaña), de modo que las velocidades equivalen a px por frame a 60 fps en cualquier monitor. La velocidad base se reajustó tras probar el juego: FÁCIL 8.5, MEDIO 9.5, DIFÍCIL 11 (el original usaba 5/6/8; los intentos intermedios 3.5/4.5/6 y 4.5/5.5/7 resultaron demasiado lentos). La velocidad inicial de las partículas también sube a 10–14 (original 2–5) para mantener su proporción visual con la pelota. El incremento por nivel completado sigue siendo +0.5.
    - **Sin `document`/`window` globales fuera de la factoría.** Todo listener (teclado, mouse, click) se agrega sobre el `canvas` inyectado o sobre él mismo en `start()`, y se quita en `stop()` — igual que exige el contrato de Asteroides/Bloques. El botón de mute HTML (`#mute-btn`) se reemplaza por un ícono dentro del canvas (ver punto de sonido).
    - **Pantalla de selección de dificultad**: se mantiene dentro del canvas tal cual el original — `start()` arranca en la pantalla `'difficulty'`; se elige con `1`/`2`/`3` o click, igual que `game.js`.
    - **Pantalla `'start'`** (pelota pegada a la pala, esperando lanzamiento con Espacio o click) y la **transición `'level-complete'`** (1.5s mostrando "Nivel X completado" antes de avanzar) se mantienen dentro del canvas tal cual el original — son pantallas intermedias del propio flujo de juego, no compiten con el modal de React.
    - **Pantalla `'gameover'` (overlay + tecla `R` para reiniciar) se desactiva por completo**, igual que Asteroides/Bloques: al perder la tercera vida el motor no dibuja ningún overlay de "GAME OVER" ni escucha `R` — llama `onGameOver(finalScore)` una sola vez y queda congelado hasta que algo externo llame `restart()`.
    - **Pantalla `'win'` (completar los 5 niveles) se trata igual que `'gameover'`**: tampoco dibuja su propio overlay "¡GANASTE!" ni escucha `R` — llama `onGameOver(finalScore)` con la puntuación final, exactamente el mismo camino que perder. `PlayRoom` no distingue victoria de derrota; su modal "FIN DEL JUEGO" ya cubre ambos casos.
    - **Pausa: se mantiene la tecla interna `Escape`/`P`** (a diferencia de Bloques, que la desactivó) **además** del control externo `setPaused(paused)`. Para que ambas vías no se desincronicen, `RompemurosState` incluye un campo nuevo `paused: boolean` que el motor notifica por `onStateChange` cada vez que el estado de pausa cambia (por `Escape`/`P` interno o por `setPaused()` externo) — `PlayRoom` sincroniza su propio estado `paused` desde ese campo, de modo que el botón "PAUSA"/"SEGUIR" y el overlay "EN PAUSA" de React reflejan siempre el estado real, sin importar cuál de las dos vías lo disparó. El canvas sigue dibujando además su propio overlay "PAUSADO" tal cual el original (redundancia aceptada solo para la pausa, no para el HUD de datos — ver el punto siguiente), en paralelo al overlay "EN PAUSA" de React.
    - **Solo el HUD del propio juego**, igual que Bloques: el canvas sigue dibujando Score (arriba-izquierda) y vidas como íconos de pelota (arriba-derecha) tal cual el original (`drawHUD`). El motor sigue notificando el estado por `onStateChange` (`PlayRoom` lo necesita para el modal "FIN DEL JUEGO" y el guardado), pero el HUD externo no lo muestra.
    - **Control por mouse portado tal cual**: mover el mouse sobre el canvas mueve la pala; click lanza la pelota (o selecciona la opción de dificultad si `screen === 'difficulty'`) — el listener va sobre el mismo `canvas` inyectado, sin romper el contrato de un único elemento.
    - Expone una factoría `createRompemurosEngine(canvas, handlers)` que devuelve `{ start(): void; stop(): void; setPaused(paused: boolean): void; restart(): void }`.
- Nuevo asset `public/games/rompemuros/spritesheet-breakout.png` (copia de `references/started-games/04-arkanoid/assets/spritesheet-breakout.png`) — primer asset de imagen del catálogo de juegos portados. Junto a él viven `ball-bounce.mp3` y `break-sound.mp3` (copias de `references/started-games/04-arkanoid/assets/sounds/`), primeros assets de audio del catálogo. El motor lo carga con `new Image()` apuntando a `/games/rompemuros/spritesheet-breakout.png` antes de arrancar el loop (mismo patrón `loadSpritesheet(cb)` que el original, adaptado sin variables de módulo globales fuera de la factoría).
- Nuevo componente `components/games/rompemuros/rompemuros-game.tsx` ("use client"), análogo a `asteroids-game.tsx`: un `<canvas>` de resolución interna 800×600 (4:3) con clases `h-full w-full object-contain` (letterboxea dentro de la caja 16:10 de `CrtFrame` sin tocar ese componente, mismo criterio que Asteroides), que monta/desmonta el motor en un `useEffect` y expone `restart()` vía `ref` (`useImperativeHandle`). Props: `paused: boolean`, `onStateChange`, `onGameOver`.
- Cambios en `app/play/[id]/play-room.tsx`, solo activos cuando `game.id === "rompemuros"` (bandera `isRompemuros`, análoga a `isAsteroids`/`isBloques`):
  - Se reemplaza el fondo estático del `CrtFrame` (`art`) por `<RompemurosGame />`, con `label=""`.
  - **HUD externo simplificado para este juego:** la condición actual `{!isBloques ? (...) : null}` que muestra PUNTUACIÓN/VIDAS/NIVEL pasa a `{!isBloques && !isRompemuros ? (...) : null}`, de modo que para `isRompemuros` solo queda JUGADOR (más los botones PAUSA/SALIR, que no cambian). `score`/`lives`/`level` se siguen guardando en el estado de React vía `onStateChange` porque `PlayRoom` los necesita para el modal y `saveScoreAction`.
  - El botón "SIMULAR FIN DE PARTIDA" se oculta también para este juego (condición existente `{!isAsteroids && !isBloques ? ... : null}` pasa a `{!isAsteroids && !isBloques && !isRompemuros ? ... : null}`).
  - El texto de controles bajo el `CrtFrame` cambia a `← → / A D / RATÓN MOVER · ESPACIO / CLIC LANZAR · 1 2 3 DIFICULTAD · ESC / P PAUSA` cuando `isRompemuros`.
  - `onGameOver(finalScore)` dispara el mismo modal "FIN DEL JUEGO" ya existente, tanto al perder las 3 vidas como al ganar los 5 niveles.
  - El estado local `paused` de `PlayRoom` se actualiza también desde `onStateChange` cuando `isRompemuros` (además de desde el botón "PAUSA"), para reflejar la pausa disparada por `Escape`/`P` dentro del canvas.
  - "JUGAR DE NUEVO" (`replay`), tras gastar el crédito con `spendCredit()` (sin cambios en esa lógica), llama `restart()` del motor y resetea `lives`/`level` a sus valores iniciales (3/1) además de `score` a 0 — mismo patrón que Asteroides.
- **Sin cambios en Supabase**: la fila `rompemuros` de la tabla `games` ya existe con `id`, `title`, `category` ("Acción"), `desc`, `long` y `thumb` coherentes con Arkanoid — se reutiliza tal cual, sin ninguna migración. El guardado de puntuación (`saveScoreAction` → tabla `scores`, ya genérica por `game_id`) tampoco cambia.

**Out of scope (para specs futuros):**

- Música de fondo, volumen ajustable, o persistir la preferencia de silencio entre sesiones.
- Controles táctiles/móviles.
- Cambiar la economía de créditos (`CreditsProvider`/`spendCredit`/`insertCoin`).
- Cambiar el título/categoría/descripción/thumb de la fila `rompemuros` del catálogo.
- Adaptar cualquier otro juego pendiente del catálogo (serpiente, invasores, laberinto).
- Renderizado a mayor resolución por `devicePixelRatio`.
- Guardar o reanudar el estado de una partida en curso al salir con "SALIR".
- Cualquier nivel, dificultad o layout de ladrillos adicional a los 5 ya definidos en `levels.js`.

---

## 3 — Modelo de datos

Este feature no introduce ningún tipo de dominio nuevo (no hay cambios a `Game`, `ScoreEntry`, `BoardRow` de `lib/types.ts`, ni a las tablas `games`/`scores`). Introduce el contrato del motor portado, análogo al de Asteroides/Bloques, con un campo adicional (`paused`) que ninguno de los dos anteriores tiene:

```ts
// components/games/rompemuros/engine.ts
export interface RompemurosState {
  score: number;
  lives: number;
  level: number; // 1-5
  paused: boolean; // sincroniza el botón/overlay externos con la tecla interna Escape/P
}

export interface RompemurosHandlers {
  onStateChange: (state: RompemurosState) => void; // cada vez que score/lives/level/paused cambian
  onGameOver: (finalScore: number) => void; // una sola vez: al perder la 3ª vida O al completar el nivel 5
}

export interface RompemurosEngine {
  start(): void; // agrega listeners de teclado/mouse sobre el canvas y arranca el loop (tras cargar el spritesheet)
  stop(): void; // cancela el loop y quita los listeners (cleanup en unmount)
  setPaused(paused: boolean): void; // congela/descongela update()+draw() sin perder estado; notifica onStateChange
  restart(): void; // equivalente a resetGame(): score=0, lives=3, nivel 1, pantalla 'difficulty', nueva partida
}

export const ROMPEMUROS_WIDTH = 800;
export const ROMPEMUROS_HEIGHT = 600;

export function createRompemurosEngine(
  canvas: HTMLCanvasElement,
  handlers: RompemurosHandlers,
): RompemurosEngine;
```

```ts
// components/games/rompemuros/rompemuros-game.tsx
export interface RompemurosGameHandle {
  restart(): void;
}

export function RompemurosGame(props: {
  paused: boolean;
  onStateChange: (state: RompemurosState) => void;
  onGameOver: (finalScore: number) => void;
}): JSX.Element; // usar con ref: RompemurosGameHandle
```

`AsteroidsState`/`BloquesState` no cambian — el campo `paused` es exclusivo de `RompemurosState`, ya que ninguno de los otros dos motores tiene una tecla de pausa interna que sincronizar.

No hay persistencia nueva: la puntuación final se guarda exactamente igual que hoy, vía `saveScoreAction(game.id, playerName, score)` en `app/play/[id]/actions.ts` (spec 07), sin cambios a ese módulo. La fila `games` con `id: "rompemuros"` no cambia.

---

## 4 — Plan de implementación

1. **Asset del spritesheet.** Copiar `references/started-games/04-arkanoid/assets/spritesheet-breakout.png` a `public/games/rompemuros/spritesheet-breakout.png`. Sistema funcional: no lo consume nada todavía. Verificación: el archivo existe y `npm run build` no reporta errores por el nuevo archivo estático.
2. **Motor portado (`components/games/rompemuros/engine.ts`).** Trasladar a TypeScript, en un único archivo, el modelo de niveles (`LEVELS`, `BLOCK_POINTS`, `LevelManager`), la física/loop de `game.js`, y el renderizado por spritesheet (`loadSpritesheet`/`drawSprite` apuntando a `/games/rompemuros/spritesheet-breakout.png`), todo descrito en la sección 2. Envolver en `createRompemurosEngine(canvas, handlers)`: listeners de teclado sobre `window` sustituidos por listeners sobre el propio `canvas` donde el original los necesita solo mientras el juego está montado (agregados en `start()`, quitados en `stop()`); mouse/click sobre el `canvas` inyectado. Notificar `onStateChange({score, lives, level, paused})` en cada cambio y `onGameOver(finalScore)` una sola vez (derrota o victoria). Sin JSX, sin usarse todavía desde ninguna página. Verificación: `npx tsc --noEmit` sin errores en el archivo nuevo.
3. **Componente canvas (`components/games/rompemuros/rompemuros-game.tsx`).** Mismo patrón que `asteroids-game.tsx`: monta el motor en un `useEffect` (`start()` al montar, `stop()` en el cleanup) y expone `restart()` por `ref`. Verificación manual puntual: montarlo temporalmente en una página de prueba (revertida antes del siguiente paso) y confirmar en el navegador que se comporta igual que servir `references/started-games/04-arkanoid/index.html` por HTTP local (pantalla de dificultad, lanzar la pelota, mover con teclado y mouse, romper ladrillos con partículas, subir de nivel con la transición "Nivel X completado", pausar con `Escape`/`P`, perder las 3 vidas, y completar el nivel 5).
4. **Integración en `PlayRoom`.** Modificar `app/play/[id]/play-room.tsx` según la sección 2: bandera `isRompemuros = game.id === "rompemuros"`, render condicional de `<RompemurosGame />` dentro de `CrtFrame`, ocultar "SIMULAR FIN DE PARTIDA" y actualizar el texto de controles cuando `isRompemuros`, conectar `onStateChange` (incluyendo la sincronización de `paused` con el estado local) y `onGameOver`, y ajustar `replay()` para llamar `restart()` y resetear `lives`/`level` a 3/1. Los demás juegos (`isRompemuros === false`) no cambian ni un pixel de comportamiento. Verificación manual en `npm run dev`: jugar `/play/rompemuros` completo — elegir dificultad, lanzar la pelota, mover la pala con teclado y con mouse, romper ladrillos (ver partículas y el HUD del canvas actualizarse), completar los 5 niveles y ver aparecer el modal "FIN DEL JUEGO" con la puntuación de la victoria, o perder las 3 vidas y ver el mismo modal con la puntuación de la derrota. Pausar con el botón "PAUSA" y también con `Escape`/`P` dentro del canvas, confirmando en ambos casos que el botón externo cambia a "SEGUIR" y aparece el overlay "EN PAUSA" de React en paralelo al "PAUSADO" del canvas. "GUARDAR PUNTUACIÓN" la persiste (verificable en `/hall-of-fame` con `game_id = "rompemuros"`), "JUGAR DE NUEVO" gasta un crédito y reinicia desde la pantalla de dificultad. Confirmar además que `/play/asteroides`, `/play/bloques` y cualquier otro `/play/[id]` siguen idénticos a como estaban antes de este spec.
5. **Remate.** `npm run build` y `npm run lint` sin errores ni warnings nuevos. Confirmar que no queda ningún listener de teclado/mouse activo tras navegar fuera de `/play/rompemuros`. Si `next dev` regeneró el bloque `<!-- BEGIN:nextjs-agent-rules -->` de `AGENTS.md`, commitearlo junto al resto.
6. **Ampliaciones posteriores a la aprobación (ya realizadas).** Sonido: copiar `ball-bounce.mp3` y `break-sound.mp3` a `public/games/rompemuros/`, reproducirlos desde el motor y dibujar el ícono de silencio en el canvas. Velocidad: normalizar el movimiento por tiempo (`dt`) y ajustar las velocidades base y de partículas. Verificación: con el silencio activado no se llama a `play()`, al desactivarlo suenan ambos archivos, y la velocidad se siente igual a 60 y 120 Hz.

---

## 5 — Criterios de aceptación

- [ ] `/play/rompemuros` muestra el juego real (canvas) dentro del `CrtFrame`, no el fondo de gradiente estático.
- [ ] Al entrar se ve la pantalla de selección de dificultad dentro del canvas; elegir con `1`/`2`/`3` o click funciona igual que el original.
- [ ] La pala se mueve con `←`/`→`, `A`/`D`, y con el mouse sobre el canvas; la pelota se lanza con `Espacio` o click.
- [ ] Romper un ladrillo suma los puntos de su color multiplicados por el multiplicador de la dificultad elegida, y dispara partículas — mismo comportamiento que `references/started-games/04-arkanoid/js/game.js`.
- [ ] Vaciar un nivel muestra la transición "Nivel X completado" dentro del canvas y avanza automáticamente al siguiente, aumentando la velocidad de la pelota.
- [ ] Completar el nivel 5 dispara el modal "FIN DEL JUEGO" de React con la puntuación final (no se dibuja ningún overlay "¡GANASTE!" propio del motor).
- [ ] Perder la tercera vida dispara el mismo modal "FIN DEL JUEGO" (no se dibuja ningún overlay "GAME OVER" propio del motor ni existe una tecla `R` que reinicie por sí sola).
- [ ] El HUD dibujado dentro del canvas (Score arriba-izquierda, vidas como íconos de pelota arriba-derecha) se actualiza en vivo con el estado real del juego.
- [ ] El HUD externo de `PlayRoom` arriba del `CrtFrame` solo muestra JUGADOR (y los botones PAUSA/SALIR) para este juego — no duplica PUNTUACIÓN/VIDAS/NIVEL.
- [ ] Pausar con el botón "PAUSA" externo y pausar con `Escape`/`P` dentro del canvas producen el mismo resultado visual: el botón externo pasa a decir "SEGUIR", aparece el overlay "EN PAUSA" de React, y el canvas muestra en paralelo su propio overlay "PAUSADO" — sin importar cuál de las dos vías disparó la pausa.
- [ ] "GUARDAR PUNTUACIÓN" en el modal persiste la puntuación real con `game_id = "rompemuros"` (verificable en `/hall-of-fame`), igual que el flujo ya existente.
- [ ] "JUGAR DE NUEVO" gasta 1 crédito (`spendCredit()`, sin cambios en su lógica) y reinicia una partida completamente nueva desde la pantalla de dificultad (puntuación 0, 3 vidas, nivel 1).
- [ ] El botón "SIMULAR FIN DE PARTIDA" no aparece en `/play/rompemuros`, pero sigue apareciendo sin cambios en cualquier otro `/play/[id]` que aún no tenga motor real.
- [ ] Ningún otro juego del catálogo (`/play/asteroides`, `/play/bloques`, etc.) cambia de comportamiento o apariencia respecto a antes de este spec.
- [ ] La fila `rompemuros` en la tabla `games` de Supabase no cambia (mismo título/categoría/descripción/thumb que antes de este spec).
- [ ] Rebotar la pelota contra paredes/techo/pala reproduce `ball-bounce.mp3`, y romper un ladrillo reproduce `break-sound.mp3`.
- [ ] El ícono 🔊/🔇 dibujado en el canvas alterna el silencio al hacer click, sin lanzar la pelota ni mover la pala.
- [ ] La velocidad de la pelota es la misma a 60 y a 120 Hz, y arranca en FÁCIL 8.5, MEDIO 9.5, DIFÍCIL 11, subiendo +0.5 por nivel completado.
- [ ] Salir de `/play/rompemuros` (botón "SALIR" o navegación) detiene el loop del juego y quita los listeners de teclado/mouse.
- [ ] `npm run build` y `npm run lint` terminan sin errores ni warnings nuevos.

---

## 6 — Decisiones tomadas y descartadas

- **Sí:** reutilizar tal cual la fila `rompemuros` ya existente en `games` (id, categoría "Acción", descripción y thumb sin cambios) en vez de crear una fila `arkanoid` nueva. Motivo: decisión explícita del usuario — la descripción ya presente coincide exactamente con la mecánica de Arkanoid/Breakout, igual que ocurrió con `bloques`/Tetris en el spec 08; este spec no requiere ninguna migración de catálogo.
- **Sí:** usar `rompemuros` (el id real del catálogo) como slug de carpeta y de contrato (`createRompemurosEngine`, `RompemurosState`, `components/games/rompemuros/`) en vez de `arkanoid` (el nombre de la carpeta de referencia). Motivo: decisión explícita del usuario — mismo criterio que sentó el spec 08 con `bloques` en vez de `tetris`: el slug sigue al catálogo, no al nombre de la referencia.
- **Sí:** importar el spritesheet PNG (`assets/spritesheet-breakout.png`) tal cual a `public/games/rompemuros/` y portar la lógica de recorte de sprites, en vez de redibujar pala/pelota/ladrillos con formas planas de canvas. Motivo: decisión explícita del usuario — prioriza la fidelidad visual con el original; es el primer asset de imagen del catálogo de juegos portados, precedente que no existía hasta ahora.
- **Sí (revisada):** portar el sonido con el ícono de silencio dibujado en el canvas. Antes se había decidido omitirlo (ningún otro juego tiene audio); el usuario lo pidió tras probar el juego. Se descartaron el sonido sin control de silencio y un botón de silencio en `PlayRoom` (tocaría `play-room.tsx` y rompería el contrato de un único canvas).
- **Sí:** normalizar el movimiento por tiempo y reajustar la velocidad base a 8.5/9.5/11 (y las partículas a 10–14) por prueba y error con el usuario. Motivo: con el original (5/6/8 por frame) la pelota se sentía demasiado rápida en FÁCIL en su monitor, y al bajar los valores (3.5, luego 4.5) quedó demasiado lenta; el original va por frame y se acelera en monitores de alta frecuencia. Se descartaron solo normalizar (podía seguir rápido) y solo bajar valores (no arregla la diferencia entre monitores).
- **Sí:** durante la transición "Nivel X completado" la pelota no se mueve (en el original seguía moviéndose y podía caer, dejando el juego sin ladrillos y trabado). Desviación deliberada del original.
- **Sí:** portar el control por mouse (mover la pala, lanzar/elegir dificultad con click) además del teclado, a diferencia del criterio "solo teclado" que Asteroides y Bloques dejaron explícito. Motivo: decisión explícita del usuario — el listener va sobre el mismo `canvas` inyectado sin requerir DOM adicional, así que no hay costo arquitectónico en portarlo tal cual el original.
- **Sí:** mantener la pantalla de selección de dificultad dentro del canvas (arranca ahí en `start()`), en vez de moverla a botones externos de React antes de montar el juego. Motivo: decisión explícita del usuario — es fiel al original y no requiere ningún cambio en `PlayRoom` antes de crear el componente del juego.
- **Sí:** mantener dentro del canvas las pantallas `'start'` (pelota pegada esperando lanzamiento) y `'level-complete'` (transición de 1.5s entre niveles) tal cual el original. Motivo: son pantallas intermedias del propio flujo de juego, no estados finales que compitan con el modal "FIN DEL JUEGO" de React — no aplica el mismo criterio de corte que a `'gameover'`/`'win'`.
- **No:** dibujar un overlay `'gameover'` propio ni escuchar la tecla `R` para reiniciar. Motivo: decisión explícita del usuario — mismo criterio que Asteroides y Bloques: el fin de partida lo controla en exclusiva el modal "FIN DEL JUEGO" de React más `restart()`.
- **Sí:** tratar la victoria (completar los 5 niveles) exactamente igual que la derrota — llama `onGameOver(finalScore)` y no dibuja ningún overlay `'win'` propio. Motivo: decisión explícita del usuario — `PlayRoom` solo tiene un modal de cierre de partida; no se agrega un segundo modal "¡GANASTE!" para no abrir alcance nuevo fuera de este spec.
- **Sí:** mantener la tecla interna `Escape`/`P` para pausar, a diferencia de Bloques (que la desactivó a favor del único control externo). Motivo: decisión explícita del usuario.
- **Sí, como consecuencia de la decisión anterior:** agregar el campo `paused: boolean` a `RompemurosState`, notificado por `onStateChange` cada vez que cambia (por `Escape`/`P` interno o por `setPaused()` externo), y que `PlayRoom` sincronice su estado local `paused` desde ahí. Motivo: decisión explícita del usuario — evita que el botón "PAUSA"/"SEGUIR" y el overlay "EN PAUSA" de React queden desincronizados de la tecla interna; un solo estado de verdad para ambas vías. Este campo es exclusivo de `RompemurosState` — no se agrega a `AsteroidsState` ni a `BloquesState`, que no tienen tecla de pausa interna que sincronizar.
- **Sí:** mantener también el overlay "PAUSADO" propio del canvas, en paralelo al overlay "EN PAUSA" de React (dual), en vez de apagar el interno. Motivo: decisión explícita del usuario — el overlay "PAUSADO" no es un HUD de datos, así que la redundancia con "EN PAUSA" de React se acepta (a diferencia del HUD de puntuación/vidas, que no se duplica; ver decisión siguiente).
- **Sí:** usar únicamente el HUD del propio juego (Score y vidas dibujados dentro del canvas) y ocultar PUNTUACIÓN/VIDAS/NIVEL del HUD externo de `PlayRoom`, igual que Bloques. Motivo: decisión explícita del usuario (corrige la decisión inicial de HUD doble como Asteroides) — evita mostrar los mismos números dos veces.
- **No:** HUD doble como Asteroides. Motivo: descartado por el usuario tras revisar el Draft.
- **Sí:** portar todo el motor (niveles, `LevelManager`, física, sprites) en un único archivo `engine.ts`, en vez de conservar la separación en varios módulos que tiene la referencia (`game.js`/`levels.js`/`level-manager.js`/`assets/spritesheet.js`). Motivo: mismo criterio ya establecido por Asteroides y Bloques — un archivo por motor, sin fragmentar en módulos adicionales.
- **No:** controles táctiles/móviles. Motivo: heredado del criterio de specs 06/08.
- **No:** cambiar la economía de créditos. Motivo: fuera de alcance — comportamiento de plataforma compartido.

---

## 7 — Riesgos identificados

| Riesgo                                                                                                                                                                                                                                                   | Mitigación                                                                                                                                                                                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El spritesheet PNG tarda en cargar (`Image.onload` asíncrono): si `start()` arrancara el loop antes de que termine de cargar, los primeros frames dibujarían sprites vacíos.                                                                             | El motor espera a `loadSpritesheet(cb)` antes de llamar `requestAnimationFrame(loop)` por primera vez, igual que hace el original (`loadSpritesheet(() => { requestAnimationFrame(loop); })`) — no hay frames sin imagen cargada.           |
| Mantener dos caminos de pausa (`Escape`/`P` interno y el botón externo) es justo el riesgo que Bloques evitó desactivando su tecla interna; si `onStateChange` no se dispara en cada cambio de `paused`, ambos caminos podrían desincronizarse de nuevo. | Mitigado por diseño: `paused` es un campo más de `RompemurosState`, notificado con el mismo mecanismo que ya usan `score`/`lives`/`level` — no es una ruta especial, así que hereda la misma garantía de sincronía que el resto del estado. |
| El canvas ampliado con dos overlays de pausa (el del motor y el de React) podría verse recargado si ambos difieren mucho en estilo.                                                                                                                      | Aceptado como compromiso explícito (sección 6, decisión de mantener ambos overlays de pausa): la redundancia es intencional, y el overlay del motor conserva el estilo simple del original (texto blanco sobre fondo semitransparente).     |

---

## Lo que **no** entra en este spec

- Música de fondo, volumen ajustable y persistencia de la preferencia de silencio.
- Controles táctiles/móviles.
- Cambios a la economía de créditos.
- Cambios al título/categoría/descripción/thumb de la fila `rompemuros` del catálogo.
- Adaptar cualquier otro juego pendiente del catálogo (serpiente, invasores, laberinto).
- Escalado por `devicePixelRatio` / mayor resolución de renderizado.
- Persistir o reanudar una partida abandonada al salir con "SALIR".
- Niveles, dificultades o layouts de ladrillos adicionales a los 5 ya definidos en la referencia.

Cada uno de estos, si se aborda, va en su propio spec.
