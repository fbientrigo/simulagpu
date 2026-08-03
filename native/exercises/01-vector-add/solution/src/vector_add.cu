// Solucion de referencia de la parte CUDA del ejercicio 01.
//
// Compila solo con soporte CUDA activo. En el entorno donde se escribio la
// v0.1 no habia nvcc ni GPU, asi que este archivo no ha sido compilado ni
// ejecutado; ver docs/sources.md.

#include <cstdio>
#include <cstdlib>
#include <vector>

#include "exercise01/index_math.hpp"
#include "simulagpu/cuda_check.cuh"
#include "simulagpu/vector_add_cpu.hpp"

namespace {

__global__ void vector_add_kernel(const float* a, const float* b, float* c, int n) {
  // TODO 5 resuelto: cada hilo deduce su propio indice a partir de sus
  // coordenadas dentro de la grilla.
  const int i = blockIdx.x * blockDim.x + threadIdx.x;

  // TODO 6 resuelto: los hilos sobrantes del ultimo bloque no tocan memoria.
  if (i < n) {
    c[i] = a[i] + b[i];
  }
}

}  // namespace

int main() {
  const int n = 1000;
  const int block_size = 256;

  const std::vector<float> a = simulagpu::make_input(n, 1u);
  const std::vector<float> b = simulagpu::make_input(n, 2u);

  std::vector<float> reference(static_cast<size_t>(n), 0.0f);
  simulagpu::vector_add(a.data(), b.data(), reference.data(), n);

  std::vector<float> from_device(static_cast<size_t>(n), 0.0f);
  const size_t bytes = static_cast<size_t>(n) * sizeof(float);

  float* device_a = nullptr;
  float* device_b = nullptr;
  float* device_c = nullptr;
  SIMULAGPU_CUDA_CHECK(cudaMalloc(&device_a, bytes));
  SIMULAGPU_CUDA_CHECK(cudaMalloc(&device_b, bytes));
  SIMULAGPU_CUDA_CHECK(cudaMalloc(&device_c, bytes));

  SIMULAGPU_CUDA_CHECK(cudaMemcpy(device_a, a.data(), bytes, cudaMemcpyHostToDevice));
  SIMULAGPU_CUDA_CHECK(cudaMemcpy(device_b, b.data(), bytes, cudaMemcpyHostToDevice));

  // TODO 7 resuelto: el numero de bloques sale de la misma funcion que las
  // pruebas de CPU ya verificaron.
  const int blocks = exercise01::grid_size(n, block_size);

  vector_add_kernel<<<blocks, block_size>>>(device_a, device_b, device_c, n);
  SIMULAGPU_CUDA_CHECK_KERNEL();

  SIMULAGPU_CUDA_CHECK(cudaMemcpy(from_device.data(), device_c, bytes, cudaMemcpyDeviceToHost));

  SIMULAGPU_CUDA_CHECK(cudaFree(device_a));
  SIMULAGPU_CUDA_CHECK(cudaFree(device_b));
  SIMULAGPU_CUDA_CHECK(cudaFree(device_c));

  // TODO 8 resuelto.
  const int mismatch = exercise01::first_mismatch(reference.data(), from_device.data(), n);
  if (mismatch >= 0) {
    std::fprintf(stderr, "Diferencia en i=%d: cpu=%.9g gpu=%.9g\n", mismatch,
                 static_cast<double>(reference[static_cast<size_t>(mismatch)]),
                 static_cast<double>(from_device[static_cast<size_t>(mismatch)]));
    std::printf("PRUEBA FALLIDA\n");
    return EXIT_FAILURE;
  }

  std::printf("PRUEBA SUPERADA (n=%d, blockDim.x=%d, gridDim.x=%d)\n", n, block_size, blocks);
  return EXIT_SUCCESS;
}
