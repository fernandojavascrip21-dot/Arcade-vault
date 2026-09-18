"use client";

import type { ReactNode } from "react";

import { CreditsProvider } from "@/contexts/credits-context";
import { SessionProvider } from "@/contexts/session-context";

// Proveedores de estado global de cliente.
export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <CreditsProvider>{children}</CreditsProvider>
    </SessionProvider>
  );
}
