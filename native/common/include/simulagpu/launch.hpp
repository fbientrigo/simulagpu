#ifndef SIMULAGPU_LAUNCH_HPP
#define SIMULAGPU_LAUNCH_HPP

// Launch geometry, expressed as plain host functions.
//
// These are the same three pieces of arithmetic a CUDA kernel and its host
// launch code perform. Keeping them here, free of any CUDA header, means they
// can be unit tested on a machine that has no GPU and no nvcc -- which is the
// whole reason the CPU-only configuration is useful for teaching.

namespace simulagpu {

/// Number of blocks needed to cover `n` elements with `block_size` threads each.
///
/// Written as `n / b + (remainder ? 1 : 0)` rather than the more common
/// `(n + b - 1) / b`. The two agree for every value we care about, but the
/// textbook form overflows when `n` is close to the maximum of its type,
/// whereas this one never does.
constexpr int ceil_div(int numerator, int denominator) noexcept {
  return numerator / denominator + (numerator % denominator != 0 ? 1 : 0);
}

/// `gridDim.x` for a 1D launch covering `n` elements.
constexpr int grid_size(int n, int block_size) noexcept { return ceil_div(n, block_size); }

/// The global 1D index a thread computes for itself:
/// `i = blockIdx.x * blockDim.x + threadIdx.x`.
constexpr int global_index(int block_idx, int block_dim, int thread_idx) noexcept {
  return block_idx * block_dim + thread_idx;
}

/// The `if (i < n)` guard. Threads of the last block for which this is false
/// must not touch memory: they were only created because the grid size was
/// rounded up.
constexpr bool is_active(int index, int n) noexcept { return index < n; }

/// How many threads a launch creates, which is >= n whenever n is not a
/// multiple of the block size.
constexpr int total_threads(int n, int block_size) noexcept {
  return grid_size(n, block_size) * block_size;
}

}  // namespace simulagpu

#endif  // SIMULAGPU_LAUNCH_HPP
