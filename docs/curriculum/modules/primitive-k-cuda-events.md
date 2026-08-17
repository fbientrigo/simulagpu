# Identity
- **Stable id:** `primitive-k`
- **Title:** `Primitiva K — cudaEventRecord y medición de tiempo`
- **Kind:** reference primitive outside the first A–G interleaving
- **Sequence position:** 19

# Central question / skill
Reserve event recording and elapsed-time measurement as a future reference
module.

# Prerequisites
- `primitive-f` — asynchronous work and completion boundaries
- `class-6` — stream timelines

# Concepts in scope
- event placement
- elapsed-time interval
- measurement boundary

# Explicitly out of scope
- published benchmarks
- statistical benchmarking methodology
- cross-device comparisons

# Intended interaction
A compact timeline that marks an explicitly measured interval, when this module
is eventually implemented. It must not invent elapsed values.

# Intended visual grammar
Timeline with event markers and separate kernel/transfer boundaries.

# Definition of learned
Future module: define a measured interval and keep kernel timing separate from
transfer timing.

# Dependencies / prerequisites for implementation
Require local measurement provenance before showing any number. Keep event
semantics separate from the curriculum's explanatory timelines and add a native
verification path only when the complete slice is ready.

# Status: PLANNED
