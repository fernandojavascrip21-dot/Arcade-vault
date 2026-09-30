# SPEC 14 — Sala de juego responsive en móvil (vertical y horizontal)

> **Status:** Aprovado
> **Depends on:** SPEC 09, SPEC 12, SPEC 13
> **Date:** 2026-09-30
> **Objective:** Hacer que la sala `/play/[id]` se juegue cómodamente en móvil en vertical y en horizontal: HUD compacto de una fila con menú ⋮ en hoja inferior, y en horizontal el CRT centrado con el mando táctil repartido a sus lados, sin scroll durante la partida.

---

## 1 — Por qué existe este spec

El spec 13 hizo jugables los cuatro juegos en el móvil con el "Arcade Universal Controller", pero dejó fuera, de forma explícita, el layout horizontal y compactar la barra superior. Hoy, en un teléfono:

- La barra superior de `PlayRoom` (marcadores + JUGADOR + SKIN + MANDO + PAUSA + SALIR) se envuelve en 2–3 filas y empuja el CRT hacia abajo.
- En horizontal (≈ 390 px de alto) navbar + barra + CRT 16:10 + mando no caben: hay que hacer scroll **durante** la partida.
- Varios controles están por debajo de 44 px de alto (selector SKIN con `py-1.5` y `text-[9px]`).
- No se exporta `viewport` (sin `viewport-fit=cover`), así que el notch tapa contenido en horizontal, y no se usa `dvh`.
- `play-room.tsx` no tiene ni una variante responsive (`sm:`/`md:`): todo depende de `flex-wrap`.

Este spec resuelve **solo la sala de juego**. El resto del sitio (navbar, catálogo, detalle, Hall of Fame, About, Auth) queda para el **spec 15**. Las pautas de accesibilidad/táctil se tomaron de la skill `/ui-ux-pro-max` (objetivos ≥ 44 px, ≥ 8 px entre objetivos, `dvh` en lugar de `vh`, viewport meta, `overscroll-behavior` para evitar pull-to-refresh).

---

## 2 — Scope

**In:**

- **Variantes Tailwind nuevas** en `app/globals.css` (CSS puro, sin JS, sin riesgo de hidratación):
  - `mobile-landscape:` → `@media (orientation: landscape) and (max-height: 540px)`.
  - `mobile:` → `@media (max-width: 767px), (orientation: landscape) and (max-height: 540px)` (móvil vertical **o** horizontal).
  - Todo lo que no cumpla ninguna de las dos (escritorio, tablets ≥ 768 px en vertical, tablets en horizontal con > 540 px de alto) conserva el layout actual **sin cambios**.
  - Las mismas queries se exportan como constantes en `lib/responsive.ts` (`MOBILE_QUERY`, `MOBILE_LANDSCAPE_QUERY`) para el poco JS que las necesita (pausa al rotar, sensibilidad del deslizador), con un comentario que obliga a mantenerlas sincronizadas con `globals.css`.
- **Viewport** en `app/layout.tsx`: `export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" }` (consultar `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-viewport.md` antes de escribirlo). Sin `maximumScale` ni `userScalable: false`: el zoom del sitio no se bloquea.
- **HUD compacto (`mobile:`)** en la barra superior de `PlayRoom`, una sola fila:
  - Izquierda: marcadores compactos que ya existen (PUNTUACIÓN/VIDAS/NIVEL; Bloques y Rompemuros siguen sin marcadores en la barra) con etiquetas de 9 px y valores de 13 px. **JUGADOR se oculta** en móvil.
  - Derecha: botón **PAUSA/SEGUIR** solo icono (`Pause`/`Play` de `lucide-react`, 44×44 px, `aria-label` "Pausar"/"Seguir", amarillo) y botón **⋮** (`EllipsisVertical`, 44×44 px, `aria-label="Opciones de la partida"`, `aria-haspopup="dialog"`, `aria-expanded`).
  - SKIN, MANDO y SALIR **no** aparecen en la barra en móvil (van al menú ⋮). En escritorio la barra es idéntica a la actual.
  - Padding de la barra en móvil `px-3 py-1.5`; alto total ≤ 56 px.
