# ADR-0002 — CUDA is optional and detected, never assumed

Status: Accepted
Date: 2026-08-03

## Context

Most CUDA teaching material assumes a GPU. The reference course this material
draws on builds with `CC = nvcc` in a `Makefile`: without the CUDA Toolkit,
nothing compiles, nothing runs, and there is nothing to do.

That is a poor fit for how people actually learn this:

- students prepare on a laptop and only get GPU time in a lab session;
- CI runners do not have GPUs, and paying for ones that do is not justified by a
  compile check;
- a large part of the first lesson — index arithmetic, ceiling division, bounds
  checking, verification against a reference — is ordinary integer maths that
  needs no GPU to be correct or to be tested.

A build that fails on a laptop teaches nothing about GPUs. It teaches that the
material is not for you.

## Decision

CUDA is an optional, detected feature. The CPU-only configuration is the
default and is complete on its own.

`native/CMakeLists.txt` declares `project(... LANGUAGES CXX)`. CUDA is enabled
afterwards, conditionally, via a tri-state cache variable:

| `SIMULAGPU_CUDA` | Behaviour |
| --- | --- |
| `AUTO` (default) | `check_language(CUDA)`; enable if found, otherwise continue CPU-only with a status message |
| `ON` | require it; `FATAL_ERROR` when `nvcc` is missing |
| `OFF` | never enable it |

The internal flag `SIMULAGPU_WITH_CUDA` is the only thing the rest of the tree
reads.

Structural consequences, all enforced by the build rather than by convention:

- no `.cu` file is added to any target unless CUDA is on;
- `cuda_check.cuh` is included only from `.cu` files, so a CPU-only translation
  unit can never reach a CUDA header;
- the host-side interface of a CUDA implementation is plain C++
  (`vector_add_cuda.hpp` names no CUDA type);
- index arithmetic lives in `native/common/include/simulagpu/launch.hpp` as
  `constexpr` host functions with no CUDA dependency.

That last point is the one that matters most: it is what makes the core of the
exercise testable on any machine.

## Consequences

**Easy**

- `cmake -S native -B build && cmake --build build && ctest` works on any
  machine with a C++17 compiler, with no network access.
- CI is fast and free.
- A student with no GPU completes TODO 1–4 of exercise 01 — the majority of the
  learning — and gets green tests for it.
- `SIMULAGPU_CUDA=ON` gives a scripted build a way to fail loudly rather than
  silently producing a CPU-only artefact.

**Hard**

- Every exercise must be designed so its host-testable part is meaningful.
  That is a real constraint on exercise authoring, and it is written into
  `AGENTS.md` as a rule rather than left as a habit.
- Some duplication is accepted: `simulagpu::grid_size` and
  `exercise01::grid_size` are the same function, because the exercise has to be
  self-contained for the student to implement it. That duplication is
  deliberate, not an oversight.

**Forbidden**

- Making a CPU-only build depend on `nvcc` in any way.
- Registering a CUDA executable with `add_test`. Those need a physical device;
  CI has none.

## Alternatives considered

**Require CUDA.** Simplest build, and it matches the reference course. Rejected:
it excludes exactly the people who most need a gentle on-ramp, and makes CI
impossible without paid GPU runners.

**Stub the CUDA API for CPU builds.** A fake `cudaMalloc` would let the same
source compile everywhere. Rejected: the stub would have to be maintained, would
diverge from the real API, and a lesson whose whole point is *how CUDA works*
must not be taught against a shim.

**Two separate projects, CPU and CUDA.** Clean separation, but the shared CPU
oracle and the shared launch arithmetic would have to be duplicated or vendored,
and the two would drift.
