# SPEC 12 — Nombre del jugador, historial de partidas y rankings por juego y general

> **Status:** Implementado
> **Depends on:** SPEC 01, SPEC 07, SPEC 11
> **Date:** 2026-09-24
> **Objective:** Permitir que el jugador escriba (y se le recuerde) su nombre al terminar una partida para guardar su puntuación, mostrarle en "FIN DEL JUEGO" el top 10 del juego que jugó con su posición, y ofrecer en `/hall-of-fame` un ranking general por jugador subdividido por juego y una pestaña "MIS PARTIDAS" con su historial.

---

## 1 — Por qué existe este spec

El spec 07 dejó el guardado de puntuaciones funcionando contra la tabla `scores` de Supabase, pero el **nombre** del jugador sigue viniendo de la sesión simulada (`contexts/session-context.tsx`), que vive solo en memoria y se pierde al recargar; quien no pasó por `/auth` guarda siempre como `"INVITADO"`, así que los rankings quedan llenos de nombres indistinguibles. Además, al terminar una partida el modal "FIN DEL JUEGO" solo dice que se guardó: no muestra dónde quedó el jugador. Y `/hall-of-fame` solo tiene el top 10 por juego, sin una vista general por jugador ni un historial propio.

Este spec cierra ese círculo con lo mínimo que lo hace real sin cuentas: nombre escrito en el modal, recordado en el navegador y unificado con la sesión simulada; ranking del juego jugado en el propio modal; y, en `/hall-of-fame`, una pestaña "GENERAL" (mejor marca de cada jugador en cada juego + total) y una pestaña "MIS PARTIDAS". No hay tablas nuevas de datos de dominio: `scores` ya guarda el historial completo (spec 07); solo se añade una vista de agregación y un índice.

---

## 2 — Scope

**In:**

- **Nombre recordado y unificado con la sesión.** `SessionProvider` persiste `user` en `localStorage` (clave `arcade-vault:player-name`), lo lee tras montar (sin desajuste de hidratación) y expone un nuevo `setName(name)`. `/auth` sigue funcionando y usa la misma normalización; "iniciar sesión", "crear cuenta" y "jugar como invitado" siguen siendo simulados.
- **Validación de nombre compartida** en `lib/player-name.ts` (cliente y servidor): mayúsculas, 3–14 caracteres, solo letras (incl. acentos y ñ), números, `_` y espacio (recortado y con espacios múltiples colapsados). `"INVITADO"` es siempre válido.
- **Modal "FIN DEL JUEGO"** (`play-room.tsx`): campo de nombre prellenado con el nombre de la sesión (o vacío si no hay), con validación en línea; "GUARDAR PUNTUACIÓN" exige nombre válido; un enlace/botón "GUARDAR COMO INVITADO" permite guardar con `"INVITADO"`. Al guardar con éxito, el nombre pasa a ser el de la sesión (`setName`) y se persiste.
- **Ranking del juego jugado en el modal**: tras guardar, el modal muestra el top 10 de **ese** juego con la fila del jugador resaltada; si quedó fuera del top 10, muestra el top 10 más una fila aparte con su posición real (`#23`). Incluye un enlace "VER RANKING GENERAL" a `/hall-of-fame?game=general`.
- **`saveScoreAction` ampliada**: valida el nombre en el servidor con `lib/player-name.ts`, valida que `gameId` exista, y en éxito devuelve además `{ board, rank, total }` del juego (top 10, puesto de la puntuación recién guardada y total de partidas del juego), en una sola respuesta.
- **Pestaña "GENERAL" en `/hall-of-fame`**: una fila por jugador con su mejor marca en cada uno de los juegos (columnas por juego, `—` si no ha jugado ese juego) y un **total** = suma de sus mejores marcas; orden por total descendente; top 20. Datos desde una vista SQL `player_best_scores`.
- **Pestaña "MIS PARTIDAS" en `/hall-of-fame`**: historial de todas las partidas del nombre de la sesión (juego, puntuación, fecha), más recientes primero, con filtro por juego (chips: TODOS + cada juego); tope de 100 filas. Sin nombre en sesión, muestra un aviso para jugar/guardar una partida.
- **Insignia "TU MEJOR MARCA"** se mantiene (comparación por nombre); en GENERAL se resalta la fila del jugador de la sesión.
- **Migración SQL**: vista `player_best_scores` (con `security_invoker`) e índice sobre `scores (player_name, created_at desc)`.

