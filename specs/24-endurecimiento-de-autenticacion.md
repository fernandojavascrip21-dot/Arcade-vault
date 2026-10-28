# SPEC 24 — Endurecimiento de la autenticación (origen fijo, cambio de contraseña y límites)

> **Status:**Implementado
> **Depends on:** SPEC 21, SPEC 22, SPEC 23
> **Date:** 2026-10-27
> **Objective:** Cerrar los hallazgos de la revisión de seguridad de la autenticación: dejar de construir los enlaces de correo/OAuth con cabeceras del cliente, escapar la URL del correo de bienvenida, exigir reautenticación al cambiar la contraseña y documentar las comprobaciones de panel que no viven en el repo.

---

## 1 — Por qué existe este spec

La revisión del código de autenticación (2026-10-27) no encontró fallos críticos, pero sí tres puntos accionables y dos recordatorios:

1. **Origen tomado de cabeceras del cliente** (media). `getOrigin()` en `app/auth/actions.ts` usa `Origin`, `X-Forwarded-Host` y `Host` para armar `emailRedirectTo` (registro y reenvío), `redirectTo` (reset y OAuth) y el `siteUrl` del correo de bienvenida. Supabase solo acepta los `redirectTo` de su lista de Redirect URLs, pero esa protección desaparece si la lista tiene un comodín amplio. El `siteUrl` del correo de bienvenida no pasa por Supabase y se inserta sin escapar en el HTML (`lib/email/welcome.ts`).
2. **Callback con `x-forwarded-host`** (baja). `app/auth/callback/route.ts` redirige a `https://${x-forwarded-host}` fuera de desarrollo: mismo problema de confianza en una cabecera.
3. **Cambio de contraseña sin reautenticación** (baja). `updatePasswordAction` acepta cualquier sesión válida; quien robe una sesión puede fijar su propia contraseña y conservar la cuenta. Una cuenta creada solo con Google o GitHub también puede ponerse contraseña sin confirmar nada.
4. **Rate limit solo en el panel** (informativo). El límite de 5 peticiones cada 5 minutos por IP vive en Supabase; si se sube, el login queda sin freno en la app.
5. **Rutas protegidas solo por el proxy** (informativo). `PROTECTED_ROUTES` compara la ruta exacta; hoy cada página repite `getUser()`, y esa segunda barrera debe mantenerse.

Este spec corrige 1–3 en código y deja 4–5 documentados, sin cambiar el modelo de sesión del spec 23.

---

## 2 — Scope

**In:**

- **Origen público fijo**: variable de entorno de servidor `SITE_URL` (p. ej. `https://arcadevault.example`), leída por una única función `getSiteUrl()` en `lib/site-url.ts`. Reemplaza a `getOrigin()` en todas las Server Actions (`signUpAction`, `signInWithProviderAction`, `requestPasswordResetAction`, `claimPlayerNameAction`, `resendConfirmationAction`) y en el callback.
  - En `development`, si `SITE_URL` falta, se usa `http://localhost:3000`.
  - Fuera de `development`, si falta o no es una URL `https` válida, **falla cerrado**: la acción devuelve `GENERIC_AUTH_ERROR` (el callback redirige a `/auth?error=oauth`) y se registra el error en el servidor. Nunca se recurre a cabeceras.
  - Se normaliza a solo origen (sin ruta ni `/` final).
- **Callback** (`app/auth/callback/route.ts`): `base` sale de `getSiteUrl()`; se elimina la lectura de `x-forwarded-host`.
- **Correo de bienvenida** (`lib/email/welcome.ts`): `gamesUrl` pasa por `escapeHtml` antes de entrar en el HTML (atributo `href` y texto). La versión de texto plano no se escapa.
- **Cambio de contraseña con reautenticación**: activar en el panel de Supabase _Auth > Sign In / Providers > Email > Secure password change_ y tratar en `updatePasswordAction` el error `reauthentication_needed`: se traduce a un mensaje en español en `AUTH_ERRORS` (`lib/constants/auth.ts`) que lleva al jugador a pedir un enlace de recuperación (`/auth/forgot-password`). El flujo normal (correo → callback → `/auth/reset-password`) debe seguir funcionando sin pasos extra, porque la sesión de recuperación cuenta como reciente.
- **Documentación**: `.env.example` (`SITE_URL`, sin valor real), `CLAUDE.md` (sección Auth y variables de entorno), `references/security-checklist.md` y los comentarios de `getOrigin` retirados.
- **Comprobaciones de panel** documentadas como parte del cierre (no se automatizan): Redirect URLs sin comodines amplios (`*`, `https://*`), Site URL = dominio de producción, confirmación de correo activa, política de contraseñas igual a `PASSWORD_RE`, rate limit vigente.
- **Pruebas**: un archivo `tests/site-url.test.mjs` (mismo runner que `tests/auth-session.test.mjs`) para `getSiteUrl()`.

