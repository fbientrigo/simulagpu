#ifndef SIMULAGPU_VECTOR_ADD_CPU_HPP
#define SIMULAGPU_VECTOR_ADD_CPU_HPP

#include <cstddef>
#include <vector>

// The sequential reference implementation ("oracle") for vector addition, plus
// the comparison helpers used to validate any parallel implementation against
// it. Every CUDA exercise in this repository must have an oracle like this one.

namespace simulagpu {

/// c[i] = a[i] + b[i] for i in [0, n). Sequential, single threaded, exact.
void vector_add(const float* a, const float* b, float* c, int n);

/// Deterministic input generation, so a run can be reproduced from `n` and
/// `seed` alone. Uses a small linear congruential generator on purpose: the
/// exact byte sequence must not depend on the standard library implementation.
std::vector<float> make_input(int n, unsigned int seed);

/// Largest absolute difference between two arrays.
float max_abs_difference(const float* expected, const float* actual, int n);

/// Index of the first element whose difference exceeds `tolerance`, or -1.
///
/// Plain `a + b` is a single IEEE-754 operation with a correctly rounded
/// result, so the CPU and the GPU must agree exactly. A tolerance of 0 is the
/// right default here; it is a parameter because later lessons (reductions)
/// legitimately need a non-zero one.
int first_mismatch(const float* expected, const float* actual, int n, float tolerance);

}  // namespace simulagpu

#endif  // SIMULAGPU_VECTOR_ADD_CPU_HPP
