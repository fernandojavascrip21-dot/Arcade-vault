# SPEC 20 — Motor del juego Laberinto

> **Status:** Aprovado
> **Depends on:** SPEC 06, SPEC 07, SPEC 15, SPEC 17
> **Date:** 2026-10-09
> **Objective:** Crear desde cero el motor del juego LABERINTO (recorrer un laberinto fijo comiendo puntos mientras cuatro guardianes con comportamiento propio te persiguen) e integrarlo en `/play/laberinto`.

---

## 1 — Por qué existe este spec

LABERINTO es el juego Clásico esencial (Pac-Man like) solicitado en el proyecto. Consiste en limpiar un mapa fijo de puntos, mientras se evita a cuatro enemigos con rutinas de inteligencia propias. El diseño se aborda desde cero con primitivas de canvas, respetando el contrato de arquitectura (`createLaberintoEngine(canvas, handlers)`, `LaberintoState`) establecido en los juegos anteriores (como Serpiente, Arkanoid, Rana y Bombardero).

---

## 2 — Scope

**In:**

- **Nuevo módulo `components/games/laberinto/engine.ts`**: motor completo en un único archivo, sin imágenes ni dependencias externas.
  - **Tablero fijo**: matriz estática de paredes, puntos y cápsulas.
  - **Jugador**: Avanza de manera continua con giro en cola.
  - **Túnel lateral**: conexión directa entre ambos extremos del tablero.
  - **Cuatro guardianes**: `cazador`, `emboscador`, `flanqueador` y `errante` (cada uno con lógica de persecución única).
  - **Cápsula de energía**: vuelve a los guardianes vulnerables y permite comerlos, devolviéndolos a su base como `ojos`.
  - **Rendimiento**: un único RAF, `dt` real con tope, paredes en canvas fuera de pantalla.
- **Nuevo componente `components/games/laberinto/laberinto-game.tsx`**: Wrapper de React usando refs para callbacks y sincronización de estado local/externo.
- **Integración en `app/play/[id]/play-room.tsx`**:
  - Renderizado condicional para `isLaberinto`.
- **Registro en base de datos**: Inserción de la partida (`scores`) en Supabase (Leaderboard y catálogo).
- **Documentación**: Actualizar los markdown en `references/` y `CLAUDE.md`.

**Not in:**

| Candidato                          | Destino   | Razón                                                   |
| ---------------------------------- | --------- | ------------------------------------------------------- |
| Controles táctiles móviles         | Follow-up | Se aborda después con el agente `mobile-porter`.        |
| Skins (colores, retro, neon)       | Follow-up | Se aborda después con el agente `skin-designer`.        |
| Auditoría de rendimiento adicional | Follow-up | Tarea para el agente `game-performance-booster`.        |
| Objetos de bonificación aleatorios | WON'T DO  | Descartado para mantener simplicidad mecánica.          |
| Vidas extra al alcanzar puntuación | WON'T DO  | Se ha optado por 3 vidas fijas durante toda la partida. |

**Constraints:**

- No modificar el esquema existente de `public.games` ni `public.scores`.
- No alterar los otros juegos integrados.

---

## 3 — Data model

El estado del motor exportado a React será sencillo, ya que el estado profundo (posiciones de entidades, laberinto restante) se mantendrá aislado internamente para evitar re-renders por frame.

