# SPEC 15 — Sala de juego en escritorio (sin scroll, menú ⋮ y pantalla completa)

> **Status:** Aprovado
> **Depends on:** SPEC 09, SPEC 12, SPEC 13, SPEC 14
> **Date:** 2026-10-01
> **Objective:** Llevar a la sala `/play/[id]` en escritorio las ideas del spec 14: barra compacta de una fila con menú ⋮, CRT dimensionado por el alto libre para jugar sin scroll, modal FIN DEL JUEGO en dos columnas en ventanas bajas y modo pantalla completa.

---

## 1 — Por qué existe este spec

El spec 14 dejó la sala cómoda en móvil y, de forma explícita, **sin tocar el escritorio**. Hoy, con ratón y teclado:

- El CRT se dimensiona por el **ancho** (`max-w-[1020px]`, 16:10). En 1366×768 mide ≈ 984×633 y, sumando navbar, barra, ayuda y footer, la página pasa de 900 px de alto: hay que hacer **scroll para ver el juego entero**.
- En monitores grandes (1920×1080) pasa lo contrario: el CRT se queda en 1020 px y sobra pantalla.
- La barra superior (marcadores + JUGADOR + SKIN + MANDO + PAUSA + SALIR, `px-5 py-4`) ocupa ≈ 76 px y se envuelve en dos filas entre 768 y ~900 px de ancho.
- Móvil y escritorio tienen **dos barras distintas** en `play-room.tsx` (bloque `mobile:hidden` y bloque `mobile:flex`), con SKIN duplicado (`SkinSelect` + chips de la hoja).
- El modal FIN DEL JUEGO es una columna de 460 px: en ventanas bajas el ranking obliga a hacer scroll dentro del modal.
- No hay pantalla completa, y cambiar de pestaña no pausa la partida.

Este spec resuelve **solo la sala de juego en escritorio**. El resto del sitio en móvil sigue siendo el **spec 16**.

"Escritorio" aquí significa **todo lo que no es `mobile:`** (spec 14): ancho ≥ 768 px y alto > 540 px. Incluye tablets.

---

## 2 — Scope

**In:**

- **Variantes Tailwind nuevas** en `app/globals.css` (CSS puro, sin JS):
  - `desktop:` → `@media (width >= 768px) and (height > 540px)`. Es el complemento exacto de `mobile:`.
  - `desktop-short:` → `@media (width >= 768px) and (height > 540px) and (height <= 800px)` (ventanas anchas y bajas: 1366×768, 1280×720).
  - `fullscreen-doc:` → `:root:fullscreen &` (el documento está en pantalla completa por la Fullscreen API).
  - Se registran **después** de `mobile` y `mobile-landscape`, en el orden `desktop`, `desktop-short`, `fullscreen-doc`, para que las más específicas ganen en conflictos.
  - No se añaden constantes a `lib/responsive.ts`: ningún JS de este spec necesita esas queries.
- **Barra compacta única** en `PlayRoom` (una sola fila, mismo árbol para móvil y escritorio):
  - Izquierda: marcadores actuales (PUNTUACIÓN / VIDAS / NIVEL; Bloques y Rompemuros siguen sin marcadores en la barra) y **JUGADOR**, que sigue oculto en `mobile:` y visible en `desktop:`.
  - Derecha: **PAUSA/SEGUIR**, **PANTALLA COMPLETA** y **⋮**.
    - PAUSA/SEGUIR: en `mobile:` sigue siendo solo icono de 44×44 px (spec 14). En `desktop:` muestra icono + texto ("PAUSA" / "SEGUIR"), alto 44 px, amarillo.
    - PANTALLA COMPLETA: botón solo icono de 44×44 px (`Maximize` / `Minimize` de `lucide-react`), cian, `aria-label` "Pantalla completa" / "Salir de pantalla completa", `aria-pressed`, `title="Pantalla completa (F)"`. Solo en `desktop:` y solo si el navegador soporta la API.
    - ⋮: el botón del spec 14, ahora visible también en `desktop:`.
  - **SKIN, MANDO y SALIR salen de la barra en escritorio** y viven solo en el menú ⋮. Se elimina el bloque `mobile:hidden` actual (los tres `SkinSelect`, el `<select>` de Bloques, el botón MANDO y SALIR).
  - `components/skin-select.tsx` queda sin usos y **se borra**.
  - Barra en `desktop:`: alto fijo de 56 px (`h-14`), `px-4`, `flex-nowrap`.
