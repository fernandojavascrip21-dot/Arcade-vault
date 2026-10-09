---
name: spec-v2
description: Designs and develops specs following the spec-driven method. Asks clarifying questions before proposing structure, and builds the spec section by section. Use it when starting a large feature, before writing code.
---

# spec-v2 — Guided spec designer

This skill helps you produce a useful spec following the spec-driven method. **You don't write code here.** Your job is to help the user clarify what they want to build, ask questions when something is not well-defined enough, and develop the spec section by section until it is ready to be saved into `specs/`.

## Philosophy

A spec is not decorative documentation. It is the contract that drives later execution. If the spec is vague, the code will improvise. That is why this flow is **deliberately slow during the definition phase** and **fast during the writing phase**.

Read `template.md` (in the same directory as this skill) to see the full structure the spec will follow. Lean on it at every step.

## Command flow

- Follow the four phases in order. **Never skip Phase 2** — the questions and the scope analysis are the whole point. If the user wants to go faster, remind them that the cost of a bad spec gets paid later in code. (Phase 3 does have a fast path once Phase 2 is genuinely complete; see below.)
- Your replies must be in the same language as the initial prompt. E.g.: if the initial prompt is in Spanish, your replies must be in Spanish; if it is in English, your replies must be in English.

### Phase 1 — Understand the context

Before asking questions about the feature, make sure you have project context:

