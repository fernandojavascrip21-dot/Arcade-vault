# SPEC 04 — Página About y envío de correo con Resend

> **Status:** Aprovado
> **Depends on:** SPEC 02, SPEC 03
> **Date:** 2026-09-07
> **Objective:** Crear la ruta `/about` portando exactamente la maqueta `references/resource/home-about/about.jsx` (hero + contacto), y conectar su formulario a un endpoint propio que envía el mensaje por correo real usando Resend.

---

## 1 — Por qué existe este spec

Tras el spec 03 el sitio tiene Home (`/`), Biblioteca (`/games`), ficha (`/game/[id]`), sala de juego (`/play/[id]`) y ranking (`/hall-of-fame`), todas en rutas en inglés. La pantalla "Acerca de" (`about.jsx`) fue explícitamente excluida en el spec 02 ("queda fuera explícitamente") porque no existía nav ni ruta para ella todavía. Este spec la trae: la maqueta completa (misión, highlights, separador y formulario de contacto) tal como está en `references/resource/home-about/about.jsx`, y además la hace funcional — hoy el formulario de la maqueta solo simula el envío con `setSent()` local; aquí se conecta a un endpoint propio (`app/api/contact/route.ts`) que envía el mensaje por correo real con Resend.

---

## 2 — Scope

**In:**

- Nueva ruta `app/about/page.tsx` (`/about`), componente cliente único (mismo patrón que `app/auth/page.tsx` y `app/games/page.tsx`: sin split page/componente porque no lee `params`/`searchParams`).
- Contenido portado 1:1 desde `about.jsx`, traducido a Tailwind v4 (mismo enfoque que el spec 02 con `home.jsx`: sin copiar las clases CSS crudas de la maqueta, sino recreando el mismo resultado visual con utilidades Tailwind y los tokens ya definidos en `app/globals.css`):
  - **Hero "Acerca de"**: kicker, título, párrafo de misión, y la fila de 3 "highlights" (HECHO CON ❤️, JUEGOS EN HTML, PROYECTO EN CRECIMIENTO) con sus iconos SVG pixel-art (`HighlightIcon`, portado tal cual).
  - **Separador decorativo** entre hero y contacto (franja + pixeles parpadeantes), con animación de aparición al hacer scroll usando `useReveal` (`lib/use-reveal.ts`, ya existente, mismo patrón que la Home).
  - **Sección de contacto**: columna de intro (kicker, título, subtítulo, 3 "tips") + formulario (Nombre, Correo electrónico, Mensaje) con el mismo texto y placeholders que la maqueta.
  - **Validación del formulario**: igual que la maqueta — los 3 campos son obligatorios (no vacíos tras `trim()`); si falta alguno, el formulario hace "shake" (nueva animación `av-shake` en `globals.css`) y no envía nada. `type="email"` en el input de correo añade la validación nativa del navegador, igual que en la maqueta. No se añade validación adicional (regex, longitud, etc.) — fuera de alcance.
  - **Estado de envío en curso**: nuevo respecto a la maqueta (que no llamaba a ningún backend). Mientras la petición a `/api/contact` está en curso, el botón se deshabilita y cambia su texto a "ENVIANDO...".
  - **Estado de éxito**: el bloque "terminal" de la maqueta (`terminal-success`), mostrado solo cuando el endpoint responde OK. Incluye el botón "ENVIAR OTRO MENSAJE" que limpia el formulario, igual que la maqueta.
  - **Estado de error** (nuevo, no existe en la maqueta): si el endpoint responde con error o la petición de red falla, se muestra un mensaje de error en línea dentro del formulario (mismo estilo visual que el resto del sitio, ver componente `AuthPage`/`NavBar` para el tono), los datos escritos se conservan y el usuario puede reintentar sin volver a escribir todo.
- Endpoint `app/api/contact/route.ts` (Route Handler, `POST`):
  - Recibe `{ name, email, msg }` en JSON.
  - Valida en servidor que los tres campos existan y no estén vacíos (defensa básica; la validación "de verdad" para el usuario ya ocurre en el cliente).
  - Envía el correo con el SDK oficial `resend` (paquete nuevo en `package.json`), usando `RESEND_API_KEY` (variable de entorno, servidor únicamente).
  - `from`: `onboarding@resend.dev` (remitente de pruebas de Resend — el usuario ya tiene cuenta y `RESEND_API_KEY`, pero sigue en el sandbox sin dominio verificado; ver sección 6).
  - `to`: `process.env.CONTACT_TO_EMAIL` (variable de entorno; valor real conocido: `luisbboy211@gmail.com` — ver sección 6).
  - `reply_to`: el correo que escribió el visitante en el formulario, para poder responder directo.
  - `subject`: `Nuevo mensaje de contacto — Arcade Vault (${name})`.
  - Cuerpo de texto plano con nombre, correo y mensaje.
  - Devuelve `{ ok: true }` (200) en éxito, o `{ ok: false, error }` (500 o 400 según el caso) si falla la validación o la llamada a Resend lanza error. Nunca deja una excepción sin capturar.
