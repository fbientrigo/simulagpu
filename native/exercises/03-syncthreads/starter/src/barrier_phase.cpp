#include "exercise03/barrier_phase.hpp"

#include <algorithm>
#include <stdexcept>

namespace exercise03 {

int reversed_source(int local_index, int block_valid) {
  // TODO 1: esto NO invierte nada: el hilo lee su propia posición.
  // Para una inversión dentro del bloque, la posición de origen es
  // block_valid - 1 - local_index.
  (void)block_valid;
  return local_index;
}

bool phase_depends_on_siblings() {
  // TODO 2: la fase 2 lee el valor que publicó OTRO hilo en la fase 1.
  // Esa dependencia entre hilos es la razón por la que hace falta una barrera.
  // Debe devolver true.
  return false;
}

std::vector<int> block_local_reverse(const std::vector<int>& input, int block_size) {
  if (block_size <= 0) {
    throw std::invalid_argument("block_size debe ser positivo");
  }
  const int n = static_cast<int>(input.size());
  std::vector<int> output(input.size());
  for (int base = 0; base < n; base += block_size) {
    // TODO 3: con n no múltiplo de block_size, el último bloque es parcial.
    // Usar block_size fijo aquí lee fuera del bloque; usa el número real de
    // elementos válidos del bloque (min(block_size, n - base)).
    const int valid = block_size;
    for (int j = 0; j < valid && base + j < n; ++j) {
      const int source = base + reversed_source(j, valid);
      output[static_cast<std::size_t>(base + j)] = input[static_cast<std::size_t>(source)];
    }
  }
  return output;
}

}  // namespace exercise03