**Out of scope (para specs futuros):**

- CAPTCHA o límite de intentos propio en la app (el spec 22 ya lo difiere).
- CSP (spec propio, ver spec 22).
- Pedir la contraseña actual en un formulario de "cambiar contraseña" dentro de la cuenta: hoy no existe esa pantalla.
- Cerrar sesión en todos los dispositivos tras un cambio de contraseña.
- Validar el origen de `redirectTo` contra una lista blanca propia además de la de Supabase.
- Cambiar la política de "falla abierto" del vencimiento de sesión (spec 23).
- Reestructurar `PROTECTED_ROUTES` (p. ej. coincidencia por prefijo); solo se deja anotada la regla de mantener `getUser()` en cada página protegida.

---

## 3 — Data model

Sin tablas ni columnas nuevas.

```ts
// lib/site-url.ts — servidor, función pura salvo por process.env
export function getSiteUrl(): string; // origen sin "/" final; lanza si no es válido fuera de development

// lib/constants/auth.ts
AUTH_ERRORS.reauthentication_needed =
  "Por seguridad, pide un enlace nuevo para cambiar tu contraseña.";
```

Variable nueva en `.env.example`: `SITE_URL=` (servidor; en Vercel, el dominio de producción).

---

## 4 — Plan de implementación

1. **Leer** `node_modules/next/dist/docs/` para Route Handlers y Server Actions antes de editar (AGENTS.md).
2. **`getSiteUrl()`** en `lib/site-url.ts` y su prueba (`node --test tests/site-url.test.mjs`): `https` válido, con `/` final, con ruta, sin definir en development y en producción, `http` en producción, valor basura.
3. **Server Actions**: sustituir `getOrigin()` por `getSiteUrl()`; capturar el error de configuración y devolver `GENERIC_AUTH_ERROR` (en `signInWithProviderAction`, redirigir a `/auth?error=oauth`). Borrar `getOrigin`.
4. **Callback**: usar `getSiteUrl()` como `base`, quitar `x-forwarded-host` y la condición por `NODE_ENV`.
5. **Correo de bienvenida**: escapar `gamesUrl` en el HTML.
6. **Contraseña**: añadir `reauthentication_needed` a `AUTH_ERRORS`; comprobar en `updatePasswordAction` que el error se muestra y enlaza a `/auth/forgot-password` en `reset-password-form.tsx`. Activar _Secure password change_ en el panel **después** de verificar el flujo en un entorno de prueba.
7. **Panel**: recorrer la lista de comprobaciones del Scope y anotar el resultado en la sección de verificación.
8. **Documentación**: `.env.example`, `CLAUDE.md`, `references/security-checklist.md`.
9. **Cierre**: `node --test tests/auth-session.test.mjs tests/site-url.test.mjs`, `npm run lint`, `npm run build`.

---

## 5 — Criterios de aceptación

- [ ] `getSiteUrl()` devuelve el origen normalizado con `SITE_URL` válido y falla cerrado fuera de development si falta o no es `https`.
- [ ] Ninguna Server Action ni el callback leen `Origin`, `Host`, `X-Forwarded-Host` ni `X-Forwarded-Proto` para construir URLs (`grep` limpio).
- [ ] Una petición con `Origin` o `X-Forwarded-Host` falsos produce enlaces con el dominio de `SITE_URL`.
- [ ] Registro, reenvío de confirmación, reset de contraseña, Google y GitHub siguen funcionando de extremo a extremo en local y en producción.
- [ ] Con `SITE_URL` ausente en producción, las acciones devuelven el mensaje genérico y `/auth/callback` redirige a `/auth?error=oauth`, sin redirigir a ningún otro host.
- [ ] El correo de bienvenida escapa la URL en el HTML; el enlace sigue siendo clicable y apunta a `/games` del dominio correcto.
- [ ] Con _Secure password change_ activo, recuperar la contraseña por correo funciona sin pasos extra.
- [ ] Una sesión antigua (no recuperación) que intenta fijar contraseña recibe el mensaje de `reauthentication_needed` con salida a `/auth/forgot-password`.
- [ ] Las comprobaciones de panel quedan marcadas y anotadas en este spec.
- [ ] `.env.example`, `CLAUDE.md` y `references/security-checklist.md` están actualizados, sin valores reales.
- [ ] `npm run lint` y `npm run build` terminan sin errores y las pruebas de Node pasan.

