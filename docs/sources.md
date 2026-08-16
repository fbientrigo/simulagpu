# Sources and attribution

Engineering document (English). The learner-facing summary is at
[`apps/docs/referencia/fuentes.md`](../apps/docs/referencia/fuentes.md).

Every concept or pattern SimulaGPU took from somewhere else is recorded here,
with what was reused and whether any code was copied. **In v0.1, no source file
from any reference repository was copied, adapted line by line, or vendored.**

---

## Reference repositories

| Repository | Role | License | Copying allowed? |
| --- | --- | --- | --- |
| [`CERN-STEAM-Academy/26-GPU-PROGRAMMING`](https://github.com/CERN-STEAM-Academy/26-GPU-PROGRAMMING) | GPU concepts, exercise design, terminology, topic progression | **GPL-3.0** (`LICENSE`, GNU GPL v3 verbatim) | No — copyleft would propagate to SimulaGPU |
| `csc2026_e1` (CSC Latin America 2026, HEP Computing Exercises) | Pedagogical and engineering patterns | **No LICENSE file** → all rights reserved | No — no grant to copy exists |

Both licenses were checked before any adaptation. In both cases the conclusion
was the same: reuse the *ideas*, write the *code* from scratch.

Ideas, teaching sequences, and facts about CUDA are not protected by copyright.
Concrete expression is. Everything below is on the ideas side of that line.

---

## From `26-GPU-PROGRAMMING`

### S-1 — Vector addition as the first exercise

- **Source path:** `1-vector-add/`
- **Reused:** the choice of vector addition as the entry point to CUDA, and the
  learning outcomes attached to it (thread indexing, bounds guard, launch
  configuration, transfers, validation against a CPU reference).
- **Status:** concept only. Rewritten from first principles.
- **Note:** the concept is standard across the CUDA literature; this repository
  is where SimulaGPU took it from.

### S-2 — The deliberately broken kernel

- **Source path:** `1-vector-add/vector_add.cu`
- **Reused:** the pedagogical device of shipping a kernel whose index line is
  wrong (`int i = 0;   // Oops! Something is not right here, please fix it!`)
  and asking the student to derive the correct expression.
- **Status:** concept only. SimulaGPU's starter
  (`native/exercises/01-vector-add/starter/`) is a different program with a
  different structure, and extends the idea: in the original, only the index
  line is broken and the guard and the ceiling division are handed to the
  student. SimulaGPU breaks all four so each one is actually exercised, and
  makes them host-testable so they can be checked without a GPU.

### S-3 — Validating against a sequential CPU function

- **Source path:** `1-vector-add/vector_add.cu` (`vec_add`, `compare_arrays`)
- **Reused:** the principle that a GPU result is only trustworthy when compared
  element by element against a sequential CPU implementation.
- **Status:** concept only. `native/common/src/vector_add_cpu.cpp` was written
  from scratch. Two deliberate differences: the reference compares with a ULP
  distance computed by type-punning through `unsigned int*`, which is undefined
  behaviour in C++ and unnecessary here — plain `a + b` is a single correctly
  rounded IEEE-754 operation, so the tolerance is exactly zero and a plain
  comparison suffices. SimulaGPU also handles NaN explicitly.

### S-4 — Individual CUDA error checks

- **Source path:** `1-vector-add/vector_add.cu`
- **Reused:** the practice of checking the return code of every CUDA runtime
  call, and of calling `cudaGetLastError()` after a launch.
- **Status:** concept only, with a deliberate policy change. The reference
  prints to `stderr` and continues. SimulaGPU aborts
  (`native/common/include/simulagpu/cuda_check.cuh`); see
  [ADR-0003](adr/0003-cuda-error-handling.md). SimulaGPU also checks
  `cudaDeviceSynchronize()` after the launch, which the reference does not — it
  synchronizes for timing, but does not inspect the result.

### S-5 — Ceiling division for the grid size

- **Source path:** `1-vector-add/vector_add.cu`
  (`int nblocks = int(ceilf(n/(float)block_size));`)
- **Reused:** the requirement itself.
- **Status:** rewritten differently on purpose. SimulaGPU uses integer
  arithmetic (`n / b + (n % b != 0)`) rather than a float round trip, which
  loses precision above 2^24. The float form is not taught as an option.

### S-6 — Kernel timing

- **Source path:** `1-vector-add/timer.h`, `1-vector-add/timer.cc`
- **Reused:** the idea of separating "time the CPU function" from "time the GPU
  function", and of synchronizing around the launch.
- **Status:** **not reused as code.** The reference timer is a GPL-licensed
  `rdtsc`-based class with inline x86/PPC assembly that `#error`s on
  unrecognized architectures. SimulaGPU uses `std::chrono::steady_clock` on the
  host and CUDA events on the device
  (`native/common/include/simulagpu/timing.hpp`,
  `native/common/include/simulagpu/cuda_check.cuh`). SimulaGPU additionally
  reports end-to-end time, which the reference never measures.

### S-7 — Terminology

- **Reused:** Spanish and English vocabulary for grid / block / thread,
  `blockIdx.x`, `blockDim.x`, `threadIdx.x`, host, device, kernel.
- **Status:** standard CUDA terminology from the NVIDIA programming guide. No
  attribution obligation; recorded for traceability.

### S-8 — Topic progression

- **Source paths:** `2-reduction/`, `3-bfs/`, `4-reduction_fast/`,
  `5-matrix_sum/`, `6-garbage-collection/`, `7-puzzle/`
- **Reused:** the ordering of later topics — naive reduction, optimized
  reduction, 2D indexing, graph search, applied symbolic reasoning — as the
  compatibility target the v0.1 foundation must not paint itself out of.
- **Status:** informs `docs/roadmap.md` only. No code inspected beyond the
  topic each directory covers.

---

## From `csc2026_e1`

### S-20 — "Correctness first, then parallelism, then performance"

- **Source path:** `README.md`
- **Reused:** the ordering principle, and the decision to make it an explicit
  rule rather than an implicit habit.
- **Status:** concept only. Restated in `AGENTS.md` and
  `docs/architecture.md`.

### S-21 — Self-contained exercise layout

- **Source paths:** `exercises/SD-E1-parallel-event-processing/`,
  `exercises/TT-E1-debugging-sanitizers/`
- **Reused:** the structure — an exercise directory with a `README.md` covering
  learning objectives, a timebox, success criteria and exact commands, plus a
  `starter/` that is its own CMake project with its own tests.
- **Status:** structural pattern only. SimulaGPU's
  `native/exercises/01-vector-add/` was written from scratch and differs in one
  respect: starter and solution share a single test file, so "the same tests now
  pass" is the literal success criterion.

### S-22 — Deliberately incorrect starter code

- **Source path:** `exercises/SD-E1-parallel-event-processing/starter/README.md`
  ("This project contains a deliberately incorrect parallel implementation.")
- **Reused:** the principle that a starter should compile and run while being
  wrong, rather than be a skeleton with missing files.
- **Status:** concept only. Independently reinforced by S-2.

### S-23 — CMake + Ninja workflow

- **Source paths:** `CMakeLists.txt`, `exercises/*/starter/CMakeLists.txt`
- **Reused:** feature `option()`s with sensible defaults, a shared warning
  variable applied to project targets only (not to dependencies),
  `include(CTest)` with one test executable per unit, and
  `cmake -B build -G Ninja` as the documented workflow.
- **Status:** these are idiomatic modern CMake conventions rather than original
  expression. `native/CMakeLists.txt` was written from scratch. It diverges in
  one important way: SimulaGPU has **no `FetchContent`**, so configuring needs
  no network. See [ADR-0004](adr/0004-no-test-framework-dependency.md).

### S-24 — Sanitizers as a teaching tool

- **Source paths:** `CMakeLists.txt` (`ENABLE_SANITIZERS`),
  `.github/workflows/ci.yml`
- **Reused:** exposing ASan + UBSan behind a single CMake option so students can
  reproduce a memory bug on demand.
- **Status:** concept only, and reduced in scope. SimulaGPU exposes
  `SIMULAGPU_ENABLE_SANITIZERS` but does not run a sanitizer job in CI: v0.1 has
  no memory-bug exercise for it to guard.

### S-25 — CI as a teaching guardrail

- **Source path:** `.github/workflows/ci.yml`
- **Reused:** the idea that CI teaches by failing — build, test, lint and docs
  as separate visible steps.
- **Status:** concept only. `.github/workflows/ci.yml` was written from
  scratch and is much smaller: no ROOT container, no Python, no benchmark job,
  no clang-tidy. v0.1 has nothing for those to check.

### S-26 — Reproducible benchmarks

- **Source paths:** `benchmarks/`, the `benchmarks` CI job
- **Reused:** the principle that a performance claim needs a reproducible
  measurement behind it.
- **Status:** **adopted as a constraint, not as a feature.** SimulaGPU v0.1 has
  no benchmark harness, and therefore publishes no performance numbers. The
  example measures itself and prints what it measured on the machine it ran on.

---

## Original to SimulaGPU

Written from scratch, with no source-level counterpart in either reference
repository:

- the whole web stack: `packages/contracts`, `packages/core`,
  `packages/visuals`, `packages/theme`, `apps/docs`;
- the deterministic thread-index teaching model and its URL serialization;
- the `ExploradorIndiceGlobal` visualization;
- the class methodology v2 (`docs/class-methodology.md`), deterministic
  `cudaMalloc` transition model, `ClaseCudaMalloc` interaction, local learner
  cache, and four-card mini-review;
- all Spanish lesson content;
- the Anki deck, its YAML schema and the generator;
- `native/common`, `native/examples/vector-add`,
  `native/exercises/01-vector-add`;
- the header-only test helper (`test_assert.hpp`);
- all CMake and CI configuration.

## Third-party runtime and build dependencies

Web (see `pnpm-lock.yaml` for exact versions): Vue, VitePress, Vite, Vitest,
TypeScript, ESLint, Prettier, `js-yaml`, `@vue/test-utils`, `happy-dom`. All MIT
or similarly permissive; none is vendored into the repository.

Native: **none.** `native/` compiles with a C++17 compiler and CMake alone.

## Verification status of the CUDA code

`native/examples/vector-add/vector_add_cuda.cu`,
`native/exercises/01-vector-add/solution/src/vector_add.cu` and
`native/exercises/01-vector-add/starter/src/vector_add.cu` have **not been
compiled or executed**. v0.1 was authored on a machine with no NVIDIA GPU and no
`nvcc`. They are written against the documented CUDA runtime API and reviewed by
hand, and they are isolated behind optional CMake detection so their state
cannot affect the CPU-only build. This is stated on the site as well, in
`apps/docs/referencia/fuentes.md` and on the landing page.

## Licensing of SimulaGPU itself

v0.1 ships **no `LICENSE` file**, which means all rights reserved by default.
That is a decision for the repository owner, not one to be made implicitly by a
scaffold. Until it is made, the content here should be treated as
"viewable, not reusable". Tracked in `docs/roadmap.md`.
