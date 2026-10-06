---
name: spec-impl-game
description: Implements an approved game spec exactly like /spec-impl (same phases, same rules), then runs the skin-designer and mobile-porter agents on the new game, one after the other — never in parallel.
disable-model-invocation: true
argument-hint: <NN-spec-name>
allowed-tools: Read, Glob, Grep, Edit, Write, AskUserQuestion, Agent, Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(git log:*), Bash(git diff:*), Bash(git stash:*), Bash(cat:*), Bash(ls:*)
---

# /spec-impl-game — Implementer of approved game specs

## Session context

Current repository state:
!`git status --short`

Current branch:
!`git branch --show-current`

Specs available in this folder:
!`ls specs/ 2>/dev/null || echo "The specs/ folder does not exist"`

Branch-creation config:
!`cat specs/.spec-config.yml 2>/dev/null || echo "AutoCreateBranch: true (default, no config file)"`

Games already in the platform:
!`ls components/games/ 2>/dev/null || echo "components/games/ does not exist yet"`

---

This skill is a specialized variant of `/spec-impl`, scoped to exactly one kind of spec: one that
integrates a **new playable game** (the kind `/add-game` produces). It implements the spec with
`/spec-impl`'s own rules and then finishes the game pipeline by running two project agents in
sequence: `skin-designer` first, `mobile-porter` second.

**Before doing anything else, read `../spec-impl/SKILL.md` in full.** This file only describes
what is _specific_ to games — it is not a self-contained copy of `/spec-impl`'s rules. Phases 1–4
below are that live file's phases, not a paraphrase, so that if `/spec-impl` is ever updated (it
comes from an external package, `Klerith/fernando-skills`) this skill automatically follows the
current version instead of a stale summary. Whenever this file and the live file disagree about
Phases 1–4, the live file wins.

The received argument is: `$ARGUMENTS`

## Phases 1–4 — Delegated to `/spec-impl`

Follow Phases 1 to 4 of `../spec-impl/SKILL.md` verbatim, using the argument above wherever that
file refers to its own received argument:

- **Phase 1** — identify the spec (stop and ask if the argument is empty or matches nothing).
- **Phase 2** — validate the state. Only a state that means "Approved" continues; anything else
  shows the standard error message and stops. No branch, no code, **no agents**.
- **Phase 3** — check the working tree, create/switch to `spec-NN-slug` according to
  `AutoCreateBranch`, confirm, and show the spec summary.
- **Phase 4** — implement step by step, pausing after each step for the diff review. Never commit
  automatically.

Wherever that file refers to "the session context above", use the session context of **this**
file — reading the other file does not run its commands.

Two game-specific additions on top of those phases:

1. **Identify the game at the end of Phase 3, before implementing anything.** Extract the game's
   id/slug from the spec — the `id` of the new `games` row, which is also what the agents know the
   game by — and the folder it will live in (`components/games/<slug>/`). Show it with the spec
   summary:

   ```
   Game:   <slug>   (components/games/<folder>/)
   After the last step: skin-designer → mobile-porter (in sequence)
   ```

   - If the spec does not integrate a playable game (no new engine under `components/games/`, no
     new `games` row), stop and tell the user to run `/spec-impl` instead. Do not implement.
   - If the spec leaves the game's id unclear, ask. Never infer it from the branch name, the last
     commit or anything else.

2. **Do not print `/spec-impl`'s closing message** ("All steps of the plan are implemented…")
   when the last step is done. Go on to Phase 5 instead; the closing comes after it.

## Phase 5 — Skins and mobile support (sequential)

Start this phase on your own once the last step of the implementation plan is finished — it needs
no extra confirmation. Tell the user in one line that the plan is implemented and that you are
launching `skin-designer`.

**The two agents run one after the other, never in parallel.** They both edit
`app/play/[id]/play-room.tsx`, and `mobile-porter` audits the `skinControl` branch that
`skin-designer` creates — so the order is fixed and the second one must start from the first
one's finished work.

