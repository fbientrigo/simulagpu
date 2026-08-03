// Solucion de referencia del ejercicio 01.
//
// Comparala con starter/src/index_math.cpp solo despues de intentarlo.

#include "exercise01/index_math.hpp"

#include <cmath>

namespace exercise01 {

int global_index(int block_idx, int block_dim, int thread_idx) {
  // Cada bloque cubre block_dim elementos consecutivos. El bloque numero
  // block_idx empieza en block_idx * block_dim, y dentro de el cada hilo se
  // desplaza thread_idx posiciones.
  return block_idx * block_dim + thread_idx;
}

bool is_active(int index, int n) {
  // Los indices validos son 0 .. n-1.
  return index < n;
}

int grid_size(int n, int block_size) {
  // Division con redondeo hacia arriba: si sobra aunque sea un elemento hace
  // falta un bloque mas. Escrito asi (en vez de (n + block_size - 1) /
  // block_size) para que no se desborde con n grande.
  return n / block_size + (n % block_size != 0 ? 1 : 0);
}

int first_mismatch(const float* expected, const float* actual, int n) {
  for (int i = 0; i < n; ++i) {
    const float difference = std::fabs(expected[i] - actual[i]);
    // NaN falla toda comparacion, incluida `difference > 0`, asi que hay que
    // preguntarlo aparte.
    if (std::isnan(difference) || difference > 0.0f) {
      return i;
    }
  }
  return -1;
}

}  // namespace exercise01
