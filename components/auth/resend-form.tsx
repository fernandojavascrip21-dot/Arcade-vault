"use client";

import { useActionState, useEffect, useState } from "react";

import { resendConfirmationAction } from "@/app/auth/actions";
import {
  INITIAL_AUTH_STATE,
  RESEND_COOLDOWN_SECONDS,
} from "@/lib/constants/auth";
import type { AuthFormState, ResendFormProps } from "@/lib/interfaces/auth";

import { AuthField } from "./auth-field";
import { FormMessage } from "./form-message";
import { SubmitButton } from "./submit-button";

// Reenvío del correo de confirmación con espera entre envíos.
export function ResendForm({ email, startCooling = false }: ResendFormProps) {
  const [secondsLeft, setSecondsLeft] = useState(
    startCooling ? RESEND_COOLDOWN_SECONDS : 0,
  );

  const [state, formAction] = useActionState(
    async (prev: AuthFormState, formData: FormData) => {
      const result = await resendConfirmationAction(prev, formData);
      if (result.ok) setSecondsLeft(RESEND_COOLDOWN_SECONDS);
      return result;
    },
    INITIAL_AUTH_STATE,
  );

  const cooling = secondsLeft > 0;
  useEffect(() => {
    if (!cooling) return;
    const id = setInterval(
      () => setSecondsLeft((s) => Math.max(0, s - 1)),
      1000,
    );
    return () => clearInterval(id);
  }, [cooling]);

  return (
    <form action={formAction} className="grid gap-4">
      {email ? (
        <input type="hidden" name="email" value={email} />
      ) : (
        <AuthField
          label="Correo electrónico"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="tu@correo.com"
          required
        />
      )}
      <FormMessage error={state.error} message={state.message} />
      <SubmitButton pendingText="ENVIANDO…" disabled={cooling}>
        {cooling ? `REENVIAR EN ${secondsLeft} S` : "REENVIAR CORREO"}
      </SubmitButton>
    </form>
  );
}
