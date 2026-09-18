# SPEC 07 — Catálogo de juegos y leaderboard en Supabase

> **Status:** Aprovado
> **Depends on:** SPEC 05
> **Date:** 2026-09-18
> **Objective:** Migrar el catálogo de juegos y las puntuaciones (leaderboard) de datos simulados en código/`localStorage` a dos tablas reales de Supabase (`games` y `scores`), leídas desde Server Components y escritas con una Server Action, sin tocar la autenticación simulada.
> c

---

## 1 — Por qué existe este spec

Desde el spec 01, `app/data.ts` es "el único punto de datos simulados de la app": el catálogo (`GAMES`) y los rankings semilla (`SEED`) viven ahí como arrays en código, y `lib/scores.ts` combina esa semilla con las partidas guardadas en `localStorage` del navegador (`contexts/scores-context.tsx`). Esto significa que el leaderboard hoy **no es compartido**: cada navegador ve su propia copia de "sus" puntuaciones superpuesta sobre la misma semilla fija.

El spec 05 dejó los clientes de Supabase (`lib/supabase/client.ts`, `lib/supabase/server.ts`) conectados y probados, pero dejó explícitamente fuera "cualquier tabla nueva en Supabase" y "migrar el catálogo de juegos o los rankings/puntuaciones", para no mezclar "conectar Supabase" con cambios de comportamiento. Este spec es ese trabajo pendiente: crea `games` y `scores` como tablas reales, y hace que el catálogo y el leaderboard sean iguales para cualquiera que entre a la app, sin importar el navegador.

La autenticación sigue siendo la sesión simulada de `contexts/session-context.tsx` (sin cambios): las puntuaciones se guardan con el nombre de esa sesión (o `"INVITADO"`) como texto libre, igual que hoy, solo que ahora en una tabla compartida en vez de en `localStorage`.

---

## 2 — Scope

**In:**

- Dos tablas nuevas en el esquema `public` de Supabase, con RLS habilitado:
  - `games`: catálogo de juegos (reemplaza `GAMES` de `app/data.ts`). Lectura pública; sin insert/update/delete desde la app (el catálogo se administra solo por migración SQL).
  - `scores`: historial completo de partidas guardadas (reemplaza `SEED` + `localStorage` de `lib/scores.ts`). Lectura pública e **insert público** (sin requerir sesión real, igual que hoy con la sesión simulada); sin update/delete desde la app.
- Migración SQL que crea ambas tablas, sus políticas RLS, y **siembra** los datos actuales: los 6 juegos de `GAMES` tal cual están hoy, y las puntuaciones de `SEED` como filas iniciales de `scores` (mismos nombres/puntuaciones/orden de fechas que genera `board()` hoy).
- Capa de consultas server-only en `lib/supabase/queries.ts`, usada desde Server Components (`page.tsx`) para leer `games` y calcular los boards (top 10 por juego se calcula en la consulta con `ORDER BY score DESC LIMIT 10`, no se recorta al insertar).
- Una Server Action (`app/play/[id]/actions.ts`) para guardar una puntuación nueva (`insert` en `scores`), con manejo de error explícito (ver sección 4).
- Migrar a este modelo las páginas que hoy leen del catálogo/leaderboard simulado: `/`, `/games`, `/game/[id]`, `/hall-of-fame`, `/play/[id]` (solo el guardado).
- Eliminar `contexts/scores-context.tsx` y su uso en `contexts/providers.tsx`; reducir `lib/scores.ts` a lo que ya no dependa de `localStorage` (p. ej. `rankColor`), o eliminarlo si todo se traslada a `lib/supabase/queries.ts`.
- `app/data.ts` deja de exportar `GAMES`, `SEED` y `byId`; conserva solo `CATEGORIES` (lista de filtro de UI, no datos de dominio).

**Out of scope (para specs futuros):**

