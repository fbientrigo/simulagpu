# SimulaGPU — v0.1 bootstrap plan

Engineering document (English). Learner-facing content is Spanish; see
[`AGENTS.md`](../AGENTS.md) for the language policy.

Status: executed. This document records the plan that was checked against the
v0.1 brief *before* implementation, and is kept as the record of what was
decided and why.

---

## 1. Findings

### 1.1 Target repository (`simulagpu`)

Empty at bootstrap: a single `README.md` containing `# simulagpu` on branch
`main`, plus the development branch `claude/simulagpu-v0-1-foundation-dkn7gh`.
No prior toolchain, no lockfile, no license file. Everything below is new.

### 1.2 Reference repository `26-GPU-PROGRAMMING`

CERN STEAM Academy 2026 GPU course. **Licensed GPL-3.0** (`LICENSE`, GNU GPL
v3 verbatim). Layout is a flat set of `make`-driven lab folders:

| Folder | Topic |
| --- | --- |
| `1-vector-add/` | vector addition, thread indexing |
| `2-reduction/` | naive parallel reduction |
| `3-bfs/` | breadth-first search on graphs |
| `4-reduction_fast/` | optimized reduction |
| `5-matrix_sum/` | 2D indexing |
| `6-garbage-collection/`, `7-puzzle/` | applied BDD / symbolic reasoning, multi-GPU |
| `slides/` | `.pptx` and `.pdf` decks |

Relevant observations for v0.1:

* `1-vector-add/vector_add.cu` is a *deliberately broken* exercise. The kernel
  body reads `int i = 0;   // Oops! Something is not right here, please fix it!`
  — the student's job is to derive
  `i = blockIdx.x * blockDim.x + threadIdx.x`. The `if (i < n)` guard is
  already present, and the grid size already uses a ceiling division
  (`ceilf(n / (float)block_size)`), so those two ideas are *shown* but never
  *exercised*.
* The driver validates the GPU result against a sequential CPU function
  (`vec_add`) using a ULP-distance comparison. Correctness-before-performance
  is therefore already the intended pedagogy.
* Every `cudaMalloc` / `cudaMemcpy` / `cudaMemset` return code is checked
  individually with an inline `if (err != cudaSuccess) fprintf(...)`, and
  `cudaGetLastError()` is checked after the launch. Errors are *reported*, but
  the program continues.
* Timing uses an `rdtsc`-based `timer` class (`timer.h` / `timer.cc`) with
  inline x86/PPC assembly, and `#error`s on unrecognised architectures. It
  wraps `cudaDeviceSynchronize()` around the launch, so it measures
  kernel-only time; host↔device transfer time is never measured.
* Problem size is hard-coded to `n = 5e7`, which is an exact multiple of the
  block size (1024) only by accident — `5e7 / 1024 = 48828.125`, so the tail
  block *is* partial, but nothing in the lab draws attention to it.
* Build is `nvcc`-only via `Makefile`. There is no CPU-only path, no test
  runner, and no CI.

### 1.3 Reference repository `csc2026_e1`

CSC Latin America 2026 HEP computing exercises. **No `LICENSE` file** →
default "all rights reserved". Pedagogical patterns worth adopting:

* Explicit slogan: "correctness first, then parallelism, then performance."
* `exercises/<CODE>-<name>/` with a top-level `README.md` (learning
  objectives, timebox, success criteria, commands) and a **self-contained
  `starter/`** that has its own `CMakeLists.txt` and its own `tests/`.
* Starter code is *deliberately incorrect* rather than missing — "This project
  contains a deliberately incorrect parallel implementation."
* Root `CMakeLists.txt` with feature `option()`s, a shared warning variable
  applied to project targets only, `include(CTest)`, and one test executable
  per unit.
* CMake + Ninja + `RelWithDebInfo` as the documented default workflow.
* CI as a teaching guardrail: build & test, sanitizers, static analysis, docs,
  benchmarks — separate jobs, `concurrency` cancellation.
* `Catch2` and `google/benchmark` are pulled in with `FetchContent`, with a
  `find_package(... QUIET)` fallback "helps in offline environments".

### 1.4 Environment

`node 22`, `pnpm 10`, `cmake 3.28`, `ninja 1.11`, `g++ 13.3` (C++17/20 fine),
`python 3.11`. **`nvcc` is not installed and no GPU is present.** Therefore no
CUDA compilation or CUDA runtime validation can be performed in this
environment, and none will be claimed.

