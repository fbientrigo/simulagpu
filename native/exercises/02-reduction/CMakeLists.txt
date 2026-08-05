# Exercise 02 — one adjacent-pair reduction pass.
#
# Only the correct solution is part of the repository CTest run. The starter is
# a standalone project and is expected to fail its shared tests initially.

add_library(exercise02_solution STATIC solution/src/reduction_step.cpp)
target_include_directories(exercise02_solution PUBLIC
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/solution/include>
)
target_compile_options(exercise02_solution PRIVATE ${SIMULAGPU_WARNINGS})

if(SIMULAGPU_BUILD_TESTS)
  add_executable(test_exercise02_reduction tests/test_reduction_step.cpp)
  target_link_libraries(test_exercise02_reduction PRIVATE exercise02_solution simulagpu_common)
  target_compile_options(test_exercise02_reduction PRIVATE ${SIMULAGPU_WARNINGS})
  add_test(NAME exercise02.reduction_step COMMAND test_exercise02_reduction)
endif()

if(SIMULAGPU_WITH_CUDA)
  add_executable(exercise02_solution_gpu solution/src/reduction_pass.cu)
  target_link_libraries(exercise02_solution_gpu PRIVATE exercise02_solution simulagpu_common)
endif()