- **Menú ⋮ como hoja inferior** — componente nuevo `app/play/[id]/play-menu-sheet.tsx`:
  - `role="dialog"`, `aria-modal="true"`, `aria-labelledby` al título "OPCIONES"; fondo oscurecido (`bg-[rgba(4,4,9,.72)]`) que cierra al tocarlo; botón ✕ de 44 px; cierra con `Escape`. Al abrir, el foco va al primer control; al cerrar, vuelve al botón ⋮.
  - Entra desde abajo con `animate-fade` + `translate-y` 200 ms (sin animación con `motion-reduce`). Ancho completo en vertical; en horizontal `max-w-[420px]` centrada y `max-h-[calc(100dvh-16px)]` con scroll propio. `padding-bottom: max(20px, env(safe-area-inset-bottom))`.
  - **Abrirla pausa el juego** (`setPaused(true)`) si hay partida real en curso; **cerrarla no reanuda**: el jugador pulsa SEGUIR.
  - Contenido, cada fila ≥ 48 px de alto y ≥ 8 px de separación:
    1. **SKIN**: chips (radio group, `role="radiogroup"`) con las skins del juego actual — Bloques usa `BLOQUES_SKINS` + `handleSkinChange`; Asteroides/Rompemuros/Serpiente usan sus listas y stores actuales (`asteroidsSkinStore`, `rompemurosSkinStore`, `serpienteSkinStore`). Mismo almacenamiento que hoy; solo cambia el control.
    2. **MANDO**: interruptor `role="switch"` con `aria-checked={touch.visible}` que llama a `touch.toggle`; solo si `touch.isCoarse` y juego real (mismo criterio que el botón MANDO del spec 13).
    3. **TEMA**: fila "TEMA" con el `ThemeToggleButton` (claro/oscuro, spec 09). Se exporta desde `components/nav-bar.tsx` para reutilizarlo.
    4. **SALIR**: botón magenta a todo el ancho que llama a `exit` (misma acción que el SALIR actual).
  - Juegos del simulador (no reales): la hoja solo muestra TEMA y SALIR.
- **Layout vertical (`mobile:` en retrato)**: `main` con `px-3 pt-3 pb-6`; CRT a todo el ancho con marco compacto; mando debajo (spec 13); línea de ayuda de teclado igual que hoy (oculta si el mando está visible).
- **Marco CRT compacto**: `CrtFrame` recibe una prop nueva `compact?: boolean` (default `false`). Con `compact`, en `mobile:` el marco pasa de `p-3.5`/`rounded-[18px]` a `p-1.5`/`rounded-[10px]` y la pantalla interna a `rounded-md`. Solo `PlayRoom` la usa; el resto de pantallas no cambia.
- **Layout horizontal (`mobile-landscape:`)**:
  - `main` ocupa `h-dvh` (sin `pb-20`/`pt-8`), respeta `env(safe-area-inset-left/right/bottom)` con `max(12px, env(...))`, y se organiza en dos filas: HUD compacto (≤ 48 px) y zona de juego (resto del alto).
  - **Zona de juego = grid de 3 columnas** `grid-cols-[1fr_auto_1fr]`, centrado vertical: columna izquierda = grupo izquierdo del mando; centro = CRT; derecha = grupo derecho del mando.
  - **Ancho del CRT** (16:10 derivado de la altura): `w-[min(calc((100dvh-72px)*1.6),100%)]`; si el mando está visible, además resta dos columnas mínimas de 150 px: `w-[min(calc((100dvh-72px)*1.6),calc(100%-300px-2rem))]`. Resultado esperado: 844×390 → CRT ≈ 509×318; 667×375 → CRT ≈ 335×209 con columnas de 150 px.
  - Con el mando oculto (MANDO off o sin `pointer: coarse`), el CRT queda centrado y las columnas laterales vacías.
  - Se ocultan en horizontal: la línea de ayuda de teclado y la etiqueta `ARCADE VAULT CRT-19`.
