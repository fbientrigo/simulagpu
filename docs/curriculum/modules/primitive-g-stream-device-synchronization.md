# Identity
- **Stable id:** `primitive-g`
- **Title:** `Primitiva G — sincronización de stream y device`
- **Kind:** primitive; alphabetical operational track
- **Sequence position:** 14

# Central question / skill
Know what scope is being waited on and when synchronization is actually needed.

# Prerequisites
- `class-6` — stream ordering, dependencies, and timeline reasoning

# Concepts in scope
- stream-local waiting
- device-wide waiting
- dependency boundaries
- avoiding unnecessary global synchronization

# Explicitly out of scope
- events as a measurement system
- host callbacks
- cooperative launch synchronization
- performance claims

# Intended interaction
Given a small stream/dependency diagram, let the learner choose between
`cudaStreamSynchronize` and `cudaDeviceSynchronize` and identify the affected
work.

# Intended visual grammar
Timeline with explicit stream scope and device scope bands. Waiting is a labeled
boundary, not a fabricated duration.

# Definition of learned
The learner can choose stream-local or device-wide waiting and justify the
specific dependency boundary being enforced.

# Dependencies / prerequisites for implementation
Specify scope semantics and minimal state transitions before UI work. Coordinate
with Primitive F and Class 6 without turning synchronization into a generic
runtime abstraction.

# Status: PLANNED
