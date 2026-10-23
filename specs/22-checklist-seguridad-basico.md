# SPEC 22 — Checklist de seguridad básico

> **Status:** Aprovado
> **Depends on:** SPEC 05, SPEC 07, SPEC 21
> **Date:** 2026-10-22
> **Objective:** Aplicar el checklist de `references/security-checklist.md` (RLS, política de contraseñas con validación por expresión regular, límite de signups, headers de seguridad en Next.js y warnings del asesor de Supabase) dejando cada punto verificado o con su excepción documentada.

---

## 1 — Por qué existe este spec

Con el spec 21 la plataforma ya tiene cuentas reales, así que conviene cerrar la superficie básica de ataque antes de crecer. El checklist mezcla tres tipos de trabajo: **código** (headers en `next.config.ts`), **base de datos** (migración para el warning de `rls_auto_enable`) y **configuración manual en el panel de Supabase** (contraseñas, rate limit). Estado verificado con `get_advisors` el 2026-10-22:

- RLS ya está habilitado en `games`, `scores` y `profiles` (las tres tablas de `public`).
- Hay 3 warnings: `is_player_name_available` ejecutable por `anon`/`authenticated` (SECURITY DEFINER), `rls_auto_enable` ejecutable por `anon`/`authenticated` (SECURITY DEFINER) y _leaked password protection_ desactivada.
- `lib/constants/auth.ts` ya valida `PASSWORD_MIN = 8` en el cliente/servidor de la app; falta confirmar que Supabase Auth lo exige también.

---

## 2 — Scope

**In:**

