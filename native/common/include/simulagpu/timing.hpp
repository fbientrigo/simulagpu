#ifndef SIMULAGPU_TIMING_HPP
#define SIMULAGPU_TIMING_HPP

#include <chrono>

// Host-side wall-clock timing.
//
// `steady_clock` is monotonic and portable. Device-side timing is a separate
// concern and lives in `cuda_check.cuh` (CUDA events), because measuring a
// kernel with a host clock only works if the host has synchronized first --
// which is exactly the mistake the lesson warns about.

namespace simulagpu {

class Stopwatch {
 public:
  Stopwatch() : start_(Clock::now()) {}

  double elapsed_ms() const {
    const std::chrono::duration<double, std::milli> elapsed = Clock::now() - start_;
    return elapsed.count();
  }

 private:
  using Clock = std::chrono::steady_clock;
  Clock::time_point start_;
};

}  // namespace simulagpu

#endif  // SIMULAGPU_TIMING_HPP
