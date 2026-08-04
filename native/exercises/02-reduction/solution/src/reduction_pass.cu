#include <cstdio>
#include <vector>

#include "simulagpu/cuda_check.cuh"
#include "simulagpu/launch.hpp"

namespace {

__global__ void reduction_pass_kernel(const float* input, float* output, int n) {
  const int out = blockIdx.x * blockDim.x + threadIdx.x;
  const int left = 2 * out;
  if (left < n) {
    const float right = left + 1 < n ? input[left + 1] : 0.0F;
    output[out] = input[left] + right;
  }
}

}  // namespace

int main() {
  const std::vector<float> input{2.0F, 4.0F, 6.0F, 8.0F, 10.0F};
  const std::vector<float> expected{6.0F, 14.0F, 10.0F};
  const int n = static_cast<int>(input.size());
  const int output_n = n / 2 + (n % 2 != 0 ? 1 : 0);
  std::vector<float> output(static_cast<std::size_t>(output_n), 0.0F);

  float* device_input = nullptr;
  float* device_output = nullptr;
  SIMULAGPU_CUDA_CHECK(cudaMalloc(&device_input, input.size() * sizeof(float)));
  SIMULAGPU_CUDA_CHECK(cudaMalloc(&device_output, output.size() * sizeof(float)));
  SIMULAGPU_CUDA_CHECK(cudaMemcpy(device_input, input.data(), input.size() * sizeof(float),
                                  cudaMemcpyHostToDevice));

  constexpr int block_size = 128;
  reduction_pass_kernel<<<simulagpu::grid_size(output_n, block_size), block_size>>>(
      device_input, device_output, n);
  SIMULAGPU_CUDA_CHECK_KERNEL();

  SIMULAGPU_CUDA_CHECK(cudaMemcpy(output.data(), device_output, output.size() * sizeof(float),
                                  cudaMemcpyDeviceToHost));
  SIMULAGPU_CUDA_CHECK(cudaFree(device_input));
  SIMULAGPU_CUDA_CHECK(cudaFree(device_output));

  const bool ok = output == expected;
  std::printf("Ejercicio 02 GPU: %s\n", ok ? "OK" : "FALLA");
  return ok ? 0 : 1;
}
