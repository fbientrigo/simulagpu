# Identity
- **Stable id:** `primitive-h`
- **Title:** `Primitiva H — cudaFree`
- **Kind:** reference primitive outside the first A–G interleaving
- **Sequence position:** 16

# Central question / skill
Reserve the release operation as a future reference module for allocation
lifetime.

# Prerequisites
- `primitive-a` — allocation and device-pointer state

# Concepts in scope
- allocation lifetime
- release operation
- pointer ownership boundary

# Explicitly out of scope
- allocator performance
- memory pools
- unified-memory policy

# Intended interaction
A compact reference transition from allocated to released state, when this
module is eventually implemented.

# Intended visual grammar
Reference-only precise 2D state; no scheduler or timing implication.

# Definition of learned
Future module: explain when an allocation is released and what lifetime
obligation follows `cudaMalloc`.

# Dependencies / prerequisites for implementation
Preserve the `cudaMalloc` before/after semantics and define invalid reuse as a
model fact before adding any learner-facing page.

# Status: PLANNED
