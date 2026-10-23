"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

import {
  signInAction,
  signInWithProviderAction,
  signUpAction,
} from "@/app/auth/actions";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthField } from "@/components/auth/auth-field";
import { FormMessage } from "@/components/auth/form-message";
import { GitHubIcon, GoogleIcon } from "@/components/auth/provider-icons";
import { ResendForm } from "@/components/auth/resend-form";
import { SubmitButton } from "@/components/auth/submit-button";
import { useSession } from "@/contexts/session-context";
import {
  INITIAL_AUTH_STATE,
  OAUTH_PROVIDERS,
  PASSWORD_RULE_HINT,
} from "@/lib/constants/auth";
import type { AuthFormProps } from "@/lib/interfaces/auth";

export function AuthForm({ notice, offerResend, next }: AuthFormProps) {
  const router = useRouter();
  const { playGuest } = useSession();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [signInState, signInFormAction] = useActionState(
    signInAction,
    INITIAL_AUTH_STATE,
  );
  const [signUpState, signUpFormAction] = useActionState(
    signUpAction,
    INITIAL_AUTH_STATE,
  );

  const registering = tab === "register";
  const state = registering ? signUpState : signInState;

  const guest = () => {
    playGuest();
    router.push("/");
  };

  return (
    <AuthCard>
      {notice ? (
        <div className="grid gap-3 border border-amarillo/40 bg-amarillo/5 px-3.5 py-3">
          <p
            role="status"
            className="text-[13px] leading-relaxed text-amarillo"
          >
            {notice}
          </p>
          {offerResend ? <ResendForm /> : null}
        </div>
      ) : null}

      <div
        role="tablist"
        className="grid grid-cols-2 border border-foreground/12"
      >
        <button
          type="button"
          role="tab"
          aria-selected={!registering}
          onClick={() => setTab("login")}
          className={`px-2 py-3.5 text-center font-display text-[9px] ${
            registering ? "text-texto-tenue" : "bg-cian/12 text-cian"
          }`}
        >
          INICIAR SESIÓN
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={registering}
          onClick={() => setTab("register")}
          className={`px-2 py-3.5 text-center font-display text-[9px] ${
            registering ? "bg-magenta/12 text-magenta" : "text-texto-tenue"
          }`}
        >
          CREAR CUENTA
        </button>
      </div>

      <form
        key={tab}
        action={registering ? signUpFormAction : signInFormAction}
        className="grid gap-4"
      >
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <AuthField
          label="Correo electrónico"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="tu@correo.com"
          required
        />
        <AuthField
          label="Contraseña"
          name="password"
          type="password"
          autoComplete={registering ? "new-password" : "current-password"}
          placeholder="••••••••"
          required
        />
        {registering ? (
          <p className="-mt-2 text-[11px] text-texto-debil">
            {PASSWORD_RULE_HINT} Te enviaremos un enlace para confirmar el
            correo.
          </p>
        ) : (
          <Link
            href="/auth/forgot-password"
            className="-mt-2 text-right text-[12px] tracking-wide text-texto-tenue transition-colors hover:text-cian"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        )}
        <FormMessage error={state.error} />
        <SubmitButton pendingText={registering ? "CREANDO…" : "ENTRANDO…"}>
          {registering ? "CREAR CUENTA" : "ENTRAR AL VAULT"}
        </SubmitButton>
      </form>

      <button
        type="button"
        onClick={guest}
        className="text-center text-[13px] uppercase tracking-[2px] text-amarillo hover:[text-shadow:0_0_14px_rgba(245,255,0,.7)]"
      >
        Jugar como invitado
      </button>

      <div className="flex items-center gap-3 text-[11px] tracking-[2px] text-texto-debil">
        <div className="h-px flex-1 bg-foreground/10" />
        <span className="whitespace-nowrap">O CONTINÚA CON</span>
        <div className="h-px flex-1 bg-foreground/10" />
      </div>

      <form
        action={signInWithProviderAction}
        className="grid grid-cols-2 gap-3"
      >
        {next ? <input type="hidden" name="next" value={next} /> : null}
        {OAUTH_PROVIDERS.map((p) => (
          <button
            key={p.id}
            type="submit"
            name="provider"
            value={p.id}
            className="flex items-center justify-center gap-2.5 border border-foreground/16 p-3.5 text-center text-[13px] tracking-wide text-foreground transition-colors hover:border-cian hover:text-cian active:scale-95"
          >
            {p.id === "google" ? <GoogleIcon /> : <GitHubIcon />}
            {p.label}
          </button>
        ))}
      </form>
    </AuthCard>
  );
}
