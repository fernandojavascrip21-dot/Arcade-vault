# SPEC 05 — Integración base de Supabase

> **Status:** Implementado
> **Depends on:** SPEC 01
> **Date:** 2026-09-14
> **Objective:** Conectar el proyecto a Supabase instalando el SDK y creando el cliente de navegador y el de servidor, sin middleware ni cambios a la autenticación simulada ni a ninguna otra funcionalidad existente.

---

## 1 — Por qué existe este spec

El proyecto de Supabase (`mfbnebhnhcbyaniksqav`) ya está vinculado a este repo (MCP conectado) pero el código de la app no tiene ningún cliente de Supabase — no hay paquete instalado ni archivo que lo use. Hoy `app/auth/page.tsx` sigue siendo una demo 100% local (comentario explícito en el archivo: _"Demo local. Aquí conectaría el backend real (REST o Supabase) para sesiones y puntuaciones sincronizadas."_), y el esquema `public` de Supabase no tiene ninguna tabla.

Este spec es deliberadamente pequeño: solo deja la conexión lista y verificada (paquetes, variables de entorno, cliente de navegador y cliente de servidor), para que un spec futuro (autenticación real, y más adelante catálogo/rankings) construya sobre una base ya probada, sin mezclar "conectar Supabase" con "cambiar cómo funciona el login". El middleware de sesión (para refrescar cookies en cada request) queda fuera: no hay todavía ningún uso de sesión real que lo necesite.

---

## 2 — Scope

**In:**

- Paquetes nuevos `@supabase/supabase-js` y `@supabase/ssr` en `package.json`.
- Variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`:
  - Documentadas con valor vacío en `.env.example` (commiteado), con un comentario indicando que son claves públicas (van al bundle del navegador por diseño, a diferencia de `RESEND_API_KEY`).
  - Con los valores reales del proyecto ya conectado en `.env.local` (ignorado por git):
    - `NEXT_PUBLIC_SUPABASE_URL=https://mfbnebhnhcbyaniksqav.supabase.co`
    - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable__zJVyz2lpUHoejbzQjNbrQ_wm2HXe9n`
  - `SUPERBASE_DB_PASSWORD` (ya existente en `.env.example`/`.env.local`) no se toca ni se usa en este spec — es para conexión directa a Postgres/CLI, no para el SDK.
- Clientes de Supabase (patrón oficial de Next.js App Router, sin la parte de middleware):
  - `lib/supabase/client.ts`: `createBrowserClient` (cliente de navegador), lee las dos variables públicas.
  - `lib/supabase/server.ts`: función async `createClient()` con `createServerClient` usando `cookies()` de `next/headers` (cliente de servidor, para Server Components y Route Handlers).
- Verificación de conectividad real contra el proyecto: durante la implementación, confirmar con un script o llamada puntual (no comiteada como archivo nuevo de la app) que `createClient().auth.getSession()` resuelve sin error de red/URL/clave contra `mfbnebhnhcbyaniksqav.supabase.co`.

**Out of scope (para specs futuros):**

- Middleware de sesión (`middleware.ts` en la raíz, refresco de cookies en cada request). Se añade cuando exista sesión real que necesite mantenerse fresca en Server Components.
- Cualquier cambio a `contexts/session-context.tsx`, `app/auth/page.tsx`, `components/nav-bar.tsx` o al flujo de login/registro/invitado — sigue siendo la demo simulada actual, sin usar los clientes creados aquí. Va en un spec de autenticación aparte.
- Rutas protegidas / redirects por falta de sesión.
- Cualquier tabla nueva en el esquema `public` de Supabase (no hay auth real todavía que la necesite).
- Mover `app/data.ts` (catálogo) o `lib/scores.ts`/rankings a Supabase.
- OAuth (Google/GitHub), confirmación por correo, recuperación de contraseña — todo lo relacionado con el flujo de auth en sí.

---

## 3 — Modelo de datos

Este spec no introduce ninguna tabla ni estructura de dominio nueva — el esquema `public` de Supabase sigue teniendo cero tablas al terminar. Solo agrega funciones factoría de cliente:

```ts
// lib/supabase/client.ts
export function createClient(): SupabaseClient; // uso en componentes "use client"