- **RLS**: verificar (SQL + `get_advisors`) que `games`, `scores` y `profiles` tienen RLS habilitado y que sus políticas coinciden con el spec 21 (`games` solo lectura pública; `scores` lectura pública e insert con `user_id` nulo o propio; `profiles` solo lectura/insert propios). Corregir lo que difiera.
- **Longitud mínima de contraseña**: fijar mínimo 8 caracteres en Supabase Auth (Auth > Sign In / Providers > Password) y activar el requisito "minúsculas, mayúsculas, dígitos y símbolos" en el mismo panel (misma regla que la regex de abajo, como segunda barrera).
- **Validación de contraseña con expresión regular**: nueva constante `PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|<>?,./`~]).{8,72}$/` (el símbolo es uno del conjunto que acepta Supabase Auth) en `lib/constants/auth.ts` (el 8 y el 72 salen de `PASSWORD_MIN`/`PASSWORD_MAX`). `validatePassword` en `lib/auth.ts` la usa y devuelve mensajes en español específicos (falta minúscula / mayúscula / número / símbolo, longitud). Se aplica en `signUpAction` y `updatePasswordAction` (servidor, que es quien manda) y como ayuda en línea en `app/auth/auth-form.tsx` y `reset-password-form.tsx`, cuyos textos "Mínimo 8 caracteres" pasan a describir la regla completa. `signInAction` **no** aplica la regex (no debe rechazar contraseñas antiguas). El mensaje `weak_password` se actualiza.
- **Hash de contraseñas (verificación, sin código)**: Supabase Auth ya guarda la contraseña con bcrypt en `auth.users.encrypted_password`; la app nunca la almacena ni la hashea (la envía por HTTPS a Supabase desde las Server Actions). Se verifica con una consulta de solo conteo (sin leer hashes) y se documenta. Comprobado el 2026-10-22: 3 usuarios, 1 con hash bcrypt (`$2a$`/`$2b$`) y 2 sin contraseña (cuentas de Google/GitHub).
- **Límite de signups por IP**: ajustar en el panel (Auth > Rate Limits) el máximo de registros por IP por hora a un valor bajo y registrar el valor elegido en el spec al implementar. **Valor configurado (2026-10-22): 5 requests / 5 min por IP** en "Rate limit for sign-ups and sign-ins" (360/5 min → 5/5 min; el panel no tiene un límite de signups por hora: es un campo combinado de registros e inicios de sesión por ventana de 5 minutos, así que también limita los logins desde una misma IP). Sin CAPTCHA.
- **Headers de seguridad** en `next.config.ts` (`headers()` para `source: "/(.*)"`):
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
    La lista vive en una constante `securityHeaders` dentro de `next.config.ts`. Leer antes `node_modules/next/dist/docs/01-app/` (guía de `headers` en `next.config.js`).
- **Warnings de Supabase**:
  - `rls_auto_enable` (función auxiliar que no usa la app): migración que revoca `EXECUTE` a `public`, `anon` y `authenticated`. No la ejecuta nadie por REST; los event triggers corren con el dueño.
  - `is_player_name_available`: se **acepta** el warning (ver §5) y queda documentado.
  - _Leaked password protection_: se **difiere** (ver §5).
- **Documentación**: sección de seguridad en `CLAUDE.md` (headers, excepciones aceptadas) y marcar el checklist en `references/security-checklist.md` con lo hecho, lo diferido y por qué.

**Out of scope (para specs futuros):**

- Leaked password protection (requiere plan Pro de Supabase; se activa cuando el proyecto pase a Pro).
- CAPTCHA (Turnstile/hCaptcha) en signup y cambios en `signUpAction`.
- `Content-Security-Policy` (exige permitir el script anti-flash del tema, Supabase, Google Fonts y OAuth; merece su propio spec).
- Rediseñar `is_player_name_available` para que no sea llamable por `anon`.
- **Vencimiento de sesión / JWT** (vida máxima de 7 días y obligar a volver a iniciar sesión): va en el SPEC 23.
- Hashear la contraseña en la app (con bcrypt/argon2 propios o en el cliente): duplicaría lo que hace Supabase Auth y, hecho en el cliente, convertiría el hash en la contraseña efectiva. Cambiar el algoritmo de hash tampoco es configurable en Supabase.
- Anti-trampa en puntuaciones, rate limit propio de la app, MFA, auditoría de logs, advisors de _performance_.
- Cambiar el esquema de `games`, `scores` o `profiles` más allá del `REVOKE`.

---

## 3 — Data model

Sin estructuras nuevas. Solo cambia un permiso en base de datos:

```sql
-- Migración: revoke_rls_auto_enable_execute
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
```

Y una constante nueva en `next.config.ts`:

```ts
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];
```

---

## 4 — Plan de implementación

1. **Auditoría de RLS** (solo lectura): `list_tables` y consulta a `pg_policies` vía `execute_sql`; comparar con el §3 del spec 21. Anotar discrepancias; si no hay, no se cambia nada.
2. **Migración** `revoke_rls_auto_enable_execute` con `apply_migration`. Volver a correr `get_advisors` (seguridad): deben desaparecer los dos avisos de `rls_auto_enable`.
3. **Regex de contraseña**: `PASSWORD_RE` en `lib/constants/auth.ts`, `validatePassword` en `lib/auth.ts`, textos de ayuda en los dos formularios y mensaje `weak_password`. Probar con una tabla de casos (7 caracteres, sin mayúscula, sin minúscula, sin número, sin símbolo, 73 caracteres, válida).
4. **Headers**: añadir `securityHeaders` y `headers()` en `next.config.ts` (dejando intactos `allowedDevOrigins` y el resto). Probar con `npm run dev` y `curl -I http://localhost:3000/`.
5. **Panel de Supabase (manual)**: contraseña mínima 8 + minúsculas, mayúsculas, dígitos y símbolos; Rate Limits > sign-ups y sign-ins por IP cada 5 min al valor acordado (hecho: 5 / 5 min; contraseña mínima 8 y letras+dígitos+símbolos, comprobado vía API). Anotar los valores finales en este spec.
6. **Verificación funcional**: recorrer registro, login (email y Google/GitHub), reset de contraseña, `/play/*` en pantalla completa y guardar una puntuación, para confirmar que los headers no rompen nada.
7. **Documentación**: actualizar `CLAUDE.md` y `references/security-checklist.md`; `npm run lint` y `npm run build`.

---

## 5 — Criterios de aceptación

- [ ] `list_tables` muestra `rls_enabled: true` en `games`, `scores` y `profiles`, y las políticas coinciden con el spec 21.
- [ ] `get_advisors` (seguridad) ya no reporta `rls_auto_enable`; solo quedan `is_player_name_available` (aceptado) y _leaked password protection_ (diferido).
- [ ] `signUpAction` y `updatePasswordAction` rechazan, con un mensaje en español que dice qué falta, contraseñas de 7 caracteres, de 73, sin minúscula, sin mayúscula, sin número o sin símbolo; la validación ocurre en el servidor aunque se salte el formulario.
- [ ] Una contraseña de 8–72 caracteres con minúscula, mayúscula, número y símbolo permite el registro y el cambio de contraseña.
- [ ] Supabase Auth también rechaza una contraseña sin esas clases si se llama directo a su API (segunda barrera del panel).
- [ ] Un usuario con contraseña antigua que no cumple la regex puede seguir iniciando sesión.
- [ ] El panel muestra el límite de signups por IP configurado y su valor está anotado en este spec.
- [ ] `curl -I` a `/`, a `/games` y a `/play/rana` devuelve los cinco headers de §3.
- [ ] Una página de terceros no puede incrustar el sitio en un `<iframe>` (por `X-Frame-Options: DENY`).
- [ ] Login con Google/GitHub, el enlace de confirmación/recuperación, pantalla completa en `/play/*` y guardar una puntuación siguen funcionando.
- [ ] `RPC is_player_name_available` sigue respondiendo a invitados y usuarios nuevos en `/auth/player-name` y en FIN DEL JUEGO.
- [ ] Una consulta de conteo sobre `auth.users` confirma que toda cuenta con contraseña tiene `encrypted_password` en formato bcrypt (`$2a$`/`$2b$`), y ninguna Server Action, `console.*` ni consulta del repo escribe o registra la contraseña en claro.
- [ ] `references/security-checklist.md` y `CLAUDE.md` reflejan lo hecho, lo diferido y la excepción aceptada.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

