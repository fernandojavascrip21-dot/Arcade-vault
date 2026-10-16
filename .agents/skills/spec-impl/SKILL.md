---
name: spec-impl
description: Implements an approved spec. Validates that the state means "Approved" (in any language), creates a git branch named after the spec, switches to it, and starts the implementation step by step with pauses to review diffs.
---

# spec-impl — Implementer of approved specs

Follow these four phases in strict order. **Do not advance to the next phase if the previous one did not complete correctly.**

---

### Phase 1 — Identify the spec

Identify the spec name from the user's request.

If the request is empty or ambiguous:

- List the files available in `specs/`.
- Ask the user to specify the exact name of the spec.
- Stop and wait for an answer. Do not continue.

If a spec name is provided:

- Look for the file in `specs/`. The user may have written the full name (`01-mvp-arkanoid`), only the number (`01`), or only the slug (`mvp-arkanoid`). Try to find the correct file in any of those cases.
- If you do not find the file, show the available specs and ask the user to correct the name.
- If you do find it, continue to Phase 2.

Before Phase 2, read the project-memory file, if one exists. Try in order and stop at the first hit: `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `README.md`. You need the project's conventions and its check commands (lint, build, tests) to implement and to verify each step.

---

### Phase 2 — Validate the spec

Read the spec file in full.

#### 2.1 — State

In the file's contents, look for the line that contains the spec's state. The header label is typically `**Status:**` (English) or `**Estado:**` (Spanish), but it may use any language.

**Absolute rule:** You can only continue if the state **means "Approved"** — regardless of the language used.

Treat any of the following (and their equivalents in other languages) as the **Approved** state and continue:

- English: `Approved`
- Spanish: `Aprobado`
- Portuguese: `Aprovado`
- French: `Approuvé`
- German: `Genehmigt`
- Italian: `Approvato`

Anything else (Draft / Borrador, In review / En revisión, Implemented / Implementado, Obsolete / Obsoleto) means **stop** and show the error message below — with one exception, the addendum case.

**Addendum case.** If the spec's state means **Implemented** and the file contains an addendum section with its own state line that means **Approved**, continue — but the work is **only that addendum**: its own "In", plan and acceptance criteria. If several addenda are approved, ask which one. From here on, "the spec" means that addendum, read in the context of the whole file.

**Unrecognized state.** If the word is not one you can match with certainty to a known state (for example, a misspelling), do not interpret it. Stop, quote it exactly, and ask the user to correct it.

**Standard error message when the state does not mean Approved:**

```
❌ I cannot implement this spec.

Current state: [STATE FOUND]
I only work with specs whose state means "Approved" (e.g. `Approved`, `Aprobado`, or the equivalent in another language).

To continue you have two options:
  1. If the spec is ready to be implemented, open it and change the state to "Approved" manually. That change is made by the human, not the agent.
  2. If the spec still needs work, use `spec` to resume it.
```

#### 2.2 — Pre-flight review

An approved spec can still be out of date with the code, or have gaps. Before touching git, check:

- **Dependencies:** every spec listed in the header's dependencies exists and its state means Implemented.
- **Paths:** every file or name the spec cites as existing still exists in the repository.
- **Completeness:** there is no TODO or "to be defined", every item under "In" has a plan step and an acceptance criterion, and every plan step can be executed as written.

If everything passes, say so in one line and continue. If something fails, **list what you found and ask the user how to proceed** — fix the spec first, or continue knowing it. Do not fill the gap yourself.

---

### Phase 3 — Create the git branch and switch to it

Once the spec is validated:

0. **Check the working tree first.** Run `git status --short`. If it is **not empty**, stop and show the pending changes, then ask:

   ```
   ⚠️ There are uncommitted changes in the working tree.
   Switching branches would carry them over. What do you want to do?
     1. Commit or stash them yourself, then re-run this command  (recommended)
     2. Continue anyway — the changes travel to the new branch
   ```

   Wait for the answer. **Do not stash or commit on the user's behalf** unless they explicitly ask for it.

1. Derive the branch name from the spec file's full name, without the extension. Format: `spec-NN-slug`. For an addendum, append its date: `spec-NN-slug-addendum-YYYYMMDD`.

2. **Check the base branch.** If the target branch does not exist yet and the current branch is not the repository's main branch (for example, you are on another spec's branch), say which branch you are on and ask whether to branch from here or from the main branch.

3. Read the `AutoCreateBranch` flag from `specs/.spec-config.yml`.
   - If the file does not exist, treat it as `true` (the default).
   - Only an explicit `false` disables automatic branch creation.

   **If `AutoCreateBranch` is `true` (default):** proceed without asking.
   - If the branch **does not exist**: create it with `git checkout -b <branch>`.
   - If it **already exists**: switch to it and work out where to resume. Compare each plan step with the actual state of the code — the commits on the branch **and** the uncommitted diff, since this skill never commits by itself — and propose the step to resume from.

   **If `AutoCreateBranch` is `false`:** ask before touching git.

4. Confirm to the user that the spec is ready and which branch is active.

5. **Do not start implementing yet.** First show the spec summary:
   - The **objective**.
   - The **scope**: what is in, what is **not in** (with its destination) and the **constraints**.
   - The **implementation plan**.
   - The **acceptance criteria**.

---

### Phase 4 — Implement step by step

Read the `PauseBetweenSteps` flag from `specs/.spec-config.yml`. If the file or the key does not exist, treat it as `true`. Only an explicit `false` disables the pauses.

After showing the spec summary, tell the user (when `PauseBetweenSteps` is `false`, replace the second line with "I will implement all the steps and stop only if a check fails or the spec has to change."):

```
I am going to implement the spec following the implementation plan exactly.
I will pause after each step so you can review the diff.

