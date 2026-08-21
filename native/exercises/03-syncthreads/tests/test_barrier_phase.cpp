#include <stdexcept>
#include <vector>

#include "exercise03/barrier_phase.hpp"
#include "simulagpu/test_assert.hpp"

int main() {
  simulagpu::test::Suite suite("exercise03.barrier_phase");

  // Reversed-source arithmetic within a block of four participating threads.
  SIMULAGPU_CHECK(suite, exercise03::reversed_source(0, 4) == 3);
  SIMULAGPU_CHECK(suite, exercise03::reversed_source(1, 4) == 2);
  SIMULAGPU_CHECK(suite, exercise03::reversed_source(3, 4) == 0);
  // A partial block reverses within its valid count.
  SIMULAGPU_CHECK(suite, exercise03::reversed_source(0, 2) == 1);

  // Phase 2 reads what a sibling published in phase 1: a barrier is required.
  SIMULAGPU_CHECK(suite, exercise03::phase_depends_on_siblings());

  // Two full blocks of four: each block is reversed independently.
  const std::vector<int> two_blocks{10, 11, 12, 13, 20, 21, 22, 23};
  const std::vector<int> reversed{13, 12, 11, 10, 23, 22, 21, 20};
  SIMULAGPU_CHECK(suite, exercise03::block_local_reverse(two_blocks, 4) == reversed);

  // Single element: unchanged.
  const std::vector<int> single{7};
  SIMULAGPU_CHECK(suite, exercise03::block_local_reverse(single, 4) == single);

  // Partial final block: n = 6, block_size = 4 -> [0..3] reversed, [4,5] reversed.
  const std::vector<int> six{1, 2, 3, 4, 5, 6};
  const std::vector<int> six_reversed{4, 3, 2, 1, 6, 5};
  SIMULAGPU_CHECK(suite, exercise03::block_local_reverse(six, 4) == six_reversed);

  bool threw = false;
  try {
    static_cast<void>(exercise03::block_local_reverse({1, 2, 3}, 0));
  } catch (const std::invalid_argument&) {
    threw = true;
  }
  SIMULAGPU_CHECK(suite, threw);

  return suite.report();
}
