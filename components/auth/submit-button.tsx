"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

// Botón principal de los formularios: se deshabilita mientras se envía.
export function SubmitButton({
  children,
  pendingText = "ENVIANDO…",
  disabled = false,
}: {
  children: ReactNode;
  pendingText?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="whitespace-nowrap border border-cian bg-cian p-4 text-center font-display text-[11px] text-[#0a0a0f] transition-shadow hover:shadow-[0_0_30px_rgba(0,245,255,.6)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:active:scale-100"
    >
      {pending ? pendingText : children}
    </button>
  );
}
