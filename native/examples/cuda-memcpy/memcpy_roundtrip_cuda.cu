#include "memcpy_roundtrip_cuda.hpp"

#include <cstdio>

#include "simulagpu/cuda_check.cuh"

// Reference CUDA implementation of a host->device->host round trip.
//
// This file is compiled only when the build was configured with CUDA support.
// It has never been compiled or executed in the environment where this example
// was authored (no nvcc, no GPU); see docs/sources.md. It makes no performance
// claim and runs no kernel: it exercises only cudaMemcpy in both directions.

namespace simulagpu::example {

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

void memcpy_roundtrip_cuda(const std::int32_t* input, std::int32_t* output, int n) {
  const std::size_t bytes = static_cast<std::size_t>(n) * sizeof(std::int32_t);

  std::int32_t* device_values = nullptr;

  // cudaMalloc reserves device storage; its contents are undefined until a copy
  // writes them. This is the distinction Primitiva B teaches.
  SIMULAGPU_CUDA_CHECK(cudaMalloc(&device_values, bytes));

  // Host to device: the input values must exist in device memory. The GPU
  // cannot dereference a host pointer.
  SIMULAGPU_CUDA_CHECK(cudaMemcpy(device_values, input, bytes, cudaMemcpyHostToDevice));

  // Device to host: bring the values back into a distinct host buffer. No
  // kernel ran, so a correct round trip must reproduce the input exactly.
  SIMULAGPU_CUDA_CHECK(cudaMemcpy(output, device_values, bytes, cudaMemcpyDeviceToHost));

  SIMULAGPU_CUDA_CHECK(cudaFree(device_values));
}

}  // namespace simulagpu::example
