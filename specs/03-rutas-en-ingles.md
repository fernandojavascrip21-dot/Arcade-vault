# SPEC 03 — Rutas en inglés

> **Status:** Aprovado
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-09-04
> **Objective:** Renombrar las rutas `/juego/[id]`, `/jugar/[id]` y `/salon-fama` (y sus archivos/componentes internos) a sus equivalentes en inglés `/game/[id]`, `/play/[id]` y `/hall-of-fame`, sin dejar redirects de las URLs viejas.

---

## 1 — Por qué existe este spec

Tras el spec 02, la Home y la Biblioteca ya están en `/` y `/games` (inglés), pero tres rutas siguen en español: la ficha de un juego (`/juego/[id]`), la sala donde se juega (`/jugar/[id]`) y el ranking global (`/salon-fama`). Este spec completa esa consistencia de nomenclatura en las URLs, y de paso renombra los archivos y componentes internos de esas tres pantallas (que hoy también están en español: `ficha-juego.tsx`, `sala-juego.tsx`, `salon-fama.tsx`) para que el código quede alineado con la URL que sirve.

No se toca el copy visible de la interfaz (textos, botones, mensajes), que sigue en español — ver sección 6.

---

## 2 — Scope

**In:**

- Renombrar la carpeta de ruta `app/juego/[id]/` → `app/game/[id]/`, incluyendo:
  - `ficha-juego.tsx` → `game-detail.tsx`.
  - Componente `FichaJuego` → `GameDetail`.
  - Función de página `FichaPage` → `GamePage`, tipo `PageProps<"/juego/[id]">` → `PageProps<"/game/[id]">`.
- Renombrar la carpeta de ruta `app/jugar/[id]/` → `app/play/[id]/`, incluyendo:
  - `sala-juego.tsx` → `play-room.tsx`.
  - Componente `SalaJuego` → `PlayRoom`.
  - Función de página `SalaPage` → `PlayPage`, tipo `PageProps<"/jugar/[id]">` → `PageProps<"/play/[id]">`.
- Renombrar la carpeta de ruta `app/salon-fama/` → `app/hall-of-fame/`, incluyendo:
  - `salon-fama.tsx` → `hall-of-fame.tsx`.
  - Componente `SalonFama` → `HallOfFame`.
  - Función de página `SalonFamaPage` → `HallOfFamePage`, tipo `PageProps<"/salon-fama">` → `PageProps<"/hall-of-fame">`.
- Actualizar todas las navegaciones internas que apuntan a las rutas viejas:
  - `components/game-card.tsx`: `href` de `` `/juego/${game.id}` `` a `` `/game/${game.id}` ``.
  - `app/page.tsx` (Home): `href` de la mini-tarjeta de juego (`` `/juego/${g.id}` `` → `` `/game/${g.id}` ``) y del enlace "Salón de la Fama" (`/salon-fama` → `/hall-of-fame`).
  - `app/game/[id]/game-detail.tsx` (ex `ficha-juego.tsx`): `router.push` del botón "JUGAR AHORA", de `` `/jugar/${game.id}` `` a `` `/play/${game.id}` ``.
  - `components/nav-bar.tsx`: `href` del enlace "Salón de la Fama" a `/hall-of-fame` (versión escritorio y menú móvil); variable `isBiblioteca` renombrada a `isGames`, con sus `pathname.startsWith(...)` ajustados a `/game/` y `/play/`.
- Regenerar los tipos de ruta con `npx next typegen` para que `.next/types` refleje `/game/[id]`, `/play/[id]` y `/hall-of-fame` en vez de las rutas viejas.

**Out of scope (para specs futuros):**

- Traducir el copy visible (textos, botones, mensajes de UI), que sigue en español.
- Redirects de compatibilidad de `/juego/[id]`, `/jugar/[id]` o `/salon-fama` hacia las rutas nuevas.
- Renombrar identificadores o comentarios en archivos no relacionados con estas tres rutas (`app/data.ts`, `contexts/session-context.tsx`, `contexts/scores-context.tsx`, `lib/scores.ts`) aunque mencionen "juego"/"jugar" en comentarios.
- Cambiar el `toLocaleString("es-ES")` usado para formatear la puntuación.
- Cualquier cambio de comportamiento funcional en las tres pantallas afectadas.

---

## 3 — Data model

Este spec no introduce estructuras de datos nuevas. Reutiliza el modelo existente (`Game`, `StoredScores`, etc. de `lib/types.ts` y `lib/scores.ts`), solo cambia dónde y con qué nombre se sirven las pantallas que ya existen.

---

## 4 — Implementation plan

