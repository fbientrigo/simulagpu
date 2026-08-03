# Ejercicio 01 — punto de partida

Este proyecto compila pero da resultados incorrectos a proposito.

```bash
cmake -S . -B build -G Ninja
cmake --build build
ctest --test-dir build --output-on-failure
```

Las pruebas fallan al empezar. Arregla los TODO de `src/index_math.cpp` hasta
que pasen.

No edites `../tests/test_index_math.cpp`.

Enunciado completo, tabla de TODO y criterios de exito: [`../README.md`](../README.md).
