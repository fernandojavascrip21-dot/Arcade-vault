"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

import {
  RANA_HEIGHT,
  RANA_WIDTH,
  createRanaEngine,
  type RanaEngine,
  type RanaState,
} from "./engine";

export interface RanaGameHandle {
  restart(): void;
}

interface RanaGameProps {
  paused: boolean;
  onStateChange: (state: RanaState) => void;
  onGameOver: (finalScore: number) => void;
}

// Canvas 1280x800 (16:10) escalado por CSS: tiene la misma proporción que la
// caja de CrtFrame, así que la ocupa entera sin franjas negras ni deformación.
export const RanaGame = forwardRef<RanaGameHandle, RanaGameProps>(
  function RanaGame({ paused, onStateChange, onGameOver }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<RanaEngine | null>(null);

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

      const engine = createRanaEngine(canvas, {
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
        width={RANA_WIDTH}
        height={RANA_HEIGHT}
        className="h-full w-full bg-black object-contain"
      />
    );
  },
);
