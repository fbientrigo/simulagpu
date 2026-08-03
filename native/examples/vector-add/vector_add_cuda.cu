#include "vector_add_cuda.hpp"

#include <cstdio>

#include "simulagpu/cuda_check.cuh"
#include "simulagpu/launch.hpp"

// Reference CUDA implementation of vector addition.
//
// This file is compiled only when the build was configured with CUDA support.
// It has never been compiled or executed in the environment where v0.1 was
// authored (no nvcc, no GPU); see docs/sources.md.

namespace simulagpu::example {
namespace {

/// One thread per element.
///
/// The two lines that matter:
///   1. every thread derives its own global index from its coordinates;
///   2. the guard stops the threads of the last block that have no element.
///
/// Without the guard, `gridDim.x * blockDim.x - n` threads would write past the
/// end of `c` whenever n is not a multiple of blockDim.x.
__global__ void vector_add_kernel(const float* a, const float* b, float* c, int n) {
  const int i = blockIdx.x * blockDim.x + threadIdx.x;
  if (i < n) {
    c[i] = a[i] + b[i];
  }
}

}  // namespace

bool cuda_device_available() {
  int count = 0;
  const cudaError_t status = cudaGetDeviceCount(&count);
  if (status != cudaSuccess) {
    // Deliberately not fatal: this function exists to answer the question.
    std::fprintf(stderr, "cudaGetDeviceCount: %s\n", cudaGetErrorString(status));
    // Clear the sticky error so later calls report their own failures.
    cudaGetLastError();
    return false;
  }
  return count > 0;
}

const char* cuda_device_description() {
  static char description[320] = "(sin dispositivo)";
  cudaDeviceProp properties{};
  if (cudaGetDeviceProperties(&properties, 0) != cudaSuccess) {
    cudaGetLastError();
    return description;
  }
  std::snprintf(description, sizeof(description), "%s (compute capability %d.%d, %d SMs)",
                properties.name, properties.major, properties.minor,
                properties.multiProcessorCount);
  return description;
}

GpuTimings vector_add_cuda(const float* a, const float* b, float* c, int n, int block_size) {
  GpuTimings timings;

  // The end-to-end timer starts before the first allocation, because transfers
  // and allocations are part of what using a GPU costs.
  CudaTimer end_to_end;
  CudaTimer kernel_only;

  const size_t bytes = static_cast<size_t>(n) * sizeof(float);

  float* device_a = nullptr;
  float* device_b = nullptr;
  float* device_c = nullptr;

  end_to_end.start();

  SIMULAGPU_CUDA_CHECK(cudaMalloc(&device_a, bytes));
  SIMULAGPU_CUDA_CHECK(cudaMalloc(&device_b, bytes));
  SIMULAGPU_CUDA_CHECK(cudaMalloc(&device_c, bytes));

  // Host to device: the inputs must exist in device memory before the kernel
  // can read them. The GPU cannot dereference a host pointer.
  SIMULAGPU_CUDA_CHECK(cudaMemcpy(device_a, a, bytes, cudaMemcpyHostToDevice));
  SIMULAGPU_CUDA_CHECK(cudaMemcpy(device_b, b, bytes, cudaMemcpyHostToDevice));

  const int blocks = simulagpu::grid_size(n, block_size);

  kernel_only.start();
  vector_add_kernel<<<blocks, block_size>>>(device_a, device_b, device_c, n);
  kernel_only.stop();

  // Checks the launch configuration and any error raised while running.
  SIMULAGPU_CUDA_CHECK_KERNEL();

  // Device to host: the result is useless until it comes back.
  SIMULAGPU_CUDA_CHECK(cudaMemcpy(c, device_c, bytes, cudaMemcpyDeviceToHost));

  SIMULAGPU_CUDA_CHECK(cudaFree(device_a));
  SIMULAGPU_CUDA_CHECK(cudaFree(device_b));
  SIMULAGPU_CUDA_CHECK(cudaFree(device_c));

  end_to_end.stop();

  timings.kernel_ms = kernel_only.elapsed_ms();
  timings.end_to_end_ms = end_to_end.elapsed_ms();
  return timings;
}

}  // namespace simulagpu::example
