# SPEC 21 — Registro, login y autenticación real con Supabase Auth

> **Status:** Aprovado
> **Depends on:** SPEC 05, SPEC 07, SPEC 12
> **Date:** 2026-10-19
> **Objective:** Reemplazar la sesión simulada por autenticación real con Supabase Auth (email + contraseña, Google y GitHub, confirmación de correo y recuperación de contraseña), de modo que cada cuenta tenga un nombre de jugador único con el que se guardan sus puntuaciones.

---

## 1 — Por qué existe este spec

`/auth` es hoy una maqueta: el formulario acepta cualquier cosa, los botones de Google/GitHub no hacen nada distinto y la "sesión" es solo un nombre en `localStorage` (`contexts/session-context.tsx`). El spec 12 dejó explícitamente fuera la autenticación real, la identidad única y la reserva de nombres, así que cualquiera puede guardar puntuaciones con el nombre de otro jugador.

Este spec cierra esa deuda sin romper lo que ya funciona: jugar como invitado sigue permitido, el histórico de `scores` no se toca, y `useSession` conserva su API para que navbar y sala de juego casi no cambien. Lo nuevo es que existe una cuenta real, un **perfil con nombre de jugador único** y puntuaciones ligadas a ese usuario (`user_id`), con los nombres de cuentas reservados frente a los invitados.

---

## 2 — Scope

**In:**

- **Métodos de acceso**: email + contraseña, Google (OAuth) y GitHub (OAuth) vía Supabase Auth.
- **Confirmación de correo** obligatoria para email + contraseña (enlace que vuelve a `/auth/callback`), con pantalla propia **`/auth/check-email`** ("REVISA TU CORREO"): muestra el correo al que se envió el enlace, botón "REENVIAR CORREO" (con espera de 60 s entre envíos y mensaje de éxito/error) y enlace para corregir el correo (volver a `/auth`). Al abrir un enlace vencido o ya usado, `/auth/callback` redirige a `/auth?error=link-invalid` con un aviso y la opción de reenviar.
- **Correo de bienvenida** (confirmación de cuenta creada): al terminar el registro —es decir, cuando se crea el perfil en `/auth/player-name`, para cualquier método— se envía un correo con Resend al usuario con su nombre de jugador y un enlace a `/games`. Es un envío "best effort": si falla, la cuenta se crea igual y solo se registra el error en el servidor.
- **Recuperación de contraseña**: solicitar enlace y pantalla para fijar la nueva contraseña.
- **Perfil con nombre de jugador único** (tabla `profiles`). Todo usuario, sea cual sea su método, elige su nombre en un paso obligatorio tras su primer acceso (`/auth/player-name`), con las reglas de `lib/player-name.ts` (spec 12), y no puede ser `INVITADO`.
- **Pantallas** (diseñadas con `/frontend-design`, en el estilo actual de `/auth`, responsive móvil y escritorio):
  - `/auth` (reescrita): pestañas INICIAR SESIÓN / CREAR CUENTA, campos email y contraseña, botones Google y GitHub, enlace "¿Olvidaste tu contraseña?" y "Jugar como invitado". Estados de carga, error y "revisa tu correo".
  - `/auth/callback` (Route Handler): intercambia el `code` por sesión y redirige.
  - `/auth/check-email`: aviso de revisar el correo con reenvío (recibe el correo por query `?email=`, solo para mostrarlo).
  - `/auth/player-name`: elegir nombre de jugador (validación en línea + comprobación de disponibilidad). Al guardar muestra un estado final "CUENTA CREADA" y redirige.
  - `/auth/forgot-password` y `/auth/reset-password`.