- `components/nav-bar.tsx`: nuevo enlace "Acerca de" → `/about`, en la versión de escritorio y en el panel móvil, resaltado activo cuando `pathname === "/about"`. Se llena el hueco que el spec 02 dejó explícitamente abierto.
- `app/globals.css`: nueva animación `av-shake` (+ token `--animate-shake`) para el shake de validación del formulario, siguiendo el mismo patrón que las animaciones `av-*` ya existentes.
- `package.json` / `package-lock.json`: se agrega la dependencia `resend`.
- `.env.example` (nuevo, sí se commitea): documenta `RESEND_API_KEY=` y `CONTACT_TO_EMAIL=` (claves vacías, sin valores reales) con un comentario explicando el límite del sandbox de Resend (ver sección 6).
- `.env.local` (nuevo, ya ignorado por `.gitignore` vía `.env*`, nunca se commitea): `CONTACT_TO_EMAIL=luisbboy211@gmail.com` ya con el valor real; `RESEND_API_KEY=` la completa el propio usuario pegando su clave real directamente en ese archivo (no se transcribe la clave en el spec ni en ningún archivo commiteado).

**Out of scope (para specs futuros):**

- Cualquier lógica de anti-spam (honeypot, rate limiting, captcha). No se pidió y no hay indicios de abuso todavía.
- Validación de formato de correo más allá de `type="email"` (regex propia, verificación de dominio, etc.).
- Dominio verificado en Resend y remitente propio (`contacto@tu-dominio.com`): mientras no exista, se usa el sandbox `onboarding@resend.dev`, que **solo entrega al correo con el que el usuario se registró en Resend**, sin importar qué `CONTACT_TO_EMAIL` se configure (ver riesgo en sección 7 sobre `luisbboy211@gmail.com`). Corregirlo es tan simple como cambiar el `from` una vez haya dominio verificado; no se resuelve en este spec porque no es indispensable para tenerlo funcionando hoy.
- Persistir los mensajes de contacto en algún almacenamiento propio (base de datos, archivo). Este spec solo envía el correo; no guarda historial.
- Traducir el copy de la página (sigue en español, igual que el resto del sitio).
- Página de agradecimiento en ruta aparte; el "éxito" se muestra inline, igual que la maqueta.

---

## 3 — Modelo de datos

No se introduce ningún tipo de dominio nuevo (no hay `Game`, `ScoreEntry`, etc. involucrados). Solo el contrato del endpoint:

```ts
// app/api/contact/route.ts
type ContactPayload = { name: string; email: string; msg: string };
type ContactResponse = { ok: true } | { ok: false; error: string };

export async function POST(req: Request): Promise<Response>;
```

No hay estado persistente entre sesiones: el formulario es efímero (estado de React en el propio componente cliente), y el servidor no guarda nada — solo reenvía el mensaje por correo.

---

## 4 — Plan de implementación