```ts
// components/games/laberinto/engine.ts
export const LABERINTO_WIDTH = 1280;
export const LABERINTO_HEIGHT = 800;

export interface LaberintoState {
  score: number;
  lives: number;
  level: number;
  paused: boolean;
}

export interface LaberintoHandlers {
  onStateChange(state: LaberintoState): void; // Se emite solo cuando un campo cambia
  onGameOver(finalScore: number): void;
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

---

## 4 — Implementation plan

1. **Estructura base del motor**: Crear `components/games/laberinto/engine.ts` definiendo la matriz `MAZE`, posiciones iniciales y bucle de renderizado (`RAF`). Pintar paredes en un canvas secundario por rendimiento.
   - _Check_: El juego levanta sin errores mostrando el mapa básico dibujado sobre negro.
2. **Componente React**: Crear `laberinto-game.tsx` para montar el `canvas` e instanciar `createLaberintoEngine`.
   - _Check_: Componente expone métodos de `restart` y escucha callbacks correctamente.
3. **Integración en PlayRoom**: Modificar `play-room.tsx` añadiendo el caso para `isLaberinto`.
   - _Check_: Visitar `/play/laberinto` muestra el canvas ajustado a la pantalla.
4. **Jugador**: Implementar movimiento continuo del jugador, bloqueo con paredes y túneles laterales.
   - _Check_: El jugador navega el laberinto, respeta paredes y sale por el túnel para reaparecer al otro lado.
5. **Coleccionables y Puntuación**: Implementar consumo de puntos normales y transición al siguiente nivel (`level++`, velocidad incrementada) al vaciar el tablero.
   - _Check_: Comer puntos suma al marcador; limpiar el mapa inicia el siguiente nivel.
6. **Movimiento y fases de guardianes**: Implementar las rutinas de movimiento y alternancia entre fases (dispersión/persecución).
   - _Check_: Los guardianes salen de la base, rondan las esquinas y luego buscan activamente al jugador usando heurísticas básicas.
7. **Colisiones y Vidas**: Tocar un guardián en estado normal resta vida. A cero vidas, desencadenar el estado `GAME OVER`.
   - _Check_: Jugador muere, la partida se detiene un instante y se reanuda perdiendo una vida en el HUD. Si vidas = 0, se emite evento de fin.
8. **Mecánica de Cápsula de poder**: Al comer una píldora, guardianes pasan a estado vulnerable (huyen). Al chocarlos, se los come. Vuelven como "ojos" a la base y regeneran.
   - _Check_: Al volverse azules se los puede devorar por puntos extra; los ojos navegan rápido hacia la base.
9. **Finalización y Persistencia**: Asegurar el envío del puntaje al guardar partida (`public.scores`).
   - _Check_: "Guardar puntuación" funciona y el ranking se actualiza en el modal.

---

## 5 — Acceptance criteria

- [x] (Manual) El jugador no puede atravesar paredes. El túnel lo teletransporta al otro extremo.
- [ ] (Manual) Los controles reaccionan suavemente permitiendo un "giro en cola" fluido antes del cruce.
- [ ] (Manual) Se dibujan 4 guardianes, cada uno siguiendo comportamientos consistentes y lógicos de persecución/dispersión.
- [ ] (Manual) Comer píldoras de poder cambia el estado de guardianes, permitiendo comerlos.
- [ ] (Manual) Los guardianes comidos regresan visualmente a la base y reviven.
- [ ] (Manual) Limpiar el tablero sube de nivel, incrementando la velocidad de los enemigos.
- [x] (Manual) Al perder 3 vidas, el juego muestra la pantalla de Fin del Juego del sistema (HUD), no un texto dibujado en el canvas.
- [ ] (Manual) Presionar `Esc` o el botón de pausa pausa los relojes internos y el dibujado.
- [x] (Técnico) Solo se usa un `requestAnimationFrame` sin fugas de memoria al cambiar de juego.

---

## 6 — Decisiones tomadas y descartadas

- **Sí**: Laberinto de mapa estático y fijo; la dificultad escala subiendo la velocidad enemiga y reduciendo tiempo de vulnerabilidad. _Motivo_: Complejidad predecible y diseño probado.
- **Sí**: Conservar 3 vidas sin mecánicas de vidas extra. _Motivo_: Recomendado en la fase de análisis.
- **No**: Elementos bonus dinámicos y frutas. _Motivo_: Descartado por añadir reglas complejas adicionales no centrales.
- **Sí**: Lógica de movimiento en intersecciones por centros matemáticos en vez de píxel por píxel libre. _Motivo_: Evita errores de clipping contra las paredes.
- **Sí**: Dibujado con API Canvas puro y colores de una paleta rígida. _Motivo_: Prepara el terreno para el posterior agente `skin-designer`.

---

## 7 — Riesgos identificados

- **Movimiento inconsistente a diferentes fps**: Mitigado limitando el `dt` a 50ms máximos y escalando avances matemáticamente.
- **Enemigos atascados o rebotando**: Mitigado asegurando que la IA siempre prohíbe invertir el sentido (giros de 180 grados) por sí sola salvo tras un cambio explícito de fase (dispersión/cápsula).

---

## 8 — Addendum (2026-10-09): skins visuales

**Objetivo:** que Laberinto tenga `clasico` (default), `retro` y `neon`, con el patrón de spec 17 §8 / spec 08 §8. Preferencia solo de cliente: sin Supabase ni impacto en mecánica, `MAZE`, velocidades, tiempos, puntuación ni IA.

**Contratos (`components/games/laberinto/engine.ts`):**

```ts
export type LaberintoSkin = "clasico" | "retro" | "neon";
export const LABERINTO_SKINS: Array<{ id: LaberintoSkin; label: string }>; // CLÁSICO, RETRO, NEÓN
export const LABERINTO_SKIN_STORAGE_KEY = "arcadevault.laberinto.skin.v1";
createLaberintoEngine(canvas, handlers, options?: { initialSkin?: LaberintoSkin });
interface LaberintoEngine { /* ... */ setSkin(skin: LaberintoSkin): void }
```

`PALETTE` pasa a `SKIN_PALETTES: Record<LaberintoSkin, LaberintoPalette>` (`clasico` con los valores originales) y el trazo a `SKIN_RENDERERS` (`glow`, `wallGlow`, `scanlines`). El wrapper recibe `skin` controlada; `PlayRoom` usa `createSkinStore`/`useSkin` (snapshot de servidor `"clasico"`) y la rama `isLaberinto` de `skinControl` (chips SKIN del menú ⋮).

**Decisiones:**

- **Sí**: `setSkin()` vuelve a pintar `wallLayer` (la capa en caché) y redibuja al instante, también en pausa y con la partida terminada. _Motivo_: las paredes y la puerta no se repintan por frame. — decisión del agente (pendiente de revisar)
- **Sí**: RETRO en fósforo verde; los cuatro guardianes se distinguen por intensidad, con ojos oscuros sobre cuerpo claro; el vulnerable es el tono más apagado y su aviso parpadea a blanco. _Motivo_: monocromo sin perder legibilidad. — decisión del agente (pendiente de revisar)
- **Sí**: RETRO añade scanlines en una capa fuera de pantalla creada una vez y copiada con `drawImage` al final del frame. _Motivo_: sin trabajo por frame ni asignaciones. — decisión del agente (pendiente de revisar)
- **Sí**: NEÓN con `shadowBlur` 10 en puntos, jugador y cuerpo de guardianes (se restablece tras cada entidad), 8 en la capa de paredes (en caché); los ojos se dibujan sin glow. _Motivo_: no emborronar entidades pequeñas. — decisión del agente (pendiente de revisar)
- **Sí**: NEÓN usa paredes violeta (`#7c4dff`) y errante naranja. _Motivo_: dejar azul para el vulnerable y no repetir el verde/amarillo del flanqueador y el jugador. — decisión del agente (pendiente de revisar)
- **No**: cambiar el aspecto de `clasico`. _Motivo_: es el default.

