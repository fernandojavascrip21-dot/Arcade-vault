"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

import {
  SERPIENTE_HEIGHT,
  SERPIENTE_WIDTH,
  createSerpienteEngine,
  type SerpienteEngine,
  type SerpienteState,
} from "./engine";

export interface SerpienteGameHandle {
  restart(): void;
}

interface SerpienteGameProps {
  paused: boolean;
  onStateChange: (state: SerpienteState) => void;
  onGameOver: (finalScore: number) => void;
}

// Canvas 800x800 (1:1) escalado por CSS con object-contain: encaja dentro de
// la caja 16:10 de CrtFrame con franjas negras laterales, sin tocar ese
// componente.
export const SerpienteGame = forwardRef<
  SerpienteGameHandle,
  SerpienteGameProps
>(function SerpienteGame({ paused, onStateChange, onGameOver }, ref) {
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

    const engine = createSerpienteEngine(canvas, {
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
      width={SERPIENTE_WIDTH}
      height={SERPIENTE_HEIGHT}
      className="h-full w-full bg-black object-contain"
    />
  );
});