- **Server Actions** en `app/auth/actions.ts`: `signInAction`, `signUpAction`, `signInWithProviderAction`, `requestPasswordResetAction`, `updatePasswordAction`, `claimPlayerNameAction`, `resendConfirmationAction`, `signOutAction`. Todas validan en el servidor y devuelven errores en español sin revelar si un correo existe.
- **`proxy.ts`** (Next 16, sustituye a `middleware`) que solo refresca la sesión de Supabase en cada petición; no protege ninguna ruta.
- **Sesión real en `SessionProvider`**: respaldada por `supabase.auth` (`onAuthStateChange`) y el perfil. Conserva `user`, `isGuest`, `setName`, `playGuest`, `logout`; añade `isAuthenticated` y `needsPlayerName`. El invitado sigue usando `localStorage` (`arcade-vault:player-name`).
- **Puntuaciones ligadas a la cuenta**: columna `scores.user_id` (nullable). `saveScoreAction` lee al usuario de la sesión en el servidor; si tiene perfil, guarda con **su** nombre y su `user_id` ignorando el nombre enviado por el cliente.
- **Nombres reservados**: un invitado no puede guardar con un nombre que pertenece a un perfil (error claro en el modal de FIN DEL JUEGO). Se refuerza en base de datos con un trigger.
- **Integración**: navbar (usuario/estado y SALIR reales; aviso "ELIGE TU NOMBRE" si hay sesión sin perfil) y modal FIN DEL JUEGO de `play-room.tsx` (nombre fijo y no editable para cuentas con perfil).
- **Envío del correo de bienvenida**: módulo servidor `lib/email/welcome.ts` (`sendWelcomeEmail(to, playerName)`, texto + HTML simple con estilo de marca, sin imágenes externas) usando `resend` como en `app/api/contact/route.ts` y llamado desde `claimPlayerNameAction`. Nueva variable de entorno `RESEND_FROM_EMAIL` (opcional; por defecto `onboarding@resend.dev`).
- **Migración SQL** vía Supabase MCP (tabla, columna, políticas RLS, función y trigger).
- **Configuración manual en el panel de Supabase** (no es código, ver paso 1): Site URL, Redirect URLs, proveedores Google y GitHub, confirmación de correo activa.
- **Documentación**: actualizar `CLAUDE.md` (rutas, capa de datos, estado de sesión) y quitar los comentarios "no hay lógica de auth todavía" de `lib/supabase/`.

**Out of scope (para specs futuros):**

- Página `/profile`, cambiar nombre de jugador, cambiar correo/contraseña estando logueado, eliminar cuenta, avatar.
- Rutas privadas o protegidas: todo el sitio sigue público.
- Migrar o reclamar puntuaciones anteriores (siguen con `user_id` nulo; el histórico no se toca).
- Otros proveedores (Apple, Discord…), magic link, MFA/2FA.
- Anti-trampa y limitación de abuso propia (solo lo que ofrece Supabase; el insert directo sigue sin verificar que la puntuación sea legítima).
- Personalizar las plantillas del correo de confirmación/recuperación de Supabase y SMTP propio para ellas (se usan las plantillas y el remitente por defecto de Supabase; solo se revisa que el enlace funcione).
- Dominio verificado en Resend (ver riesgos): es un requisito externo para que el correo de bienvenida llegue a usuarios reales.
- Cola/reintentos del correo de bienvenida y correos posteriores (cambio de contraseña, avisos).
- Créditos (`credits-context`) ligados a la cuenta: siguen simulados en memoria.
- Roles/administración.

---

## 3 — Modelo de datos

