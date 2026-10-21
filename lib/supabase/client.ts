import { createBrowserClient } from "@supabase/ssr";

// Cliente de Supabase para componentes "use client". El acceso (login, registro)
// va por Server Actions; aquí se usa para leer la sesión (spec 21).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
