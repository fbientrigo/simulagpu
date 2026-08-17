# Identity
- **Stable id:** `class-6`
- **Title:** `Clase 6 — Streams y solapamiento`
- **Kind:** numbered class track
- **Sequence position:** 13

# Central question / skill
How can independent GPU work and transfers be organized as a pipeline?

# Prerequisites
- `class-5` — dependencies and correctness under conflicting outputs
- `primitive-f` — asynchronous enqueueing and completion boundaries

# Concepts in scope
- stream ordering
- independent streams
- host-device transfer timeline
- kernel timeline
- overlap concept
- dependencies
- explicit waiting

# Explicitly out of scope
- CUDA graphs
- multi-device scheduling
- throughput benchmarks
- a catalogue of implicit synchronization rules

# Intended interaction
Construct a small dependency-aware timeline from transfers and kernels. Let
the learner identify work that may overlap and waits that must remain explicit.

# Intended visual grammar
Timeline rather than cells or matrix layout. Separate transfer and kernel lanes
and annotate dependency edges; never imply overlap solely from visual proximity.

# Definition of learned
The learner can draw a dependency-aware stream timeline and explain which work
may overlap without claiming automatic concurrency.

# Dependencies / prerequisites for implementation
Freeze the event vocabulary and dependency rules in a pure model. Keep time
positions illustrative and avoid unmeasured durations; native validation must
remain correctness-first.

# Status: PLANNED
