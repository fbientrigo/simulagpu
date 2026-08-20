cmake_minimum_required(VERSION 3.20)

# CUDA is *not* declared here. It is enabled below only if a CUDA compiler is
# actually available, so that a machine without nvcc can configure, build and
# test the whole CPU side of the project.
project(simulagpu_native LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

if(NOT CMAKE_BUILD_TYPE AND NOT CMAKE_CONFIGURATION_TYPES)
  set(CMAKE_BUILD_TYPE RelWithDebInfo CACHE STRING "Build type" FORCE)
endif()

# ---------------------------------------------------------------------------
# Options
# ---------------------------------------------------------------------------
set(SIMULAGPU_CUDA "AUTO" CACHE STRING
    "CUDA support: AUTO (use it if nvcc is found), ON (require it), OFF (never).")
set_property(CACHE SIMULAGPU_CUDA PROPERTY STRINGS AUTO ON OFF)

option(SIMULAGPU_BUILD_TESTS "Build the CTest suite" ON)
option(SIMULAGPU_ENABLE_SANITIZERS "Build with AddressSanitizer + UndefinedBehaviorSanitizer" OFF)

# ---------------------------------------------------------------------------
# Warnings, applied to our targets only
# ---------------------------------------------------------------------------
if(MSVC)
  set(SIMULAGPU_WARNINGS /W4 /permissive-)
else()
  set(SIMULAGPU_WARNINGS -Wall -Wextra -Wpedantic -Wshadow -Wconversion)
endif()

if(SIMULAGPU_ENABLE_SANITIZERS)
  if(MSVC)
    message(FATAL_ERROR "SIMULAGPU_ENABLE_SANITIZERS is only wired up for GCC/Clang.")
  endif()
  message(STATUS "Sanitizers: address, undefined")
  add_compile_options(-fsanitize=address,undefined -fno-omit-frame-pointer -g)
  add_link_options(-fsanitize=address,undefined)
endif()

# ---------------------------------------------------------------------------
# Optional CUDA detection
#
# SIMULAGPU_WITH_CUDA is the single flag the rest of the tree reads. When it is
# OFF, no .cu file is compiled and no CUDA header is included anywhere.
# ---------------------------------------------------------------------------
set(SIMULAGPU_WITH_CUDA OFF)

if(NOT SIMULAGPU_CUDA STREQUAL "OFF")
  include(CheckLanguage)
  check_language(CUDA)

  if(CMAKE_CUDA_COMPILER)
    enable_language(CUDA)
    set(CMAKE_CUDA_STANDARD 17)
    set(CMAKE_CUDA_STANDARD_REQUIRED ON)
    if(NOT DEFINED CMAKE_CUDA_ARCHITECTURES)
      # "native" needs CMake >= 3.24 and a visible device; fall back to a
      # widely supported pair of architectures otherwise.
      if(CMAKE_VERSION VERSION_GREATER_EQUAL 3.24)
        set(CMAKE_CUDA_ARCHITECTURES native)
      else()
        set(CMAKE_CUDA_ARCHITECTURES 70 86)
      endif()
    endif()
    set(SIMULAGPU_WITH_CUDA ON)
    message(STATUS "CUDA: enabled (${CMAKE_CUDA_COMPILER})")
  elseif(SIMULAGPU_CUDA STREQUAL "ON")
    message(FATAL_ERROR
      "SIMULAGPU_CUDA=ON but no CUDA compiler was found. "
      "Install the CUDA Toolkit or configure with -DSIMULAGPU_CUDA=OFF.")
  else()
    message(STATUS "CUDA: not found, building the CPU-only configuration")
  endif()
else()
  message(STATUS "CUDA: disabled by SIMULAGPU_CUDA=OFF")
endif()

if(SIMULAGPU_BUILD_TESTS)
  include(CTest)
  enable_testing()
endif()

add_subdirectory(common)
add_subdirectory(examples/vector-add)
add_subdirectory(examples/cuda-memcpy)
add_subdirectory(examples/reduction)
add_subdirectory(examples/syncthreads)
add_subdirectory(exercises/01-vector-add)
add_subdirectory(exercises/02-reduction)
add_subdirectory(exercises/03-syncthreads)

message(STATUS "simulagpu_native: build type = ${CMAKE_BUILD_TYPE}, CUDA = ${SIMULAGPU_WITH_CUDA}, tests = ${SIMULAGPU_BUILD_TESTS}")
