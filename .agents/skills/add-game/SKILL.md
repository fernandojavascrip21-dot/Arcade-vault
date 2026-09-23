---
name: add-game
description: Designs the spec for integrating a new playable game (with its Supabase-backed leaderboard) into the arcade platform, whether ported from references/started-games/ or built from scratch. Use it before adapting or building a new game — it pre-loads the reusable engine/component/play-room contract established by specs 05-07 so the resulting spec doesn't re-derive it from scratch.
disable-model-invocation: true
argument-hint: "game slug, or a folder name under references/started-games/"
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(date:*)
---

# /add-game — Guided spec designer for a new game

## Session context

Today's date (use this for the spec header, never guess it):
!`date +%F`

Specs that already exist:
!`ls specs/ 2>/dev/null || echo "The specs/ folder does not exist yet"`

Reference games available to port (may or may not apply to this run):
!`ls references/started-games/ 2>/dev/null || echo "references/started-games/ does not exist"`

Games already ported into the platform:
!`ls components/games/ 2>/dev/null || echo "components/games/ does not exist yet"`

---

This skill is a specialized variant of `/spec`, scoped to exactly one kind of feature:
integrating a new playable game — canvas engine, HUD, credits/game-over flow, and its
Supabase-backed leaderboard row — into this arcade platform. **You don't write code here**,
exactly like `/spec`. Your job is to produce a spec at `specs/NN-slug.md`, in `Draft` state,
that a later `/spec-impl` run can execute without ambiguity.

**Before doing anything else, read `../spec/SKILL.md` and `../spec/template.md` in full.** This
file only describes what is _specific_ to games (the reusable contract, the two entry modes,
the extra questions to ask) — it is not a self-contained copy of `/spec`'s rules. Every phase
below assumes you already have `/spec`'s own Phase 1-4 instructions loaded from that live file,
not from a paraphrase, so that if `/spec` is ever updated (it comes from an external package,
`Klerith/fernando-skills`) this skill automatically follows the current version instead of a
stale summary.

## Why this skill exists

Specs `06-juego-asteroides-real.md` and `07-catalogo-y-leaderboard-supabase.md` already
designed and shipped the first real game (Asteroides). Together they established a reusable
contract:

- A framework-free canvas engine at `components/games/<slug>/engine.ts`, exporting a factory
  `create<Nombre>Engine(canvas, handlers): { start(), stop(), setPaused(paused), restart() }`,
  a `<Nombre>State` snapshot pushed via `onStateChange` only when it changes, and a single
  `onGameOver(finalScore)` signal. The engine owns its own RAF loop and keyboard listeners
  (added on `start`, removed on `stop`) and does **not** draw its own "game over" screen or
  auto-restart — that belongs to React.
- A thin `forwardRef` wrapper at `components/games/<slug>/<slug>-game.tsx`, mounting the engine
  once in a `useEffect`, exposing `restart()` via `useImperativeHandle`, and letterboxing a
  fixed-resolution `<canvas>` inside `CrtFrame`'s 16:10 box with `object-contain`.
- An explicit `game.id === "<slug>"` branch added to `app/play/[id]/play-room.tsx` (background,
  the `CrtFrame` `art` slot, the controls text, hiding "SIMULAR FIN DE PARTIDA", and the
  `restart()` call inside `replay()`). This integration is **not generic yet** — every new game
  edits this same file to add its own branch, same as Asteroides did.
- A leaderboard/score pipeline (`app/play/[id]/actions.ts` → `saveScoreAction` →
  `lib/supabase/server.ts` → `scores` table; reads via `lib/supabase/queries.ts`) that is
  **already fully generic by `game_id`**. Onboarding a new game needs zero changes here — only
  one new row in `public.games` (`id`, `title`, `category`, `desc`, `long`, `thumb`), inserted
  via a migration applied through the Supabase MCP tooling during implementation (as spec 07
  did), never through app code (the table has no insert policy from the client).

`template.md` in `../spec/` (the same template `/spec` uses — this skill does not fork it) is
what defines the exact section structure the spec will follow; you should already have read it
per the instruction above.

