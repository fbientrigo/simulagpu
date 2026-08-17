# Identity
- **Stable id:** `primitive-j`
- **Title:** `Primitiva J — cudaGetLastError`
- **Kind:** reference primitive outside the first A–G interleaving
- **Sequence position:** 18

# Central question / skill
Reserve post-launch error inspection as a future reference module.

# Prerequisites
- `class-1` — checked launch path and explicit CUDA error vocabulary

# Concepts in scope
- error-state inspection
- launch-error boundary
- explicit error handling

# Explicitly out of scope
- complete CUDA error taxonomy
- debugger workflows
- fault injection

# Intended interaction
A compact reference decision showing where an error query belongs in a checked
launch path, when this module is eventually implemented.

# Intended visual grammar
Reference-only precise 2D control-flow state; never imply that the browser ran a
kernel.

# Definition of learned
Future module: identify what an error query can reveal and where it belongs in a
checked launch path.

# Dependencies / prerequisites for implementation
Align the module with the repository CUDA error-handling ADR and test known
success/error states before authoring learner-facing prose.

# Status: PLANNED
