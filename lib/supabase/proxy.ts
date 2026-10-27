import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedAt, isSessionExpired, safeNext } from "@/lib/auth";
import { PROTECTED_ROUTES } from "@/lib/constants/auth";

// Refresca la sesión, limita su antigüedad y protege solo los pasos de cuenta
// (specs 21 y 23). Los juegos y el resto del sitio siguen siendo públicos.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          const previousCookies = response.cookies.getAll();
          response = NextResponse.next({ request });
          for (const cookie of previousCookies) {
            response.cookies.set(cookie);
          }
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // No poner código entre createServerClient y getClaims: dispara el refresco.
  const { data, error } = await supabase.auth.getClaims();
  const claims = error ? null : data?.claims;
  const expired =
    !!claims &&
    isSessionExpired(getAuthenticatedAt(claims.amr), Date.now() / 1000);
  const { pathname, search } = request.nextUrl;
  const protectedRoute = PROTECTED_ROUTES.includes(pathname);
  const authRoute = pathname === "/auth" || pathname.startsWith("/auth/");

  if (expired) {
    // Solo esta sesión: no cerrar los otros dispositivos del jugador.
    await supabase.auth.signOut({ scope: "local" });
    // Las Server Actions deben recibir las cookies borradas y seguir como invitado.
    if (request.method !== "GET") return response;
  }

  if (
    (expired && (!authRoute || protectedRoute)) ||
    (protectedRoute && !claims)
  ) {
    const url = new URL("/auth", request.url);
    if (expired) url.searchParams.set("error", "session-expired");
    const next = safeNext(pathname + search);
    if (next) url.searchParams.set("next", next);
    const redirect = NextResponse.redirect(url);
    // Incluye tanto el refresco como el borrado; sin esto reaparecería la sesión.
    for (const cookie of response.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    return redirect;
  }

  return response;
}
