"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import type {
  ActionIcon,
  DpadDirection,
  KeyCode,
  TouchAction,
  TouchLayout,
} from "./layouts";
import { pressKey, releaseAll, releaseKey } from "./synthetic-keys";

// "Arcade Universal Controller" (spec 13): D-pad, deslizador y botones de
// acción que despachan teclado sintético a los motores. Solo pinta las piezas
// que declara el `layout` del juego.

type TouchControllerProps = {
  layout: TouchLayout;
  // paused || modal de fin abierto → suelta todo y no emite nada.
  disabled: boolean;
  onPaddle?: (ratio: number) => void;
};

type Hold = {
  code: KeyCode;
  timeout: number | null;
  interval: number | null;
};

const DEAD_ZONE = 0.2; // fracción del radio del D-pad

function haptic() {
  try {
    navigator.vibrate?.(10);
  } catch {
    // Sin vibración (iOS, permisos): no pasa nada.
  }
}

function clearTimers(hold: Hold) {
  if (hold.timeout !== null) window.clearTimeout(hold.timeout);
  if (hold.interval !== null) window.clearInterval(hold.interval);
}

export function TouchController({
  layout,
  disabled,
  onPaddle,
}: TouchControllerProps) {
  // Una "hold" por pieza ("dpad" o id de acción): tecla pulsada + timers DAS/ARR.
  const holds = useRef(new Map<string, Hold>());
  const dirRef = useRef<DpadDirection | null>(null);
  const dpadPointer = useRef<number | null>(null);
  const sliderPointer = useRef<number | null>(null);

  const [dir, setDir] = useState<DpadDirection | null>(null);
  const [pressed, setPressed] = useState<Record<string, boolean>>({});
  const [ratio, setRatio] = useState(0.5);
  const [sliding, setSliding] = useState(false);

  const endHold = useCallback((piece: string) => {
    const hold = holds.current.get(piece);
    if (!hold) return;
    clearTimers(hold);
    holds.current.delete(piece);
    releaseKey(hold.code);
  }, []);

  const startHold = useCallback(
    (piece: string, code: KeyCode) => {
      endHold(piece);
      pressKey(code);
      haptic();
      const hold: Hold = { code, timeout: null, interval: null };
      const repeat = layout.repeat;
      if (repeat?.codes.includes(code)) {
        hold.timeout = window.setTimeout(() => {
          hold.interval = window.setInterval(
            () => pressKey(code),
            repeat.intervalMs,
          );
        }, repeat.delayMs);
      }
      holds.current.set(piece, hold);
    },
    [layout.repeat, endHold],
  );

  const endAll = useCallback(() => {
    for (const hold of holds.current.values()) clearTimers(hold);
    holds.current.clear();
    dirRef.current = null;
    releaseAll();
  }, []);

  const resetAll = useCallback(() => {
    endAll();
    setDir(null);
    setPressed({});
    setSliding(false);
  }, [endAll]);

  // Pausa / modal de fin: suelta las teclas. El estado visual se oculta en
  // render con `disabled`, sin setState en el efecto.
  useEffect(() => {
    if (disabled) endAll();
  }, [disabled, endAll]);

  // Teclas pegadas: cambio de app/pestaña o pérdida de foco, y al desmontar.
  useEffect(() => {
    const onBlur = () => resetAll();
    const onVisibility = () => {
      if (document.hidden) resetAll();
    };
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      endAll();
    };
  }, [endAll, resetAll]);

  // ---- D-pad: una zona, dirección por sector angular ----

  function directionAt(
    e: ReactPointerEvent<HTMLElement>,
  ): DpadDirection | null {
    const rect = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    if (Math.hypot(dx, dy) < (rect.width / 2) * DEAD_ZONE) return null;
    const next: DpadDirection =
      Math.abs(dx) > Math.abs(dy)
        ? dx < 0
          ? "left"
          : "right"
        : dy < 0
          ? "up"
          : "down";
    return layout.dpad?.[next] ? next : null;
  }

  function updateDpad(next: DpadDirection | null) {
    if (next === dirRef.current) return;
    dirRef.current = next;
    setDir(next);
    const code = next ? layout.dpad?.[next] : undefined;
    if (code) startHold("dpad", code);
    else endHold("dpad");
  }

  function onDpadDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (disabled) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dpadPointer.current = e.pointerId;
    updateDpad(directionAt(e));
  }

  function onDpadMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (disabled || e.pointerId !== dpadPointer.current) return;
    updateDpad(directionAt(e));
  }

  function onDpadEnd(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.pointerId !== dpadPointer.current) return;
    dpadPointer.current = null;
    // Siempre limpia (también si una pausa ya soltó la tecla a mitad de toque).
    dirRef.current = null;
    setDir(null);
    endHold("dpad");
  }

  // ---- Botones de acción ----

  function onActionDown(
    action: TouchAction,
    e: ReactPointerEvent<HTMLButtonElement>,
  ) {
    if (disabled) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    startHold(action.id, action.code);
    setPressed((p) => ({ ...p, [action.id]: true }));
  }

  function onActionEnd(action: TouchAction) {
    endHold(action.id);
    setPressed((p) => (p[action.id] ? { ...p, [action.id]: false } : p));
  }

  // ---- Deslizador de la pala ----

  function slideTo(e: ReactPointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const next = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setRatio(next);
    onPaddle?.(next);
  }

  function onSliderDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (disabled) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    sliderPointer.current = e.pointerId;
    setSliding(true);
    slideTo(e);
  }

  function onSliderMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (disabled || e.pointerId !== sliderPointer.current) return;
    slideTo(e);
  }

  function onSliderEnd(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.pointerId !== sliderPointer.current) return;
    sliderPointer.current = null;
    setSliding(false);
  }

  const activeDir = disabled ? null : dir;
  const isPressed = (id: string) => !disabled && !!pressed[id];
  const anyActive =
    activeDir !== null ||
    (!disabled && sliding) ||
    layout.actions.some((a) => isPressed(a.id));

  const hasDpad = !!layout.dpad;
  const soloDpad = hasDpad && layout.actions.length === 0;

  return (
    <section
      aria-label="Control táctil"
      className="mt-4 touch-none select-none rounded-[18px] border border-cian/30 bg-cian/[.04] px-4 pb-5 pt-3.5 shadow-[0_0_36px_-10px_var(--cian)]"
      style={{ WebkitTouchCallout: "none" }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <header className="mb-4 flex items-center justify-center gap-2.5">
        <span
          aria-hidden
          className={`size-2 rounded-full transition-colors duration-75 motion-reduce:transition-none ${
            anyActive
              ? "bg-cian shadow-[0_0_8px_var(--cian)]"
              : "bg-texto-debil/60"
          }`}
        />
        <span className="font-display text-[9px] tracking-[2px] text-cian">
          ARCADE UNIVERSAL CONTROLLER
        </span>
      </header>

      {layout.paddleSlider ? (
        <div className="mb-5 px-6">
          <div
            role="slider"
            aria-label="Pala"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(ratio * 100)}
            className="relative h-14 cursor-pointer"
            onPointerDown={onSliderDown}
            onPointerMove={onSliderMove}
            onPointerUp={onSliderEnd}
            onPointerCancel={onSliderEnd}
            onLostPointerCapture={onSliderEnd}
          >
            <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full border border-cian/40 bg-cian/[.08]" />
            <div
              className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-cian/50"
              style={{ left: 0, width: `${ratio * 100}%` }}
            />
            <div
              className={`absolute top-1/2 grid h-12 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-lg border-2 border-cian bg-background transition-shadow duration-75 motion-reduce:transition-none ${
                sliding && !disabled
                  ? "shadow-[0_0_20px_var(--cian)]"
                  : "shadow-[0_0_10px_-2px_var(--cian)]"
              }`}
              style={{ left: `${ratio * 100}%` }}
            >
              <span className="h-0.5 w-7 rounded-full bg-cian" />
            </div>
          </div>
        </div>
      ) : null}

      <div
        className={`flex items-center gap-4 ${
          hasDpad && !soloDpad ? "justify-between" : "justify-center"
        }`}
      >
        {hasDpad ? (
          <div
            role="group"
            aria-label="Cruceta"
            className={`relative aspect-square cursor-pointer ${
              soloDpad ? "w-[min(62vw,220px)]" : "w-[min(46vw,184px)]"
            }`}
            onPointerDown={onDpadDown}
            onPointerMove={onDpadMove}
            onPointerUp={onDpadEnd}
            onPointerCancel={onDpadEnd}
            onLostPointerCapture={onDpadEnd}
          >
            <Dpad layout={layout} active={activeDir} />
          </div>
        ) : null}

        {layout.actions.length > 0 ? (
          <div className="flex items-start gap-3.5">
            {layout.actions.map((action, i) => (
              <button
                key={action.id}
                type="button"
                aria-label={action.label}
                className={`grid justify-items-center gap-1.5 ${
                  layout.actions.length > 1 && i === 0 ? "mt-9" : ""
                }`}
                onPointerDown={(e) => onActionDown(action, e)}
                onPointerUp={() => onActionEnd(action)}
                onPointerCancel={() => onActionEnd(action)}
                onLostPointerCapture={() => onActionEnd(action)}
              >
                <span
                  className={`grid size-16 place-items-center rounded-full border-2 border-cian/80 text-cian transition-[transform,background-color,box-shadow] duration-75 motion-reduce:transition-none ${
                    isPressed(action.id)
                      ? "scale-[.94] bg-cian/25 shadow-[0_0_22px_var(--cian)]"
                      : "bg-cian/[.06] shadow-[0_0_10px_-2px_var(--cian)]"
                  }`}
                >
                  <ActionGlyph icon={action.icon} />
                </span>
                <span className="font-display text-[8px] tracking-[1px] text-cian">
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

// ---- Piezas visuales ----

const DIR_ROTATION: Record<DpadDirection, number> = {
  up: 0,
  right: 90,
  down: 180,
  left: 270,
};

// Octágono de la placa (radio 84, vértices en 22.5° + 45°·k).
const OCTAGON = Array.from({ length: 8 }, (_, k) => {
  const a = ((22.5 + 45 * k) * Math.PI) / 180;
  return `${(100 + 84 * Math.cos(a)).toFixed(1)},${(100 + 84 * Math.sin(a)).toFixed(1)}`;
}).join(" ");

// Anillo exterior: 4 arcos de 50° centrados en las diagonales (r = 95).
const RING_C = 2 * Math.PI * 95;
const RING_DASH = `${(RING_C * 50) / 360} ${(RING_C * 40) / 360}`;
const RING_OFFSET = -(RING_C * 20) / 360;

function Dpad({
  layout,
  active,
}: {
  layout: TouchLayout;
  active: DpadDirection | null;
}) {
  return (
    <svg
      viewBox="0 0 200 200"
      className="h-full w-full overflow-visible"
      aria-hidden
    >
      <circle
        cx="100"
        cy="100"
        r="95"
        fill="none"
        stroke="var(--cian)"
        strokeOpacity={0.45}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={RING_DASH}
        strokeDashoffset={RING_OFFSET}
      />
      <polygon
        points={OCTAGON}
        fill="var(--cian)"
        fillOpacity={0.05}
        stroke="var(--cian)"
        strokeOpacity={0.2}
        strokeWidth="1.5"
      />
      {(Object.keys(DIR_ROTATION) as DpadDirection[]).map((d) => {
        const enabled = !!layout.dpad?.[d];
        const on = active === d;
        return (
          <g
            key={d}
            transform={`rotate(${DIR_ROTATION[d]} 100 100)`}
            opacity={enabled ? 1 : 0.22}
            style={
              on ? { filter: "drop-shadow(0 0 6px var(--cian))" } : undefined
            }
          >
            <path
              d="M86 22 H114 Q124 22 124 32 V66 L100 90 L76 66 V32 Q76 22 86 22 Z"
              fill="var(--cian)"
              fillOpacity={on ? 0.3 : 0.07}
              stroke="var(--cian)"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <path
              d="M90 52 L100 42 L110 52"
              fill="none"
              stroke="var(--cian)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        );
      })}
    </svg>
  );
}

const GLYPHS: Record<ActionIcon, string> = {
  // Mira
  fire: "M12 3v4 M12 17v4 M3 12h4 M17 12h4 M12 12h.01 M12 7a5 5 0 1 0 0 10a5 5 0 1 0 0-10",
  // Bomba con mecha
  bomb: "M10.5 8.5a6 6 0 1 0 5 5 M14 10l3-3 M19 3v2 M21 5h-2 M17.5 3.5l1 1",
  // Giro
  rotate: "M19.5 12a7.5 7.5 0 1 1-2.2-5.3 M19.5 4v4.5H15",
  // Caída dura
  drop: "M12 3v12 M7 10l5 5 5-5 M5 20h14",
  // Lanzar desde la pala
  launch: "M5 20h14 M12 16V5 M7 10l5-5 5 5",
};

function ActionGlyph({ icon }: { icon: ActionIcon }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-7"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={GLYPHS[icon]} />
    </svg>
  );
}
