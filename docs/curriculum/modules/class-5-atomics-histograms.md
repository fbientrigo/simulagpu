# Identity
- **Stable id:** `class-5`
- **Title:** `Clase 5 — Atomics, histogramas y contención`
- **Kind:** numbered class track
- **Sequence position:** 11

# Central question / skill
What happens when many threads need the same output location?

# Prerequisites
- `class-4` — block cooperation and reusable data
- `primitive-e` — atomic correctness and contention

# Concepts in scope
- histogram-style updates
- conflicting writes
- atomic correctness
- contention
- per-block strategies conceptually
- correctness versus scalability

# Explicitly out of scope
- a full production histogram optimizer
- architecture-specific contention models
- benchmark comparisons
- new synchronization APIs

# Intended interaction
Use a small deterministic histogram with hot and distributed bins. Let the
learner compare conflicting writes, atomic updates, and a conceptual per-block
aggregation strategy.

# Intended visual grammar
Precise 2D bins and writers with explicit conflict labels. Show aggregation
structure without pretending to model hardware scheduling.

# Definition of learned
The learner can diagnose conflicting writes, choose atomics for correctness, and
reason about contention and per-block aggregation as a scalability tradeoff.

# Dependencies / prerequisites for implementation
Define the CPU oracle and known-wrong cases before any CUDA path. State clearly
which per-block strategy is conceptual and leave measured scalability to local
native experiments.

# Status: PLANNED
