#include "simulagpu/vector_add_cpu.hpp"

#include <cmath>

namespace simulagpu {

void vector_add(const float* a, const float* b, float* c, int n) {
  for (int i = 0; i < n; ++i) {
    c[i] = a[i] + b[i];
  }
}

std::vector<float> make_input(int n, unsigned int seed) {
  std::vector<float> data(static_cast<std::size_t>(n));
  // Numerical Recipes LCG constants. Reproducible on every platform because
  // the arithmetic is defined on a fixed-width unsigned type.
  unsigned int state = seed;
  for (int i = 0; i < n; ++i) {
    state = state * 1664525u + 1013904223u;
    // Map to [-1, 1) with a power-of-two divisor so the conversion is exact.
    const float unit = static_cast<float>(state >> 8) / 16777216.0f;
    data[static_cast<std::size_t>(i)] = unit * 2.0f - 1.0f;
  }
  return data;
}

float max_abs_difference(const float* expected, const float* actual, int n) {
  float worst = 0.0f;
  for (int i = 0; i < n; ++i) {
    const float difference = std::fabs(expected[i] - actual[i]);
    if (std::isnan(difference)) {
      return difference;
    }
    if (difference > worst) {
      worst = difference;
    }
  }
  return worst;
}

int first_mismatch(const float* expected, const float* actual, int n, float tolerance) {
  for (int i = 0; i < n; ++i) {
    const float difference = std::fabs(expected[i] - actual[i]);
    // NaN fails every comparison, so it must be tested explicitly rather than
    // relying on `difference > tolerance`.
    if (std::isnan(difference) || difference > tolerance) {
      return i;
    }
  }
  return -1;
}

}  // namespace simulagpu