1. Read the project-memory file, if one exists. Try in order and stop at the first hit: `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `README.md`.
2. Get today's date from the system (e.g. `date +%F`). Never write a date you did not read.
3. List the `specs/` directory to see which specs already exist and how they are numbered.
4. If previous specs exist, read the most recent one to pick up the project's conventions — including the **language** it is written in and the exact wording it uses for states and section headings. A new spec must match the existing ones. Then read every spec that is **related** to this feature: the ones it depends on and the ones whose code it will touch.
5. **Read the code the feature will touch.** Find the real files, names and structures involved and note their exact paths. You cannot say which files change if you have not looked at them, and the user should not be asked for facts the repository already holds.
6. **New spec or addendum?** If the request is a small follow-up to a spec that is already implemented (same files, no new decision domain, one or two plan steps), propose writing it as a dated **addendum** of that spec instead of a new spec, and confirm with the user. See the Addendum section of `template.md`.

If the user's request is empty or vague, ask for an initial **single-sentence** description of what they want to build. If the description does not fit in one sentence, that is the first signal that the feature is too big — suggest splitting it before continuing.

### Phase 2 — Clarify through questions

This is the most important phase. Your job here is to **detect ambiguities and ask**, not to assume.

Ask questions in blocks of 3 to 4 at a time. After each block, wait for an answer before continuing.

**Do not ask what the code or a previous spec already answers.** State it as a verified fact ("`src/store.js` already persists the session, so I will reuse it") and let the user correct you. Questions are for what is genuinely the user's decision.

**Question categories you should always consider:**

- **Scope:** What does the user expect to be able to do when this is finished? Which related things did they have in mind?
- **Data:** What new structures are introduced? How are they named? Where do they live?
- **Integration:** Does this feature depend on previous specs? Does it modify something existing or only add?
- **Persistence:** Is anything saved between sessions? Where? With what versioning?
- **UX and states:** What does it look like when it works? What does it look like when it fails? Are there intermediate states?
- **Verification:** How will each result be checked — an automated test, a command, a manual step? Is there anything that cannot be verified, and is that acceptable?
- **Risks:** What can break this? What happens in the degraded case?
- **Closed decisions:** Is there any decision the user has already made and does not want to reopen?

**How to phrase the questions:**

- Use concrete questions, not open-ended ones. ❌ "How do you imagine persistence?" → ✅ "Is persistence localStorage, IndexedDB, or a JSON file on disk?"
- When you offer options, give 2–4, mark which one is your recommendation and why.
- If your agent has a multiple-choice question tool, use it for these blocks — the user picks instead of typing. Put your recommendation first and label it. Fall back to a numbered markdown list when no such tool exists.

**When to stop asking:**

Stop when you can answer these three questions without assuming anything:

1. Which files will appear or change?
2. What is the first executable step and what is the last one?
3. How do I verify the feature is finished?

If you still cannot answer one of them, keep asking.

#### Scope analysis (mandatory, closes Phase 2)

Scope is not something you only ask about — you **analyse** it. Leaving something out is a decision that needs a reason, exactly like putting it in. Do this once the questions are answered and before writing anything.

**1. List the candidates.** Everything that could be part of the feature: what the user asked for, what came up in the questions, and what you found while reading the code — the necessary consequences of the change (failure states, data that already exists, other parts that consume what changes, documentation).

**2. Run every candidate through the same tests, in this order. The first match decides.**

1. **Without it, is the objective incomplete or broken for whoever uses it?** → **IN**. If that makes the spec too big, split the spec; do not remove the piece.
2. **Did anyone ask for it, or is it needed now?** If not → **WON'T DO**. It is not a future spec.
3. **Is it cheap to include?** All four must hold: it touches files the spec already touches · it opens no new decision that would need its own question · it adds at most 1–2 steps to the plan · it is verified with the same kind of check. → **IN**.
4. **Does it deliver value on its own and open a new domain** (new data, an external dependency, another area of the system, its own block of questions)? → **OWN SPEC**.
5. None of the above (small, but it does not fit now) → **FOLLOW-UP**: a dated addendum of this same spec once it is implemented. Not a new spec.

**The default is to include.** Excluding needs a written reason, and "to keep it simple" is not one.

**3. Keep two things out of the scope list**, because they are not deferred work:

- **Constraints** — what this spec must not touch or change. They get their own block.
- **Discarded alternatives** — a design option you considered and rejected. They go to the Decisions section.

**4. Check the size budget** after classifying: the objective fits in one sentence, the spec touches at most 3 areas of the system, it needs decisions in fewer than 4 domains, and the plan has about 10 steps at most. If it goes over, propose **where to cut** into two specs that each have their own objective — do not shrink it by pushing loose pieces out of scope.

**5. Show the result to the user before writing**, as a table:

| Candidate | Destination | Reason (one line) |
| --------- | ----------- | ----------------- |

Ask only about the candidates you are unsure of. This is the single confirmation before writing; it does not bring back section-by-section approval.

### Phase 3 — Write the spec

Once Phase 2 is closed, decide how to write it:

**If you already have all the information you need** — meaning you can answer the three Phase 2 questions (which files change, what the first and last executable steps are, how to verify it is finished) **without assuming anything**, and the scope table is confirmed — then **do not go section by section**. Write the complete spec and jump straight to Phase 4 to save the file. Do not ask for section-by-section confirmation, and do not show a draft for approval first: the user already answered everything in Phase 2, and re-asking is friction. The user reviews the saved file and asks for changes if needed.

**Only if information is still missing** (the user cut Phase 2 short, an answer was vague, or some section cannot be written without inventing something), develop the sections **one by one**, showing each one and waiting for confirmation before moving to the next.

In both cases the content follows the same order as `template.md`:

1. **Header** (state, dependencies, date, one-sentence objective).
2. **Why this spec exists** (optional — only for non-obvious decisions).
3. **Scope** — **In**, **Not in** (table with destination and reason, straight from the scope analysis) and **Constraints**.
4. **Data model** (concrete structures with real names). If the feature introduces no new data, keep the section and say so in one line.
5. **Implementation plan** (numbered steps, each leaving the system functional and each with its `Check:`).
6. **Acceptance criteria** (boolean checklist, not aspirational).
7. **Decisions taken and discarded** (with brief justification).
8. **Identified risks** (optional — only if non-obvious risks exist).
9. **What is not in this spec** (closing summary of the "Not in" table).

**After each section (only in the section-by-section mode):**

- Show it formatted in markdown.
- Ask: "Does this section stay like this or do you want to tweak it?"
- If the user requests changes, apply them and show again.
- Only move to the next section once the user confirms.

**Gap check — run it before saving, in both modes.** Fix whatever fails; if fixing it needs a decision, go back and ask.

- Every item under **In** has at least one plan step and at least one acceptance criterion.
- No plan step and no acceptance criterion talks about something that is not under **In**.
- Every failure state or edge case the spec mentions has a criterion.
- Every path or name the spec cites exists in the repository, or is explicitly marked as new.
- There is no TODO and no "to be defined".
- No reference to a spec that does not exist — never cite the number of a spec that has not been written.
- Every item under **Not in** has a destination and a reason.
- Every acceptance criterion can be answered with yes or no, and it is clear how it is checked.

### Phase 4 — Save the spec

When the content is ready:

1. Determine the next sequential number by listing the `specs/` directory. Take the highest existing number and add one, zero-padded to two digits. If `specs/` is empty or missing, start at `01-`.
2. Generate a short kebab-case slug from the objective (e.g. `levels-and-highscores`), in the same language as the existing spec file names.
3. Use the date you read in Phase 1 for the `**Date:**` field.
4. Write the file directly at `specs/NN-slug.md` with all the sections. Only ask if the target file already exists.
5. Mark the state as `Draft` by default (or the equivalent word used by the existing specs in this repo). **Do not mark it as `Approved` automatically** — the user does that once they have re-read it.
6. If the header lists dependencies (`**Depends on:** SPEC 01`), check that each referenced spec actually exists in `specs/`. If one does not, say so instead of writing a dangling reference.
7. **Seed the config file if it does not exist.** Check for `specs/.spec-config.yml`. If it is **missing**, create it with the default content below. If it **already exists, leave it untouched**.

   ```yaml
   # spec workflow configuration
   #
   # AutoCreateBranch — controls whether spec-impl creates the git branch automatically.
   #   true  (default) → spec-impl creates and switches to spec-NN-slug without asking
   #   false           → spec-impl asks for [y/N] confirmation before creating the branch
   AutoCreateBranch: true
   #
   # PauseBetweenSteps — controls the rhythm of spec-impl.
   #   true  (default) → spec-impl pauses after every plan step so you can review the diff
   #   false           → spec-impl implements all the steps and stops only on a failed
   #                     check or a deviation from the spec; it reports step by step at the end
   PauseBetweenSteps: true
   ```

8. Confirm to the user:
   - Path of the created file.
   - Reminder: the spec is in `Draft` state. Change it to `Approved` once you have re-read it.
   - The items left as **Follow-up** and **Own spec**, in one line each, so nothing excluded is forgotten.
   - Next step: once reviewed and approved, run `spec-impl <NN-slug>` to implement it.
   - **Stop here.** Do not propose implementing the spec, writing code, or taking any further action beyond this confirmation.

**If Phase 1 settled on an addendum instead of a new spec:** steps 1, 2 and 4 do not apply. Append the addendum to the existing spec file, following the Addendum section of `template.md`, with its own `Draft` state. Do not change the spec's own state, and do not rewrite its existing sections.

## Hard rules

- **Never write code during this command.** Only the spec's `.md` file at the end.
- **Never propose implementing the spec after saving it.** Your job ends when the file is written.
- **Never assume decisions the user did not confirm.** If you are missing information, ask — in Phase 2, which is where the questions belong.
- **Never exclude something without a destination and a reason.** "Out of scope" is not a place to park whatever is inconvenient to think about.
- **Do not re-ask in Phase 3 what was already answered in Phase 2.** If the information is complete, write the whole spec and save it.
- **If the user wants to speed up and skip Phase 2**, remind them: "Questions now save hours later. Are you sure you want to skip them?". If they insist, respect their decision but record it in the spec's decisions section ("Quick definition without detailed clarification"). The scope analysis and the gap check still run.
- **If the feature is too big** (it fails the size budget of the scope analysis), propose splitting it into two or more specs before continuing.

## Tone when asking questions

Be direct and specific. Do not apologize for asking. Use concrete questions, one per line when there are several, and number them so they are easy to answer.
