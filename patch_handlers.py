with open("app/play/[id]/play-room.tsx", "r") as f:
    content = f.read()

old_code = """  function handleRanaGameOver(finalScore: number) {
    setScore(finalScore);
    setPaused(false);
    setOver(true);
  }"""

new_code = """  function handleRanaGameOver(finalScore: number) {
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

content = content.replace(old_code, new_code)

with open("app/play/[id]/play-room.tsx", "w") as f:
    f.write(content)

print("Patched handlers")
