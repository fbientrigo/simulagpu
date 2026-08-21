# Standalone project for the student's working copy of exercise 03.
#
#   cmake -S . -B build -G Ninja
#   cmake --build build
#   ctest --test-dir build --output-on-failure
#
# The tests are red when you start. That is the point.
# With nvcc and a GPU, add -DEXERCISE03_CUDA=ON to build the CUDA driver.

cmake_minimum_required(VERSION 3.20)
project(exercise03_syncthreads_starter LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

option(EXERCISE03_CUDA "Build the CUDA part of the exercise" OFF)

if(NOT MSVC)
  add_compile_options(-Wall -Wextra -Wpedantic)
endif()

set(SIMULAGPU_COMMON_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../../../common")

add_library(exercise03_starter STATIC src/barrier_phase.cpp)
target_include_directories(exercise03_starter PUBLIC
  "${CMAKE_CURRENT_SOURCE_DIR}/include"
  "${SIMULAGPU_COMMON_DIR}/include"
)

include(CTest)

if(BUILD_TESTING)
  add_executable(test_exercise03 "${CMAKE_CURRENT_SOURCE_DIR}/../tests/test_barrier_phase.cpp")
  target_link_libraries(test_exercise03 PRIVATE exercise03_starter)
  add_test(NAME exercise03.barrier_phase COMMAND test_exercise03)
endif()

if(EXERCISE03_CUDA)
  enable_language(CUDA)
  set(CMAKE_CUDA_STANDARD 17)
  set(CMAKE_CUDA_STANDARD_REQUIRED ON)
  add_executable(ejercicio03_gpu src/barrier_phase.cu)
  target_link_libraries(ejercicio03_gpu PRIVATE exercise03_starter)
endif()