**Criterios:**

- [ ] (Manual) Los chips SKIN del menú ⋮ muestran CLÁSICO / RETRO / NEÓN y la elección persiste al recargar.
- [ ] (Manual) Cambiar de skin en pausa redibuja paredes, puntos y guardianes al instante.
- [ ] (Manual) En cada skin los cuatro guardianes, el vulnerable y su aviso se distinguen entre sí.
- [ ] (Manual) CLÁSICO es idéntico al aspecto previo; JUGAR DE NUEVO no reinicia la skin.
- [x] (Técnico) `npm run lint` y `npm run build` limpios.

**Contrastes medidos (modo oscuro, peor caso vs. fondo de la skin):**

| Skin      | Fondo     | Peor color             | Contraste |
| --------- | --------- | ---------------------- | --------- |
| `clasico` | `#000`    | `#3a5bff` (vulnerable) | 4.12:1    |
| `retro`   | `#020a04` | `#127a2e` (vulnerable) | 3.67:1    |
| `neon`    | `#05050a` | `#3a5bff` (vulnerable) | 3.99:1    |

En RETRO el peor par entre entidades es por intensidad (errante `#25a049` vs. vulnerable `#127a2e`), ya que es monocromo.

---

## 9 — Addendum (2026-10-09): soporte móvil

