# Identity
- **Stable id:** `class-6`
- **Title:** `Clase 6 — Streams y solapamiento`
- **Kind:** numbered class track
- **Sequence position:** 13

# Central question / skill
How can independent GPU work and transfers be organized as a dependency-aware pipeline?

# Prerequisites
- `class-5` — dependencies and correctness under conflicting outputs
- `primitive-f` — asynchronous enqueueing, pending work, and completion boundaries

# Concepts in scope
- stream ordering
- independent streams
- host-device transfer timeline
- kernel timeline
- potential overlap
- dependencies between H2D, kernels, and D2H
- identifying where completion is required before dependent use

# Explicitly out of scope
- choosing `cudaStreamSynchronize` versus `cudaDeviceSynchronize` (Primitive G)
- a catalogue of synchronization APIs
- CUDA graphs
- multi-device scheduling
- throughput benchmarks
- a catalogue of implicit synchronization rules

# Intended interaction
Construct a small dependency-aware timeline from transfers and kernels. Let the
learner identify which operations are independent, which dependencies constrain
the pipeline, and where a consumer requires earlier work to be complete. Do not
teach the API used to perform that wait yet; that operational choice belongs to
Primitive G.

# Intended visual grammar
Timeline rather than cells or matrix layout. Separate transfer and kernel lanes
and annotate dependency edges. Visual overlap represents work that may overlap;
it never claims measured or guaranteed hardware concurrency.

# Definition of learned
The learner can read and construct a dependency-aware stream timeline, explain
which work may overlap, and identify where completion is required before a
dependent consumer without yet choosing the synchronization API.

# Dependencies / prerequisites for implementation
Freeze stream order and dependency rules in a pure model. Keep time positions
illustrative and avoid unmeasured durations. Represent a required wait as a
semantic dependency boundary, not as `cudaStreamSynchronize` or
`cudaDeviceSynchronize`; Primitive G owns those APIs. Native validation remains
correctness-first.

# Status: PLANNED
