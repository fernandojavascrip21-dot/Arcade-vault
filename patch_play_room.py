import re

with open("app/play/[id]/play-room.tsx", "r") as f:
    content = f.read()

# 1. Imports
import_bombardero = """import {
  BombarderoGame,
  type BombarderoGameHandle,
} from "@/components/games/bombardero/bombardero-game";"""
import_laberinto = """import {
  BombarderoGame,
  type BombarderoGameHandle,
} from "@/components/games/bombardero/bombardero-game";
import { type LaberintoState } from "@/components/games/laberinto/engine";
import {
  LaberintoGame,
  type LaberintoGameHandle,
} from "@/components/games/laberinto/laberinto-game";"""
content = content.replace(import_bombardero, import_laberinto)

# 2. Refs
ref_rana = "const ranaGameRef = useRef<RanaGameHandle>(null);"
ref_laberinto = "const ranaGameRef = useRef<RanaGameHandle>(null);\n  const laberintoGameRef = useRef<LaberintoGameHandle>(null);"
content = content.replace(ref_rana, ref_laberinto)

# 3. isLaberinto
is_rana = "const isRana = game.id === \"rana\";"
is_laberinto = "const isRana = game.id === \"rana\";\n  const isLaberinto = game.id === \"laberinto\";"
content = content.replace(is_rana, is_laberinto)

# 4. isRealGame
is_real_game_old = "isBombardero ||\n    isRana;"
is_real_game_new = "isBombardero ||\n    isRana ||\n    isLaberinto;"
content = content.replace(is_real_game_old, is_real_game_new)

# 5. Handlers
handler_rana = """  function handleRanaGameOver(finalScore: number) {
    setScore(finalScore);
    setPaused(false);
    setOver(true);
  }"""
handler_laberinto = """  function handleRanaGameOver(finalScore: number) {
    setScore(finalScore);
    setPaused(false);
    setOver(true);
  }

  function handleLaberintoStateChange(state: LaberintoState) {
    setScore(state.score);
    setLives(state.lives);
    setLevel(state.level);
    setPaused(state.paused);
  }

  function handleLaberintoGameOver(finalScore: number) {
    setScore(finalScore);
    setPaused(false);
    setOver(true);
  }"""
content = content.replace(handler_rana, handler_laberinto)

# 6. Background
bg_old = "isBombardero ||\n                  isRana\n                    ? \"bg-black\""
bg_new = "isBombardero ||\n                  isRana ||\n                  isLaberinto\n                    ? \"bg-black\""
content = content.replace(bg_old, bg_new)

# 7. Art slot
art_rana = """                  {isRana ? (
                    <RanaGame
                      ref={ranaGameRef}
                      paused={paused}
                      skin={ranaSkin}
                      onStateChange={handleRanaStateChange}
                      onGameOver={handleRanaGameOver}
                    />
                  ) : null}"""
art_laberinto = """                  {isRana ? (
                    <RanaGame
                      ref={ranaGameRef}
                      paused={paused}
                      skin={ranaSkin}
                      onStateChange={handleRanaStateChange}
                      onGameOver={handleRanaGameOver}
                    />
                  ) : null}
                  {isLaberinto ? (
                    <LaberintoGame
                      ref={laberintoGameRef}
                      paused={paused}
                      onStateChange={handleLaberintoStateChange}
                      onGameOver={handleLaberintoGameOver}
                    />
                  ) : null}"""
content = content.replace(art_rana, art_laberinto)

# 8. Keyboard help
key_old = """                  : isRana
                    ? "← ↑ ↓ → / WASD SALTAR · ESPACIO LENGUA · ESC / P PAUSA"
                    : "← → / A D MOVER · ESPACIO ACCIÓN · ESC / P PAUSA"}"""
key_new = """                  : isRana
                    ? "← ↑ ↓ → / WASD SALTAR · ESPACIO LENGUA · ESC / P PAUSA"
                    : isLaberinto
                      ? "← ↑ ↓ → / WASD MOVER · ESC / P PAUSA"
                      : "← → / A D MOVER · ESPACIO ACCIÓN · ESC / P PAUSA"}"""
content = content.replace(key_old, key_new)

# 9. Replay
replay_rana = """    if (isRana) {
      ranaGameRef.current?.restart();
      setLives(5);
      setLevel(1);
    }"""
replay_laberinto = """    if (isRana) {
      ranaGameRef.current?.restart();
      setLives(5);
      setLevel(1);
    }
    if (isLaberinto) {
      laberintoGameRef.current?.restart();
      setLives(3);
      setLevel(1);
    }"""
content = content.replace(replay_rana, replay_laberinto)


with open("app/play/[id]/play-room.tsx", "w") as f:
    f.write(content)

print("Patched play-room.tsx")