- **Menú OPCIONES como panel anclado al ⋮ en escritorio** (`app/play/[id]/play-menu-sheet.tsx`, mismo componente y mismo contenido):
  - En `mobile:` sigue siendo la hoja inferior del spec 14, sin cambios.
  - En `desktop:` es un panel de 320 px de ancho colocado bajo el botón ⋮ y alineado a su borde derecho, con borde cian en los cuatro lados, `max-h-[calc(100dvh-var(--menu-top)-16px)]` y scroll propio. Entra con `animate-fade` (no con `animate-sheet`).
  - La posición llega por una prop nueva `anchor` (`{ top, right }` en px de viewport), que `PlayRoom` calcula en `openMenu` con `getBoundingClientRect()` del botón ⋮ (en el manejador del clic, no en render). El panel la aplica como variables CSS `--menu-top` / `--menu-right`; en `mobile:` se ignoran.
  - El fondo sigue cubriendo la pantalla y cierra al hacer clic fuera, pero en `desktop:` es transparente (`desktop:bg-transparent`): no se oscurece el juego.
  - Mientras está abierto, un `resize` de la ventana o un `fullscreenchange` lo **cierra** (el ancla deja de ser válida).
  - Se conservan `role="dialog"`, `aria-modal`, trampa de foco, `Escape`, foco al primer control y vuelta del foco al ⋮.
  - **Abrirlo pausa** una partida real en curso y **cerrarlo no reanuda** (igual que el spec 14).
  - Contenido igual que hoy: SKIN (chips), MANDO TÁCTIL (solo si `touch.isCoarse` y juego real), TEMA, SALIR. Juegos del simulador: solo TEMA y SALIR.
- **Sala sin scroll en `desktop:`** (cuando el mando táctil **no** está visible):
  - `components/site-chrome.tsx`: en `/play/*` el contenedor raíz pasa a `desktop:h-dvh`, el `<footer>` se oculta (`desktop:hidden`) y el envoltorio de `children` añade `desktop:min-h-0`. El **navbar se queda**. En otras rutas no cambia nada.
  - `main` de `PlayRoom` en `desktop:`: `flex flex-col min-h-0`, `max-w-[1600px]`, `px-[18px] py-4`, y es contenedor de tamaño (`[container-type:size]`).
  - Barra, CRT y línea de ayuda comparten una **columna centrada** de ancho `--room-w`:
    - `--room-w: min(100cqw, calc((100cqh - var(--room-overhead)) * 1.6 + 28px), 1600px)`.
    - `--room-overhead` = barra 56 + separación 12 + ayuda 28 + marco del CRT 28 = **124 px** en juegos reales. En juegos del simulador suma el botón "SIMULAR FIN DE PARTIDA" (74 px) → **198 px**.
    - `28px` es el marco de `CrtFrame` (`p-3.5` × 2). El CRT mantiene 16:10.
  - Tamaños esperados (navbar ≈ 63 px): 1280×720 → columna ≈ 830 px; 1366×768 → ≈ 906 px; 1920×1080 → ≈ 1406 px. Con 768×1024 manda el ancho: ≈ 732 px, alineada arriba.
  - CRT en `desktop:`: `mt-3` (en lugar de `mt-6`).