- Autenticación real con Supabase Auth. La sesión sigue simulada; el nombre guardado en `scores.player_name` sigue siendo texto libre sin relación a ninguna cuenta real.
- Actualización en vivo del leaderboard vía Supabase Realtime (suscripciones). Los datos se leen al cargar la página y se refrescan tras guardar la propia puntuación (`router.refresh()`).
- Cualquier UI de administración para crear/editar/borrar juegos desde la app (el catálogo se siembra y mantiene por SQL).
- Borrar o corregir puntuaciones ya guardadas (moderación de leaderboard).
- Identidad única para invitados (dos personas guardando como "INVITADO" seguirán viéndose indistinguibles entre sí; ver decisión sobre la insignia "TU MEJOR MARCA").
- Cambiar la economía de créditos (`CreditsProvider`) o cualquier otro juego/mecánica.
- Escalar por `devicePixelRatio`, power-ups, u otros pendientes de specs anteriores no relacionados con datos.

---

## 3 — Modelo de datos

```sql
-- Catálogo de juegos (reemplaza GAMES de app/data.ts). Solo lectura desde la app.
create table public.games (
  id text primary key,          -- "rompemuros", "serpiente", ... mismo slug usado en /game/[id] y /play/[id]
  title text not null,
  category text not null,       -- "Acción" | "Clásico" | "Espacio" | "Puzzle" (sin "Todos": eso es solo filtro de UI)
  desc text not null,
  long text not null,
  thumb text not null,          -- gradiente CSS de la carátula
  created_at timestamptz not null default now()
);
alter table public.games enable row level security;
create policy "games_select_public" on public.games for select using (true);
-- Sin políticas de insert/update/delete: el catálogo se administra por SQL, no desde la app.

-- Historial de partidas guardadas (reemplaza SEED + localStorage de lib/scores.ts).
create table public.scores (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games(id),
  player_name text not null,
  score integer not null check (score >= 0),
  created_at timestamptz not null default now()
);
create index scores_game_id_score_idx on public.scores (game_id, score desc);
alter table public.scores enable row level security;
create policy "scores_select_public" on public.scores for select using (true);
create policy "scores_insert_public" on public.scores for insert with check (true);
-- Sin políticas de update/delete: no se puede editar ni borrar una puntuación desde la app.
```

```ts
// lib/supabase/queries.ts (server-only: usa lib/supabase/server.ts)
export async function getGames(): Promise<Game[]>;
export async function getGameById(id: string): Promise<Game | undefined>;
export async function getBoard(
  gameId: string,
  limit?: number,
): Promise<BoardRow[]>; // top N, default 10
export async function getBoardsForGames(
  gameIds: string[],
): Promise<Record<string, BoardRow[]>>; // una consulta por juego, para /hall-of-fame
export async function getBestPerGame(): Promise<
  { game: Game; row: BoardRow | undefined }[]
>; // para "/" y "/games"
export async function getTopPlayersGlobal(limit?: number): Promise<BoardRow[]>; // default 5, para "/"
```

```ts
// app/play/[id]/actions.ts
"use server";
export async function saveScoreAction(
  gameId: string,
  playerName: string,
  score: number,
): Promise<{ ok: true } | { ok: false; error: string }>;
```

`lib/types.ts`: `Game` no cambia de forma (mismos campos que hoy). `BoardRow` pierde el campo `mine` (ya no viene de `localStorage`); "TU MEJOR MARCA" en `/hall-of-fame` se calcula comparando `row.name === (user ?? "INVITADO")` en el componente, sin ese campo. `ScoreEntry` deja de usarse fuera de `queries.ts` (el `date` con formato "DD/MM/AAAA" se sigue mostrando igual, calculado ahí desde `created_at`).

---

## 4 — Plan de implementación

