# Identity
- **Stable id:** `class-3`
- **Title:** `Clase 3 — Cooperación, memoria y patrones de acceso`
- **Kind:** numbered class track
- **Sequence position:** 7

# Central question / skill
How does a GPU algorithm change when threads need related data and the memory-access pattern becomes part of the reasoning?

# Prerequisites
- `class-2` — independent pairwise work, reduction passes, and correctness-first reasoning
- `primitive-c` — block-local barrier semantics and safe participation

# Concepts in scope
- independent versus cooperative work
- per-thread/private values and global device memory
- block-local reuse as a motivation, without teaching `__shared__` yet
- synchronization boundaries between dependent phases
- contiguous versus strided access
- introductory access/coalescing intuition without hardware simulation
- repeated reads and data-reuse opportunities

# Explicitly out of scope
- `__shared__` declaration or operational semantics (Primitive D)
- shared-memory bank conflicts
- advanced occupancy tuning
- detailed cache policy or transaction simulation
- architecture-specific performance claims
- measured speedups without native evidence

# Intended interaction
Use one stable 2D thread-to-data scene with progressive states: familiar independent
mapping, a small neighborhood/repeated-read pattern, a dependent cooperative phase
that applies Primitive C, contiguous versus strided address mappings, and a final
reuse opportunity. Keep the storage used for future reuse conceptual; the class
should end by asking where a block could stage those values, not by teaching
`__shared__`.

# Intended visual grammar
Precise 2D indexed cells, thread lanes, memory-region labels, and explicit arrows.
Keep index/address distinct from stored value. Geometry remains stable while the
mapping or semantic state changes. Do not use 2.5D or fake timing.

# Definition of learned
Given a small unfamiliar GPU pattern, the learner can identify cross-thread data
dependencies, place a block-local synchronization boundary, distinguish contiguous
from strided thread-to-address mappings, and identify repeated values that create a
reuse opportunity without claiming a measured speedup.

# Dependencies / prerequisites for implementation
Define the simplified deterministic access model and its assumptions before drawing
it. Reuse Primitive C as known vocabulary rather than reteaching barrier mechanics.
Do not expose `__shared__` syntax or make block-local storage operational until
Primitive D. Preserve browser-model determinism and keep all performance/timing
claims qualitative unless native measurement exists.

# Status: PLANNED
