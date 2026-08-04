# Runnable example for lesson 02.
#
# The CPU model always builds. The CUDA implementation is added only when nvcc
# was detected, preserving the repository's CPU-only configuration.

add_executable(reduction_example main.cpp)
target_link_libraries(reduction_example PRIVATE simulagpu_common)
target_compile_options(reduction_example PRIVATE ${SIMULAGPU_WARNINGS})

if(SIMULAGPU_WITH_CUDA)
  target_sources(reduction_example PRIVATE reduction_cuda.cu)
  target_compile_definitions(reduction_example PRIVATE SIMULAGPU_WITH_CUDA=1)
endif()

if(SIMULAGPU_BUILD_TESTS)
  add_test(NAME example.reduction COMMAND reduction_example)
endif()
