"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

import {
  BLOQUES_HEIGHT,
  BLOQUES_WIDTH,
  createBloquesEngine,
  type BloquesEngine,
  type BloquesState,
} from "./engine";

export interface BloquesGameHandle {
  restart(): void;
}

interface BloquesGameProps {
  paused: boolean;
  onStateChange: (state: BloquesState) => void;
  onGameOver: (finalScore: number) => void;
}

// Canvas 460x600 (tablero 300x600 + panel HUD lateral) escalado por CSS con
// object-contain: encaja dentro de la caja 16:10 de CrtFrame con franjas
// negras a los lados, sin tocar ese componente.
export const BloquesGame = forwardRef<BloquesGameHandle, BloquesGameProps>(
  function BloquesGame({ paused, onStateChange, onGameOver }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<BloquesEngine | null>(null);

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

      const engine = createBloquesEngine(canvas, {
        onStateChange: (state) => onStateChangeRef.current(state),
        onGameOver: (finalScore) => onGameOverRef.current(finalScore),
      });
      engineRef.current = engine;
      engine.start();

      return () => {
        engine.stop();
        engineRef.current = null;
      };
    }, []);

    useEffect(() => {
      engineRef.current?.setPaused(paused);
    }, [paused]);

    useImperativeHandle(ref, () => ({
      restart() {
        engineRef.current?.restart();
      },
    }));

    return (
      <canvas
        ref={canvasRef}
        width={BLOQUES_WIDTH}
        height={BLOQUES_HEIGHT}
        className="h-full w-full object-contain"
      />
    );
  },
);