**Objetivo:** que Laberinto se juegue en el navegador del teléfono con el mando táctil de spec 13 y la sala responsive de spec 14, sin cambiar el escritorio. Sin tocar el motor, la mecánica, la puntuación, las skins ni Supabase.

**Mapeo del mando (misma forma que spec 13 §2):**

| Juego       | D-pad                               | Deslizador | Acciones | `repeat` |
| ----------- | ----------------------------------- | ---------- | -------- | -------- |
| `laberinto` | ↑ ↓ ← → (`ArrowUp/Down/Left/Right`) | —          | —        | no       |

**Contratos (`components/touch-controller/layouts.ts`):**

```ts
export type TouchGameId = /* ... */ | "laberinto";
TOUCH_LAYOUTS.laberinto = { dpad: { up, down, left, right }, actions: [] };
```

**Decisiones:**

- **Sí**: D-pad de cuatro direcciones sin acciones, igual que `serpiente` y `rana`. _Motivo_: el motor solo escucha las flechas (`e.key`) y la pausa se hace con PAUSA/menú ⋮. — decisión del agente (pendiente de revisar)
- **No**: `repeat` (DAS/ARR). _Motivo_: un `keydown` repetido solo reescribe el giro en cola; no hay efecto acumulado. — decisión del agente (pendiente de revisar)
- **No**: tocar el motor, `KeyCode`, `KEY_FOR_CODE`, `ActionIcon` ni `GLYPHS`. _Motivo_: todo se expresa con teclas ya existentes. — decisión del agente (pendiente de revisar)
- Las ramas de `play-room.tsx` (`isLaberinto`, `isRealGame`, contenido del CRT, ayuda de teclado, `skinControl`, `replay()`) y el HUD (PUNTUACIÓN, VIDAS, NIVEL con `HudStat`) ya existían; no se cambian.

**Criterios:**

- [ ] (Manual) En móvil vertical y horizontal aparece el D-pad y cada flecha encola el giro; la dirección contraria se aplica al instante.
- [ ] (Manual) La barra (PUNTUACIÓN, VIDAS, NIVEL, PAUSA, ⋮) cabe en una fila a 360 px y los controles miden ≥ 44×44 px.
- [ ] (Manual) En horizontal el D-pad cabe en la columna izquierda (150 px) sin tapar el laberinto.
- [ ] (Manual) El menú ⋮ ofrece SKIN/MANDO/TEMA/SALIR y abrirlo pausa; fin de partida, guardar y JUGAR DE NUEVO funcionan.
- [ ] (Manual) En escritorio (`pointer: fine`) no hay mando ni botón MANDO y el juego se maneja con teclado como antes.
- [x] (Técnico) `npm run lint` y `npm run build` limpios.

---

## 10 — Addendum (2026-10-09): rendimiento

**Objetivo:** primer pase de rendimiento (auditoría estática, referencia spec 17) sin cambiar el frame ni la jugabilidad a 60 Hz.

**Auditoría (antes / después):**

