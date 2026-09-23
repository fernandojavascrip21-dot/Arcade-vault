// Color de rango: oro / plata / bronce / gris. Tokens CSS (app/globals.css)
// para que respondan al tema claro/oscuro en vez de un hex fijo.
export function rankColor(index: number): string {
  if (index === 0) return "var(--amarillo)";
  if (index === 1) return "var(--rango-plata)";
  if (index === 2) return "var(--rango-bronce)";
  return "var(--rango-gris)";
}
