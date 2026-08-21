#include "exercise03/barrier_phase.hpp"

#include <algorithm>
#include <stdexcept>

namespace exercise03 {

int reversed_source(int local_index, int block_valid) { return block_valid - 1 - local_index; }

bool phase_depends_on_siblings() { return true; }

std::vector<int> block_local_reverse(const std::vector<int>& input, int block_size) {
  if (block_size <= 0) {
    throw std::invalid_argument("block_size debe ser positivo");
  }
  const int n = static_cast<int>(input.size());
  std::vector<int> output(input.size());
  for (int base = 0; base < n; base += block_size) {
    const int valid = std::min(block_size, n - base);
    for (int j = 0; j < valid; ++j) {
      const int source = base + reversed_source(j, valid);
      output[static_cast<std::size_t>(base + j)] = input[static_cast<std::size_t>(source)];
    }
  }
  return output;
}

}  // namespace exercise03