**Out of scope (para specs futuros):**

- Guardar y **reanudar** una partida a medias (serializar el estado de cada motor). "Guardar sus partidas" aquí significa historial de puntuaciones.
- Autenticación real (Supabase Auth), identidad única de jugador, contraseñas, reserva de nombres o impedir que dos personas usen el mismo nombre. Cualquiera puede escribir cualquier nombre.
- Anti-trampa / validación de que la puntuación es legítima (el insert sigue siendo público, como en el spec 07).
- Editar o borrar puntuaciones, renombrar partidas ya guardadas o fusionar `"INVITADO"` con un nombre nuevo.
- Realtime, paginación del historial más allá del tope de 100, o ranking por periodos (semanal/mensual).
- Nueva ruta `/profile` o cambios al navbar.
- Cambiar créditos, motores de juego o el catálogo `games`.

---

## 3 — Modelo de datos

No se crean tablas nuevas. `scores` (spec 07) ya es el historial completo. Se añade una vista de agregación y un índice:

```sql
-- Mejor marca de cada jugador en cada juego (base del ranking GENERAL).
create view public.player_best_scores
with (security_invoker = true) as
select player_name, game_id, max(score)::integer as best_score
from public.scores
group by player_name, game_id;

-- Historial por jugador ("MIS PARTIDAS").
create index scores_player_name_created_idx
  on public.scores (player_name, created_at desc);
```

`security_invoker = true` hace que la vista respete el RLS de `scores` (select público). No se añade política de escritura alguna.

Tipos (`lib/types.ts`):

```ts
export interface GeneralRow {
  name: string;
  total: number; // suma de sus mejores marcas
  byGame: Record<string, number>; // gameId -> mejor marca (ausente = no jugó)
}

export interface HistoryRow {
  gameId: string;
  score: number;
  date: string; // "DD/MM/AAAA"
}

export interface SavedResult {
  board: BoardRow[]; // top 10 del juego
  rank: number; // puesto de la puntuación recién guardada (1 + cuántas son estrictamente mayores)
  total: number; // total de partidas guardadas de ese juego
}
```

Validación compartida (`lib/player-name.ts`):

```ts
export const GUEST_NAME = "INVITADO";
export function normalizePlayerName(raw: string): string; // trim, colapsa espacios, mayúsculas, recorta a 14
export function validatePlayerName(name: string): string | null; // mensaje de error o null si es válido
```

Consultas nuevas (`lib/supabase/queries.ts`, server-only):

```ts
export async function getGeneralBoard(limit?: number): Promise<GeneralRow[]>; // default 20
export async function getPlayerHistory(
  name: string,
  limit?: number,
): Promise<HistoryRow[]>; // default 100
export async function getScoreRank(
  gameId: string,
  score: number,
): Promise<{ rank: number; total: number }>;
```

Acciones (`app/play/[id]/actions.ts` amplía la existente; `app/hall-of-fame/actions.ts` nueva, porque el nombre solo se conoce en el cliente):

```ts
export async function saveScoreAction(
  gameId: string,
  playerName: string,
  score: number,
): Promise<({ ok: true } & SavedResult) | { ok: false; error: string }>;

// app/hall-of-fame/actions.ts
export async function getPlayerHistoryAction(
  name: string,
): Promise<HistoryRow[]>;
```

---

## 4 — Plan de implementación