1. Renombrar la ruta del juego: `app/juego/[id]/` → `app/game/[id]/`, `ficha-juego.tsx` → `game-detail.tsx` (componente `FichaJuego` → `GameDetail`), y `page.tsx` (`FichaPage` → `GamePage`, tipo `PageProps<"/game/[id]">`). El botón "JUGAR AHORA" sigue apuntando a `/jugar/${game.id}` por ahora (esa ruta todavía existe con el nombre viejo); sistema funcional.
2. Renombrar la ruta de la sala de juego: `app/jugar/[id]/` → `app/play/[id]/`, `sala-juego.tsx` → `play-room.tsx` (componente `SalaJuego` → `PlayRoom`), y `page.tsx` (`SalaPage` → `PlayPage`, tipo `PageProps<"/play/[id]">`). Actualizar en `app/game/[id]/game-detail.tsx` el `router.push` de `/jugar/${game.id}` a `/play/${game.id}`; sistema funcional.
3. Renombrar la ruta del ranking: `app/salon-fama/` → `app/hall-of-fame/`, `salon-fama.tsx` → `hall-of-fame.tsx` (componente `SalonFama` → `HallOfFame`), y `page.tsx` (`SalonFamaPage` → `HallOfFamePage`, tipo `PageProps<"/hall-of-fame">`); sistema funcional.
4. Actualizar los enlaces restantes que apuntan a las rutas viejas: `components/game-card.tsx` (`href` a `/game/${game.id}`), `app/page.tsx` (mini-tarjetas a `/game/${g.id}`, CTA a `/hall-of-fame`), y `components/nav-bar.tsx` (enlace "Salón de la Fama" a `/hall-of-fame` en ambas versiones, `isBiblioteca` → `isGames` con los nuevos prefijos `/game/` y `/play/`); sistema funcional y sin referencias colgantes a las rutas viejas.
5. Ejecutar `npx next typegen` para regenerar `.next/types`, y `npm run build` para confirmar que no hay errores de tipos ni de rutas.

---

## 5 — Acceptance criteria

- [ ] Las carpetas `app/juego/`, `app/jugar/` y `app/salon-fama/` ya no existen.
- [ ] `app/game/[id]/page.tsx` sirve la ficha del juego en `/game/<id>`.
- [ ] `app/play/[id]/page.tsx` sirve la sala de juego en `/play/<id>`.
- [ ] `app/hall-of-fame/page.tsx` sirve el ranking en `/hall-of-fame`.
- [ ] Ningún archivo bajo `app/` o `components/` contiene un `href`, `router.push` o tipo `PageProps` que referencie `/juego`, `/jugar` o `/salon-fama`.
- [ ] Desde `/`, cada mini-tarjeta de juego navega a `/game/<id>` y el CTA "Salón de la Fama" navega a `/hall-of-fame`.
- [ ] Desde `/games`, cada `GameCard` navega a `/game/<id>`.
- [ ] Desde `/game/<id>`, el botón "JUGAR AHORA" navega a `/play/<id>` y sigue consumiendo un crédito (comportamiento sin cambios).
- [ ] El NavBar (escritorio y menú móvil) resalta "Biblioteca" como activo en `/games`, `/game/<id>` y `/play/<id>`, y su enlace "Salón de la Fama" apunta a `/hall-of-fame`.
- [ ] `npx next typegen && npm run build` termina sin errores.
- [ ] Las rutas viejas (`/juego/<id>`, `/jugar/<id>`, `/salon-fama`) responden 404 (sin redirect, comportamiento esperado).

---

## 6 — Decisions

- **Yes:** renombrar también los archivos y componentes internos (`ficha-juego`→`game-detail`, `sala-juego`→`play-room`, `salon-fama`→`hall-of-fame`), no solo las carpetas de ruta. Motivo: decisión explícita del usuario para que el código quede 100% consistente con la URL que sirve.
- **Yes:** `/game` en singular para el detalle de un juego, dejando `/games` (plural, ya existente desde el spec 02) para el catálogo. Motivo: evita colisión de nombres y sigue el patrón habitual "recurso singular / colección plural".
- **Yes:** `hall-of-fame` en vez de `leaderboard`. Motivo: elegido por el usuario; es la traducción literal de "Salón de la Fama" y mantiene el tono del resto de la navegación.
- **No:** redirects de las rutas viejas a las nuevas. Motivo: decisión explícita del usuario — el proyecto todavía no tiene usuarios reales ni enlaces externos que proteger.
- **No:** traducir el copy visible en español (textos de UI, comentarios de código, `es-ES` en `toLocaleString`). Motivo: el pedido es específicamente sobre el nombre de la URL; traducir todo el copy es un cambio mucho más grande que merece su propio spec.

---

## What is **not** in this spec

- Traducción del copy/texto visible de la interfaz (sigue en español).
- Redirects de compatibilidad para las rutas viejas.
- Cambios de comportamiento funcional en ninguna de las tres pantallas afectadas.
- Renombrado de comentarios de código no relacionados con estas rutas (`app/data.ts`, `contexts/session-context.tsx`, `contexts/scores-context.tsx`, `lib/scores.ts`).

Cada uno de estos, si se hace, va en su propio spec.
