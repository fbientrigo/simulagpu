# Standalone project for the student's working copy of exercise 01.
#
#   cmake -S . -B build -G Ninja
#   cmake --build build
#   ctest --test-dir build --output-on-failure
#
# The tests are red when you start. That is the point.
#
# With an NVIDIA GPU and nvcc you can additionally build the CUDA half:
#   cmake -S . -B build-cuda -G Ninja -DEXERCISE01_CUDA=ON

cmake_minimum_required(VERSION 3.20)
project(exercise01_vector_add_starter LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

option(EXERCISE01_CUDA "Build the CUDA part of the exercise" OFF)

if(NOT MSVC)
  add_compile_options(-Wall -Wextra -Wpedantic)
endif()

# Shared headers and the CPU oracle live in native/common. The starter is a
# separate CMake project, but it still lives inside the repository, so it reads
# them from there instead of carrying a copy that could drift.
set(SIMULAGPU_COMMON_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../../../common")

add_library(exercise01_starter STATIC
  src/index_math.cpp
  "${SIMULAGPU_COMMON_DIR}/src/vector_add_cpu.cpp"
)
target_include_directories(exercise01_starter PUBLIC
  "${CMAKE_CURRENT_SOURCE_DIR}/include"
  "${SIMULAGPU_COMMON_DIR}/include"
)

include(CTest)

if(BUILD_TESTING)
  # The same test file the reference solution is checked against.
  add_executable(test_exercise01 "${CMAKE_CURRENT_SOURCE_DIR}/../tests/test_index_math.cpp")
  target_link_libraries(test_exercise01 PRIVATE exercise01_starter)
  add_test(NAME exercise01.index_math COMMAND test_exercise01)
endif()

if(EXERCISE01_CUDA)
  enable_language(CUDA)
  set(CMAKE_CUDA_STANDARD 17)
  set(CMAKE_CUDA_STANDARD_REQUIRED ON)
  add_executable(ejercicio01_gpu src/vector_add.cu)
  target_link_libraries(ejercicio01_gpu PRIVATE exercise01_starter)
endif()
