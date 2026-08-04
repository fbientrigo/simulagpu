#include <stdexcept>
#include <vector>

#include "exercise02/reduction_step.hpp"
#include "simulagpu/test_assert.hpp"

int main() {
  simulagpu::test::Suite suite("exercise02.reduction_step");

  SIMULAGPU_CHECK(suite, exercise02::output_size(1) == 1);
  SIMULAGPU_CHECK(suite, exercise02::output_size(4) == 2);
  SIMULAGPU_CHECK(suite, exercise02::output_size(5) == 3);

  SIMULAGPU_CHECK(suite, exercise02::left_index(0) == 0);
  SIMULAGPU_CHECK(suite, exercise02::left_index(1) == 2);
  SIMULAGPU_CHECK(suite, exercise02::left_index(3) == 6);

  const std::vector<float> singleton{7.0F};
  SIMULAGPU_CHECK(suite, exercise02::right_value(singleton, 0) == 0.0F);
  SIMULAGPU_CHECK(suite, exercise02::reduction_step(singleton) == singleton);

  const std::vector<float> even{2.0F, 4.0F, 6.0F, 8.0F};
  SIMULAGPU_CHECK(suite,
                  exercise02::reduction_step(even) == std::vector<float>({6.0F, 14.0F}));

  const std::vector<float> odd{2.0F, 4.0F, 6.0F, 8.0F, 10.0F};
  SIMULAGPU_CHECK(
      suite, exercise02::reduction_step(odd) == std::vector<float>({6.0F, 14.0F, 10.0F}));

  bool threw = false;
  try {
    static_cast<void>(exercise02::reduction_step({}));
  } catch (const std::invalid_argument&) {
    threw = true;
  }
  SIMULAGPU_CHECK(suite, threw);

  return suite.report();
}
