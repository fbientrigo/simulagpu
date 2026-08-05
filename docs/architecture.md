# Architecture

Engineering document (English). The learner-facing summary is at
[`apps/docs/referencia/arquitectura.md`](../apps/docs/referencia/arquitectura.md).

SimulaGPU is a static educational site plus a native code tree. They share
concepts and lesson structure; they share no code and no build system. Neither
can break the other.

---

## 1. Web layer

### 1.1 Dependency direction

```
packages/contracts        zero-dependency TypeScript types and limits
        ↓
packages/core             pure deterministic teaching models
        ↓                 (produces immutable, serializable snapshots)
packages/visuals          Vue components that render snapshots
        ↓
apps/docs                 VitePress application, lesson content
        ↓
static build              GitHub Pages
```

`packages/theme` is a leaf: it exports CSS custom properties and imports
nothing.

The arrow is one-way and enforced by the package manifests — `contracts` has no
dependencies, `core` depends only on `contracts`, `visuals` depends on
`contracts`, `core` and `theme`, and only `apps/docs` knows VitePress exists.

### 1.2 Hard rules

1. **Teaching models import no Vue, no VitePress, no browser globals, no DOM.**
   `packages/core` runs unchanged in Node, in a test, and in a browser. This is
   why URL serialization in `packages/core/src/thread-index/serialize.ts` is
   written with plain string operations instead of `URLSearchParams`: the class
   is a platform global, and depending on one would make the model's
   portability accidental rather than structural.

2. **Visualizations never mutate model state.** A control produces a new
   config, which produces a new snapshot. Snapshots are frozen, so a violation
   throws in development instead of silently corrupting the model.

3. **A configuration reproduces the same snapshot deterministically.** No
   clocks, no randomness, no I/O in `packages/core`. Directly tested:
   `buildThreadIndexSnapshot(config)` is compared against itself for deep
   equality, and a config round-tripped through the URL rebuilds an identical
   snapshot.

4. **Presentation stages change what is shown, never what is computed.** The
   explorer's `vista` (`estructura` / `indices` / `memoria`), its mode
   (`guiado` / `libre`), the step it is on and the checkpoints answered so far
   all live in the Vue component. None of them appears in `ThreadIndexConfig`,
   `ThreadIndexSnapshot`, `GuidedTour` or the URL. Tests enforce this from both
   sides: the model tests assert no view-related property leaks into a snapshot
   or a tour, and the component test switches stages and asserts every rendered
   number is unchanged.

5. **Snapshots are immutable and JSON-serializable.** `Object.freeze` at every
   level; `JSON.parse(JSON.stringify(snapshot))` deep-equals the original. No
   `Map`, no `Set`, no `Date`, no functions, no `undefined` — an absent value is
   `null` (see `ThreadSnapshot.element`).

6. **No global store.** There is one visualization on one page. A store solves
   cross-component state sharing, which does not exist yet. When a second real
   case appears, revisit.

7. **No abstraction before two real cases.** There is no `<Visualization>` base
   component, no plugin registry, no generic "simulation" interface. The
   explorer is a component that renders one specific model.

### 1.3 The deterministic visualization model

The v0.1 model answers one question: *given `n` and a block size, which thread
handles which element?*

```
ThreadIndexConfigInput   untrusted: URL query, props
        │ normalizeThreadIndexConfig   total, idempotent, clamps into range
        ▼
ThreadIndexConfig        frozen, four integers
        │ buildThreadIndexSnapshot     pure
        ▼
ThreadIndexSnapshot      frozen, JSON-serializable, everything the view needs
```

Normalization is **total**: every input, including junk, yields a valid config.
The explorer therefore has no error state — an unparseable URL silently becomes
the default rather than a broken page. It is also **idempotent**, which is what
makes `decode(encode(c)) === c` hold for every normalized `c`.

The snapshot carries the substituted formula strings
(`i = 3 * 32 + 5`, `gridDim.x = (100 + 32 - 1) / 32`) rather than leaving the
view to build them. The model owns arithmetic *and* how that arithmetic is
narrated; the view owns layout.

**What the model is not.** It is an explanatory model of work distribution. It
does not execute CUDA, does not model warps, scheduling, memory hierarchy,
occupancy or timing, and claims none of those. The component says so on screen,
and the lesson repeats it. This constraint is not a limitation to be lifted
later: a visualization that looks like a simulator but is not one teaches
confidently wrong intuitions.

The `maxRenderedBlocks` limit is a rendering budget, not a model limit. The
snapshot always contains every block; the component draws the first 64 and says
how many it left out.

### 1.3.1 The guided walkthrough

