# Identity
- **Stable id:** `primitive-e`
- **Title:** `Primitiva E — atomicAdd`
- **Kind:** primitive; alphabetical operational track
- **Sequence position:** 10

# Central question / skill
Understand how multiple threads safely update one shared location.

# Prerequisites
- `class-4` — cooperative work and shared data reuse

# Concepts in scope
- race condition
- atomic update
- correctness
- contention
- atomics are not automatically the best algorithm

# Explicitly out of scope
- custom lock-free protocols
- system-scope atomics
- performance rankings
- library-specific alternatives

# Intended interaction
Compare a conflicting update with an atomic update using a deterministic small
set of operations. Show correctness and contention as separate outcomes.

# Intended visual grammar
Precise 2D output locations with explicit conflict and serialized-update
markers. Do not imply a scheduler timeline or measured throughput.

# Definition of learned
The learner can distinguish a lost update from an atomic update and explain why
atomic correctness does not remove contention.

# Dependencies / prerequisites for implementation
Define the race and atomic result as model facts and test both a wrong and a
correct outcome. Keep the first implementation primitive-specific; do not add a
generic atomic visualization layer.

# Status: PLANNED
