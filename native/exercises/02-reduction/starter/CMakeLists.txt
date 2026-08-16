# Standalone project for the student's working copy of exercise 02.
#
#   cmake -S . -B build -G Ninja
#   cmake --build build
#   ctest --test-dir build --output-on-failure
#
# The tests are red when you start. That is the point.
# With nvcc and a GPU, add -DEXERCISE02_CUDA=ON to build the CUDA driver.

cmake_minimum_required(VERSION 3.20)
project(exercise02_reduction_starter LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

option(EXERCISE02_CUDA "Build the CUDA part of the exercise" OFF)

if(NOT MSVC)
  add_compile_options(-Wall -Wextra -Wpedantic)
endif()

set(SIMULAGPU_COMMON_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../../../common")

add_library(exercise02_starter STATIC src/reduction_step.cpp)
target_include_directories(exercise02_starter PUBLIC
  "${CMAKE_CURRENT_SOURCE_DIR}/include"
  "${SIMULAGPU_COMMON_DIR}/include"
)

include(CTest)

if(BUILD_TESTING)
  add_executable(test_exercise02 "${CMAKE_CURRENT_SOURCE_DIR}/../tests/test_reduction_step.cpp")
  target_link_libraries(test_exercise02 PRIVATE exercise02_starter)
  add_test(NAME exercise02.reduction_step COMMAND test_exercise02)
endif()

if(EXERCISE02_CUDA)
  enable_language(CUDA)
  set(CMAKE_CUDA_STANDARD 17)
  set(CMAKE_CUDA_STANDARD_REQUIRED ON)
  add_executable(ejercicio02_gpu src/reduction_pass.cu)
  target_link_libraries(ejercicio02_gpu PRIVATE exercise02_starter)
endif()
