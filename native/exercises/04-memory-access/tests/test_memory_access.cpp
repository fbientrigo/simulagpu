#include "memory_access.hpp"

#include <cstdlib>
#include <iostream>
#include <vector>

namespace {
template <typename T>
void expect_equal(const T& actual, const T& expected, const char* label) {
  if (actual == expected) return;
  std::cerr << "FALLO: " << label << '\n';
  std::exit(EXIT_FAILURE);
}
}  // namespace

int main() {
  using simulagpu::exercise04::contiguous_addresses;
  using simulagpu::exercise04::neighborhood_addresses;
  using simulagpu::exercise04::strided_addresses;

  expect_equal(contiguous_addresses(4), std::vector<std::size_t>({0, 1, 2, 3}), "mapeo contiguo");
  expect_equal(strided_addresses(4, 8, 2), std::vector<std::size_t>({0, 2, 4, 6}), "stride 2");
  expect_equal(strided_addresses(4, 7, 3), std::vector<std::size_t>({0, 3, 6, 2}), "stride con borde");
  expect_equal(neighborhood_addresses(0, 5), std::vector<std::size_t>({0, 1}), "borde izquierdo");
  expect_equal(neighborhood_addresses(2, 5), std::vector<std::size_t>({1, 2, 3}), "vecindad interior");
  expect_equal(neighborhood_addresses(4, 5), std::vector<std::size_t>({3, 4}), "borde derecho");
  expect_equal(neighborhood_addresses(0, 0), std::vector<std::size_t>({}), "entrada vacia");

  std::cout << "Ejercicio 04: pruebas verdes.\n";
  return EXIT_SUCCESS;
}
