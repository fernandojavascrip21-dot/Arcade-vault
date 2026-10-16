<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->


# Arcade Vault - Custom Agents & Skills

This project follows a Spec-Driven Design workflow and provides specialized agents and skills to assist with development.

## 🤖 Specialized Agents (`.claude/agents/`)

These agents are designed for specific tasks related to game development in Arcade Vault:

- **`skin-designer.md`**: Used for designing and generating custom themes/skins for games.
- **`game-performance-booster.md`**: Optimizes the Canvas engines and React components for higher frame rates and efficiency.
- **`mobile-porter.md`**: Adapts existing desktop-first game engines to be responsive and play smoothly on mobile devices with touch controls.
- **`game-planner.md`**: Helps in planning the architecture and mechanics of new games.
- **`game-jam.md`**: Specialized agent for rapid prototyping and game jam style development.

## 🛠️ Project Skills (`.agents/skills/`)

These custom skills automate the Spec-Driven Design process:

- **`spec`**: Designs and develops specifications step-by-step before any code is written.
- **`spec-impl`**: Implements an approved spec phase-by-phase, ensuring high code quality.
- **`add-game`**: Designs the spec for integrating a new playable game (with Supabase leaderboards).
- **`spec-impl-game`**: Implements an approved game spec, and sequentially runs the `skin-designer`, `mobile-porter`, and `game-performance-booster` agents.

> **Note:** Always check the `specs/` directory before starting any feature or bug fix, and use the appropriate skill/agent to carry out the work.

## 🚦 Development Workflow Rules (AI Instructions)

1. **Specs First:** NEVER start coding a new feature or game directly. Always verify if an approved markdown specification exists in the `specs/` directory.
2. **Missing Specs:** If a feature lacks a spec, use the `spec` or `add-game` skill to create one before proceeding.
3. **Implementing:** Use the `spec-impl` or `spec-impl-game` skill to implement an approved spec step-by-step.

## 🏗️ Project Architecture Reference

- **Games Core:** Standalone Canvas engines reside in `components/games/[game-id]/engine.ts`.
- **React Wrappers:** Games are integrated via React components (`[game-id]-game.tsx`).
- **Play Room:** The generic game container is located at `app/play/[id]/play-room.tsx`.
- **Database:** Supabase queries and schema definitions are in `lib/supabase/`.
- **State Management:** Uses React Context (`CreditsProvider`, `SessionProvider`, `ThemeProvider`).

## 📱 Mobile & Touch Guidelines

When porting or building games, desktop-first engines must be adapted for smartphone viewports and touch inputs. Utilize the `mobile-porter` agent and integrate the custom touch controllers available in `components/games/controllers/`.
