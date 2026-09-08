#include "memory_access.hpp"

namespace simulagpu::exercise04 {
std::vector<std::size_t> contiguous_addresses(std::size_t thread_count) {
  std::vector<std::size_t> addresses;
  addresses.reserve(thread_count);
  for (std::size_t thread = 0; thread < thread_count; ++thread) {
    // TODO: cada hilo debe mapearse a su propio índice lógico; ahora todos usan 0.
    addresses.push_back(0);
  }
  return addresses;
}

std::vector<std::size_t> strided_addresses(
    std::size_t thread_count, std::size_t element_count, std::size_t stride) {
  std::vector<std::size_t> addresses;
  if (element_count == 0) return addresses;
  addresses.reserve(thread_count);
  for (std::size_t thread = 0; thread < thread_count; ++thread) {
    // TODO: incorpora stride y conserva la dirección dentro del arreglo.
    addresses.push_back(thread % element_count);
  }
  return addresses;
}

std::vector<std::size_t> neighborhood_addresses(
    std::size_t thread_index, std::size_t element_count) {
  if (element_count == 0 || thread_index >= element_count) return {};
  // TODO: incluye vecinos válidos sin leer antes de 0 ni después del último elemento.
  return {thread_index};
}
}  // namespace simulagpu::exercise04