## Two entry modes

The user's game may or may not come from `references/started-games/`. Both are valid and use
the same four phases below, with a branch inside each phase — not two separate flows:

|         | **Mode A — port from `references/started-games/<NN-name>/`**                                                                                       | **Mode B — described from scratch, no reference folder**                                                                                                                                                |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 1 | Read that folder's `game.js`, `README.md`, `index.html` in full.                                                                                   | Nothing game-specific to read; only the precedent (specs 06/07 + the three files listed above).                                                                                                         |
| Phase 2 | Ask about README-vs-code mismatches, real canvas aspect ratio, and `window`/`document` coupling found in that `game.js` (see below).               | Ask mechanics, controls, game-over condition, and scoring model from scratch — the normal `/spec` Phase 2 categories (Scope/Data/UX states), applied to the description instead of to an existing file. |
| Phase 3 | The Data section describes the port: what carries over into `create<Nombre>Engine` as-is and what gets cut or adjusted, per what Phase 2 resolved. | The Data section designs `create<Nombre>Engine`/`<Nombre>State` fresh from the user's description — there is no source code to port.                                                                    |
| Phase 4 | Identical in both modes.                                                                                                                           | Identical in both modes.                                                                                                                                                                                |

In **neither** mode does this skill write real code. In Mode B, "the skill writes it" means it
drafts the spec's **Implementation plan** section describing the engine to build — not that it
generates `engine.ts` itself. Code, in both modes, is `/spec-impl`'s job, exactly like every
other feature in this project.

Determine which mode applies from `$ARGUMENTS`; if it's ambiguous or empty, ask.

## Phase 1 — Understand the context

0. **Read `../spec/SKILL.md` and `../spec/template.md` in full, if you have not already done so
   this run.** Do this before reading anything else below — everything that follows in this
   skill is written on top of what those two files say, and defers to them whenever this file's
   paraphrase and the live file disagree.
1. Do everything `/spec`'s own Phase 1 says (read the project-memory file in order — `CLAUDE.md`,
   `AGENTS.md`, `GEMINI.md`, `README.md`; check the `specs/` listing above; read the two most
   recent specs for conventions and language).
2. Read `specs/06-juego-asteroides-real.md` and `specs/07-catalogo-y-leaderboard-supabase.md`
   in full — the canonical precedent for everything this skill assumes.
3. Read `components/games/asteroids/engine.ts` and
   `components/games/asteroids/asteroids-game.tsx` — the real implementation of the contract
   described above.
4. Read `app/play/[id]/play-room.tsx` and confirm the `game.id === "asteroides"` branches
   still look the way they're described above. If the file has since grown a more generic
   per-game registration mechanism, note that and adapt the spec's plan accordingly instead of
   assuming the old pattern still applies.
5. If Mode A applies, read the referenced folder's `game.js`, `README.md`, and `index.html` in
   full before continuing to Phase 2.

If `$ARGUMENTS` comes in empty, ask which mode applies and, for Mode A, which folder under
`references/started-games/`.

## Phase 2 — Clarify through questions

Follow `/spec`'s own Phase 2 rules verbatim (blocks of 3-5 questions via `AskUserQuestion` when
available, concrete not open-ended, mark your recommendation, stop only once you can answer:
which files change, what the first and last executable steps are, how to verify it's done).

This skill already knows the infrastructure answers and does not re-ask them: the score
save/read pipeline is generic by `game_id` and needs no changes; the only Supabase change is
one new `games` row, inserted via a migration during implementation.

On top of `/spec`'s standard categories, always cover (when applicable to the chosen mode):

- **Mode A — README-vs-code mismatches.** Present the concrete discrepancies found (there is
  precedent in both directions — Asteroides' README mentions power-ups/a "shooting star" its
  code never implements, and spec 06 explicitly cut them; a game like Tetris's real `game.js`
  can implement a full extra mode its README never mentions). For each discrepancy, ask whether
  it belongs in this spec's scope — never assume either way.
