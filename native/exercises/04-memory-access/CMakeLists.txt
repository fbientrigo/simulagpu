# Exercise 04 — logical memory-access mappings and neighborhood reads.
add_library(exercise04_solution STATIC solution/src/memory_access.cpp)
target_include_directories(exercise04_solution PUBLIC
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/solution/include>
)
target_compile_options(exercise04_solution PRIVATE ${SIMULAGPU_WARNINGS})

if(SIMULAGPU_BUILD_TESTS)
  add_executable(test_exercise04_memory_access tests/test_memory_access.cpp)
  target_link_libraries(test_exercise04_memory_access PRIVATE exercise04_solution)
  target_compile_options(test_exercise04_memory_access PRIVATE ${SIMULAGPU_WARNINGS})
  add_test(NAME exercise04.memory_access COMMAND test_exercise04_memory_access)
endif()