- **Con el mando táctil visible en `desktop:`** (tablets con `pointer: coarse`): se mantiene el layout apilado del spec 13 (CRT y mando debajo) **con scroll**. La columna usa `--room-w: min(100cqw, 1020px)` y `main` no se encoge (`shrink-0`). Con MANDO desactivado desde el menú, la tablet pasa al layout sin scroll.
- **Línea de ayuda de teclado** bajo el CRT en `desktop:`: una sola línea de 28 px de alto, `whitespace-nowrap` con `text-overflow: ellipsis`, `tracking-[1px]`, y `title` con el texto completo. La etiqueta `ARCADE VAULT CRT-19` se oculta en `desktop:` (en móvil vertical sigue como hoy).
- **Pantalla completa** — hook nuevo `lib/use-fullscreen.ts`:
  - `useFullscreen()` → `{ supported, active, toggle }`, con `useSyncExternalStore` (suscripción a `fullscreenchange`; snapshot de servidor `supported: false`, `active: false` → el botón no se pinta en SSR ni provoca desajuste de hidratación).
  - `supported` = `document.fullscreenEnabled`. `active` = `document.fullscreenElement !== null`.
  - `toggle()` llama a `document.documentElement.requestFullscreen()` o `document.exitFullscreen()`; un rechazo de la promesa se ignora (`catch` vacío).
  - El elemento en pantalla completa es **`<html>`**, no `<main>`: el modal FIN DEL JUEGO y el menú OPCIONES están en un portal a `<body>` y deben seguir viéndose.
  - **Tecla F**: listener `keydown` en `window` dentro de `PlayRoom`. Actúa si `e.code === "KeyF"`, sin `ctrl`/`meta`/`alt`, sin `e.repeat`, `supported` es `true` y el destino no es `input`, `textarea`, `select` ni `contentEditable`. Ningún motor usa la F.
  - `Esc` sale de pantalla completa (comportamiento nativo del navegador; no se intercepta).
  - En pantalla completa, `components/nav-bar.tsx` oculta el `<nav>` en `/play/*` (`fullscreen-doc:hidden`). El layout es el mismo de `desktop:`, con más alto: 1920×1080 → columna ≈ 1506 px.
  - Al salir de la sala (SALIR, VOLVER AL VAULT o desmontar `PlayRoom`) se llama a `document.exitFullscreen()` si sigue activa.
  - No se persiste: el navegador exige un gesto del usuario para entrar.
- **Pausa automática** (un efecto en `PlayRoom`, mismo patrón que la pausa al girar: `setPaused(true)` dentro del callback del listener, solo con juego real y `!over`):
  - `fullscreenchange` (entrar **o** salir): el layout salta.
  - `visibilitychange` con `document.hidden === true` (cambiar de pestaña o minimizar).
  - Nunca reanuda sola: el jugador pulsa SEGUIR.
  - Aplica en cualquier dispositivo (en móvil, cambiar de app también pausa).
- **Modal FIN DEL JUEGO en dos columnas en `desktop-short:`** (`play-room.tsx`):
  - Misma distribución que en `mobile-landscape:` (spec 14): izquierda título, puntuación y botones JUGAR DE NUEVO / VOLVER AL VAULT; derecha, con `overflow-y-auto` propio, el formulario de nombre o `GameOverRanking` y los mensajes.
  - `max-w-[860px]`, `max-h-[calc(100dvh-40px)]`, `gap-x-8`. El padding del overlay (`p-5`) y del modal (`px-7 py-9`) no cambian.
  - Con alto > 800 px sigue en una columna de 460 px, como hoy.
- **Colores solo con tokens de tema** (`--cian`, `--magenta`, `--amarillo`, `--texto-*`) en todo control nuevo o reubicado, para tema claro y oscuro.
- Diseño visual con `/frontend-design` (regla del proyecto) y revisión final con el checklist de `/ui-ux-pro-max`.

**Out of scope (para specs futuros):**

