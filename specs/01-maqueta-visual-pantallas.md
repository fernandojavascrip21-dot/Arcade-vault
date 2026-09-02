# SPEC 01 — Maqueta visual de las pantallas de Arcade Vault

> **Status:** Aprovado
> **Depends on:** —
> **Date:** 2026-09-01
> **Objective:** Construir la maqueta visual navegable de las cinco pantallas de Arcade Vault (biblioteca, ficha de juego, sala de juego, autenticación y salón de la fama) en Next.js 16 con sesión, créditos y puntuaciones simulados en el cliente, sin implementar ningún juego.

---

## 1 — Por qué existe este spec

El repo es un scaffold de `create-next-app` sin código de aplicación. En `references/resource/project` hay una maqueta de Design Canvas (`*.dc.html` + `av-*.js`) que define la estética retro-arcade y las cinco pantallas del producto. Este spec traslada esa maqueta a la arquitectura real del proyecto (App Router, Tailwind v4, `next/font`) para tener una base visual navegable sobre la que después se enchufarán los juegos y un backend real.

El Design Canvas usa un runtime propio (`support.js`, etiquetas `<x-dc>`, `<sc-if>`, `<dc-import>`) que **no** se porta: es solo la referencia visual y de comportamiento.

---

## 2 — Scope

**In:**

- Cinco rutas reales del App Router:
  - `/` — Biblioteca (catálogo de juegos, búsqueda y filtro por categoría).
  - `/juego/[id]` — Ficha del juego (previsualización, descripción, mejores puntuaciones).
  - `/jugar/[id]` — Sala de juego (HUD, marco CRT con placeholder, pausa, fin de partida).
  - `/auth` — Autenticación (iniciar sesión / crear cuenta / jugar como invitado, todo simulado).
  - `/salon-fama` — Salón de la Fama (top 10 por juego).
- Layout compartido con la "chrome" del contenedor: fondo de rejilla animada, resplandor, scanlines, barra de navegación (con créditos e "+ MONEDA"), footer y menú lateral móvil.
- Navegación responsive idéntica a la maqueta: navegación completa a partir de 1000 px de ancho; por debajo, chip de créditos + botón hamburguesa que abre un panel lateral.
- Estado global de cliente en memoria: sesión (usuario autenticado / invitado / sin sesión) y créditos (arrancan en 3, `+ MONEDA` suma, jugar consume uno).
- Puntuaciones persistidas en `localStorage` bajo la clave `arcadevault.scores.v1`, combinadas con rankings semilla para calcular top 10, mejor marca y "TU MEJOR MARCA".
- Catálogo de 6 juegos y rankings semilla portados de `av-data.js` a `app/data.ts`, el módulo único de datos ficticios que más adelante sustituirá una base de datos.
- En la sala de juego, un botón **"SIMULAR FIN DE PARTIDA"** que dispara el modal de fin de partida con una puntuación pseudoaleatoria, para poder recorrer el flujo de guardar puntuación y "jugar de nuevo".
- Estilo con Tailwind CSS v4: se **amplía** `app/globals.css` (se conserva todo su contenido actual y se le añaden los tokens de tema y los `@keyframes` de la maqueta) y se usan las fuentes `Press Start 2P` + `Courier Prime` vía `next/font/google`.
- Metadatos de la app actualizados (`title`, `description`, `lang="es"`) y una página `not-found` con la estética del proyecto.

**Out of scope (para specs futuros):**

- Cualquier juego jugable y el motor `av-engine.js` (Breakout, Demo, física, canvas real).
- Backend real: API REST, Supabase, base de datos, ranking global compartido.
- OAuth real de Google / GitHub (los botones sociales hacen el mismo "login demo").
- Registro funcional: el tab "Crear cuenta" es visual, no crea usuarios ni valida email/contraseña.
- Persistencia de la sesión y de los créditos entre recargas (solo viven en memoria, como en la maqueta).
- Selector de dificultad operativo y toggle de scanlines (la dificultad se muestra fija; las scanlines van siempre activas).
- Sincronización de puntuaciones de cuentas autenticadas (solo se usa `localStorage`).
- Tests automatizados (no hay runner configurado en el repo).

