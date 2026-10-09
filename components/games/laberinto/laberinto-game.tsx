"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

import {
  LABERINTO_HEIGHT,
  LABERINTO_WIDTH,
  createLaberintoEngine,
  type LaberintoEngine,
  type LaberintoState,
} from "./engine";

export interface LaberintoGameHandle {
  restart(): void;
}

interface LaberintoGameProps {
  paused: boolean;
  onStateChange: (state: LaberintoState) => void;
  onGameOver: (finalScore: number) => void;
}

// Canvas 1280x800 (16:10) escalado por CSS: ocupa toda la caja CrtFrame sin franjas.
export const LaberintoGame = forwardRef<LaberintoGameHandle, LaberintoGameProps>(
  function LaberintoGame({ paused, onStateChange, onGameOver }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<LaberintoEngine | null>(null);

    // Refs para callbacks mutables
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

      const engine = createLaberintoEngine(canvas, {
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
        width={LABERINTO_WIDTH}
        height={LABERINTO_HEIGHT}
        className="h-full w-full bg-black object-contain"
      />
    );
  },
);