- **Spec 16**: responsive del resto del sitio en móvil (navbar, menú lateral, `/`, `/games`, `/game/[id]`, `/hall-of-fame`, `/about`, `/auth`, `min-h-screen` → `min-h-dvh` global).
- Botón de pantalla completa en `mobile:`, bloqueo de orientación (`screen.orientation.lock`) y PWA.
- Layout a los lados del CRT para tablets con mando (siguen con el apilado del spec 13).
- Reanudar automáticamente al cerrar el menú, al volver a la pestaña o al cambiar de pantalla completa.
- Recordar la preferencia de pantalla completa entre sesiones.
- Fila "CONTROLES" o "PANTALLA COMPLETA" dentro del menú OPCIONES.
- Cambios en motores (`engine.ts`), mecánicas, puntuaciones, paletas de skins, mando táctil, Supabase o `saveScoreAction`.
- Mover los marcadores de Bloques/Rompemuros a la barra (siguen en el canvas).
- Subir la resolución interna de los canvas para monitores grandes (hoy escalan por letterbox).

---

## 3 — Modelo de datos

No hay datos de dominio nuevos, ni cambios en Supabase, ni claves nuevas de `localStorage`.

```css
/* app/globals.css — después de mobile y mobile-landscape, en este orden */
@custom-variant desktop (@media (width >= 768px) and (height > 540px));
@custom-variant desktop-short (@media (width >= 768px) and (height > 540px) and (height <= 800px));
@custom-variant fullscreen-doc (:root:fullscreen &);
```

```ts
// lib/use-fullscreen.ts
export function useFullscreen(): {
  supported: boolean; // document.fullscreenEnabled; false en servidor
  active: boolean; // document.fullscreenElement !== null
  toggle: () => void; // <html>.requestFullscreen() / document.exitFullscreen()
};
```

```ts
// app/play/[id]/play-menu-sheet.tsx — prop nueva
anchor?: { top: number; right: number }; // px de viewport; solo se usa en `desktop:`
```

```css
/* Variables CSS de la sala (play-room.tsx, solo en desktop:) */
--room-overhead: 124px; /* 198px en juegos del simulador */
--room-w: min(
  100cqw,
  calc((100cqh - var(--room-overhead)) * 1.6 + 28px),
  1600px
);
/* Con el mando táctil visible: --room-w: min(100cqw, 1020px) */
```

Las claves de skins, `arcadevault.touch-controls.v1` y `arcadevault.rotate-hint.v1` no cambian.

---

## 4 — Plan de implementación

1. **Variantes**: añadir `desktop`, `desktop-short` y `fullscreen-doc` a `app/globals.css`. Comprobar con una clase de prueba que las tres compilan a un selector válido (el spec 14 ya tropezó con `@custom-variant`). Nada visible cambia; `npm run lint` pasa.
2. **Barra única** (con `/frontend-design`): en `play-room.tsx` fusionar los dos bloques de botones en uno (PAUSA con texto en `desktop:`, ⋮ visible siempre), mostrar JUGADOR solo en `desktop:`, fijar `h-14` y quitar SKIN/MANDO/SALIR de la barra. Borrar `components/skin-select.tsx` y sus imports. En este paso el menú se abre aún como hoja inferior también en escritorio: la sala sigue siendo usable.
3. **Panel anclado**: prop `anchor` en `PlayMenuSheet`, cálculo en `openMenu`, estilos `desktop:` (320 px, bajo el ⋮, fondo transparente, `animate-fade`) y cierre en `resize` / `fullscreenchange`. Móvil idéntico al spec 14.
4. **Sala sin scroll**: `site-chrome.tsx` (`desktop:h-dvh`, footer oculto y `min-h-0` en `/play/*`), `main` como contenedor de tamaño, columna `--room-w` para barra + CRT + ayuda, ayuda en una línea y `CRT-19` oculto en `desktop:`. Rama con mando visible (`shrink-0`, `min(100cqw, 1020px)`).
5. **Pantalla completa**: crear `lib/use-fullscreen.ts`, botón en la barra, tecla F, `fullscreen-doc:hidden` en `nav-bar.tsx` para `/play/*` y `exitFullscreen()` al salir o desmontar.
6. **Pausa automática**: efecto con `fullscreenchange` y `visibilitychange` en `PlayRoom`.
7. **Modal en dos columnas** en `desktop-short:`.
8. **Verificación** con Playwright en 1280×720, 1366×768, 1280×800, 1920×1080, 768×1024 y 1024×768 (este último también con `hasTouch: true`), los 4 juegos reales + un juego del simulador, tema oscuro y claro; y regresión móvil en 390×844 y 844×390. Checklist de `/ui-ux-pro-max`. `npm run lint` y `npm run build`.
9. Actualizar `CLAUDE.md` (variantes `desktop` / `desktop-short` / `fullscreen-doc`, barra única, panel anclado, `lib/use-fullscreen.ts`, pausa automática, baja de `skin-select.tsx`) y marcar este spec como `Implementado`.