1. **Migración SQL.** Aplicar vía Supabase (herramienta MCP de migración) la vista `player_best_scores` y el índice de la sección 3. Sistema funcional: la app no cambia, nada usa la vista todavía. Verificación: `select * from player_best_scores limit 5` devuelve filas y `list_tables`/advisors no reportan la vista como `SECURITY DEFINER`.
2. **Validación de nombre (`lib/player-name.ts`) y tipos.** Crear `normalizePlayerName`, `validatePlayerName`, `GUEST_NAME`; añadir `GeneralRow`, `HistoryRow`, `SavedResult` a `lib/types.ts`. Aún sin uso. Verificación: `npx tsc --noEmit` sin errores.
3. **Nombre persistente en la sesión.** `contexts/session-context.tsx`: leer/escribir `arcade-vault:player-name` en `localStorage` (try/catch, lectura tras montar), añadir `setName`, y que `logout` borre la clave. `app/auth/page.tsx` usa `normalizePlayerName`. Comportamiento visible sin cambios salvo que el nombre sobrevive a recargas. Verificación manual: iniciar sesión en `/auth`, recargar, el navbar sigue mostrando el nombre; cerrar sesión lo limpia.
4. **Consultas del servidor.** Añadir `getGeneralBoard`, `getPlayerHistory`, `getScoreRank` a `lib/supabase/queries.ts` (mapeando a los tipos de la sección 3, fechas "DD/MM/AAAA" con `formatDate`). Aún no se importan. Verificación: `npx tsc --noEmit`.
5. **Ampliar `saveScoreAction`.** Validar nombre con `validatePlayerName` (permitiendo `GUEST_NAME`) y que `gameId` exista; tras el insert, devolver `board` (`getBoard(gameId)`), `rank` y `total` (`getScoreRank`). Errores siguen devolviendo `{ ok: false, error }`. `play-room.tsx` sigue compilando (ignora los campos nuevos por ahora). Verificación: `npm run build` pasa.
6. **Modal "FIN DEL JUEGO" con nombre.** En `play-room.tsx`: estado `nameInput` prellenado con `user`; input con validación en línea, botón "GUARDAR PUNTUACIÓN" deshabilitado si el nombre es inválido, botón secundario "GUARDAR COMO INVITADO"; al éxito, `setName` (salvo invitado) y guardar `SavedResult` en estado. `replay` conserva el nombre. Verificación manual: jugar `/play/serpiente`, terminar, nombre inválido (2 letras) bloquea guardar, nombre válido guarda y aparece en `/hall-of-fame`.
7. **Ranking del juego en el modal.** Nuevo componente `components/game-over-ranking.tsx` que recibe `SavedResult`, el nombre y la puntuación: pinta el top 10 (reutilizando `rankColor` y el estilo de `score-board.tsx`), resalta la primera fila que coincide en nombre y puntuación, y añade la fila aparte `#rank` si quedó fuera del top 10; línea "PUESTO #rank DE total"; enlace "VER RANKING GENERAL" a `/hall-of-fame?game=general`. El modal pasa a ser desplazable si no cabe (`max-h` + `overflow-y-auto`). Verificación manual con una puntuación alta (entra al top 10) y una baja (fila aparte).
8. **Acción y consulta de historial.** Crear `app/hall-of-fame/actions.ts` con `getPlayerHistoryAction(name)` (normaliza y valida el nombre; devuelve `[]` si es inválido o hay error). Verificación: `npm run build`.
9. **Pestañas GENERAL y MIS PARTIDAS en `/hall-of-fame`.** `page.tsx` acepta `game` = id de juego | `general` | `mine` (cualquier otro valor cae al primer juego) y pasa además `general: GeneralRow[]` (de `getGeneralBoard()`); `hall-of-fame.tsx` añade las dos pestañas a la barra existente: GENERAL (tabla con columna por juego + TOTAL, fila del jugador resaltada, sin recargar al cambiar de pestaña) y MIS PARTIDAS (llama `getPlayerHistoryAction(me)` al abrir la pestaña, con estado de carga/error/vacío, y chips para filtrar por juego). Verificación manual: las tres vistas (juego, GENERAL, MIS PARTIDAS) navegan sin recargar y el enlace del modal abre GENERAL.
10. **Remate.** `npm run build` y `npm run lint` sin errores ni warnings nuevos. Recorrido manual con dos nombres distintos jugando dos juegos distintos: los totales de GENERAL suman las mejores marcas, MIS PARTIDAS muestra solo las partidas del nombre activo, y tras recargar el nombre se conserva. Verificar en el modal el caso de error de guardado (p. ej. `saveScoreAction` fallando) manteniendo crédito y puntuación. Si `next dev` regeneró el bloque `<!-- BEGIN:nextjs-agent-rules -->` de `AGENTS.md`, commitearlo.