Shall we start with Step 1?
```

Wait for explicit confirmation. Do not start without it.

Once confirmed, follow these rules:

**Never commit automatically.** You write the code and show the diff; committing is the user's decision.

**One rule above all:** implement what the spec says. Changes to the spec go into the spec, not into the code by surprise.

**Stay inside the scope.** If something you are about to do — or something the user asks for mid-way — is listed under "Not in" or breaks a constraint of the spec, stop and say so. It is implemented only if the user decides to change the spec first. No "while we're at it".

**When a step cannot be implemented as written** (the spec is wrong, the code is not what the spec assumed, a check cannot pass): stop, explain why, propose the change to the spec and wait for the decision. Once agreed, record it in the spec **in that same step**, in a dated "Adjustments during implementation" block inside the decisions section, and then continue.

**Work rhythm:**

- Implement one step of the plan.
- **Verify it.** Run the step's `Check:` if it has one, and the project's check commands (lint, build, tests) from the project-memory file. Each step must leave the system functional. Report the real result; if something fails, fix it before going on, or stop if the fix would change the spec.
- Show a summary of which files you touched, what you did, and the result of the checks. Suggest a commit message for the step.
- With pauses (default), say: `Step N completed. Could you review the diff and let me know if I continue with Step N+1?` and wait for confirmation before continuing.
- Without pauses, continue to the next step. Stop only on a failed check you cannot fix within the spec, or on a deviation that needs a decision.

**When finishing the last step**, go through the acceptance criteria one by one — do not just remind the user of them:

- Check every criterion you can check yourself (commands, tests, reading the code).
- Leave the manual ones for the user, with the exact steps to check each.
- Tick (`- [x]`) in the spec file the criteria that passed. Leave the rest unticked.

Then report:

```
✅ All steps of the plan are implemented.

| Criterion | Result | How it was checked |
| --------- | ------ | ------------------ |
| ...       | ✅ / ❌ / manual | ... |

Pending follow-ups from the spec's "Not in" table: [list, or "none"].

Next step: check the manual criteria. If they all pass, change the state to
"Implemented" and make the final commit before merging this branch.
Changing the state is your decision — tell me and I will edit it, or do it yourself.
```

Do not change the state yourself unless the user tells you to.

---

## Summary of expected behavior

```
/spec-impl 01-mvp-arkanoid

  Phase 1  →  Finds specs/01-mvp-arkanoid.md, reads the project-memory file
  Phase 2  →  Reads the state → "Approved" (or "Aprobado", etc.) → ✅ continues
              Pre-flight: dependencies, paths and completeness → ✅ continues
  Phase 3  →  git checkout -b spec-01-mvp-arkanoid
              Shows objective, scope (in / not in / constraints), plan and criteria
  Phase 4  →  Implements step by step, verifying each step
              Ends by checking the acceptance criteria one by one

/spec-impl 02-powerups  (state: Draft / Borrador)

  Phase 1  →  Finds specs/02-powerups.md
  Phase 2  →  Reads the state → "Draft" → ❌ stops
              Shows the standard error message
              Does not create branch, does not touch code

/spec-impl 03-levels  (state: Implemented, with an addendum in state Approved)

  Phase 2  →  Spec is Implemented, addendum is Approved → ✅ continues with the addendum only
  Phase 3  →  git checkout -b spec-03-levels-addendum-YYYYMMDD
  Phase 4  →  Implements the addendum's plan and checks the addendum's criteria
```

**Branch creation is controlled by the `AutoCreateBranch` flag** in `specs/.spec-config.yml`. It defaults to `true` (create the branch automatically, as shown above). Set it to `false` to make Phase 3 ask `[y/N]` before creating the branch.

**The rhythm is controlled by the `PauseBetweenSteps` flag** in the same file. It defaults to `true` (pause after every step). Set it to `false` to implement all the steps in one go, stopping only on a failed check or a deviation from the spec.
