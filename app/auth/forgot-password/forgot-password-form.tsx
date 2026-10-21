"use client";

import Link from "next/link";
import { useActionState } from "react";

import { requestPasswordResetAction } from "@/app/auth/actions";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthField } from "@/components/auth/auth-field";
import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { INITIAL_AUTH_STATE } from "@/lib/constants/auth";

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(
    requestPasswordResetAction,
    INITIAL_AUTH_STATE,
  );

  return (
    <AuthCard title="RECUPERA TU CONTRASEÑA">
      <p className="text-center text-[13px] leading-relaxed text-texto-tenue">
        Escribe el correo de tu cuenta y te enviaremos un enlace para elegir una
        contraseña nueva.
      </p>
      <form action={formAction} className="grid gap-4">
        <AuthField
          label="Correo electrónico"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="tu@correo.com"
          required
        />
        <FormMessage error={state.error} message={state.message} />
        <SubmitButton pendingText="ENVIANDO…">ENVIAR ENLACE</SubmitButton>
      </form>
      <Link
        href="/auth"
        className="text-center text-[12px] uppercase tracking-[2px] text-texto-tenue transition-colors hover:text-cian"
      >
        Volver a iniciar sesión
      </Link>
    </AuthCard>
  );
}
