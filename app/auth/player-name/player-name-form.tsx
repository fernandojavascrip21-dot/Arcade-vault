"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import { claimPlayerNameAction } from "@/app/auth/actions";
import { AuthCard } from "@/components/auth/auth-card";
import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { useSession } from "@/contexts/session-context";
import {
  ACCOUNT_CREATED_REDIRECT_MS,
  INITIAL_AUTH_STATE,
  NAME_CHECK_DEBOUNCE_MS,
  NAME_SUGGESTION_SUFFIXES,
  NAME_SUGGESTIONS_MAX,
  NAME_TAKEN_ERROR,
  PLAYER_NAME_INTRO,
  PLAYER_NAME_CREATED_MESSAGE,
} from "@/lib/constants/auth";
import type {
  NameAvailability,
  NameSuggestions,
  PlayerNameFormProps,
} from "@/lib/interfaces/auth";
import {
  GUEST_NAME,
  NAME_MAX,
  NAME_MIN,
  normalizePlayerName,
  validatePlayerName,
} from "@/lib/player-name";
import { createClient } from "@/lib/supabase/client";

export function PlayerNameForm({ next, email }: PlayerNameFormProps) {
  const router = useRouter();
  const { refreshProfile, logout } = useSession();

  const switchAccount = async () => {
    await logout();
    router.push("/auth");
  };
  const [state, formAction] = useActionState(
    claimPlayerNameAction,
    INITIAL_AUTH_STATE,
  );
  const [raw, setRaw] = useState("");
  const [checked, setChecked] = useState<NameAvailability | null>(null);
  const [suggested, setSuggested] = useState<NameSuggestions | null>(null);

  const name = normalizePlayerName(raw);
  const localError =
    name.length === 0
      ? null
      : name === GUEST_NAME
        ? "Ese nombre no está disponible."
        : validatePlayerName(name);
  const canCheck = name.length >= NAME_MIN && !localError;

  // Disponibilidad con espera: solo cuando el nombre ya es válido.
  useEffect(() => {
    if (!canCheck) return;
    const id = setTimeout(async () => {
      const { data, error } = await createClient().rpc(
        "is_player_name_available",
        { p_name: name },
      );
      if (error) return;
      const available = data === true;
      setChecked({ name, available });
      if (available) return;

      // En uso: propone variantes válidas y libres.
      const candidates = NAME_SUGGESTION_SUFFIXES.map(
        (suffix) => `${name.slice(0, NAME_MAX - suffix.length)}${suffix}`,
      ).filter((c) => !validatePlayerName(c));
      const results = await Promise.all(
        candidates.map(async (candidate) => {
          const res = await createClient().rpc("is_player_name_available", {
            p_name: candidate,
          });
          return res.error || res.data !== true ? null : candidate;
        }),
      );
      setSuggested({
        name,
        options: results
          .filter((c): c is string => c !== null)
          .slice(0, NAME_SUGGESTIONS_MAX),
      });
    }, NAME_CHECK_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [canCheck, name]);

  // Cuenta creada: actualiza la sesión y redirige tras mostrar el estado final.
  useEffect(() => {
    if (!state.ok) return;
    void refreshProfile();
    const id = setTimeout(
      () => router.replace(next),
      ACCOUNT_CREATED_REDIRECT_MS,
    );
    return () => clearTimeout(id);
  }, [state.ok, refreshProfile, router, next]);

  if (state.ok) {
    return (
      <AuthCard>
        <div role="status" className="grid gap-4 py-4 text-center">
          <div className="font-display text-sm leading-relaxed text-cian [text-shadow:0_0_14px_rgba(0,245,255,.8)]">
            {state.message ?? PLAYER_NAME_CREATED_MESSAGE}
          </div>
          <div className="font-display text-base tracking-[4px] text-amarillo">
            {name}
          </div>
          <p className="text-[12px] text-texto-tenue">Entrando al vault…</p>
        </div>
      </AuthCard>
    );
  }

  const status: "idle" | "invalid" | "checking" | "taken" | "free" =
    name.length === 0
      ? "idle"
      : localError
        ? "invalid"
        : checked?.name === name
          ? checked.available
            ? "free"
            : "taken"
          : "checking";

  const statusText = {
    idle: `${NAME_MIN} a ${NAME_MAX} caracteres: letras, números y _`,
    invalid: localError,
    checking: "Comprobando…",
    taken: NAME_TAKEN_ERROR,
    free: "Disponible",
  }[status];

  const statusColor = {
    idle: "text-texto-debil",
    invalid: "text-magenta",
    checking: "text-texto-tenue",
    taken: "text-magenta",
    free: "text-cian",
  }[status];

  return (
    <AuthCard title="ELIGE TU NOMBRE DE JUGADOR">
      <p className="text-center text-[13px] leading-relaxed text-texto-tenue">
        {PLAYER_NAME_INTRO}
      </p>
      {email ? (
        <div className="grid gap-1.5 border border-cian/30 bg-cian/5 px-3.5 py-3 text-center">
          <span className="text-[10px] tracking-[2px] text-texto-tenue">
            SESIÓN INICIADA CON
          </span>
          <span className="break-all text-[13px] text-foreground">{email}</span>
          <button
            type="button"
            onClick={() => void switchAccount()}
            className="text-[11px] uppercase tracking-[2px] text-amarillo underline-offset-4 hover:underline"
          >
            Usar otra cuenta
          </button>
        </div>
      ) : null}
      <form action={formAction} className="grid gap-4">
        <label className="grid gap-3">
          <span className="text-xs uppercase tracking-[2px] text-texto-tenue">
            Nombre de jugador
          </span>
          <input
            name="playerName"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            maxLength={NAME_MAX}
            autoComplete="nickname"
            autoCapitalize="characters"
            spellCheck={false}
            required
            aria-describedby="player-name-status"
            aria-invalid={status === "invalid" || status === "taken"}
            placeholder="JUGADOR_01"
            className="w-full border border-cian/30 bg-cian/5 px-3 py-5 text-center font-display text-base uppercase tracking-[4px] text-amarillo placeholder:text-texto-debil focus:border-cian focus:shadow-[0_0_20px_rgba(0,245,255,.4)] sm:text-lg"
          />
        </label>
        <p
          id="player-name-status"
          aria-live="polite"
          className={`min-h-[1.25rem] text-center text-[12px] tracking-wide ${statusColor}`}
        >
          {status === "free" ? "● " : status === "taken" ? "✕ " : ""}
          {statusText}
        </p>
        {status === "taken" &&
        suggested?.name === name &&
        suggested.options.length > 0 ? (
          <div className="grid gap-2 text-center">
            <span className="text-[10px] tracking-[2px] text-texto-tenue">
              LIBRES PARA TI
            </span>
            <div className="flex flex-wrap justify-center gap-2">
              {suggested.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setRaw(option)}
                  className="border border-cian/50 bg-cian/5 px-3 py-2 font-display text-[10px] tracking-wider text-cian transition-colors hover:bg-cian/15 active:scale-95"
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <FormMessage error={state.error} />
        <SubmitButton
          pendingText="GUARDANDO…"
          disabled={
            status === "invalid" || status === "taken" || name.length === 0
          }
        >
          CONFIRMAR NOMBRE
        </SubmitButton>
      </form>
    </AuthCard>
  );
}