```sql
-- Perfil: un nombre de jugador único por cuenta.
create table public.profiles (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  player_name text not null unique
              check (char_length(player_name) between 3 and 14
                     and player_name <> 'INVITADO'),
  created_at  timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- Cada usuario lee y crea solo su propia fila. Sin update/delete (renombrar: spec futuro).
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (user_id = (select auth.uid()));
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (user_id = (select auth.uid()));

-- Disponibilidad de un nombre (la usan invitados y usuarios nuevos sin leer perfiles ajenos).
create function public.is_player_name_available(p_name text)
returns boolean language sql security definer set search_path = '' stable as $$
  select not exists (select 1 from public.profiles where player_name = p_name)
$$;
grant execute on function public.is_player_name_available(text) to anon, authenticated;

-- Puntuaciones ligadas (opcionalmente) a una cuenta.
alter table public.scores
  add column user_id uuid references auth.users (id) on delete set null;
create index scores_user_id_idx on public.scores (user_id);

-- Reemplaza la política pública de insert: no se puede firmar como otro usuario.
-- (Se elimina la política de insert existente de scores y se crea esta.)
create policy "scores_insert_guest_or_self" on public.scores
  for insert to anon, authenticated
  with check (user_id is null or user_id = (select auth.uid()));

-- Identidad forzada en la base: con cuenta, el nombre es el del perfil;
-- sin cuenta, no puede usar un nombre reservado.
create function public.scores_enforce_identity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_name text;
begin
  if new.user_id is not null then
    select player_name into v_name from public.profiles where user_id = new.user_id;
    if v_name is null then raise exception 'profile_required'; end if;
    new.player_name := v_name;
  elsif exists (select 1 from public.profiles where player_name = new.player_name) then
    raise exception 'player_name_reserved';
  end if;
  return new;
end $$;
create trigger scores_enforce_identity before insert on public.scores
  for each row execute function public.scores_enforce_identity();
```

Organización del código nuevo de este spec: las **interfaces** viven en `lib/interfaces/` (`profile.ts`, `session.ts`, `auth.ts`) y las **constantes** en `lib/constants/` (`auth.ts`: límites de contraseña, mensajes y mapa de errores de Supabase en español). `lib/types.ts` no se amplía.

Interfaz en `lib/interfaces/profile.ts`:

```ts
export interface Profile {
  userId: string;
  playerName: string;
}
```

`SessionValue` (`lib/interfaces/session.ts`; la implementa `contexts/session-context.tsx`):

```ts
export interface SessionValue {
  user: string | null; // nombre de jugador de la cuenta, o el nombre de invitado recordado
  isAuthenticated: boolean; // hay sesión real de Supabase con perfil
  needsPlayerName: boolean; // hay sesión real pero aún no hay perfil
  isGuest: boolean;
  setName: (name: string) => void; // solo invitados
  playGuest: () => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>; // relee el perfil tras crearlo en /auth/player-name
}
```

`login(name)` desaparece (el acceso lo hacen las Server Actions). `refreshProfile` se añadió durante la implementación: `onAuthStateChange` no se dispara al insertar en `profiles`, así que `/auth/player-name` la llama tras crear el perfil para que el navbar se actualice. Rutas nuevas: `/auth/callback`, `/auth/check-email`, `/auth/player-name`, `/auth/forgot-password`, `/auth/reset-password`. Variable de entorno nueva: `RESEND_FROM_EMAIL` (opcional, servidor); `RESEND_API_KEY` ya existe (spec 04).

---

## 4 — Plan de implementación