1. Launch the `Agent` tool with `subagent_type: "skin-designer"`. Its prompt must name the game
   explicitly — the agent stops without touching anything if it is not told which game — and give
   it the context it starts without:

   ```
   Juego: <slug>
   Spec del juego: specs/NN-slug.md
   Rama activa: <current branch>
   El juego se acaba de implementar con /spec-impl-game; audita e implementa sus skins.
   ```

   Send **only this one** `Agent` call in that message.

2. **Wait for `skin-designer`'s final report.** Do not launch `mobile-porter` in the same message,
   and do not launch it while `skin-designer` is still running. Never predict or make up its
   result.

3. Summarize the report for the user (they do not see the agent's output): audit before/after,
   files touched, measured contrasts, `npm run lint` / `npm run build` results and the agent's own
   decisions.

4. Only then launch the `Agent` tool with `subagent_type: "mobile-porter"`, with the same shape of
   prompt:

   ```
   Juego: <slug>
   Spec del juego: specs/NN-slug.md
   Rama activa: <current branch>
   El juego se acaba de implementar con /spec-impl-game y skin-designer ya terminó; audita e
   implementa su soporte móvil.
   ```

5. Wait for its final report and summarize it the same way, including the list of what to test by
   hand on the phone.

If something does not go as expected:

- **An agent answers only with its "¿Sobre qué juego(s) trabajo?" question** — relay it to the
  user and relaunch that same agent with the answer. Do not move on to the next agent meanwhile.
- **`skin-designer` ends with `lint` or `build` failing, or without finishing its work** — do
  **not** launch `mobile-porter`. Show the failure and ask the user how to continue.
- **`mobile-porter` reports a part it left undone** (a game that needs a new controller piece) —
  report it as is; that needs its own spec, it is not fixed here.

Neither agent commits or switches branches, and neither do you.

## Closing

After both agents have finished, close with `/spec-impl`'s own final reminder plus what the
agents added:

```
✅ All steps of the plan are implemented, and skins and mobile support are in place.

Game: <slug>
  skin-designer   → <one line: skins added, lint/build result>
  mobile-porter   → <one line: touch layout / play-room branches added, lint/build result>

Next step: verify the spec's acceptance criteria one by one, including the criteria of the two
addenda the agents appended to the spec, and the manual checks on the phone listed above.
If they all pass, update the spec's state to "Implementado" and make the final commit before
merging this branch.
```

List under it the "decisiones del agente (pendientes de revisar)" each agent reported.

## Hard rules

- **Never write code without having read `../spec-impl/SKILL.md` in this run.** This file's
  summary of its phases is a convenience, not a substitute.
- Never launch the agents if Phase 2 blocked the spec, or before the last step of the plan is
  done.
- Never launch `skin-designer` and `mobile-porter` in parallel, and never `mobile-porter` first.
- Never launch an agent without naming the game in its prompt.
- Never commit automatically — not per step, not after the agents.
- All other rules of `/spec-impl` apply unchanged (implement what the spec says, stop on
  ambiguity, keep out-of-scope requests out of this branch).

## Summary of expected behavior

```
/spec-impl-game 15-juego-bombardero

  Phase 1  →  Finds specs/15-juego-bombardero.md
  Phase 2  →  Reads the state → "Aprobado" → ✅ continues
  Phase 3  →  git checkout -b spec-15-juego-bombardero
              Shows objective, scope, plan, criteria and the game id (bombardero)
  Phase 4  →  Implements step by step with pauses
  Phase 5  →  skin-designer (bombardero) → waits → mobile-porter (bombardero) → waits
  Closing  →  Summary of both agents + reminder to verify the acceptance criteria

/spec-impl-game 15-juego-bombardero  (state: Draft)

  Phase 2  →  ❌ stops with /spec-impl's standard error message
              No branch, no code, no agents
```
