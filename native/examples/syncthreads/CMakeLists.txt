# Runnable example for Primitiva C — __syncthreads().
#
# The driver is plain C++ and always builds; it prints the CPU oracle result.
# The .cu translation unit is added only when the configuration found a CUDA
# compiler, and the driver switches on the SIMULAGPU_WITH_CUDA define. Without
# CUDA the example still runs and reports the oracle, keeping the CPU-only build
# green.

add_executable(syncthreads_example main.cpp)
target_link_libraries(syncthreads_example PRIVATE simulagpu_common)
target_compile_options(syncthreads_example PRIVATE ${SIMULAGPU_WARNINGS})

if(SIMULAGPU_WITH_CUDA)
  target_sources(syncthreads_example PRIVATE syncthreads_phase_cuda.cu)
  target_compile_definitions(syncthreads_example PRIVATE SIMULAGPU_WITH_CUDA=1)
endif()

if(SIMULAGPU_BUILD_TESTS)
  # Runs as a smoke test. Without a GPU it exercises only the CPU oracle path,
  # which is exactly what CI is expected to cover.
  add_test(NAME example.syncthreads COMMAND syncthreads_example)
endif()
