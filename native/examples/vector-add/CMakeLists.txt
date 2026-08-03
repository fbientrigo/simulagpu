# Runnable example for lesson 01.
#
# The driver is plain C++ and always builds. The .cu translation unit is added
# only when the configuration found a CUDA compiler, and the driver switches on
# the SIMULAGPU_WITH_CUDA define that comes with it.

add_executable(vector_add_example main.cpp)
target_link_libraries(vector_add_example PRIVATE simulagpu_common)
target_compile_options(vector_add_example PRIVATE ${SIMULAGPU_WARNINGS})

if(SIMULAGPU_WITH_CUDA)
  target_sources(vector_add_example PRIVATE vector_add_cuda.cu)
  target_compile_definitions(vector_add_example PRIVATE SIMULAGPU_WITH_CUDA=1)
endif()

if(SIMULAGPU_BUILD_TESTS)
  # Runs as a smoke test. Without a GPU it exercises only the CPU path, which
  # is exactly what CI is expected to cover.
  add_test(NAME example.vector_add COMMAND vector_add_example)
endif()
