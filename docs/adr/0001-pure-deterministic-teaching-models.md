# ADR-0001 — Teaching models are pure functions over frozen data

Status: Accepted
Date: 2026-08-03

## Context

SimulaGPU's visualizations exist to make a mental model checkable. That only
works if the visualization is itself trustworthy: if what it draws depends on
render order, on a stale reactive reference, or on the sequence of clicks that
got you there, it is teaching noise.

Three concrete needs:

- a lesson or a lecturer must be able to link to an exact configuration and get
  exactly that picture back;
- the arithmetic behind the picture must be unit-testable without a browser;
- a reviewer must be able to tell, by looking at a file's imports, whether it
  can affect what is computed.

The natural Vue instinct — reactive state in the component, computed properties
deriving the view — fails all three at once.

## Decision

Teaching models are pure functions from a configuration to a frozen snapshot,
in `packages/core`, and they import nothing from Vue, VitePress, the DOM, or any
platform global.

Concretely:

- `normalizeThreadIndexConfig(input) -> ThreadIndexConfig` — total and
  idempotent; any input yields a valid frozen config.
- `buildThreadIndexSnapshot(config) -> ThreadIndexSnapshot` — pure; no clock, no
  randomness, no I/O; deeply frozen; JSON-serializable.
- `encode` / `decode` — plain string operations, not `URLSearchParams`.

Components hold a `ref` to the *config* and derive the snapshot with `computed`.
They never write to a snapshot.

## Consequences

**Easy**

- Determinism is a one-line test: `build(c)` deep-equals `build(c)`.
- URL sharing works by construction, because the config is the whole input.
- The model runs in Node, so tests need no DOM environment and run in
  milliseconds.
- `Object.freeze` turns "the view mutated the model" from a subtle bug into a
  thrown error.
- A reviewer can check the rule mechanically: `packages/core` has one dependency,
  `@simulagpu/contracts`, which has none.

**Hard**

- Every interaction rebuilds the whole snapshot. For a 4096-element grid that is
  thousands of small frozen objects. Measured as fine at v0.1 sizes; a
  visualization that needs incremental updates will have to argue for them.
- Anything genuinely stateful — an animation timeline, a stepper with history —
  has to keep that state in the view layer or model it explicitly as part of the
  config. Neither is free.

**Forbidden**

- Importing Vue, VitePress, `window`, `document`, or `URLSearchParams` from
  `packages/core` or `packages/contracts`.
- Storing view concerns (zoom, selected tab, theme) in a config or snapshot.
  Enforced by a test that asserts the snapshot exposes no such property.

## Alternatives considered

**Reactive state inside the component.** Fewer files and less ceremony, but the
arithmetic becomes untestable without mounting a component, and there is no
single object that "is" the state to serialize into a URL.

**A store (Pinia).** Solves cross-component sharing, which does not exist —
there is one visualization on one page. Rule 6 of the architecture contract.

**A class with methods.** Encourages incremental mutation (`setN`,
`selectBlock`), which is exactly what makes reproducibility hard to guarantee.
