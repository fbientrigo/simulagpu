# Architecture Decision Records

Short records of decisions that were not obvious and that a future contributor
would otherwise be tempted to reverse without knowing why they were made.

Written in English (engineering material). One file per decision, numbered,
never rewritten — a decision that no longer holds gets a new ADR that supersedes
it, and the old one is marked.

| # | Decision | Status |
| --- | --- | --- |
| [0001](0001-pure-deterministic-teaching-models.md) | Teaching models are pure functions over frozen data | Accepted |
| [0002](0002-optional-cuda-detection.md) | CUDA is optional and detected, never assumed | Accepted |
| [0003](0003-cuda-error-handling.md) | A failed CUDA call aborts | Accepted |
| [0004](0004-no-test-framework-dependency.md) | No native test-framework dependency | Accepted |
| [0005](0005-generated-anki-not-committed.md) | The Anki TSV is generated, not committed | Accepted |

## Template

```markdown
# ADR-000N — Title

Status: Proposed | Accepted | Superseded by ADR-000M
Date: YYYY-MM-DD

## Context
What is true that forces a decision.

## Decision
What was decided, in the imperative.

## Consequences
What this makes easy, what it makes hard, and what it forbids.

## Alternatives considered
What else was on the table and why it lost.
```
