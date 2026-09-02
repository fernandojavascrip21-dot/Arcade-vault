"use client";

// Placeholder mínimo — la Biblioteca real se construye en el Paso 5 del spec.
// De momento sirve de comprobación de que los contextos están montados.
import { useCredits } from "@/contexts/credits-context";
import { useSession } from "@/contexts/session-context";

export default function Home() {
  const { credits } = useCredits();
  const { user } = useSession();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-10">
      <h1 className="font-display text-2xl text-cian">
        ARCADE<span className="text-magenta">VAULT</span>
      </h1>
      <p className="font-mono text-texto-tenue">
        créditos: {String(credits).padStart(2, "0")} · jugador: {user ?? "—"}
      </p>
    </main>
  );
}
