"use client";

import { EllipsisVertical, Pause, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { saveScoreAction } from "@/app/play/[id]/actions";
import { PlayMenuSheet } from "@/app/play/[id]/play-menu-sheet";
import { RotateHint } from "@/app/play/[id]/rotate-hint";
import { CrtFrame } from "@/components/crt-frame";
import { GameOverRanking } from "@/components/game-over-ranking";
import {
  TOUCH_LAYOUTS,
  type TouchGameId,
} from "@/components/touch-controller/layouts";
import { TouchController } from "@/components/touch-controller/touch-controller";
import { useTouchControls } from "@/components/touch-controller/use-touch-controls";
import {
  AsteroidsGame,
  type AsteroidsGameHandle,
} from "@/components/games/asteroids/asteroids-game";
import {
  ASTEROIDS_SKINS,
  ASTEROIDS_SKIN_STORAGE_KEY,
  type AsteroidsState,
} from "@/components/games/asteroids/engine";
import {
  BloquesGame,
  type BloquesGameHandle,
} from "@/components/games/bloques/bloques-game";
import {
  BLOQUES_SKINS,
  BLOQUES_SKIN_STORAGE_KEY,
  type BloquesSkin,
  type BloquesState,
} from "@/components/games/bloques/engine";
import {
  ROMPEMUROS_SKINS,
  ROMPEMUROS_SKIN_STORAGE_KEY,
  type RompemurosState,
} from "@/components/games/rompemuros/engine";
import {
  RompemurosGame,
  type RompemurosGameHandle,
} from "@/components/games/rompemuros/rompemuros-game";
import {
  SERPIENTE_SKINS,
  SERPIENTE_SKIN_STORAGE_KEY,
  type SerpienteState,
} from "@/components/games/serpiente/engine";
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
import { createSkinStore, useSkin } from "@/lib/skin-store";
import type { Game, SavedResult } from "@/lib/types";

const SAVED_TEXT = "PUNTUACIÓN GUARDADA";

// Skin de Asteroides (spec 06 §8): store genérico de lib/skin-store.ts.
const asteroidsSkinStore = createSkinStore(
  ASTEROIDS_SKIN_STORAGE_KEY,
  ASTEROIDS_SKINS,
  "clasico",
);

// Skin de Rompemuros (spec 10 §8): store genérico de lib/skin-store.ts.
const rompemurosSkinStore = createSkinStore(
  ROMPEMUROS_SKIN_STORAGE_KEY,
  ROMPEMUROS_SKINS,
  "clasico",
);

// Skin de Serpiente (spec 11 §8): store genérico de lib/skin-store.ts.
const serpienteSkinStore = createSkinStore(
  SERPIENTE_SKIN_STORAGE_KEY,
  SERPIENTE_SKINS,
  "clasico",
);

// La skin de Bloques se recuerda en localStorage (mismo patrón que el nombre
// del jugador en contexts/session-context.tsx): useSyncExternalStore evita el
// desajuste de hidratación que produciría leer localStorage directamente en
// el render o en un efecto.
let memoryBloquesSkin: BloquesSkin = "retro";
const bloquesSkinListeners = new Set<() => void>();

function isBloquesSkin(value: string | null): value is BloquesSkin {
  return BLOQUES_SKINS.some((s) => s.id === value);
}

function readBloquesSkin(): BloquesSkin {
  try {
    const stored = localStorage.getItem(BLOQUES_SKIN_STORAGE_KEY);
    return isBloquesSkin(stored) ? stored : memoryBloquesSkin;
  } catch {
    return memoryBloquesSkin;
  }
}

function writeBloquesSkin(next: BloquesSkin) {
  memoryBloquesSkin = next;
  try {
    localStorage.setItem(BLOQUES_SKIN_STORAGE_KEY, next);
  } catch {
    // localStorage puede no estar disponible (modo privado, cuotas, etc.).
  }
  bloquesSkinListeners.forEach((notify) => notify());
}

function subscribeBloquesSkin(notify: () => void) {
  bloquesSkinListeners.add(notify);
  return () => bloquesSkinListeners.delete(notify);
}

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cian";

// Sala sin scroll en escritorio (spec 15). `main` es contenedor de tamaño y
// barra + CRT + ayuda comparten una columna de ancho --room-w, el mayor que
// cabe en el alto libre: --room-overhead = barra (56) + separación (12) +
// ayuda (28) + marco del CRT (28); ×1.6 por el 16:10 y +28px de marco.
const ROOM_FIT =
  "desktop:min-h-0 desktop:[container-type:size] desktop:[--room-w:min(100cqw,calc((100cqh_-_var(--room-overhead))*1.6_+_28px),1600px)]";
const ROOM_OVERHEAD_GAME = "desktop:[--room-overhead:124px]";
// Juegos del simulador: + botón SIMULAR FIN DE PARTIDA (24 + 50).
const ROOM_OVERHEAD_SIMULATOR = "desktop:[--room-overhead:198px]";
// Con el mando táctil visible (tablets) se conserva el apilado con scroll del
// spec 13: la sala no se encoge y solo manda el ancho.
const ROOM_STACKED =
  "desktop:shrink-0 desktop:[container-type:inline-size] desktop:[--room-w:min(100cqw,1020px)]";

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
    <div className="grid gap-1">
      <span className="whitespace-nowrap text-[10px] tracking-[2px] text-[#6f7d88] mobile:text-[9px] mobile:tracking-[1px]">
        {label}
      </span>
      <span
        className={`font-display text-[15px] mobile:text-[13px] ${className}`}
      >
        {value}
      </span>
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
  // "retro" en servidor e hidratación; el valor real de localStorage llega
  // después de montar, sin provocar desajuste (mismo patrón que useSession).
  const skin = useSyncExternalStore(
    subscribeBloquesSkin,
    readBloquesSkin,
    () => "retro" as BloquesSkin,
  );
  const asteroidsSkin = useSkin(asteroidsSkinStore);
  const rompemurosSkin = useSkin(rompemurosSkinStore);
  const serpienteSkin = useSkin(serpienteSkinStore);
  const [paused, setPaused] = useState(false);
  // Menú OPCIONES (⋮) de la sala (specs 14 y 15).
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  // Ancla del panel en escritorio (spec 15): bajo el ⋮, alineado a su derecha.
  const [menuAnchor, setMenuAnchor] = useState<{
    top: number;
    right: number;
  } | null>(null);
  const [over, setOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState("");
  // null = sin tocar: el campo muestra el nombre de la sesión (si lo hay).
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [savedResult, setSavedResult] = useState<{
    result: SavedResult;
    name: string;
  } | null>(null);

  const isAsteroids = game.id === "asteroides";
  const isBloques = game.id === "bloques";
  const isRompemuros = game.id === "rompemuros";
  const isSerpiente = game.id === "serpiente";
  const gameRef = useRef<AsteroidsGameHandle>(null);
  const bloquesGameRef = useRef<BloquesGameHandle>(null);
  const rompemurosGameRef = useRef<RompemurosGameHandle>(null);
  const serpienteGameRef = useRef<SerpienteGameHandle>(null);
  const isRealGame = isAsteroids || isBloques || isRompemuros || isSerpiente;
  // Bloques y Rompemuros pintan sus marcadores en el canvas, no en la barra.
  const hasBarStats = !isBloques && !isRompemuros;
  // Control táctil (spec 13): solo en los 4 juegos reales.
  const touch = useTouchControls();
  const touchLayout = isRealGame ? TOUCH_LAYOUTS[game.id as TouchGameId] : null;
  const showTouch = touchLayout !== null && touch.visible;
  const typerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(
    () => () => {
      if (typerRef.current) clearInterval(typerRef.current);
    },
    [],
  );

  // Sin pull-to-refresh ni rebote en la sala (spec 14): un tirón accidental
  // durante la partida recargaría la página. Solo mientras /play está montada.
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.overscrollBehavior;
    root.style.overscrollBehavior = "none";
    return () => {
      root.style.overscrollBehavior = previous;
    };
  }, []);

  // Pausa automática al girar el móvil (spec 14): el layout salta y el
  // jugador pierde la referencia. Solo con partida real en curso; al volver a
  // girar no reanuda. setPaused va en el callback del listener, no en el
  // cuerpo del efecto.
  useEffect(() => {
    if (!isRealGame || over) return;
    const media = window.matchMedia("(orientation: landscape)");
    const onRotate = () => setPaused(true);
    media.addEventListener("change", onRotate);
    return () => media.removeEventListener("change", onRotate);
  }, [isRealGame, over]);

  const playerName = user ?? "INVITADO";
  const keyboardHelp = isAsteroids
    ? "← → ROTAR · ↑ IMPULSO · ESPACIO DISPARAR · B BOMBA NOVA"
    : isBloques
      ? "← → MOVER · ↑ / X ROTAR · ↓ BAJAR · ESPACIO CAÍDA"
      : isRompemuros
        ? "← → / A D / RATÓN MOVER · ESPACIO / CLIC LANZAR · 1 2 3 DIFICULTAD · ESC / P PAUSA"
        : isSerpiente
          ? "← ↑ ↓ → / WASD MOVER · ESC / P PAUSA"
          : "MUEVE CON EL RATÓN O ← →";
  const exit = () => router.push("/games");

  const handleSkinChange = (next: BloquesSkin) => writeBloquesSkin(next);

  // Abrir la hoja pausa una partida real en curso; cerrarla no reanuda: el
  // jugador pulsa SEGUIR (spec 14).
  const openMenu = () => {
    if (isRealGame && !over) setPaused(true);
    const rect = menuButtonRef.current?.getBoundingClientRect();
    if (rect) {
      setMenuAnchor({
        top: Math.round(rect.bottom + 8),
        right: Math.round(document.documentElement.clientWidth - rect.right),
      });
    }
    setMenuOpen(true);
  };

  // Skins del juego actual para el menú OPCIONES.
  const skinControl = isAsteroids
    ? {
        value: asteroidsSkin,
        options: ASTEROIDS_SKINS,
        onChange: (id: string) =>
          asteroidsSkinStore.write(id as typeof asteroidsSkin),
      }
    : isBloques
      ? {
          value: skin,
          options: BLOQUES_SKINS,
          onChange: (id: string) => handleSkinChange(id as BloquesSkin),
        }
      : isRompemuros
        ? {
            value: rompemurosSkin,
            options: ROMPEMUROS_SKINS,
            onChange: (id: string) =>
              rompemurosSkinStore.write(id as typeof rompemurosSkin),
          }
        : isSerpiente
          ? {
              value: serpienteSkin,
              options: SERPIENTE_SKINS,
              onChange: (id: string) =>
                serpienteSkinStore.write(id as typeof serpienteSkin),
            }
          : undefined;

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
      result: {
        board: result.board,
        rank: result.rank,
        total: result.total,
      },
      name,
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
    <main
      className={`relative z-10 mx-auto w-full max-w-[1600px] flex-1 animate-fade px-[18px] py-4 mobile:px-3 mobile:pb-6 mobile:pt-3 mobile-landscape:flex mobile-landscape:min-h-dvh mobile-landscape:flex-col mobile-landscape:pb-[max(8px,env(safe-area-inset-bottom))] mobile-landscape:pl-[max(12px,env(safe-area-inset-left))] mobile-landscape:pr-[max(12px,env(safe-area-inset-right))] mobile-landscape:pt-2 ${
        showTouch
          ? ROOM_STACKED
          : `${ROOM_FIT} ${isRealGame ? ROOM_OVERHEAD_GAME : ROOM_OVERHEAD_SIMULATOR}`
      }`}
    >
      {/* Columna de la sala: en escritorio mide --room-w y va centrada; en
          móvil horizontal es `contents` para no romper el flex de <main>. */}
      <div className="desktop:mx-auto desktop:w-[var(--room-w)] desktop:max-w-full mobile-landscape:contents">
        {/* Barra única (spec 15): una fila con marcadores, JUGADOR (solo
          escritorio), PAUSA y ⋮. SKIN, MANDO, TEMA y SALIR viven en el menú. */}
        <div className="flex h-14 flex-nowrap items-center justify-between gap-3.5 border border-cian/30 bg-[rgba(8,10,16,.92)] px-4 mobile:h-auto mobile:gap-2 mobile:px-3 mobile:py-1">
          <div className="flex min-w-0 flex-nowrap items-center gap-x-[26px] mobile:gap-x-4">
            {hasBarStats ? (
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
            <div
              className={`grid min-w-0 gap-1 mobile:hidden ${
                hasBarStats ? "border-l border-cian/20 pl-[26px]" : ""
              }`}
            >
              <span className="text-[10px] tracking-[2px] text-[#6f7d88]">
                JUGADOR
              </span>
              <span className="truncate text-sm text-[#cdd8de]">
                {playerName}
              </span>
            </div>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? "Seguir" : "Pausar"}
              className={`flex h-11 min-w-11 items-center justify-center gap-2 whitespace-nowrap border border-amarillo/50 px-4 font-display text-[10px] text-amarillo transition-colors hover:bg-amarillo/10 active:scale-95 mobile:px-0 ${focusRing}`}
            >
              {paused ? (
                <Play size={18} aria-hidden />
              ) : (
                <Pause size={18} aria-hidden />
              )}
              <span className="mobile:hidden">
                {paused ? "SEGUIR" : "PAUSA"}
              </span>
            </button>
            <button
              ref={menuButtonRef}
              type="button"
              onClick={openMenu}
              aria-label="Opciones de la partida"
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              className={`grid size-11 place-items-center border border-cian/50 text-cian transition-colors hover:bg-cian/10 active:scale-95 ${focusRing}`}
            >
              <EllipsisVertical size={18} aria-hidden />
            </button>
          </div>
        </div>

        <PlayMenuSheet
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          gameName={game.title}
          paused={paused}
          skins={skinControl}
          touch={isRealGame && touch.isCoarse ? touch : undefined}
          onExit={exit}
          returnFocusRef={menuButtonRef}
          anchor={menuAnchor}
        />

        <RotateHint enabled={isRealGame && touch.isCoarse} />

        {/* Zona de juego. En horizontal (spec 14) es un grid de 3 columnas:
          mando izquierdo · CRT · mando derecho. --crt-w es el ancho del CRT
          que llena el alto libre: 92px = barra (54) + paddings/gap (24) +
          marco compacto (14); ×1.6 por el 16:10 y +14px de marco. */}
        <div
          className={`mobile-landscape:mt-2 mobile-landscape:grid mobile-landscape:min-h-0 mobile-landscape:flex-1 mobile-landscape:items-center mobile-landscape:gap-4 mobile-landscape:[--crt-w:calc((100dvh_-_92px)*1.6_+_14px)] ${
            showTouch
              ? "mobile-landscape:grid-cols-[minmax(150px,1fr)_minmax(0,var(--crt-w))_minmax(150px,1fr)]"
              : "mobile-landscape:grid-cols-[1fr_minmax(0,var(--crt-w))_1fr]"
          }`}
        >
          <CrtFrame
            background={
              isAsteroids || isBloques || isRompemuros || isSerpiente
                ? "#000"
                : game.thumb
            }
            label=""
            compact
            className="mt-3 mobile-landscape:col-start-2 mobile-landscape:row-start-1 mobile-landscape:mt-0 mobile-landscape:w-full"
            art={
              isAsteroids ? (
                <AsteroidsGame
                  ref={gameRef}
                  paused={paused}
                  skin={asteroidsSkin}
                  onStateChange={handleAsteroidsStateChange}
                  onGameOver={handleAsteroidsGameOver}
                />
              ) : isBloques ? (
                <BloquesGame
                  ref={bloquesGameRef}
                  paused={paused}
                  skin={skin}
                  onStateChange={handleBloquesStateChange}
                  onGameOver={handleBloquesGameOver}
                />
              ) : isRompemuros ? (
                <RompemurosGame
                  ref={rompemurosGameRef}
                  paused={paused}
                  skin={rompemurosSkin}
                  onStateChange={handleRompemurosStateChange}
                  onGameOver={handleRompemurosGameOver}
                />
              ) : isSerpiente ? (
                <SerpienteGame
                  ref={serpienteGameRef}
                  paused={paused}
                  skin={serpienteSkin}
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

          {showTouch && touchLayout ? (
            <TouchController
              layout={touchLayout}
              disabled={paused || over}
              onPaddleMove={
                isRompemuros
                  ? (delta) => rompemurosGameRef.current?.movePaddleBy(delta)
                  : undefined
              }
            />
          ) : null}
        </div>

        {/* Ayuda de teclado. En escritorio (spec 15) es una sola línea de 28 px
          que se corta con puntos suspensivos; el texto completo va en title. */}
        <div className="mt-4 flex flex-wrap justify-between gap-2.5 text-[11px] tracking-[2px] text-[#46525e] mobile-landscape:hidden desktop:mt-0 desktop:h-7 desktop:flex-nowrap desktop:items-center desktop:tracking-[1px]">
          {/* Con el control táctil visible, la ayuda de teclado no aplica. */}
          {showTouch ? null : (
            <span
              title={keyboardHelp}
              className="desktop:min-w-0 desktop:truncate"
            >
              {keyboardHelp}
            </span>
          )}
          <span className="ml-auto desktop:hidden">ARCADE VAULT CRT-19</span>
        </div>

        {!isRealGame ? (
          <div className="mt-6 flex justify-center desktop:h-[50px] desktop:items-center">
            <button
              type="button"
              onClick={simulateGameOver}
              className="whitespace-nowrap border border-cian/50 bg-cian/5 px-6 py-4 font-display text-[10px] tracking-wider text-cian transition-colors hover:bg-cian/15 active:scale-95"
            >
              SIMULAR FIN DE PARTIDA
            </button>
          </div>
        ) : null}
      </div>

      {/* Portal a <body>: el <main> tiene `transform` (animate-fade) y sería el
          bloque contenedor del `fixed`; así el modal se centra en la pantalla. */}
      {over
        ? createPortal(
            <div className="fixed inset-0 z-[70] grid animate-fade place-items-center bg-[rgba(4,4,9,.86)] p-5 backdrop-blur-sm mobile-landscape:p-3">
              {/* En horizontal (spec 14) pasa a dos columnas: izquierda título,
              puntuación y botones; derecha formulario o ranking con scroll
              propio. Los contenedores de columna son `contents` fuera de
              horizontal, así que vertical y escritorio no cambian. */}
              <div className="grid max-h-[calc(100dvh-40px)] w-full max-w-[460px] justify-items-center overflow-y-auto gap-5 border border-magenta bg-[#0c0a12] px-7 py-9 text-center shadow-[0_0_60px_rgba(255,0,110,.4)] mobile-landscape:max-h-[calc(100dvh-24px)] mobile-landscape:max-w-[760px] mobile-landscape:grid-cols-2 mobile-landscape:grid-rows-[1fr_auto] mobile-landscape:items-start mobile-landscape:gap-x-6 mobile-landscape:gap-y-4 mobile-landscape:overflow-hidden mobile-landscape:p-5">
                <div className="contents mobile-landscape:col-start-1 mobile-landscape:row-start-1 mobile-landscape:grid mobile-landscape:content-center mobile-landscape:justify-items-center mobile-landscape:gap-3 mobile-landscape:self-stretch">
                  <div className="font-display text-xl tracking-wider text-magenta [text-shadow:0_0_18px_rgba(255,0,110,.7)]">
                    FIN DEL JUEGO
                  </div>
                  <div className="text-xs tracking-[3px] text-[#6f7d88]">
                    PUNTUACIÓN FINAL
                  </div>
                  <div className="font-display text-[34px] text-amarillo [text-shadow:0_0_22px_rgba(245,255,0,.55)]">
                    {score.toLocaleString("es-ES")}
                  </div>
                </div>

                <div className="contents mobile-landscape:col-start-2 mobile-landscape:row-span-2 mobile-landscape:row-start-1 mobile-landscape:grid mobile-landscape:max-h-[calc(100dvh-64px)] mobile-landscape:w-full mobile-landscape:content-start mobile-landscape:justify-items-center mobile-landscape:gap-3 mobile-landscape:overflow-y-auto">
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
                          // Los motores escuchan el teclado en window y cancelan sus
                          // teclas (A, S, D, P...): sin esto el input no las recibe.
                          onKeyDown={(e) => e.stopPropagation()}
                          onKeyUp={(e) => e.stopPropagation()}
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
                        className="whitespace-nowrap font-display text-[9px] text-[#8b98a3] underline-offset-4 mobile:min-h-11 mobile:w-full transition-colors hover:text-amarillo hover:underline disabled:cursor-not-allowed disabled:opacity-50"
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

                  {savedResult ? (
                    <GameOverRanking
                      result={savedResult.result}
                      name={savedResult.name}
                      score={score}
                    />
                  ) : null}

                  {saveMsg ? (
                    <div className="font-display text-[11px] tracking-wider text-cian">
                      {saveMsg}
                      <span className="animate-caret">_</span>
                    </div>
                  ) : null}
                </div>

                <div className="mt-1 grid w-full gap-2.5 mobile-landscape:col-start-1 mobile-landscape:row-start-2 mobile-landscape:mt-0">
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
            </div>,
            document.body,
          )
        : null}
    </main>
  );
}
