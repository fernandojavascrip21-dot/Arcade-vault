# SPEC 23 — Vencimiento de sesión (JWT) y protección de rutas en el proxy

> **Status:** Aprovado
> **Depends on:** SPEC 21, SPEC 22
> **Date:** 2026-10-22
> **Objective:** Hacer que `proxy.ts` limite la sesión a 7 días (usando el JWT que ya emite Supabase Auth, obligando a volver a iniciar sesión al vencer) y exija sesión en los pasos de cuenta `/auth/player-name` y `/auth/reset-password`.

---

## 1 — Por qué existe este spec

Supabase Auth ya emite un JWT por sesión (el _access token_, que la app lee con `getClaims()` en `lib/supabase/proxy.ts`). Dura 1 hora y se renueva solo con un refresh token, y en el plan Free ese refresh no caduca: la sesión no vence nunca. Las opciones nativas para limitarla (_time-box_ e inactividad) son del plan Pro.

Además, el spec 21 dejó `proxy.ts` sin proteger ninguna ruta porque todo el sitio es público (hoy esas dos pantallas solo se protegen dentro de su página, con `redirect`). Sigue siendo público: este spec mueve esa protección al proxy para los pasos de cuenta que no tienen sentido sin sesión, y el resto (juegos, catálogo, rankings) sigue abierto a invitados.

Este spec añade en la app una **vida máxima de sesión** de 7 días, medida desde el inicio de sesión (no desde el último refresco), sin crear un sistema de tokens propio: se sigue usando el JWT firmado de Supabase como única fuente de identidad.

---

## 2 — Scope

**In:**

- **Duración máxima**: 7 días desde el inicio de sesión, constante `SESSION_MAX_AGE_SECONDS` en `lib/constants/auth.ts`. Aplica a todos los métodos (email, Google, GitHub).
- **Origen de la marca de inicio**: el instante de autenticación que ya viaja dentro del JWT firmado (claim `amr[].timestamp`, que se conserva al refrescar el token). Es a prueba de manipulación y no necesita secretos nuevos. Si en la verificación del paso 1 ese claim no se conserva, el plan alternativo es una cookie `httpOnly` firmada con HMAC (variable `SESSION_COOKIE_SECRET`, solo servidor) escrita en el login y el callback.
- **Comprobación en `proxy.ts`** (`lib/supabase/proxy.ts`): tras `getClaims()`, si la sesión es más vieja que `SESSION_MAX_AGE_SECONDS`:
  - se llama `supabase.auth.signOut()` (limpia las cookies en la respuesta);
  - en peticiones de navegación (GET) se redirige a `/auth?error=session-expired`;
  - en otras peticiones (p. ej. Server Actions) se cierra la sesión y se continúa como invitado, sin redirigir.
- **Protección de rutas** (en el mismo `proxy`, con una lista `PROTECTED_ROUTES` en `lib/constants/auth.ts`): `/auth/player-name` y `/auth/reset-password` exigen sesión válida (no vencida). Sin ella se redirige a `/auth?next=<ruta>` (solo si `safeNext` la acepta). La decisión se toma con los claims de `getClaims()`, nunca con datos del cliente. Los `redirect` de las páginas se conservan como segunda barrera.
- **Rutas siempre públicas**: `/auth/callback` (crea la sesión; protegerla rompe el login y el enlace de recuperación), `/auth`, `/auth/check-email`, `/auth/forgot-password` y todo el sitio de juego. Una sesión sin perfil **no** se fuerza a `/auth/player-name` en otras rutas (sigue el aviso "ELIGE TU NOMBRE" del navbar).
- **Aviso en `/auth`**: el caso `error=session-expired` muestra "Tu sesión venció. Vuelve a iniciar sesión." (mismo estilo que `link-invalid` y `oauth`), conservando la ruta a la que volver con `next` cuando sea una ruta interna válida (`safeNext`).
- **Cliente**: `SessionProvider` ya relee la sesión en cada cambio de ruta; solo se comprueba que tras el cierre en servidor el navbar vuelve a INICIAR SESIÓN sin recargar manualmente.
- **JWT de acceso**: se deja en el valor por defecto de Supabase (3600 s); no se cambia.
- **Documentación**: `CLAUDE.md` (sección Auth) y los comentarios de `lib/supabase/proxy.ts` (ya no es "solo refresca").

