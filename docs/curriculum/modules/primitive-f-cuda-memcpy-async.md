# Identity
- **Stable id:** `primitive-f`
- **Title:** `Primitiva F — cudaMemcpyAsync`
- **Kind:** primitive; alphabetical operational track
- **Sequence position:** 12

# Central question / skill
Understand what it means to initiate a transfer asynchronously.

# Prerequisites
- `class-5` — explicit correctness and dependency reasoning

# Concepts in scope
- enqueueing work
- transfer completion is not immediate
- relation to stream ordering
- synchronization before depending on completion

# Explicitly out of scope
- multi-stream overlap strategies
- pinned-memory performance details
- CUDA graphs
- benchmark numbers

# Intended interaction
Place a transfer on a deterministic timeline and ask whether a dependent read
is safe before an explicit wait. The scene models ordering, not elapsed time.

# Intended visual grammar
Timeline-first: distinguish enqueued, pending, and completed states with labels
and dependency markers rather than a cell animation.

# Definition of learned
The learner can separate enqueueing from completion and identify the wait needed
before consuming transferred data.

# Dependencies / prerequisites for implementation
Define stream order and completion states independently of clocks or a browser
scheduler. Validate the model with dependency boundary cases before any Vue
presentation.

# Status: PLANNED
