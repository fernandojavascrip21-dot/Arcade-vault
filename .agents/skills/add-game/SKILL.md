---
name: add-game
description: Designs the spec for integrating a new playable game (with its Supabase-backed leaderboard) into the arcade platform, whether ported from references/started-games/ or built from scratch. Use it before adapting or building a new game — it pre-loads the reusable engine/component/play-room contract established by specs 05-07 so the resulting spec doesn't re-derive it from scratch.
---

# add-game — Guided spec designer for a new game

This skill is a specialized variant of `spec`, scoped to exactly one kind of feature:
integrating a new playable game — canvas engine, HUD, credits/game-over flow, and its
Supabase-backed leaderboard row — into this arcade platform. **You don't write code here**,
exactly like `spec`. Your job is to produce a spec at `specs/NN-slug.md`, in `Draft` state,
that a later `spec-impl` run can execute without ambiguity.

**Before doing anything else, read `../spec/SKILL.md` and `../spec/template.md` in full.** This
file only describes what is _specific_ to games — it is not a self-contained copy of `spec`'s rules.

## Why this skill exists

Specs `06-juego-asteroides-real.md` and `07-catalogo-y-leaderboard-supabase.md` already
designed and shipped the first real game (Asteroides). Together they established a reusable
contract:

- A framework-free canvas engine at `components/games/<slug>/engine.ts`, exporting a factory
  `create<Nombre>Engine(canvas, handlers): { start(), stop(), setPaused(paused), restart() }`.
- A thin `forwardRef` wrapper at `components/games/<slug>/<slug>-game.tsx`.
- An explicit `game.id === "<slug>"` branch added to `app/play/[id]/play-room.tsx`.
- A leaderboard/score pipeline that is **already fully generic by `game_id`**.

## Two entry modes

1. **Mode A — port from `references/started-games/<NN-name>/`**
2. **Mode B — described from scratch, no reference folder**

In **neither** mode does this skill write real code. Code is `spec-impl`'s job.

## Phase 1 — Understand the context

0. **Read `../spec/SKILL.md` and `../spec/template.md` in full.**
1. Do everything `spec`'s own Phase 1 says (read project-memory, check `specs/` listing).
2. Read `specs/06-juego-asteroides-real.md` and `specs/07-catalogo-y-leaderboard-supabase.md` in full.
3. Read `components/games/asteroids/engine.ts` and `components/games/asteroids/asteroids-game.tsx`.
4. Read `app/play/[id]/play-room.tsx` and confirm the `game.id === "asteroides"` branches.
5. If Mode A applies, read the referenced folder's `game.js`, `README.md`, and `index.html`.

## Phase 2 — Clarify through questions

Follow `spec`'s own Phase 2 rules verbatim (blocks of 3-5 questions via `ask_user`).

On top of `spec`'s standard categories, always cover:
- **Mode A — README-vs-code mismatches.**
- **Mode A — canvas aspect ratio vs. `CrtFrame`'s 16:10 box.**
- **Mode A — `window`/`document` coupling in the reference code.**
- **Mode A — external dependencies.**
- **Both modes — catalog metadata.**
- **Both modes — controls and HUD.**

## Phase 3 — Write the spec

Reuse `spec`'s own Phase 3 exactly.

## Phase 4 — Save the spec

Identical to `spec`'s Phase 4. **Stop here.** Do not propose implementing the spec.

## Hard rules

- **Never write the spec file without having read `../spec/SKILL.md` and `../spec/template.md` first.**
- Never write code or touch Supabase during this command.
- Never assume a Mode A port is mechanical without having actually read the reference files.