---

## 3 — Modelo de datos

Se portan `av-data.js` y `av-scores.js` a TypeScript. No hay estructuras nuevas más allá de tipar lo que ya existe en la maqueta.

```ts
// lib/types.ts
export type CategoryLabel = "Todos" | "Acción" | "Clásico" | "Espacio" | "Puzzle";

export interface Game {
  id: string;          // "rompemuros", "serpiente", ...
  title: string;       // "ROMPEMUROS"
  category: Exclude<CategoryLabel, "Todos">;
  desc: string;        // frase corta para la tarjeta
  long: string;        // descripción larga para la ficha
  thumb: string;       // gradiente CSS de la carátula
}

export interface ScoreEntry {
  name: string;
  score: number;
  date: string;        // "DD/MM/AAAA"
}

// Fila ya resuelta para pintar rankings
export interface BoardRow extends ScoreEntry {
  mine: boolean;       // procede de localStorage (partida local)
}
```

```ts
// app/data.ts  — datos ficticios, portados de av-data.js.
// Único punto que en el futuro se reemplazará por llamadas a la base de datos.
export const CATEGORIES: CategoryLabel[] = ["Todos", "Acción", "Clásico", "Espacio", "Puzzle"];
export const GAMES: Game[] = [ /* los 6 juegos de av-data.js, textos y gradientes idénticos */ ];
export const SEED: Record<string, [string, number][]> = { /* rankings semilla de av-data.js */ };
export function byId(id: string): Game | undefined;   // undefined => la ruta llama notFound()
```

```ts
// lib/scores.ts  — persistencia y cálculo, portado de av-scores.js.
// Importa SEED desde app/data.ts; solo añade el estado local de localStorage.
export const SCORES_KEY = "arcadevault.scores.v1";
export type StoredScores = Record<string, ScoreEntry[]>;

export function load(): StoredScores;                                   // lee localStorage, {} si falla
export function add(stored: StoredScores, gameId: string, name: string, score: number): StoredScores;
export function board(stored: StoredScores, gameId: string): BoardRow[]; // semilla + locales, orden desc, top 10
export function best(stored: StoredScores, gameId: string): string;      // "48.720" o "—"
export function rankColor(index: number): string;                        // oro / plata / bronce / gris
export function fmtDate(d: Date): string;                                // "DD/MM/AAAA"
```

**Convenciones:**

- Las fechas de la semilla se generan igual que en `av-scores.js`: `new Date(2026, 7, 28 - i * 3)`.
- Los números se formatean con `Number.prototype.toLocaleString("es-ES")`.
- El nombre de jugador se normaliza a mayúsculas y se recorta a 14 caracteres (como `AV Auth`).
- `localStorage` solo se toca en el cliente (dentro de `useEffect` o handlers), nunca durante el render en servidor.

**Estado global (React Context, en memoria):**

```ts
// contexts/session-context.tsx
interface SessionValue {
  user: string | null;      // nombre en mayúsculas, o null
  isGuest: boolean;         // true tras "jugar como invitado"
  login(name: string): void;
  playGuest(): void;
  logout(): void;
}

// contexts/credits-context.tsx
interface CreditsValue {
  credits: number;          // arranca en 3, tope 99
  coinMsg: string;          // texto del aviso flotante, "" si oculto
  insertCoin(): void;       // +1 y aviso "MONEDA ACEPTADA"
  spendCredit(): boolean;   // -1 y true; si credits === 0 => aviso "INSERTA UNA MONEDA" y false
}
```

---

## 4 — Plan de implementación