---

## 5 — Criterios de aceptación

- [ ] En 1280×720, 1366×768, 1280×800 y 1920×1080 (ratón, juego real): `document.documentElement.scrollHeight <= window.innerHeight` y `scrollWidth <= innerWidth` (sin scroll).
- [ ] El marco del CRT mantiene 16:10 y mide ≥ 860 px de ancho en 1366×768 y ≥ 1360 px en 1920×1080.
- [ ] Barra, CRT y línea de ayuda tienen el mismo ancho y están centrados.
- [ ] En escritorio la barra es una sola fila de 56 px con marcadores, JUGADOR, PAUSA/SEGUIR, pantalla completa y ⋮. SKIN, MANDO y SALIR no están en la barra.
- [ ] En 768×1024 la barra no se envuelve y no hay scroll horizontal.
- [ ] Clic en ⋮ abre un panel de 320 px bajo el botón, alineado a su derecha, sin oscurecer el juego, y pausa la partida. Cerrarlo (✕, clic fuera o `Escape`) no reanuda y devuelve el foco a ⋮.
- [ ] Desde el panel se cambia la skin (persiste igual que hoy), se cambia el tema y se sale. MANDO TÁCTIL solo aparece en dispositivos táctiles.
- [ ] Redimensionar la ventana con el panel abierto lo cierra.
- [ ] El navbar se ve en `/play/[id]` en escritorio y el footer no. En `/`, `/games`, `/game/[id]`, `/hall-of-fame`, `/about` y `/auth` navbar y footer no cambian.
- [ ] El botón de pantalla completa y la tecla F entran y salen de pantalla completa. En pantalla completa no hay navbar y el CRT mide ≥ 1460 px de ancho en 1920×1080.
- [ ] La F no cambia la pantalla mientras se escribe el nombre en el modal, y ningún juego reacciona a la F.
- [ ] En pantalla completa, el menú OPCIONES y el modal FIN DEL JUEGO se ven y funcionan.
- [ ] Si `document.fullscreenEnabled` es `false`, el botón no se muestra y la F no hace nada.
- [ ] Entrar o salir de pantalla completa pausa una partida en curso. Cambiar de pestaña también. Volver no reanuda. Con el juego ya pausado o terminado no cambia nada.
- [ ] Salir de la sala estando en pantalla completa sale de pantalla completa.
- [ ] El modal FIN DEL JUEGO se ve en dos columnas en 1366×768 y 1280×720, con todos sus botones visibles sin scroll del modal; en 1920×1080 se ve en una columna.
- [ ] En 1024×768 con `pointer: coarse` y el mando visible: CRT y mando apilados, con scroll, como antes. Con MANDO desactivado: sin scroll.
- [ ] En 390×844 y 844×390 la sala se ve y funciona como tras el spec 14 (hoja inferior, mando repartido, sin botón de pantalla completa).
- [ ] Los 4 juegos reales se juegan de principio a fin en escritorio (jugar, pausar, fin, guardar, JUGAR DE NUEVO), en ventana y en pantalla completa.
- [ ] Todos los botones solo-icono tienen `aria-label` y foco visible; contraste ≥ 3:1 en tema claro y oscuro.
- [ ] No hay errores de hidratación en consola al cargar `/play/[id]` en escritorio ni en móvil.
- [ ] Ningún `engine.ts` cambia. `components/skin-select.tsx` no existe y nada lo importa.
- [ ] `npm run lint` y `npm run build` pasan sin errores.

