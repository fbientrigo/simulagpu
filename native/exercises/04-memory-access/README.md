# Ejercicio 04 — Patrones de acceso y vecindad

## Objetivo

Completar tres funciones CPU-testables que representan la aritmética de índices usada en la Clase 3. No necesitas CUDA ni una GPU.

## TODO

| Archivo | Problema inicial | Debes lograr |
| --- | --- | --- |
| `starter/src/memory_access.cpp` | todos los hilos contiguos apuntan a 0 | hilo `t` → índice `t` |
| `starter/src/memory_access.cpp` | el stride se ignora | hilo `t` → `(t * stride) % n` |
| `starter/src/memory_access.cpp` | solo se lee el índice propio | incluir vecinos válidos sin salir del arreglo |

## Ejecutar

```bash
cd native/exercises/04-memory-access/starter
cmake -S . -B build -G Ninja
cmake --build build
ctest --test-dir build --output-on-failure
```

El starter **compila y ejecuta**, pero las pruebas comienzan rojas porque los índices son incorrectos. No edites `../tests/test_memory_access.cpp`.

## Criterio de éxito

Las mismas pruebas deben validar:

- acceso contiguo;
- acceso con stride;
- wrap lógico dentro del arreglo;
- vecindad interior;
- bordes izquierdo y derecho;
- entrada vacía.

## Errores comunes

- «todos los hilos leen el mismo elemento»;
- «stride = 2 produce 0, 1, 2, 3»;
- «el primer hilo intenta leer índice -1»;
- «el último hilo intenta leer un índice igual a `n`»;
- confundir el índice lógico con el valor almacenado.

Este ejercicio verifica **aritmética y límites**, no rendimiento ni transacciones de memoria de una GPU.
