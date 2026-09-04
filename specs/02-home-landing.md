# SPEC 02 — Home / landing page de Arcade Vault

> **Status:** Aceptado
> **Depends on:** SPEC 01
> **Date:** 2026-09-04
> **Objective:** Convertir `/` en la pantalla de inicio (landing) de Arcade Vault, inspirada en `references/resource/home-about/home.jsx` (sin portar la pantalla "Acerca de"), moviendo la Biblioteca actual de `/` a `/games`.

---

## 1 — Por qué existe este spec

Tras el spec 01, `/` es la Biblioteca (catálogo de juegos). En `references/resource/home-about/` hay una maqueta de Home (`home.jsx` + `nav.jsx` + `styles.css`) con una landing de marketing: hero, "por qué Arcade Vault", fila de juegos, estadísticas, actividad en vivo, precios y CTA final. El usuario quiere esa pantalla como nueva puerta de entrada del sitio, explícitamente sin la pantalla "Acerca de" que también vive en esa carpeta de referencia (`about.jsx`).

Como `/` ya está ocupada por la Biblioteca, este spec también mueve la Biblioteca a `/games` y ajusta cada enlace interno que hoy asume que "volver al catálogo" es ir a `/`.

---

## 2 — Scope

**In:**

- Nueva Home en `app/page.tsx` (ruta `/`), con las secciones de `home.jsx` adaptadas a Tailwind v4 y a los datos reales del proyecto:
  - **Hero**: eyebrow, título de tres líneas, subtítulo, botones "EXPLORAR JUEGOS" y "CREAR CUENTA", indicador de scroll, silueta de iconos pixel flotantes de fondo (decorativos, sin datos).
  - **"¿Por qué Arcade Vault?"**: cuatro tarjetas de característica (juegos clásicos, gratis, ladder boards, siempre creciendo) con icono pixel SVG por tarjeta.
  - **"Juegos disponibles ahora"**: 6 mini-tarjetas (una por juego de `GAMES`), cada una con título, categoría real y carátula decorativa portada de `styles.css` (ver sección 3); enlazan a `/juego/[id]`.
  - **Estadísticas**: bloque con el conteo real de juegos (`GAMES.length`), y dos métricas descriptivas sin cifra inventada ("MILES DE PARTIDAS", "RANKING GLOBAL").
  - **Actividad en vivo**: panel de "últimas puntuaciones" (una fila por juego con su mejor marca real y fecha) y panel de "top jugadores" (top 5 global combinando los 6 juegos), ambos calculados desde `lib/scores.ts`, sin nombres/puntuaciones inventados en el código ni frases de tiempo relativo falsas ("hace X min").
  - **Precios**: sección estática de marketing (plan único gratuito + FAQ), portada tal cual, sin lógica ni datos reales detrás.
  - **CTA final**: título + botón "INSERTAR MONEDA →" hacia `/games`.
  - Animación de aparición al hacer scroll (`reveal`) mediante un hook propio (`lib/use-reveal.ts`), no mediante manipulación directa del DOM como en la maqueta.
- Biblioteca actual movida sin cambios de comportamiento de `app/page.tsx` a `app/games/page.tsx` (ruta `/games`).
- `components/nav-bar.tsx` actualizado (versión de escritorio y panel móvil): nuevo enlace "Inicio" → `/`; el enlace "Biblioteca" pasa a apuntar a `/games`; el estado activo de "Biblioteca" se resalta en `/games`, `/juego/[id]` y `/jugar/[id]`; el de "Inicio" solo en `/`. No se añade ningún enlace "Acerca de".
- Enlaces internos que hoy asumen que `/` es la Biblioteca, corregidos a `/games`:
  - "VOLVER AL VAULT" en `app/juego/[id]/ficha-juego.tsx` (los dos `href="/"`).
  - "SALIR" en `app/jugar/[id]/sala-juego.tsx` (`router.push("/")`).
- `app/auth/page.tsx` **no se toca**: el login y "jugar como invitado" siguen hadiendo `router.push("/")`, que ahora lleva a la nueva Home (decisión explícita del usuario, ver sección 6).
- Dos funciones nuevas en `lib/scores.ts` para alimentar "Actividad en vivo" con datos reales, reutilizando `board()` ya existente.
- `app/globals.css` ampliado (sin quitar nada existente): un `@keyframes` para el flotado de las siluetas del hero y las clases de carátula decorativa de las mini-tarjetas.

**Out of scope (para specs futuros):**

