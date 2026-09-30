"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

import {
  ASTEROIDS_HEIGHT,
  ASTEROIDS_WIDTH,
  createAsteroidsEngine,
  type AsteroidsEngine,
  type AsteroidsSkin,
  type AsteroidsState,
} from "./engine";

export interface AsteroidsGameHandle {
  restart(): void;
}

interface AsteroidsGameProps {
  paused: boolean;
  skin: AsteroidsSkin;
  onStateChange: (state: AsteroidsState) => void;
  onGameOver: (finalScore: number) => void;
}

// Canvas 800x600 (4:3) escalado por CSS con object-contain: encaja dentro de
// la caja 16:10 de CrtFrame con franjas negras, sin tocar ese componente.
export const AsteroidsGame = forwardRef<
  AsteroidsGameHandle,
  AsteroidsGameProps
>(function AsteroidsGame({ paused, skin, onStateChange, onGameOver }, ref) {
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

    const engine = createAsteroidsEngine(
      canvas,
      {
        onStateChange: (state) => onStateChangeRef.current(state),
        onGameOver: (finalScore) => onGameOverRef.current(finalScore),
      },
      // Skin del primer render: el efecto corre una sola vez al montar; los
      // cambios posteriores llegan por setSkin en el efecto de abajo.
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
      width={ASTEROIDS_WIDTH}
      height={ASTEROIDS_HEIGHT}
      className="h-full w-full bg-black object-contain"
    />
  );
});