1. **Configurar Supabase (manual, antes del código).** En el panel: Site URL (`http://localhost:3000` en desarrollo y la URL de producción) y Redirect URLs con `/auth/callback`; activar confirmación de correo; crear OAuth Apps de Google y GitHub y activar ambos proveedores con su client id/secret (secretos solo en el panel, nunca en el repo); longitud mínima de contraseña 8. Anotar si el correo de la cuenta de Resend coincide con el que se usará en las pruebas (sandbox, ver riesgos).
2. **Migración** con el Supabase MCP: todo el SQL del §3 en una migración (`apply_migration`). Después correr `get_advisors` (seguridad) y arreglar lo que reporte. Si `scores` ya tiene una política de insert, eliminarla en la misma migración.
3. **Capa Supabase**: `proxy.ts` (raíz) + helper `lib/supabase/proxy.ts` que refresca la sesión con `getClaims()`; leer antes `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`. Añadir `getProfile(userId)` y `isPlayerNameAvailable(name)` en `lib/supabase/queries.ts`. Actualizar los comentarios de `server.ts`/`client.ts`. El sitio sigue funcionando igual (aún sin pantallas nuevas).
4. **Server Actions y callback**: `app/auth/actions.ts` (lista del Scope) y `app/auth/callback/route.ts`. Reglas: tras acceso sin perfil → `/auth/player-name`; con perfil → `next` (solo rutas internas, validado) o `/`. `signUpAction` redirige a `/auth/check-email?email=…` aunque el correo ya exista; `resendConfirmationAction` aplica la misma respuesta neutra; `signInAction` usa un único mensaje genérico para credenciales inválidas. Traducir los errores de Supabase a español en un mapa central. Los fallos de OAuth o de un `error` del proveedor en el callback redirigen a `/auth?error=oauth` (además de `link-invalid`); `/auth` muestra un aviso para cada uno.
5. **Sesión real**: reescribir `contexts/session-context.tsx` con la interfaz del §3 (`onAuthStateChange` + lectura del perfil; hidratación sin desajuste, mismo patrón `useSyncExternalStore` para la parte de invitado). Ajustar `nav-bar.tsx` (usuario real, SALIR vía `logout`, enlace "ELIGE TU NOMBRE" si `needsPlayerName`).
6. **Pantallas** (con `/frontend-design`): reescribir `app/auth/page.tsx` y crear `check-email`, `player-name`, `forgot-password` y `reset-password`. Validación en línea con `lib/player-name.ts`, estados de carga/error, botones deshabilitados mientras se envía, `autoComplete` correcto en inputs, foco y `aria-live` en errores.
7. **Correo de bienvenida**: crear `lib/email/welcome.ts` y llamarlo desde `claimPlayerNameAction` después de crear el perfil (sin `await` bloqueante del resultado: captura cualquier error y no cambia la respuesta). Añadir `RESEND_FROM_EMAIL` a `.env.example` con el comentario del sandbox.
8. **Puntuaciones**: ampliar `saveScoreAction` (usuario de sesión → nombre del perfil y `user_id`; invitado con nombre reservado → "Ese nombre pertenece a un jugador registrado."; mapear `profile_required`/`player_name_reserved` del trigger). En `play-room.tsx`, campo de nombre bloqueado para cuentas con perfil y mensaje de nombre reservado para invitados; sin tocar motores, skins ni mando táctil.
9. **Documentación y verificación**: actualizar `CLAUDE.md`, `npm run lint`, `npm run build` y la verificación manual de los criterios de aceptación.

---

