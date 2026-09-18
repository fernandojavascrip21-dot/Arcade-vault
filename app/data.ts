// Lista de filtro de UI (categorías del catálogo). El catálogo y los rankings
// en sí viven en Supabase (lib/supabase/queries.ts) desde el spec 07.

import type { CategoryLabel } from "@/lib/types";

export const CATEGORIES: CategoryLabel[] = [
  "Todos",
  "Acción",
  "Clásico",
  "Espacio",
  "Puzzle",
];
