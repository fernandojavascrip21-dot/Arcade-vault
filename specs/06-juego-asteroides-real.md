# SPEC 06 — Motor real del juego Asteroides

> **Status:** Aceptado
> **Depends on:** SPEC 01
> **Date:** 2026-09-15
> **Objective:** Portar el motor real de `references/started-games/02-asteroids/game.js` a un componente React/Canvas e integrarlo en `/play/asteroides`, reemplazando ahí el simulador de `PlayRoom` (HUD, pausa, guardado de puntuación y créditos), sin tocar el resto de los juegos del catálogo.

---

## 1 — Por qué existe este spec

Desde el spec 01, `/play/[id]` es un simulador: no hay ningún motor de juego real, solo un botón "SIMULAR FIN DE PARTIDA" que genera una puntuación aleatoria para poder recorrer el flujo de guardado. `app/data.ts` ya tiene la entrada `asteroides` en el catálogo (categoría "Espacio"), y en `references/started-games/02-asteroids/` existe una implementación completa y funcional del juego (`game.js`, canvas puro, sin dependencias) que ya fue probada de forma independiente.

Este es el primer juego real de la plataforma. El objetivo es portar esa lógica ya probada tal cual — sin reescribirla ni "mejorarla" — y conectarla a la sala de juego que ya existe, para que `/play/asteroides` deje de ser una simulación y los demás juegos del catálogo sigan exactamente como están hasta que tengan su propio spec de adaptación.

---

## 2 — Scope

**In:**

- Nuevo módulo `components/games/asteroids/engine.ts`: puerto a TypeScript de la lógica de `game.js` (utilidades `wrap`/`dist`/`rand`/`randInt`, constantes `RADII`/`SPEEDS`/`POINTS`/`LARGE_ASTEROID_SHAPE`, clases `Bullet`, `Asteroid`, `Ship`, `Particle`, y las funciones de estado `spawnAsteroids`/`initGame`/`nextLevel`/`explode`/`killShip`/`update`/`draw`), sin JSX y sin `window`/`document` globales fuera de una factoría explícita. Mecánica sin cambios: mismas constantes de velocidad, rotación, empuje, cooldown de disparo, puntos por tamaño de asteroide, invencibilidad al reaparecer y bomba nova.
  - Cambios deliberados respecto al original (para poder integrarse con el modal ya existente, ver decisiones):
    - `drawHUD` se mantiene activo tal cual (sigue dibujando SCORE, NIVEL, iconos de vidas y el aviso "BOMBA NOVA [B]" dentro del canvas, exactamente como en el original) — no se apaga ni se elimina. Además, cada vez que cambian puntuación/vidas/nivel/bomba nova, el motor notifica ese mismo estado por callback (`onStateChange`) para que el HUD externo de `PlayRoom` lo refleje también. Es decir: **coexisten dos HUD** (el del canvas y el de React), mostrando la misma información en paralelo — decisión explícita del usuario, ver sección 6.
    - `drawOverlay` (el texto "GAME OVER"/"ESPACIO PARA REINICIAR") y el auto-reinicio con Espacio en el estado `gameover` sí se desactivan — ese flujo de fin de partida pasa a ser controlado exclusivamente por el modal "FIN DEL JUEGO" de React (esto no aplica al HUD, solo a la pantalla final).
    - Al llegar a 0 vidas ya no escucha Espacio para reiniciar solo; queda congelado hasta que algo externo llame `restart()`.
    - Expone una factoría `createAsteroidsEngine(canvas, handlers)` que devuelve `{ start(): void; stop(): void; setPaused(paused: boolean): void; restart(): void }`, y notifica por callback los cambios de puntuación/vidas/nivel y el fin de partida (ver sección 3).
- Nuevo componente `components/games/asteroids/asteroids-game.tsx` ("use client"): un `<canvas>` de resolución interna 800×600 con clases `h-full w-full object-contain` (para caber, con franjas negras, dentro de la caja 16:10 de `CrtFrame` sin tocar ese componente), que monta/desmonta el motor en un `useEffect` y expone `restart()` vía `ref` (`useImperativeHandle`). Props: `paused: boolean`, `onStateChange`, `onGameOver`.
- Cambios en `app/play/[id]/play-room.tsx`, solo activos cuando `game.id === "asteroides"`:
  - Se reemplaza el fondo estático del `CrtFrame` (`art`) por `<AsteroidsGame />`, con `label=""` (deja de ser una "PREVISUALIZACIÓN").
  - El HUD externo (PUNTUACIÓN, VIDAS, NIVEL) pasa a reflejar en vivo el estado real del motor (`onStateChange`), en vez de los valores fijos actuales (♥♥♥, NIVEL 01) — en paralelo al HUD que el propio canvas sigue dibujando (SCORE, NIVEL, vidas, BOMBA NOVA), sin apagarlo.
  - El botón "SIMULAR FIN DE PARTIDA" se oculta para este juego (el motor real decide el fin de partida).
  - El texto de controles bajo el `CrtFrame` cambia a `← → ROTAR · ↑ IMPULSO · ESPACIO DISPARAR · B BOMBA NOVA`.
  - `onGameOver(finalScore)` del motor dispara exactamente el mismo modal "FIN DEL JUEGO" que ya existe (`over = true`, `score = finalScore`).
  - "JUGAR DE NUEVO" (`replay`), tras gastar el crédito con `spendCredit()` (sin cambios en esa lógica), llama `restart()` del motor y resetea `lives`/`level` a sus valores iniciales (3/1) además de `score` a 0.
  - Pausa (botón "PAUSA", ya existente): al activarse, el motor deja de correr `update()`/`draw()` (el frame queda congelado) mientras se sigue mostrando el overlay "EN PAUSA" ya existente; al reanudar continúa desde donde quedó.

