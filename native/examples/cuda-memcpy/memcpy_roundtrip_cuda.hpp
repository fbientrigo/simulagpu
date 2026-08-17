#ifndef SIMULAGPU_EXAMPLE_MEMCPY_ROUNDTRIP_CUDA_HPP
#define SIMULAGPU_EXAMPLE_MEMCPY_ROUNDTRIP_CUDA_HPP

#include <cstdint>

// Host-side interface of the CUDA round-trip example.
//
// Plain C++: no CUDA type appears here, so `main.cpp` compiles with a normal
// compiler and only the .cu translation unit needs nvcc. This header is only
// included when the build was configured with CUDA support.

namespace simulagpu::example {

/// True when at least one CUDA device is visible and usable.
///
/// Returns false instead of aborting: "no GPU on this machine" is a normal
/// situation, not an error.
bool cuda_device_available();

/// Name and compute capability of device 0, or "(sin dispositivo)".
const char* cuda_device_description();

/// Round-trip `n` int32_t values through device memory:
///
///   input (host) --H2D--> device buffer --D2H--> output (host)
///
/// No kernel runs: this example is only about the two transfers. The device
/// buffer is allocated with cudaMalloc and released with cudaFree. Aborts on any
/// CUDA error. The caller compares `output` against `input` on the CPU.
void memcpy_roundtrip_cuda(const std::int32_t* input, std::int32_t* output, int n);

}  // namespace simulagpu::example

#endif  // SIMULAGPU_EXAMPLE_MEMCPY_ROUNDTRIP_CUDA_HPP
