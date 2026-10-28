"use client";

import Link from "next/link";
import { useActionState } from "react";

import { updatePasswordAction } from "@/app/auth/actions";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthField } from "@/components/auth/auth-field";
import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import {
  AUTH_ERRORS,
  INITIAL_AUTH_STATE,
  PASSWORD_RULE_HINT,
} from "@/lib/constants/auth";

export function ResetPasswordForm() {
  const [state, formAction] = useActionState(
    updatePasswordAction,
    INITIAL_AUTH_STATE,
  );

  return (
    <AuthCard title="NUEVA CONTRASEÑA">
      <form action={formAction} className="grid gap-4">
        <AuthField
          label="Contraseña nueva"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          required
        />
        <AuthField
          label="Repite la contraseña"
          name="confirm"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          required
        />
        <p className="-mt-2 text-[11px] text-texto-debil">
          {PASSWORD_RULE_HINT}
        </p>
        <FormMessage error={state.error} />
        {state.error === AUTH_ERRORS.reauthentication_needed && (
          <Link
            href="/auth/forgot-password"
            className="text-center text-[12px] text-cian underline"
          >
            PEDIR ENLACE NUEVO
          </Link>
        )}
        <SubmitButton pendingText="GUARDANDO…">GUARDAR CONTRASEÑA</SubmitButton>
      </form>
    </AuthCard>
  );
}
