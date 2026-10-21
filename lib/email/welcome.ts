import { Resend } from "resend";

const DEFAULT_FROM = "onboarding@resend.dev";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Correo de bienvenida al crear el perfil (spec 21). Best effort: nunca lanza;
// si falta la key o Resend falla, solo se registra el error en el servidor.
// `siteUrl` es el origen público para el enlace a /games.
export async function sendWelcomeEmail(
  to: string,
  playerName: string,
  siteUrl: string,
): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("[welcome-email] Falta RESEND_API_KEY: no se envía.");
      return;
    }

    const gamesUrl = `${siteUrl.replace(/\/$/, "")}/games`;
    const name = escapeHtml(playerName);

    const text = [
      `¡Bienvenido a Arcade Vault, ${playerName}!`,
      "",
      "Tu cuenta está lista. Este es el nombre con el que aparecerás en los rankings.",
      "",
      `Elige un juego y empieza a sumar puntos: ${gamesUrl}`,
    ].join("\n");

    const html = `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:24px;background:#0a0a0f;font-family:'Courier New',monospace;color:#cdd8de;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;border:1px solid #00f5ff;background:#0a0a0f;">
      <tr><td style="padding:28px 24px;text-align:center;">
        <div style="font-size:20px;letter-spacing:3px;color:#00f5ff;">ARCADE<span style="color:#ff006e;">VAULT</span></div>
        <p style="margin:24px 0 8px;font-size:14px;color:#cdd8de;">Tu cuenta está lista. Te vas a ver en los rankings como:</p>
        <p style="margin:0 0 24px;font-size:22px;letter-spacing:4px;color:#f5ff00;">${name}</p>
        <a href="${gamesUrl}" style="display:inline-block;padding:14px 22px;background:#00f5ff;color:#0a0a0f;text-decoration:none;font-weight:bold;letter-spacing:2px;">ELEGIR UN JUEGO</a>
        <p style="margin:24px 0 0;font-size:12px;color:#6f7d88;">Si el botón no funciona, abre ${gamesUrl}</p>
      </td></tr>
    </table>
  </body>
</html>`;

    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || DEFAULT_FROM,
      to,
      subject: `Bienvenido a Arcade Vault, ${playerName}`,
      text,
      html,
    });
    if (error) console.error("[welcome-email] Resend:", error.message);
  } catch (err) {
    console.error("[welcome-email]", err);
  }
}
