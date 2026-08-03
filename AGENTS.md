# AGENTS.md

Working agreement for anyone — human or agent — changing this repository.

Written in English: this is engineering material. **Learner-facing content is
Spanish.** See [Language policy](#language-policy).

---

## Repository purpose

SimulaGPU teaches GPU and parallel programming in Spanish through five things
that always ship together:

1. documentation that explains a concept;
2. a deterministic interactive visualization of that concept;
3. runnable C++ and CUDA code;
4. a progressive exercise with tests that tell the student when they are done;
5. Anki cards for retention.

A lesson missing any of the five is not a lesson. It is a draft.

Two claims this repository makes and must keep:

- **A visualization is an explanatory model, never a simulator.** It reproduces
  arithmetic — which thread handles which element — and nothing else. It does
  not execute CUDA and says so on screen.
- **Nothing is published as a performance number unless it was measured on the
  machine that printed it.**

---

## Architecture boundaries

Full detail in [`docs/architecture.md`](docs/architecture.md). The rules that
get broken most often:

### Web

```
contracts → core → visuals → apps/docs → static build
```

1. `packages/core` and `packages/contracts` import **no** Vue, VitePress, DOM,
   or platform global — including `URLSearchParams`. Check a file's imports;
   the rule is mechanically verifiable.
2. Visualizations never mutate a snapshot. Snapshots are frozen, so an attempt
   throws.
3. The same config always produces a deeply equal snapshot. No clocks, no
   randomness, no I/O in `core`.
4. Presentation stages change what is **shown**, never what is **computed**. A
   view concern (zoom, tab, theme) never enters a config or a snapshot.
5. Snapshots are immutable and JSON-serializable. No `Map`, `Set`, `Date`,
   functions or `undefined`; an absent value is `null`.
6. **No global store** until a second component on the same page needs shared
   state.
7. **No abstraction until two real cases require it.** One visualization does
   not justify a visualization framework.

### Native

```
common → examples → exercises → tests
```

1. Every CUDA exercise has a correct CPU oracle.
2. Correctness before performance, always.
3. The CPU-only configuration builds and tests with **no CUDA installed**.
4. CUDA is optional and detected — never assumed. See
   [ADR-0002](docs/adr/0002-optional-cuda-detection.md).
5. CI never needs GPU hardware.
6. Timing separates kernel execution from host↔device transfers, in separate
   columns.
7. CUDA errors are reported with file, line and call, and stop the program. See
   [ADR-0003](docs/adr/0003-cuda-error-handling.md).
8. `native/` has **zero** third-party dependencies. Configure must work
   offline. See [ADR-0004](docs/adr/0004-no-test-framework-dependency.md).

### Deliberately absent

Do not add, in v0.1 or without an ADR: a backend, a database, authentication,
Docker, Pyodide, a CMS, a plugin system, i18n infrastructure, a generic
visualization framework, a generic CUDA abstraction layer, a global store, or
any deployment target other than static GitHub Pages.

This is not a backlog. Each item has a named trigger in
[`docs/roadmap.md`](docs/roadmap.md); until the trigger fires, adding it is a
regression.

---

## Language policy

**Spanish — learner-facing.** Everything a student reads:

- lesson content and headings under `apps/docs/`;
- explanations, exercise statements, success criteria, hints;
- exercise `README.md` files under `native/exercises/`;
- TODO comments in starter code;
- UI labels, `aria-label`s and screen-reader text in `packages/visuals`;
- program output meant for students (the example's tables and messages);
- Anki cards;
- error explanations a student will see.

Use real Spanish, with accents. `índice`, not `indice`.

**English — engineering-facing.** Everything a maintainer reads:

- code identifiers and source comments;
- this file, `docs/*.md`, ADRs;
- CMake and CI configuration;
- commit messages and PR descriptions.

**Mixed by design.** `native/exercises/*/starter/src/*.cpp` has English
identifiers and Spanish TODO text. That is correct: the API is code, the
instructions are content.

No i18n infrastructure. Spanish is written directly into the content.

---

## Commands

| Command | What it does |
| --- | --- |
| `pnpm install` | install workspace dependencies |
| `pnpm dev` | build the Anki TSV, then serve the docs site |
| `pnpm build` | build the Anki TSV, then build the static site |
| `pnpm test` | Vitest — models and visualizations |
| `pnpm typecheck` | `vue-tsc` in strict mode, packages and docs app |
| `pnpm lint` | ESLint + Prettier in check mode |
| `pnpm format` | apply Prettier |
| `pnpm anki:build` | regenerate the Anki TSV |
| `pnpm verify` | **everything**, including the native build and CTest |

Native equivalents:

```bash
# CPU-only (CUDA detected and skipped if absent)
cmake -S native -B native/build -G Ninja -DCMAKE_BUILD_TYPE=RelWithDebInfo
cmake --build native/build
ctest --test-dir native/build --output-on-failure

# Require CUDA — configure fails if nvcc is missing
cmake -S native -B native/build-cuda -G Ninja -DSIMULAGPU_CUDA=ON

# Forbid CUDA even when nvcc is present
cmake -S native -B native/build-cpu -G Ninja -DSIMULAGPU_CUDA=OFF

# Sanitizers
cmake -S native -B native/build-asan -G Ninja \
  -DCMAKE_BUILD_TYPE=Debug -DSIMULAGPU_ENABLE_SANITIZERS=ON
```

`pnpm verify` is what CI runs. Run it before opening a pull request.

---

## Definition of done

A change is done when **all** of these hold:

- [ ] `pnpm verify` passes.
- [ ] New learner-facing text is Spanish, with correct accents.
- [ ] New engineering text is English.
- [ ] Any new teaching model is pure, frozen, JSON-serializable, and has unit
      tests covering determinism and boundary values.
- [ ] Any new native code has a CPU-testable core, and CTest covers it.
- [ ] Any borrowed concept is recorded in [`docs/sources.md`](docs/sources.md).
- [ ] No generated file was committed.
- [ ] No new dependency was added without a line in the PR explaining why the
      alternative was worse.
- [ ] No claim about CUDA compilation or GPU performance that was not actually
      executed.
- [ ] No reference repository was modified.

For a **new lesson**, additionally:

- [ ] documentation, visualization, native code, exercise and Anki cards all
      exist and link to each other;
- [ ] `tests/lesson-links.test.ts` covers the new lesson's links;
- [ ] the exercise has starter, solution, and a shared test file;
- [ ] the visualization states what it does not model.

---

## Consulting the reference repositories

`26-GPU-PROGRAMMING` and `csc2026_e1` are **read-only reference material**.

**Never**: modify them, format them, commit to them, create files in them, or
run a tool that writes inside them. Do not browse unrelated sibling
repositories.

**Read them to answer**: which concepts a lesson should cover, in what order;
what CUDA terminology to use; what mistakes students actually make; what later
topics this foundation must stay compatible with; what pedagogical structure
works.

**Check the licence before adapting anything.**

| Repository | Licence | Copying |
| --- | --- | --- |
| `26-GPU-PROGRAMMING` | **GPL-3.0** | No — copyleft would propagate |
| `csc2026_e1` | **No LICENSE** → all rights reserved | No — no grant exists |

### No bulk copying

Prohibited without exception:

- copying source files, in whole or in part;
- copying directory trees;
- copying slides, PDFs, images, or any binary;
- copying generated output (plots, ROOT files, build artefacts);
- transcribing a file and renaming the identifiers.

Required instead: understand the concept, close the file, write the example from
first principles, and record what you took in `docs/sources.md` — source
repository, source path, what was reused, whether it was rewritten or adapted,
and the licence note.

If an implementation ends up looking like the reference because there is only
one sensible way to write it, say so explicitly in the sources entry.

---

## Exercise authoring contract

Every exercise under `native/exercises/`:

```
NN-name/
├── README.md      objectives, TODO table, commands, success criteria, common mistakes
├── starter/       standalone CMake project — compiles, runs, wrong answers
├── solution/      reference implementation, same public headers as starter
└── tests/         ONE test file, compiled against both
```

Rules:

1. **The starter compiles and runs.** It gives wrong answers. It does not have
   missing files, empty function bodies that fail to link, or `#error`.
2. **TODOs are focused.** Each one is a specific mistake at a specific line with
   a comment explaining what currently goes wrong and why it matters. Never
   "implement this function".
3. **A meaningful part must be verifiable without a GPU.** Extract the
   host-testable arithmetic into plain functions. If a student with no GPU
   cannot get green tests for the core idea, redesign the exercise.
4. **Starter and solution share one test file.** Success criterion:
   `ctest` passes without editing the tests.
5. **Only the solution is registered with the repository's CTest.** The starter
   is red by design and stays out of CI.
6. **The starter is its own CMake project**, so a student can build and break it
   in isolation.
7. **The `README.md` lists the mistakes students actually make**, in Spanish,
   phrased as symptoms — "works with n = 1024, fails with n = 1000" — not as
   abstractions.
8. **The solution is separate and clearly labelled**, with its own comments
   explaining the reasoning, not just the answer.

---

## Testing requirements

### Web

Unit tests live next to the code (`*.test.ts`); cross-cutting tests live in
`tests/`.

Every teaching model must have tests for:

- **determinism** — the same config yields a deeply equal snapshot;
- **serialization** — the snapshot survives a JSON round trip;
- **immutability** — every level is frozen;
- **normalization** — junk input yields a valid config; normalization is
  idempotent;
- **URL round trip** — `decode(encode(c))` equals `c`;
- **boundary values** — the smallest case, the exact-fit case, one past the
  exact fit, and the largest supported case;
- **the presentation-stage rule** — no view state in the snapshot, and
  switching stages changes no rendered value.

Component tests assert what the learner sees: rendered numbers, active and
inactive counts, accessibility labels.

### Native

- Every public function in `native/common` has a CTest case.
- Boundary sizes are mandatory: `n = 1`, `n < block_size`, `n == block_size`,
  `n == block_size + 1`, an `n` that is not a multiple, and a large `n`.
- Verification helpers are tested against a **known-wrong** input. A comparison
  that always passes is worse than no comparison.
- NaN is tested explicitly — `nan > tolerance` is `false`, so a naive comparison
  accepts corrupt data.
- Everything runs on CPU. No test requires a device.

### Anki

- The build is deterministic; two runs produce identical bytes.
- Sources are validated against `anki/schema/card.schema.json`.
- Card ids are unique and permanent — never renumbered, never reused.

---

## Things that will get a change rejected

- A performance number that was not measured on the machine that printed it.
- A visualization that implies it executes CUDA or models hardware.
- A generalization introduced for one call site.
- A dependency added to `native/`.
- A generated file committed to Git.
- Learner-facing text in English, or Spanish without accents.
- A CUDA claim that was never compiled or run.
- Any modification inside a reference repository.
