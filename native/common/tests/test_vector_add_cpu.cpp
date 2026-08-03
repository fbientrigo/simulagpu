#include <cmath>
#include <cstddef>
#include <vector>

#include "simulagpu/launch.hpp"
#include "simulagpu/test_assert.hpp"
#include "simulagpu/vector_add_cpu.hpp"

using simulagpu::first_mismatch;
using simulagpu::make_input;
using simulagpu::max_abs_difference;
using simulagpu::vector_add;

namespace {

// The sizes the lesson promises to cover. `block_size` is 256 throughout, so
// these are: a single element, a partial first block, an exact block, one
// element past a block, a size that is not a multiple, and a large input.
constexpr int kBlockSize = 256;
constexpr int kSizes[] = {1, 7, kBlockSize - 1, kBlockSize, kBlockSize + 1, 1000, 1 << 20};

bool check_size(simulagpu::test::Suite& suite, int n) {
  const std::vector<float> a = make_input(n, 1u);
  const std::vector<float> b = make_input(n, 2u);
  std::vector<float> c(static_cast<std::size_t>(n), 0.0f);

  vector_add(a.data(), b.data(), c.data(), n);

  // Recompute independently rather than trusting the function under test.
  std::vector<float> expected(static_cast<std::size_t>(n));
  for (int i = 0; i < n; ++i) {
    expected[static_cast<std::size_t>(i)] =
        a[static_cast<std::size_t>(i)] + b[static_cast<std::size_t>(i)];
  }

  const int mismatch = first_mismatch(expected.data(), c.data(), n, 0.0f);
  SIMULAGPU_CHECK(suite, mismatch == -1);
  SIMULAGPU_CHECK(suite, max_abs_difference(expected.data(), c.data(), n) == 0.0f);
  return mismatch == -1;
}

}  // namespace

int main() {
  simulagpu::test::Suite suite("vector_add_cpu");

  for (const int n : kSizes) {
    check_size(suite, n);
    // The launch geometry the GPU version would use for this size must still
    // cover it exactly once.
    SIMULAGPU_CHECK(suite, simulagpu::total_threads(n, kBlockSize) >= n);
  }

  // make_input is deterministic: the same (n, seed) yields the same bytes, and
  // different seeds yield different data.
  {
    const std::vector<float> first = make_input(64, 7u);
    const std::vector<float> again = make_input(64, 7u);
    const std::vector<float> other = make_input(64, 8u);
    SIMULAGPU_CHECK(suite, first == again);
    SIMULAGPU_CHECK(suite, first != other);
    SIMULAGPU_CHECK(suite, first.size() == 64);
  }

  // Generated values stay inside [-1, 1), so sums stay well inside float range.
  {
    const std::vector<float> data = make_input(4096, 42u);
    bool in_range = true;
    for (const float value : data) {
      if (!(value >= -1.0f && value < 1.0f)) {
        in_range = false;
      }
    }
    SIMULAGPU_CHECK(suite, in_range);
  }

  // The comparison helpers must actually catch a wrong answer, otherwise a
  // green test run means nothing.
  {
    std::vector<float> expected{1.0f, 2.0f, 3.0f};
    std::vector<float> actual{1.0f, 2.5f, 3.0f};
    SIMULAGPU_CHECK(suite, first_mismatch(expected.data(), actual.data(), 3, 0.0f) == 1);
    SIMULAGPU_CHECK(suite, first_mismatch(expected.data(), actual.data(), 3, 1.0f) == -1);
    SIMULAGPU_CHECK(suite, simulagpu::test::close_enough(
                               max_abs_difference(expected.data(), actual.data(), 3), 0.5, 1e-9));
  }

  // A NaN must be reported as a mismatch, not swallowed by the comparison.
  {
    std::vector<float> expected{1.0f};
    std::vector<float> actual{std::nanf("")};
    SIMULAGPU_CHECK(suite, first_mismatch(expected.data(), actual.data(), 1, 1e9f) == 0);
  }

  // n = 0 is a degenerate but legal input: nothing to do, nothing to compare.
  {
    std::vector<float> empty;
    vector_add(empty.data(), empty.data(), empty.data(), 0);
    SIMULAGPU_CHECK(suite, first_mismatch(empty.data(), empty.data(), 0, 0.0f) == -1);
  }

  return suite.report();
}
