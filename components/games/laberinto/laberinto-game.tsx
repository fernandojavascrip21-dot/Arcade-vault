"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

import {
  LABERINTO_HEIGHT,
  LABERINTO_WIDTH,
  createLaberintoEngine,
  type LaberintoEngine,
  type LaberintoSkin,
  type LaberintoState,
} from "./engine";

export interface LaberintoGameHandle {
  restart(): void;
}

interface LaberintoGameProps {
  paused: boolean;
  skin: LaberintoSkin;
  onStateChange: (state: LaberintoState) => void;
  onGameOver: (finalScore: number) => void;
}

// Canvas 1280x800 (16:10) escalado por CSS: ocupa toda la caja CrtFrame sin franjas.
export const LaberintoGame = forwardRef<LaberintoGameHandle, LaberintoGameProps>(
  function LaberintoGame({ paused, skin, onStateChange, onGameOver }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<LaberintoEngine | null>(null);

    // Refs para callbacks mutables
    const onStateChangeRef = useRef(onStateChange);
    const onGameOverRef = useRef(onGameOver);
    // La skin inicial se lee al montar; los cambios llegan por setSkin.
    const skinRef = useRef(skin);

    useEffect(() => {
      onStateChangeRef.current = onStateChange;
    }, [onStateChange]);

    useEffect(() => {
      onGameOverRef.current = onGameOver;
    }, [onGameOver]);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const engine = createLaberintoEngine(
        canvas,
        {
          onStateChange: (state) => onStateChangeRef.current(state),
          onGameOver: (finalScore) => onGameOverRef.current(finalScore),
        },
        { initialSkin: skinRef.current },
      );
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
        width={LABERINTO_WIDTH}
        height={LABERINTO_HEIGHT}
        className="h-full w-full bg-black object-contain"
      />
    );
  },
);
