# Ejercicio 01 — Suma de vectores

Primer ejercicio de SimulaGPU. Acompana a la leccion
[Del indice global a la suma de vectores](../../../apps/docs/leccion/indice-global-suma-vectores.md).

## Objetivos de aprendizaje

Al terminar deberias poder:

- calcular el indice global de un hilo a partir de `blockIdx.x`, `blockDim.x` y
  `threadIdx.x`;
- explicar por que hace falta el guard `if (i < n)` y que pasa sin el;
- calcular `gridDim.x` con division redondeada hacia arriba y decir cuantos
  hilos sobran;
- lanzar un kernel con una configuracion coherente con ese calculo;
- validar el resultado contra una referencia secuencial de CPU en vez de
  confiar en que "se ve bien".

## Que tienes que arreglar

Todo esta en `starter/`. Los archivos existen y compilan: lo que falla es la
aritmetica.

| TODO | Archivo | Que arreglar |
| --- | --- | --- |
| 1 | `starter/src/index_math.cpp` | `global_index`: indice global 1D |
| 2 | `starter/src/index_math.cpp` | `is_active`: guard de limites |
| 3 | `starter/src/index_math.cpp` | `grid_size`: division redondeada hacia arriba |
| 4 | `starter/src/index_math.cpp` | `first_mismatch`: verificacion contra CPU |
| 5 | `starter/src/vector_add.cu` | indice global dentro del kernel |
| 6 | `starter/src/vector_add.cu` | guard dentro del kernel |
| 7 | `starter/src/vector_add.cu` | numero de bloques del lanzamiento |
| 8 | `starter/src/vector_add.cu` | usar la verificacion y devolver el codigo de salida |

Los TODO 1–4 se verifican **sin GPU**. Empieza por ahi.

## Sin GPU (lo normal)

```bash
cd native/exercises/01-vector-add/starter

cmake -S . -B build -G Ninja
cmake --build build
ctest --test-dir build --output-on-failure
```

Al principio fallan. Arregla `src/index_math.cpp` hasta que pasen. No modifiques
`../tests/test_index_math.cpp`: es el mismo archivo con el que se comprueba la
solucion de referencia.

## Con GPU NVIDIA

```bash
cd native/exercises/01-vector-add/starter

cmake -S . -B build-cuda -G Ninja -DEXERCISE01_CUDA=ON
cmake --build build-cuda
./build-cuda/ejercicio01_gpu
```

Debe imprimir `PRUEBA SUPERADA` y salir con codigo 0.

## Criterio de exito

1. `ctest` pasa en `starter/` sin haber tocado el archivo de pruebas.
2. Puedes decir, para `n = 1000` y `blockDim.x = 256`, cuantos bloques se lanzan,
   cuantos hilos se crean y cuantos quedan inactivos.
3. Puedes explicar en una frase que pasaria sin el guard `if (i < n)`.

## Solucion

`solution/` tiene la version de referencia. Miralo despues de intentarlo: leer
la respuesta antes de pelearte con el problema convierte un ejercicio en un
ejemplo.

## Errores comunes

- **Todos los hilos escriben en el mismo sitio.** Falta multiplicar por
  `blockDim.x`, o se uso `threadIdx.x` solo.
- **Faltan los ultimos elementos.** `gridDim.x` se calculo con division entera.
- **`illegal memory access` o corrupcion silenciosa.** Falta el guard.
- **"Funciona" con `n = 1024` y falla con `n = 1000`.** Elegiste un `n`
  multiple del tamano de bloque: el caso interesante es justamente el otro.
- **La verificacion siempre pasa.** Se comparo con una tolerancia enorme, o no
  se contemplo NaN.
