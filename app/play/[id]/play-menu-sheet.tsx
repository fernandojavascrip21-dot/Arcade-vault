"use client";

import { X } from "lucide-react";
import {
  useEffect,
  useEffectEvent,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

import { ThemeToggleButton } from "@/components/nav-bar";
import { DESKTOP_QUERY } from "@/lib/responsive";

// Menú "OPCIONES" de la sala de juego: SKIN, MANDO, TEMA y SALIR. En móvil es
// una hoja inferior (spec 14); en escritorio, un panel anclado bajo el botón ⋮
// (spec 15). Mismo árbol: solo cambia la colocación por CSS.
// Tiene el aire del menú de servicio de un mueble arcade: línea de estado,
// cursor parpadeante y opciones marcadas con ▸.

type SkinControl = {
  value: string;
  options: ReadonlyArray<{ id: string; label: string }>;
  onChange: (id: string) => void;
};

const FOCUSABLE =
  'button:not([disabled]), [href], input, select, [tabindex]:not([tabindex="-1"])';

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cian";

export function PlayMenuSheet({
  open,
  onClose,
  gameName,
  paused,
  skins,
  touch,
  onExit,
  returnFocusRef,
  anchor,
}: {
  open: boolean;
  onClose: () => void;
  gameName: string;
  paused: boolean;
  skins?: SkinControl;
  // Solo si el dispositivo es táctil y el juego es real (spec 13).
  touch?: { visible: boolean; toggle: () => void };
  onExit: () => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
  // Esquina inferior derecha del botón ⋮, en px de viewport. Solo se usa en
  // `desktop:`; la calcula PlayRoom al abrir.
  anchor?: { top: number; right: number } | null;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Foco al primer control al abrir; de vuelta al botón ⋮ al cerrar.
  useEffect(() => {
    if (!open) return;
    const returnTo = returnFocusRef.current;
    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    return () => returnTo?.focus();
  }, [open, returnFocusRef]);

  // En escritorio el panel está anclado al ⋮: si la ventana cambia de tamaño
  // o de pantalla completa, el ancla deja de valer y se cierra. En móvil la
  // hoja no depende del ancla (y la barra del navegador dispara `resize`).
  // useEffectEvent: el efecto no puede depender de `onClose`. El cambio de
  // pantalla completa vuelve a renderizar PlayRoom de forma síncrona dentro
  // del propio evento, y re-suscribirse ahí se salta este listener.
  const closeIfAnchored = useEffectEvent(() => {
    if (window.matchMedia(DESKTOP_QUERY).matches) onClose();
  });
  useEffect(() => {
    if (!open) return;
    const onLayoutChange = () => closeIfAnchored();
    window.addEventListener("resize", onLayoutChange);
    document.addEventListener("fullscreenchange", onLayoutChange);
    return () => {
      window.removeEventListener("resize", onLayoutChange);
      document.removeEventListener("fullscreenchange", onLayoutChange);
    };
  }, [open]);

  if (!open) return null;

  const anchorStyle = anchor
    ? ({
        "--menu-top": `${anchor.top}px`,
        "--menu-right": `${anchor.right}px`,
      } as CSSProperties)
    : undefined;

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    // Trampa de foco: Tab no sale de la hoja mientras está abierta.
    if (e.key !== "Tab" || !panelRef.current) return;
    const items = Array.from(
      panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
    );
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  // Radio group accesible: ← → / ↑ ↓ recorren las skins.
  const handleSkinKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!skins) return;
    const step =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? 1
        : e.key === "ArrowLeft" || e.key === "ArrowUp"
          ? -1
          : 0;
    if (step === 0) return;
    e.preventDefault();
    const index = skins.options.findIndex((s) => s.id === skins.value);
    const next =
      skins.options[
        (index + step + skins.options.length) % skins.options.length
      ];
    skins.onChange(next.id);
    e.currentTarget
      .querySelector<HTMLElement>(`[data-skin="${next.id}"]`)
      ?.focus();
  };

  // Portal a <body>: el <main> de la sala tiene `transform` (animate-fade) y
  // sería el bloque contenedor de este `fixed`, no la pantalla.
  return createPortal(
    <div
      className="fixed inset-0 z-[65] animate-fade bg-[rgba(4,4,9,.72)] motion-reduce:animate-none desktop:bg-transparent"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="play-menu-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        style={anchorStyle}
        className="absolute inset-x-0 bottom-0 mx-auto grid max-h-[calc(100dvh-16px)] w-full max-w-[520px] animate-sheet content-start gap-5 overflow-y-auto border-x border-t-2 border-cian/70 border-t-cian bg-background px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-4 shadow-[0_-10px_50px_rgba(0,245,255,.22)] motion-reduce:animate-none mobile-landscape:max-w-[420px] desktop:inset-x-auto desktop:bottom-auto desktop:right-[var(--menu-right,18px)] desktop:top-[var(--menu-top,72px)] desktop:mx-0 desktop:max-h-[calc(100dvh-var(--menu-top,72px)-16px)] desktop:w-80 desktop:animate-fade desktop:border-b desktop:pb-5 desktop:shadow-[0_14px_50px_rgba(0,245,255,.22)] desktop:motion-reduce:animate-none"
      >
        <header className="flex items-start justify-between gap-3">
          <div className="grid gap-2 pt-1">
            <span className="text-[10px] uppercase tracking-[2px] text-texto-tenue">
              {gameName}
              {paused ? " · EN PAUSA" : ""}
            </span>
            <h2
              id="play-menu-title"
              className="font-display text-sm tracking-wider text-cian [text-shadow:0_0_12px_rgba(0,245,255,.6)]"
            >
              OPCIONES<span className="animate-caret">_</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar opciones"
            className={`grid size-11 shrink-0 place-items-center border border-foreground/25 text-texto-tenue transition-colors hover:border-cian hover:text-cian active:scale-95 ${focusRing}`}
          >
            <X size={18} aria-hidden />
          </button>
        </header>

        {skins ? (
          <section className="grid gap-2.5">
            <span
              id="play-menu-skin"
              className="text-[10px] tracking-[2px] text-texto-tenue"
            >
              SKIN
            </span>
            <div
              role="radiogroup"
              aria-labelledby="play-menu-skin"
              onKeyDown={handleSkinKeyDown}
              className="grid grid-cols-2 gap-2"
            >
              {skins.options.map((s) => {
                const checked = s.id === skins.value;
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    tabIndex={checked ? 0 : -1}
                    data-skin={s.id}
                    onClick={() => skins.onChange(s.id)}
                    className={`flex min-h-12 items-center gap-2 border px-3 text-left font-display text-[9px] tracking-wider transition-colors active:scale-95 ${focusRing} ${
                      checked
                        ? "border-cian bg-cian/15 text-cian shadow-[0_0_14px_-4px_var(--cian)]"
                        : "border-foreground/15 text-texto-tenue hover:border-cian/60 hover:text-foreground"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`font-sans text-sm leading-none ${checked ? "" : "invisible"}`}
                    >
                      ▸
                    </span>
                    {s.label}
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="grid gap-2">
          {touch ? (
            <button
              type="button"
              role="switch"
              aria-checked={touch.visible}
              onClick={touch.toggle}
              className={`flex min-h-12 items-center justify-between gap-3 border border-foreground/15 px-3 text-left transition-colors hover:border-cian/60 active:scale-[.98] ${focusRing}`}
            >
              <span className="font-display text-[9px] tracking-wider text-foreground">
                MANDO TÁCTIL
              </span>
              <span
                aria-hidden
                className={`flex items-center gap-2 font-display text-[9px] ${
                  touch.visible ? "text-cian" : "text-texto-tenue"
                }`}
              >
                <span
                  className={`size-2 rounded-full ${
                    touch.visible
                      ? "bg-cian shadow-[0_0_8px_var(--cian)]"
                      : "bg-texto-debil/60"
                  }`}
                />
                {touch.visible ? "ON" : "OFF"}
              </span>
            </button>
          ) : null}

          <div className="flex min-h-12 items-center justify-between gap-3 border border-foreground/15 py-1 pl-3 pr-1">
            <span className="font-display text-[9px] tracking-wider text-foreground">
              TEMA
            </span>
            <ThemeToggleButton className={`size-11 ${focusRing}`} />
          </div>
        </section>

        <button
          type="button"
          onClick={onExit}
          className={`min-h-12 w-full border border-magenta/60 font-display text-[10px] tracking-wider text-magenta transition-colors hover:bg-magenta/15 active:scale-95 ${focusRing}`}
        >
          SALIR
        </button>
      </div>
    </div>,
    document.body,
  );
}