- **Navbar y footer ocultos en horizontal en `/play`**: en `components/nav-bar.tsx` el `<nav>` añade `mobile-landscape:hidden` cuando `pathname.startsWith("/play/")`; en `components/site-chrome.tsx` el `<footer>` y el aviso de moneda (`coinMsg`) igual (usando `usePathname`). En vertical y en escritorio se ven como siempre. La salida en horizontal es SALIR del menú ⋮.
- **Mando táctil repartido** (`components/touch-controller/touch-controller.tsx`):
  - El contenido se reorganiza en dos grupos con `data-side="left"` (D-pad **o** deslizador) y `data-side="right"` (botones de acción). En vertical se ven como hoy (panel único con título "ARCADE UNIVERSAL CONTROLLER", D-pad a la izquierda y botones a la derecha).
  - En `mobile-landscape:` la `<section>` pasa a `contents`, el título se oculta, y cada grupo se coloca en su columna (`col-start-1` / `col-start-3`, `row-start-1`) como panel propio con el mismo borde/glow del spec 13, `self-center`.
  - Tamaños en horizontal: D-pad `w-[min(140px,100%)]`; botones de acción de 56 px apilados en columna con `gap-3`; si solo hay D-pad (Serpiente) la columna derecha queda vacía (ningún layout actual tiene solo acciones).
  - **Deslizador de Rompemuros en horizontal**: pista horizontal dentro de la columna izquierda (ancho de la columna menos padding, ≈ 120–140 px) y LANZAR en la derecha. La sensibilidad pasa de **1.5×** a **2.5×** cuando `matchMedia(MOBILE_LANDSCAPE_QUERY).matches` en el `pointerdown` que inicia el arrastre (se lee en el manejador, no en render). El toque corto para lanzar (< 200 ms, < 8 px) no cambia.
  - Toda la lógica de teclado sintético, DAS/ARR, multitáctil, háptica y `releaseAll()` del spec 13 se mantiene sin cambios.
- **Modal FIN DEL JUEGO en horizontal** (en `play-room.tsx`): en `mobile-landscape:` pasa a dos columnas (`grid-cols-2`, `max-w-[760px]`, `max-h-[calc(100dvh-24px)]`, `p-5`):
  - Izquierda: título "FIN DEL JUEGO", puntuación y los botones JUGAR DE NUEVO / salida.
  - Derecha, con `overflow-y-auto` propio: el formulario de nombre (antes de guardar) o `GameOverRanking` (después de guardar), más mensajes de error/guardado.
  - En vertical sigue en una columna con scroll (`max-h-[calc(100dvh-24px)]` en lugar de `92vh`).
- **Pausa automática al rotar**: `PlayRoom` escucha `matchMedia("(orientation: landscape)")` (`change`) en un efecto; si hay juego real en curso (`!over && !paused`) llama a `setPaused(true)` dentro del callback del listener (no en el cuerpo del efecto). No reanuda al volver.
- **Sugerencia "gira el móvil"** — componente nuevo `app/play/[id]/rotate-hint.tsx`:
  - Franja fina bajo el HUD con icono `RotateCcw` + "GIRA EL MÓVIL PARA JUGAR A PANTALLA GRANDE" (10 px, cian) y botón ✕ de 44 px con `aria-label="Descartar sugerencia"`.
  - Visible solo si: juego real, `touch.isCoarse`, no descartada, y por CSS solo en móvil vertical (`hidden max-md:portrait:flex`; nunca en horizontal).
  - Descartarla guarda `"dismissed"` en `localStorage` clave `arcadevault.rotate-hint.v1`, leída con `useSyncExternalStore` (snapshot de servidor = descartada → no se pinta en SSR), con fallback en memoria si `localStorage` falla.
- **Sin rebote/pull-to-refresh en `/play`**: un efecto en `PlayRoom` pone `document.documentElement.style.overscrollBehavior = "none"` al montar y lo restaura al desmontar.
- **Objetivos táctiles**: todo control interactivo nuevo o reubicado de la sala en `mobile:` mide ≥ 44×44 px con ≥ 8 px de separación. Colores solo con tokens de tema (`--cian`, `--magenta`, `--amarillo`, `--texto-*`) para tema claro y oscuro.
- Diseño visual con `/frontend-design` (regla del proyecto) y revisión final con el checklist de `/ui-ux-pro-max` (`references/pro-rules.md`).

**Out of scope (para specs futuros):**

- **Spec 15**: responsive del resto del sitio — navbar y menú lateral (objetivos < 44 px como `+ MONEDA`, "Salir", enlaces del menú), `/`, `/games`, `/game/[id]`, `/hall-of-fame` (tablas con `min-w-[420/560px]`), `/about`, `/auth`, y `min-h-screen` → `min-h-dvh` global.
- Fullscreen API, bloqueo de orientación (`screen.orientation.lock`) o PWA/instalable.
- Tablets: se quedan con el layout de escritorio (+ mando del spec 13 si son táctiles).
- Reanudar automáticamente tras cerrar el menú ⋮ o tras rotar.
- Cambios en motores (`engine.ts`), mecánicas, puntuaciones, skins (sus paletas), Supabase o `saveScoreAction`.
- Rediseño del mando (piezas, mapeos, DAS/ARR): solo cambia su colocación y la sensibilidad del deslizador en horizontal.
- Mover los marcadores de Bloques/Rompemuros a la barra (siguen en el canvas).

