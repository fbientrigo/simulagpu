# Identity
- **Stable id:** `primitive-b`
- **Title:** `Primitiva B — cudaMemcpy`
- **Kind:** primitive; alphabetical operational track
- **Sequence position:** 4

# Central question / skill
Understand explicit host-to-device and device-to-host movement.

# Prerequisites
- `class-1` — global indexing, allocated buffers, and host/device vocabulary

# Concepts in scope
- source and destination
- transfer direction
- bytes transferred
- values before and after
- data movement is not allocation

# Explicitly out of scope
- `cudaMemcpyAsync`
- streams and overlap
- peer-to-peer transfers
- transfer-performance claims

# Intended interaction
A deterministic before/action/after transfer scene with direction and byte-count
controls. It must explain state changes without executing CUDA.

# Intended visual grammar
Precise modular 2D state: labeled host/device regions and explicit value
movement. Do not imply hardware timing.

# Definition of learned
The learner can name the source, destination, direction, and byte count of a
synchronous copy and predict which values change.

# Dependencies / prerequisites for implementation
Implement a pure snapshot model and tests before a Vue component. Reuse no
primitive abstraction from `cudaMalloc` until a second real implementation
proves the repetition. Add a real vertical slice before changing this status.

# Status: IMPLEMENTED
Shipped as a full vertical slice. See the curriculum manifest entry for the
authoritative references:

- Lesson: `apps/docs/clases/cuda-memcpy.md`
- Model: `packages/core/src/cuda-memcpy`
- Visual: `packages/visuals/src/ClaseCudaMemcpy.vue`
- Native example: `native/examples/cuda-memcpy`
- Cards: `anki/cards/03-cuda-memcpy.yaml`