1. **Migración SQL y semilla.** Crear, vía Supabase (herramienta MCP de migración), las tablas `games` y `scores` de la sección 3 con sus políticas RLS, e insertar como filas iniciales los 6 juegos actuales de `GAMES` y las puntuaciones actuales de `SEED` (mismos nombres/puntuaciones/orden de fechas que genera `board()` hoy en `lib/scores.ts`). Sistema funcional: la app no cambia todavía, nada la consulta. Verificación: listar tablas de `public` confirma `games` (6 filas) y `scores` (~60 filas semilla).
2. **Capa de consultas (`lib/supabase/queries.ts`).** Implementar las funciones de la sección 3 usando `lib/supabase/server.ts`, mapeando filas a `Game`/`BoardRow` (formateando `created_at` a "DD/MM/AAAA"). Aún no se importa desde ninguna página. Verificación: `npx tsc --noEmit` sin errores en el archivo nuevo.
3. **Server Action de guardado (`app/play/[id]/actions.ts`).** Implementar `saveScoreAction` con `"use server"`: valida `score` entero ≥ 0, hace `insert` en `scores` vía `lib/supabase/server.ts`, devuelve `{ok:true}` o `{ok:false,error}` atrapando cualquier error de red/insert. Aún no se llama desde ningún componente. Verificación: `npm run build` sigue pasando.
4. **Migrar `/games`.** Convertir `app/games/page.tsx` en Server Component que llama `getGames()` y calcula el mejor puntaje por juego; mover el contenido actual (búsqueda, filtro por categoría, grilla) a un nuevo `app/games/games-client.tsx` ("use client") que recibe `games` y el mapa de mejores puntuaciones como props, sin `useScores`. `app/data.ts` pierde `GAMES`/`SEED`/`byId`, conserva solo `CATEGORIES`. Verificación manual (`npm run dev`): `/games` se ve y filtra igual que antes, con datos leídos de Supabase.
5. **Migrar `/game/[id]`.** `page.tsx` usa `getGameById` y `getBoard`; `game-detail.tsx` deja de usar `useScores` y recibe `best`/`boardRows` como props; `components/score-board.tsx` recibe `rows: BoardRow[]` en vez de leerlas de `useScores`. Verificación manual: la ficha de cada juego muestra el mismo "MEJOR" y el mismo panel de mejores puntuaciones que antes del cambio.
6. **Migrar `/hall-of-fame`.** `page.tsx` llama `getGames()` y `getBoardsForGames()` para traer el top 10 de los 6 juegos en un solo round trip inicial; `hall-of-fame.tsx` recibe `games`/`boards` como props, quita `useScores`, y calcula `isYou` comparando `r.name === me` (sin el campo `mine`). Verificación manual: cambiar de pestaña sigue siendo instantáneo, sin recargar ni volver a pedir datos al servidor (los boards de los 6 juegos ya están en memoria del cliente).
7. **Migrar Home (`/`).** Dividir `app/page.tsx` en un Server Component que llama `getGames()`, `getBestPerGame()` y `getTopPlayersGlobal(5)`, y un nuevo `app/home-client.tsx` ("use client") con todo el contenido visual/interactivo actual (hero, `Reveal`, secciones), recibiendo esos datos como props en vez de `useScores`. Verificación manual: las secciones "ÚLTIMAS PUNTUACIONES" y "TOP JUGADORES" muestran los mismos datos que `/hall-of-fame` y `/games`.
8. **Migrar el guardado en `/play/[id]`.** `play-room.tsx` reemplaza `useScores().saveScore` por `saveScoreAction(game.id, playerName, score)`; `handleSave` pasa a ser `async` con estado de envío en curso y de error (si falla, muestra un mensaje y deja "GUARDAR PUNTUACIÓN" disponible para reintentar, sin perder el crédito ni el resultado de la partida ya jugada); tras guardar con éxito llama `router.refresh()`. Se retira el texto "Modo invitado: la puntuación se guarda solo en este dispositivo" (ya no es cierto: toda puntuación, de invitado o no, va a la tabla compartida). Verificación manual: jugar una partida, guardar, navegar a `/hall-of-fame` y confirmar que la puntuación nueva aparece.
9. **Limpieza.** Eliminar `contexts/scores-context.tsx` y quitar `ScoresProvider` de `contexts/providers.tsx`. Reducir `lib/scores.ts` a lo que ya no dependa de `localStorage`/`SEED`/`GAMES` (p. ej. `rankColor`), o eliminarlo por completo si su contenido útil ya vive en `lib/supabase/queries.ts`. Verificación: `npm run build` no reporta imports rotos.
10. **Remate.** `npm run build` y `npm run lint` sin errores ni warnings nuevos. Recorrer manualmente `/`, `/games` (buscar y filtrar), `/game/[id]` (varios juegos), `/hall-of-fame` (cambiar de pestaña), y `/play/asteroides` + `/play/rompemuros` (guardar una puntuación) confirmando que todo lee y escribe contra Supabase y no queda ningún uso de `localStorage` para juegos/puntuaciones. Confirmar que `/auth`, `components/nav-bar.tsx` y la sesión simulada siguen sin cambios. Si `next dev` regeneró el bloque `<!-- BEGIN:nextjs-agent-rules -->` de `AGENTS.md`, commitearlo.

