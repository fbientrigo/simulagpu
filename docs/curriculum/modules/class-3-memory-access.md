# Identity
- **Stable id:** `class-3`
- **Title:** `Clase 3 — Memoria de GPU y patrones de acceso`
- **Kind:** numbered class track
- **Sequence position:** 7

# Central question / skill
Why does where and how threads access memory matter?

# Prerequisites
- `class-2` — independent work, reduction passes, and correctness-first reasoning
- `primitive-c` — block cooperation and barrier scope

# Concepts in scope
- registers, shared memory, and global memory
- contiguous versus strided access
- introductory coalescing
- access patterns
- data reuse

# Explicitly out of scope
- advanced occupancy tuning
- detailed cache policy
- bank-conflict optimization
- architecture-specific performance claims

# Intended interaction
Compare a small set of deterministic contiguous and strided requests, then
identify where reuse could occur. The interaction explains an access model; it
does not predict measured throughput.

# Intended visual grammar
Precise 2D addresses, lanes, and memory regions. Use 2.5D only if a structural
relationship cannot be made clear in 2D.

# Definition of learned
The learner can compare contiguous and strided access, name the role of the
three memory regions, and describe simple reuse without claiming a speedup.

# Dependencies / prerequisites for implementation
Specify the simplified access/coalescing model and its assumptions in the
contract before drawing it. Keep all timing and hardware claims out of the
browser model; add native correctness work separately.

# Status: PLANNED
