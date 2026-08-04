#include "reduction_cuda.hpp"

#include <cstdio>
#include <utility>

#include "simulagpu/cuda_check.cuh"
#include "simulagpu/launch.hpp"
#include "simulagpu/reduction.hpp"

// Introductory CUDA implementation for lesson 02.
//
// One launch performs one adjacent-pair pass in global memory. This is not the
// optimized shared-memory version; the simple global boundary between passes is
// intentional because it makes correctness and odd-size handling explicit.
//
// This translation unit is not compiled in CPU-only CI and no performance
// number from it is published by the repository.

namespace simulagpu::example::reduction {
namespace {

__global__ void reduction_pass_kernel(const float* input, float* output, int n) {
  const int out = blockIdx.x * blockDim.x + threadIdx.x;
  const int left = 2 * out;
  if (left < n) {
    const float right = left + 1 < n ? input[left + 1] : 0.0F;
    output[out] = input[left] + right;
  }
}

}  // namespace

bool cuda_device_available() {
  int count = 0;
  const cudaError_t status = cudaGetDeviceCount(&count);
  if (status != cudaSuccess) {
    std::fprintf(stderr, "cudaGetDeviceCount: %s\n", cudaGetErrorString(status));
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

GpuReductionResult reduce_cuda(const float* input, int n, int block_size) {
  if (n <= 0) {
    std::fprintf(stderr, "reduce_cuda: n debe ser positivo\n");
    std::exit(EXIT_FAILURE);
  }

  GpuReductionResult result;
  const std::size_t bytes = static_cast<std::size_t>(n) * sizeof(float);
  float* device_input = nullptr;
  float* device_output = nullptr;

  CudaTimer end_to_end;
  CudaTimer pass_timer;
  end_to_end.start();

  SIMULAGPU_CUDA_CHECK(cudaMalloc(&device_input, bytes));
  SIMULAGPU_CUDA_CHECK(cudaMalloc(&device_output, bytes));
  SIMULAGPU_CUDA_CHECK(cudaMemcpy(device_input, input, bytes, cudaMemcpyHostToDevice));

  int current_n = n;
  while (current_n > 1) {
    const int next_n = simulagpu::reduction_output_size(current_n);
    const int blocks = simulagpu::grid_size(next_n, block_size);

    pass_timer.start();
    reduction_pass_kernel<<<blocks, block_size>>>(device_input, device_output, current_n);
    pass_timer.stop();
    SIMULAGPU_CUDA_CHECK(cudaGetLastError());
    result.kernel_ms += pass_timer.elapsed_ms();

    std::swap(device_input, device_output);
    current_n = next_n;
  }

  SIMULAGPU_CUDA_CHECK(cudaMemcpy(&result.value, device_input, sizeof(float), cudaMemcpyDeviceToHost));
  SIMULAGPU_CUDA_CHECK(cudaFree(device_input));
  SIMULAGPU_CUDA_CHECK(cudaFree(device_output));

  end_to_end.stop();
  result.end_to_end_ms = end_to_end.elapsed_ms();
  return result;
}

}  // namespace simulagpu::example::reduction