- La pantalla "Acerca de" (`about.jsx`). Queda fuera explícitamente.
- Renombrar a inglés las rutas ya existentes (`/juego/[id]` → `/game/[id]`, `/jugar/[id]` → `/play/[id]`, `/salon-fama` → `/hall-of-fame`). Se decidió expresamente dejarlo para un spec aparte; este spec solo introduce `/games` como ruta nueva.
- Cualquier lógica real de planes/pagos detrás de la sección "Precios" (sigue siendo contenido estático).
- Marca de tiempo con hora exacta en las puntuaciones (`ScoreEntry` sigue guardando solo fecha `DD/MM/AAAA`); por eso el ticker no muestra "hace X minutos".
- Cambiar el comportamiento de créditos/sesión o el motor de ningún juego.

---

## 3 — Modelo de datos

No se introduce ningún tipo de dominio nuevo. Se añaden funciones puras a un módulo ya existente y un hook de UI.

```ts
// lib/scores.ts — se añaden, sin modificar las funciones existentes
import { GAMES } from "@/app/data";
import type { Game } from "@/lib/types";

// Mejor fila de cada juego (o undefined si un juego no tiene tabla), en el
// orden de GAMES. Reutiliza board(); no duplica lógica de combinar semilla + localStorage.
export function bestPerGame(
  stored: StoredScores,
): { game: Game; row: BoardRow | undefined }[];

// Top N (por defecto 5) combinando el board() de los 6 juegos, orden desc por score.
export function topPlayersGlobal(stored: StoredScores, limit?: number): BoardRow[];
```

```ts
// lib/use-reveal.ts — nuevo hook de cliente, sin tipos de dominio
"use client";
import type { RefObject } from "react";

// IntersectionObserver por elemento: expone un ref para colocar en la sección
// y `visible`, que pasa a true una vez (y se queda) cuando entra en el viewport.
export function useReveal<T extends HTMLElement>(): {
  ref: RefObject<T | null>;
  visible: boolean;
};
```

**Carátulas decorativas de las mini-tarjetas ("Juegos disponibles ahora"):**

Se portan de `references/resource/home-about/styles.css` seis de las reglas `.cover-*` (gradientes CSS + pseudo-elementos), renombradas para mapear 1:1 con los IDs reales de `GAMES` en vez de con los juegos ficticios de la maqueta:

| Clase nueva en `globals.css` | Origen en la maqueta | Juego real |
| --- | --- | --- |
| `.cover-rompemuros` | `.cover-bricks` | rompemuros |
| `.cover-serpiente` | `.cover-snake` | serpiente |
| `.cover-invasores` | `.cover-invaders` | invasores |
| `.cover-asteroides` | `.cover-rocas` | asteroides |
| `.cover-bloques` | `.cover-tetro` | bloques |
| `.cover-laberinto` | `.cover-glot` | laberinto |

Estas conviven con `components/game-cover.tsx` (las carátulas SVG pixel-art que usan la Biblioteca y la ficha de juego) sin sustituirlo: es un segundo tratamiento visual, solo para esta fila de la Home, tal como pidió el usuario.

---

## 4 — Plan de implementación

1. **Helpers de datos y hook de reveal.** Añadir `bestPerGame` y `topPlayersGlobal` a `lib/scores.ts`, y crear `lib/use-reveal.ts`. No hay cambio visible todavía. Verificación: `npx tsc --noEmit` sin errores.

2. **Mover la Biblioteca a `/games`.** Crear `app/games/page.tsx` con el contenido íntegro y sin cambios del actual `app/page.tsx` (mismo componente, mismos imports). Corregir los enlaces que asumían `/` como catálogo: los dos `href="/"` de `app/juego/[id]/ficha-juego.tsx` → `href="/games"`, y `router.push("/")` de `app/jugar/[id]/sala-juego.tsx` → `router.push("/games")`. `app/page.tsx` se deja tal cual por ahora (duplicado temporal con `/games`, el sitio sigue funcionando). Verificación: `/games` funciona igual que antes funcionaba `/` (buscar "serpiente" deja una tarjeta, "JUGAR" navega a la ficha); desde la ficha, "VOLVER AL VAULT" y, desde la sala de juego, "SALIR", llevan a `/games`.

3. **Nav actualizada.** En `components/nav-bar.tsx` (versión de escritorio y panel móvil): añadir enlace "Inicio" → `/`; cambiar el `href` del enlace "Biblioteca" a `/games`; el estado activo de "Biblioteca" se calcula con `pathname === "/games" || pathname.startsWith("/juego/") || pathname.startsWith("/jugar/")`, y el de "Inicio" con `pathname === "/"`. No se toca nada relativo a "Acerca de" (no existe). Verificación: en `/games`, `/juego/rompemuros` y `/jugar/rompemuros` se resalta "Biblioteca"; en `/` se resalta "Inicio".

