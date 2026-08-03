#ifndef SIMULAGPU_CUDA_CHECK_CUH
#define SIMULAGPU_CUDA_CHECK_CUH

// CUDA error reporting and device-side timing.
//
// This header is only reachable from translation units compiled by nvcc; the
// CPU-only configuration never includes it.
//
// Policy (see docs/adr/0003-cuda-error-handling.md): a failed CUDA call stops
// the program. Printing a message and continuing produces a cascade of
// unrelated follow-up errors, and the first real cause scrolls away.

#include <cuda_runtime.h>

#include <cstdio>
#include <cstdlib>

namespace simulagpu {

inline void cuda_check(cudaError_t status, const char* expression, const char* file, int line) {
  if (status != cudaSuccess) {
    std::fprintf(stderr, "CUDA error at %s:%d\n  call:   %s\n  code:   %d (%s)\n  reason: %s\n", file,
                 line, expression, static_cast<int>(status), cudaGetErrorName(status),
                 cudaGetErrorString(status));
    std::exit(EXIT_FAILURE);
  }
}

/// Times a region of device work with CUDA events.
///
/// Events are recorded in the stream, so they measure device time without
/// needing the host to block around the launch. `elapsed_ms` synchronizes on
/// the stop event, which is the only synchronization required.
class CudaTimer {
 public:
  CudaTimer() {
    cuda_check(cudaEventCreate(&start_), "cudaEventCreate(start)", __FILE__, __LINE__);
    cuda_check(cudaEventCreate(&stop_), "cudaEventCreate(stop)", __FILE__, __LINE__);
  }

  ~CudaTimer() {
    cudaEventDestroy(start_);
    cudaEventDestroy(stop_);
  }

  CudaTimer(const CudaTimer&) = delete;
  CudaTimer& operator=(const CudaTimer&) = delete;

  void start(cudaStream_t stream = nullptr) {
    cuda_check(cudaEventRecord(start_, stream), "cudaEventRecord(start)", __FILE__, __LINE__);
  }

  void stop(cudaStream_t stream = nullptr) {
    cuda_check(cudaEventRecord(stop_, stream), "cudaEventRecord(stop)", __FILE__, __LINE__);
  }

  float elapsed_ms() {
    cuda_check(cudaEventSynchronize(stop_), "cudaEventSynchronize(stop)", __FILE__, __LINE__);
    float milliseconds = 0.0f;
    cuda_check(cudaEventElapsedTime(&milliseconds, start_, stop_), "cudaEventElapsedTime", __FILE__,
               __LINE__);
    return milliseconds;
  }

 private:
  cudaEvent_t start_{};
  cudaEvent_t stop_{};
};

}  // namespace simulagpu

/// Wrap every CUDA runtime call that returns a `cudaError_t`.
#define SIMULAGPU_CUDA_CHECK(call) ::simulagpu::cuda_check((call), #call, __FILE__, __LINE__)

/// Call immediately after a kernel launch.
///
/// A launch reports two different kinds of failure. `cudaGetLastError` catches
/// configuration errors (too many threads per block, bad shared-memory size);
/// `cudaDeviceSynchronize` catches errors raised while the kernel ran (an
/// illegal address, for instance). Checking only one of them hides half the
/// bugs.
#define SIMULAGPU_CUDA_CHECK_KERNEL()                                     \
  do {                                                                    \
    ::simulagpu::cuda_check(cudaGetLastError(), "kernel launch", __FILE__, \
                            __LINE__);                                    \
    ::simulagpu::cuda_check(cudaDeviceSynchronize(), "cudaDeviceSynchronize after kernel", \
                            __FILE__, __LINE__);                          \
  } while (0)

#endif  // SIMULAGPU_CUDA_CHECK_CUH
