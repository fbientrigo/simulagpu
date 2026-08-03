#include <set>

#include "simulagpu/launch.hpp"
#include "simulagpu/test_assert.hpp"

using simulagpu::ceil_div;
using simulagpu::global_index;
using simulagpu::grid_size;
using simulagpu::is_active;
using simulagpu::total_threads;

int main() {
  simulagpu::test::Suite suite("launch");

  // Ceiling division: the whole point is that the tail elements still get a
  // block. Integer division alone silently drops them.
  SIMULAGPU_CHECK(suite, ceil_div(100, 32) == 4);
  SIMULAGPU_CHECK(suite, ceil_div(128, 32) == 4);
  SIMULAGPU_CHECK(suite, ceil_div(129, 32) == 5);
  SIMULAGPU_CHECK(suite, ceil_div(1, 256) == 1);
  SIMULAGPU_CHECK(suite, ceil_div(0, 256) == 0);

  // Computed at compile time, so a regression here is a build failure.
  static_assert(ceil_div(100, 32) == 4, "ceil_div must round up");
  static_assert(global_index(3, 32, 5) == 101, "i = blockIdx.x * blockDim.x + threadIdx.x");

  // The grid must always cover the vector, and never by more than one block.
  for (int block_size : {1, 32, 64, 128, 256, 512, 1024}) {
    for (int n = 1; n <= 4096; ++n) {
      const int blocks = grid_size(n, block_size);
      SIMULAGPU_CHECK(suite, blocks * block_size >= n);
      SIMULAGPU_CHECK(suite, (blocks - 1) * block_size < n);
      SIMULAGPU_CHECK(suite, total_threads(n, block_size) - n < block_size);
    }
  }

  // Indexing: every element is claimed by exactly one thread, and no active
  // thread points past the end of the vector.
  {
    const int n = 100;
    const int block_size = 32;
    std::set<int> claimed;
    int active = 0;
    for (int block = 0; block < grid_size(n, block_size); ++block) {
      for (int thread = 0; thread < block_size; ++thread) {
        const int i = global_index(block, block_size, thread);
        if (is_active(i, n)) {
          ++active;
          SIMULAGPU_CHECK(suite, i >= 0 && i < n);
          SIMULAGPU_CHECK(suite, claimed.insert(i).second);
        }
      }
    }
    SIMULAGPU_CHECK(suite, active == n);
    SIMULAGPU_CHECK(suite, static_cast<int>(claimed.size()) == n);
  }

  // The boundary itself: index n-1 is the last active thread, n is the first
  // inactive one.
  SIMULAGPU_CHECK(suite, is_active(99, 100));
  SIMULAGPU_CHECK(suite, !is_active(100, 100));
  SIMULAGPU_CHECK(suite, !is_active(127, 100));

  return suite.report();
}