---

## 3 — Modelo de datos

No hay datos de dominio nuevos ni cambios en Supabase.

```css
/* app/globals.css — mantener sincronizado con lib/responsive.ts */
@custom-variant mobile-landscape (@media (orientation: landscape) and (max-height: 540px));
@custom-variant mobile (@media (max-width: 767px), (orientation: landscape) and (max-height: 540px));
```

```ts
// lib/responsive.ts — mantener sincronizado con las variantes de globals.css
export const MOBILE_LANDSCAPE_QUERY =
  "(orientation: landscape) and (max-height: 540px)";
export const MOBILE_QUERY = `(max-width: 767px), ${MOBILE_LANDSCAPE_QUERY}`;
```

```ts
// components/crt-frame.tsx — prop nueva
compact?: boolean; // marco reducido en `mobile:`; default false
```

```ts
// app/play/[id]/play-menu-sheet.tsx
type PlayMenuSheetProps = {
  open: boolean;
  onClose: () => void;
  skins?: {
    value: string;
    options: { id: string; label: string }[];
    onChange: (id: string) => void;
  };
  touch?: { visible: boolean; toggle: () => void }; // solo si isCoarse && juego real
  onExit: () => void;
  returnFocusRef: React.RefObject<HTMLButtonElement | null>; // botón ⋮
};
```

```ts
// components/touch-controller/touch-controller.tsx — constantes
const SLIDER_SENSITIVITY = 1.5; // spec 13 (vertical)
const SLIDER_SENSITIVITY_LANDSCAPE = 2.5; // pista más corta en horizontal
```

Persistencia (solo navegador):

| Clave `localStorage`         | Valores       | Ausente                                            |
| ---------------------------- | ------------- | -------------------------------------------------- |
| `arcadevault.rotate-hint.v1` | `"dismissed"` | se muestra la sugerencia (móvil vertical + táctil) |

Las claves de skins y `arcadevault.touch-controls.v1` no cambian.

---

## 4 — Plan de implementación

1. **Base responsive**: añadir las variantes `mobile` y `mobile-landscape` a `app/globals.css`, crear `lib/responsive.ts` y exportar `viewport` (con `viewportFit: "cover"`) en `app/layout.tsx` tras leer la guía `generate-viewport.md`. Nada visible cambia aún; `npm run lint` pasa.
2. **CRT compacto**: prop `compact` en `components/crt-frame.tsx`; `PlayRoom` la pasa. Verificar que home y detalle no cambian.
3. **HUD compacto + menú ⋮** (con `/frontend-design`): crear `app/play/[id]/play-menu-sheet.tsx` (SKIN en chips, MANDO switch, TEMA, SALIR; foco, `Escape`, safe area); exportar `ThemeToggleButton` desde `nav-bar.tsx`; en `play-room.tsx` ocultar JUGADOR/SKIN/MANDO/SALIR en `mobile:` y añadir PAUSA icono + ⋮ (abrir pausa). Escritorio intacto.
4. **Layout vertical**: paddings de `main` en `mobile:`, `RotateHint` (`app/play/[id]/rotate-hint.tsx` + clave `arcadevault.rotate-hint.v1` con `useSyncExternalStore`) y `overscroll-behavior: none` en `/play`.
5. **Layout horizontal**: `main` a `h-dvh` con safe areas, grid de 3 columnas, ancho del CRT derivado de la altura (con/sin columnas de mando); ocultar ayuda de teclado y `CRT-19`; ocultar navbar, footer y aviso de moneda en `/play` en `mobile-landscape:` (`nav-bar.tsx`, `site-chrome.tsx`).
6. **Mando repartido**: en `touch-controller.tsx` separar grupos `left`/`right`, `contents` + columnas en horizontal, tamaños reducidos, sensibilidad 2.5× del deslizador en horizontal. Vertical idéntico al spec 13.
7. **Modal FIN DEL JUEGO** en dos columnas en `mobile-landscape:` y `max-h` con `dvh`.
8. **Pausa al rotar**: listener de `(orientation: landscape)` en `PlayRoom`.
9. **Verificación** con Playwright (`hasTouch: true`, `isMobile: true`) en 390×844, 844×390, 360×780, 780×360, 375×667 y 667×375, los 4 juegos reales + un juego del simulador, en tema oscuro y claro; y escritorio 1280×800 sin cambios. Checklist de `/ui-ux-pro-max` (`references/pro-rules.md`). `npm run lint` y `npm run build`.
10. Actualizar `CLAUDE.md` (variantes `mobile`/`mobile-landscape`, `lib/responsive.ts`, menú ⋮, clave `arcadevault.rotate-hint.v1`, `compact` de `CrtFrame`) y marcar este spec como `Implementado`.

