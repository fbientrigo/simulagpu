# Identity
- **Stable id:** `primitive-i`
- **Title:** `Primitiva I — cudaMemset`
- **Kind:** reference primitive outside the first A–G interleaving
- **Sequence position:** 17

# Central question / skill
Reserve byte-pattern initialization as a future reference module.

# Prerequisites
- `primitive-a` — allocated device memory versus initialized contents

# Concepts in scope
- device-memory initialization
- byte pattern
- allocation versus initialization

# Explicitly out of scope
- typed fill semantics
- performance comparisons
- large-scale initialization strategies

# Intended interaction
A compact before/after byte-pattern scene, when this module is eventually
implemented. It must distinguish bytes from typed numeric values.

# Intended visual grammar
Reference-only precise 2D memory state with explicit byte labels.

# Definition of learned
Future module: distinguish writing a byte pattern from writing typed numeric
values.

# Dependencies / prerequisites for implementation
Define byte-level truth independently from a browser memory simulator and test
boundary lengths before adding a route.

# Status: PLANNED
