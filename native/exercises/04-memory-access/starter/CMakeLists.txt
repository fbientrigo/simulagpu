cmake_minimum_required(VERSION 3.20)
project(exercise04_memory_access_starter LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

if(NOT MSVC)
  add_compile_options(-Wall -Wextra -Wpedantic)
endif()

add_library(exercise04_starter STATIC src/memory_access.cpp)
target_include_directories(exercise04_starter PUBLIC "${CMAKE_CURRENT_SOURCE_DIR}/include")

include(CTest)
if(BUILD_TESTING)
  add_executable(test_exercise04 "${CMAKE_CURRENT_SOURCE_DIR}/../tests/test_memory_access.cpp")
  target_link_libraries(test_exercise04 PRIVATE exercise04_starter)
  add_test(NAME exercise04.memory_access COMMAND test_exercise04)
endif()
