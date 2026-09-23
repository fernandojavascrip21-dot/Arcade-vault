# SPEC 09 — Interruptor de tema claro/oscuro

> **Status:** Aprovado
> **Depends on:** SPEC 01
> **Date:** 2026-09-22
> **Objective:** Agregar un interruptor de tema claro/oscuro global en la barra de navegación, con persistencia en `localStorage` y arranque según la preferencia del sistema, que retematice el "chrome" de todo el sitio (nav, fondos, tarjetas, carátulas del catálogo, texto) vía variables CSS en `app/globals.css`, sin modificar los canvas de los motores de juego ni los efectos CRT fijos de `CrtFrame`.

---

## 1 — Por qué existe este spec

Desde el spec 01, `app/globals.css` define una única paleta oscura fija (`--background: #0a0a0f`, `--foreground: #cdd8de`, acentos neón cian/magenta/amarillo): el bloque `@media (prefers-color-scheme: dark)` que existe hoy es, según su propio comentario, un no-op deliberado ("la maqueta es de estética oscura única"). No hay ningún modo claro implementado en ninguna parte de la app.

El spec 08 (motor de Bloques/Tetris) dejó explícitamente fuera de alcance portar el interruptor de tema del original (`tetris-theme` en `localStorage`, propio de ese único juego), señalando que "ningún otro juego de la plataforma lo tiene". Este spec retoma esa idea pero a nivel de plataforma completa: no es un ajuste local de un juego, sino un interruptor global de la "chrome" del sitio (barra de navegación, fondos, tarjetas, catálogo, salón de la fama, fichas de juego), separado por completo del motor de cualquier juego.

`references/started-games/03-tetris/style.css` implementa exactamente este mecanismo (`[data-theme="light"]`, `THEME_KEY = 'tetris-theme'` en `game.js`) con dos temas únicamente — oscuro y claro, sin un tercer tema "retro" separado (el README solo usa "dark / retro arcade" como etiqueta descriptiva del único oscuro). Su paleta clara (`--bg: #eef0f7`, `--text: #23243a`, `--accent: #3b5bdb`, etc.) es la fuente de los valores concretos del modo claro de este spec (sección 2); el oscuro de Arcade Vault no cambia — conserva su propia paleta neón ya establecida, no la azul/gris del Tetris original.

---

## 2 — Scope

**In:**

- Nuevo contexto `contexts/theme-context.tsx` (`ThemeProvider` / `useTheme`), montado en `contexts/providers.tsx` junto a `SessionProvider`/`CreditsProvider`, siguiendo el mismo patrón de Context ya usado por ambos.
- Persistencia en `localStorage` bajo la clave `arcadevault.theme.v1` (valor `"dark"` o `"light"`). En la primera visita (sin valor guardado), el tema inicial sigue `prefers-color-scheme` del sistema operativo/navegador; en cuanto el usuario usa el interruptor, esa elección explícita se guarda y gana sobre el sistema en visitas futuras (el sistema solo decide el valor inicial, no hay sincronización en vivo si el usuario cambia la preferencia de su SO después).
- Script inline en `app/layout.tsx`, ejecutado antes de hidratar React, que lee `localStorage`/`matchMedia` y aplica el resultado como `document.documentElement.dataset.theme` de inmediato, para evitar parpadeo (flash) del tema no elegido al cargar cualquier página.
- El bloque no-op `@media (prefers-color-scheme: dark)` de `app/globals.css` se reemplaza por overrides explícitos bajo el selector `:root[data-theme="light"] { ... }`. Cinco de los ocho tokens se fijan ya en este spec, tomados tal cual de la paleta clara de `references/started-games/03-tetris/style.css`:
  - `--background: #eef0f7` (de `--bg`)
  - `--foreground: #23243a` (de `--text`)
  - `--cian: #3b5bdb` (de `--accent`, el único acento del Tetris original — pasa a ser el acento primario del modo claro de Arcade Vault)
  - `--texto-tenue: #7c7f99` (de `--muted-label`)
  - `--texto-debil: #5a5c72` (de `--controls-text`)
  - `--linea: rgba(59, 91, 219, 0.28)` — derivado, no literal del original: mismo patrón de opacidad (28%) que ya usa `--linea` en modo oscuro, aplicado al nuevo `--cian` claro (`#3b5bdb`), porque el Tetris original no tiene un token de "línea translúcida" equivalente (su `--grid-line: #d5d8ea` es opaco y de otro uso).
  - `--magenta` y `--amarillo` **no tienen equivalente en el Tetris original** (es un diseño de un solo acento; su color de alerta `--overlay-title: #d1453b` es rojo, no magenta). Estos dos se definen durante `/spec-impl` invocando `/frontend-design` (como pide `CLAUDE.md`), partiendo de los magenta/amarillo neón actuales oscurecidos/saturados lo necesario para verse legibles sobre el nuevo fondo claro `#eef0f7`.