1. **Tema base y fuentes.** Ampliar `app/globals.css` **sin eliminar nada de lo que ya contiene**: se conserva el `@import "tailwindcss"`, el patrón de tokens `--background` / `--foreground`, el bloque `@theme inline`, la media query de tema y la regla `body`. Todos esos estilos globales se siguen usando; solo se ajustan sus **valores** a la maqueta (`--background: #0a0a0f`, `--foreground: #cdd8de`, `body` con `Courier Prime`) y se **añaden** al mismo archivo: tokens de acento neón (`--color-cian: #00f5ff`, `--color-magenta: #ff006e`, `--color-amarillo: #f5ff00` y los grises de texto) dentro de `@theme inline`, las variables de fuente arcade y los `@keyframes` de la maqueta (`av-flicker`, `av-grid`, `av-pulse`, `av-row`, `av-fade`, `av-caret`). En `app/layout.tsx`: cargar `Press Start 2P` y `Courier Prime` con `next/font/google` como variables CSS (sustituyen a Geist en las variables `--font-*`), poner `lang="es"`, actualizar `metadata` (`title: "Arcade Vault"`, `description`). Dejar `app/page.tsx` con un placeholder mínimo. Verificación: `npm run build` pasa, `/` carga con el fondo oscuro y las fuentes, y las clases utilitarias de Tailwind resuelven contra los tokens de `globals.css`.

2. **Capa de datos.** Crear `lib/types.ts`, `app/data.ts` (portar `av-data.js`: 6 juegos, `SEED`, `CATEGORIES`, `byId`; es el archivo único de datos ficticios que luego reemplazará la BD) y `lib/scores.ts` (portar `av-scores.js`: `load`, `add`, `board`, `best`, `rankColor`, `fmtDate`; importa `SEED` desde `app/data.ts`). Módulos puros, sin JSX. Verificación: `npx tsc --noEmit` sin errores.

3. **Contextos de estado.** Crear `contexts/session-context.tsx` y `contexts/credits-context.tsx` (ambos `"use client"`, estado en memoria) y `contexts/scores-context.tsx` (carga `load()` en `useEffect`, expone `stored` y `saveScore(gameId, score)` que llama a `add` y re-renderiza). Montar los tres providers envolviendo `children` en `app/layout.tsx`. Verificación: un componente de prueba puede leer `credits === 3`.

4. **Chrome del sitio.** `components/site-chrome.tsx` (`"use client"`): capas fijas de rejilla animada, resplandor y scanlines; `<footer>` con el texto "ARCADE VAULT · 1986–2026 · INSERTA MONEDA"; aviso flotante de moneda (`coinMsg`). `components/nav-bar.tsx`: logo `ARCADE<span>VAULT</span>` que va a `/`, bloque de créditos + botón "+ MONEDA", enlaces "Biblioteca" (`/`) y "Salón de la Fama" (`/salon-fama`) con subrayado activo según `usePathname()`, bloque de sesión (iniciales + nombre + "Salir" si hay `user`; botón "INICIAR SESIÓN" si no). Variante estrecha (<1000 px vía `matchMedia`/`resize`): chip de créditos + hamburguesa que abre panel lateral con los enlaces. Integrar en el layout alrededor de `children`. Verificación: la nav aparece en las cinco rutas, "+ MONEDA" incrementa el contador y muestra el aviso, el menú móvil abre y cierra.

5. **Biblioteca (`app/page.tsx`).** Componente cliente. Cabecera: título `ARCADE / VAULT` con `av-flicker`, subtítulo, input de búsqueda (estado local) y fila de filtros de categoría (`CATEGORIES`). Grid `repeat(auto-fill, minmax(268px, 1fr))` de `components/game-card.tsx` (carátula con gradiente `game.thumb`, badge de categoría, título, `desc`, "Mejor puntuación" = `best(stored, id)`, botón "JUGAR"); toda la tarjeta enlaza a `/juego/[id]`. Estado "NINGÚN JUEGO COINCIDE CON LA BÚSQUEDA" cuando el filtro no devuelve nada. Verificación: buscar "serpiente" deja una tarjeta; filtrar por "Espacio" deja dos; limpiar restaura seis.

