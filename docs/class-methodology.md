# Interactive Primitive Engine Contract

Engineering contract and authoring guide for SimulaGPU interactive primitive
lessons.

`ClaseCudaMalloc.vue` (`packages/visuals/src/ClaseCudaMalloc.vue`) is the
reference implementation of the SimulaGPU interactive primitive engine. This
document freezes the behavioral, architectural, and visual contract for future
CUDA primitives without prematurely extracting a generic UI framework.

---

## 1. Engine Purpose and Mental Model

The interactive primitive engine is not a GPU simulator. It is a deterministic
explanatory system. It reproduces causal state transitions and arithmetic—nothing
more. It does not execute CUDA and says so explicitly on screen.

The default learner progression follows this causal sequence:

```
SEE → PREDICT → EXECUTE → EXPLAIN → QUIRK → CHECK → RETAIN
```

Each primitive lesson uses only the stages it genuinely requires, but the
causal sequence remains standard.

---

## 2. Model / Presentation Separation

Model truth and presentation state are strictly separated:

```
contracts → core → visuals → apps/docs
```

### Trusted Model Truth (`contracts` & `core`)

Pure, frozen, deterministic data structures:
- `before` state and `after` state snapshots;
- deterministic arithmetic (e.g. byte calculations, index mappings);
- allocation and initialization states;
- active / inactive / boundary classifications;
- explicit transition facts (`changed`, `didNotChange`, `why`).

*Rules:*
- Pure TypeScript, zero platform globals (`window`, `localStorage`, DOM, etc.).
- The same normalized configuration always yields a deeply equal snapshot.
- A visual replay or presentation step change never re-evaluates or alters model truth.

### Presentation State (`packages/visuals` & Vue components)

Transient or locally cached learner state:
- currently selected teaching step / frame (`before`, `action`, `after`);
- animation playback state and progress;
- learner prediction selections and submitted quiz answers;
- mini-review card flip/reveal states;
- local progress cache (`localStorage` via safe wrappers).

---

## 3. Primitive Lesson Anatomy

A standard primitive lesson is structured as follows:

```
Primitive lesson
├── identity
│   ├── primitive name
│   └── one-sentence learning goal
│
├── deterministic scene
│   ├── BEFORE
│   ├── ACTION
│   └── AFTER
│
├── explanation
│   ├── CHANGED
│   ├── DID NOT CHANGE
│   └── WHY
│
├── quirks (1–3 realistic pitfalls)
├── comprehension checks (2–4 quick self-tests)
└── short retention / Anki (3–5 focused cards)
```

### Mandatory Elements

For any state-changing primitive lesson:
1. **Explicit learner goal** — clear focus on one primitive and its central mental model.
2. **Model boundary disclaimer** — prominent notice stating what the visual model does *not* do (no CUDA execution, no hardware timing).
3. **Deterministic model truth** — tested pure snapshot representing the logical transition.
4. **Visible causal transition** — explicit BEFORE → ACTION → AFTER states.
5. **Causal explanation** — explicit list of what changed, what did NOT change, and why.
6. **Quirks** — 1 to 3 high-value failure modes or misconceptions (e.g. allocation failure, uninitialized memory, host pointer dereference).
7. **Short comprehension checks** — 2 to 4 interactive questions with immediate diagnostic feedback.
8. **Retention cards** — 3 to 5 permanent, downloadable Anki cards.

### Optional Elements

Use only when pedagogically meaningful:
- micro-animations (static transitions with replay/step controls suffice);
- separate BEFORE/AFTER cell grids (if the primitive has no host/device buffer state);
- interactive element-count switches (a fixed illustrative size is acceptable if sizing is irrelevant);
- multiple timeline frames.

Do not force meaningless UI uniformity where a primitive does not need it.

---

## 4. Visual Grammar and Semantic States

Visual styling is replaceable; semantic state is contract:

```
model truth  ──►  semantic state  ──►  visual presentation
 (contracts/core)      (CSS tokens/ARIA)      (colors, typography, layout)
```

### Semantic Vocabulary

Every memory cell, pointer, or execution block maps to one of these semantic states:

| Semantic State | Meaning | Accessibility Requirement |
| --- | --- | --- |
| `host` | Host (CPU / RAM) memory region | Labeled text / distinct border |
| `device` | Device (GPU / VRAM) memory region | Labeled text / distinct border |
| `valid` | Initialized, valid data element | Value displayed (e.g. `1.0`, `4.0`) |
| `empty` / `inactive` | Unused, unallocated, or thread inactive | Dashed border, null symbol (`∅` or empty) |
| `undefined` | Allocated but uninitialized memory | Question mark symbol (`?`) + distinct token |
| `changing` | Active target of current operation | Highlight token + pulse / transition indicator |
| `selected` | User-focused element | High-contrast outline / focus ring |
| `invalid` | Error, dangling pointer, out-of-bounds | Danger token + badge / warning icon |

### Fundamental Visual Invariants

1. **Color is never the sole indicator:** Every state must also provide an explicit label, symbol (`?`, `∅`, `0x...`), border pattern, or ARIA label.
2. **Index vs. Value:** The element index (`[0]`, `[1]`) and the stored content (`3.14`, `?`) are visually distinct concepts and must never be conflated.
3. **Stable index order:** Memory cells preserve stable, monotonic index order:
   ```
   Initialized: [0] -> 3.0   [1] -> 1.0   [2] -> 4.0   [3] -> 2.0
   Undefined:   [0] -> ?     [1] -> ?     [2] -> ?     [3] -> ?
   ```
