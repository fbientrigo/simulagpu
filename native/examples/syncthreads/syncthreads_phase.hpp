#ifndef SIMULAGPU_EXAMPLE_SYNCTHREADS_PHASE_HPP
#define SIMULAGPU_EXAMPLE_SYNCTHREADS_PHASE_HPP

#include <algorithm>
#include <vector>

// Host-testable core of the block-local barrier example.
//
// Plain C++, no CUDA type: the arithmetic a block-local reversal must reproduce
// can be checked on a machine with no GPU. A block-local reversal is a genuine
// two-phase, cross-thread dependency: every thread first publishes its own
// value, and only afterwards may read a *sibling's* value. On the GPU that hand
// off is exactly what __syncthreads() protects; here it is the reference result
// the CUDA kernel is compared against.

namespace simulagpu::example {

/// Local source index a thread reads for a block-local reversal:
/// within a block of `valid_in_block` participating threads, the thread at local
/// position `local_index` reads position `valid_in_block - 1 - local_index`.
constexpr int block_reversed_source(int local_index, int valid_in_block) noexcept {
  return valid_in_block - 1 - local_index;
}

/// Reverse `input` within each block of `block_size` elements. A final block
/// shorter than `block_size` is reversed within the elements it actually has.
/// This is the CPU oracle: correct precisely because phase 1 (publish) fully
/// precedes phase 2 (read the sibling), which on the GPU requires a barrier.
inline std::vector<int> block_local_reverse(const std::vector<int>& input, int block_size) {
  const int n = static_cast<int>(input.size());
  std::vector<int> output(input.size());
  for (int base = 0; base < n; base += block_size) {
    const int valid = std::min(block_size, n - base);
    for (int j = 0; j < valid; ++j) {
      const int source = base + block_reversed_source(j, valid);
      output[static_cast<std::size_t>(base + j)] = input[static_cast<std::size_t>(source)];
    }
  }
  return output;
}

}  // namespace simulagpu::example

#endif  // SIMULAGPU_EXAMPLE_SYNCTHREADS_PHASE_HPP
