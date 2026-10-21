import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { ResendForm } from "@/components/auth/resend-form";

export default async function CheckEmailPage({
  searchParams,
}: PageProps<"/auth/check-email">) {
  const params = await searchParams;
  const email = typeof params.email === "string" ? params.email.trim() : "";

  return (
    <AuthCard title="REVISA TU CORREO">
      {email ? (
        <>
          <p className="text-center text-[14px] leading-relaxed text-foreground">
            Enviamos un enlace de confirmación a
            <span className="mt-2 block break-all font-bold text-amarillo">
              {email}
            </span>
          </p>
          <p className="text-center text-[12px] leading-relaxed text-texto-tenue">
            Ábrelo para activar tu cuenta. Si no lo ves, mira en spam.
          </p>
          <ResendForm email={email} startCooling />
          <Link
            href="/auth"
            className="text-center text-[12px] uppercase tracking-[2px] text-texto-tenue transition-colors hover:text-cian"
          >
            ¿Te equivocaste de correo? Volver
          </Link>
        </>
      ) : (
        <>
          <p className="text-center text-[14px] leading-relaxed text-foreground">
            No sabemos a qué correo enviar el enlace. Vuelve a registrarte o
            escribe tu correo para recibir uno nuevo.
          </p>
          <ResendForm />
          <Link
            href="/auth"
            className="text-center text-[12px] uppercase tracking-[2px] text-texto-tenue transition-colors hover:text-cian"
          >
            Volver
          </Link>
        </>
      )}
    </AuthCard>
  );
}