4. **Contenido de la Home (`app/page.tsx`).** Reemplazar el contenido (la Biblioteca ya vive en `/games`) por la landing: Hero con siluetas flotantes decorativas, sección "¿Por qué Arcade Vault?" con las cuatro tarjetas y sus iconos SVG, sección "Juegos disponibles ahora" iterando `GAMES` con las clases `.cover-*` de la tabla anterior, sección "Estadísticas" mostrando `GAMES.length`, sección "Actividad en vivo" usando `bestPerGame(stored)` para el ticker y `topPlayersGlobal(stored, 5)` para el top, sección "Precios" estática, y CTA final. Cada sección (salvo el hero) usa `useReveal` para la animación de aparición. Botones enlazados según el mapeo: "EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS →" e "INSERTAR MONEDA →" → `/games`; "CREAR CUENTA" y "EMPEZAR GRATIS →" → `/auth`; "VER SALÓN →" → `/salon-fama`; cada mini-tarjeta → `/juego/[id]`. Verificación: `/` muestra las seis secciones; los tres CTAs de biblioteca navegan a `/games`; guardar una puntuación nueva más alta (flujo del spec 01) y volver a `/` la refleja en el ticker y, si corresponde, en el top 5.

5. **Estilos nuevos.** Ampliar `app/globals.css` (sin eliminar nada existente): añadir el token `--animate-float` y su `@keyframes av-float` (flotado + rotación suave de las siluetas del hero, portado de `@keyframes float` de la maqueta), y las seis clases `.cover-*` de la tabla de la sección 3, adaptando `var(--cyan)`, `var(--magenta)`, etc. de la maqueta a los valores hexadecimales ya usados en el resto del proyecto. Verificación: las siluetas del hero flotan, las seis mini-tarjetas muestran carátulas con gradiente distinto entre sí.

6. **Remate.** `npm run build` y `npm run lint` sin errores ni warnings nuevos. Revisar que ninguna sección de la Home lea `localStorage` o dispare `IntersectionObserver` durante el render en servidor (todo dentro de `useEffect`/handlers en componentes `"use client"`). Confirmar que el bloque `<!-- BEGIN:nextjs-agent-rules -->` de `AGENTS.md`, si `next dev` lo regenera, se commitea junto al trabajo.

---

## 5 — Criterios de aceptación

- [ ] `/games` muestra el mismo contenido y comportamiento que tenía `/` antes de este spec (buscador, filtro por categoría, tarjetas, enlace a la ficha de cada juego).
- [ ] `/` muestra la nueva Home con sus seis secciones: hero, "¿Por qué Arcade Vault?", "Juegos disponibles ahora", estadísticas, actividad en vivo y precios, más el CTA final.
- [ ] La nav (escritorio y panel móvil) muestra "Inicio" y "Biblioteca"; ningún enlace "Acerca de" aparece en ningún sitio.
- [ ] "Inicio" se resalta solo en `/`; "Biblioteca" se resalta en `/games`, `/juego/[id]` y `/jugar/[id]`.
- [ ] "EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS →" e "INSERTAR MONEDA →" navegan a `/games`.
- [ ] "CREAR CUENTA" y "EMPEZAR GRATIS →" navegan a `/auth`; "VER SALÓN →" navega a `/salon-fama`.
- [ ] Las seis mini-tarjetas de "Juegos disponibles ahora" (una por juego de `GAMES`) navegan cada una a `/juego/[id]` de su juego y muestran carátulas visualmente distintas entre sí.
- [ ] La sección "Estadísticas" muestra el conteo real de juegos (`GAMES.length`, hoy 6), nunca un número inventado como "12+".
- [ ] "Últimas puntuaciones" muestra exactamente 6 filas (una por juego) con la mejor marca real de cada uno y su fecha; no aparece ningún texto de "hace X minutos".
- [ ] "Top jugadores" muestra las 5 puntuaciones más altas combinando los 6 juegos, sin la coletilla "HOY".
- [ ] Guardar una puntuación nueva que supere alguna de las mostradas (flujo del spec 01) y volver a `/` actualiza el ticker y, si corresponde, el top 5.
- [ ] En la ficha de un juego, "VOLVER AL VAULT" navega a `/games`; en la sala de juego, "SALIR" navega a `/games`.
- [ ] En `/auth`, iniciar sesión o "jugar como invitado" siguen navegando a `/` (ahora la Home, comportamiento intencional).
- [ ] Las secciones con animación de aparición (`useReveal`) se muestran de inmediato si ya están en el viewport al cargar, y aparecen con la transición al hacer scroll hasta ellas en otro caso.
- [ ] `npm run build` y `npm run lint` terminan sin errores ni warnings nuevos.
- [ ] Ninguna página lee `localStorage`, `window` o dispara `IntersectionObserver` durante el render en servidor.

