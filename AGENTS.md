<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->


# Arcade Vault - Custom Agents & Skills

This project follows a Spec-Driven Design workflow and provides specialized agents and skills to assist with development.

## 🤖 Specialized Agents (`.claude/agents/`)

All run on `model: sonnet`. For full rules, limits and output format read `.claude/agents/<name>.md`.

- **`game-planner`**: Evaluates game suggestions and decides which game comes next; keeps `references/games-suggestion-all.md`.
- **`game-jam`**: Turns an already chosen game into two `Draft` specs with different mechanics in `specs/game-jam/<slug>/` (`<slug>-a.md`, `<slug>-b.md`). No code.
- **`skin-designer`**: Makes sure a game has the `clasico` / `retro` / `neon` skins and adds the missing ones; registry in `references/games-skins.md`.
- **`mobile-porter`**: Makes a game playable on mobile (touch controller of spec 13, responsive play room of spec 14).
- **`game-performance-booster`**: Static performance audit of a game against the spec 17 rules; applies only fixes that keep frame and gameplay identical.

`skin-designer`, `mobile-porter` and `game-performance-booster` must be given a game (or "todos"), document a dated addendum in the game's spec, never touch Supabase or scores and never commit.

## 🛠️ Project Skills (`.agents/skills/`)

These custom skills automate the Spec-Driven Design process (symlinked from `.claude/skills/`):

- **`spec`**: Designs and develops specifications step-by-step before any code is written.
- **`spec-impl`**: Implements an approved spec phase-by-phase on a `spec-NN-slug` branch.
- **`add-game`**: Designs the spec for integrating a new playable game (with Supabase leaderboards).
- **`spec-impl-game`**: Implements an approved game spec, then sequentially runs the `skin-designer`, `mobile-porter` and `game-performance-booster` agents.
- **`spec-v2`** / **`spec-impl-v2`** _(experimental, not symlinked)_: `spec-v2` is a copy of `spec`; `spec-impl-v2` adds a strict rule to never implement anything "Out of scope" or deferred.

User-level skill required by the project: **`frontend-design`** (`~/.claude/skills/`) — always use it when designing user interfaces.

> **Note:** Always check the `specs/` directory before starting any feature or bug fix, and use the appropriate skill/agent to carry out the work.

## 🚦 Development Workflow Rules (AI Instructions)

1. **Specs First:** NEVER start coding a new feature or game directly. Always verify if an approved markdown specification exists in the `specs/` directory.
2. **Missing Specs:** If a feature lacks a spec, use the `spec` or `add-game` skill to create one before proceeding.
3. **Implementing:** Use the `spec-impl` or `spec-impl-game` skill to implement an approved spec step-by-step.
4. **New game pipeline:** `game-planner` (which game) → `add-game` or `game-jam` (spec) → `spec-impl-game` (code, then skins → mobile → performance, in that order, never in parallel).

## 🏗️ Project Architecture Reference

- **Games Core:** Standalone Canvas engines reside in `components/games/[game-id]/engine.ts` (exception: Asteroides lives in `components/games/asteroids/`).
- **React Wrappers:** Games are integrated via React components (`[game-id]-game.tsx`).
- **Play Room:** The game container is `app/play/[id]/play-room.tsx` (explicit per-game branches, no generic registry).
- **Database:** Supabase queries and clients are in `lib/supabase/`; schema changes go through the Supabase MCP as migrations.
- **State Management:** Uses React Context (`CreditsProvider`, `SessionProvider`, `ThemeProvider`).

## 📱 Mobile & Touch Guidelines

When porting or building games, desktop-first engines must be adapted for smartphone viewports and touch inputs. Utilize the `mobile-porter` agent and the touch controller in `components/touch-controller/` (per-game `TOUCH_LAYOUTS` in `layouts.ts`).
