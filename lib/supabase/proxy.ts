import { createServerClient } from "@supabase/ssr";
import { appendFileSync } from "node:fs";
import { NextResponse, type NextRequest } from "next/server";

// Refresca la sesión de Supabase en cada petición (spec 21). No protege rutas:
// solo renueva el token y reescribe las cookies en la request y la response.
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
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // No poner código entre createServerClient y getClaims: dispara el refresco.
  const { data: tmpClaims } = await supabase.auth.getClaims();
  // TEMP spec 23 paso 1 (borrar): verifica que amr[].timestamp se conserva al refrescar.
  if (tmpClaims) {
    appendFileSync(
      "/private/tmp/claude-501/spec23-amr.log",
      JSON.stringify({
        path: request.nextUrl.pathname,
        iat: tmpClaims.claims.iat,
        exp: tmpClaims.claims.exp,
        amr: tmpClaims.claims.amr,
        session_id: tmpClaims.claims.session_id,
        at: new Date().toISOString(),
      }) + "\n",
    );
  }

  return response;
}
