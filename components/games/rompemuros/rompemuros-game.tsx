"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

import {
  ROMPEMUROS_HEIGHT,
  ROMPEMUROS_WIDTH,
  createRompemurosEngine,
  type RompemurosEngine,
  type RompemurosSkin,
  type RompemurosState,
} from "./engine";

export interface RompemurosGameHandle {
  restart(): void;
  movePaddleBy(delta: number): number | undefined;
}

interface RompemurosGameProps {
  paused: boolean;
  skin: RompemurosSkin;
  onStateChange: (state: RompemurosState) => void;
  onGameOver: (finalScore: number) => void;
}

// Canvas 800x600 (4:3) escalado por CSS con object-contain: encaja dentro de
// la caja 16:10 de CrtFrame con franjas negras, sin tocar ese componente.
export const RompemurosGame = forwardRef<
  RompemurosGameHandle,
  RompemurosGameProps
>(function RompemurosGame({ paused, skin, onStateChange, onGameOver }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<RompemurosEngine | null>(null);

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

    const engine = createRompemurosEngine(
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
    movePaddleBy(delta: number) {
      return engineRef.current?.movePaddleBy(delta);
    },
  }));

  return (
    <canvas
      ref={canvasRef}
      width={ROMPEMUROS_WIDTH}
      height={ROMPEMUROS_HEIGHT}
      className="h-full w-full bg-black object-contain"
    />
  );
});
