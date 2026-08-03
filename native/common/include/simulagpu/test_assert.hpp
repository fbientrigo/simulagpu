#ifndef SIMULAGPU_TEST_ASSERT_HPP
#define SIMULAGPU_TEST_ASSERT_HPP

#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <string>

// A deliberately tiny assertion helper for the CTest executables.
//
// Why not Catch2 or GoogleTest: this project must configure and build with no
// network access and no package manager, on a machine that may have neither a
// GPU nor a CUDA toolkit. A test framework fetched at configure time would be
// the only thing standing between a student and a green `ctest` run.
//
// Usage:
//
//   int main() {
//     simulagpu::test::Suite suite("launch");
//     SIMULAGPU_CHECK(suite, ceil_div(100, 32) == 4);
//     return suite.report();
//   }

namespace simulagpu::test {

class Suite {
 public:
  explicit Suite(std::string name) : name_(std::move(name)) {}

  void check(bool condition, const char* expression, const char* file, int line) {
    ++checks_;
    if (!condition) {
      ++failures_;
      std::fprintf(stderr, "%s:%d: FAILED: %s\n", file, line, expression);
    }
  }

  /// 0 when everything passed, 1 otherwise: exactly what CTest expects.
  int report() const {
    std::printf("[%s] %d checks, %d failures\n", name_.c_str(), checks_, failures_);
    return failures_ == 0 ? 0 : 1;
  }

 private:
  std::string name_;
  int checks_ = 0;
  int failures_ = 0;
};

inline bool close_enough(double a, double b, double tolerance) {
  if (std::isnan(a) || std::isnan(b)) {
    return false;
  }
  return std::fabs(a - b) <= tolerance;
}

}  // namespace simulagpu::test

#define SIMULAGPU_CHECK(suite, condition) (suite).check((condition), #condition, __FILE__, __LINE__)

#endif  // SIMULAGPU_TEST_ASSERT_HPP
