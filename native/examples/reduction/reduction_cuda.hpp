#ifndef SIMULAGPU_EXAMPLE_REDUCTION_CUDA_HPP
#define SIMULAGPU_EXAMPLE_REDUCTION_CUDA_HPP

namespace simulagpu::example::reduction {

struct GpuReductionResult {
  float value = 0.0F;
  float kernel_ms = 0.0F;
  float end_to_end_ms = 0.0F;
};

bool cuda_device_available();
const char* cuda_device_description();

/// Adjacent-pair reduction using one kernel launch per pass.
/// Aborts on a CUDA API, launch, or execution error.
GpuReductionResult reduce_cuda(const float* input, int n, int block_size);

}  // namespace simulagpu::example::reduction

#endif  // SIMULAGPU_EXAMPLE_REDUCTION_CUDA_HPP