6. **Ficha del juego (`app/juego/[id]/page.tsx`).** `params` es una `Promise` (Next 16): resolver el `id`, `byId(id)`, si no existe llamar `notFound()`. Layout de dos columnas: izquierda `components/crt-frame.tsx` (marco CRT con gradiente `game.thumb` estático + etiqueta "PREVISUALIZACIÓN", sin canvas), título, badges de categoría y "MEJOR: …", descripción larga, botones "JUGAR AHORA" y "VOLVER AL VAULT"; derecha `components/score-board.tsx` con las 10 mejores marcas (`board(stored, id)`). "JUGAR AHORA" llama a `spendCredit()`: si `false`, se queda (el aviso ya lo muestra el contexto); si `true`, `router.push('/jugar/' + id)`. Verificación: con créditos > 0, "JUGAR AHORA" navega a la sala y descuenta uno; con créditos en 0, muestra "INSERTA UNA MONEDA" y no navega.

7. **Sala de juego (`app/jugar/[id]/page.tsx`).** Componente cliente; resolver `id` igual que en la ficha. Barra HUD: PUNTUACIÓN, VIDAS (`♥♥♥`), NIVEL (`01`), JUGADOR (`user` o `INVITADO`), botones "PAUSA" y "SALIR". Marco CRT (reutiliza `crt-frame`) con placeholder estático y el texto "MUEVE CON EL RATÓN O ← →" / "ARCADE VAULT CRT-19"; overlay "EN PAUSA" cuando `paused`. Botón "SIMULAR FIN DE PARTIDA" bajo el marco: fija una puntuación pseudoaleatoria y abre el modal de fin de partida (overlay fijo) con "PUNTUACIÓN FINAL", botón "GUARDAR PUNTUACIÓN" (llama a `saveScore`, luego efecto máquina de escribir "PUNTUACIÓN GUARDADA" con `av-caret`), nota de modo invitado si `isGuest`, y botones "JUGAR DE NUEVO" (consume un crédito vía `spendCredit`; si `false`, no reinicia) y "VOLVER AL VAULT" (`router.push('/')`). "SALIR" vuelve a `/`. Verificación: simular fin de partida → guardar → el modal muestra el mensaje tecleado; "JUGAR DE NUEVO" sin créditos no reinicia.

8. **Autenticación (`app/auth/page.tsx`).** Componente cliente. Tarjeta centrada: logo, tabs "INICIAR SESIÓN" / "CREAR CUENTA" (el tab activo cambia el color y el texto del botón; en "CREAR CUENTA" aparece el campo "Correo electrónico"). Campos Usuario / Correo / Contraseña (solo Usuario tiene estado real). Botón principal ("ENTRAR AL VAULT" / "CREAR CUENTA"): normaliza el usuario (mayúsculas, 14 caracteres, por defecto "JUGADOR_01"), llama a `login(name)` y `router.push('/')`. "Jugar como invitado" llama a `playGuest()` y `router.push('/')`. Botones "Google" y "GitHub" hacen lo mismo que el botón principal. Nota "// Demo local…". Verificación: introducir "neonkid" y entrar deja "NEONKID" en la nav con avatar "N"; "Salir" limpia la sesión.

9. **Salón de la Fama (`app/salon-fama/page.tsx`).** Componente cliente. Lee `searchParams` (`Promise` en Next 16) para un `?game=` opcional; por defecto el primer juego. Título "SALÓN DE LA FAMA", fila de tabs con los 6 juegos (`GAMES`), tabla con columnas RANGO / JUGADOR / PUNTUACIÓN / FECHA a partir de `board(stored, tab)`, top 10, con `rankColor` para las tres primeras y badge "TU MEJOR MARCA" + fondo resaltado en las filas `mine` cuyo `name` coincide con `user ?? "INVITADO"`. Scroll horizontal en pantallas estrechas. Nota "// Puntuaciones de invitado en localStorage…". Verificación: una puntuación guardada en el paso 7 aparece en la pestaña del juego correspondiente con el badge "TU MEJOR MARCA".

