// Ejemplo ejecutable: reducción por pares en CPU y, si está disponible, CUDA.
//
// The CPU path is the correctness model. The CUDA path uses one launch per pass
// so each pass has a global ordering boundary. This is intentionally simple;
// the lesson discusses shared-memory optimization separately.

#include <cstdio>
#include <cstdlib>
#include <vector>

#include "simulagpu/reduction.hpp"
#include "simulagpu/timing.hpp"

#if defined(SIMULAGPU_WITH_CUDA)
#include "reduction_cuda.hpp"
#endif

namespace {

constexpr int kBlockSize = 256;

struct ExampleCase {
  const char* name;
  std::vector<float> values;
  double absolute_tolerance;
  double relative_tolerance;
};

const char* verdict(bool ok) { return ok ? "OK" : "FALLA"; }

}  // namespace

int main() {
  const std::vector<ExampleCase> cases{
      {"potencia de dos", {3.0F, 1.0F, 7.0F, 0.0F, 4.0F, 1.0F, 6.0F, 3.0F}, 0.0, 0.0},
      {"tamaño impar", {5.0F, 1.0F, 4.0F, 2.0F, 8.0F, 3.0F, 6.0F}, 0.0, 0.0},
      {"cancelación", {100000000.0F, 1.0F, -100000000.0F, 3.0F, 0.25F, 0.25F, 0.5F}, 4.0,
       1.0e-6},
  };

  std::printf("Reducción paralela — SimulaGPU\n");
  std::printf("Una pasada combina pares adyacentes y conserva una cola impar sumándola con cero.\n");

#if defined(SIMULAGPU_WITH_CUDA)
  const bool gpu = simulagpu::example::reduction::cuda_device_available();
  std::printf("Compilado con CUDA: sí\n");
  std::printf("Dispositivo: %s\n", gpu ? simulagpu::example::reduction::cuda_device_description()
                                       : "ninguno visible, solo se ejecuta la parte CPU");
#else
  constexpr bool gpu = false;
  std::printf("Compilado con CUDA: no (configuración solo-CPU)\n");
#endif

  std::printf("\n%-18s %8s %14s %14s %12s %12s %8s\n", "caso", "n", "referencia", "árbol CPU",
              "kernel ms", "total ms", "estado");

  int failures = 0;

  for (const ExampleCase& example : cases) {
    simulagpu::Stopwatch cpu_clock;
    const float cpu_value = simulagpu::reduce_pairwise(example.values);
    const double cpu_ms = cpu_clock.elapsed_ms();
    const double reference = simulagpu::sum_kahan_reference(example.values);
    bool ok = simulagpu::within_tolerance(cpu_value, reference, example.absolute_tolerance,
                                          example.relative_tolerance);

    float kernel_ms = 0.0F;
    float total_ms = 0.0F;

#if defined(SIMULAGPU_WITH_CUDA)
    if (gpu) {
      const auto result = simulagpu::example::reduction::reduce_cuda(
          example.values.data(), static_cast<int>(example.values.size()), kBlockSize);
      kernel_ms = result.kernel_ms;
      total_ms = result.end_to_end_ms;
      ok = ok && simulagpu::within_tolerance(result.value, reference, example.absolute_tolerance,
                                             example.relative_tolerance);
      if (!ok) {
        std::fprintf(stderr,
                     "%s: referencia=%.9g, árbol CPU=%.9g, GPU=%.9g. Revisa pares, cola impar y tolerancia.\n",
                     example.name, reference, static_cast<double>(cpu_value),
                     static_cast<double>(result.value));
      }
    }
#endif

    if (!ok) {
      ++failures;
    }

    std::printf("%-18s %8zu %14.6g %14.6g %12.3f %12.3f %8s\n", example.name,
                example.values.size(), reference, static_cast<double>(cpu_value),
                static_cast<double>(kernel_ms), static_cast<double>(total_ms), verdict(ok));
    std::printf("  tiempo CPU local: %.3f ms\n", cpu_ms);
  }

  if (!gpu) {
    std::printf(
        "\nNo se ejecutó CUDA. Las columnas de GPU quedan en 0.\n"
        "Para ejecutar kernels necesitas CUDA Toolkit, una GPU NVIDIA y -DSIMULAGPU_CUDA=ON.\n");
  } else {
    std::printf(
        "\nLos tiempos son mediciones de esta ejecución, no resultados publicados.\n"
        "'kernel' suma los eventos de todas las pasadas; 'total' incluye reserva y transferencias.\n");
  }

  return failures == 0 ? EXIT_SUCCESS : EXIT_FAILURE;
}
