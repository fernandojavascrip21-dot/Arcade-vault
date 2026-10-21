"use client";

import { useEffect, useRef } from "react";

import type { FormMessageProps } from "@/lib/interfaces/auth";

// Error (rojo, con foco) o éxito de un formulario. La región aria-live existe
// siempre para que los lectores de pantalla anuncien los cambios.
export function FormMessage({ error, message }: FormMessageProps) {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (error) ref.current?.focus();
  }, [error]);

  return (
    <div aria-live="polite">
      {error ? (
        <p
          ref={ref}
          tabIndex={-1}
          role="alert"
          className="border border-magenta/50 bg-magenta/10 px-3.5 py-3 text-[13px] leading-relaxed text-magenta outline-none"
        >
          {error}
        </p>
      ) : message ? (
        <p className="border border-cian/40 bg-cian/10 px-3.5 py-3 text-[13px] leading-relaxed text-cian">
          {message}
        </p>
      ) : null}
    </div>
  );
}