10. **Remate.** `app/not-found.tsx` con la estética del proyecto y enlace a `/`. Revisar `matchMedia`/listeners con limpieza en `useEffect`, `overflow-x` controlado en tablas y grids, y que `npm run build` y `npm run lint` pasen limpios. Confirmar que el bloque `<!-- BEGIN:nextjs-agent-rules -->` de `AGENTS.md` (si `next dev` lo regenera) se commitea junto al trabajo.

---

## 5 — Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores ni warnings nuevos.
- [ ] Existen y renderizan sin error en consola las rutas `/`, `/juego/rompemuros`, `/jugar/rompemuros`, `/auth` y `/salon-fama`.
- [ ] `/juego/no-existe` y `/jugar/no-existe` muestran la página `not-found`.
- [ ] La barra de navegación, el fondo de rejilla, el resplandor, las scanlines y el footer aparecen en las cinco rutas.
- [ ] Pulsar "+ MONEDA" incrementa el contador de créditos en 1 (tope 99) y muestra el aviso "MONEDA ACEPTADA" que desaparece solo.
- [ ] Con el ancho de ventana por debajo de 1000 px, la nav muestra el chip de créditos y el botón hamburguesa; al pulsarlo se abre un panel lateral con "Biblioteca", "Salón de la Fama" e "Iniciar Sesión".
- [ ] En la biblioteca, escribir "serpiente" en el buscador deja exactamente una tarjeta; el filtro "Espacio" deja exactamente dos; el filtro "Puzzle" con un texto que no casa muestra "NINGÚN JUEGO COINCIDE CON LA BÚSQUEDA".
- [ ] Cada tarjeta de la biblioteca navega a `/juego/[id]` del juego correspondiente.
- [ ] En la ficha, "MEJOR: …" y la tabla lateral coinciden con `board()` para ese juego.
- [ ] Con créditos > 0, "JUGAR AHORA" navega a `/jugar/[id]` y el contador de créditos baja en 1.
- [ ] Con créditos en 0, "JUGAR AHORA" muestra "INSERTA UNA MONEDA" y no cambia de ruta.
- [ ] En la sala de juego, "PAUSA" muestra el overlay "EN PAUSA" y cambia su etiqueta a "SEGUIR".
- [ ] "SIMULAR FIN DE PARTIDA" abre el modal con una puntuación final numérica.
- [ ] En el modal, "GUARDAR PUNTUACIÓN" oculta el botón y muestra "PUNTUACIÓN GUARDADA" con efecto de tecleo.
- [ ] Tras guardar, la puntuación aparece en `/salon-fama` (pestaña de ese juego) y, si su `name` coincide con la sesión, con el badge "TU MEJOR MARCA".
- [ ] La puntuación guardada persiste tras recargar la página (sigue en `localStorage` bajo `arcadevault.scores.v1`).
- [ ] "JUGAR DE NUEVO" en el modal consume un crédito; si no hay créditos, no reinicia y muestra el aviso.
- [ ] En `/auth`, enviar el formulario con usuario "neonkid" deja "NEONKID" y el avatar "N" en la nav y redirige a `/`.
- [ ] "Jugar como invitado" redirige a `/` y la nav sigue mostrando "INICIAR SESIÓN" (sesión de invitado, sin nombre).
- [ ] "Salir" en la nav limpia el nombre de usuario.
- [ ] Los créditos y la sesión vuelven a su estado inicial (3 créditos, sin usuario) tras recargar la página.
- [ ] Ninguna página lee `localStorage`, `window` o `matchMedia` durante el render en servidor.

---

## 6 — Decisiones tomadas y descartadas