```
ThreadIndexSnapshot
        │ buildGuidedTour     pure, frozen, JSON-serializable
        ▼
GuidedTour               six steps, each with its numbers already substituted
```

The walkthrough is the default experience of the explorer, and its **content**
is model output, not view code: `packages/core/src/thread-index/guided.ts` turns
a snapshot into the six steps a learner reads — the problem, `gridDim.x`, which
thread we are, the global index, the guard, the element — plus four checkpoints
whose questions, options and feedback are all derived from the same snapshot.
A checkpoint's distractors are the mistakes students actually make (floor
division instead of ceiling; `blockIdx.x + threadIdx.x`; forgetting to add
`threadIdx.x`), so a wrong answer can be answered with a reason rather than a
buzzer.

This is a second module, not a generalization: there is no tour framework, no
step registry, no reusable quiz engine. It builds one specific walkthrough for
one specific model.

Two boundaries keep it on the right side of rule 4:

- **Content is computed; progress is not.** Which step is on screen and which
  checkpoints have been answered live in the component, exactly like `vista`.
  `GuidedTour` has no notion of "current".
- **The component owns disclosure, the model owns truth.** The walkthrough
  reveals a fact only once the learner has met the step that introduces it —
  the grid does not display global indices while the learner is being asked to
  compute one. That is a rendering decision; every number it eventually shows
  still comes from the snapshot, unchanged.

Because every number a checkpoint depends on is written into its question text,
the component keys answers by question rather than by checkpoint id. Changing
`n` retires the answer about `gridDim.x`; selecting a different thread does not.

### 1.4 URL state

The explorer's state serializes to `?n=100&bs=32&b=3&t=5`. Keys are short and
frozen: once a lesson or a lecturer's slide links to one of these URLs, it must
keep resolving. The mode and the current step are deliberately *not* in there:
they are how someone is looking at the model, not which model they are looking
at, and rule 4 keeps them out.

An empty query is the one case where the component does not use
`DEFAULT_THREAD_INDEX_CONFIG`: with nothing to restore it starts the walkthrough
on `GUIDED_THREAD_INDEX_CONFIG` (`n = 10`, `blockDim.x = 4`), which is twelve
threads across three blocks — small enough to read whole on a phone, and already
short by two. The default config stays what an empty or unparseable query
*decodes* to, so the URL contract is unchanged.

Encoding and decoding live in `packages/core`. Reading and writing
`window.location` lives in the Vue component — the only place in the web layer
that touches a browser global, guarded with `typeof window === 'undefined'` so
that VitePress's SSR pass renders the component server-side.

---

## 2. Native layer

### 2.1 Dependency direction

```
native/common        launch math, CPU oracle, timing, CUDA checks, test helper
        ↓
native/examples      runnable worked examples
        ↓
native/exercises     starter + solution + shared tests
        ↓
CTest
```

### 2.2 Hard rules

1. **Every CUDA exercise has a correct CPU oracle.** `simulagpu::vector_add` is
   the reference every GPU result is compared against.
2. **Correctness tests come before performance comparisons.** `ctest` validates
   results; no benchmark harness exists in v0.1, and no performance number is
   published.
3. **The CPU-only configuration builds without CUDA installed.** Verified on
   every change: v0.1 was authored on a machine with no `nvcc`.
4. **CUDA support is optional and detected cleanly.** See §2.3.
5. **CI needs no GPU.** Everything CI runs is CPU-only.
6. **Timing distinguishes kernel execution from host↔device transfers.** CUDA
   events measure the kernel; a second pair of events wraps allocation,
   transfers and free. They are printed in separate columns.
7. **CUDA errors are reported, not swallowed.** See
   [ADR-0003](adr/0003-cuda-error-handling.md).

### 2.3 CPU / CUDA portability policy

`native/CMakeLists.txt` declares `project(... LANGUAGES CXX)` — CUDA is
deliberately *not* in that list. A tri-state cache variable controls what
happens next:

| `SIMULAGPU_CUDA` | Behaviour |
| --- | --- |
| `AUTO` (default) | `check_language(CUDA)`; enable it if found, otherwise print a status line and continue CPU-only |
| `ON` | require it; `FATAL_ERROR` if `nvcc` is missing |
| `OFF` | never enable it, even if `nvcc` is installed |

The result is exposed as the internal flag `SIMULAGPU_WITH_CUDA`, which is the
only thing the rest of the tree reads.

The consequences are structural, not conventional:

- **No `.cu` file is added to any target unless CUDA is on.** A CPU-only build
  never asks `nvcc` to exist.