- Los 6 gradientes decorativos `.cover-rompemuros`, `.cover-serpiente`, `.cover-invasores`, `.cover-asteroides`, `.cover-bloques`, `.cover-laberinto` de `app/globals.css` también reciben una variante bajo `:root[data-theme="light"]`. El Tetris original no tiene equivalente de "carátula de catálogo": sus valores exactos se deciden en `/spec-impl` vía `/frontend-design`, igual que `--magenta`/`--amarillo`.
- Botón de interruptor en `NavBar` (`components/nav-bar.tsx`): visible en la navegación ancha (≥1000px) y dentro del panel lateral móvil, con ícono `Sun`/`Moon` de `lucide-react` (nueva dependencia) según el tema activo, siguiendo el patrón visual ya existente de botón con borde + fondo tenue + `hover` + `active:scale-95` (igual que "+ MONEDA").
- Migración de los literales de color hardcodeados que hoy bypasean los tokens de `@theme inline` en los componentes de "chrome" (por ejemplo `bg-[rgba(8,8,13,.9)]` en el `<nav>` de `NavBar`) hacia esos tokens (existentes o nuevos si hace falta alguno), para que efectivamente respondan al cambio de tema. Alcance de archivos a revisar: `components/nav-bar.tsx`, `components/site-chrome.tsx`, `components/crt-frame.tsx`, `components/game-card.tsx`, `components/game-cover.tsx`, `components/score-board.tsx`, y las páginas/`*-client.tsx` de `/`, `/games`, `/game/[id]`, `/hall-of-fame`, `/about`, `/auth`.

**Out of scope (para specs futuros):**

- Adaptar los colores que dibujan en canvas los motores `components/games/asteroids/engine.ts` y `components/games/bloques/engine.ts`: siguen dibujando con sus colores fijos actuales sin importar el tema del sitio, en `/play/asteroides` y `/play/bloques` por igual.
- Atenuar, apagar o rediseñar los efectos CRT fijos (scanlines, resplandor/glow, rejilla animada) de `CrtFrame`/`SiteChrome` para modo claro: se mantienen visualmente idénticos en ambos temas.
- Definir aquí los valores hex finales de `--magenta`, `--amarillo` en modo claro y de los 6 gradientes de carátula (sin equivalente en el Tetris original): se deciden en `/spec-impl` invocando `/frontend-design`. (`--background`, `--foreground`, `--cian`, `--texto-tenue`, `--texto-debil` y `--linea` sí quedan fijados en este spec, sección 2.)
- Adoptar la paleta oscura del Tetris original (`--accent: #7aa2f7` azul, fondos grises) para el tema oscuro de Arcade Vault: el oscuro del sitio conserva su identidad neón cian/magenta/amarillo ya establecida, sin cambios.
- Un tercer estado "seguir sistema" seleccionable en la UI: solo existen dos temas (oscuro/claro); el sistema únicamente decide el valor inicial cuando no hay elección guardada.
- Sincronizar el tema en tiempo real entre pestañas abiertas del mismo navegador (evento `storage`).
- Adoptar `next-themes` u otra librería de temas: se usa el mismo patrón de Context ya establecido por `SessionProvider`/`CreditsProvider`.
- Adaptar cualquier otro juego pendiente del catálogo (rompemuros, serpiente, invasores, laberinto) — no tienen motor real todavía, ajenos a este spec.
- Cambiar tipografía, animaciones de entrada (`av-fade`, `av-row`, etc.) o cualquier comportamiento no relacionado con color.
- Cambiar la economía de créditos, la sesión simulada, o cualquier dato de Supabase.