---

## 6 — Decisiones tomadas y descartadas

- **Leaked password protection diferida** (elegido) frente a activarla o subir a Pro: es una función exclusiva del plan Pro y el proyecto está en Free. Se compensa con mínimo 8 y complejidad de letras, números y símbolos; se revisa si el proyecto pasa a Pro.
- **Headers: los 3 del checklist + HSTS y Permissions-Policy** (elegido) frente a solo los 3 o a añadir CSP: HSTS y Permissions-Policy son de bajo riesgo para la app (el juego usa fullscreen del propio documento, no cámara/micrófono/geolocalización), mientras que CSP puede romper el script anti-flash del tema, OAuth y fuentes, y se deja para un spec propio.
- **Aceptar el warning de `is_player_name_available`** (elegido) frente a rediseñarla: es intencional. Con RLS, `profiles` solo deja leer la fila propia, así que invitados y usuarios nuevos necesitan una función `SECURITY DEFINER` para saber si un nombre está libre; solo devuelve un booleano. Quitar el acceso público exigiría un secreto de servidor nuevo y más cambios. Riesgo aceptado: se pueden sondear nombres por REST, pero los nombres ya son públicos en los rankings.
- **No hashear en la app** (elegido): el requisito "la contraseña se guarda hasheada" ya lo cumple Supabase Auth (bcrypt, con sal, solo servidor). Un hash propio en el cliente lo haría equivalente a la contraseña y chocaría con la regex; en el servidor sería doble hash sin beneficio. Lo que sí se hace es verificarlo y documentarlo.
- **Revocar `EXECUTE` de `rls_auto_enable`**: la app no la llama (verificado con búsqueda en el código) y no hay motivo para exponerla por REST.
- **Solo rate limit nativo de Supabase para signups** (elegido) frente a añadir CAPTCHA: no requiere código ni secretos nuevos y cubre el checklist ("limitar signups por IP"). CAPTCHA queda como siguiente paso si aparece abuso.
- **Regex 8–72 con minúscula, mayúscula, número y símbolo** (elegido; decisión del 2026-10-22, antes sin símbolo) frente a no exigir símbolo o solo letra+número: el panel de Supabase quedó en "letras, dígitos y símbolos" y la regex debe coincidir para no mostrar un `weak_password` genérico. Se valida en servidor y se refleja en el panel de Supabase. Sin validar en el login para no bloquear cuentas existentes.
- **Vencimiento de sesión separado en el SPEC 23** (elegido) frente a meterlo aquí: toca `proxy.ts`, `SessionProvider` y `/auth`, y dejaría de ser un checklist básico.

---

## 7 — Riesgos identificados

- **Configuración fuera del repo**: contraseña mínima y rate limits viven en el panel; no hay migración que los reproduzca. Por eso el paso 4 anota los valores en el spec y en `CLAUDE.md`.
- **HSTS es difícil de revertir**: una vez que el navegador lo recuerda (2 años), no se puede volver a HTTP en ese dominio. Aceptable si producción ya sirve por HTTPS; HSTS lo ignora en `http://localhost`. Si el dominio de producción aún no tiene HTTPS correcto, retirar HSTS de este spec antes de implementar.
- **`X-Frame-Options: DENY`** impide incrustar el sitio en cualquier iframe, incluidos previews de herramientas externas; confirmar que ninguna se usa.
- **Revocar `EXECUTE` de `rls_auto_enable`** podría afectar a un event trigger si este no corriera como dueño; mitigación: comprobar `pg_event_trigger` antes de aplicar y volver a ejecutar `get_advisors` después.
- **Complejidad de contraseña** puede subir el abandono en el registro; se acepta, y es reversible desde el panel.
- **Desajuste regex/panel**: si la regex y la configuración de Supabase divergen, el usuario ve un error genérico `weak_password`; por eso la regla se anota en ambos sitios.
- **Next 16**: leer la documentación local de `headers` antes de editar `next.config.ts`.
