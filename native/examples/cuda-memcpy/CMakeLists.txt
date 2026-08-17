# Runnable example for Primitiva B — cudaMemcpy.
#
# The driver is plain C++ and always builds. The .cu translation unit is added
# only when the configuration found a CUDA compiler, and the driver switches on
# the SIMULAGPU_WITH_CUDA define that comes with it. Without CUDA the example
# runs and reports that there is nothing to copy, keeping the CPU-only build green.

add_executable(cuda_memcpy_example main.cpp)
target_link_libraries(cuda_memcpy_example PRIVATE simulagpu_common)
target_compile_options(cuda_memcpy_example PRIVATE ${SIMULAGPU_WARNINGS})

if(SIMULAGPU_WITH_CUDA)
  target_sources(cuda_memcpy_example PRIVATE memcpy_roundtrip_cuda.cu)
  target_compile_definitions(cuda_memcpy_example PRIVATE SIMULAGPU_WITH_CUDA=1)
endif()

if(SIMULAGPU_BUILD_TESTS)
  # Runs as a smoke test. Without a GPU it exercises only the CPU path, which is
  # exactly what CI is expected to cover.
  add_test(NAME example.cuda_memcpy COMMAND cuda_memcpy_example)
endif()
