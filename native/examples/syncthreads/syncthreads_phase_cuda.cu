#include "syncthreads_phase_cuda.hpp"

#include <cstdio>

#include "simulagpu/cuda_check.cuh"
#include "simulagpu/launch.hpp"

// Reference CUDA implementation of a block-local reversal.
//
// This file is compiled only when the build was configured with CUDA support.
// It has never been compiled or executed in the environment where this example
// was authored (no nvcc, no GPU); see docs/sources.md. It makes no performance
// claim. Its whole point is the barrier: without __syncthreads() between the
// publish phase and the read phase, a thread could read a sibling slot before
// that sibling wrote it.

namespace simulagpu::example {

namespace {

__global__ void block_reverse_kernel(const int* input, int* output, int n) {
  // Block-local scratch. This example is about the barrier, not about shared
  // memory as a concept (that is a later primitive): the scratch only exists so
  // that one thread can hand a value to another within the block.
  extern __shared__ int tile[];

  const int global = blockIdx.x * blockDim.x + threadIdx.x;
  const int local = threadIdx.x;

  // Phase 1 — publish: each active thread writes its own value.
  if (global < n) {
    tile[local] = input[global];
  }

  // Barrier: the whole block reaches this point before any thread reads a value
  // a sibling published. This is the correctness boundary between the phases.
  __syncthreads();

  // Phase 2 — read a sibling: reverse within the block.
  if (global < n) {
    output[global] = tile[blockDim.x - 1 - local];
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

std::vector<int> block_local_reverse_cuda(const std::vector<int>& input, int block_size) {
  const int n = static_cast<int>(input.size());
  const std::size_t bytes = static_cast<std::size_t>(n) * sizeof(int);
  std::vector<int> output(input.size(), 0);

  int* device_input = nullptr;
  int* device_output = nullptr;
  SIMULAGPU_CUDA_CHECK(cudaMalloc(&device_input, bytes));
  SIMULAGPU_CUDA_CHECK(cudaMalloc(&device_output, bytes));
  SIMULAGPU_CUDA_CHECK(cudaMemcpy(device_input, input.data(), bytes, cudaMemcpyHostToDevice));

  const int blocks = simulagpu::grid_size(n, block_size);
  const std::size_t shared_bytes = static_cast<std::size_t>(block_size) * sizeof(int);
  block_reverse_kernel<<<blocks, block_size, shared_bytes>>>(device_input, device_output, n);
  SIMULAGPU_CUDA_CHECK_KERNEL();

  SIMULAGPU_CUDA_CHECK(cudaMemcpy(output.data(), device_output, bytes, cudaMemcpyDeviceToHost));
  SIMULAGPU_CUDA_CHECK(cudaFree(device_input));
  SIMULAGPU_CUDA_CHECK(cudaFree(device_output));
  return output;
}

}  // namespace simulagpu::example
