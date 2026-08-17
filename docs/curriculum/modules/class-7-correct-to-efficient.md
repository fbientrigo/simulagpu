# Identity
- **Stable id:** `class-7`
- **Title:** `Clase 7 — De correcto a eficiente`
- **Kind:** numbered class track
- **Sequence position:** 15

# Central question / skill
How do we reason systematically about improving a correct GPU implementation?

# Prerequisites
- `class-6` — streams, dependencies, and overlap reasoning
- `primitive-g` — explicit synchronization scope

# Concepts in scope
- correct naive implementation
- improved indexing and memory access
- shared-memory reuse
- synchronization
- atomics where appropriate
- overlap where appropriate
- tradeoff reasoning

# Explicitly out of scope
- a new CUDA API catalogue
- unmeasured benchmark numbers
- universal optimization rules
- architecture-specific tuning recipes

# Intended interaction
Compare staged versions of one correct implementation and require the learner
to annotate what changed, why correctness remains valid, what bottleneck is
addressed, and what tradeoff was introduced.

# Intended visual grammar
Use the grammar that matches each comparison: precise 2D state for data,
restrained 2.5D for reuse structure, and timelines for overlap. Do not force one
representation across all stages.

# Definition of learned
The learner can explain a correctness-preserving change, the resource or
bottleneck it addresses, and the tradeoff it introduces without inventing a
benchmark result.

# Dependencies / prerequisites for implementation
Select one bounded integration example and preserve a CPU oracle for every
version. Define measurement provenance before publishing any number; otherwise
show qualitative reasoning only.

# Status: PLANNED
