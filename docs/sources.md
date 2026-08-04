# Sources and attribution

Engineering document (English). The learner-facing summary is at
[`apps/docs/referencia/fuentes.md`](../apps/docs/referencia/fuentes.md).

This document records the external ideas used by SimulaGPU, the exact source
paths consulted, and whether source code was copied. **No source file from a
reference repository has been copied, translated, adapted line by line, or
vendored.** Concepts were studied and every implementation was rewritten from
scratch.

---

## Reference repositories

| Repository | Role | License | Source reuse |
| --- | --- | --- | --- |
| [`CERN-STEAM-Academy/26-GPU-PROGRAMMING`](https://github.com/CERN-STEAM-Academy/26-GPU-PROGRAMMING) | GPU concepts, terminology, exercise sequence and common learner mistakes | **GPL-3.0** | Concepts only; no code copied |
| `csc2026_e1` (CSC Latin America 2026 HEP Computing Exercises) | Pedagogical and engineering patterns | **No LICENSE file** → all rights reserved | Patterns only; no code copied |

The licenses were checked before implementation. The GPL source cannot be
copied into SimulaGPU without propagating its terms, and the unlicensed source
grants no permission to copy. Ideas and facts were therefore separated from
expression: understand the concept, close the reference, and write a different
implementation with its own tests and explanation.

---

## From `26-GPU-PROGRAMMING`

### S-1 — Vector addition as the first exercise

- **Source path:** `1-vector-add/`
- **Reused:** vector addition as the entry point to CUDA; global indexing,
  bounds guards, launch configuration, transfers, and validation against a CPU
  reference.
- **Status:** concept only; rewritten from scratch in lesson 01.

### S-2 — A deliberately broken index

- **Source path:** `1-vector-add/vector_add.cu`
- **Reused:** the teaching device of providing code that runs but contains an
  incorrect thread-index expression.
- **Status:** concept only. SimulaGPU independently expands the exercise to
  cover index arithmetic, ceiling division, the boundary guard, and host-side
  tests that run without CUDA.

### S-3 — CPU oracle before performance

- **Source path:** `1-vector-add/vector_add.cu`
- **Reused:** compare the device result against an obviously correct sequential
  implementation before interpreting timings.
- **Status:** concept only. SimulaGPU's CPU helpers, NaN handling and tests are
  original.

### S-4 — CUDA error checks

- **Source path:** `1-vector-add/vector_add.cu`
- **Reused:** inspect every CUDA runtime return value and check a kernel launch.
- **Status:** concept only, with a different policy. SimulaGPU reports the file,
  line and call, then stops instead of continuing after a failed allocation or
  launch. It also checks asynchronous execution failures.

### S-5 — Ceiling division

- **Source path:** `1-vector-add/vector_add.cu`
- **Reused:** a grid must round upward so every input element has a thread.
- **Status:** rewritten using integer arithmetic instead of a floating-point
  `ceilf` round trip.

### S-6 — Timing boundaries

- **Source paths:** `1-vector-add/timer.h`, `1-vector-add/timer.cc`
- **Reused:** distinguish CPU work from GPU work and synchronize before reading
  a device timing.
- **Status:** no code reused. SimulaGPU uses `std::chrono::steady_clock` and CUDA
  events, and reports kernel-only and end-to-end time separately.

### S-7 — Reduction as the second concrete GPU problem

- **Source path:** `2-reduction/reduction.cu`
- **Reused:** move from independent element-wise work to a many-to-one sum;
  reduce adjacent pairs over repeated passes; preserve an odd tail; validate
  against a more reliable CPU sum; and make the student implement the missing
  reduction kernel.
- **Status:** concept only; **rewritten from scratch**. SimulaGPU uses different
  APIs, file layout, test cases, error handling and teaching code. Its browser
  laboratory is a deterministic CPU model that does not exist in the source.

### S-8 — Floating-point reduction needs a real reference

- **Source path:** `2-reduction/reduction.cu` (`sum_floats_kahan` and result
  comparison).
- **Reused:** a parallel reduction changes addition order, so validation should
  not assume bitwise equality with a naive sequential float accumulation.
- **Status:** concept only. SimulaGPU independently implements a Kahan-style
  double reference, explicit finite-value checks, and absolute-plus-relative
  tolerance helpers.

### S-9 — Topic progression and optimized reduction vocabulary

- **Source paths:** `2-reduction/`, `4-reduction_fast/`, `5-matrix_sum/`,
  `3-bfs/`, `6-garbage-collection/`, `7-puzzle/`
- **Reused:** the course progression from introductory reduction toward memory
  hierarchy, optimized reductions, multidimensional indexing and irregular
  algorithms.
- **Status:** curriculum guidance only. Lesson 02 discusses shared memory and
  synchronization as the next optimization layer, but its introductory CUDA
  implementation deliberately uses one global-memory pass per launch so
  correctness remains visible.

### S-10 — Standard CUDA terminology

- **Reused:** grid, block, thread, host, device, kernel, shared memory,
  `__syncthreads`, and atomics.
- **Status:** standard platform terminology; recorded for traceability.

---

## From `csc2026_e1`

### S-20 — Correctness, then parallelism, then performance

- **Source path:** `README.md`
- **Reused:** the ordering principle used throughout lessons and reviews.
- **Status:** concept only.

### S-21 — Self-contained exercise layout

- **Source paths:** `exercises/SD-E1-parallel-event-processing/`,
  `exercises/TT-E1-debugging-sanitizers/`
- **Reused:** an exercise README with objectives, exact commands and success
  criteria; a standalone starter CMake project; and tests that provide a clear
  completion condition.
- **Status:** structural pattern only. SimulaGPU's exercises share one test file
  between starter and solution and have independently written code.

### S-22 — Deliberately incorrect but runnable starter

- **Source path:** `exercises/SD-E1-parallel-event-processing/starter/README.md`
- **Reused:** start from plausible wrong behavior rather than missing files or
  functions that do not link.
- **Status:** concept only. Lesson 02's starter overlaps pairs, mishandles the
  odd tail, and still compiles so each failure can be diagnosed.

### S-23 — CMake, Ninja and CTest workflow

- **Source paths:** root and exercise `CMakeLists.txt` files
- **Reused:** feature options, warnings on project targets, standalone exercise
  builds, and CTest as the success signal.
- **Status:** idiomatic build patterns, independently implemented. SimulaGPU's
  native tree has no third-party dependency and configures offline.

### S-24 — CI as a teaching guardrail

- **Source path:** `.github/workflows/ci.yml`
- **Reused:** CI should not only build the solution; it should also ensure a
  deliberately incorrect starter still fails for the intended reason.
- **Status:** concept only. SimulaGPU's workflow is independently written and
  CPU-safe.

### S-25 — Reproducible performance claims

- **Source paths:** benchmark configuration and CI
- **Reused:** a performance claim needs a reproducible measurement behind it.
- **Status:** adopted as a constraint. Examples print local timings, but the
  repository publishes no hardware-independent speedup claim.

---

## Original to SimulaGPU

Written for this repository with no source-level counterpart copied from either
reference:

- the one-way web architecture: `contracts → core → visuals → apps/docs`;
- the deterministic, immutable thread-index and reduction teaching models;
- `ExploradorIndiceGlobal` and `LaboratorioReduccion`;
- the select-based guided kernel editor and its browser-side CPU test runner;
- all Spanish lesson and exercise text;
- the C++ CPU helpers, native examples, CUDA implementations and tests;
- the starter/solution exercises for vector addition and reduction;
- the Anki YAML sources, schema and deterministic TSV generator;
- all CMake, CI and documentation configuration.

## Third-party runtime and build dependencies

Web dependencies are recorded exactly in `pnpm-lock.yaml`: Vue, VitePress,
Vite, Vitest, TypeScript, ESLint, Prettier, `js-yaml`, Vue Test Utils and
`happy-dom`. None is vendored.

Native dependencies: **none** beyond a C++17 compiler and CMake. CUDA files are
included only when CMake detects or requires a CUDA compiler.

## Verification status of CUDA code

Standard CI builds and tests the complete CPU-only configuration. It does not
install `nvcc` and has no physical GPU, so these CUDA translation units remain
outside the gating build:

- `native/examples/vector-add/vector_add_cuda.cu`;
- `native/examples/reduction/reduction_cuda.cu`;
- both starter and solution CUDA files under exercises 01 and 02.

They are isolated behind optional CUDA detection, use the documented runtime
API, and are reviewed as source, but no claim is made that CI compiled or ran
them. The browser laboratory likewise does not compile CUDA or emulate GPU
hardware.

## Licensing of SimulaGPU itself

The repository currently has no `LICENSE` file, so it is all rights reserved by
default. Choosing a license remains an explicit owner decision tracked in the
roadmap.
