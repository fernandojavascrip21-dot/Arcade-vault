import { NextResponse } from "next/server";
import { safeNext } from "@/lib/auth";
import { getSiteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/queries";

// Destino tras abrir un enlace de correo o volver de OAuth (spec 21).
// Intercambia el `code` (PKCE) por la sesión y redirige; nunca muestra la
// pantalla de error de Next.
export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);

  // Origen público fijo (spec 24): nunca se confía en Host ni x-forwarded-*.
  let base: string;
  try {
    base = getSiteUrl();
  } catch (err) {
    console.error("[auth/callback] SITE_URL:", err);
    // Sin origen válido: Location relativo, nunca otro host.
    return new Response(null, {
      status: 307,
      headers: { Location: "/auth?error=oauth" },
    });
  }
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
