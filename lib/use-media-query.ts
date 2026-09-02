"use client";

import { useSyncExternalStore } from "react";

// Hook SSR-safe para media queries. Nunca toca `window` durante el render en
// servidor: el snapshot de servidor devuelve `false` y React re-renderiza en
// cliente si la query realmente casa.
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