---

## 3 — Modelo de datos

Este feature no introduce ninguna tabla ni cambio en Supabase. Introduce el contrato del nuevo contexto de cliente:

```ts
// contexts/theme-context.tsx
export type Theme = "dark" | "light";

export interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

export function ThemeProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element;
export function useTheme(): ThemeContextValue;

export const THEME_STORAGE_KEY = "arcadevault.theme.v1"; // localStorage: "dark" | "light"
```

El estado vive en `document.documentElement.dataset.theme` (fuente de verdad para CSS, seteada antes de hidratar por el script inline de `app/layout.tsx`) y se espeja en `localStorage` + el estado de React de `ThemeProvider` para que los componentes puedan leerlo con `useTheme()`.

---

## 4 — Plan de implementación

1. **Script anti-flash (`app/layout.tsx`).** Agregar un `<script>` inline que se ejecuta antes de hidratar React: lee `localStorage.getItem(THEME_STORAGE_KEY)`; si no hay valor, usa `window.matchMedia("(prefers-color-scheme: light)").matches` para decidir; aplica el resultado de inmediato como `document.documentElement.dataset.theme`. Verificación manual: con el sistema operativo en modo claro y sin visitas previas, recargar cualquier página y confirmar que no hay parpadeo del tema oscuro antes de pintar.
2. **`contexts/theme-context.tsx`.** Implementar `ThemeProvider`/`useTheme` según la sección 3: en el montaje, lee `document.documentElement.dataset.theme` (ya seteado por el paso 1) como estado inicial; `toggleTheme()` invierte el valor, lo escribe en `document.documentElement.dataset.theme` y en `localStorage` bajo `THEME_STORAGE_KEY`. Montar `ThemeProvider` en `contexts/providers.tsx`. Verificación: `npx tsc --noEmit` sin errores en el archivo nuevo.
3. **Tokens de tema claro (`app/globals.css`).** Reemplazar el bloque no-op `@media (prefers-color-scheme: dark)` por `:root[data-theme="light"] { ... }` con los seis valores ya fijados en la sección 2 (`--background: #eef0f7`, `--foreground: #23243a`, `--cian: #3b5bdb`, `--texto-tenue: #7c7f99`, `--texto-debil: #5a5c72`, `--linea: rgba(59, 91, 219, 0.28)`, tomados de `references/started-games/03-tetris/style.css`); definir `--magenta` y `--amarillo` claros invocando `/frontend-design` en este mismo paso, y agregar las variantes claras de los 6 gradientes `.cover-*` (también vía `/frontend-design`, sin equivalente en el Tetris original). Verificación manual: forzar `data-theme="light"` en DevTools y confirmar que cambian fondo/texto/acentos/carátulas en toda la app.
4. **Botón de interruptor en `NavBar`.** Agregar `lucide-react` (`npm install lucide-react`). Agregar el botón con ícono `Sun`/`Moon` en la navegación ancha y en el panel lateral móvil, usando `useTheme()`, con el mismo patrón visual de botón ya usado en `NavBar` (borde + fondo tenue + hover + `active:scale-95`). Verificación manual: click alterna el tema y persiste tras recargar la página.
5. **Migrar literales de color hardcodeados del "chrome".** Revisar los archivos listados en la sección 2 y reemplazar colores escritos como literales (p. ej. `bg-[rgba(8,8,13,.9)]`) por los tokens de `@theme inline` (existentes o uno nuevo si hace falta). No se toca `CrtFrame` en lo referido a scanlines/glow/rejilla, ni ningún `engine.ts` de juego. Verificación manual: recorrer `/`, `/games`, `/game/[id]`, `/hall-of-fame`, `/about`, `/auth`, `/play/asteroides`, `/play/bloques` en ambos temas, confirmando que ningún fondo o texto de la "chrome" queda "atascado" en el tema anterior (salvo canvas de juego y efectos CRT, deliberadamente sin cambios).
6. **Remate.** `npm run build` y `npm run lint` sin errores ni warnings nuevos. Confirmar que el interruptor funciona igual en desktop y mobile (breakpoint 1000px de `useMediaQuery`), que recargar conserva el tema elegido, y que un usuario sin `localStorage` previo ve el tema que coincide con la preferencia de su sistema. Si `next dev` regeneró el bloque `<!-- BEGIN:nextjs-agent-rules -->` de `AGENTS.md`, commitearlo.

