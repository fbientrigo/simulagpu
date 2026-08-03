// Punto de partida del ejercicio 01.
//
// Las cuatro funciones compilan pero son INCORRECTAS a proposito. Tu trabajo es
// arreglarlas hasta que `ctest` pase. No hace falta GPU para esta parte.
//
//   cmake -S . -B build -G Ninja
//   cmake --build build
//   ctest --test-dir build --output-on-failure

#include "exercise01/index_math.hpp"

#include <cmath>

namespace exercise01 {

int global_index(int /*block_idx*/, int /*block_dim*/, int thread_idx) {
  // TODO 1 — Indice global.
  //
  // Ahora mismo todos los hilos de todos los bloques devuelven el mismo rango
  // de indices: el bloque 0 y el bloque 7 escriben en las mismas posiciones y
  // el resto del vector nunca se toca.
  //
  // Escribe la formula que usa las tres coordenadas:
  //   i = blockIdx.x * blockDim.x + threadIdx.x
  return thread_idx;
}

bool is_active(int /*index*/, int /*n*/) {
  // TODO 2 — Guard de limites.
  //
  // Devolver siempre true significa que los hilos sobrantes del ultimo bloque
  // tambien escriben. En CPU eso corrompe memoria; en GPU es un
  // `illegal memory access` (o, peor, silencio).
  //
  // Deja activos solo los hilos cuyo indice cae dentro del vector.
  return true;
}

int grid_size(int n, int block_size) {
  // TODO 3 — Numero de bloques.
  //
  // La division entera trunca: con n = 100 y block_size = 32 esto da 3
  // bloques, es decir 96 hilos, y los elementos 96..99 se quedan sin calcular.
  //
  // Redondea hacia arriba.
  return n / block_size;
}

int first_mismatch(const float* expected, const float* actual, int n) {
  // TODO 4 — Verificacion.
  //
  // Compara la referencia de CPU contra el resultado y devuelve el indice de
  // la primera diferencia, o -1 si son iguales. Cuidado con NaN: `nan > 0` es
  // false, asi que una comparacion ingenua da por bueno un resultado corrupto.
  (void)expected;
  (void)actual;
  (void)n;
  return -1;
}

}  // namespace exercise01