**Out of scope (para specs futuros):**

- Adaptar cualquier otro juego del catálogo (rompemuros, serpiente, invasores, bloques, laberinto) — siguen usando el simulador actual sin ningún cambio.
- Controles táctiles/móviles. El juego portado sigue siendo solo de teclado, igual que el original.
- Cambiar la economía de créditos (`CreditsProvider`/`spendCredit`/`insertCoin`). Se reutiliza tal cual existe hoy: la primera partida es gratis, "JUGAR DE NUEVO" gasta 1 crédito.
- Cualquier power-up, tipo de asteroide o mecánica que no exista ya en `game.js` (el `README.md` de la referencia menciona power-ups y una "estrella fugaz" que no están implementados en el código real — no se inventan aquí).
- Ajustar la relación de aspecto de `CrtFrame` (se mantiene 16:10 para todos los juegos; el canvas 4:3 de Asteroides se letterboxea dentro).
- Renderizado a mayor resolución que 800×600 para pantallas de alta densidad (sin escalado por `devicePixelRatio`).
- Guardar el estado de una partida en curso al salir con "SALIR" (sigue sin poder reanudarse una partida abandonada, igual que hoy).

---

## 3 — Modelo de datos

Este feature no introduce ningún tipo de dominio nuevo (no hay cambios a `Game`, `ScoreEntry`, etc. de `lib/types.ts`). Introduce el contrato del motor portado:

```ts
// components/games/asteroids/engine.ts
export interface AsteroidsState {
  score: number;
  lives: number;
  level: number;
  novaBombs: number; // 0 o 1; el mismo valor que ya muestra el aviso "BOMBA NOVA [B]" dentro del canvas
}

export interface AsteroidsHandlers {
  onStateChange: (state: AsteroidsState) => void; // espejo, para el HUD externo, de lo que ya se dibuja dentro del canvas — cada vez que score/lives/level/novaBombs cambian
  onGameOver: (finalScore: number) => void; // una sola vez, al perder la última vida
}

export interface AsteroidsEngine {
  start(): void; // agrega listeners de teclado y arranca el loop (requestAnimationFrame)
  stop(): void; // cancela el loop y quita los listeners (cleanup en unmount)
  setPaused(paused: boolean): void; // congela/descongela update()+draw() sin perder estado
  restart(): void; // equivalente a initGame(): score=0, lives=3, level=1, nueva partida
}

export function createAsteroidsEngine(
  canvas: HTMLCanvasElement,
  handlers: AsteroidsHandlers,
): AsteroidsEngine;
```

```ts
// components/games/asteroids/asteroids-game.tsx
export interface AsteroidsGameHandle {
  restart(): void;
}

export function AsteroidsGame(props: {
  paused: boolean;
  onStateChange: (state: AsteroidsState) => void;
  onGameOver: (finalScore: number) => void;
}): JSX.Element; // usar con ref: AsteroidsGameHandle
```

No hay persistencia nueva: la puntuación final sigue guardándose exactamente igual que hoy, vía `useScores().saveScore(game.id, score)` en `lib/scores.ts` (localStorage), sin cambios a ese módulo.

---

## 4 — Plan de implementación

