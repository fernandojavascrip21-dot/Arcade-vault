"use client";

import type { ReactNode } from "react";

import { CreditsProvider } from "@/contexts/credits-context";
import { ScoresProvider } from "@/contexts/scores-context";
import { SessionProvider } from "@/contexts/session-context";

// Proveedores de estado global de cliente. ScoresProvider va dentro de
// SessionProvider porque necesita el nombre de usuario para guardar.
export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <CreditsProvider>
        <ScoresProvider>{children}</ScoresProvider>
      </CreditsProvider>
    </SessionProvider>
  );
}
