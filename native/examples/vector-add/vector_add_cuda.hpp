#ifndef SIMULAGPU_EXAMPLE_VECTOR_ADD_CUDA_HPP
#define SIMULAGPU_EXAMPLE_VECTOR_ADD_CUDA_HPP

// Host-side interface of the CUDA implementation.
//
// Plain C++: no CUDA type appears here, so `main.cpp` compiles with a normal
// compiler and only the .cu translation unit needs nvcc. This header is only
// included when the build was configured with CUDA support.

namespace simulagpu::example {

struct GpuTimings {
  /// Time spent inside the kernel, measured with CUDA events around the launch.
  float kernel_ms = 0.0f;
  /// Time for the whole operation: allocation, host->device copy, kernel,
  /// device->host copy, free. This is what a caller actually pays.
  float end_to_end_ms = 0.0f;
};

/// True when at least one CUDA device is visible and usable.
///
/// Returns false instead of aborting: "no GPU on this machine" is a normal
/// situation, not an error, and the example must still run its CPU half.
bool cuda_device_available();

/// Name and compute capability of device 0, or "(sin dispositivo)".
const char* cuda_device_description();

/// c[i] = a[i] + b[i] on the GPU. Aborts on any CUDA error.
GpuTimings vector_add_cuda(const float* a, const float* b, float* c, int n, int block_size);

}  // namespace simulagpu::example

#endif  // SIMULAGPU_EXAMPLE_VECTOR_ADD_CUDA_HPP