1. **Motor portado (`components/games/asteroids/engine.ts`).** Trasladar a TypeScript toda la lógica de `game.js` descrita en la sección 2, envuelta en `createAsteroidsEngine(canvas, handlers)`. Sin JSX, sin usarse todavía desde ninguna página. Verificación: `npm run build` sigue pasando (módulo sin importar desde la app, sin errores de tipos); `npx tsc --noEmit` no reporta errores en el archivo nuevo.
2. **Componente canvas (`components/games/asteroids/asteroids-game.tsx`).** Crear el componente cliente descrito en la sección 3, que monta el motor en un `useEffect` (`start()` al montar, `stop()` en el cleanup) y expone `restart()` por `ref`. Verificación manual puntual: montarlo temporalmente en una página de prueba (revertida antes del siguiente paso) y confirmar en el navegador que se comporta igual que abrir `references/started-games/02-asteroids/index.html` (nave, disparo, asteroides, bomba nova, HUD del canvas visible durante toda la partida, y al llegar a 0 vidas el juego queda congelado sin el overlay "GAME OVER" ni reinicio con Espacio).
3. **Integración en `PlayRoom`.** Modificar `app/play/[id]/play-room.tsx` según la sección 2: estado nuevo para `lives`/`level` (default 3/1), bandera `isAsteroids = game.id === "asteroides"`, render condicional de `<AsteroidsGame />` dentro de `CrtFrame`, ocultar "SIMULAR FIN DE PARTIDA" y actualizar el texto de controles cuando `isAsteroids`, conectar `onStateChange`/`onGameOver`, y ajustar `replay()` para llamar `restart()` y resetear `lives`/`level`. Los demás juegos (`isAsteroids === false`) no cambian ni un pixel de comportamiento. Verificación manual en `npm run dev`: jugar `/play/asteroides` completo — mover, disparar, romper asteroides grandes en medianos y pequeños, ver el HUD (puntuación/vidas/nivel) actualizarse en vivo, pausar y confirmar que el juego se congela, perder las 3 vidas y ver aparecer el modal "FIN DEL JUEGO" con la puntuación real, "GUARDAR PUNTUACIÓN" la persiste, "JUGAR DE NUEVO" gasta un crédito y reinicia desde cero, "VOLVER AL VAULT" navega a `/games`. Confirmar además que `/play/rompemuros` (o cualquier otro juego del catálogo) sigue idéntico a como estaba antes de este spec.
4. **Remate.** `npm run build` y `npm run lint` sin errores ni warnings nuevos. Confirmar que no queda ningún listener de teclado activo tras navegar fuera de `/play/asteroides` (sin efectos en otras páginas, por ejemplo que las flechas no muevan nada fuera del juego). Si `next dev` regeneró el bloque `<!-- BEGIN:nextjs-agent-rules -->` de `AGENTS.md`, commitearlo junto al resto.

---

## 5 — Criterios de aceptación

- [ ] `/play/asteroides` muestra el juego real (canvas) dentro del `CrtFrame`, no el fondo de gradiente estático.
- [ ] La nave rota con `←`/`→`, acelera con `↑`, dispara con `Espacio`, y la bomba nova se activa con `B` cuando hay una disponible — mismo comportamiento que `references/started-games/02-asteroids/game.js`.
- [ ] Los asteroides grandes se destruyen en 2 medianos, los medianos en 2 pequeños, y los pequeños desaparecen, sumando 20/50/100 puntos respectivamente (igual que el original).
- [ ] El HUD externo de `PlayRoom` (PUNTUACIÓN, VIDAS, NIVEL) refleja en vivo el estado real del juego mientras se juega, sin valores fijos.
- [ ] El HUD dibujado dentro del canvas (SCORE, NIVEL, iconos de vidas, aviso "BOMBA NOVA [B]") sigue visible tal cual el original, en paralelo al HUD externo — ambos muestran la misma información al mismo tiempo.
- [ ] El botón "PAUSA" congela visualmente el juego (nave, asteroides y balas dejan de moverse) mientras se muestra "EN PAUSA"; "SEGUIR" continúa exactamente desde donde quedó.
- [ ] Perder la tercera vida no muestra en pantalla ningún overlay dibujado en el canvas ("GAME OVER") ni reinicia con Espacio — el motor no invoca `drawOverlay` en tiempo de ejecución; en su lugar aparece el modal "FIN DEL JUEGO" de `PlayRoom` con la puntuación final real.
- [ ] "GUARDAR PUNTUACIÓN" en el modal persiste la puntuación real (verificable en `/hall-of-fame` o en `localStorage`), igual que el flujo ya existente.
- [ ] "JUGAR DE NUEVO" gasta 1 crédito (`spendCredit()`, sin cambios en su lógica) y reinicia una partida completamente nueva (puntuación 0, 3 vidas, nivel 1).
- [ ] El botón "SIMULAR FIN DE PARTIDA" no aparece en `/play/asteroides`, pero sigue apareciendo sin cambios en cualquier otro `/play/[id]`.
- [ ] Ningún otro juego del catálogo (`/play/rompemuros`, `/play/serpiente`, etc.) cambia de comportamiento o apariencia respecto a antes de este spec.
- [ ] Salir de `/play/asteroides` (botón "SALIR" o navegación) detiene el loop del juego y quita los listeners de teclado — las flechas/espacio no afectan nada fuera de esa página después de salir.
- [ ] `npm run build` y `npm run lint` terminan sin errores ni warnings nuevos.

