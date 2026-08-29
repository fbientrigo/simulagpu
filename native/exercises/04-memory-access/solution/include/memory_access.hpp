#pragma once

#include <cstddef>
#include <vector>

namespace simulagpu::exercise04 {
std::vector<std::size_t> contiguous_addresses(std::size_t thread_count);
std::vector<std::size_t> strided_addresses(
    std::size_t thread_count, std::size_t element_count, std::size_t stride);
std::vector<std::size_t> neighborhood_addresses(
    std::size_t thread_index, std::size_t element_count);
}  // namespace simulagpu::exercise04
