# Project Overview: Arcade Vault

Arcade Vault is a modern, retro-styled web platform for playing classic arcade games and competing for high scores. It features a curated catalog of games, a global Hall of Fame, and a responsive "Play Room" experience that mimics a CRT monitor.

## Tech Stack
- **Framework:** Next.js 15+ (App Router)
- **Library:** React 19
- **Styling:** Tailwind CSS 4
- **Backend:** Supabase (Auth & Database)
- **Communication:** Resend (Contact Form)
- **Icons:** Lucide React

## Architecture & Conventions
- **Spec Driven Design:** The project follows a strict methodology where features are designed in the `specs/` directory and then implemented step-by-step. Implementation status and history are tracked in these markdown files.
- **Game Implementation:** Games (e.g., Asteroids, Tetris, Arkanoid, Snake) are implemented as standalone Canvas engines located in `components/games/[game-id]/engine.ts`. These engines are wrapped in React components (`[game-id]-game.tsx`) and integrated into the generic `PlayRoom` (`app/play/[id]/play-room.tsx`).
- **State Management:** Uses React Context for credits (`CreditsProvider`), session (`SessionProvider`), and theme (`ThemeProvider`). Game-specific skin preferences are managed via `lib/skin-store.ts`.
- **Responsive Design:** The `PlayRoom` is optimized for both desktop and mobile, with custom touch controllers for smartphone users.

## Building and Running
- **Development:** `npm run dev`
- **Build:** `npm run build`
- **Linting:** `npm run lint`
- **Production Start:** `npm run start`

## Development Workflow
1.  **Specs First:** Always check the `specs/` directory before starting any feature or bug fix.
2.  **Specialized Agents:** Utilize the project-specific agents in `.claude/agents/` for tasks like skin design (`skin-designer.md`), performance optimization (`game-performance-booster.md`), or mobile porting (`mobile-porter.md`).
3.  **Skills:** The project uses `Klerith/fernando-skills`. Custom skills like `spec`, `spec-impl`, `add-game`, and `spec-impl-game` are available to automate the Spec Driven Design process.
4.  **Formatting:** Prettier and ESLint are configured to maintain code quality.
5.  **Supabase:** The database schema and queries are located in `lib/supabase/`.

## Key Directories
- `app/`: Next.js App Router pages and API routes.
- `components/`: Reusable UI components and game-specific implementations.
- `contexts/`: React Context providers for global state.
- `lib/`: Utility functions, domain types, and Supabase client/queries.
- `public/`: Static assets, including game sprites and sounds.
- `specs/`: Detailed technical specifications for every feature.
- `references/`: Reference material, assets, and prototype code for games.
- `.agents/`: Local copy of the skills used in the project.
