import { Resend } from "resend";

type ContactPayload = { name: string; email: string; msg: string };
type ContactResponse = { ok: true } | { ok: false; error: string };

function json(body: ContactResponse, status: number): Response {
  return Response.json(body, { status });
}

export async function POST(req: Request): Promise<Response> {
  let payload: Partial<ContactPayload>;
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, error: "Cuerpo de la petición inválido." }, 400);
  }

  const name = payload.name?.trim();
  const email = payload.email?.trim();
  const msg = payload.msg?.trim();

  if (!name || !email || !msg) {
    return json({ ok: false, error: "Faltan campos obligatorios." }, 400);
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  if (!apiKey || !to) {
    return json(
      { ok: false, error: "El servidor no tiene configurado el envío de correo." },
      500,
    );
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to,
      replyTo: email,
      subject: `Nuevo mensaje de contacto — Arcade Vault (${name})`,
      text: `Nombre: ${name}\nCorreo: ${email}\n\nMensaje:\n${msg}`,
    });

    if (error) {
      return json({ ok: false, error: error.message }, 500);
    }

    return json({ ok: true }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido enviando el correo.";
    return json({ ok: false, error: message }, 500);
  }
}
