"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { CrtFrame } from "@/components/crt-frame";
import { useCredits } from "@/contexts/credits-context";
import { useScores } from "@/contexts/scores-context";
import { useSession } from "@/contexts/session-context";
import type { Game } from "@/lib/types";

const SAVED_TEXT = "PUNTUACIÓN GUARDADA";

function HudStat({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <span className="whitespace-nowrap text-[10px] tracking-[2px] text-[#6f7d88]">
        {label}
      </span>
      <span className={`font-display text-[15px] ${className}`}>{value}</span>
    </div>
  );
}

export function SalaJuego({ game }: { game: Game }) {
  const router = useRouter();
  const { spendCredit } = useCredits();
  const { saveScore } = useScores();
  const { user } = useSession();

  const [score, setScore] = useState(0);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const typerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(
    () => () => {
      if (typerRef.current) clearInterval(typerRef.current);
    },
    [],
  );

  const playerName = user ?? "INVITADO";
  const exit = () => router.push("/games");

  // Sin motor de juego: simula el final de una partida con una puntuación
  // pseudoaleatoria para poder recorrer el flujo de guardado.
  const simulateGameOver = () => {
    setScore(Math.floor(500 + Math.random() * 40000));
    setPaused(false);
    setOver(true);
  };

  const handleSave = () => {
    saveScore(game.id, score);
    setSaved(true);
    setSaveMsg("");
    let i = 0;
    if (typerRef.current) clearInterval(typerRef.current);
    typerRef.current = setInterval(() => {
      i += 1;
      setSaveMsg(SAVED_TEXT.slice(0, i));
      if (i >= SAVED_TEXT.length && typerRef.current) {
        clearInterval(typerRef.current);
        typerRef.current = null;
      }
    }, 55);
  };

  const replay = () => {
    if (!spendCredit()) return;
    if (typerRef.current) clearInterval(typerRef.current);
    setScore(0);
    setOver(false);
    setPaused(false);
    setSaved(false);
    setSaveMsg("");
  };

  return (
    <main className="relative z-10 mx-auto w-full max-w-[1020px] flex-1 animate-fade px-[18px] pb-20 pt-8">
      <div className="flex flex-wrap items-center justify-between gap-3.5 border border-cian/30 bg-[rgba(8,10,16,.92)] px-5 py-4">
        <div className="flex flex-wrap gap-x-[26px] gap-y-3">
          <HudStat
            label="PUNTUACIÓN"
            value={score.toLocaleString("es-ES")}
            className="text-amarillo [text-shadow:0_0_12px_rgba(245,255,0,.5)]"
          />
          <HudStat label="VIDAS" value="♥♥♥" className="text-magenta" />
          <HudStat label="NIVEL" value="01" className="text-cian" />
          <div className="grid gap-1.5">
            <span className="text-[10px] tracking-[2px] text-[#6f7d88]">
              JUGADOR
            </span>
            <span className="text-sm text-[#cdd8de]">{playerName}</span>
          </div>
        </div>
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="whitespace-nowrap border border-amarillo/50 px-4 py-3 font-display text-[10px] text-amarillo transition-colors hover:bg-amarillo/10 active:scale-95"
          >
            {paused ? "SEGUIR" : "PAUSA"}
          </button>
          <button
            type="button"
            onClick={exit}
            className="whitespace-nowrap border border-magenta/50 px-4 py-3 font-display text-[10px] text-magenta transition-colors hover:bg-magenta/15 active:scale-95"
          >
            SALIR
          </button>
        </div>
      </div>

      <CrtFrame background={game.thumb} label="" className="mt-6">
        {paused ? (
          <div className="grid h-full place-items-center bg-[rgba(4,4,10,.78)]">
            <div className="font-display text-xl tracking-[2px] text-amarillo [text-shadow:0_0_20px_rgba(245,255,0,.6)]">
              EN PAUSA
            </div>
          </div>
        ) : null}
      </CrtFrame>

      <div className="mt-4 flex flex-wrap justify-between gap-2.5 text-[11px] tracking-[2px] text-[#46525e]">
        <span>MUEVE CON EL RATÓN O ← →</span>
        <span>ARCADE VAULT CRT-19</span>
      </div>

      <div className="mt-6 flex justify-center">
        <button
          type="button"
          onClick={simulateGameOver}
          className="whitespace-nowrap border border-cian/50 bg-cian/5 px-6 py-4 font-display text-[10px] tracking-wider text-cian transition-colors hover:bg-cian/15 active:scale-95"
        >
          SIMULAR FIN DE PARTIDA
        </button>
      </div>

      {over ? (
        <div className="fixed inset-0 z-[70] grid animate-fade place-items-center bg-[rgba(4,4,9,.86)] p-5 backdrop-blur-sm">
          <div className="grid w-full max-w-[460px] justify-items-center gap-5 border border-magenta bg-[#0c0a12] px-7 py-9 text-center shadow-[0_0_60px_rgba(255,0,110,.4)]">
            <div className="font-display text-xl tracking-wider text-magenta [text-shadow:0_0_18px_rgba(255,0,110,.7)]">
              FIN DEL JUEGO
            </div>
            <div className="text-xs tracking-[3px] text-[#6f7d88]">
              PUNTUACIÓN FINAL
            </div>
            <div className="font-display text-[34px] text-amarillo [text-shadow:0_0_22px_rgba(245,255,0,.55)]">
              {score.toLocaleString("es-ES")}
            </div>

            {!saved ? (
              <button
                type="button"
                onClick={handleSave}
                className="w-full whitespace-nowrap border border-cian bg-cian/5 p-4 font-display text-[11px] text-cian transition-colors hover:bg-cian hover:text-[#0a0a0f] active:scale-95"
              >
                GUARDAR PUNTUACIÓN
              </button>
            ) : null}

            {saveMsg ? (
              <div className="font-display text-[11px] tracking-wider text-cian">
                {saveMsg}
                <span className="animate-caret">_</span>
              </div>
            ) : null}

            {!user ? (
              <div className="text-[11px] leading-relaxed text-[#6f7d88]">
                Modo invitado: la puntuación se guarda solo en este dispositivo.
              </div>
            ) : null}

            <div className="mt-1 grid w-full gap-2.5">
              <button
                type="button"
                onClick={replay}
                className="whitespace-nowrap border border-amarillo/50 p-4 text-center font-display text-[10px] text-amarillo transition-colors hover:bg-amarillo/10 active:scale-95"
              >
                JUGAR DE NUEVO
              </button>
              <button
                type="button"
                onClick={exit}
                className="whitespace-nowrap border border-white/20 p-4 text-center font-display text-[10px] text-[#8b98a3] transition-colors hover:border-magenta hover:text-magenta active:scale-95"
              >
                VOLVER AL VAULT
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
