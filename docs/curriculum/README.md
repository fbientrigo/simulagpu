# Curriculum contract

This directory freezes the first SimulaGPU learning sequence without authoring
future lessons. The machine-readable source of truth is
[`manifest.ts`](./manifest.ts); structural tests in `tests/curriculum-contract.test.ts`
validate its order and references.

## First sequence

The first pass has two interleaved tracks:

```text
Clase 0 → Primitiva A → Clase 1 → Primitiva B → Clase 2 → Primitiva C →
Clase 3 → Primitiva D → Clase 4 → Primitiva E → Clase 5 → Primitiva F →
Clase 6 → Primitiva G → Clase 7
```

Numbered classes build mental models through explanation, interaction, checks,
and exercises. Alphabetical primitive modules isolate one CUDA operation or tool
for operational mastery and unlock the next class. A module is not considered
implemented merely because it has a title or a scaffold.

The manifest records, for each module:

- stable id, track, kind, frozen sequence position, and status;
- the central question or operational skill;
- prerequisite module ids and the next capability it unlocks;
- concepts in scope and concepts explicitly deferred;
- visual grammar and learner outcome;
- implementation references for existing material, or a scaffold path for planned material.

Implemented entries point at their current documentation route and repository
files. Planned entries deliberately have no public route or implementation
reference. Their engineering-facing skeletons live under `modules/` and are not
registered in VitePress navigation or the landing class selector.

## Dependencies

The intended waterfall dependencies are explicit in `prerequisites` and
`unlocks`, rather than inferred from filenames:

```text
Clase 2 → Primitiva C → Clase 3 → Primitiva D → Clase 4
Clase 4 → Primitiva E → Clase 5 → Primitiva F → Clase 6
Clase 6 → Primitiva G → Clase 7
```

The first line exposes the need for cooperation and block-local reusable
storage. The second line moves from reuse to conflicting outputs, then from
asynchronous transfers to stream organization and synchronization. These are
learning dependencies, not API completeness claims.

## Visual grammar contract

The representation serves the concept; no style is mandatory for its own sake.

1. Precise state uses the modular 2D grammar established by `ClaseCudaMalloc` and
   the cleaned mental-model components.
2. Restrained 2.5D/isometric views are allowed when depth communicates a
   structural relationship.
3. Clase 4 is the proving ground for a restrained 2.5D matrix/tile view.
4. Streams and asynchrony use timelines rather than forcing temporal behavior
   into cell layouts.
5. A visual model remains an explanatory model, not a CUDA executor, hardware
   simulator, or source of performance numbers.

## Reserved reference primitives

`Primitiva H — cudaFree`, `I — cudaMemset`, `J — cudaGetLastError`, and
`K — cudaEventRecord / elapsed-time measurement` are reserved in the manifest.
They follow the first A–G sequence as reference modules and are intentionally not
interleaved into the first learner progression.

## Publishing rule

Only entries with `status: implemented` may acquire a learner-facing route or be
added to normal public navigation. Future implementation should begin with the
relevant scaffold, then add a real vertical slice and update the manifest only
when its implementation references exist. This task does not create placeholder
quizzes, exercises, Anki cards, native programs, or lesson routes.