---

## 6 — Decisiones tomadas y descartadas

- **Barra compacta + ⋮ también en escritorio**, con un solo árbol para móvil y escritorio. Elimina la duplicación de SKIN y deja más alto al CRT. Descartado: barra híbrida (PAUSA y SALIR visibles, resto en ⋮) y la barra actual solo más baja.
- **JUGADOR se queda en la barra de escritorio**: hay ancho de sobra y da contexto de a nombre de quién se guardará. En móvil sigue oculto.
- **PAUSA con texto en escritorio**: es la acción principal y con ratón conviene que se lea. En móvil sigue solo icono.
- **Navbar visible y footer oculto en `/play`**: se conservan navegación y créditos, y el footer no aporta nada durante la partida. Descartado: ocultar ambos siempre (se pierde el contador de créditos) y mantener ambos (el CRT encoge demasiado en 1366×768).
- **CRT dimensionado por el alto libre, sin el tope de 1020 px** (máximo de seguridad 1600 px). Descartado: mantener 1020 px en ventana y reservar el tamaño grande a pantalla completa.
- **Unidades de contenedor (`cqw` / `cqh`) sobre `main`** en lugar de `calc(100dvh − navbar − …)`: el alto del navbar no es constante (cambia a menú hamburguesa por debajo de 1000 px) y así solo se fijan constantes de lo que la sala controla (barra, ayuda, marco). Descartado: medir con `ResizeObserver` (JS y parpadeo en la carga).
- **Una columna `--room-w` para barra + CRT + ayuda**: si solo se dimensionara el CRT, la barra quedaría más ancha que la pantalla en ventanas bajas.
- **Con el mando táctil visible se conserva el layout apilado con scroll**: el alto del mando no cabe junto a un CRT útil en una tablet y repartirlo a los lados es otro diseño. Queda fuera de alcance.
- **Panel anclado al ⋮ en escritorio**, mismo componente que la hoja. Descartado: reutilizar la hoja inferior (queda lejos del botón en un monitor grande) y un modal centrado (tapa el juego).
- **Ancla calculada al abrir y pasada como prop**, con cierre en `resize`: un solo árbol en portal, sin leer refs en render ni recolocar en vivo. Descartado: popover sin portal (dos árboles según el dispositivo) y CSS anchor positioning (soporte insuficiente en Safari y Firefox).
- **Fondo transparente en escritorio**: el panel es pequeño y el juego ya muestra "EN PAUSA"; oscurecer toda la pantalla sobra.
- **Pantalla completa sobre `<html>`**: el modal y el menú viven en un portal a `<body>` (spec 14) y no se verían si el elemento fuese `<main>` o el CRT.
- **Botón en la barra + tecla F**. Ningún motor usa la F (se usan flechas, WASD, X, B, P, espacio, Esc y 1–3). Descartado: solo botón y fila dentro del menú ⋮ (se descubre peor).
- **Variante CSS `fullscreen-doc:` para ocultar el navbar** y hook `useFullscreen` solo para el estado del botón. Descartado: `@media (display-mode: fullscreen)` (también salta con F11 y su soporte con la API varía).
- **F11 no se trata como pantalla completa**: el navegador no lo expone. La sala simplemente gana alto y el CRT crece.
- **Pausa al cambiar de pantalla completa y al ocultar la pestaña; nunca reanuda sola**. Coherente con la pausa al girar del spec 14. Descartado: pausar solo con el menú.
- **Modal en dos columnas solo en ventanas bajas (≤ 800 px de alto)**. En ventanas altas la columna única cabe sin scroll. Descartado: dos columnas siempre en escritorio.
- **La ayuda de teclado se queda bajo el CRT en una línea**; `CRT-19` se oculta en escritorio para que quepa. Descartado: moverla al menú (obliga a pausar para verla).
- **Sin persistencia nueva**: la pantalla completa no se puede restaurar sin un gesto del usuario.
- **Sin constantes nuevas en `lib/responsive.ts`**: el layout es CSS puro y el JS de este spec no consulta las queries.

