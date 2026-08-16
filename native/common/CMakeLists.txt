# Shared, CUDA-free building blocks. Everything here compiles with a plain C++
# compiler so the whole CPU side stays testable without a GPU.

add_library(simulagpu_common STATIC
  src/vector_add_cpu.cpp
)

target_include_directories(simulagpu_common PUBLIC
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
)

target_compile_options(simulagpu_common PRIVATE ${SIMULAGPU_WARNINGS})
add_library(simulagpu::common ALIAS simulagpu_common)

if(SIMULAGPU_BUILD_TESTS)
  foreach(test_name launch vector_add_cpu reduction)
    add_executable(test_${test_name} tests/test_${test_name}.cpp)
    target_link_libraries(test_${test_name} PRIVATE simulagpu_common)
    target_compile_options(test_${test_name} PRIVATE ${SIMULAGPU_WARNINGS})
    add_test(NAME common.${test_name} COMMAND test_${test_name})
  endforeach()
endif()
