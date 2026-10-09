# Template for a useful spec

This file is the reference the `/spec` skill consults when generating specs. Each section includes its purpose and a minimal example. **It is not text to be copied verbatim** — it is the shape the skill must respect.

---

## Header

Every spec starts with metadata in a blockquote (no tables, no blocks, simple as shown below) format:

```markdown
# SPEC NN — Short, descriptive title

> **Status:** Draft
> **Depends on:** SPEC 01, SPEC 02
> **Date:** YYYY-MM-DD
> **Objective:** A single sentence. If you need two sentences, the feature is too big.
```

**Valid states:** `Draft`, `In review`, `Approved`, `Implemented`, `Obsolete`.

> The labels above are the English defaults. The skills also accept equivalents in any language (e.g. Spanish `Borrador` / `En revisión` / `Aprobado` / `Implementado` / `Obsoleto`). Pick one set per repo and stay consistent — the same goes for section headings: write all of them in one language.

**Objective rule:** one sentence that a human reads in 5 seconds and understands what is going to be built. If it doesn't fit in one sentence, split the feature.

---

## Section 1 — Why this spec exists (optional)

For specs that take non-obvious decisions or break project patterns, a brief section explaining the **why** of the work. Not the what — the what comes later.

For simple specs, omit it.

---

## Section 2 — Scope

Three sub-blocks. **In** and **Not in** are mandatory; **Constraints** only when there are any.

```markdown
## Scope

**In:**

- Concrete thing one.
- Concrete thing two.

**Not in:**

| What                   | Destination | Reason                                                      |
| ---------------------- | ----------- | ----------------------------------------------------------- |
| Export the list to CSV | Follow-up   | Same screen, but needs a file-format decision not made yet. |
| Sync between devices   | Own spec    | New backend, new data, its own set of questions.            |
| Animated transitions   | Won't do    | Nobody asked for it and the objective is met without it.    |

**Constraints:**

- The public API of `src/store.js` does not change.
```

**Destinations — exactly one per row:**

- **Follow-up** — small, but it does not fit now. It becomes a dated addendum of this same spec once it is implemented. It is _not_ a new spec.
- **Own spec** — it delivers value on its own and opens a new domain (new data, an external dependency, another area of the system).
- **Won't do** — nobody asked for it or it is not needed. It is not planned work.

**What does not belong in this table:**

- Something the objective is incomplete without → it goes under **In**. If the spec gets too big, split the spec.
- Something cheap that touches the same files, opens no new decision and adds one or two steps → it goes under **In**.
- A design alternative that was considered and rejected → it goes in **Decisions**.
- Something the spec must not touch → it goes under **Constraints**.

**Why the reason matters:** the table captures what came up and was left out, and why. Without the destination, every excluded item looks like a future spec; without the reason, nobody can tell later whether it could simply have been included.

---

## Section 3 — Data model

The concrete structures that appear or change. Use real code, not abstract pseudocode.

```markdown
## Data model

\`\`\`js
// Game state
const state = {
level: 1,
score: 0,
highScores: [/* { score, level, date } */],
};
\`\`\`

Conventions:

- Coordinates: origin top-left.
- Velocities in pixels/frame.
```

If the feature introduces no new data, write it explicitly: _"This feature introduces no new data structures. It reuses the model from SPEC 01."_

---

## Section 4 — Implementation plan

Numbered steps. Each step must leave the system in a **functional and runnable** state. No "implement half and continue tomorrow".

```markdown
## Implementation plan

1. Create file X with an empty skeleton. Check: the project still builds.
2. Implement function A in X. Check: run Y, see Z.
3. Wire X to existing module W. Check: opening screen S shows the new value.
4. ...
```

**Rules:**

- Each step must be commitable on its own.
- One step = one change that can be reviewed in a single diff. If a step needs two unrelated explanations, split it.
- Every step ends with its `Check:` — what to run or look at to know the step works. The implementer runs it before moving on.
- Every item under **In** is covered by at least one step, and no step does something that is not under **In**.
- The last step of the plan is **not** "test everything" — that is the acceptance criteria.

---

## Section 5 — Acceptance criteria