---

## 2. Decisions

| # | Decision | Rationale |
| --- | --- | --- |
| D1 | Copy **no** source from either reference repo. Rewrite every example from first principles. | `26-GPU-PROGRAMMING` is GPL-3.0 (copyleft would propagate); `csc2026_e1` has no license at all (no grant to copy). Concepts and pedagogy are not copyrightable; expression is. |
| D2 | Do not commit a `LICENSE` to `simulagpu` in v0.1. | Choosing a license is the repository owner's call. Flagged in the final report and in `docs/roadmap.md`. |
| D3 | Replace the `rdtsc` timer with `std::chrono::steady_clock` on the host and CUDA events on the device. | The reference timer is GPL, architecture-specific, and `#error`s on unsupported targets. `<chrono>` is portable and standard; CUDA events are the correct tool for kernel-only timing. |
| D4 | CUDA error handling **aborts** by default instead of printing and continuing. | The brief requires "report CUDA errors rather than silently continuing". Continuing after a failed `cudaMalloc` produces misleading downstream errors; a single `SIMULAGPU_CUDA_CHECK` macro reports file, line, call text and error string, then fails. |
| D5 | No Catch2, no google/benchmark, no `FetchContent`. Ship a ~60-line header-only assertion helper (`native/common/include/simulagpu/test_assert.hpp`). | `FetchContent` needs network at configure time; the brief demands a CPU-only configure that works without CUDA and CI that is cheap. Zero third-party native dependencies keeps `cmake -B build && ctest` working offline. Recorded as ADR-0004. |
| D6 | Host-testable index math is factored into pure functions (`ceil_div`, `global_index`, `is_active`) that compile **without** CUDA. | This is what makes the exercise CI-verifiable on CPU-only runners, and it is exactly the reference lab's missing piece (it teaches indexing but can only be checked on a GPU). |
| D7 | The exercise ships `starter/` and `solution/` that both provide `include/exercise01/index_math.hpp`, and **share one test file** in `tests/`. | Same tests validate both; the student's success criterion is literally "the same tests now pass". Adopted from the `csc2026_e1` starter pattern. |
| D8 | Only the **solution** is wired into the root `native/` CTest run. `starter/` is a self-contained CMake project the student configures separately. | Starter tests are red by design; CI must be green. |
| D9 | Teaching model lives in `packages/core` as plain functions over frozen data. No store, no classes, no reactivity. | Rules 1, 3, 5, 6 of the architecture contract. Determinism is then trivially testable: same config → deep-equal snapshot. |
| D10 | URL serialization (`encode`/`decode`) lives in `core` and is implemented with plain string operations, **not** `URLSearchParams`. | `URLSearchParams` is a platform global; core must stay free of platform globals so it runs identically in Node, the browser, and tests. |
| D11 | The Vue component owns `window.location` sync; the model never sees it. | Rule 1 forbids browser globals in models, not in visualizations. Keeps the boundary at exactly one file. |
| D12 | "Presentation stages" (`vista`) are a display filter in the Vue layer. The snapshot is identical across stages. | Rule 4 — stages change what is shown, never what is computed. Enforced by a unit test asserting stage is absent from the config/snapshot contract. |
| D13 | The Anki TSV is **generated**, git-ignored, and written into `apps/docs/public/descargas/`. `pnpm dev`/`build` run `anki:build` first. | The brief forbids committing generated assets; the docs site still needs the file to exist for the download link. |
| D14 | Anki source is YAML parsed with `js-yaml`; validation is hand-written against `anki/schema/card.schema.json`. | YAML is the requested human-readable format. A JSON-Schema validator (ajv) would be a dependency used exactly once; the schema file still earns its place as editor/reviewer documentation. |
| D15 | APKG generation deferred. | No well-maintained pure-JS APKG writer that avoids shipping a binary template; the brief explicitly allows deferral. |
| D16 | GitHub Pages base path is `/simulagpu/`. | Project pages URL shape. |

Non-obvious consequence of D6+D8: the CUDA `.cu` files are *never compiled* in
CI. They are guarded behind `SIMULAGPU_ENABLE_CUDA`, which defaults to
"enable only if `CMAKE_CUDA_COMPILER` is actually found".

---

## 3. Proposed file tree

