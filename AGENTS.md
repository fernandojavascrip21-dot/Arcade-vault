<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Arcade Vault - Custom Agents & Skills

This project follows a Spec-Driven Design workflow and provides specialized agents and skills to assist with development. `CLAUDE.md` (which imports this file) holds the full project overview, routes, data layer, auth, games and play-room contracts; this file covers the agents, skills and the rules for using them.

## 🚦 Development Workflow Rules (AI Instructions)

1. **Specs First:** NEVER start coding a new feature or game directly. Check `specs/` first: the feature needs an approved spec (state `Aprobado` / `Approved`; `Draft` means not yet approved). Small follow-ups to an implemented spec go in a dated **addendum** section of that spec, not in a new spec.
2. **Missing Specs:** If a feature lacks a spec, use the `spec` skill (or `add-game` for a new game) to write one, state `Draft`, before any code.
3. **Implementing:** Use `spec-impl` (features) or `spec-impl-game` (games) on the `spec-NN-slug` branch. Work lands via PR into `main`; one PR per spec.
4. **New game pipeline:** `game-planner` (which game) → `add-game` or `game-jam` (spec; `game-jam` gives two `Draft` variants to choose from, then renumber the chosen one into `specs/NN-slug.md`) → `spec-impl-game` (code, then `skin-designer` → `mobile-porter` → `game-performance-booster`, strictly in that order, never in parallel, since they edit the same `play-room.tsx` and `engine.ts`).
5. **UI work:** Always use the `frontend-design` skill when designing user interfaces (user-level skill in `~/.claude/skills/`).
6. **Scope of agents:** Agents never touch Supabase data or scores, never change mechanics, and never commit. Schema changes go through the Supabase MCP as migrations, never from app code.
7. **Commits:** Only commit or push when the user asks. Commit messages follow `feat:` / `chore:` / `Refactor` style.

## 🤖 Specialized Agents (`.claude/agents/`)

All run on `model: sonnet`. For full rules, limits and output format read `.claude/agents/<name>.md`.

- **`game-planner`**: Evaluates game suggestions and decides which game comes next; keeps the to-do list in `references/games-suggestion-all.md`.
- **`game-jam`**: Turns an already chosen game into two `Draft` specs with different mechanics in `specs/game-jam/<slug>/` (`<slug>-a.md`, `<slug>-b.md`). No code.
- **`skin-designer`**: Makes sure a game has the `clasico` / `retro` / `neon` skins (Bloques: `retro` / `neon` / `pastel` / `pixel`) and adds the missing ones; registry in `references/games-skins.md`.
- **`mobile-porter`**: Makes a game playable on mobile (touch controller of spec 13, responsive play room of spec 14).
- **`game-performance-booster`**: Static performance audit of a game against the spec 17 rules; applies only fixes that keep frame and gameplay identical.

`skin-designer`, `mobile-porter` and `game-performance-booster` must be given a game (or "todos"); if not, they stop and ask. They document a dated addendum in the game's spec, run lint/build and never commit.

## 🛠️ Project Skills (`.agents/skills/`)

Symlinked from `.claude/skills/`: `spec`, `spec-impl`, `add-game`, `spec-impl-game`.

- **`spec`**: Designs a feature spec section by section (`specs/NN-slug.md`, `Draft`). No code.
- **`spec-impl`**: Implements an approved spec phase by phase on a `spec-NN-slug` branch, pausing to review diffs.
- **`add-game`**: `spec` variant for integrating a new playable game (port from `references/started-games/` or from scratch). Produces the spec only.
- **`spec-impl-game`**: `spec-impl` for game specs, then runs `skin-designer`, `mobile-porter` and `game-performance-booster` on the new game, sequentially.
- **`spec-v2`** / **`spec-impl-v2`** _(experimental, not symlinked, not invocable)_: `spec-v2` is a copy of `spec`; `spec-impl-v2` adds a strict rule to never implement anything "Out of scope" or deferred; it asks instead.

## 🪝 Hooks

- `.claude/hooks/format-and-lint.sh` (PostToolUse on `Write|Edit`): Prettier on `.ts/.tsx/.js/.md` and `eslint --fix` on code files. Unfixable ESLint errors block the edit (exit 2); fix the code rather than working around the hook.

## 🏗️ Project Architecture Reference

- **Games Core:** Framework-free Canvas engines in `components/games/<slug>/engine.ts` (exception: Asteroides lives in `components/games/asteroids/`). Each engine exports `create<Name>Engine(canvas, handlers, options?)` and owns its RAF loop and key listeners; React draws game-over and restarts.
- **React Wrappers:** `components/games/<slug>/<slug>-game.tsx` is a `forwardRef` wrapper inside `components/crt-frame.tsx` (16:10).
- **Skins:** Each game exports `<Name>Skin`, `<NAME>_SKINS`, `<NAME>_SKIN_STORAGE_KEY` (`arcadevault.<slug>.skin.v1`) and `setSkin()`. The default skin is always the server/hydration snapshot: do not read `localStorage` in a `useState` initializer or `setState` in a mount effect.
- **Play Room:** `app/play/[id]/play-room.tsx` uses explicit per-game `game.id === "<slug>"` branches (no generic registry). `fixed` overlays there must use `createPortal(…, document.body)`.
- **Touch & mobile:** Touch controller in `components/touch-controller/` (per-game `TOUCH_LAYOUTS` in `layouts.ts`). Responsive variants (`mobile:`, `desktop:`, `mobile-landscape:`, `desktop-short:`, `fullscreen-doc:`) must stay in sync with `lib/responsive.ts`.
- **Database:** Supabase clients and queries live in `lib/supabase/` (`server.ts`, `client.ts`, `queries.ts` — server-only). Server Actions in `app/**/actions.ts` (scores: `saveScoreAction`; auth: `app/auth/actions.ts`). Schema changes go through the Supabase MCP as migrations.
- **Auth:** Supabase Auth (spec 21). Login, signup and reset logic are Server Actions returning `AuthFormState`; passwords are validated with `PASSWORD_RE` / `validatePassword` (spec 22). Interfaces go in `lib/interfaces/`, constants in `lib/constants/`, auth form pieces in `components/auth/`.
- **State Management:** React Context in `contexts/` wired in `contexts/providers.tsx`: `ThemeProvider` → `SessionProvider` → `CreditsProvider`.
- **Security:** Headers in `next.config.ts`; checklist in `references/security-checklist.md`. No CSP yet (own spec).

## 📱 Mobile & Touch Guidelines

When porting or building games, desktop-first engines must be adapted for smartphone viewports and touch inputs. Use the `mobile-porter` agent and the touch controller in `components/touch-controller/`. The touch controller is shown only on `(pointer: coarse)`; its toggle lives in `localStorage` key `arcadevault.touch-controls.v1`.

## 📚 References

- `references/implementd-game.md`: catalog of implemented games.
- `references/games-suggestion-all.md`: games to-do list (owned by `game-planner`).
- `references/games-skins.md`: skin registry (owned by `skin-designer`).
- `references/started-games/`: git submodules used as reference sources; never commit changes inside them (`git submodule update --init` if empty).
- `references/source-assets/` (sprites) and `references/resource/` (original mockups).