---

## 5 — Criterios de aceptación

- [ ] La vista `player_best_scores` existe con `security_invoker = true`, el índice `scores_player_name_created_idx` existe y no se añadió ninguna política de escritura nueva.
- [ ] El nombre escrito/usado se conserva tras recargar la página (clave `localStorage` `arcade-vault:player-name`) y "cerrar sesión" lo borra.
- [ ] En "FIN DEL JUEGO", "GUARDAR PUNTUACIÓN" está deshabilitado con un nombre de menos de 3 o más de 14 caracteres o con caracteres no permitidos, y muestra el motivo.
- [ ] Un nombre válido se guarda en mayúsculas y sin espacios sobrantes; `"mario  kart"` se guarda como `MARIO KART`.
- [ ] "GUARDAR COMO INVITADO" guarda la puntuación con `player_name = 'INVITADO'` sin exigir nombre.
- [ ] `saveScoreAction` rechaza en el servidor un nombre inválido o un `gameId` inexistente devolviendo `{ ok: false, error }`, sin insertar fila.
- [ ] Tras guardar, el modal muestra el top 10 del juego jugado con la fila del jugador resaltada, y "PUESTO #N DE M" con N = 1 + número de puntuaciones estrictamente mayores.
- [ ] Si la puntuación queda fuera del top 10, el modal muestra el top 10 más una fila aparte con el puesto real.
- [ ] El nombre guardado desde el modal pasa a ser el de la sesión (aparece en el navbar) salvo que se guardara como invitado.
- [ ] `/hall-of-fame?game=general` muestra una fila por jugador con su mejor marca en cada juego (`—` si no jugó), y un TOTAL igual a la suma de esas marcas; ordenado por TOTAL descendente, máximo 20 filas.
- [ ] `/hall-of-fame?game=mine` (y la pestaña "MIS PARTIDAS") lista todas las partidas del nombre de la sesión, más recientes primero, con filtro por juego, y muestra un aviso si no hay nombre o no hay partidas.
- [ ] Cambiar entre pestañas de juego y GENERAL no dispara nuevas peticiones al servidor; solo MIS PARTIDAS consulta al abrirse.
- [ ] Si falla el guardado, se muestra el error, se puede reintentar y no se pierden crédito ni puntuación (comportamiento del spec 07 preservado).
- [ ] El enlace "VER RANKING GENERAL" del modal abre `/hall-of-fame?game=general`.
- [ ] `/auth`, la economía de créditos, los motores de juego y la tabla `games` no cambian de comportamiento.
- [ ] `npm run build` y `npm run lint` terminan sin errores ni warnings nuevos.

---

## 6 — Decisiones tomadas y descartadas