**Out of scope (para specs futuros):**

- Cierre por inactividad (el vencimiento es por antigüedad de la sesión, no por falta de uso).
- "Recordarme" / duración distinta por usuario o método.
- Time-box nativo de Supabase (plan Pro).
- JWT propio firmado por la app, rotación de claves JWT, claims personalizados.
- Cerrar sesión en todos los dispositivos, lista de sesiones activas, revocación remota.
- Proteger `/hall-of-fame`, `/games`, `/play/*` u otras rutas de juego: el sitio sigue siendo público y el modo invitado se conserva.
- Redirigir fuera de `/auth` a quien ya tiene sesión, y forzar `/auth/player-name` a cuentas sin perfil.
- Roles o permisos por ruta.
- Aviso previo en pantalla ("tu sesión vence en 5 minutos").

---

## 3 — Data model

Sin tablas ni columnas nuevas.

```ts
// lib/constants/auth.ts
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 días

// lib/auth.ts — pura y testeable
export function isSessionExpired(
  authenticatedAtSeconds: number | null,
  nowSeconds: number,
  maxAgeSeconds = SESSION_MAX_AGE_SECONDS,
): boolean;
```

`authenticatedAtSeconds` sale de `claims.amr` (el `timestamp` más antiguo/inicial); si no se puede determinar se considera **no vencida** (fallar abierto evita expulsar a todos por un cambio de formato; ver riesgos). Si se necesita el plan alternativo, `SESSION_COOKIE_SECRET` se añade a `.env.example`.

---

## 4 — Plan de implementación

1. **Verificar el claim** con una sesión real: iniciar sesión, decodificar el access token (`getClaims()`) y comprobar que `amr[].timestamp` existe y **no cambia** tras un refresco. Si falla, adoptar la cookie firmada del Scope y anotarlo en este spec.
2. **Constante y helper**: `SESSION_MAX_AGE_SECONDS` en `lib/constants/auth.ts` e `isSessionExpired` en `lib/auth.ts`, con la lectura de `amr`. Probar el helper con una tabla de casos (reciente, 6 d 23 h, 7 d 1 s, sin `amr`, `amr` vacío).
3. **`proxy`**: leer antes `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`. En `updateSession`, usar el resultado de `getClaims()`; si vencida → `signOut()` y redirección (GET) o continuar como invitado (otros métodos), copiando las cookies actualizadas a la respuesta de redirección. Excluir `/auth/*` de la redirección para evitar bucles.
4. **Protección de rutas**: en el mismo `updateSession`, tras el chequeo de vencimiento, si la ruta está en `PROTECTED_ROUTES` y no hay claims válidos, redirigir a `/auth?next=…` copiando las cookies de la respuesta. Comprobar a mano que el enlace de recuperación (callback → `/auth/reset-password`) y el login social siguen llegando a su destino.
5. **Aviso en `/auth`**: caso `session-expired` en la página y el formulario, con `aria-live` y foco como los demás avisos.
6. **Verificación manual**: forzar el vencimiento bajando temporalmente `SESSION_MAX_AGE_SECONDS` (p. ej. 60 s) y comprobar el flujo completo; restaurar 7 días.
7. **Documentación**: `CLAUDE.md`, comentarios, `npm run lint` y `npm run build`.

---

## 5 — Criterios de aceptación

