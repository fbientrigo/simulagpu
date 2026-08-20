// Ejemplo ejecutable: una barrera de bloque separa dos fases dependientes.
//
// The program is a driver, not a benchmark. It reverses an array *within each
// block*: phase 1 publishes every thread's value, and phase 2 reads a sibling's
// value. On the GPU those phases must be separated by __syncthreads(); the CPU
// oracle is correct for the same reason, because it runs the phases in order.
// No timing is reported. Exit status is non-zero only if the GPU result differs
// from the oracle, so CTest can run it as a smoke test.

#include <cstdio>
#include <vector>

#include "syncthreads_phase.hpp"

#if defined(SIMULAGPU_WITH_CUDA)
#include "syncthreads_phase_cuda.hpp"
#endif

int main() {
  std::printf("__syncthreads() — barrera de bloque entre dos fases — SimulaGPU\n");

  // Two full blocks of four threads: no partial block, so the barrier has
  // uniform participation (the divergent case is a trap, not a demo).
  const int block_size = 4;
  const std::vector<int> input = {10, 11, 12, 13, 20, 21, 22, 23};
  const std::vector<int> oracle = simulagpu::example::block_local_reverse(input, block_size);

  std::printf("Entrada:  ");
  for (const int value : input) std::printf("%d ", value);
  std::printf("\nEsperado: ");
  for (const int value : oracle) std::printf("%d ", value);
  std::printf("\n");

#if defined(SIMULAGPU_WITH_CUDA)
  if (simulagpu::example::cuda_device_available()) {
    std::printf("Dispositivo: %s\n", simulagpu::example::cuda_device_description());
    const std::vector<int> device_result =
        simulagpu::example::block_local_reverse_cuda(input, block_size);

    std::printf("GPU:      ");
    for (const int value : device_result) std::printf("%d ", value);
    std::printf("\n");

    if (device_result == oracle) {
      std::printf("Correcto: la barrera separó las fases y el resultado coincide con el oráculo CPU.\n");
      return 0;
    }
    std::fprintf(stderr, "El resultado de la GPU no coincide con el oráculo CPU.\n");
    return 1;
  }
  std::printf("Compilado con CUDA, pero no hay dispositivo visible: no se ejecuta el kernel.\n");
  return 0;
#else
  std::printf("Compilado sin CUDA (configuración solo-CPU): se muestra el resultado del oráculo.\n");
  std::printf("Configura con -DSIMULAGPU_CUDA=ON en una máquina con GPU para ejecutar el kernel.\n");
  return 0;
#endif
}
