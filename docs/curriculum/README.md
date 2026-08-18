# Curriculum contract

This directory freezes the first SimulaGPU learning sequence without authoring
future lessons. The machine-readable source of truth is
[`manifest.ts`](./manifest.ts); structural tests in `tests/` validate its order,
dependencies, and references.

## First sequence

The first pass has two interleaved tracks:

```text
Clase 0 → Primitiva A → Clase 1 → Primitiva B → Clase 2 → Primitiva C →
Clase 3 → Primitiva D → Clase 4 → Primitiva E → Clase 5 → Primitiva F →
Clase 6 → Primitiva G → Clase 7
```

Numbered classes build useful mental models through explanation, interaction,
checks, exercises, and retention. Alphabetical primitive modules isolate one
CUDA operation or tool for operational mastery.

A module is not considered implemented merely because it has a title or a
scaffold.

## Waterfall contract

The curriculum is a strict learning waterfall:

```text
Clase N
→ closes a useful problem

Primitiva N+1
→ introduces one new operational tool

Clase N+1
→ applies that tool to a richer problem
```

Three rules follow.

1. **Every numbered class is stop-safe.** A learner may leave the course after
   any class and still keep a complete, useful, and technically correct mental
   model. A class may open the next question, but it must not require a later
   primitive to make its own central lesson correct.
2. **Primitives do not get taught early.** The preceding class may expose the
   need for the next tool, but the primitive module is where its operational
   semantics are acquired.
3. **`unlocks` means the immediate next module.** A class unlocks the next
   primitive; that primitive unlocks the next class. The manifest must not skip
   over a required primitive and claim that the prior class already unlocks the
   following class.

For example:

```text
Clase 2 — reducción por pasadas
→ pregunta abierta: ¿cómo separar fases cooperativas dentro de un bloque?

Primitiva C — __syncthreads()
→ aprende la barrera y su alcance de bloque

Clase 3 — cooperación, memoria y patrones de acceso
→ aplica la barrera, compara accesos y detecta oportunidades de reutilización

Primitiva D — __shared__
→ aprende dónde puede almacenar el bloque datos reutilizables

Clase 4 — tiled matrix multiplication
→ integra sincronización + almacenamiento compartido + reuse
```

This keeps each class independently valuable while making each new primitive
expand the space of algorithms that later classes can teach.

## Primitive budget

The first frozen waterfall currently uses **seven main primitives, A–G**.

SimulaGPU keeps a budget of at most **eight major primitive slots** for this
fundamental progression. The eighth slot is intentionally uncommitted until a
later class demonstrates that it unlocks enough new teaching value to justify
promotion into the main sequence.

Reference modules H–K do **not** automatically consume that remaining main
slot. They are useful operational references, not chronological dependencies.

This prevents API completeness from becoming curriculum design.

## Dependencies

The intended dependency chain is explicit in `prerequisites` and `unlocks`:

```text
Clase 0 → A → Clase 1 → B → Clase 2 → C → Clase 3 → D → Clase 4
→ E → Clase 5 → F → Clase 6 → G → Clase 7
```

Each numbered class may reuse everything learned earlier, but its immediate new
dependency is the primitive immediately before it.

The manifest records, for each module:

- stable id, track, kind, frozen sequence position, and status;
- central question or operational skill;
- prerequisite module ids and the immediate next capability it unlocks;
- concepts in scope and concepts explicitly deferred;
- visual grammar and learner outcome;
- implementation references for existing material, or a scaffold path for
  planned material.

Implemented entries point at their current documentation route and repository
files. Planned entries deliberately have no public route or implementation
reference. Their engineering-facing skeletons live under `modules/` and are not
registered in VitePress navigation or the landing class selector.

## Class 2 → Primitive C → Class 3 → Primitive D boundary

This boundary is deliberately narrow.

### Clase 2 — Reducción paralela

Closes the model:

```text
N values
→ disjoint pairwise passes
→ shrinking intermediate arrays
→ one result
```

It may expose the need to coordinate future cooperative phases, but it does not
teach `__syncthreads()`, `__shared__`, or atomics operationally.

### Primitiva C — `__syncthreads()`

Owns the barrier model:

```text
arrive
→ wait for this block
→ all required threads arrive
→ release
```

It also owns block-local scope and invalid divergent participation.

### Clase 3 — Cooperación, memoria y patrones de acceso

Applies Primitive C to answer a broader question:

```text
thread → address → value → dependency → reuse opportunity
```

It teaches dependencies, contiguous versus strided access, and repeated-read
reuse opportunities. It may motivate block-local reusable storage, but it does
not teach `__shared__` syntax or operational semantics.

### Primitiva D — `__shared__`

Owns block-local reusable storage: allocation/scope, staging, reuse, and its
interaction with synchronization.

This boundary prevents Clase 2 from stealing Primitive C and prevents Clase 3
from stealing Primitive D.

## Visual grammar contract

The representation serves the concept; no style is mandatory for its own sake.

1. Precise state uses the modular 2D grammar established by `ClaseCudaMalloc`
   and the cleaned mental-model components.
2. Restrained 2.5D/isometric views are allowed only when depth communicates a
   structural relationship.
3. Clase 4 is the first-course proving ground for restrained 2.5D because matrix
   planes and tiles benefit from structural depth.
4. Streams and asynchrony use timelines rather than forcing temporal behavior
   into cell layouts.
5. A visual model remains an explanatory model, not a CUDA executor, hardware
   simulator, or source of performance numbers.

## Reserved reference primitives

`Primitiva H — cudaFree`, `I — cudaMemset`, `J — cudaGetLastError`, and
`K — cudaEventRecord / elapsed-time measurement` are reserved in the manifest.

They remain outside the A–G learner waterfall unless a future curriculum review
explicitly promotes one of them into the remaining major-primitive slot.

## Publishing rule

Only entries with `status: implemented` may acquire a learner-facing route or be
added to normal public navigation. Future implementation should begin with the
relevant scaffold, then add a real vertical slice and update the manifest only
when its implementation references exist.

A planned scaffold or pedagogical source is not a published lesson.