- **Mode A — canvas aspect ratio vs. `CrtFrame`'s 16:10 box.** A reference at 800×600 (4:3)
  letterboxes the same way the proven Asteroides precedent already does — no new decision
  needed. Any other aspect ratio (e.g. a tall ~1:2 board) needs an explicit scaling/letterbox
  decision that spec 06 never covered — do not assume plain `object-contain` on the unmodified
  `CrtFrame` is automatically fine; ask.
- **Mode A — `window`/`document` coupling in the reference code.** If the original `game.js`
  grabs DOM elements by id directly instead of receiving an injected `canvas` (unlike the
  Asteroids precedent), the port is more than a 1:1 translation — it requires extracting that
  logic into the `create<Nombre>Engine(canvas, handlers)` factory. Make this its own plan step,
  never assume the port is mechanical.
- **Mode A — external dependencies** in the reference code (ES modules/`import`/`export`,
  audio assets referenced but missing from the folder, sprites, fonts). List each one and ask
  how it's resolved (import the asset into the repo? drop the feature if the asset is missing?).
- **Both modes — catalog metadata** for the new `games` row: `id`/slug, `title`, `category`,
  `desc`, `long`, `thumb`.
- **Both modes — controls and HUD** specific to this game: what replaces the controls text and
  the `HudStat` values in `play-room.tsx`.
- Fall back to `/spec`'s generic categories (scope, risks, closed decisions) for anything not
  already covered above.

## Phase 3 — Write the spec

Reuse `/spec`'s own Phase 3 exactly — same `template.md`, same fast-path rule (write the whole
spec and skip straight to Phase 4 once the three closing questions can be answered without
assuming anything; otherwise go section by section with confirmation after each). The only
difference here: thanks to Phase 1/2 above, the **Data model** section arrives pre-filled with
the real contract names (`create<Nombre>Engine`, `<Nombre>State`, `<Nombre>Handlers`,
`<Nombre>Engine`), and the **Decisions taken and discarded** section arrives pre-filled with
whatever README-vs-code mismatches and aspect-ratio strategy Phase 2 resolved.

## Phase 4 — Save the spec

Identical to `/spec`'s Phase 4: next sequential number from the `specs/` listing above,
kebab-case slug from the objective, date from the session context, state `Draft` by default,
seed `specs/.spec-config.yml` only if it's missing (never touch it if it already exists),
confirm the path, and remind the user to run `/spec-impl NN-slug` once they've reviewed and
approved it.

**Stop here.** Do not propose implementing the spec, writing the engine, or touching Supabase
in any way beyond this confirmation — that is `/spec-impl`'s job.

## Hard rules

- **Never write the spec file without having read `../spec/SKILL.md` and `../spec/template.md`
  first in this run.** This skill's own summaries of `/spec`'s phases are a convenience, not a
  substitute — the live files are the source of truth for structure, phrasing, and any rule
  this file doesn't mention.
- Never write code or touch Supabase during this command — only the spec's `.md` file at the
  end, exactly like `/spec`.
- Never assume a Mode A port is mechanical without having actually read the reference folder's
  `game.js` and `README.md`.
- Never skip the README-vs-code comparison when the source is
  `references/started-games/`.
- Never assume `play-room.tsx` doesn't need to change — today's integration is an explicit
  per-`id` branch, not a generic plugin system (re-verify this in Phase 1 step 4, since it may
  have changed since this skill was written).
- All other hard rules from `/spec` apply unchanged (never re-ask in Phase 3 what Phase 2 already
  answered, never assume unconfirmed decisions, split the spec if it's too big).

## Tone when asking questions

Same as `/spec`: direct and specific, no hedging, numbered questions when there are several,
recommendation labeled when you offer options.

## Arguments

`$ARGUMENTS` is either a folder name under `references/started-games/` (Mode A) or a short
description of the game to build from scratch (Mode B). If it's a bare kebab-case token that
matches an existing folder under `references/started-games/`, treat it as Mode A without
asking. If it's empty, ask which mode applies before continuing Phase 1.
