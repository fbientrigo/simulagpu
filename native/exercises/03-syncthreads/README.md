# Ejercicio 03 — Colocar la barrera de una fase dependiente

## Objetivo

Un kernel invierte un arreglo **dentro de cada bloque**: la fase 1 publica el
valor de cada hilo y la fase 2 lee el valor de un hilo vecino. Esa lectura
depende de lo que escribió otro hilo, así que las dos fases necesitan una
**barrera** entre ellas.

El núcleo aritmético y el razonamiento de dependencia se prueban en CPU. No
necesitas GPU ni CUDA Toolkit para completar los TODO 1 a 3. Los TODO 4 y 5
colocan la barrera y la lectura del vecino en el kernel CUDA opcional.

Al terminar, la inversión por bloque debe transformar:

```text
[10, 11, 12, 13, 20, 21, 22, 23]  (bloques de 4)
→ [13, 12, 11, 10, 23, 22, 21, 20]
[7]         → [7]
[1,2,3,4,5,6] (bloques de 4) → [4, 3, 2, 1, 6, 5]
```

## Archivos

```text
03-syncthreads/
├── starter/       tu copia de trabajo; empieza incorrecta
├── solution/      implementación de referencia
└── tests/         las mismas pruebas para ambas
```

## TODO

| TODO | Archivo | Fallo actual | Criterio correcto |
| --- | --- | --- | --- |
| 1 | `starter/src/barrier_phase.cpp` | `reversed_source` devuelve la propia posición | devolver `block_valid - 1 - local_index` |
| 2 | mismo archivo | `phase_depends_on_siblings` devuelve `false` | reconocer la dependencia entre hilos: `true` |
| 3 | mismo archivo | usa `block_size` fijo en el bloque final parcial | usar `min(block_size, n - base)` |
| 4 | `starter/src/barrier_phase.cu` | falta `__syncthreads()` entre las fases | colocar la barrera entre publicar y leer |
| 5 | mismo archivo | la fase 2 lee la propia posición | leer al vecino invertido `blockDim.x - 1 - local` |

No cambies las pruebas. El objetivo es que el mismo contrato pase para
`starter/` y `solution/`.

## Ejecutar sin GPU

Desde la raíz del repositorio:

```bash
cmake -S native/exercises/03-syncthreads/starter \
      -B native/exercises/03-syncthreads/starter/build \
      -G Ninja
cmake --build native/exercises/03-syncthreads/starter/build
ctest --test-dir native/exercises/03-syncthreads/starter/build --output-on-failure
```

Al principio las pruebas deben fallar. Corrige un TODO por vez y vuelve a
ejecutar `ctest`.

## Ejecutar la parte CUDA

Solo cuando la parte CPU esté verde y tengas `nvcc` más una GPU NVIDIA:

```bash
cmake -S native/exercises/03-syncthreads/starter \
      -B native/exercises/03-syncthreads/starter/build-cuda \
      -G Ninja \
      -DEXERCISE03_CUDA=ON
cmake --build native/exercises/03-syncthreads/starter/build-cuda
./native/exercises/03-syncthreads/starter/build-cuda/ejercicio03_gpu
```

## Síntomas y causa probable

| Síntoma | Revisa |
| --- | --- |
| la salida es igual a la entrada | la fase 2 lee la propia posición en vez del vecino (TODO 5) |
| funciona a veces, falla otras (GPU) | falta `__syncthreads()`: se lee antes de que el vecino publique (TODO 4) |
| se pierde o repite la cola con `n` no múltiplo | `valid` usa `block_size` fijo en vez de `min(block_size, n - base)` (TODO 3) |
| la prueba de dependencia falla | `phase_depends_on_siblings()` debe devolver `true` (TODO 2) |

## Criterio de éxito

```text
[exercise03.barrier_phase] 10 checks, 0 failures
100% tests passed
```

Además debes poder explicar **por qué** la fase 2 depende de la fase 1 de otros
hilos, **dónde** va la barrera y **cuál** es su alcance (el bloque, no la grid).
