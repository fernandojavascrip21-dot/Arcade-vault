// Origen público fijo del sitio (spec 24). Solo servidor: los enlaces de correo,
// OAuth y la bienvenida nunca se arman con cabeceras de la petición.

const DEV_SITE_URL = "http://localhost:3000";

// Devuelve el origen sin ruta ni "/" final. Fuera de development falla cerrado
// (lanza) si SITE_URL falta o no es una URL https válida.
export function getSiteUrl(): string {
  const raw = process.env.SITE_URL?.trim();
  const isDev = process.env.NODE_ENV === "development";

  if (!raw) {
    if (isDev) return DEV_SITE_URL;
    throw new Error("Falta SITE_URL: no se pueden construir enlaces públicos.");
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    if (isDev) return DEV_SITE_URL;
    throw new Error("SITE_URL no es una URL válida.");
  }

  const allowed = url.protocol === "https:" || (isDev && url.protocol === "http:");
  if (!allowed) {
    if (isDev) return DEV_SITE_URL;
    throw new Error("SITE_URL debe usar https.");
  }
  return url.origin;
}