| #   | Punto                                      | Antes                                                                                                         | Después |
| --- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | ------- |
| 1   | Un solo RAF, `stop()` simétrico            | ✅ `engine.ts:1054-1066` (`running`, `start()` idempotente, quita `keydown`, cancela RAF)                     | ✅      |
| 2   | Delta acotado                              | ✅ `MAX_DT_MS = 50` (`engine.ts:79`, `:1046`)                                                                 | ✅      |
| 3   | Movimiento escalado por `dt`               | ✅ `updatePlayer`/`updateGuardian` (`:682`, `:876`), relojes en ms desde `dt`                                  | ✅      |
| 4   | Pausa sin avance ni salto                  | ✅ `if (!paused) update(dt)` y `lastTime` se actualiza cada frame (`:1046-1048`)                              | ✅      |
| 5   | `onStateChange` solo con cambio            | ❌ comparaba bien, pero creaba el objeto `next` en cada llamada (`:416`); se llama por evento, no por frame   | ✅ compara contra las variables y crea el objeto solo si cambió |
| 6   | Wrapper                                    | ✅ `laberinto-game.tsx:37-72` (montaje único, refs, efectos de `paused`/`skin`, cleanup con `stop()`)         | ✅      |
| 7   | `onGameOver` una vez                       | ✅ `finishDeath` pone `gameOver`; `update` y teclas quedan congelados hasta `restart()` (`:973-984`)          | ✅      |
| 8   | `shadowBlur` solo en relleno principal     | ✅ solo en `neon`, restablecido tras cada entidad; ojos sin glow; `clasico`/`retro` no tocan `shadow*` (`:501-509`) | ✅ (ver no aplicado) |
| 9   | Sin asignaciones por frame                 | ✅ direcciones numéricas, `targetCol/Row`, `Uint8Array`; `{ x, y }` de `drawGuardian` no asigna (`:569`)      | ✅      |
| 10  | Capas estáticas en caché                   | ✅ `wallLayer` solo al crear y en `setSkin`; scanlines creadas una vez (`:484-499`); un `drawImage` cada una  | ✅      |
| 11  | Sin `canvas.width` ni layout en el bucle   | ✅ tamaño fijado una vez (`:321-322`)                                                                         | ✅      |
| 12  | Colecciones acotadas                       | — no hay colecciones que crezcan (4 guardianes y 640 celdas fijas; `fillCells()` en `restart()`)               | —       |
| 13  | `save()`/`restore()`                       | — el motor no usa `save`/`restore`                                                                             | —       |

**Contratos nuevos:** ninguno.

**Decisiones:**

- **Sí**: `emitState()` compara antes de crear el objeto. _Motivo_: igual que Rana, sin asignar en llamadas que no cambian nada; comportamiento idéntico. — decisión del agente (pendiente de revisar)
- **No**: cambiar `drawCells()`. _Motivo_: recorrer 640 celdas con un único `fill` es barato y cualquier caché de la ruta cambiaría el parpadeo o el orden de dibujado. — decisión del agente (pendiente de revisar)

**Correcciones no aplicadas (reportadas):**

- En `neon`, `drawCells()` aplica `shadowBlur = 10` a un único trazado con todos los puntos y cápsulas (una pasada de desenfoque, pero sobre ~300 arcos). Quitar o reducir ese glow cambia el aspecto; si en móvil se notara, hay que decidir si se limita a las cápsulas.
- `draw()` se ejecuta cada frame también en pausa y con la partida terminada (el resultado es el mismo frame). Saltarlo es posible pero no está en las reglas y exige cuidado con `setSkin`; se deja.

**Criterios:**

- [ ] (Manual) DevTools → Performance con NEÓN y RETRO: sin frames largos ni memoria creciente.
- [ ] (Manual) Cambiar de pestaña un minuto y volver: sin ráfaga ni salto de jugador o guardianes.
- [ ] (Manual) Pausar, reanudar y JUGAR DE NUEVO: sin duplicar bucles; salir de `/play/laberinto` y volver sin errores en consola.
- [ ] (Manual) Marcador, vidas y nivel se actualizan igual que antes; cada skin se ve igual.
- [x] (Técnico) `npm run lint` y `npm run build` limpios.

---

## Lo que no está en este spec

Este documento solo cubre la lógica y el motor base. Adaptaciones móviles (táctiles), personalización de temas de colores (skins) y posibles micro-optimizaciones, han sido agendadas como `Follow-Up` y deben ser implementadas secuencialmente invocando a los agentes especialistas después de cerrar este desarrollo.
