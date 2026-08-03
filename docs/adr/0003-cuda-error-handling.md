# ADR-0003 — A failed CUDA call aborts

Status: Accepted
Date: 2026-08-03

## Context

The CUDA runtime reports failures through return codes, and it is asynchronous.
Two facts follow that beginners routinely get wrong:

1. A kernel launch is a statement, not a call: it returns before the kernel
   runs. Errors surface later, from a *different* API call.
2. There are two distinct failure channels after a launch.
   `cudaGetLastError()` reports launch-configuration errors (a block that is too
   large, an invalid shared-memory size). `cudaDeviceSynchronize()` reports
   errors raised while the kernel executed (an illegal address). Checking only
   one hides half the bugs.

The reference course checks each runtime call and prints to `stderr`, then
continues:

```c
err = cudaMalloc((void **)&d_a, n*sizeof(float));
if (err != cudaSuccess) fprintf(stderr, "Error in cudaMalloc d_a: %s\n", ...);
```

Continuing after a failed `cudaMalloc` means `d_a` stays uninitialised. The next
`cudaMemcpy` fails too, then the kernel fails, then the comparison fails. The
student sees five error messages and the first — the only one that matters — has
scrolled off the top.

## Decision

A failed CUDA call reports and stops.

`native/common/include/simulagpu/cuda_check.cuh` provides:

- `SIMULAGPU_CUDA_CHECK(call)` — wraps any call returning `cudaError_t`. On
  failure it prints file, line, the exact call text, the numeric code, the error
  name and the error string, then `std::exit(EXIT_FAILURE)`.
- `SIMULAGPU_CUDA_CHECK_KERNEL()` — called immediately after a launch. Asks
  **both** questions: `cudaGetLastError()` and then `cudaDeviceSynchronize()`.

One exception, and it is deliberate: `cuda_device_available()` returns `false`
rather than aborting. "This machine has no GPU" is a normal condition the
example is designed to handle, not a failure.

## Consequences

**Easy**

- The first error is the last thing printed, so it is the thing the student
  reads.
- The message names the exact call, so there is no guessing which of six
  `cudaMemcpy` lines failed.
- The double check after a launch catches the two failure classes students
  actually hit, and the macro's existence makes the asymmetry teachable — the
  lesson can point at it and explain why it takes two calls.
- Exit status is meaningful, so the example can be a CTest smoke test.

**Hard**

- `std::exit` skips destructors, so device allocations leak on the failure path.
  Acceptable: the process is ending, and the driver reclaims device memory. It
  would not be acceptable in a library.
- These are macros, which type-checkers and formatters like less than functions.
  They have to be macros: `#call`, `__FILE__` and `__LINE__` are the whole
  point.
- `SIMULAGPU_CUDA_CHECK_KERNEL()` synchronizes, which serializes the host and
  the device. Fine for teaching code; a lesson that needs overlapping streams
  will need a variant that does not.

**Forbidden**

- Calling a CUDA runtime function without checking its result.
- Checking only `cudaGetLastError()` after a launch.

## Alternatives considered

**Print and continue** (the reference behaviour). Rejected: the cascade buries
the cause, and it teaches that a CUDA error is something you can walk past.

**Throw an exception.** More idiomatic C++ and recoverable. Rejected for v0.1:
`.cu` translation units and exceptions across the host/device boundary add
complexity that earns nothing in a program whose only sensible response to a
failed `cudaMalloc` is to stop. Worth revisiting if a lesson ever needs to
recover.

**A `CudaError` return type propagated by the caller.** Correct for a library,
and wrong for teaching code: every example would be dominated by error
propagation instead of by the concept it exists to show.
