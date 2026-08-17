// Ejemplo ejecutable: ida y vuelta host -> device -> host con cudaMemcpy.
//
// The program is a driver, not a benchmark. It sends a small host array to the
// device with a Host->Device copy and brings it back into a *different* host
// buffer with a Device->Host copy, then checks that every value survived the
// round trip. No kernel runs and no timing is reported. Exit status is non-zero
// if any value fails to match, so CTest can run it as a smoke test.

#include <cstdint>
#include <cstdio>
#include <vector>

#if defined(SIMULAGPU_WITH_CUDA)
#include "memcpy_roundtrip_cuda.hpp"
#endif

int main() {
  std::printf("cudaMemcpy — ida y vuelta host/device — SimulaGPU\n");

  // The five-element int32 buffer the browser lesson uses as its canonical H2D
  // scene, so the runnable example and the visualization tell the same story.
  const std::vector<std::int32_t> input = {4, 7, 1, 9, 3};
  const int n = static_cast<int>(input.size());

  // A distinct sentinel so a missing copy would be obvious rather than silently
  // matching: -1 never appears in the input.
  std::vector<std::int32_t> output(input.size(), -1);

#if defined(SIMULAGPU_WITH_CUDA)
  if (simulagpu::example::cuda_device_available()) {
    std::printf("Dispositivo: %s\n", simulagpu::example::cuda_device_description());
    simulagpu::example::memcpy_roundtrip_cuda(input.data(), output.data(), n);

    int failures = 0;
    for (int i = 0; i < n; ++i) {
      if (output[static_cast<std::size_t>(i)] != input[static_cast<std::size_t>(i)]) {
        ++failures;
        std::fprintf(stderr, "i=%d: esperado %d, obtenido %d tras la ida y vuelta.\n", i,
                     input[static_cast<std::size_t>(i)], output[static_cast<std::size_t>(i)]);
      }
    }

    if (failures == 0) {
      std::printf("Ida y vuelta correcta: los %d valores regresaron intactos.\n", n);
      return 0;
    }
    std::fprintf(stderr, "Fallaron %d de %d valores en la ida y vuelta.\n", failures, n);
    return 1;
  }
  std::printf("Compilado con CUDA, pero no hay dispositivo visible: no se ejecuta la copia.\n");
  return 0;
#else
  std::printf("Compilado sin CUDA (configuración solo-CPU): no hay copias que ejecutar.\n");
  std::printf("Configura con -DSIMULAGPU_CUDA=ON en una máquina con GPU para ver la ida y vuelta.\n");
  (void)output;
  (void)n;
  return 0;
#endif
}
