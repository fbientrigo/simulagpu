# Exercise 01 — vector addition.
#
# Only the reference solution is wired into the repository's CTest run: the
# starter is incorrect by design, so building it here would make CI red on
# purpose. Students configure `starter/` as its own project; see
# starter/README.md and starter/CMakeLists.txt.

add_library(exercise01_solution STATIC solution/src/index_math.cpp)
target_include_directories(exercise01_solution PUBLIC
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/solution/include>
)
target_compile_options(exercise01_solution PRIVATE ${SIMULAGPU_WARNINGS})

if(SIMULAGPU_BUILD_TESTS)
  add_executable(test_exercise01_index_math tests/test_index_math.cpp)
  target_link_libraries(test_exercise01_index_math PRIVATE exercise01_solution simulagpu_common)
  target_compile_options(test_exercise01_index_math PRIVATE ${SIMULAGPU_WARNINGS})
  add_test(NAME exercise01.index_math COMMAND test_exercise01_index_math)
endif()

if(SIMULAGPU_WITH_CUDA)
  add_executable(exercise01_solution_gpu solution/src/vector_add.cu)
  target_link_libraries(exercise01_solution_gpu PRIVATE exercise01_solution simulagpu_common)
  # Not registered with add_test: it needs a physical device, and CI has none.
endif()