```
simulagpu/
├── AGENTS.md                      # agent + contributor contract
├── README.md                      # Spanish landing page for the repo
├── package.json                   # root scripts: dev/build/test/typecheck/lint/anki:build/verify
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── tsconfig.base.json
├── vitest.config.ts
├── eslint.config.js
├── .prettierrc.json / .prettierignore / .editorconfig / .gitignore
├── apps/docs/                     # VitePress site (Spanish)
│   ├── .vitepress/config.ts
│   ├── .vitepress/theme/index.ts
│   ├── index.md
│   ├── leccion/indice-global-suma-vectores.md
│   ├── guia/{instalacion,comandos}.md
│   ├── referencia/{arquitectura,fuentes}.md
│   └── public/descargas/           # generated TSV lands here (git-ignored)
├── packages/
│   ├── contracts/                 # zero-dependency TS types + limits
│   ├── core/                      # pure model: normalize, build snapshot, encode/decode
│   ├── visuals/                   # ExploradorIndiceGlobal.vue
│   └── theme/                     # CSS custom properties
├── native/
│   ├── CMakeLists.txt             # options, CUDA detection, add_subdirectory
│   ├── common/                    # launch math, CPU vector add, timing, cuda_check, test_assert
│   ├── examples/vector-add/       # CPU driver + optional .cu
│   └── exercises/01-vector-add/   # starter/ + solution/ + shared tests/
├── anki/{cards,schema,scripts}
├── docs/{architecture,sources,roadmap,bootstrap-plan}.md + docs/adr/
├── tests/                         # cross-cutting: anki reproducibility, lesson link integrity
└── .github/workflows/{ci.yml,pages.yml}
```

Every directory listed has files in it at the end of v0.1. No `.gitkeep`
placeholders.

## 4. Implementation sequence

1. Workspace scaffold: `package.json`, `pnpm-workspace.yaml`, tsconfig base,
   lint/format config, `.gitignore`.
2. `packages/contracts` — types and limits, zero dependencies.
3. `packages/core` — `normalizeThreadIndexConfig`, `buildThreadIndexSnapshot`,
   `encode`/`decode`, plus unit tests including determinism and JSON
   round-trip.
4. `packages/theme` — CSS tokens (light/dark aware).
5. `packages/visuals` — `ExploradorIndiceGlobal.vue` + component test.
6. `apps/docs` — VitePress config, landing page, the lesson, guide pages.
7. `native/common` → `native/examples/vector-add` →
   `native/exercises/01-vector-add`, then CTest wiring.
8. `anki/` — YAML cards, schema, deterministic build script, reproducibility
   test.
9. `docs/` — architecture, sources, roadmap, ADRs.
10. CI + Pages workflows.
11. Run everything; fix failures.

## 5. Explicit non-goals for v0.1

* No backend, database, authentication, Docker, Pyodide, CMS, or plugin system.
* No i18n infrastructure — Spanish is the only learner-facing language and is
  written directly into the content.
* No generic visualization framework. One lesson, one component.
* No generic CUDA abstraction layer. No RAII device-buffer wrapper, no kernel
  dispatch helper — a second concrete use case must exist first.
* No global store (Pinia or hand-rolled).
* No reduction lesson, no BFS, no matrix sum, no Thrust, no multi-GPU. Those
  are roadmap entries only.
* No migration of slides, PDFs, images, or ROOT/`.png` outputs from either
  reference repository.
* No APKG, no printable cheat sheets.
* No deployment target other than static GitHub Pages.
* No benchmark suite. The example measures itself; there is no
  regression-tracking harness and no published performance number.

## 6. Check of the plan against the brief

| Brief requirement | Where satisfied |
| --- | --- |
| Static docs site builds | `apps/docs`, CI `docs` step |
| Deterministic interactive visualization | `packages/core` + `packages/visuals`, §3 steps 3 & 5 |
| Model unit-tested | `packages/core/src/*.test.ts` |
| Reproducible Anki TSV | `anki/scripts/build-anki.mjs`, `tests/anki-build.test.ts` |
| CPU-only native build + tests | `native/` with `SIMULAGPU_ENABLE_CUDA=OFF` |
| CUDA isolated behind optional detection | D6, `native/CMakeLists.txt` |
| Lesson links docs↔visual↔code↔exercise↔Anki | `apps/docs/leccion/indice-global-suma-vectores.md`, checked by `tests/lesson-links.test.ts` |
| Attribution recorded | `docs/sources.md` |
| Spanish learner-facing content | language policy in `AGENTS.md` |
| Reference repos untouched | verified with `git status` in both, see final report |
| No backend / speculative framework | §5 |
