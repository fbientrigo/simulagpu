#include <cstdio>
#include <vector>

#include "exercise03/barrier_phase.hpp"
#include "simulagpu/cuda_check.cuh"
#include "simulagpu/launch.hpp"

// Starter GPU kernel for exercise 03. It compiles and runs, but the reversal is
// wrong because the two phases are not separated correctly.

namespace {

__global__ void block_reverse_kernel(const int* input, int* output, int n) {
  extern __shared__ int tile[];
  const int global = blockIdx.x * blockDim.x + threadIdx.x;
  const int local = threadIdx.x;

  if (global < n) {
    tile[local] = input[global];  // phase 1: publish
  }

  // TODO 4: falta la barrera. Sin __syncthreads() aquí, un hilo puede leer una
  // posición de `tile` que otro hilo todavía no escribió. Coloca la barrera
  // entre la fase 1 (publicar) y la fase 2 (leer al vecino).

  if (global < n) {
    // TODO 5: la fase 2 debe leer al vecino invertido dentro del bloque,
    // no la propia posición: usa tile[blockDim.x - 1 - local].
    output[global] = tile[local];
  }
}

}  // namespace

int main() {
  const int block_size = 4;
  const std::vector<int> input{10, 11, 12, 13, 20, 21, 22, 23};
  const std::vector<int> expected = exercise03::block_local_reverse(input, block_size);
  const int n = static_cast<int>(input.size());
  const std::size_t bytes = static_cast<std::size_t>(n) * sizeof(int);
  std::vector<int> output(input.size(), 0);

  int* device_input = nullptr;
  int* device_output = nullptr;
  SIMULAGPU_CUDA_CHECK(cudaMalloc(&device_input, bytes));
  SIMULAGPU_CUDA_CHECK(cudaMalloc(&device_output, bytes));
  SIMULAGPU_CUDA_CHECK(cudaMemcpy(device_input, input.data(), bytes, cudaMemcpyHostToDevice));

  const std::size_t shared_bytes = static_cast<std::size_t>(block_size) * sizeof(int);
  block_reverse_kernel<<<simulagpu::grid_size(n, block_size), block_size, shared_bytes>>>(
      device_input, device_output, n);
  SIMULAGPU_CUDA_CHECK_KERNEL();

  SIMULAGPU_CUDA_CHECK(cudaMemcpy(output.data(), device_output, bytes, cudaMemcpyDeviceToHost));
  SIMULAGPU_CUDA_CHECK(cudaFree(device_input));
  SIMULAGPU_CUDA_CHECK(cudaFree(device_output));

  const bool ok = output == expected;
  std::printf("Ejercicio 03 GPU: %s\n", ok ? "OK" : "FALLA");
  return ok ? 0 : 1;
}