---

## 5 — Criterios de aceptación

- [ ] Hay un botón de tema (ícono sol/luna de `lucide-react`) visible en la navegación ancha y en el panel lateral móvil.
- [ ] Sin elección previa, el tema inicial de la app coincide con `prefers-color-scheme` del sistema operativo/navegador.
- [ ] Al hacer clic en el botón, el tema cambia de inmediato en toda la "chrome" del sitio (nav, fondos, tarjetas de juego, carátulas del catálogo, texto, tablero de puntuaciones) en `/`, `/games`, `/game/[id]`, `/hall-of-fame`, `/about` y `/auth`.
- [ ] La elección se persiste en `localStorage` bajo `arcadevault.theme.v1` y sobrevive a recargar la página y a cerrar/reabrir el navegador.
- [ ] Tras una elección manual, esa elección persiste sin importar cambios posteriores en la preferencia del sistema operativo.
- [ ] No hay parpadeo visible del tema no elegido al cargar cualquier página.
- [ ] Los 6 gradientes `.cover-*` del catálogo se ven adaptados (no idénticos al modo oscuro) cuando el tema es claro.
- [ ] Los canvas de `/play/asteroides` y `/play/bloques` dibujan exactamente los mismos colores en ambos temas del sitio, sin cambios en ninguno de los dos `engine.ts`.
- [ ] Los efectos CRT de `CrtFrame` (scanlines, glow, rejilla animada) se ven visualmente idénticos en ambos temas.
- [ ] `npm run build` y `npm run lint` terminan sin errores ni warnings nuevos.

---

## 6 — Decisiones tomadas y descartadas

- **Sí:** alcance global — el interruptor cambia la "chrome" de todo el sitio, no solo un juego. Motivo: decisión explícita del usuario, frente a portar el `tetris-theme` original solo dentro de `/play/bloques` o extenderlo también a los canvas de los juegos.
- **No:** tocar los canvas de `engine.ts` de Asteroides y Bloques. Motivo: decisión explícita del usuario — evita reabrir los specs 06/08 ya implementados; los motores siguen dibujando con sus colores fijos actuales.
- **No:** adaptar los efectos CRT (scanlines/glow/rejilla) para modo claro. Motivo: decisión explícita del usuario — se mantienen idénticos en ambos temas, más simple y evita rediseñar esos efectos en este spec.
- **Sí:** el control vive en `NavBar`, visible siempre (desktop y mobile). Motivo: decisión explícita del usuario — no existe todavía una página de ajustes, y la barra de navegación es el único elemento presente en todas las rutas.
- **Sí:** tema inicial según `prefers-color-scheme` del sistema; `localStorage` solo se usa una vez que el usuario elige manualmente. Motivo: decisión explícita del usuario — mejor experiencia por defecto que forzar siempre oscuro, con la elección manual ganando sobre el sistema.
- **Sí:** clave `arcadevault.theme.v1` en `localStorage`, con sufijo de versión igual que la convención ya usada por `arcadevault.scores.v1` en specs anteriores (aunque ese storage ya no exista, se conserva el estilo de nombre).
- **Sí:** agregar `lucide-react` como dependencia nueva para los íconos `Sun`/`Moon`. Motivo: decisión explícita del usuario, en vez de dibujar un SVG a mano o usar solo texto.
- **Sí:** los 6 gradientes de carátula (`.cover-*`) también se adaptan al tema claro. Motivo: decisión explícita del usuario — son parte visible del catálogo, no deben quedar "atascados" en un gradiente pensado para fondo oscuro.
- **Sí:** reutilizar tal cual los valores hex de la paleta clara del Tetris original (`references/started-games/03-tetris/style.css`) para `--background`, `--foreground`, `--cian`, `--texto-tenue`, `--texto-debil` (y derivar `--linea` de ese mismo `--cian` con la misma opacidad que ya usa el modo oscuro). Motivo: decisión explícita del usuario, en vez de dejar toda la paleta clara pendiente de `/frontend-design`.
- **No:** adoptar la paleta oscura del Tetris original (acento azul `#7aa2f7`) para el tema oscuro de Arcade Vault. Motivo: decisión explícita del usuario — el oscuro del sitio ya tiene una identidad neón (cian/magenta/amarillo) establecida desde el spec 01; solo se reutiliza la paleta _clara_ del Tetris.
- **No:** fijar en este spec los valores hex de `--magenta`, `--amarillo` en modo claro ni de los 6 gradientes de carátula. Motivo: el Tetris original es un diseño de un solo acento (no tiene tres colores neón ni carátulas de catálogo) — no hay valor "original" que reutilizar para estos; se deciden en `/spec-impl` invocando `/frontend-design`, como pide `CLAUDE.md` para toda interfaz de usuario.
- **No:** usar `next-themes` u otra librería de manejo de temas. Motivo: coherencia con el patrón de Context ya usado por `SessionProvider`/`CreditsProvider`; no hay necesidad de una dependencia adicional para el propio mecanismo del toggle (solo para los íconos).
- **No:** un tercer estado "seguir sistema" seleccionable en la UI. Motivo: mantiene el interruptor simple (dos estados); el sistema solo decide el valor inicial implícito.

