with open("app/play/[id]/play-room.tsx", "r") as f:
    content = f.read()

old_code = """              ) : isRana ? (
                <RanaGame
                  ref={ranaGameRef}
                  paused={paused}
                  skin={ranaSkin}
                  onStateChange={handleRanaStateChange}
                  onGameOver={handleRanaGameOver}
                />
              ) : undefined"""

new_code = """              ) : isRana ? (
                <RanaGame
                  ref={ranaGameRef}
                  paused={paused}
                  skin={ranaSkin}
                  onStateChange={handleRanaStateChange}
                  onGameOver={handleRanaGameOver}
                />
              ) : isLaberinto ? (
                <LaberintoGame
                  ref={laberintoGameRef}
                  paused={paused}
                  onStateChange={handleLaberintoStateChange}
                  onGameOver={handleLaberintoGameOver}
                />
              ) : undefined"""

content = content.replace(old_code, new_code)

with open("app/play/[id]/play-room.tsx", "w") as f:
    f.write(content)

print("Patched art slot")
