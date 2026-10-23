import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { createClient } from "@/lib/supabase/server";

import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    return (
      <AuthCard title="ENLACE NO VÁLIDO">
        <p className="text-center text-[13px] leading-relaxed text-texto-tenue">
          El enlace venció o ya se usó. Pide uno nuevo para cambiar tu
          contraseña.
        </p>
        <Link
          href="/auth/forgot-password"
          className="border border-cian bg-cian p-4 text-center font-display text-[11px] text-[#0a0a0f] transition-shadow hover:shadow-[0_0_30px_rgba(0,245,255,.6)] active:scale-95"
        >
          PEDIR NUEVO ENLACE
        </Link>
      </AuthCard>
    );
  }

  return <ResetPasswordForm />;
}
