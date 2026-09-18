// Color de rango: oro / plata / bronce / gris.
export function rankColor(index: number): string {
  if (index === 0) return "#f5ff00";
  if (index === 1) return "#cfd8dc";
  if (index === 2) return "#ff8a00";
  return "#4f5b64";
}