## 5 — Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] La migración está aplicada y `get_advisors` (seguridad) no reporta tablas sin RLS ni funciones inseguras nuevas.
- [ ] Registrarse con email + contraseña lleva a `/auth/check-email` mostrando el correo usado; sin confirmar el enlace no se puede iniciar sesión.
- [ ] En `/auth/check-email`, "REENVIAR CORREO" envía otro enlace, queda deshabilitado 60 s con cuenta regresiva y muestra mensaje de éxito; un fallo de envío muestra un error sin romper la pantalla.
- [ ] Abrir un enlace de confirmación vencido o ya usado lleva a `/auth` con un aviso claro, sin pantalla de error de Next.
- [ ] Tras confirmar el correo, el enlace lleva a `/auth/player-name`; al elegir un nombre válido y libre se crea el perfil y se redirige a `/`.
- [ ] Al crear el perfil se envía un correo de bienvenida a la dirección de la cuenta con su nombre de jugador y enlace a `/games` (con la cuenta de pruebas permitida por el sandbox de Resend); si Resend falla o falta la key, la cuenta se crea igual y el usuario no ve error.
- [ ] El correo de bienvenida se envía una sola vez por cuenta (no al volver a iniciar sesión ni al recargar `/auth/player-name`).
- [ ] Un nombre ya usado por otra cuenta se rechaza con mensaje claro; `INVITADO`, nombres de <3 o >14 caracteres y caracteres no permitidos se rechazan.
- [ ] Iniciar sesión con credenciales incorrectas muestra un único mensaje genérico (no distingue correo inexistente de contraseña errónea).
- [ ] Con Google y con GitHub (proveedores configurados) se inicia sesión y, si es el primer acceso, se pasa por `/auth/player-name`.
- [ ] "¿Olvidaste tu contraseña?" envía un enlace que lleva a `/auth/reset-password`; tras fijar la nueva contraseña se puede entrar con ella y no con la anterior.
- [ ] Recargar la página mantiene la sesión; SALIR la cierra y el navbar vuelve a mostrar INICIAR SESIÓN.
- [ ] El navbar muestra el nombre de jugador de la cuenta; con sesión sin perfil muestra "ELIGE TU NOMBRE" y no rompe nada.
- [ ] Una puntuación guardada estando logueado queda en `scores` con `user_id` y con el nombre del perfil, aunque el cliente envíe otro nombre.
- [ ] En FIN DEL JUEGO, un usuario con perfil ve su nombre fijo; un invitado que escribe el nombre de un perfil recibe el error de nombre reservado y no se inserta la fila.
- [ ] Un insert directo a `scores` (REST) con `user_id` ajeno es rechazado por RLS, y con nombre reservado y `user_id` nulo es rechazado por el trigger.
- [ ] Jugar como invitado y guardar con un nombre libre sigue funcionando igual que antes; `/hall-of-fame` (GENERAL, MIS PARTIDAS) funciona sin cambios.
- [ ] `/auth` y las pantallas nuevas se ven y operan bien en móvil (375 px), escritorio y en tema claro y oscuro.
- [ ] No hay secretos nuevos en el repo y `.env.example` sigue siendo suficiente.

---

## 6 — Decisiones tomadas y descartadas

- **Supabase Auth con email + contraseña, Google y GitHub** (elegido) frente a solo email o solo magic link: se pidió el registro clásico más acceso social. El spec crece, pero las tres vías comparten el mismo flujo de perfil.
- **El nombre de jugador se elige en un paso común tras el primer acceso** (`/auth/player-name`) y no en el formulario de registro: es la única forma uniforme para OAuth, evita crear usuarios con nombre ya tomado en el momento de confirmar el correo y mantiene una sola ruta de validación. Descartado: nombre derivado del correo (expone datos, no es único) y nombre automático del proveedor (requeriría pantalla de edición).
- **Nombre único y reservado en base de datos** (`unique` + trigger) y no solo en la Server Action: el insert a `scores` es público por la publishable key, así que la regla debe vivir donde no se pueda saltar.
- **Invitado permitido; histórico intacto** (elegido) frente a obligar login o reclamar partidas antiguas: no añade fricción al flujo del spec 12 y evita suplantaciones por el nombre no único del pasado.
- **Sin rutas privadas**: no hay contenido que proteger todavía; `proxy.ts` solo refresca la sesión.
- **Confirmación de correo obligatoria** (elegido) frente a registro inmediato: evita correos falsos o ajenos. Se añade pantalla propia `/auth/check-email` con reenvío porque, sin ella, quien no recibe el correo no tiene forma de continuar.
- **Correo de bienvenida con Resend, al crear el perfil** (no al registrarse): es el momento en que la cuenta está realmente completa, es igual para email y OAuth, y reutiliza Resend (spec 04) sin tocar las plantillas de Supabase. Es best-effort para que un fallo de correo no bloquee el registro. Descartado: enviarlo con un trigger/Edge Function de Supabase (más piezas fuera del repo).
- **`SessionProvider` conserva su API** (en vez de crear un contexto nuevo) para no tocar navbar, play-room y hall-of-fame más de lo necesario; `login(name)` se elimina porque ya no tiene sentido.
- **Server Actions para el acceso** (cookies de sesión gestionadas por `@supabase/ssr` en el servidor, PKCE) en lugar de llamadas desde el cliente.
- **Sesión visible en el navbar y sincronizada tras accesos por Server Action** (corrección posterior a la implementación): los accesos por Server Action terminan en navegación suave y el cliente no se enteraba de las cookies nuevas, así que `SessionProvider` relee la sesión (`getSession()`) en cada cambio de ruta y desde `refreshProfile`. El navbar muestra un chip con avatar, nombre y estado (`SESIÓN ACTIVA` o `INVITADO`) con un botón SALIR visible; en móvil, un avatar en la barra y, en el menú, el bloque "Sesión iniciada como NOMBRE" con SALIR de ancho completo.
- **Una cuenta por correo; `/auth/player-name` muestra con cuál se entró** (corrección posterior a la implementación): dos correos de Google son dos usuarios distintos y cada uno necesita su propio nombre único; quien entra con una cuenta sin perfil ve la pantalla de nombre y `FERNANDO`, por ejemplo, aparece "en uso" si lo tiene la otra cuenta. La pantalla enseña el correo de la sesión y un enlace "Usar otra cuenta" (cierra sesión y vuelve a `/auth`). Además, `getProfile`/`isPlayerNameAvailable` aceptan el cliente de Supabase ya creado en la petición para ver la misma sesión (p. ej. tras `exchangeCodeForSession` en el callback).
- **Navbar identifica la sesión sin perfil y muestra la foto de la cuenta** (corrección posterior a la implementación): con sesión pero sin nombre el navbar enseña el correo con la etiqueta `SIN NOMBRE`, y `/auth/player-name` explica que la cuenta ya existe y sugiere nombres libres cuando el elegido está en uso. El avatar del navbar es un círculo con la foto que Google/GitHub ya incluyen en la sesión (`user_metadata.avatar_url`/`picture`, solo lectura, sin subir ni editar fotos); sin foto, o si no carga, muestra la inicial en el mismo círculo. Subir o cambiar el avatar sigue fuera de alcance.
- **El login social siempre pregunta con qué cuenta entrar** (`prompt=select_account`): sin ello Google reutiliza la cuenta abierta en el navegador y es fácil entrar con un correo distinto del que tiene el nombre de jugador.
- **Cuentas con perfil no pueden renombrarse** en este spec: renombrar afecta al ranking histórico y merece su propio diseño.

