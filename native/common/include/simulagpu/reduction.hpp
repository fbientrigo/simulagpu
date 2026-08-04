#pragma once

#include <cmath>
#include <cstddef>
#include <stdexcept>
#include <utility>
#include <vector>

namespace simulagpu {

/// Number of outputs produced by one adjacent-pair reduction pass.
constexpr int reduction_output_size(int n) {
  return n <= 0 ? 0 : n / 2 + (n % 2 != 0 ? 1 : 0);
}

///
/// Reduce adjacent pairs from `input[0..n)` into a compact output array.
///
/// For odd sizes, the unpaired final value is added to zero and therefore
/// preserved exactly. The caller must provide at least
/// `reduction_output_size(n)` output elements.
///
inline void reduction_pass(const float* input, int n, float* output) {
  if (n < 0) {
    throw std::invalid_argument("reduction_pass: n no puede ser negativo");
  }
  if (n == 0) {
    return;
  }
  if (input == nullptr || output == nullptr) {
    throw std::invalid_argument("reduction_pass: los punteros no pueden ser nulos");
  }

  const int output_size = reduction_output_size(n);
  for (int out = 0; out < output_size; ++out) {
    const int left = 2 * out;
    const float right = left + 1 < n ? input[left + 1] : 0.0F;
    output[out] = input[left] + right;
  }
}

inline std::vector<float> reduction_pass(const std::vector<float>& input) {
  std::vector<float> output(static_cast<std::size_t>(reduction_output_size(static_cast<int>(input.size()))));
  reduction_pass(input.data(), static_cast<int>(input.size()), output.data());
  return output;
}

/// Repeated adjacent-pair reduction. Intended as a correctness model, not a benchmark.
inline float reduce_pairwise(std::vector<float> values) {
  if (values.empty()) {
    throw std::invalid_argument("reduce_pairwise: la entrada no puede estar vacía");
  }

  while (values.size() > 1U) {
    values = reduction_pass(values);
  }
  return values.front();
}

/// Sequential float accumulation, useful for showing order sensitivity.
inline float sum_float_sequential(const std::vector<float>& values) {
  float sum = 0.0F;
  for (const float value : values) {
    sum += value;
  }
  return sum;
}

/// Kahan summation in double precision, used as the CPU validation reference.
inline double sum_kahan_reference(const std::vector<float>& values) {
  double sum = 0.0;
  double correction = 0.0;
  for (const float raw_value : values) {
    const double value = static_cast<double>(raw_value) - correction;
    const double next = sum + value;
    correction = (next - sum) - value;
    sum = next;
  }
  return sum;
}

inline bool within_tolerance(float actual, double reference, double absolute_tolerance,
                             double relative_tolerance) {
  if (!std::isfinite(actual) || !std::isfinite(reference)) {
    return false;
  }
  const double error = std::abs(static_cast<double>(actual) - reference);
  const double scale = std::max(1.0, std::abs(reference));
  return error <= absolute_tolerance + relative_tolerance * scale;
}

}  // namespace simulagpu
