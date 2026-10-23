import { NextResponse } from "next/server";
import { safeNext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/queries";

// Destino tras abrir un enlace de correo o volver de OAuth (spec 21).
// Intercambia el `code` (PKCE) por la sesión y redirige; nunca muestra la
// pantalla de error de Next.
export async function GET(request: Request): Promise<Response> {
  const { searchParams, origin } = new URL(request.url);

  // Detrás de un proxy/CDN el origen público viene en x-forwarded-host.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const base =
    process.env.NODE_ENV !== "development" && forwardedHost
      ? `https://${forwardedHost}`
      : origin;
  const to = (path: string) => NextResponse.redirect(`${base}${path}`);

  if (searchParams.get("error")) return to("/auth?error=oauth");

  const code = searchParams.get("code");
  if (!code) return to("/auth?error=link-invalid");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return to("/auth?error=link-invalid");

  const next = safeNext(searchParams.get("next"));
  // La recuperación de contraseña va directa a fijar la nueva.
  if (next?.startsWith("/auth/reset-password")) return to(next);

  try {
    const profile = await getProfile(data.user.id, supabase);
    if (!profile) return to("/auth/player-name");
  } catch {
    return to(next ?? "/");
  }
  return to(next ?? "/");
}