- **Sí:** rutas reales del App Router en vez de un único componente con `screen` en estado. URLs compartibles y patrón idiomático de Next 16; la chrome vive en un layout compartido.
- **No:** replicar el contenedor `Arcade Vault.dc.html` como página única de cliente. Solo tendría sentido para clonar el runtime del Design Canvas, que no se porta.
- **Sí:** Tailwind v4 con tokens en `@theme inline` y `@keyframes` en `app/globals.css`, y fuentes vía `next/font/google`. Es lo que impone `CLAUDE.md`; evita `<link>` a Google Fonts y FOUT.
- **Sí:** ampliar `app/globals.css` conservando todo su contenido actual (patrón de tokens, `@theme inline`, media query de tema, regla `body`); solo se ajustan valores y se añaden reglas. Todos los estilos globales del archivo siguen en uso.
- **No:** reescribir `app/globals.css` desde cero ni mantener un sistema de estilos global paralelo. `globals.css` sigue siendo el único sitio de configuración global.
- **No:** portar los `style="…"` inline de la maqueta tal cual. Quedaría fuera de las convenciones del repo y sería más difícil de mantener.
- **Sí:** sesión y créditos en memoria (React Context), puntuaciones en `localStorage`. Es exactamente el comportamiento de la maqueta (`credits: 3` fijo al montar, `AVScores` sobre `localStorage`).
- **No:** persistir sesión/créditos entre recargas. La maqueta no lo hace y añadiría un modelo de "cuenta" que está fuera de alcance.
- **Sí:** botón "SIMULAR FIN DE PARTIDA" en la sala de juego. Sin motor no hay forma de llegar al modal de fin de partida ni al flujo de guardado, que sí son parte de la maqueta.
- **No:** HUD con contadores animados falsos. Da impresión de juego real y no aporta a una maqueta visual; el HUD se muestra estático hasta la simulación.
- **Sí:** previsualización de la ficha y de la sala como marco CRT con el gradiente `thumb` estático. Coherente con "sin juegos" y reutiliza un dato que ya existe.
- **No:** portar `av-engine.js` (motor Breakout / `Demo`). Es un juego; va en su propio spec.
- **Sí:** los botones sociales de `/auth` ejecutan el mismo "login demo". Mantiene la pantalla completa sin introducir OAuth.
- **No:** tab "Crear cuenta" funcional con almacenamiento de cuentas en `localStorage`. El usuario lo dejó como visual sin efecto; añadir cuentas reales es otro spec.
- **Sí:** concentrar todos los datos ficticios (`GAMES`, `SEED`, `CATEGORIES`, `byId`) en un único `app/data.ts`. Deja un solo punto que sustituir cuando llegue la base de datos; `lib/scores.ts` queda solo con la lógica de persistencia/cálculo.
- **No:** repartir los datos en varios `lib/*.ts`. Dificultaría ver de un vistazo "qué será BD".
- **Sí:** `notFound()` cuando el `id` de juego no existe, en lugar del `GAMES[0]` de fallback de la maqueta. Comportamiento correcto para rutas reales.

---

## 7 — Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| `localStorage` deshabilitado (modo privado) o `JSON.parse` falla | `load()` devuelve `{}` y `add()` envuelve el `setItem` en `try/catch`; la maqueta funciona, solo no persiste. |
| Acceso a `window` / `matchMedia` / `localStorage` durante SSR provoca error de hidratación | Todo el estado de cliente vive en componentes `"use client"`; las lecturas van dentro de `useEffect` o handlers, con un valor inicial estable en el render. |
| `params` y `searchParams` son `Promise` en Next 16 y su acceso síncrono está eliminado | Las páginas de ruta dinámica los `await` (o usan `use()`); documentado en `CLAUDE.md`. |
| Añadir un `webpack`/config incompatible rompe el build con Turbopack | No se toca `next.config.ts` en este spec. |
| El bloque `<!-- BEGIN:nextjs-agent-rules -->` de `AGENTS.md` aparece como cambio sin commitear | Se commitea junto al trabajo, según `CLAUDE.md`. |

---

## Lo que **no** entra en este spec

- Ningún juego jugable ni el motor `av-engine.js`.
- Backend real, base de datos o ranking global (REST / Supabase).
- OAuth real de Google / GitHub.
- Registro de cuentas funcional y persistencia de sesión/créditos.
- Selector de dificultad operativo y toggle de scanlines.
- Tests automatizados.

Cada uno de estos, si se aborda, va en su propio spec.
