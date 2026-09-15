import { createBrowserClient } from "@supabase/ssr";

// Cliente de Supabase para componentes "use client". No hay lógica de auth
// todavía — ningún componente lo usa aún (ver spec 05).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