---

## 6 — Decisiones tomadas y descartadas

- **Sí:** mover la Biblioteca de `/` a `/games`, dejando `/` libre para la Home. Es la única forma de tener ambas pantallas como rutas reales sin pisarse.
- **No:** renombrar a inglés el resto de rutas existentes (`/juego`, `/jugar`, `/salon-fama`) en este mismo spec. El usuario lo pidió inicialmente, pero es un cambio grande y no relacionado con traer la Home; se deja para un spec aparte y aquí solo se introduce `/games`.
- **Sí:** omitir por completo el enlace "Acerca de" en la nav en vez de dejarlo como placeholder. Evita un enlace roto o sin página propia; se añade cuando exista un spec para esa pantalla.
- **Sí:** reutilizar `NavBar`/`SiteChrome` existentes (créditos, sesión, menú móvil) en la Home en vez de replicar el `nav.jsx` de la maqueta. Da consistencia con el resto del sitio y evita mantener dos barras de navegación.
- **Sí:** calcular "Actividad en vivo" con datos reales (`bestPerGame`, `topPlayersGlobal` sobre `board()`), en vez de copiar los nombres y puntuaciones de ejemplo de la maqueta. Coherente con la decisión ya tomada en el spec 01 de no simular datos falsos que aparenten un juego real.
- **Sí:** quitar la coletilla "HOY" del panel de top jugadores y el texto "hace X min" del ticker, porque el modelo de datos actual (`ScoreEntry.date`) no guarda hora, solo fecha. Inventar esa granularidad sería un dato falso.
- **Sí:** mantener la sección "Precios" tal cual (contenido estático de marketing), pese a que la app no tiene planes de pago en ningún otro sitio. Decisión explícita del usuario: es contenido decorativo, no funcional.
- **Sí:** usar el conteo real `GAMES.length` en "Estadísticas" en vez del "12+" de la maqueta, para no mostrar una cifra falsa.
- **Sí:** para las mini-tarjetas de "Juegos disponibles ahora", replicar las carátulas CSS decorativas de la maqueta (`.cover-*`, renombradas por juego real) en vez de reutilizar `components/game-cover.tsx`. Decisión explícita del usuario, aunque introduce un segundo sistema de carátulas (ver riesgos).
- **Sí:** mantener que `/auth` (login y "jugar como invitado") siga redirigiendo a `/`, que ahora es la Home en vez de la Biblioteca. Decisión explícita del usuario, aunque cambia el flujo post-login respecto al spec 01 (ver riesgos).
- **No:** manipular el DOM directamente con `querySelectorAll(".reveal")` como hace `home.jsx`. Se sustituye por un hook `useReveal` por sección, más idiomático en React/Next.
- **Sí:** ampliar `app/globals.css` con un único `@keyframes` nuevo (`av-float`) y las clases `.cover-*`, siguiendo el mismo patrón de "ampliar sin reescribir" del spec 01.

---

## 7 — Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| Tras iniciar sesión o jugar como invitado, el usuario esperaba llegar al catálogo (`/games`) y ahora ve la Home (`/`) | Es una decisión explícita del usuario en este spec; si en el uso real resulta confuso, es un cambio de una línea (`router.push("/games")`) para un spec futuro. |
| Dos sistemas de carátula distintos para los mismos juegos (SVG pixel-art en Biblioteca/ficha, CSS decorativo en la Home) puede leerse como inconsistente | Decisión explícita del usuario; ambos viven en archivos separados (`game-cover.tsx` vs. clases `.cover-*` en `globals.css`) así que no hay conflicto técnico, solo estético. |
| Duplicar temporalmente la Biblioteca en `/` y `/games` durante el paso 2 del plan si se despliega a mitad de implementación | El paso 2 dura poco (un solo commit/PR) y ambas rutas siguen siendo funcionales; no hay ninguna ruta rota en ningún punto intermedio. |
| Enlaces a `/juego/[id]` o `/jugar/[id]` fuera de los archivos revisados en este spec que aún asuman `/` como catálogo | Se hizo una búsqueda (`grep`) de todos los `href="/"` y `router.push("/")` del repo antes de escribir este spec; los únicos relevantes son los listados en la sección 4. |

---

## Lo que **no** entra en este spec

- La pantalla "Acerca de" (`about.jsx`).
- Renombrar a inglés `/juego`, `/jugar` o `/salon-fama`.
- Cualquier lógica real detrás de la sección "Precios".
- Marca de tiempo con hora exacta en las puntuaciones.
- Cambios al motor de juego, a créditos o a sesión.

Cada uno de estos, si se aborda, va en su propio spec.
