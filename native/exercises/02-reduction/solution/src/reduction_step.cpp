#include "exercise02/reduction_step.hpp"

#include <stdexcept>

namespace exercise02 {

int output_size(int n) {
  if (n < 0) {
    throw std::invalid_argument("n no puede ser negativo");
  }
  return n / 2 + (n % 2 != 0 ? 1 : 0);
}

int left_index(int output_index) { return 2 * output_index; }

float right_value(const std::vector<float>& input, int left) {
  const int right = left + 1;
  return right < static_cast<int>(input.size()) ? input[static_cast<std::size_t>(right)] : 0.0F;
}

std::vector<float> reduction_step(const std::vector<float>& input) {
  if (input.empty()) {
    throw std::invalid_argument("la entrada no puede estar vacía");
  }

  std::vector<float> output(static_cast<std::size_t>(output_size(static_cast<int>(input.size()))));
  for (int out = 0; out < static_cast<int>(output.size()); ++out) {
    const int left = left_index(out);
    output[static_cast<std::size_t>(out)] =
        input[static_cast<std::size_t>(left)] + right_value(input, left);
  }
  return output;
}

}  // namespace exercise02