---

## 5 — Criterios de aceptación

- [ ] En 1280×800 (ratón) `/play/[id]` se ve y funciona exactamente como antes: barra con JUGADOR, SKIN, PAUSA, SALIR; navbar y footer visibles; sin menú ⋮.
- [ ] En 390×844 y 360×780 la barra superior ocupa una sola fila de ≤ 56 px con marcadores, PAUSA (icono) y ⋮; JUGADOR, SKIN, MANDO y SALIR no están en la barra.
- [ ] Tocar ⋮ abre la hoja inferior y pausa la partida; cerrarla (✕, fondo o `Escape`) no reanuda; el foco vuelve a ⋮.
- [ ] Desde la hoja se puede cambiar la skin (persiste igual que hoy), alternar MANDO (solo en táctil), cambiar el tema y salir.
- [ ] En 844×390 y 667×375 con el mando visible: sin navbar ni footer, HUD arriba, CRT centrado y mando repartido (D-pad o deslizador a la izquierda, acciones a la derecha), y `document.documentElement.scrollHeight <= window.innerHeight` (sin scroll vertical).
- [ ] En ningún viewport de la lista del paso 9 hay scroll horizontal (`scrollWidth <= innerWidth`).
- [ ] En horizontal, el CRT mantiene la proporción 16:10 y en 844×390 mide ≥ 480 px de ancho.
- [ ] Con MANDO desactivado en horizontal, el CRT queda centrado y las columnas laterales vacías.
- [ ] Rompemuros en horizontal: arrastrar ≈ 40 % de la pista cruza todo el campo (2.5×); en vertical sigue siendo 1.5×; el toque corto sigue lanzando.
- [ ] Los 4 juegos reales se juegan de principio a fin en vertical y en horizontal con el mando (jugar, pausar, fin, guardar, JUGAR DE NUEVO).
- [ ] Rotar el móvil durante una partida la pausa; rotar con el juego ya pausado o terminado no cambia nada.
- [ ] El modal FIN DEL JUEGO en 844×390 se ve en dos columnas y todos sus botones son alcanzables sin que el modal se salga de la pantalla; en 390×844 se ve en una columna.
- [ ] La sugerencia "gira el móvil" aparece solo en móvil vertical táctil en juegos reales, nunca en horizontal ni en escritorio; al descartarla no vuelve tras recargar (`arcadevault.rotate-hint.v1`).
- [ ] En horizontal ningún control queda bajo el notch (safe areas respetadas en emulación de iPhone).
- [ ] Todos los controles interactivos de la sala en `mobile:` miden ≥ 44×44 px y los iconos solo-icono tienen `aria-label`.
- [ ] Hacer pull-down en `/play` no recarga la página; en otras rutas el comportamiento no cambia.
- [ ] Legible con contraste ≥ 3:1 en tema claro y oscuro en ambas orientaciones.
- [ ] No hay errores de hidratación en consola al cargar `/play/[id]` en móvil (ambas orientaciones) ni en escritorio.
- [ ] Ningún `engine.ts` cambia; `/`, `/games`, `/game/[id]`, `/hall-of-fame`, `/about` y `/auth` no cambian.
- [ ] `npm run lint` y `npm run build` pasan sin errores.

---

## 6 — Decisiones tomadas y descartadas

