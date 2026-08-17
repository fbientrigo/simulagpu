# Identity
- **Stable id:** `primitive-c`
- **Title:** `Primitiva C — __syncthreads()`
- **Kind:** primitive; alphabetical operational track
- **Sequence position:** 6

# Central question / skill
Understand what a block-wide barrier guarantees and what it does not guarantee.

# Prerequisites
- `class-2` — reduction passes and the need for cooperative progress

# Concepts in scope
- threads reaching a barrier
- same-block scope
- no inter-block synchronization
- divergent or invalid barrier use
- before, waiting, and released states

# Explicitly out of scope
- cooperative groups
- grid-wide barriers
- warp-level synchronization
- synchronization performance tuning

# Intended interaction
A small deterministic state transition showing threads before the barrier,
waiting, and released only after the block condition is met. Include an invalid
control case as explanation, not as executable CUDA.

# Intended visual grammar
Precise modular 2D state with block boundaries and explicit waiting labels.
Never show a cross-block release as valid.

# Definition of learned
The learner can state which threads may proceed after `__syncthreads()` and
reject divergent or cross-block barrier assumptions.

# Dependencies / prerequisites for implementation
Define the participating-thread contract and invalid states in `contracts` and
test them in `core` before authoring the visual. Include model-boundary text and
avoid simulating a scheduler or hardware timing.

# Status: PLANNED
