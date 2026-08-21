# Roadmap (compatibility overview)

Engineering document (English).

> **This file is no longer an authoritative roadmap.** It used to describe a
> pedagogical sequence that has since been frozen elsewhere. To avoid two
> competing sources of truth, sequencing and execution state now live in two
> dedicated places:
>
> - **Pedagogical order (what to teach, in what order, with which concepts):**
>   [`docs/curriculum/manifest.ts`](curriculum/manifest.ts) and
>   [`docs/curriculum/README.md`](curriculum/README.md). The frozen first course
>   is the interleaved A–G waterfall
>   (`Clase 0 → A → Clase 1 → B → Clase 2 → C → … → Clase 7`).
> - **Execution state (what is done / ready / wip / blocked, and what is next):**
>   [`docs/project/roadmap.json`](project/roadmap.json), resolved deterministically
>   with `pnpm roadmap:status` and `pnpm roadmap:next`. See
>   [`docs/project/README.md`](project/README.md).

Do not add pedagogical sequencing here. Do not track execution status here.
Add curriculum modules to the manifest and execution items to the ledger.

## What "done" means

The unit of progress is a **vertical slice**: Spanish documentation, a
deterministic interactive model with tests, runnable CPU/CUDA code where the
class contract requires it, a starter and solution sharing one test contract,
and Anki cards. Class 0 is a deliberate exception with a smaller slice. The
authoritative Definition of Done is in [`AGENTS.md`](../AGENTS.md); item-specific
requirements live in each ledger entry's `definitionOfDone`.

## Infrastructure triggers

These are **not** curriculum items and do not belong in the manifest. Each is a
capability we deliberately do **not** build until a concrete trigger fires;
until then, adding it is a regression (see `AGENTS.md` → *Deliberately absent*).
Owner-decision and trigger-gated items are also surfaced in the execution ledger
so agents encounter them instead of inventing policy.

| Item | Trigger |
| --- | --- |
| `LICENSE` | Immediate owner decision (tracked as `license-decision` in the ledger) |
| CUDA compile-only CI | A stable toolkit image and acceptable CI minutes |
| GPU runtime CI | A maintained GPU runner |
| Shared visualization primitives | A third component genuinely repeats the same interaction/layout primitive |
| Global state store | Two components on one page need synchronized state |
| Search | More than roughly ten lesson pages |
| i18n | Someone commits to maintaining another learner-facing language |
| Benchmark harness | A class makes a performance claim that must survive review |
| Multi-deck Anki output | A migration plan preserves existing card identities and review histories |
| Sanitizer job | A race or memory-layout exercise provides a useful failure to reproduce |
