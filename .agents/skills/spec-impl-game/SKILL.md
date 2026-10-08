---
name: spec-impl-game
description: Implements an approved game spec exactly like spec-impl (same phases, same rules), then runs the skin-designer, mobile-porter and game-performance-booster agents on the new game, one after the other — never in parallel.
---

# spec-impl-game — Implementer of approved game specs

This skill is a specialized variant of `spec-impl`, scoped to exactly one kind of spec: one that
integrates a **new playable game** (the kind `add-game` produces). It implements the spec with
`spec-impl`'s own rules and then finishes the game pipeline by running three project agents in
sequence: `skin-designer` first, `mobile-porter` second, `game-performance-booster` third.

**Before doing anything else, read `../spec-impl/SKILL.md` in full.** This file only describes
what is _specific_ to games — it is not a self-contained copy of `spec-impl`'s rules.

## Phases 1–4 — Delegated to `spec-impl`

Follow Phases 1 to 4 of `../spec-impl/SKILL.md` verbatim.

Two game-specific additions:

1. **Identify the game at the end of Phase 3, before implementing anything.** Extract the game's
   id/slug from the spec. Show it with the spec summary:
   ```
   Game:   <slug>   (components/games/<folder>/)
   After the last step: skin-designer → mobile-porter → game-performance-booster (in sequence)
   ```

2. **Do not print `spec-impl`'s closing message** when the last step is done. Go on to Phase 5 instead.

## Phase 5 — Skins, mobile support and performance (sequential)

The three agents run one after the other, never in parallel. Use `invoke_agent` (e.g., with `generalist`) providing the instructions from the corresponding files in `.claude/agents/`.

1. **skin-designer:** Use instructions from `.claude/agents/skin-designer.md`. Prompt must name the game and provide context.
2. **Wait for final report.** Do not launch the next agent until the current one finishes.
3. **mobile-porter:** Use instructions from `.claude/agents/mobile-porter.md`.
4. **Wait for final report.**
5. **game-performance-booster:** Use instructions from `.claude/agents/game-performance-booster.md`.
6. **Wait for final report.**

## Closing

After the three agents have finished, close with a summary of their results and the final reminder to verify acceptance criteria.
