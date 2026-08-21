# Project execution layer

Engineering material (English). Learner-facing content stays Spanish; this
directory is for maintainers and autonomous agents.

## Why this layer exists

SimulaGPU must be resumable by an agent that has **no access to prior
conversations**. Chat history, human memory, and prose TODO lists are not
durable engineering state. This layer turns "what should I work on next?" into a
deterministic query against files in Git.

An agent enters the repository, reads [`AGENTS.md`](../../AGENTS.md), runs
`pnpm roadmap:status`, and — if no work is already in progress — runs
`pnpm roadmap:next` to receive **exactly one** work item with its contract,
Definition of Done, and required verification.

## Source-of-truth boundaries

Two truths, deliberately kept separate:

| Concern | Source of truth | Owns |
| --- | --- | --- |
| **Pedagogy** | [`docs/curriculum/manifest.ts`](../curriculum/manifest.ts) | Learning order, concepts, learner outcomes, the frozen A–G waterfall |
| **Execution** | [`docs/project/roadmap.json`](./roadmap.json) | done / ready / wip / blocked, evidence, the next actionable item |

Rules that keep them from colliding:

- The ledger **references** curriculum modules by `curriculumId`; it never forks
  concepts, outcomes, or routes.
- Execution metadata (priority, status) can never reorder the curriculum. A test
  asserts the curriculum-track items, sorted by priority, equal
  `CURRICULUM_SEQUENCE` exactly, and that each item's `dependsOn` mirrors the
  manifest `prerequisites`.
- A product/infrastructure item can never become a curriculum dependency.

The resolver CLI (`scripts/roadmap/roadmap.mjs`) reads only the JSON ledger and
is therefore dependency-free and TypeScript-free. Curriculum cross-checks live
in `tests/project-roadmap.test.ts`, which can import the manifest.

## State machine

```text
planned      known work, not yet executable (deps unfinished, or awaiting owner promotion)
ready        all dependencies done and safe to start
wip          work has begun; carries resume/handoff information
blocked      cannot proceed; carries a concrete blocker reason
done         objectively complete per its Definition of Done, with evidence
superseded   replaced history; never returned by the resolver
```

Legal transitions (documented in `roadmap.json`, enforced by review — there is
no mutation CLI):

```text
planned → ready | superseded
ready   → wip | blocked | superseded
wip     → done | blocked
blocked → ready | wip
done    → superseded
```

`ready` is not taken on faith. The validator rejects any `ready` or `done` item
that has an unfinished dependency. This is the layer's core invariant:

> The roadmap must never tell an agent an item is executable while a required
> dependency is unfinished.

## Item lifecycle

Each item carries: `id`, `track`, `curriculumId` (or `null`), `title`, `status`,
`priority`, `dependsOn`, `contract`, `definitionOfDone`, `verification`,
`evidence`, `unlocks`, `blocker`, `handoff`, `note`.

Tracks: `curriculum`, `retention`, `ux`, `tooling`, `platform`, `future`.
Reference primitives H–K live on `future` because they are outside the A–G
waterfall until an owner promotes one.

## WIP / resume behaviour

When work is interrupted, set the item to `wip` and fill `handoff` so another
agent can continue like loading a stash:

```json
{
  "handoff": {
    "branch": "class/primitive-c",
    "lastKnownGoodCommit": "abc1234",
    "completed": ["core model", "model unit tests"],
    "remaining": ["visual component", "lesson integration", "Anki"],
    "knownIssues": [],
    "resumeFrom": ["packages/visuals/src/ClaseSyncthreads.vue"]
  }
}
```

Keep it concise and actionable: no prose diary, no dependency on chat history,
nothing another agent cannot verify from the repository. Never invent a commit
hash or branch that does not exist.

## How `roadmap:status` works

Groups every item by track and prints its status label, marking the resolved
next item with `->`. It ends with the resolved next item or, when nothing is
executable, the blocking explanations. Output is generated from the ledger, not
hardcoded. `--json` emits per-item eligibility plus the resolver result.

## How `roadmap:next` works

Deterministic, algorithmic — no LLM:

1. If a resumable WIP exists (status `wip`, dependencies done), return the
   highest-priority one.
2. Otherwise return the highest-priority `ready` item whose dependencies are all
   done.
3. Sort by `priority` ascending, then `id` — for curriculum items, priority
   follows the frozen sequence, so ties break in curriculum order.
4. If nothing is executable, return no item plus per-item blocking reasons.

Running it repeatedly against unchanged state always returns the same item.

## How DONE is verified

`done` is never "someone said so". A `done` item must:

- satisfy the global Definition of Done in `AGENTS.md` (`pnpm verify`);
- satisfy its item-specific `definitionOfDone`;
- carry `evidence` with at least one path that actually exists in the
  repository (checked by `pnpm roadmap:validate` and the test suite).

## Adding a future item

1. Create or identify its contract (a curriculum scaffold under
   `docs/curriculum/modules/`, or a real file for product work).
2. Add one entry to `roadmap.json` with `dependsOn`, an item-specific
   `definitionOfDone`, and `verification`.
3. Leave it `planned`. The resolver promotes nothing on its own; readiness is
   derived from dependencies, and `ready` is a deliberate owner/agent decision.
4. `pnpm roadmap:validate` and `tests/project-roadmap.test.ts` enforce
   consistency.

That is the whole cost of organic growth — one entry, not five duplicated lists.

## What must NOT go into the ledger

- Forked curriculum truth (concepts, learner outcomes, routes) — reference
  `curriculumId` instead.
- Dozens of microtasks. An item is a meaningful, independently reviewable
  increment.
- Invented commit hashes, branches, or evidence that cannot be inspected.
- Speculative future ideas as `ready` work. Unknown ideas stay out of the
  executable set.
- Autonomous owner decisions (licensing, backends, new learner languages,
  promoting a reference primitive). Record these as `blocked` with a reason.

## How to reason about this repository

```text
Never infer "next" from filenames.
Never infer DONE from prose.
Never bypass dependencies.
Never publish planned curriculum.
Never let product features alter CUDA teaching truth.
Never claim implementation evidence that cannot be inspected.
Resume WIP before opening equivalent new work.
Prefer deterministic repository state over chat history.
```
