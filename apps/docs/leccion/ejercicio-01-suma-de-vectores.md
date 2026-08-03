---
title: 'Ejercicio 01: suma de vectores'
description: Ocho TODO para implementar el índice global, el guard de límites, el tamaño de la grilla y la verificación.
---

# Ejercicio 01 — Suma de vectores

Acompaña a la lección
[Del índice global a la suma de vectores](./indice-global-suma-vectores).
Hazla primero, o al menos ten el
[explorador](./indice-global-suma-vectores#el-explorador-del-indice-global) a
mano.

**Duración estimada:** 45–60 minutos.
**GPU:** no hace falta para la mayor parte del ejercicio.

## Qué vas a practicar

- calcular el índice global de un hilo;
- decidir qué hilos tienen derecho a escribir;
- calcular cuántos bloques lanzar;
- configurar el lanzamiento de forma coherente con ese cálculo;
- verificar el resultado contra una referencia de CPU.

## Dónde está

```
native/exercises/01-vector-add/
├── README.md              enunciado completo
├── starter/               ← aquí trabajas
│   ├── CMakeLists.txt
│   └── src/
│       ├── index_math.cpp   TODO 1–4  (sin GPU)
│       └── vector_add.cu    TODO 5–8  (con GPU)
├── solution/              referencia, para después
└── tests/                 pruebas compartidas — no las edites
```

El código de partida **compila y ejecuta**: no falta ningún archivo. Lo que está
mal es la aritmética, y las pruebas te dicen exactamente dónde.

## Empezar

```bash
cd native/exercises/01-vector-add/starter

cmake -S . -B build -G Ninja
cmake --build build
ctest --test-dir build --output-on-failure
```

Las pruebas fallan. Ese es el punto de partida correcto.

## Los ocho TODO

| # | Archivo | Qué arreglar | ¿GPU? |
| --- | --- | --- | --- |
| 1 | `src/index_math.cpp` | `global_index`: el índice global 1D | no |
| 2 | `src/index_math.cpp` | `is_active`: el guard `i < n` | no |
| 3 | `src/index_math.cpp` | `grid_size`: división redondeada hacia arriba | no |
| 4 | `src/index_math.cpp` | `first_mismatch`: comparación contra la CPU | no |
| 5 | `src/vector_add.cu` | índice global dentro del kernel | sí |
| 6 | `src/vector_add.cu` | guard dentro del kernel | sí |
| 7 | `src/vector_add.cu` | número de bloques del lanzamiento | sí |
| 8 | `src/vector_add.cu` | usar la verificación y devolver el código de salida | sí |

Los TODO 1–4 son el 80% del ejercicio y se comprueban con `ctest` en cualquier
máquina. Empieza por ahí aunque tengas GPU: llegar al kernel con la aritmética
ya verificada cambia por completo la experiencia de depurarlo.

## La parte con GPU

```bash
cd native/exercises/01-vector-add/starter

cmake -S . -B build-cuda -G Ninja -DEXERCISE01_CUDA=ON
cmake --build build-cuda
./build-cuda/ejercicio01_gpu
```

Debe imprimir `PRUEBA SUPERADA` y salir con código 0.

## Criterio de éxito

1. `ctest` pasa en `starter/` sin haber tocado `../tests/test_index_math.cpp`.
2. Sabes decir, para `n = 1000` y `blockDim.x = 256`, cuántos bloques se lanzan,
   cuántos hilos se crean y cuántos quedan inactivos.
3. Puedes explicar en una frase qué pasaría sin el guard `if (i < n)`.

## Si te atascas

- **Las pruebas de `global_index` fallan solo para bloques distintos de 0.**
  Estás ignorando `blockIdx.x` o no lo multiplicas por `blockDim.x`.
- **`grid_size(128, 32)` te da 5.** Estás sumando un bloque siempre, también
  cuando la división es exacta. El bloque extra solo hace falta si hay resto.
- **`grid_size(100, 32)` te da 3.** No estás redondeando hacia arriba.
- **La prueba del conjunto completo falla con "claimed.size() == n".** Con tu
  `grid_size` e `is_active`, algunos elementos se quedan sin hilo o hay dos
  hilos que reclaman el mismo.
- **`first_mismatch` no detecta el NaN.** `nan > 0` es `false`. Pregunta por NaN
  aparte, con `std::isnan`.

## Después

- Compara con `solution/`, pero **después** de intentarlo.
- Repasa con las [tarjetas Anki](./anki): la sección "errores comunes" cubre
  justo lo que acabas de romper.
