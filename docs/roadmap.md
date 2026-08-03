# Roadmap

Engineering document (English).

The unit of progress is a **vertical slice**: documentation, a deterministic
visualization with unit tests, runnable code, an exercise with starter and
solution, and Anki cards — all linked together, all passing CI. A stage is not
done until every one of those exists.

Stages after v0.1 are ordered by dependency, not by date. No dates are given
because none would be honest.

---

## v0.1 — Foundation ✅

Architecture plus one complete vertical slice.

- pnpm workspace: `contracts` → `core` → `visuals` → `theme` → `apps/docs`
- CMake tree: `common` → `examples` → `exercises`, with optional CUDA detection
- Lesson 01, *Del índice global a la suma de vectores*
- `ExploradorIndiceGlobal`, deterministic, URL-serializable, unit-tested
- `native/examples/vector-add`: CPU implementation, CUDA implementation,
  comparison, error handling, kernel-only and end-to-end timing
- `native/exercises/01-vector-add`: 8 TODOs, 4 of them verifiable without a GPU
- 18 Anki cards, reproducible TSV generation
- CPU-safe GitHub Actions CI, GitHub Pages deployment

### Known gaps carried out of v0.1

| Gap | Impact | Owner decision needed? |
| --- | --- | --- |
| No `LICENSE` file | The repository is "all rights reserved" by default, so nobody may reuse the material. | **Yes.** The licence is the owner's call. |
| CUDA code never compiled or run | The `.cu` files are reviewed by hand only. | No — needs hardware. |
| No CUDA job in CI | Nothing catches a CUDA compile error. | No — see "CUDA compile job" below. |
| No sanitizer job in CI | The option exists; nothing exercises it. | No — needs a memory-bug exercise first. |

---

## Next: CPU / OpenMP / SIMD bridge

**Why first:** it is the only stage that needs no GPU at all, so every student
can complete it, and it establishes the vocabulary — *race*, *reduction*,
*false sharing*, *memory-bound* — that every later GPU lesson leans on. It also
answers the question a GPU course usually skips: *when is the GPU not the
answer?*

- Lesson: parallel loops, races, reductions, false sharing
- Visualization: work distribution across threads, and where two threads collide
- Native: OpenMP behind an optional CMake flag, mirroring the CUDA detection
  already in place
- Exercise: a deliberately racy accumulator; fix correctness first, layout
  second
- CI: this is where the sanitizer job earns its place (TSan for the race, ASan
  for the layout fix)

## CUDA memory and execution

**Depends on:** v0.1.

- Lesson: memory hierarchy (global, shared, registers, constant), coalescing,
  occupancy
- Visualization: coalesced versus strided access, and what a warp actually
  reads in one transaction — the first visualization that must model warps, and
  must say so
- Native: 2D indexing (matrix addition), shared-memory tiling
- Exercise: fix an uncoalesced access pattern; measure before and after **on
  your own hardware**

## Reductions

**Depends on:** CUDA memory and execution. This is the first lesson where the
CPU oracle and the GPU result legitimately differ, so it is also the lesson
about floating-point associativity.

- Lesson: tree reduction, why the naive version is slow, warp-level primitives
- Visualization: the reduction tree, step by step, with the active thread set at
  each level
- Native: naive reduction → shared-memory reduction → warp shuffle
- Exercise: implement the tree; handle an odd number of elements correctly
- Note: `first_mismatch` gains a real reason to take a non-zero tolerance here

## Irregular algorithms and graphs

**Depends on:** reductions.

- Lesson: why data-dependent parallelism is hard, warp divergence, load
  imbalance, frontier-based BFS
- Visualization: divergence within a warp; frontier growth on a small graph
- Native: BFS on a CSR graph, with a CPU BFS as the oracle
- Exercise: the frontier expansion step

## Libraries: Thrust and friends

**Depends on:** reductions.

- Lesson: when to stop writing kernels; `thrust::reduce`, `transform`, `sort`
- Native: the same reduction three ways — hand-written, Thrust, cuBLAS —
  compared for correctness first
- Exercise: replace a hand-written kernel and justify the change with a
  measurement
- Constraint: Thrust ships with the CUDA Toolkit, so this adds no new
  dependency to the CPU-only build

## Applied scientific cases

**Depends on:** memory and reductions.

- Lesson: a real numerical kernel — stencil, N-body, or histogramming
- Visualization: halo exchange, or the atomics contention pattern in a histogram
- Native: a complete case with a CPU oracle and an error budget
- Exercise: extend the case to a boundary condition it does not yet handle

## Advanced ML / CUDA case

**Depends on:** everything above.

- Lesson: tiled matrix multiplication, the arithmetic-intensity argument, and
  where tensor cores change it
- Native: naive → tiled → library, correctness-checked at every step
- Explicitly out of scope: training a model, or claiming to beat cuBLAS

## Anki APKG and printable cheat sheets

**Independent of the lesson sequence.** Deferred, not abandoned.

- APKG generation, gated on finding a well-maintained pure-JS writer that needs
  no binary template committed to Git. If it needs one, the TSV stays the only
  format.
- Printable A4 cheat sheet per lesson, generated from the same YAML the cards
  come from, so it cannot drift.

---

## Infrastructure, when it is justified

Each item names the trigger that would justify it. Until the trigger fires, the
item stays on this list.

| Item | Trigger |
| --- | --- |
| `LICENSE` | Immediate — this one is blocked only on the owner's decision. |
| CUDA compile job in CI | A self-hosted GPU runner, or a container with `nvcc` where compile-only checking is worth the minutes. Compile-only, never gating. |
| Sanitizer job in CI | The OpenMP stage lands a memory-bug exercise. |
| Shared visualization primitives | A **second** visualization needs the same primitive. Not before. |
| Global state store | Two components on one page need to share state. |
| Search on the docs site | More than ~10 lesson pages. |
| i18n infrastructure | Someone commits to maintaining a second language. |
| Benchmark harness | A lesson makes a performance claim that has to survive review. |
