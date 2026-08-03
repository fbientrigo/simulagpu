// Pruebas compartidas del ejercicio 01.
//
// El mismo archivo se compila contra starter/ y contra solution/. Con el
// starter estas pruebas fallan a proposito; el criterio de exito del ejercicio
// es que pasen sin tocar este archivo.

#include <cmath>
#include <set>
#include <vector>

#include "exercise01/index_math.hpp"
#include "simulagpu/test_assert.hpp"

using exercise01::first_mismatch;
using exercise01::global_index;
using exercise01::grid_size;
using exercise01::is_active;

int main() {
  simulagpu::test::Suite suite("exercise01.index_math");

  // TODO 1 — indice global.
  SIMULAGPU_CHECK(suite, global_index(0, 32, 0) == 0);
  SIMULAGPU_CHECK(suite, global_index(0, 32, 31) == 31);
  SIMULAGPU_CHECK(suite, global_index(1, 32, 0) == 32);
  SIMULAGPU_CHECK(suite, global_index(3, 32, 5) == 101);
  SIMULAGPU_CHECK(suite, global_index(7, 256, 255) == 2047);

  // TODO 2 — guard de limites.
  SIMULAGPU_CHECK(suite, is_active(0, 100));
  SIMULAGPU_CHECK(suite, is_active(99, 100));
  SIMULAGPU_CHECK(suite, !is_active(100, 100));
  SIMULAGPU_CHECK(suite, !is_active(127, 100));

  // TODO 3 — numero de bloques (division con redondeo hacia arriba).
  SIMULAGPU_CHECK(suite, grid_size(100, 32) == 4);
  SIMULAGPU_CHECK(suite, grid_size(128, 32) == 4);
  SIMULAGPU_CHECK(suite, grid_size(129, 32) == 5);
  SIMULAGPU_CHECK(suite, grid_size(1, 256) == 1);
  SIMULAGPU_CHECK(suite, grid_size(256, 256) == 1);
  SIMULAGPU_CHECK(suite, grid_size(257, 256) == 2);

  // Las tres funciones juntas: cada elemento del vector le toca a exactamente
  // un hilo, y ningun hilo activo se sale del vector.
  for (const int block_size : {1, 32, 64, 256}) {
    for (const int n : {1, 7, 100, 255, 256, 257, 1000}) {
      std::set<int> claimed;
      for (int block = 0; block < grid_size(n, block_size); ++block) {
        for (int thread = 0; thread < block_size; ++thread) {
          const int i = global_index(block, block_size, thread);
          if (is_active(i, n)) {
            SIMULAGPU_CHECK(suite, i >= 0 && i < n);
            SIMULAGPU_CHECK(suite, claimed.insert(i).second);
          }
        }
      }
      SIMULAGPU_CHECK(suite, static_cast<int>(claimed.size()) == n);
    }
  }

  // TODO 4 — verificacion.
  {
    const std::vector<float> expected{1.0f, 2.0f, 3.0f};
    const std::vector<float> igual{1.0f, 2.0f, 3.0f};
    const std::vector<float> distinto{1.0f, 2.5f, 3.0f};
    const std::vector<float> con_nan{1.0f, std::nanf(""), 3.0f};

    SIMULAGPU_CHECK(suite, first_mismatch(expected.data(), igual.data(), 3) == -1);
    SIMULAGPU_CHECK(suite, first_mismatch(expected.data(), distinto.data(), 3) == 1);
    SIMULAGPU_CHECK(suite, first_mismatch(expected.data(), con_nan.data(), 3) == 1);
  }

  return suite.report();
}