- **No CUDA header is reachable from a CPU-only translation unit.**
  `cuda_check.cuh` is included only from `.cu` files.
- **Host code that needs the GPU is behind `#if defined(SIMULAGPU_WITH_CUDA)`,**
  and that define is set by CMake on the target, not by hand.
- **The host-side interface of a CUDA implementation is plain C++.**
  `native/examples/vector-add/vector_add_cuda.hpp` mentions no CUDA type, so
  `main.cpp` compiles with an ordinary compiler.
- **Index arithmetic is host code.** `native/common/include/simulagpu/launch.hpp`
  holds `ceil_div`, `grid_size`, `global_index` and `is_active` as `constexpr`
  functions with no CUDA dependency. This is what makes the core of the
  exercise unit-testable without hardware, and it is the single most important
  structural decision in the native tree.

There is deliberately **no generic CUDA abstraction layer** — no RAII device
buffer, no kernel-launch helper. One kernel does not justify one, and a wrapper
would hide exactly the API calls the lesson is teaching.

### 2.4 Exercise contract

```
native/exercises/01-vector-add/
├── README.md      objectives, TODO table, commands, success criteria, common mistakes
├── starter/       standalone CMake project — compiles, runs, gives wrong answers
├── solution/      reference implementation, same public headers
└── tests/         ONE test file, compiled against both
```

The shared test file is the mechanism: the starter's CMake project builds
`../tests/test_index_math.cpp` against the student's `include/`, and the
repository build compiles the same file against `solution/include/`. "Make the
tests pass" is therefore a literal, checkable goal, and the reference solution
cannot drift away from what the student is asked to do.

Only the solution is registered with the repository's CTest. The starter is red
on purpose, so it stays outside CI.

### 2.5 Testing

No test framework. `native/common/include/simulagpu/test_assert.hpp` is a
~60-line header providing `SIMULAGPU_CHECK` and a `Suite` that returns 0 or 1.
Rationale in [ADR-0004](adr/0004-no-test-framework-dependency.md); the short
version is that `cmake -B build && ctest` must work with no network, no package
manager and no GPU.

---

## 3. Content and attribution policy

- **Learner-facing content is Spanish.** Documentation, headings, exercises,
  interface labels, accessibility labels, Anki cards, and error messages meant
  for students.
- **Engineering material may be English.** Code identifiers, source comments,
  `AGENTS.md`, ADRs, this file, CI configuration, commit messages.
- **No i18n infrastructure.** Spanish is written directly into the content.
  Adding a translation framework before a second language exists would be
  ceremony.
- **Every borrowed concept is recorded in [`docs/sources.md`](sources.md)** with
  its source repository, source path, what was reused, whether it was rewritten
  or adapted, and its license.
- **No bulk copying.** Reference repository licenses were checked before any
  adaptation: `26-GPU-PROGRAMMING` is GPL-3.0, `csc2026_e1` has no license at
  all. Nothing was copied from either. Small examples are rewritten from first
  principles.
- **No unsupported performance claims.** If it was not measured on the machine
  producing the output, it is not published as a number.

### 3.1 Generated content

The Anki TSV is generated from `anki/cards/*.yaml` into
`apps/docs/public/descargas/` and is git-ignored. `pnpm dev` and `pnpm build`
generate it first; CI regenerates it. Committing it would mean reviewing a
generated diff on every card edit.

Generation is deterministic — sorted by card id, no timestamps, LF only — so
`node anki/scripts/build-anki.mjs --check` can verify a published file is
current.

---

## 4. Deferred

Not in v0.1, and each one needs a concrete justification before it arrives:

| Deferred | Why it is not here |
| --- | --- |
| Backend, database, authentication | The site is static. Nothing needs a server. |
| Docker, devcontainer | `cmake` and `pnpm` are enough; a container image is a maintenance burden without a second toolchain to pin. |
| Pyodide, in-browser execution | The visualization is an explanatory model, not an execution environment. |
| CMS | Content is Markdown in the repository, reviewed like code. |
| Plugin system | Nothing needs to be extended by a third party. |
| i18n infrastructure | One language. |
| Generic visualization framework | One visualization. Rule 7. |
| Generic CUDA abstraction layer | One kernel. Rule 7, and it would hide the API being taught. |
| Global store | One page of state. Rule 6. |
| Benchmark harness | Correctness first. No performance claims to support yet. |
| Anki `.apkg` | The TSV covers the use case with no dependency and no binary in Git. |
| CUDA compile job in CI | No GPU runner. Documented as a future optional job; must not gate v0.1. |
| Deployment other than GitHub Pages | Static output, one target. |
