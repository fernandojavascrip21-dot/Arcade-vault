"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

import {
  BOMBARDERO_HEIGHT,
  BOMBARDERO_WIDTH,
  createBombarderoEngine,
  type BombarderoEngine,
  type BombarderoSkin,
  type BombarderoState,
} from "./engine";

export interface BombarderoGameHandle {
  restart(): void;
}

interface BombarderoGameProps {
  paused: boolean;
  skin: BombarderoSkin;
  onStateChange: (state: BombarderoState) => void;
  onGameOver: (finalScore: number) => void;
}

// Canvas 1280x800 (16:10) escalado por CSS: tiene la misma proporción que la
// caja de CrtFrame, así que la ocupa entera sin franjas negras ni deformación.
export const BombarderoGame = forwardRef<
  BombarderoGameHandle,
  BombarderoGameProps
>(function BombarderoGame({ paused, skin, onStateChange, onGameOver }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<BombarderoEngine | null>(null);

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

    const engine = createBombarderoEngine(
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
      width={BOMBARDERO_WIDTH}
      height={BOMBARDERO_HEIGHT}
      className="h-full w-full bg-black object-contain"
    />
  );
});