---

## 5 — Criterios de aceptación

- [ ] El esquema `public` de Supabase tiene las tablas `games` (6 filas) y `scores` (con las puntuaciones semilla migradas), ambas con RLS habilitado.
- [ ] `games` permite `select` público y no tiene ninguna política de `insert`/`update`/`delete`.
- [ ] `scores` permite `select` e `insert` público, y no tiene ninguna política de `update`/`delete`.
- [ ] `/games` muestra el catálogo y el filtro por categoría/búsqueda igual que antes, con datos leídos de la tabla `games`.
- [ ] `/game/[id]` muestra "MEJOR" y el panel de mejores puntuaciones leyendo de la tabla `scores`.
- [ ] `/hall-of-fame` muestra el top 10 de cada juego leyendo de `scores`; cambiar de pestaña no dispara una nueva petición al servidor.
- [ ] `/` ("ÚLTIMAS PUNTUACIONES" y "TOP JUGADORES") muestra datos consistentes con `/hall-of-fame` y `/games`, leídos de Supabase.
- [ ] Guardar una puntuación desde el modal "FIN DEL JUEGO" en `/play/[id]` inserta una fila real en `scores` (verificable recargando `/hall-of-fame`), usando el nombre de la sesión simulada o "INVITADO".
- [ ] Si el guardado falla, se muestra un mensaje de error y "GUARDAR PUNTUACIÓN" sigue disponible para reintentar, sin perder el crédito gastado ni la puntuación obtenida.
- [ ] La insignia "TU MEJOR MARCA" en `/hall-of-fame` se calcula comparando el nombre de la fila con el usuario de la sesión actual (sin depender de `localStorage`).
- [ ] `contexts/scores-context.tsx` ya no existe y no está montado en `contexts/providers.tsx`.
- [ ] `app/data.ts` ya no exporta `GAMES`, `SEED` ni `byId`; solo `CATEGORIES`.
- [ ] Ningún componente de la app lee `localStorage` para juegos o puntuaciones.
- [ ] `contexts/session-context.tsx`, `app/auth/page.tsx`, `components/nav-bar.tsx` y `contexts/credits-context.tsx` quedan sin cambios de comportamiento.
- [ ] `npm run build` y `npm run lint` terminan sin errores ni warnings nuevos.

---

## 6 — Decisiones tomadas y descartadas