---

## 6 — Decisiones tomadas y descartadas

- **Sí:** alcance limitado a Asteroides. Motivo: decisión explícita del usuario — es el primer juego real de la plataforma; los demás se adaptan en specs propios más adelante.
- **Sí:** portar `game.js` casi 1:1 a TypeScript en vez de rediseñar la arquitectura (por ejemplo, un motor genérico reutilizable para futuros juegos). Motivo: decisión explícita del usuario — minimiza el riesgo de introducir bugs en una mecánica ya probada; generalizar prematuramente para juegos que todavía no existen sería sobre-ingeniería.
- **Sí:** mantener activo el HUD dibujado dentro del canvas (`drawHUD`: SCORE, NIVEL, vidas, BOMBA NOVA) y, además, notificar el mismo estado a React para que el HUD externo de `PlayRoom` lo muestre en paralelo — **los dos HUD coexisten** (redundancia intencional). Motivo: decisión explícita del usuario — el HUD del juego es parte de la identidad visual del canvas original y no se borra; React simplemente se suma como una segunda capa informativa sincronizada.
- **Sí:** desactivar únicamente `drawOverlay` (el texto "GAME OVER"/"ESPACIO PARA REINICIAR") y el auto-reinicio con Espacio — a diferencia del HUD, el fin de partida sí pasa a ser controlado en exclusiva por el modal de React. Motivo: decisión explícita del usuario, distinta de la del HUD — evita dos flujos de reinicio compitiendo entre sí (ver también la decisión siguiente).
- **Sí:** letterbox del canvas 4:3 dentro de la caja 16:10 de `CrtFrame`, sin modificar ese componente. Motivo: decisión explícita del usuario — no afecta a los demás juegos que ya usan `CrtFrame` con esa relación de aspecto.
- **Sí:** ocultar "SIMULAR FIN DE PARTIDA" solo para Asteroides. Motivo: decisión explícita del usuario — ya no tiene sentido cuando el motor real decide el fin de partida; los demás juegos aún la necesitan porque siguen simulados.
- **No:** cambiar la economía de créditos. Motivo: decisión explícita del usuario — es un comportamiento de plataforma compartido, fuera del alcance de adaptar un juego específico.
- **No:** controles táctiles/móviles. Motivo: decisión explícita del usuario — el original solo soporta teclado; se evalúa en un spec aparte si hace falta.
- **No:** implementar power-ups o la "estrella fugaz" que menciona el `README.md` de la referencia. Motivo: no existen en el código real de `game.js`; inventarlos sería agregar alcance no pedido.
- **Sí:** ubicar el código portado en `components/games/asteroids/` (motor + componente en la misma carpeta) en vez de separar el motor en `lib/games/asteroids/`. Motivo: decisión explícita del usuario.

---

## 7 — Riesgos identificados

| Riesgo                                                                                                                                                                               | Mitigación                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El letterbox (franjas negras) del canvas 4:3 dentro de la caja 16:10 reduce el área visible del juego respecto a jugarlo a pantalla completa en 800×600.                             | Aceptado como compromiso explícito (decisión de la sección 6): no se modifica `CrtFrame` porque lo comparten los demás juegos. Las franjas son negras, igual que el fondo del canvas, por lo que el efecto visual es sutil.             |
| Sin escalado por `devicePixelRatio`, el canvas puede verse algo borroso al escalarse por CSS en pantallas grandes o de alta densidad.                                                | Aceptado como fuera de alcance; se puede resolver en un spec de pulido visual si se vuelve notorio.                                                                                                                                     |
| Si `stop()` no se llama correctamente al desmontar (por ejemplo, navegación rápida entre páginas), podrían quedar listeners de teclado o un `requestAnimationFrame` activo de fondo. | El paso 3 del plan verifica explícitamente, tras salir de `/play/asteroides`, que las teclas de juego no tengan efecto en otras páginas; el cleanup de `useEffect` en `asteroids-game.tsx` es el mecanismo estándar de React para esto. |

---

## Lo que **no** entra en este spec

- Adaptar cualquier otro juego del catálogo (rompemuros, serpiente, invasores, bloques, laberinto).
- Controles táctiles/móviles.
- Cambios a la economía de créditos.
- Power-ups o tipos de asteroide no presentes en `game.js` (aunque el `README.md` de la referencia los mencione).
- Cambiar la relación de aspecto de `CrtFrame`.
- Escalado por `devicePixelRatio` / mayor resolución de renderizado.
- Persistir o reanudar una partida abandonada al salir con "SALIR".

Cada uno de estos, si se aborda, va en su propio spec.