- **Dividir en dos specs**: este (sala de juego) y el spec 15 (resto del sitio). La sala tiene problemas propios (orientación, CRT, mando, modal) y cada PR se verifica por separado. Descartado: un único spec para las 7 pantallas.
- **Detección por media queries CSS de tamaño** (`max-width: 767px` / `landscape and max-height: 540px`) como variantes Tailwind. Sin JS, sin desajuste de hidratación y funciona en DevTools. Descartado: combinar con `(pointer: coarse)` (una ventana estrecha de escritorio vería layout de escritorio roto) y decidir el árbol por `useMediaQuery` (snapshot de servidor distinto → parpadeo). La visibilidad del mando sigue dependiendo de `(pointer: coarse)` (spec 13).
- **Umbral 540 px de alto** para horizontal: cubre teléfonos acostados (360–430 px de alto) y deja fuera tablets (≥ 768 px), que conservan el layout de escritorio.
- **Mando a los lados del CRT en horizontal**, formato consola portátil, sin scroll. Descartado: apilado con scroll (lo que se quiere evitar) y pantalla completa con mando superpuesto (tapa el juego; iPhone no soporta Fullscreen API).
- **HUD compacto + menú ⋮ en hoja inferior**. Descartado: todos los botones como iconos en la barra (no caben en 360 px) y mantener la barra reducida en 2 filas.
- **HUD como barra fina arriba también en horizontal**: con ~48 px de barra el CRT sigue siendo grande y las columnas (~150–170 px) dan cabida al D-pad y los botones. Descartado: repartir marcadores en las columnas (encogía el D-pad).
- **Abrir el menú pausa; cerrarlo no reanuda**: evita perder vidas al volver y es coherente con PAUSA/SEGUIR explícito. Descartado: reanudar al cerrar.
- **Navbar oculto solo en `/play` horizontal**: en vertical sobra altura y se conserva la navegación; en horizontal cada píxel de alto cuenta. Descartado: ocultarlo siempre en móvil o nunca.
- **Deslizador horizontal en la columna izquierda con 2.5×**: misma mecánica relativa del spec 13; más sensibilidad compensa la pista corta. La sensibilidad se decide en `pointerdown` con `matchMedia`, sin estado de React. Descartado: pista bajo el CRT (roba altura) y columna entera como trackpad sin pista visible (sin feedback de posición).
- **Mando repartido por CSS (`display: contents` + columnas)** en lugar de dos componentes o una prop `placement`: un solo árbol, sin JS de detección, sin duplicar lógica de punteros.
- **Modal en dos columnas en horizontal**: con ~360 px de alto, el formulario + top 10 en una columna obligaría a scroll largo y dejaría botones fuera de vista.
- **Pausa automática al rotar**: el layout salta al rotar y el jugador pierde la referencia. No reanuda.
- **Sugerencia "gira el móvil" descartable y persistida**: ayuda a descubrir el modo horizontal sin molestar a quien prefiere vertical.
- **`viewport-fit=cover` + safe areas y `dvh`**: el notch en horizontal y la barra dinámica del navegador rompían `vh`. No se bloquea el zoom (`userScalable` intacto) por accesibilidad.
- **`overscroll-behavior: none` solo en `/play`**: evita pull-to-refresh accidental en partida sin cambiar el resto del sitio.
- **`compact` como prop explícita de `CrtFrame`**: el marco reducido solo aplica a la sala; aplicar `mobile:` directamente en `CrtFrame` cambiaría home y detalle, que son del spec 15.

---

## 7 — Riesgos identificados

- **Variantes Tailwind v4 con listas de media queries**: `@custom-variant` con una query que contiene coma (`mobile`) debe generarse como una sola regla `@media`. Mitigación: verificar el CSS compilado en el paso 1; si no funciona, definir `mobile` con `@custom-variant mobile { @media (...) { @slot; } @media (...) { @slot; } }`.
- **`display: contents` y accesibilidad**: algunos navegadores antiguos quitaban el rol de la `<section aria-label="Control táctil">`. Mitigación: en horizontal cada grupo lleva su propio `aria-label` ("Control de dirección" / "Botones de acción").
- **Teléfonos muy bajos en horizontal (≤ 360 px de alto)**: el CRT puede quedar por debajo de 320 px de ancho. Aceptado; los juegos escalan por letterbox y siguen jugables.
- **iOS Safari y `dvh`/barra dinámica**: al aparecer/desaparecer la barra del navegador el alto cambia; el layout se reajusta solo (CSS) y no dispara pausa (solo la orientación la dispara).
- **Pausa al rotar en falsos positivos**: algunos Android emiten `change` de orientación al abrir el teclado. Mitigación: solo se escucha `(orientation: landscape)` y durante la partida no hay campos de texto; el modal de fin ya ha parado el juego.
- **Detección `(pointer: coarse)`** (heredado del spec 13): portátiles táctiles pueden no ver el mando ni la sugerencia de giro. Aceptado.

---

## Lo que **no** entra en este spec

- Responsive del resto del sitio (spec 15): navbar, menú lateral, catálogo, detalle, Hall of Fame, About, Auth.
- Fullscreen, bloqueo de orientación, PWA.
- Layout especial para tablets.
- Cambios en motores, mecánicas, puntuaciones, skins, mapeos del mando o Supabase.
