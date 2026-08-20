#ifndef SIMULAGPU_EXAMPLE_SYNCTHREADS_PHASE_CUDA_HPP
#define SIMULAGPU_EXAMPLE_SYNCTHREADS_PHASE_CUDA_HPP

// Host-side interface of the CUDA block-local barrier example.
//
// Plain C++: no CUDA type appears here, so `main.cpp` compiles with a normal
// compiler and only the .cu translation unit needs nvcc. This header is only
// included when the build was configured with CUDA support.

#include <vector>

namespace simulagpu::example {

/// True when at least one CUDA device is visible and usable.
bool cuda_device_available();

/// Name and compute capability of device 0, or "(sin dispositivo)".
const char* cuda_device_description();

/// Run a block-local reversal on the device with `block_size` threads per block.
///
/// The kernel has two phases separated by __syncthreads(): every thread first
/// publishes its input value, and only after the barrier reads the value a
/// sibling published. Returns the device result so the caller can compare it to
/// the CPU oracle. Aborts on any CUDA error. No timing is measured.
std::vector<int> block_local_reverse_cuda(const std::vector<int>& input, int block_size);

}  // namespace simulagpu::example

#endif  // SIMULAGPU_EXAMPLE_SYNCTHREADS_PHASE_CUDA_HPP