- **Sí:** el nombre se escribe en el modal "FIN DEL JUEGO" y se recuerda en `localStorage`. Motivo: decisión del usuario — es la fricción mínima que da rankings con nombres reales sin construir cuentas.
- **No:** autenticación real con Supabase Auth. Motivo: es un spec grande aparte; aquí el nombre es una etiqueta sin dueño (cualquiera puede usar cualquier nombre).
- **Sí:** un único nombre compartido entre el modal y la sesión simulada de `/auth` (`setName` en `SessionProvider`). Motivo: decisión del usuario — evita que la misma persona tenga dos nombres y mantiene coherentes navbar, insignia "TU MEJOR MARCA" y resaltados.
- **Sí:** "guardar sus partidas" = historial de puntuaciones por jugador sobre la tabla `scores` existente. **No:** guardar/reanudar partidas a medias. Motivo: decisión del usuario — reanudar exige serializar el estado de cuatro motores distintos y merece un spec por motor.
- **Sí:** top 10 del juego jugado + posición del jugador en el modal, devuelto por la propia `saveScoreAction` en una sola respuesta. Motivo: decisión del usuario; evita un segundo round trip y un `router.refresh()` para pintar el resultado.
- **Sí:** ranking GENERAL como tabla por jugador con una columna por juego y TOTAL = suma de mejores marcas. **No:** lista expandible ni solo pestañas por juego. Motivo: decisión del usuario — muestra de un vistazo "subdividido por juego" y el total da un criterio de orden claro.
- **Sí:** agregación mediante la vista SQL `player_best_scores` en vez de traer todo `scores` al servidor y agrupar en TypeScript. Motivo: el historial es completo y crece; PostgREST limita las filas por defecto y agrupar en el motor de base de datos es lo correcto.
- **Sí:** pestaña "MIS PARTIDAS" dentro de `/hall-of-fame`. **No:** ruta `/profile` ni entrada nueva en el navbar. Motivo: decisión del usuario — menos superficie y todos los rankings en un solo lugar.
- **Sí:** el historial se pide con una Server Action al abrir la pestaña (el nombre solo existe en el cliente). **No:** precargarlo en `page.tsx`. Motivo: el servidor no conoce el nombre de `localStorage`.
- **Sí:** reglas de nombre: mayúsculas, 3–14 caracteres, letras/números/`_`/espacio; `"INVITADO"` siempre permitido. Motivo: decisión del usuario — evita nombres vacíos y duplicados por mayúsculas/minúsculas; 14 coincide con el límite ya usado en `/auth`. La validación vive en un módulo compartido y se repite en el servidor porque el cliente no es confiable.
- **Sí:** el resaltado de la fila recién guardada se hace por coincidencia de nombre y puntuación (la primera fila que coincide). Motivo: `getBoard` no devuelve `id`; con empates exactos resalta la primera, que es visualmente equivalente.
- **Sí:** convención `?game=<id|general|mine>` en `/hall-of-fame` en vez de un segundo parámetro. Motivo: reutiliza el parámetro existente del spec 07; los ids de juego reales nunca colisionan con esas dos palabras reservadas.

---

## 7 — Riesgos identificados

| Riesgo                                                                                                                                                                                  | Mitigación                                                                                                                                                                                 |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Sin identidad real, dos personas pueden usar el mismo nombre y mezclar sus marcas y su historial; alguien puede escribir el nombre de otro y aparecer en "MIS PARTIDAS" de esa persona. | Aceptado (sección 2 fuera de alcance): el nombre es una etiqueta pública, no una cuenta. Se resuelve con un spec de autenticación real.                                                    |
| `insert` público en `scores`: cualquiera puede enviar puntuaciones falsas o inflar el ranking GENERAL llamando a la Server Action.                                                      | Aceptado como en el spec 07; la validación en servidor solo cubre formato y `gameId`. Un spec futuro puede añadir límites por juego o firma de partida.                                    |
| Nombres antiguos de la semilla o de partidas previas que no cumplan las reglas nuevas (p. ej. con minúsculas) aparecerían como jugadores distintos en GENERAL.                          | La vista agrupa por `player_name` tal cual está guardado; se verifica en el paso 1 y, si hay nombres fuera de regla, se normalizan en la propia migración (`update` acotado a la semilla). |
| `localStorage` no disponible (modo privado / bloqueado) hace que el nombre no se recuerde.                                                                                              | Todas las lecturas/escrituras van en `try/catch`; el modal sigue pidiendo el nombre cada vez, sin romper el flujo.                                                                         |
| El modal con top 10 + fila aparte puede desbordar la altura en pantallas pequeñas.                                                                                                      | Modal con `max-h` y `overflow-y-auto`; se verifica en el paso 7 en viewport móvil.                                                                                                         |

---

## Lo que **no** entra en este spec

- Guardar y reanudar partidas a medias.
- Autenticación real, identidad única o reserva de nombres.
- Anti-trampa de puntuaciones.
- Editar/borrar partidas o fusionar `"INVITADO"` con un nombre.
- Ruta `/profile` o cambios al navbar.
- Realtime, paginación del historial o rankings por periodo.

Cada uno de estos, si se aborda, va en su propio spec.
