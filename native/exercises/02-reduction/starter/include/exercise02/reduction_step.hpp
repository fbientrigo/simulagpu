#pragma once

#include <vector>

namespace exercise02 {

int output_size(int n);
int left_index(int output_index);
float right_value(const std::vector<float>& input, int left);
std::vector<float> reduction_step(const std::vector<float>& input);

}  // namespace exercise02