---

## 6 — Decisiones tomadas y descartadas

- **Variable `SITE_URL` fija** (propuesto) frente a validar las cabeceras contra una lista: una sola fuente de verdad, sin lógica de proxies, y es lo que usan los enlaces que ya aprueba la lista de Redirect URLs de Supabase. El costo es configurarla por entorno.
- **Fallar cerrado en producción** frente a volver a las cabeceras: un despliegue mal configurado se nota enseguida en lugar de enviar enlaces a un host no verificado.
- **Nombre sin `NEXT_PUBLIC_`**: solo lo usa el servidor; no hay motivo para publicarlo en el bundle del cliente.
- **Reautenticación por el ajuste nativo de Supabase** (propuesto) frente a comprobar `amr` o la antigüedad de la sesión en la app: menos código y no duplica la lógica de sesión del spec 23. Si el ajuste no estuviera disponible en el plan, se reabre esta decisión.
- **Rate limit y CAPTCHA no se tocan**: ya están en la lista de diferidos del spec 22; aquí solo se deja constancia del riesgo si se sube el límite del panel.
- **Un solo spec** para los tres cambios: comparten archivos (`actions.ts`, `callback/route.ts`) y la misma configuración de panel; separarlos obligaría a tocarlos tres veces.

---

## 7 — Riesgos identificados

- **`SITE_URL` mal configurada** rompe confirmación, reset y OAuth. Se mitiga con la prueba de `getSiteUrl()`, el fallo cerrado visible y la verificación de extremo a extremo antes de desplegar.
- **Previews de Vercel**: cada despliegue de preview tiene otro dominio; sus enlaces apuntarían al de `SITE_URL`. Si se usan previews para probar auth, definir `SITE_URL` por entorno o aceptar que auth solo se prueba en local y producción.
- **_Secure password change_ activado antes de tiempo** podría bloquear el reset si la sesión de recuperación no cuenta como reciente; por eso el paso 6 lo activa solo tras probarlo.
- **OAuth y Redirect URLs**: el dominio de `SITE_URL` debe estar en la lista de Supabase y en los proveedores; si se cambia el dominio, actualizar ambos.
- **Next 16**: Route Handlers y Server Actions cambiaron; leer la documentación local antes de editar.

---

## 8 — Verificación (2026-10-27)

**Código (hecho en la rama `spec-24-endurecimiento-de-autenticacion`):**

- [x] `getSiteUrl()` en `lib/site-url.ts` + `tests/site-url.test.mjs` (6 casos).
- [x] `getOrigin()` eliminado; las cinco Server Actions y el callback usan `getSiteUrl()` y fallan cerrado.
- [x] `grep` de `Origin` / `Host` / `X-Forwarded-*` limpio en `app/`, `lib/`, `components/` y `contexts/`.
- [x] Correo de bienvenida: `gamesUrl` escapada en el HTML.
- [x] `reauthentication_needed` en `AUTH_ERRORS` y enlace a `/auth/forgot-password` en `reset-password-form.tsx`.
- [x] `.env.example`, `CLAUDE.md` y `references/security-checklist.md` actualizados.
- [x] `node --test tests/auth-session.test.mjs tests/site-url.test.mjs` (12 OK), `npm run lint` y `npm run build` sin errores.

**Comprobaciones de panel (a marcar a mano; no las hace el agente):**

- [ ] `SITE_URL` definida en Vercel (dominio de producción, `https`) y en `.env.local`.
- [ ] Redirect URLs sin comodines amplios (`*`, `https://*`).
- [ ] Site URL = dominio de producción.
- [ ] Confirmación de correo activa.
- [ ] Política de contraseñas igual a `PASSWORD_RE` (8 caracteres + minúscula, mayúscula, dígito y símbolo).
- [ ] Rate limit vigente (5 requests / 5 min por IP).
- [ ] _Secure password change_ activado **después** de probar el reset por correo.

**Pruebas de extremo a extremo (pendientes):**

- [ ] Registro, reenvío de confirmación, reset de contraseña, Google y GitHub en local y en producción.
- [ ] Sesión antigua que intenta fijar contraseña recibe el mensaje de `reauthentication_needed`.