4. **Visual theme replacement:** Backgrounds, corner radii, shadows, typography, and color palettes can be restyled globally in `packages/theme/src/tokens.css` without breaking semantic contracts ("visual theme is replaceable; semantic state is contract").

---

## 5. Composition and Abstraction Rules

Future primitives will introduce concepts such as host memory, device memory, pointer state, thread grids, index arithmetic, host-device transfers, synchronization barriers, shared memory, and reduction trees.

### Premature Abstraction Prohibited

- **Do not** build a generic primitive framework or universal schema from `cudaMalloc`.
- Shared abstractions may only be extracted when a **second real primitive** demonstrates genuine, verified duplication.

### Extraction Protocol for Primitive #2

When implementing the next primitive (e.g. `cudaMemcpy`):
1. Build the new primitive end-to-end with local components and models.
2. Side-by-side compare the two working implementations.
3. Identify identical, repeated structures (e.g. memory cell row, check question widget, mini-Anki runner).
4. Extract only those exact repeated pieces into shared `visuals` components.
5. Keep primitive-specific layouts and transition logic strictly local.

---

## 6. Protected Invariants

Anyone modifying or extending the interactive engine must uphold these invariants:

### Model Invariants
- Same normalized configuration produces deeply equal model snapshots (`assert.deepEqual`).
- Zero clocks, `Math.random()`, I/O, or browser APIs in `contracts` and `core`.
- Model truth is independent of presentation step or frame.
- Visual components never mutate snapshots (snapshots are frozen via `Object.freeze`).
- Browser APIs never enter `packages/contracts` or `packages/core`.

### Pedagogical Invariants
- Animation must never contradict static state.
- Changing presentation settings cannot alter computed truth.
- Never fake CUDA execution or hardware timing.
- No performance numbers without measurement on the printing machine.
- Index and value are distinct.
- `inactive`, `undefined`, and `empty` are distinct semantic states.
- *"Did not change"* is a first-class teaching outcome.

### UI & Accessibility Invariants
- Primary path functions down to ~360 px viewport width without horizontal page scroll.
- Zero hover-required interactions (all essential info reachable via touch/click/keyboard).
- State never relies on color alone.
- All interactive controls are keyboard navigable with visible focus styles and touch targets ≥ 44 px.
- `prefers-reduced-motion` eliminates animations while preserving full causal state transitions.
- A single conceptual layer should normally present at most 8 individual items (e.g. `1, 2, 4, 8` element counts).

### Persistence Invariants
- Local learner state is non-authoritative convenience cache only.
- Storage failure (quota exceeded, disabled storage, corrupt JSON) falls back gracefully to in-memory state and never breaks or halts the lesson.
- No backend, authentication, user accounts, or analytics required.
- Stored under versioned key (e.g. `simulagpu:v1:learner`).
- Local reset clears only the versioned application key, never unrelated browser keys.

---

## 7. Future Visual Improvements

The visual presentation layer can be restyled provided the separation chain is preserved:

```
model truth (frozen)  ──►  semantic state (stable)  ──►  visual styling (flexible)
```

**Allowed to change:**
- CSS tokens, color palettes, surface treatments, shadows, borders;
- typography, line heights, font scales;
- layout grid / flex alignments;
- transition curves, animation timing;
- responsive element geometry.

**Forbidden to change without pedagogical review:**
- semantic state meanings or active/inactive indicators;
- index ordering and element counts;
- computed truth values;
- causal before/action/after explanations;
- accessibility labels and screen reader cues;
- completion criteria for comprehension checks.

---

## 8. Authoring Recipe for Future Primitives

When creating a new primitive lesson:

1. **State the misconception or prediction question** (e.g. "Does `cudaMalloc` initialize memory?").
2. **Define minimal model truth** in `packages/contracts/src/<primitive>.ts` and `packages/core/src/<primitive>/`.
3. **Define BEFORE / ACTION / AFTER if meaningful**, with explicit `changed`, `didNotChange`, and `why` facts.
4. **Define CHANGED / DID NOT CHANGE / WHY** in model output.
5. **Add only 1 to 3 quirks** representing real failure modes or pitfalls.
6. **Choose the smallest useful 1/2/4/8 scene** for clear mental modeling.
7. **Implement primitive-specific UI** in `packages/visuals/src/Clase<Primitive>.vue` using semantic CSS tokens.
8. **Add 2 to 4 checks** with instant diagnostic feedback.
9. **Add 3 to 5 retention cards** in `anki/cards/` with unique, permanent IDs.
10. **Add local progress only where useful** via safe `localStorage` cache.
11. **Test model truth before presentation** (determinism, boundaries, immutability, JSON/URL round trip).
12. **Validate mobile + reduced motion** (~360 px viewport, no hover dependency).
13. **Compare with previous primitives before extracting shared components.**

### What NOT to do:
- ❌ No giant monolithic lesson component.
- ❌ No CUDA simulator or fake hardware runtime.
- ❌ No generic primitive schema covering every future concept prematurely.
- ❌ No animation framework or heavy state machine library.
- ❌ No global store (Pinia/Vuex).
- ❌ No abstraction based only on anticipated reuse.
