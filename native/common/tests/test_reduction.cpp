#include <cmath>
#include <limits>
#include <stdexcept>
#include <vector>

#include "simulagpu/reduction.hpp"
#include "simulagpu/test_assert.hpp"

int main() {
  simulagpu::test::Suite suite("reduction");

  SIMULAGPU_CHECK(suite, simulagpu::reduction_output_size(0) == 0);
  SIMULAGPU_CHECK(suite, simulagpu::reduction_output_size(1) == 1);
  SIMULAGPU_CHECK(suite, simulagpu::reduction_output_size(8) == 4);
  SIMULAGPU_CHECK(suite, simulagpu::reduction_output_size(7) == 4);

  const std::vector<float> even{3.0F, 1.0F, 7.0F, 0.0F, 4.0F, 1.0F, 6.0F, 3.0F};
  const std::vector<float> even_pass = simulagpu::reduction_pass(even);
  SIMULAGPU_CHECK(suite, even_pass == std::vector<float>({4.0F, 7.0F, 5.0F, 9.0F}));
  SIMULAGPU_CHECK(suite, simulagpu::reduce_pairwise(even) == 25.0F);

  const std::vector<float> odd{5.0F, 1.0F, 4.0F, 2.0F, 8.0F, 3.0F, 6.0F};
  const std::vector<float> odd_pass = simulagpu::reduction_pass(odd);
  SIMULAGPU_CHECK(suite, odd_pass == std::vector<float>({6.0F, 6.0F, 11.0F, 6.0F}));
  SIMULAGPU_CHECK(suite, simulagpu::reduce_pairwise(odd) == 29.0F);

  const std::vector<float> singleton{7.0F};
  SIMULAGPU_CHECK(suite, simulagpu::reduction_pass(singleton) == singleton);
  SIMULAGPU_CHECK(suite, simulagpu::reduce_pairwise(singleton) == 7.0F);

  const std::vector<float> cancellation{100000000.0F, 1.0F, -100000000.0F, 3.0F,
                                         0.25F,       0.25F, 0.5F};
  const float tree = simulagpu::reduce_pairwise(cancellation);
  const double reference = simulagpu::sum_kahan_reference(cancellation);
  SIMULAGPU_CHECK(suite, simulagpu::within_tolerance(tree, reference, 4.0, 1.0e-6));
  SIMULAGPU_CHECK(suite, !simulagpu::within_tolerance(tree, reference, 0.0, 0.0));

  SIMULAGPU_CHECK(
      suite,
      !simulagpu::within_tolerance(std::numeric_limits<float>::quiet_NaN(), reference, 1.0, 1.0));

  bool threw = false;
  try {
    static_cast<void>(simulagpu::reduce_pairwise(std::vector<float>{}));
  } catch (const std::invalid_argument&) {
    threw = true;
  }
  SIMULAGPU_CHECK(suite, threw);

  return suite.report();
}
