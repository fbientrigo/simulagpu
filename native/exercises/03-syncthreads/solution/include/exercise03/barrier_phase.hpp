#pragma once

#include <vector>

namespace exercise03 {

/// Local source index a thread reads for a block-local reversal: within a block
/// of `block_valid` participating threads, the thread at local position
/// `local_index` reads position `block_valid - 1 - local_index`.
int reversed_source(int local_index, int block_valid);

/// Does phase 2 (reading) depend on values that *other* threads wrote in phase
/// 1 (publishing)? For a block-local reversal the answer is yes, which is why a
/// barrier is required between the phases on the GPU.
bool phase_depends_on_siblings();

/// Reverse `input` within each block of `block_size` elements. A final block
/// shorter than `block_size` is reversed within the elements it has. Correct
/// only because phase 1 fully precedes phase 2.
std::vector<int> block_local_reverse(const std::vector<int>& input, int block_size);

}  // namespace exercise03
