# Identity
- **Stable id:** `primitive-d`
- **Title:** `Primitiva D — __shared__`
- **Kind:** primitive; alphabetical operational track
- **Sequence position:** 8

# Central question / skill
Understand how threads in one block cooperatively stage reusable data.

# Prerequisites
- `class-3` — memory regions, access patterns, and reuse

# Concepts in scope
- shared allocation
- block scope
- global-to-shared movement
- reuse
- synchronization where relevant

# Explicitly out of scope
- bank-conflict tuning
- dynamic-allocation edge cases
- warp-specialized designs
- performance numbers

# Intended interaction
Show one block loading a bounded set of values into shared storage, then reading
the values more than once. Make the synchronization dependency explicit.

# Intended visual grammar
Precise 2D block-local state with separate global and shared regions. Labels,
not color alone, identify scope and validity.

# Definition of learned
The learner can explain shared-storage scope, identify what must be staged, and
say when cooperation requires synchronization.

# Dependencies / prerequisites for implementation
Define ownership, scope, and before/after validity in a pure model. Coordinate
with Primitive C without extracting a generic barrier or memory framework from
one new use.

# Status: PLANNED