---

## 7 — Riesgos identificados

| Riesgo                                                                                                                                                          | Mitigación                                                                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `container-type: size` exige que `main` tenga alto definido. Si la cadena flex (`h-dvh` → `min-h-0` → `flex-1`) se rompe, `cqh` vale 0 y el CRT colapsa.        | El paso 4 se verifica en los 6 viewports. Alternativa: `--room-w` con `100dvh` y una variable `--nav-h` fijada en `nav-bar.tsx`.                                                       |
| `@custom-variant` con sintaxis de rango (`width >= 768px`) o con `:root:fullscreen &` compila a un selector inválido (ya pasó con `mobile` en el spec 14).      | El paso 1 comprueba el CSS generado. Alternativas: `min-width` / `min-height: 540.02px` y la forma de bloque con `@slot`.                                                              |
| `h-dvh` en el contenedor raíz de `/play` convierte el scroll de la página en scroll interno del contenedor en la rama con mando visible (`overflow-x-hidden`).  | Verificar en 1024×768 táctil que el scroll, el navbar `sticky` y el mando funcionan. Alternativa: aplicar `desktop:h-dvh` solo cuando el mando está oculto, vía atributo en `<html>`.  |
| En pantalla completa, `Esc` con el menú o el modal abiertos sale de pantalla completa antes de (o en lugar de) cerrarlos.                                       | Aceptado: el menú se cierra de todos modos con el `fullscreenchange` y la partida queda en pausa. El modal no se cierra con `Esc`.                                                     |
| En Rompemuros y Serpiente `Esc` ya pausa en el motor: al salir de pantalla completa con `Esc` pueden llegar dos señales de pausa (una alterna, la otra fuerza). | La pausa automática usa `setPaused(true)` (no alterna) y se verifica en el paso 8 que el juego queda en pausa. Si no, la pausa por `fullscreenchange` se aplica en un `setTimeout(0)`. |
| Safari de escritorio anterior a 16.4 solo tiene la API con prefijo `webkit`.                                                                                    | `supported` es `false` → sin botón ni tecla F. La sala funciona igual en ventana.                                                                                                      |
| Canvas escalados a ~1400–1500 px se ven más blandos que a 1020 px.                                                                                              | Aceptado; subir la resolución interna de los motores queda fuera de alcance.                                                                                                           |
| La ayuda de Rompemuros (≈ 85 caracteres) no cabe en columnas de ~830 px y se corta con puntos suspensivos.                                                      | `tracking-[1px]` en escritorio y `title` con el texto completo.                                                                                                                        |
| `visibilitychange` pausa también en móvil al cambiar de app (cambio de comportamiento fuera de escritorio).                                                     | Aceptado: es el comportamiento deseado y no reanuda sola. Se incluye en la regresión móvil del paso 8.                                                                                 |

---

## Lo que **no** entra en este spec

- Responsive del resto del sitio en móvil (spec 16).
- Pantalla completa en móvil, bloqueo de orientación, PWA.
- Mando táctil a los lados del CRT en tablets.
- Reanudar automáticamente la partida en ningún caso.
- Recordar la pantalla completa entre sesiones.
- Cambios en motores, mecánicas, puntuaciones, paletas de skins, mando táctil o Supabase.
- Subir la resolución interna de los canvas.
