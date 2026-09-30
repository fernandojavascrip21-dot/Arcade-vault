"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

import {
  SERPIENTE_HEIGHT,
  SERPIENTE_WIDTH,
  createSerpienteEngine,
  type SerpienteEngine,
  type SerpienteSkin,
  type SerpienteState,
} from "./engine";

export interface SerpienteGameHandle {
  restart(): void;
}

interface SerpienteGameProps {
  paused: boolean;
  skin: SerpienteSkin;
  onStateChange: (state: SerpienteState) => void;
  onGameOver: (finalScore: number) => void;
}

// Canvas 1280x800 (16:10) escalado por CSS: tiene la misma proporción que la
// caja de CrtFrame, así que la ocupa entera sin franjas negras ni deformación.
export const SerpienteGame = forwardRef<
  SerpienteGameHandle,
  SerpienteGameProps
>(function SerpienteGame({ paused, skin, onStateChange, onGameOver }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SerpienteEngine | null>(null);

  // Refs para las callbacks: el motor se monta una sola vez (abajo), así
  // que siempre debe llamar a la versión más reciente de cada callback.
  const onStateChangeRef = useRef(onStateChange);
  const onGameOverRef = useRef(onGameOver);
  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);
  useEffect(() => {
    onGameOverRef.current = onGameOver;
  }, [onGameOver]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = createSerpienteEngine(
      canvas,
      {
        onStateChange: (state) => onStateChangeRef.current(state),
        onGameOver: (finalScore) => onGameOverRef.current(finalScore),
      },
      // Valor de `skin` en el primer render: el efecto solo corre al montar;
      // los cambios posteriores los aplica el efecto de `setSkin` de abajo.
      { initialSkin: skin },
    );
    engineRef.current = engine;
    engine.start();

    return () => {
      engine.stop();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    engineRef.current?.setPaused(paused);
  }, [paused]);

  useEffect(() => {
    engineRef.current?.setSkin(skin);
  }, [skin]);

  useImperativeHandle(ref, () => ({
    restart() {
      engineRef.current?.restart();
    },
  }));

  return (
    <canvas
      ref={canvasRef}
      width={SERPIENTE_WIDTH}
      height={SERPIENTE_HEIGHT}
      className="h-full w-full bg-black object-contain"
    />
  );
});