1. **Dependencia y variables de entorno.** `npm install resend`. Crear `.env.example` (commiteado) con `RESEND_API_KEY=` y `CONTACT_TO_EMAIL=` vacías más un comentario sobre la limitación del sandbox. Crear/editar `.env.local` (ignorado por git) con `CONTACT_TO_EMAIL=luisbboy211@gmail.com`; el usuario pega ahí mismo su `RESEND_API_KEY` real (no se solicita ni se transcribe en la conversación ni en ningún archivo commiteado). Sistema funcional: nada cambia todavía en runtime. Verificación: `npm run dev` sigue arrancando sin errores.
2. **Endpoint de contacto.** Crear `app/api/contact/route.ts` con el `POST` descrito en la sección 2: valida el payload, instancia `Resend` con `process.env.RESEND_API_KEY`, llama a `resend.emails.send(...)` y responde `{ ok: true }` o `{ ok: false, error }` capturando cualquier excepción. Verificación: con `curl -X POST http://localhost:3000/api/contact -H "Content-Type: application/json" -d '{"name":"Test","email":"a@a.com","msg":"hola"}'` y la `RESEND_API_KEY` real ya en `.env.local`, responde `{ ok: true }` y llega un correo a `luisbboy211@gmail.com` (asumiendo que sea la misma dirección con la que se creó la cuenta de Resend — ver riesgo en sección 7); sin la key o con una inválida, responde `{ ok: false, error: ... }` con status de error, sin crash del servidor.
3. **Animación de shake.** Añadir a `app/globals.css` el token `--animate-shake: av-shake 0.4s;` y su `@keyframes av-shake`, portando el efecto de `about.jsx`/`styles.css` (`.shake`). Verificación: clase `animate-shake` disponible para usar en el paso 4.
4. **Página `/about`.** Crear `app/about/page.tsx` ("use client") con el hero, highlights, separador y formulario de contacto, portados de `about.jsx` a Tailwind (mismo criterio del spec 02: reutilizar tokens y utilidades existentes, sin copiar CSS crudo salvo la animación del paso 3). El formulario mantiene el estado local (`form`, `sent`, `shake`) igual que la maqueta, más un estado nuevo de envío (`status: "idle" | "sending" | "error"`) que gobierna el texto del botón y el mensaje de error. El `onSubmit` hace `fetch("/api/contact", { method: "POST", body: JSON.stringify(form) })`; éxito → `sent`; error de red o `{ ok: false }` → estado de error, sin perder `form`. Verificación manual en el navegador: enviar con un campo vacío hace shake y no llama al endpoint; enviar con los tres campos completos muestra "ENVIANDO..." y luego el bloque `terminal-success` (con la `RESEND_API_KEY` real ya configurada) y llega el correo a `luisbboy211@gmail.com`; "ENVIAR OTRO MENSAJE" limpia el formulario. Provocar un fallo (ej. apagar la red o usar una key inválida temporalmente) muestra el estado de error in-line conservando los datos escritos.
5. **Nav actualizada.** En `components/nav-bar.tsx`: añadir `NavLink href="/about"` con texto "Acerca de" en la versión de escritorio, resaltado cuando `pathname === "/about"`; añadir el mismo enlace al panel móvil. Verificación: en `/about` se resalta "Acerca de" en ambas versiones del nav; el enlace navega correctamente desde cualquier otra página.
6. **Remate.** `npm run build` y `npm run lint` sin errores ni warnings nuevos. Confirmar que `app/api/contact/route.ts` no se ejecuta durante el build (Route Handlers son dinámicos por defecto al usar `Request`, no deberían prerenderizarse). Confirmar que ninguna clave de Resend queda expuesta al cliente (el `fetch` del formulario solo llama a `/api/contact`, nunca importa `resend` en un componente `"use client"`). Si `next dev` regenera el bloque `<!-- BEGIN:nextjs-agent-rules -->` de `AGENTS.md`, commitearlo junto al resto.

---

## 5 — Criterios de aceptación

- [ ] `/about` muestra el hero "Acerca de" con misión y los 3 highlights con sus iconos, igual que `about.jsx`.
- [ ] La sección de contacto muestra la intro (kicker, título, subtítulo, 3 tips) y el formulario con los mismos labels y placeholders que la maqueta (Nombre, Correo electrónico, Mensaje).
- [ ] Enviar el formulario con algún campo vacío dispara la animación de shake y no envía ninguna petición de red.
- [ ] Enviar el formulario con los tres campos completos deshabilita el botón y muestra "ENVIANDO..." mientras la petición está en curso.
- [ ] Con la `RESEND_API_KEY` real configurada en `.env.local`, enviar el formulario completo hace que llegue un correo a `luisbboy211@gmail.com` con el nombre, correo y mensaje escritos, y la UI muestra el bloque `terminal-success` con el nombre en mayúsculas, igual que la maqueta; "ENVIAR OTRO MENSAJE" limpia el formulario.
- [ ] Si `POST /api/contact` falla (key inválida, error de Resend, o error de red), se muestra un mensaje de error visible sin perder lo que el usuario había escrito, y el formulario queda listo para reintentar.
- [ ] `app/api/contact/route.ts` valida que `name`, `email` y `msg` no estén vacíos antes de llamar a Resend, y nunca deja una excepción sin capturar (siempre responde JSON con `ok`).
- [ ] El NavBar (escritorio y menú móvil) muestra "Acerca de" enlazando a `/about`, resaltado como activo solo en esa ruta.
- [ ] `.env.example` existe, está commiteado, documenta `RESEND_API_KEY` y `CONTACT_TO_EMAIL` con claves vacías, y no contiene ningún valor real (ni la key, ni `luisbboy211@gmail.com`).
- [ ] `RESEND_API_KEY` no aparece en ningún archivo o componente que se ejecute en el cliente (`"use client"`); solo se lee dentro de `app/api/contact/route.ts`.
- [ ] `npm run build` y `npm run lint` terminan sin errores ni warnings nuevos.

