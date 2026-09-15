"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

import {
  ASTEROIDS_HEIGHT,
  ASTEROIDS_WIDTH,
  createAsteroidsEngine,
  type AsteroidsEngine,
  type AsteroidsState,
} from "./engine";

export interface AsteroidsGameHandle {
  restart(): void;
}

interface AsteroidsGameProps {
  paused: boolean;
  onStateChange: (state: AsteroidsState) => void;
  onGameOver: (finalScore: number) => void;
}

// Canvas 800x600 (4:3) escalado por CSS con object-contain: encaja dentro de
// la caja 16:10 de CrtFrame con franjas negras, sin tocar ese componente.
export const AsteroidsGame = forwardRef<
  AsteroidsGameHandle,
  AsteroidsGameProps
>(function AsteroidsGame({ paused, onStateChange, onGameOver }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<AsteroidsEngine | null>(null);

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

    const engine = createAsteroidsEngine(canvas, {
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
      width={ASTEROIDS_WIDTH}
      height={ASTEROIDS_HEIGHT}
      className="h-full w-full object-contain"
    />
  );
});
