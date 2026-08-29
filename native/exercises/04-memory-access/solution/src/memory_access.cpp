#include "memory_access.hpp"

namespace simulagpu::exercise04 {
std::vector<std::size_t> contiguous_addresses(std::size_t thread_count) {
  std::vector<std::size_t> addresses;
  addresses.reserve(thread_count);
  for (std::size_t thread = 0; thread < thread_count; ++thread) addresses.push_back(thread);
  return addresses;
}

std::vector<std::size_t> strided_addresses(
    std::size_t thread_count, std::size_t element_count, std::size_t stride) {
  std::vector<std::size_t> addresses;
  if (element_count == 0) return addresses;
  addresses.reserve(thread_count);
  for (std::size_t thread = 0; thread < thread_count; ++thread) {
    addresses.push_back((thread * stride) % element_count);
  }
  return addresses;
}

std::vector<std::size_t> neighborhood_addresses(
    std::size_t thread_index, std::size_t element_count) {
  std::vector<std::size_t> addresses;
  if (element_count == 0 || thread_index >= element_count) return addresses;
  if (thread_index > 0) addresses.push_back(thread_index - 1);
  addresses.push_back(thread_index);
  if (thread_index + 1 < element_count) addresses.push_back(thread_index + 1);
  return addresses;
}
}  // namespace simulagpu::exercise04
