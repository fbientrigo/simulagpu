# Runnable CPU-testable truth for Class 3.
add_executable(memory_access_example main.cpp)
target_link_libraries(memory_access_example PRIVATE simulagpu_common)
target_compile_options(memory_access_example PRIVATE ${SIMULAGPU_WARNINGS})

if(SIMULAGPU_BUILD_TESTS)
  add_test(NAME example.memory_access COMMAND memory_access_example)
endif()
