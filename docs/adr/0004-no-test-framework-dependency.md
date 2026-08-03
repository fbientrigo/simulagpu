# ADR-0004 — No native test-framework dependency

Status: Accepted
Date: 2026-08-03

## Context

The obvious choice for C++ tests is Catch2 or GoogleTest, pulled in with
`FetchContent`. That is what the reference repository does:

```cmake
FetchContent_Declare(Catch2 GIT_REPOSITORY https://github.com/catchorg/Catch2.git GIT_TAG v3.5.3)
FetchContent_MakeAvailable(Catch2)
```

Note what it also does — `find_package(Catch2 3 QUIET)` first, with a comment
saying it "helps in offline environments". The friction is already known.

For SimulaGPU the friction is worse than an inconvenience, because of who runs
these tests. A student's first interaction with the repository is:

```bash
cmake -S . -B build -G Ninja
cmake --build build
ctest --test-dir build --output-on-failure
```

If that clones a repository over the network at configure time, it fails behind
a proxy, on lab machines with no outbound Git, on a train, and in any
environment where the toolchain is provisioned but the network is not. A student
who cannot get to the *failing* tests never starts the exercise.

What is actually needed is modest: assert a boolean, print the failing
expression with its location, and exit non-zero. CTest already handles
discovery, isolation, reporting and filtering.

## Decision

No third-party test framework. `native/` has zero external dependencies.

`native/common/include/simulagpu/test_assert.hpp` is a ~60-line header:

```cpp
simulagpu::test::Suite suite("launch");
SIMULAGPU_CHECK(suite, ceil_div(100, 32) == 4);
return suite.report();   // 0 when everything passed, 1 otherwise
```

`SIMULAGPU_CHECK` prints `file:line: FAILED: expression` for each failure and
`report()` prints a count and returns the process exit status CTest reads.

Each test is a `main()` registered with `add_test`.

## Consequences

**Easy**

- `cmake && ninja && ctest` works with no network, no package manager and no
  pre-installed libraries.
- Configure is fast — no clone, no third-party build.
- The starter project a student configures in their own directory has the same
  property, which is the case that matters most.
- Nothing to keep on a version-bump treadmill.

**Hard**

- No parametrised tests, no fixtures, no tags, no matchers, no
  `REQUIRE_THAT(..., WithinRel(...))`. Loops and explicit checks instead. For
  the kind of assertions this repository makes — integer arithmetic and exact
  float comparison — that is enough, but it will feel thin for anyone used to
  Catch2.
- Failures report the expression, not the operand values. `SIMULAGPU_CHECK(s, a
  == b)` says which line failed, not what `a` was. Adding value printing means
  reimplementing expression decomposition, which is where a real framework earns
  its keep.
- The helper is code that has to be maintained, however small.

**Revisit when**

A lesson genuinely needs parametrised tests or approximate matchers — the
reductions stage is the likely trigger — *and* the offline-configure property
can be preserved (a vendored single-header release, or `find_package` with a
graceful skip). Not before.

## Alternatives considered

**Catch2 via `FetchContent`.** Best developer experience, and it breaks the
offline path. Rejected on that basis alone.

**Catch2 via `find_package` only, tests skipped when absent.** Keeps configure
offline, but then "the tests pass" means different things on different machines
— and a student whose tests silently do not exist gets the worst possible
feedback.

**Vendor a single-header Catch2 release.** Solves offline configure at the cost
of ~20k lines of third-party code in the tree, with the licence and update
obligations that come with it. Disproportionate for the assertions actually
being made.