---

## 7 — Riesgos identificados

- **Spec grande** (BD, rutas, sesión, puntuaciones, UI). Si durante la implementación crece demasiado, el primer recorte natural es sacar Google/GitHub a un spec propio; el resto no depende de ellos.
- **Fusión visual de historial**: un nombre con puntuaciones antiguas de invitado puede ser registrado después por otra persona y sus partidas previas (mismo `player_name`) aparecerán junto a las suyas en los rankings agrupados por nombre. Se acepta; el histórico no se reescribe.
- **Sandbox de Resend**: sin dominio verificado, `onboarding@resend.dev` solo entrega al correo con el que se creó la cuenta de Resend; el correo de bienvenida **no llegará a usuarios reales** hasta verificar un dominio y fijar `RESEND_FROM_EMAIL`. Resend responderá `ok` sin entregar a otras direcciones, así que la prueba end-to-end se hace con el correo dueño de la cuenta.
- **Correo por defecto de Supabase** tiene límite bajo de envíos por hora; puede fallar en pruebas repetidas. Mitigación: usuarios de prueba reutilizados; SMTP propio queda para otro spec.
- **Configuración fuera del repo** (proveedores OAuth, redirect URLs): si falta o no coincide con la URL real, el login social y los enlaces de correo fallan. Por eso es el paso 1.
- **Sesión sin perfil** (el usuario cierra la pestaña en `/auth/player-name`): queda logueado sin nombre; se trata como invitado para jugar y el navbar le recuerda elegir nombre.
- **Hidratación**: leer la sesión de Supabase en el primer render provoca desajustes o la regla `react-hooks/set-state-in-effect`; el estado inicial del servidor debe ser "sin sesión".
- **Next 16**: `middleware` se llama `proxy` y las APIs de request son asíncronas; leer la documentación local antes de escribir `proxy.ts` y el callback.