Boolean checklist. Each item can be verified with yes or no.

```markdown
## Acceptance criteria

- [ ] The game loads without errors in the console.
- [ ] Breaking a brick adds exactly 10 points.
- [ ] Reloading the page preserves the high-scores.
- [ ] (manual) The pause menu is readable on a 320 px wide screen.
```

Every item under **In** has at least one criterion, and so does every failure state the spec mentions. When it is not obvious how a criterion is checked, say it: prefix it with `(manual)` or name the command or test.

**Anti-patterns to avoid:**

- ❌ "That it works well." → not verifiable.
- ❌ "Good UX." → subjective.
- ❌ "No bugs." → not operational.
- ✅ "Pressing Esc pauses the game and shows the menu." → verifiable, boolean.

---

## Section 6 — Decisions taken and discarded

The section that has the most value 3 months from now. Capture **what you considered**, not just what you chose.

```markdown
## Decisions

- **Yes:** localStorage for persistence. Fits in <5MB and we don't need queries.
- **No:** IndexedDB. Overengineering for this case.
- **Yes:** versioned key (`save:v1`). Lets us migrate the schema later without breaking.
- **No:** cloud sync. Goes in another spec if it ever lands.
```

Each decision ideally has a brief reason. Decisions without a reason are the first ones to be questioned later.

**Adjustments during implementation.** When the implementation has to deviate from the spec, the deviation is recorded here, in a dated sub-block, at the moment it happens — never silently in the code:

```markdown
### Adjustments during implementation (YYYY-MM-DD)

- Step 3 used a wrapper instead of editing `src/store.js` directly: the direct edit broke the import cycle check.
```

---

## Section 7 — Identified risks (optional)

Only when there are non-obvious risks. Simple table:

```markdown
## Risks

| Risk                                  | Mitigation                                                                  |
| ------------------------------------- | --------------------------------------------------------------------------- |
| localStorage disabled in private mode | Fallback to in-memory object. The game still runs, it just doesn't persist. |
| Future incompatible schema            | Key includes `:v1`. Migration documented in `persistence.js`.               |
```

For small specs or very contained features, omit it.

---

## Addendum (optional, added later)

A small follow-up to a spec that is already implemented — typically a row marked **Follow-up** in its "Not in" table. It is appended to the same file, after the last numbered section and before the closing "What is not in" section. It has **its own state**, independent of the spec's.

```markdown
## 8 — Addendum (YYYY-MM-DD): short title

> **Status:** Draft

**In:**

- Concrete thing.

**Plan:**

1. Step. Check: what to run or look at.

**Acceptance criteria:**

- [ ] Verifiable thing.
```

**Rules:**

- An addendum does not rewrite the sections above it. If it contradicts one of them, say which.
- It fits in one or two plan steps and opens no new decision domain. Anything bigger is its own spec.
- When the addendum covers a row of the "Not in" table, update that row to point at it (e.g. "Done — see addendum §8").

---

## Final section — What is NOT in (reinforcement)

Repeat at the end what **will not** be done in this spec, grouped by destination. This repetition is deliberate — the Scope section already says it, but at the end of the document it serves as a reminder when someone reads only the last lines.

```markdown
## What is **not** in this spec

- **Follow-up (addendum of this spec):** export the list to CSV.
- **Own spec:** sync between devices.
- **Won't do:** animated transitions.
```

Do not close with a blanket sentence such as "each of these goes in its own spec": most excluded items are not future specs, and the destination already says where each one goes.

---

## Global rules about the whole document

- **One sentence per idea.** If a sentence has two commas and a semicolon, split it.
- **Concrete names.** If you say "the levels module", say `src/levels.js`. If you say "a key", give the exact string.
- **No TODOs.** A TODO in a spec means the decision was not made. Make it or note it as a pending decision with a reason.
- **No references to specs that do not exist.** Do not cite the number of a spec that has not been written; numbers get assigned when a spec is saved. Say "its own spec".
- **No long executable code.** The spec describes; the code is written afterwards. Short snippets to illustrate data structures are fine; full functions are not.
- **Standard markdown.** No weird extensions. It must render on GitHub without surprises.
