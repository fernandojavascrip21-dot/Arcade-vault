"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { saveScoreAction } from "@/app/play/[id]/actions";
import { CrtFrame } from "@/components/crt-frame";
import {
  AsteroidsGame,
  type AsteroidsGameHandle,
} from "@/components/games/asteroids/asteroids-game";
import type { AsteroidsState } from "@/components/games/asteroids/engine";
import {
  BloquesGame,
  type BloquesGameHandle,
} from "@/components/games/bloques/bloques-game";
import type { BloquesState } from "@/components/games/bloques/engine";
import type { RompemurosState } from "@/components/games/rompemuros/engine";
import {
  RompemurosGame,
  type RompemurosGameHandle,
} from "@/components/games/rompemuros/rompemuros-game";
import type { SerpienteState } from "@/components/games/serpiente/engine";
import {
  SerpienteGame,
  type SerpienteGameHandle,
} from "@/components/games/serpiente/serpiente-game";
import { useCredits } from "@/contexts/credits-context";
import { useSession } from "@/contexts/session-context";
import {
  GUEST_NAME,
  NAME_MAX,
  normalizePlayerName,
  validatePlayerName,
} from "@/lib/player-name";
import type { Game, SavedResult } from "@/lib/types";

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

export function PlayRoom({ game }: { game: Game }) {
  const router = useRouter();
  const { spendCredit } = useCredits();
  const { user, setName } = useSession();

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [, setLines] = useState(0);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState("");
  // null = sin tocar: el campo muestra el nombre de la sesión (si lo hay).
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [, setSavedResult] = useState<SavedResult | null>(null);

  const isAsteroids = game.id === "asteroides";
  const isBloques = game.id === "bloques";
  const isRompemuros = game.id === "rompemuros";
  const isSerpiente = game.id === "serpiente";
  const gameRef = useRef<AsteroidsGameHandle>(null);
  const bloquesGameRef = useRef<BloquesGameHandle>(null);
  const rompemurosGameRef = useRef<RompemurosGameHandle>(null);
  const serpienteGameRef = useRef<SerpienteGameHandle>(null);
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

  const handleAsteroidsStateChange = (state: AsteroidsState) => {
    setScore(state.score);
    setLives(state.lives);
    setLevel(state.level);
  };

  const handleAsteroidsGameOver = (finalScore: number) => {
    setScore(finalScore);
    setPaused(false);
    setOver(true);
  };

  const handleBloquesStateChange = (state: BloquesState) => {
    setScore(state.score);
    setLines(state.lines);
    setLevel(state.level);
  };

  const handleBloquesGameOver = (finalScore: number) => {
    setScore(finalScore);
    setPaused(false);
    setOver(true);
  };

  const handleRompemurosStateChange = (state: RompemurosState) => {
    setScore(state.score);
    setLives(state.lives);
    setLevel(state.level);
    setPaused(state.paused);
  };

  const handleRompemurosGameOver = (finalScore: number) => {
    setScore(finalScore);
    setPaused(false);
    setOver(true);
  };

  const handleSerpienteStateChange = (state: SerpienteState) => {
    setScore(state.score);
    setLevel(state.level);
    setPaused(state.paused);
  };

  const handleSerpienteGameOver = (finalScore: number) => {
    setScore(finalScore);
    setPaused(false);
    setOver(true);
  };

  const nameValue = nameDraft ?? user ?? "";
  const nameNormalized = normalizePlayerName(nameValue);
  const nameError = nameNormalized
    ? validatePlayerName(nameNormalized)
    : "Escribe tu nombre para guardar.";
  const showNameError = nameDraft !== null && nameDraft !== "" && nameError;

  const handleSave = async (name: string) => {
    setSaving(true);
    setSaveError(null);
    const result = await saveScoreAction(game.id, name, score);
    setSaving(false);

    if (!result.ok) {
      setSaveError(result.error);
      return;
    }

    if (name !== GUEST_NAME) setName(name);
    setSavedResult({
      board: result.board,
      rank: result.rank,
      total: result.total,
    });
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
    router.refresh();
  };

  const replay = () => {
    if (!spendCredit()) return;
    if (typerRef.current) clearInterval(typerRef.current);
    setScore(0);
    setOver(false);
    setPaused(false);
    setSaved(false);
    setSavedResult(null);
    setSaveError(null);
    setSaveMsg("");
    if (isAsteroids) gameRef.current?.restart();
    if (isBloques) {
      bloquesGameRef.current?.restart();
      setLines(0);
      setLevel(1);
    }
    if (isRompemuros) {
      rompemurosGameRef.current?.restart();
      setLives(3);
      setLevel(1);
    }
    if (isSerpiente) {
      serpienteGameRef.current?.restart();
      setLevel(1);
    }
  };

  return (
    <main className="relative z-10 mx-auto w-full max-w-[1020px] flex-1 animate-fade px-[18px] pb-20 pt-8">
      <div className="flex flex-wrap items-center justify-between gap-3.5 border border-cian/30 bg-[rgba(8,10,16,.92)] px-5 py-4">
        <div className="flex flex-wrap gap-x-[26px] gap-y-3">
          {!isBloques && !isRompemuros ? (
            <>
              <HudStat
                label="PUNTUACIÓN"
                value={score.toLocaleString("es-ES")}
                className="text-amarillo [text-shadow:0_0_12px_rgba(245,255,0,.5)]"
              />
              {!isSerpiente ? (
                <HudStat
                  label="VIDAS"
                  value={"♥".repeat(lives)}
                  className="text-magenta"
                />
              ) : null}
              <HudStat
                label="NIVEL"
                value={level.toString().padStart(2, "0")}
                className="text-cian"
              />
            </>
          ) : null}
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

      <CrtFrame
        background={
          isAsteroids || isBloques || isRompemuros || isSerpiente
            ? "#000"
            : game.thumb
        }
        label=""
        className="mt-6"
        art={
          isAsteroids ? (
            <AsteroidsGame
              ref={gameRef}
              paused={paused}
              onStateChange={handleAsteroidsStateChange}
              onGameOver={handleAsteroidsGameOver}
            />
          ) : isBloques ? (
            <BloquesGame
              ref={bloquesGameRef}
              paused={paused}
              onStateChange={handleBloquesStateChange}
              onGameOver={handleBloquesGameOver}
            />
          ) : isRompemuros ? (
            <RompemurosGame
              ref={rompemurosGameRef}
              paused={paused}
              onStateChange={handleRompemurosStateChange}
              onGameOver={handleRompemurosGameOver}
            />
          ) : isSerpiente ? (
            <SerpienteGame
              ref={serpienteGameRef}
              paused={paused}
              onStateChange={handleSerpienteStateChange}
              onGameOver={handleSerpienteGameOver}
            />
          ) : undefined
        }
      >
        {paused ? (
          <div className="grid h-full place-items-center bg-[rgba(4,4,10,.78)]">
            <div className="font-display text-xl tracking-[2px] text-amarillo [text-shadow:0_0_20px_rgba(245,255,0,.6)]">
              EN PAUSA
            </div>
          </div>
        ) : null}
      </CrtFrame>

      <div className="mt-4 flex flex-wrap justify-between gap-2.5 text-[11px] tracking-[2px] text-[#46525e]">
        <span>
          {isAsteroids
            ? "← → ROTAR · ↑ IMPULSO · ESPACIO DISPARAR · B BOMBA NOVA"
            : isBloques
              ? "← → MOVER · ↑ / X ROTAR · ↓ BAJAR · ESPACIO CAÍDA"
              : isRompemuros
                ? "← → / A D / RATÓN MOVER · ESPACIO / CLIC LANZAR · 1 2 3 DIFICULTAD · ESC / P PAUSA"
                : isSerpiente
                  ? "← ↑ ↓ → / WASD MOVER · ESC / P PAUSA"
                  : "MUEVE CON EL RATÓN O ← →"}
        </span>
        <span>ARCADE VAULT CRT-19</span>
      </div>

      {!isAsteroids && !isBloques && !isRompemuros && !isSerpiente ? (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={simulateGameOver}
            className="whitespace-nowrap border border-cian/50 bg-cian/5 px-6 py-4 font-display text-[10px] tracking-wider text-cian transition-colors hover:bg-cian/15 active:scale-95"
          >
            SIMULAR FIN DE PARTIDA
          </button>
        </div>
      ) : null}

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
              <form
                className="grid w-full gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!nameError && !saving) handleSave(nameNormalized);
                }}
              >
                <label className="grid gap-2 text-left text-[10px] uppercase tracking-[2px] text-[#6f7d88]">
                  Tu nombre
                  <input
                    value={nameValue}
                    onChange={(e) => setNameDraft(e.target.value)}
                    maxLength={NAME_MAX}
                    placeholder="JUGADOR_01"
                    autoComplete="off"
                    aria-invalid={showNameError ? true : undefined}
                    className="border border-cian/30 bg-cian/5 px-3.5 py-3 text-[15px] uppercase text-foreground focus:border-cian focus:shadow-[0_0_20px_rgba(0,245,255,.4)]"
                  />
                </label>
                {showNameError ? (
                  <div className="text-left text-[11px] leading-relaxed text-magenta">
                    {nameError}
                  </div>
                ) : null}
                <button
                  type="submit"
                  disabled={saving || nameError !== null}
                  className="w-full whitespace-nowrap border border-cian bg-cian/5 p-4 font-display text-[11px] text-cian transition-colors hover:bg-cian hover:text-[#0a0a0f] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "GUARDANDO..." : "GUARDAR PUNTUACIÓN"}
                </button>
                <button
                  type="button"
                  onClick={() => handleSave(GUEST_NAME)}
                  disabled={saving}
                  className="whitespace-nowrap font-display text-[9px] text-[#8b98a3] underline-offset-4 transition-colors hover:text-amarillo hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                >
                  GUARDAR COMO INVITADO
                </button>
              </form>
            ) : null}

            {saveError ? (
              <div className="text-[11px] leading-relaxed text-magenta">
                {saveError}
              </div>
            ) : null}

            {saveMsg ? (
              <div className="font-display text-[11px] tracking-wider text-cian">
                {saveMsg}
                <span className="animate-caret">_</span>
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
