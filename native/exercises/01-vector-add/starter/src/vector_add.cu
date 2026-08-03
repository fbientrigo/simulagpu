// Parte CUDA del ejercicio 01 (opcional: necesitas una GPU NVIDIA y nvcc).
//
// Compila solo si configuras con -DEXERCISE01_CUDA=ON. Si no tienes GPU,
// resuelve primero index_math.cpp: es donde esta el 80% del ejercicio y se
// verifica con ctest sin hardware.
//
// Ejecuta el binario `ejercicio01_gpu` y compara contra la referencia de CPU.

#include <cstdio>
#include <cstdlib>
#include <vector>

#include "exercise01/index_math.hpp"
#include "simulagpu/cuda_check.cuh"
#include "simulagpu/vector_add_cpu.hpp"

namespace {

__global__ void vector_add_kernel(const float* a, const float* b, float* c, int n) {
  // TODO 5 — Indice global dentro del kernel.
  //
  // Tal como esta, todos los hilos escriben en c[0]: el resultado es basura y
  // ademas hay una carrera entre miles de hilos por la misma direccion.
  //
  // Usa blockIdx.x, blockDim.x y threadIdx.x.
  const int i = 0;

  // TODO 6 — Guard.
  //
  // Falta la condicion que impide que los hilos sobrantes del ultimo bloque
  // escriban fuera de c. Anadela antes de tocar memoria.
  c[i] = a[i] + b[i];
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

  // TODO 7 — Configuracion del lanzamiento.
  //
  // `blocks` debe salir de exercise01::grid_size (TODO 3), no de una division
  // entera cualquiera. Con 1 bloque fijo solo se calculan los primeros
  // block_size elementos.
  const int blocks = 1;

  vector_add_kernel<<<blocks, block_size>>>(device_a, device_b, device_c, n);
  SIMULAGPU_CUDA_CHECK_KERNEL();

  SIMULAGPU_CUDA_CHECK(cudaMemcpy(from_device.data(), device_c, bytes, cudaMemcpyDeviceToHost));

  SIMULAGPU_CUDA_CHECK(cudaFree(device_a));
  SIMULAGPU_CUDA_CHECK(cudaFree(device_b));
  SIMULAGPU_CUDA_CHECK(cudaFree(device_c));

  // TODO 8 — Verificacion.
  //
  // Usa exercise01::first_mismatch (TODO 4) e informa el resultado. El
  // programa debe terminar con codigo distinto de cero si hay diferencias.
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
