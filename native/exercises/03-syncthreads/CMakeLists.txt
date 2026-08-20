# Exercise 03 — placing the barrier for a block-local phase dependency.
#
# Only the correct solution is part of the repository CTest run. The starter is
# a standalone project and is expected to fail its shared tests initially.

add_library(exercise03_solution STATIC solution/src/barrier_phase.cpp)
target_include_directories(exercise03_solution PUBLIC
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/solution/include>
)
target_compile_options(exercise03_solution PRIVATE ${SIMULAGPU_WARNINGS})

if(SIMULAGPU_BUILD_TESTS)
  add_executable(test_exercise03_barrier tests/test_barrier_phase.cpp)
  target_link_libraries(test_exercise03_barrier PRIVATE exercise03_solution simulagpu_common)
  target_compile_options(test_exercise03_barrier PRIVATE ${SIMULAGPU_WARNINGS})
  add_test(NAME exercise03.barrier_phase COMMAND test_exercise03_barrier)
endif()

if(SIMULAGPU_WITH_CUDA)
  add_executable(exercise03_solution_gpu solution/src/barrier_phase.cu)
  target_link_libraries(exercise03_solution_gpu PRIVATE exercise03_solution simulagpu_common)
endif()