- [ ] `isSessionExpired` devuelve el resultado esperado en: sesión reciente, 6 d 23 h, 7 d + 1 s, sin `amr` y `amr` vacío (los dos últimos, "no vencida").
- [ ] Con una sesión de más de 7 días (simulada con una duración corta), cualquier navegación redirige a `/auth?error=session-expired` y `/auth` muestra el aviso en español.
- [ ] Tras el vencimiento el navbar muestra INICIAR SESIÓN y las cookies de Supabase fueron borradas.
- [ ] Iniciar sesión de nuevo funciona y reinicia la cuenta de los 7 días (también con Google y GitHub).
- [ ] El refresco automático del access token (1 hora) no reinicia ni alarga la vida de 7 días.
- [ ] Una sesión vencida que guarda una puntuación (Server Action) no rompe la página: se trata como invitado y el resultado es el mismo que sin sesión.
- [ ] No hay bucles de redirección en `/auth`, `/auth/callback` ni `/auth/player-name`.
- [ ] Sin sesión, abrir `/auth/player-name` o `/auth/reset-password` redirige a `/auth` con `next`; con sesión válida abren normalmente.
- [ ] Con sesión vencida, esas dos rutas también redirigen (el aviso es `session-expired`).
- [ ] El flujo completo de recuperación de contraseña (correo → callback → `/auth/reset-password`) y el login con Google/GitHub siguen funcionando.
- [ ] Un invitado sin sesión sigue pudiendo abrir `/`, `/games`, `/game/*`, `/play/*`, `/hall-of-fame` y `/about`; una cuenta sin perfil sigue navegando y jugando.
- [ ] Si se adopta el plan alternativo, la cookie es `httpOnly`, `secure` en producción, firmada, y alterarla cierra la sesión; `SESSION_COOKIE_SECRET` está en `.env.example` sin valor real.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

---

## 6 — Decisiones tomadas y descartadas

- **JWT de Supabase + vida máxima en la app** (elegido) frente a time-box nativo o JWT propio: el time-box es del plan Pro y un JWT propio duplicaría el sistema de sesión (más código, más riesgo y dos fuentes de identidad). Se aprovecha el JWT firmado que ya existe.
- **7 días** (elegido) frente a 24 h o 30 días: equilibrio entre fricción para un sitio de juegos y límite razonable de sesiones olvidadas.
- **Vencimiento por antigüedad, no por inactividad**: pedido era "cuando se vence el token se obliga a volver a iniciar sesión"; la inactividad es un criterio distinto y queda fuera.
- **Marca desde el claim `amr`** (con cookie firmada como plan B) frente a una cookie sin firmar: una cookie sin firmar la puede alargar el propio usuario.
- **Fallar abierto** si no se puede leer la marca: un cambio de formato del JWT no debe cerrar la sesión de todos; el costo es que, en ese caso, el límite no se aplica hasta corregirlo.
- **Proteger solo los pasos de cuenta** (elegido) frente a proteger rankings o `/play/*`: el modo invitado es parte del producto (specs 12 y 21). Se reabre la decisión del spec 21 de "ninguna ruta protegida" solo para las dos rutas que no funcionan sin sesión.
- **Cuenta sin perfil no se fuerza** a elegir nombre en el proxy (elegido): hoy puede jugar como invitado y el navbar la avisa; forzarlo bloquearía la navegación.
- **Mismo spec para vencimiento y protección** (elegido) frente a un spec 24: ambos editan `proxy.ts` y comparten la comprobación de sesión.

---

## 7 — Riesgos identificados

- **El claim `amr` podría no conservarse** al refrescar o variar entre proveedores (email vs OAuth). Por eso el paso 1 verifica con sesiones reales de los tres métodos antes de codificar.
- **Redirección en Server Actions**: redirigir una petición POST desde `proxy` rompe la acción; por eso en no-GET solo se cierra sesión y se continúa. Una puntuación guardada justo al vencer cae como invitado y puede toparse con el error de nombre reservado (spec 21); el jugador ve el aviso y puede iniciar sesión de nuevo.
- **Callback protegido por error**: `/auth/callback` debe quedar fuera de `PROTECTED_ROUTES`, o el login y la recuperación se rompen.
- **Bucles de redirección** si `/auth` o el callback se evalúan como vencidos; se excluyen en el paso 3.
- **Cookies en la redirección**: al hacer `signOut()` en `proxy` hay que copiar las cookies borradas a la respuesta de redirección, o la sesión reaparece. Cubierto en el paso 3 y el criterio del navbar.
- **Next 16**: `proxy` y las APIs de request cambiaron; leer la documentación local antes de editar.
