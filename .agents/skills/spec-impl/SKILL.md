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

---

### Phase 2 — Validate the spec's state

Read the spec file using the `read_file` tool.

In the file's contents, look for the line that contains the spec's state. The header label is typically `**Status:**` (English) or `**Estado:**` (Spanish), but it may use any language.

**Absolute rule:** You can only continue if the state **means "Approved"** — regardless of the language used.

Treat any of the following (and their equivalents in other languages) as the **Approved** state and continue:
- English: `Approved`
- Spanish: `Aprobado`
- Portuguese: `Aprovado`
- French: `Approuvé`
- German: `Genehmigt`
- Italian: `Approvato`

Anything else (Draft / Borrador, In review / En revisión, Implemented / Implementado, Obsolete / Obsoleto) means **stop** and show the error message below.

**Standard error message when the state does not mean Approved:**

```
❌ I cannot implement this spec.

Current state: [STATE FOUND]
I only work with specs whose state means "Approved" (e.g. `Approved`, `Aprobado`, or the equivalent in another language).

To continue you have two options:
  1. If the spec is ready to be implemented, open it and change the state to "Approved" manually. That change is made by the human, not the agent.
  2. If the spec still needs work, use `spec` to resume it.
```

---

### Phase 3 — Create the git branch and switch to it

Once you have confirmed the state means `Approved`:

0. **Check the working tree first.** Use `run_shell_command` with `git status --short`. If it is **not empty**, stop and show the pending changes, then ask:

   ```
   ⚠️ There are uncommitted changes in the working tree.
   Switching branches would carry them over. What do you want to do?
     1. Commit or stash them yourself, then re-run this command  (recommended)
     2. Continue anyway — the changes travel to the new branch
   ```

   Wait for the answer. **Do not stash or commit on the user's behalf** unless they explicitly ask for it.

1. Derive the branch name from the spec file's full name, without the extension. Format: `spec-NN-slug`.

2. Read the `AutoCreateBranch` flag from `specs/.spec-config.yml`.
   - If the file does not exist, treat it as `true` (the default).
   - Only an explicit `false` disables automatic branch creation.

   **If `AutoCreateBranch` is `true` (default):** proceed without asking.
   - If the branch **does not exist**: create it with `git checkout -b spec-NN-slug`.
   - If it **already exists**: switch to it, read the last commits, and propose where to resume from.
   - Switch to the branch and confirm.

   **If `AutoCreateBranch` is `false`:** ask before touching git.

3. Visually confirm to the user the spec is ready and which branch is active.

4. **Do not start implementing yet.** First show the spec summary:
   - The **objective**.
   - The **scope**.
   - The **implementation plan**.
   - The **acceptance criteria**.

---

### Phase 4 — Implement step by step

After showing the spec summary, tell the user:

```
I am going to implement the spec following the implementation plan exactly.
I will pause after each step so you can review the diff.

Shall we start with Step 1?
```

Wait for explicit confirmation. Do not start without it.

Once confirmed, follow these rules:

**Never commit automatically.** You write the code and show the diff; committing is the user's decision.

**One rule above all:** implement what the spec says. Changes to the spec go into the spec, not into the code by surprise.

**Work rhythm:**
- Implement one step of the plan.
- Show a summary of which files you touched and what you did.
- Say: `Step N completed. Could you review the diff and let me know if I continue with Step N+1?`
- Wait for confirmation before continuing.

**When finishing the last step:**

```
✅ All steps of the plan are implemented.

Next step: verify the spec's acceptance criteria one by one.
If they all pass, update the spec's state to "Implemented" and make the final commit before merging this branch.
```

---

## Summary of expected behavior

```
/spec-impl 01-mvp-arkanoid

  Phase 1  →  Finds specs/01-mvp-arkanoid.md
  Phase 2  →  Reads the state → "Approved" (or "Aprobado", etc.) → ✅ continues
  Phase 3  →  git checkout -b spec-01-mvp-arkanoid → git checkout spec-01-mvp-arkanoid
              Shows objective, scope, plan and criteria
  Phase 4  →  Implements step by step with pauses
              Ends by reminding to verify the acceptance criteria

/spec-impl 02-powerups  (state: Draft / Borrador)

  Phase 1  →  Finds specs/02-powerups.md
  Phase 2  →  Reads the state → "Draft" → ❌ stops
              Shows the standard error message
              Does not create branch, does not touch code
```

**Branch creation is controlled by the `AutoCreateBranch` flag** in `specs/.spec-config.yml`. It defaults to `true` (create the branch automatically, as shown above). Set it to `false` to make Phase 3 ask `[y/N]` before creating the branch.
