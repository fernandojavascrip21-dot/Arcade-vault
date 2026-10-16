import re

with open("app/play/[id]/play-room.tsx", "r") as f:
    content = f.read()

# Fix Art Slot
art_pattern = r"(\{isRana \? \(\s*<RanaGame[^>]+/>\s*\) : null\})"
art_replacement = r"\1\n                  {isLaberinto ? (\n                    <LaberintoGame\n                      ref={laberintoGameRef}\n                      paused={paused}\n                      onStateChange={handleLaberintoStateChange}\n                      onGameOver={handleLaberintoGameOver}\n                    />\n                  ) : null}"
content = re.sub(art_pattern, art_replacement, content)

# Fix background
bg_pattern = r"(isRana\s*\?\s*\"bg-black\")"
bg_replacement = r"isRana ||\n                  isLaberinto\n                    ? \"bg-black\""
content = re.sub(bg_pattern, bg_replacement, content)

# Fix keyboard help
key_pattern = r"(isRana\s*\?\s*\"[^\"]+\")"
key_replacement = r"\1\n                    : isLaberinto\n                      ? \"← ↑ ↓ → / WASD MOVER · ESC / P PAUSA\""
content = re.sub(key_pattern, key_replacement, content)

# Fix Replay
replay_pattern = r"(if \(isRana\) \{[^}]+\})"
replay_replacement = r"\1\n    if (isLaberinto) {\n      laberintoGameRef.current?.restart();\n      setLives(3);\n      setLevel(1);\n    }"
content = re.sub(replay_pattern, replay_replacement, content)

with open("app/play/[id]/play-room.tsx", "w") as f:
    f.write(content)

print("Patched play-room.tsx (pass 2)")
