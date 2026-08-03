// Ejemplo ejecutable: suma de vectores en CPU y, si esta disponible, en GPU.
//
// The program is a driver, not a benchmark. It prints timings so that the
// difference between kernel-only and end-to-end cost is visible, and it
// compares every GPU result against the sequential CPU oracle. Exit status is
// non-zero if any comparison fails, so CTest can run it as a smoke test.

#include <cstdio>
#include <cstdlib>
#include <vector>

#include "simulagpu/launch.hpp"
#include "simulagpu/timing.hpp"
#include "simulagpu/vector_add_cpu.hpp"

#if defined(SIMULAGPU_WITH_CUDA)
#include "vector_add_cuda.hpp"
#endif

namespace {

/// The sizes the lesson promises to cover, with a block size of 256:
/// one element, well under a block, exactly one block, one past a block,
/// a size that is not a multiple of the block size, and a large input.
constexpr int kBlockSize = 256;
constexpr int kSizes[] = {1, 100, 256, 257, 1000, 1 << 22};

const char* verdict(bool ok) { return ok ? "OK" : "FALLA"; }

}  // namespace

int main() {
  std::printf("Suma de vectores — SimulaGPU\n");
  std::printf("blockDim.x = %d\n", kBlockSize);

#if defined(SIMULAGPU_WITH_CUDA)
  const bool gpu = simulagpu::example::cuda_device_available();
  std::printf("Compilado con CUDA: sí\n");
  std::printf("Dispositivo: %s\n", gpu ? simulagpu::example::cuda_device_description()
                                       : "ninguno visible, solo se ejecuta la parte CPU");
#else
  constexpr bool gpu = false;
  std::printf("Compilado con CUDA: no (configuración solo-CPU)\n");
#endif

  std::printf("\n%10s %8s %10s %12s %12s %12s %8s\n", "n", "gridDim", "inactivos", "cpu (ms)",
              "kernel (ms)", "total (ms)", "estado");

  int failures = 0;

  for (const int n : kSizes) {
    const std::vector<float> a = simulagpu::make_input(n, 1u);
    const std::vector<float> b = simulagpu::make_input(n, 2u);
    std::vector<float> reference(static_cast<size_t>(n), 0.0f);

    simulagpu::Stopwatch host_clock;
    simulagpu::vector_add(a.data(), b.data(), reference.data(), n);
    const double cpu_ms = host_clock.elapsed_ms();

    const int blocks = simulagpu::grid_size(n, kBlockSize);
    const int inactive = simulagpu::total_threads(n, kBlockSize) - n;

    bool ok = true;
    double kernel_ms = 0.0;
    double total_ms = 0.0;

#if defined(SIMULAGPU_WITH_CUDA)
    if (gpu) {
      std::vector<float> from_device(static_cast<size_t>(n), 0.0f);
      const simulagpu::example::GpuTimings timings =
          simulagpu::example::vector_add_cuda(a.data(), b.data(), from_device.data(), n, kBlockSize);
      kernel_ms = timings.kernel_ms;
      total_ms = timings.end_to_end_ms;

      // Plain addition is exactly representable the same way on both sides, so
      // the tolerance is zero. A difference here is a bug, not rounding.
      const int mismatch =
          simulagpu::first_mismatch(reference.data(), from_device.data(), n, 0.0f);
      ok = mismatch < 0;
      if (!ok) {
        ++failures;
        std::fprintf(stderr,
                     "n=%d: primera diferencia en i=%d (cpu=%.9g, gpu=%.9g). "
                     "Revisa el índice global y el guard i < n.\n",
                     n, mismatch, static_cast<double>(reference[static_cast<size_t>(mismatch)]),
                     static_cast<double>(from_device[static_cast<size_t>(mismatch)]));
      }
    }
#endif

    std::printf("%10d %8d %10d %12.3f %12.3f %12.3f %8s\n", n, blocks, inactive, cpu_ms, kernel_ms,
                total_ms, gpu ? verdict(ok) : "cpu");
  }

  if (!gpu) {
    std::printf(
        "\nNo se ejecutó ningún kernel CUDA. Las columnas 'kernel' y 'total' quedan en 0.\n"
        "Para medirlas necesitas una GPU NVIDIA y configurar con -DSIMULAGPU_CUDA=ON.\n");
  } else {
    std::printf(
        "\n'kernel' mide solo la ejecución del kernel (eventos CUDA).\n"
        "'total' incluye cudaMalloc, las dos transferencias y cudaFree: es lo que\n"
        "realmente cuesta usar la GPU para este cálculo.\n");
  }

  return failures == 0 ? EXIT_SUCCESS : EXIT_FAILURE;
}