---

## 6 — Decisiones tomadas y descartadas

- **Sí:** ruta `/about` en inglés, en vez de `/acerca-de`. Decisión explícita del usuario: mantiene el patrón de rutas en inglés que estableció el spec 03, aunque el copy visible siga en español.
- **Sí:** agregar ahora el enlace "Acerca de" al NavBar (escritorio y móvil). Decisión explícita del usuario, que cierra el hueco que el spec 02 dejó abierto a propósito porque la página todavía no existía.
- **Sí:** página de un solo archivo cliente (`app/about/page.tsx`), sin split `page.tsx` + componente. Sigue el patrón de `app/auth/page.tsx` y `app/games/page.tsx` (páginas sin `params`/`searchParams`), no el de `app/game/[id]` ni `app/hall-of-fame` (que sí necesitan un wrapper de servidor para leer datos async).
- **Sí:** usar Resend a través de un Route Handler propio (`app/api/contact/route.ts`), nunca desde el cliente. Es la única forma de mantener `RESEND_API_KEY` fuera del bundle del navegador.
- **Sí:** remitente `onboarding@resend.dev` (sandbox), porque el usuario ya tiene cuenta y `RESEND_API_KEY` pero todavía no verificó un dominio propio. `CONTACT_TO_EMAIL=fernandodance2121@gmail.com` (valor real, indicado por el usuario). La `RESEND_API_KEY` no se transcribe en el spec ni en ningún archivo commiteado: el usuario la pega directamente en su `.env.local` local.
- **Sí:** agregar un estado de error (no existe en la maqueta original) porque este spec conecta el formulario a un backend real que puede fallar (sin API key, sin dominio verificado, caída de red). Mostrarlo in-line y conservar los datos escritos es el mínimo indispensable para que el formulario sea usable de verdad.
- **No:** validación de correo más allá de `type="email"` + campo no vacío. El pedido fue portar la maqueta "exactamente igual"; añadir regex o validaciones extra sería inventar requisitos no pedidos.
- **No:** anti-spam (honeypot, rate limiting, captcha). No se pidió y el sitio no tiene evidencia de abuso; se puede añadir en un spec aparte si hace falta.
- **No:** persistir los mensajes en una base de datos o archivo. El pedido fue "el envío del correo electrónico"; guardar historial es una funcionalidad distinta.

---

## 7 — Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| El sandbox `onboarding@resend.dev` solo entrega al correo con el que el usuario se registró en Resend. Si esa dirección no es `fernandodance2121@gmail.com`, el endpoint puede responder `{ ok: true }` (Resend acepta la petición) pero el correo nunca llega. | Documentado explícitamente en el comentario de `.env.example` y en la sección 6. Verificación recomendada durante la implementación: confirmar con el usuario que `fernandodance2121@gmail.com` es la dirección con la que abrió su cuenta de Resend antes de dar por buena la prueba end-to-end. |
| Si la `RESEND_API_KEY` real resulta inválida o expirada al momento de implementar, no se puede verificar el envío end-to-end en ese momento. | El endpoint maneja la ausencia/invalidez de la key como un error controlado (estado de error en el formulario, sin crash), así que el resto de la funcionalidad queda verificable igual. |
| Al no haber anti-spam, el endpoint podría recibir envíos automatizados si `/about` se hace público. | Aceptado como riesgo conocido y fuera de alcance; se resuelve en un spec aparte si se vuelve un problema real. |

---

## Lo que **no** entra en este spec

- Dominio verificado y remitente propio en Resend.
- Anti-spam (honeypot, rate limiting, captcha).
- Persistencia de los mensajes de contacto.
- Validación de formato de correo más allá de `type="email"`.
- Traducción del copy de la página.

Cada uno de estos, si se aborda, va en su propio spec.
