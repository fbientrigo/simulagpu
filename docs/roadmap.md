# Roadmap

Engineering document (English).

The unit of progress is a **vertical slice**: Spanish documentation, a
deterministic interactive model with tests, runnable CPU/CUDA code, a starter
and solution sharing one test contract, and Anki cards. A topic is not a class
until every piece exists and CI validates the CPU-safe path.

Stages are ordered by learning dependency, not by date.

---

## Foundation and class 01 — complete

- pnpm workspace: `contracts → core → visuals → apps/docs`
- CMake tree: `common → examples → exercises → tests`
- optional CUDA detection with a complete CPU-only build
- Class 01: global thread indexing and vector addition
- deterministic URL-serializable thread explorer
- CPU oracle, CUDA error policy, local timing boundaries
- starter/solution exercise and 18 Anki cards
- GitHub Pages and CPU-safe CI

## Class 02 — parallel reduction — complete in this change

This class follows the second concrete exercise in the CERN STEAM Academy 2026
GPU course while keeping SimulaGPU's stricter correctness-first contract.

- Spanish lesson: races, atomics, adjacent-pair tree reduction, odd sizes,
  barriers, shared memory and floating-point associativity
- `LaboratorioReduccion`: deterministic pass-by-pass tree visualization
- select-based guided kernel editor
- browser runner for even, odd and singleton CPU-oracle cases; explicitly not a
  CUDA compiler or GPU simulator
- native CPU reduction helpers, Kahan-style reference and tolerance checks
- simple multi-pass CUDA example isolated behind optional detection
- exercise 02 with five focused TODOs and one shared CPU test file
- 12 additional Anki cards
- CI verifies the solution and ensures the starter remains deliberately red

### Known gaps after class 02

| Gap | Impact | Trigger or owner decision |
| --- | --- | --- |
| No `LICENSE` file | External users may view but cannot safely reuse the material. | **Owner decision required.** |
| CUDA translation units are not built in standard CI | CPU behavior is gated; `.cu` syntax and runtime remain manually reviewed. | Add a non-blocking compile job when an `nvcc` image is worth the CI cost; add runtime checks only with a GPU runner. |
| The Anki generator supports one deck header | Class 02 cards temporarily retain the original deck header for import compatibility. | Migrate when the generator supports a root deck plus per-card lesson metadata without duplicating existing notes. |
| No sanitizer job | Current starters fail through deterministic wrong results rather than memory bugs. | Add when a race or memory-layout exercise provides a useful failure to reproduce. |

---

## Next: CUDA memory access and execution

**Depends on:** classes 01 and 02.

The next class should make hardware-relevant memory behavior visible without
pretending a browser model predicts timing.

- Lesson: global, shared, register and constant memory; warps; coalescing;
  divergence; occupancy as a resource constraint rather than a score
- Visualization: addresses requested by one warp for coalesced versus strided
  patterns, with transaction assumptions stated explicitly
- Native: 2D matrix indexing and a shared-memory tile
- Exercise: repair a transposed or strided access; correctness tests run on CPU,
  while the performance comparison is local-only on actual hardware
- Required design decision: define the exact simplified memory-transaction model
  before drawing it

## Then: optimized reductions

**Depends on:** memory access and execution.

Class 02 deliberately teaches one global-memory pass per launch. The optimized
follow-up can now explain why the correct baseline is slow.

- shared-memory block reduction
- barrier placement and the requirement that all participating threads reach it
- power-of-two assumptions and non-power-of-two extensions
- bank conflicts and sequential-addressing variants
- warp-level primitives such as shuffle reduction
- comparison against a library implementation when available
- no published speedup without machine, compiler, GPU and command provenance

## CPU / OpenMP / SIMD bridge

**Can run before or after CUDA memory.**

- parallel loops, races, reductions and false sharing
- OpenMP behind optional CMake detection
- deliberately racy accumulator repaired for correctness first and layout second
- ThreadSanitizer job if runner support is reliable
- explicit answer to “when is the GPU not the right tool?”

## Irregular algorithms and graphs

**Depends on:** memory behavior and reductions.

- frontier-based BFS on CSR
- warp divergence and load imbalance
- visualization of one warp taking different branches and a frontier growing
- CPU BFS oracle and a frontier-expansion exercise

## Libraries: Thrust and vendor primitives

**Depends on:** optimized reductions.

- `thrust::reduce`, transformations and sorting
- compare hand-written, Thrust and vendor-library implementations for
  correctness before timing
- exercise: replace a custom kernel and justify the maintenance/performance
  tradeoff with a local measurement

## Applied scientific cases

**Depends on:** memory and reductions.

Candidate vertical slices:

- histogramming with atomic contention;
- stencil with halo/boundary conditions;
- N-body tiling;
- scientific event filtering and compacting.

Each case needs a CPU oracle, explicit numerical error budget, boundary cases
and an abstention from universal performance claims.

## Advanced ML/CUDA case

**Depends on:** all foundations above.

- naive and tiled matrix multiplication
- arithmetic intensity and data reuse
- where tensor cores change precision and layout requirements
- compare against a library; never claim to beat it without reproducible
  evidence

---

## Infrastructure triggers

| Item | Trigger |
| --- | --- |
| `LICENSE` | Immediate owner decision |
| CUDA compile-only CI | A stable toolkit image and acceptable CI minutes |
| GPU runtime CI | A maintained GPU runner |
| Shared visualization primitives | A third component genuinely repeats the same interaction/layout primitive |
| Global state store | Two components on one page need synchronized state |
| Search | More than roughly ten lesson pages |
| i18n | Someone commits to maintaining another learner-facing language |
| Benchmark harness | A class makes a performance claim that must survive review |
| Multi-deck Anki output | A migration plan preserves existing card identities and review histories |