- **Sí:** un solo spec para ambas tablas (`games` y `scores`) en vez de dos specs separados. Motivo: decisión explícita del usuario — `scores` referencia `games` por FK y ambas comparten el mismo esfuerzo de "migrar a Supabase".
- **Sí:** `games` reemplaza por completo `GAMES` de `app/data.ts` como fuente de verdad. Motivo: decisión explícita del usuario — coincide con "tabla de juegos".
- **Sí:** `scores` reemplaza por completo `localStorage`/`lib/scores.ts` como fuente de verdad del leaderboard (no coexisten). Motivo: decisión explícita del usuario — un leaderboard real implica una verdad compartida entre navegadores, no una copia por navegador.
- **Sí:** inserción de puntuaciones sin autenticación real, con RLS de `insert` público y `player_name` como texto libre. Motivo: decisión explícita del usuario — la sesión sigue simulada (spec 05 no cambia auth); no tiene sentido bloquear el guardado hasta un spec de auth real que todavía no existe.
- **Sí:** migrar los datos semilla actuales (`GAMES` + `SEED`) como filas iniciales, en vez de empezar con las tablas vacías. Motivo: decisión explícita del usuario — evita que la app se vea vacía tras el cambio.
- **Sí:** lectura vía Server Components (`lib/supabase/server.ts` desde `page.tsx`), pasando los datos ya resueltos como props a los componentes cliente existentes. Motivo: decisión explícita del usuario — aprovecha SSR; los componentes cliente actuales conservan su interactividad (tabs, búsqueda, filtros) operando sobre datos ya cargados, sin refetch por cada interacción.
- **Sí:** en `/hall-of-fame`, traer el top 10 de los 6 juegos en la carga inicial (`getBoardsForGames`) en vez de re-consultar Supabase en cada cambio de pestaña. Motivo: con solo 6 juegos el costo es mínimo y mantiene el cambio de pestaña instantáneo, igual que la experiencia actual.
- **No:** actualización en vivo con Supabase Realtime. Motivo: decisión explícita del usuario — por simplicidad, alcanza con leer al cargar y refrescar tras guardar la propia puntuación.
- **Sí:** `scores` guarda el historial completo de partidas (sin podar a las 10 mejores); el top 10 se calcula en la consulta (`ORDER BY score DESC LIMIT 10`). Motivo: decisión explícita del usuario — más simple, no se pierde información, y evita lógica extra de poda tras cada insert.
- **Sí:** el guardado de una puntuación nueva usa una Server Action (`"use server"`) en vez de un insert directo desde el cliente. Motivo: decisión explícita del usuario — es el patrón idiomático de Next.js App Router y permite usar `router.refresh()` tras guardar.
- **Sí:** `created_at` (timestamptz, default `now()`) en vez del campo `date` de texto manual. Motivo: decisión explícita del usuario — es el tipo nativo de Postgres/Supabase; el formato "DD/MM/AAAA" se sigue mostrando igual en la UI, calculado desde el timestamp en `lib/supabase/queries.ts`.
- **No:** derivar `CATEGORIES` de la tabla `games`. Motivo: decisión explícita del usuario — es una lista de filtro de UI (incluye "Todos", que no es una categoría real de ningún juego), no datos de dominio; se queda hardcodeada en `app/data.ts`.
- **Sí:** si falla el insert de una puntuación, mostrar un mensaje de error y permitir reintentar. Motivo: decisión explícita del usuario — no se debe perder el crédito gastado ni el resultado de la partida por un fallo de red.
- **Sí:** la insignia "TU MEJOR MARCA" se calcula por coincidencia de nombre de sesión (`row.name === me`), sin el campo `mine`. Motivo: decisión explícita del usuario, con la salvedad aceptada de que varios invitados con el nombre "INVITADO" verán la insignia en las mismas filas (ver riesgos).
- **No:** tocar `contexts/session-context.tsx`, `app/auth/page.tsx`, `components/nav-bar.tsx` o la economía de créditos. Motivo: fuera de alcance — es autenticación real y créditos, temas de specs aparte.

---

## 7 — Riesgos identificados

| Riesgo                                                                                                                                                                                                                                                 | Mitigación                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La insignia "TU MEJOR MARCA" se basa solo en el nombre de sesión: varios invitados nombrados "INVITADO" (o dos usuarios que escriban el mismo nombre en la sesión simulada) verán la insignia en las mismas filas, sin ser realmente la misma persona. | Aceptado como compromiso explícito (sección 6): no hay identidad única sin autenticación real. Se resuelve cuando exista un spec de auth real con Supabase Auth.                                           |
| Sin Realtime, si dos pestañas del mismo navegador guardan puntuaciones, la que no guardó no ve el cambio hasta recargar o navegar (no hay `router.refresh()` automático fuera de la propia acción de guardado).                                        | Aceptado como compromiso explícito (sección 6, "no Realtime"); es el mismo tipo de estado "no reactivo entre pestañas" que ya existía antes con `localStorage` + evento `storage` solo en el mismo origen. |
| `getBoardsForGames` hace una consulta por juego (6 consultas) en la carga de `/hall-of-fame`; si el catálogo crece mucho en el futuro, ese patrón no escala.                                                                                           | Aceptado para el tamaño actual (6 juegos); si el catálogo crece, un spec futuro puede cambiarlo a una sola consulta agrupada (ventana `ROW_NUMBER() OVER (PARTITION BY game_id ...)`).                     |

---

## Lo que **no** entra en este spec

- Autenticación real con Supabase Auth (la sesión sigue simulada).
- Actualización en vivo del leaderboard con Supabase Realtime.
- UI de administración para crear/editar/borrar juegos.
- Borrar o corregir puntuaciones ya guardadas.
- Identidad única para invitados.
- Cambios a la economía de créditos o a cualquier mecánica de juego.

Cada uno de estos, si se aborda, va en su propio spec.
