#ifndef EXERCISE01_INDEX_MATH_HPP
#define EXERCISE01_INDEX_MATH_HPP

// Aritmetica de indices del ejercicio 01.
//
// Estas cuatro funciones son la parte del ejercicio que se puede probar sin
// GPU. Se declaran aqui y se implementan en src/index_math.cpp, tanto en
// starter/ como en solution/, de modo que el mismo archivo de pruebas
// (../tests/test_index_math.cpp) sirve para las dos versiones.

namespace exercise01 {

/// Indice global 1D que cada hilo calcula para si mismo.
int global_index(int block_idx, int block_dim, int thread_idx);

/// Guard `if (i < n)`: true si el hilo tiene un elemento que le corresponde.
bool is_active(int index, int n);

/// gridDim.x necesario para cubrir n elementos con bloques de block_size hilos.
int grid_size(int n, int block_size);

/// Compara el resultado contra la referencia de CPU.
/// Devuelve el indice de la primera diferencia, o -1 si todo coincide.
int first_mismatch(const float* expected, const float* actual, int n);

}  // namespace exercise01

#endif  // EXERCISE01_INDEX_MATH_HPP
