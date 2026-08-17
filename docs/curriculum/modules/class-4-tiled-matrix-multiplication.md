# Identity
- **Stable id:** `class-4`
- **Title:** `Clase 4 — Multiplicación de matrices con tiles`
- **Kind:** numbered class track
- **Sequence position:** 9

# Central question / skill
How can a GPU reuse matrix data strategically instead of repeatedly fetching the
same values?

# Prerequisites
- `class-3` — memory regions, access patterns, and reuse
- `primitive-d` — block-local shared staging

# Concepts in scope
- matrix multiplication recap
- one `C[i,j]` from one row and one column
- matrix tiles
- block-level cooperation
- shared-memory tiling
- data reuse
- synchronization between load and compute phases

# Explicitly out of scope
- tensor cores
- advanced layouts
- autotuning
- benchmark claims
- production GEMM libraries

# Intended interaction
Trace one output element and one tile iteration through load and compute phases.
Keep matrix dimensions small enough to inspect exact values and boundaries.

# Intended visual grammar
This is the main restrained 2.5D proving ground: use 2D for exact matrix/tile
state and 2.5D only to show structural relationships between tiles and blocks.

# Definition of learned
The learner can trace one output element through tiled loads and compute phases,
explain reuse, and identify synchronization boundaries.

# Dependencies / prerequisites for implementation
Freeze the tile dimensions, boundary policy, and model disclaimer before
building visuals. Provide a CPU oracle and correctness-first native path; do
not imply that the visualization measures a GPU.

# Status: PLANNED