// lib/supabase/server.ts
export async function createClient(): Promise<SupabaseClient>; // uso en Server Components / Route Handlers
```

Ningún componente existente las importa todavía; quedan disponibles para que un spec futuro las use.

---

## 4 — Plan de implementación

1. **Dependencias y variables de entorno.** `npm install @supabase/supabase-js @supabase/ssr`. Añadir a `.env.example` (commiteado) `NEXT_PUBLIC_SUPABASE_URL=` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=` vacías, con un comentario indicando que son claves públicas. Añadir a `.env.local` (ignorado por git) los valores reales listados en la sección 2. Sistema funcional: nada cambia en runtime todavía. Verificación: `npm run dev` sigue arrancando sin errores.
2. **Clientes de Supabase.** Crear `lib/supabase/client.ts` (`createBrowserClient`) y `lib/supabase/server.ts` (`createClient` async con `createServerClient` y `cookies()` de `next/headers`), ambos leyendo `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Aún no se importan en ningún componente. Verificación: con un script puntual (p. ej. `npx tsx` o un `console.log` temporal desde una página, revertido después) confirmar que `createClient().auth.getSession()` resuelve `{ data: { session: null }, error: null }` sin lanzar excepción — prueba de que la URL y la clave son válidas y el proyecto responde. `npm run build` sigue pasando.
3. **Remate.** `npm run build` y `npm run lint` sin errores ni warnings nuevos. Confirmar que `contexts/session-context.tsx`, `app/auth/page.tsx` y `components/nav-bar.tsx` no tienen ningún cambio (siguen usando la sesión simulada). Confirmar que el esquema `public` de Supabase sigue teniendo cero tablas. Si `next dev` regenera el bloque `<!-- BEGIN:nextjs-agent-rules -->` de `AGENTS.md`, commitearlo junto al resto.

---

## 5 — Criterios de aceptación

- [ ] `@supabase/supabase-js` y `@supabase/ssr` aparecen como dependencias en `package.json`.
- [ ] `.env.example` documenta `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` con valores vacíos; `.env.local` tiene los valores reales del proyecto conectado.
- [ ] `lib/supabase/client.ts` exporta un `createClient()` que se puede llamar desde un componente `"use client"` sin lanzar error.
- [ ] `lib/supabase/server.ts` exporta un `createClient()` async que se puede llamar desde un Server Component o Route Handler sin lanzar error.
- [ ] Se verificó (durante la implementación, con un script o llamada puntual) que `createClient().auth.getSession()` responde sin error de red contra el proyecto real de Supabase.
- [ ] No existe `middleware.ts` en la raíz del proyecto ni `lib/supabase/middleware.ts` — quedan fuera de este spec.
- [ ] `contexts/session-context.tsx`, `app/auth/page.tsx` y `components/nav-bar.tsx` quedan sin modificar — la sesión sigue siendo simulada.
- [ ] El esquema `public` del proyecto de Supabase sigue teniendo cero tablas al terminar este spec.
- [ ] `npm run build` y `npm run lint` terminan sin errores ni warnings nuevos.

---

## 6 — Decisiones tomadas y descartadas

- **Sí:** limitar este spec a la conexión base (paquetes, cliente de navegador, cliente de servidor), sin tocar autenticación. Motivo: decisión explícita del usuario — el objetivo es instalar y configurar el SDK como infraestructura de base para specs futuros, no cambiar el comportamiento de la app todavía.
- **No:** middleware de sesión (`middleware.ts` / `lib/supabase/middleware.ts`). Motivo: decisión explícita del usuario ("solo quiero crear la conexión") — se añade en el spec de autenticación, cuando haya una sesión real que refrescar en cada request.
- **Sí:** `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (formato moderno `sb_publishable_...`) en vez de la `anon key` legacy. Motivo: es la clave recomendada por Supabase para proyectos nuevos.
- **No:** crear ninguna tabla en `public`. Motivo: no hay todavía ninguna funcionalidad (auth real, catálogo, rankings) que la necesite en este spec.
- **No:** tocar `contexts/session-context.tsx` o `app/auth/page.tsx`. Motivo: decisión explícita del usuario — eso es un spec aparte, de autenticación.

---

## 7 — Riesgos identificados

| Riesgo                                                                                                    | Mitigación                                                                                                                                                                                     |
| --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sin un flujo de auth real todavía, no hay una forma "natural" de la app de probar la conexión end-to-end. | El paso 2 del plan incluye una verificación puntual (script o llamada temporal) que confirma que las credenciales y la URL son válidas contra el proyecto real, independiente de cualquier UI. |

---

## Lo que **no** entra en este spec

- Middleware de sesión (`middleware.ts`, `lib/supabase/middleware.ts`).
- Autenticación real (login/registro/logout contra Supabase) — sigue siendo la demo simulada actual.
- OAuth (Google/GitHub), confirmación por correo, recuperación de contraseña.
- Rutas protegidas.
- Cualquier tabla nueva en Supabase.
- Migrar el catálogo de juegos (`app/data.ts`) o los rankings/puntuaciones a Supabase.

Cada uno de estos, si se aborda, va en su propio spec.
