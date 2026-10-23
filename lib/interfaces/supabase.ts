import type { createClient } from "@/lib/supabase/server";

// Cliente de Supabase del servidor ya creado en la petición (spec 21). Las
// consultas del flujo de acceso lo reutilizan para ver la misma sesión.
export type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