---

## 7 — Riesgos identificados

| Riesgo                                                                                                                                                                                                                                                                                                      | Mitigación                                                                                                                                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Migrar literales de color hardcodeados dispersos en varios componentes (paso 5) es fácil de dejar incompleto, con algún fondo o texto que no responda al cambio de tema.                                                                                                                                    | El paso 5 enumera explícitamente los archivos a revisar, y el criterio de aceptación exige recorrer manualmente cada página en ambos temas antes de dar el spec por terminado.                                                         |
| El script inline que fija `data-theme` en `<html>` antes de hidratar podría generar una advertencia de hidratación de React si el atributo difiere entre servidor y cliente.                                                                                                                                | El atributo se aplica solo en el cliente, antes de que React hidrate, y no es un atributo que React renderice o controle desde el servidor — patrón estándar para toggles de tema en Next.js sin `next-themes`, sin mismatch esperado. |
| `lucide-react` es la primera dependencia de íconos del proyecto; agrega peso al bundle aunque sea mínimo vía tree-shaking.                                                                                                                                                                                  | Aceptado como decisión explícita del usuario (sección 6).                                                                                                                                                                              |
| `--magenta`, `--amarillo` claros y los 6 gradientes de carátula quedan sin valor fijo en este documento (sin equivalente en el Tetris original); si `/spec-impl` no invoca `/frontend-design` como se pide, podrían implementarse con colores improvisados que no combinen con los cinco tokens ya fijados. | El plan de implementación (paso 3) deja explícito que ese paso invoca `/frontend-design` para esos tokens puntuales, y `CLAUDE.md` ya exige ese skill para toda interfaz de usuario del proyecto.                                      |

---

## Lo que **no** entra en este spec

- Colores de dibujo en los canvas de Asteroides y Bloques (`engine.ts` de ambos).
- Adaptación de los efectos CRT (scanlines, glow, rejilla animada) para modo claro.
- Valores hex finales de `--magenta`, `--amarillo` en modo claro y de los 6 gradientes de carátula (se deciden en `/spec-impl`; el resto de la paleta clara ya queda fijado en este spec, tomado del Tetris original).
- Adoptar la paleta oscura del Tetris original para el tema oscuro de Arcade Vault (conserva su identidad neón actual).
- Un tercer estado "seguir sistema" en la UI.
- Sincronización del tema entre pestañas abiertas.
- Adopción de `next-themes` u otra librería de temas.
- Adaptar cualquier otro juego pendiente del catálogo (rompemuros, serpiente, invasores, laberinto).
- Cambios a tipografía, animaciones de entrada, economía de créditos, sesión simulada o datos de Supabase.

Cada uno de estos, si se aborda, va en su propio spec.
