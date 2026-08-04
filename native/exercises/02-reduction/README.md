# Ejercicio 02 — Una pasada de reducción

## Objetivo

Corregir una implementación que compila y ejecuta, pero no divide la entrada en pares disjuntos y pierde o duplica el último valor cuando el tamaño es impar.

Al terminar, la misma función debe transformar:

```text
[2, 4, 6, 8]     → [6, 14]
[2, 4, 6, 8, 10] → [6, 14, 10]
[7]               → [7]
```

La parte central se prueba en CPU. No necesitas GPU ni CUDA Toolkit para completar los primeros tres TODO.

## Archivos

```text
02-reduction/
├── starter/       tu copia de trabajo; empieza incorrecta
├── solution/      implementación de referencia
└── tests/         las mismas pruebas para ambas
```

## TODO

| TODO | Archivo | Fallo actual | Criterio correcto |
| --- | --- | --- | --- |
| 1 | `starter/src/reduction_step.cpp` | `n / 2` elimina la cola impar | producir `ceil(n / 2)` salidas |
| 2 | mismo archivo | `(0,1), (1,2), ...` reutiliza elementos | producir `(0,1), (2,3), ...` |
| 3 | mismo archivo | el elemento final se suma consigo mismo | usar `0.0f` como identidad aditiva |
| 4 | `starter/src/reduction_pass.cu` | el kernel repite el índice solapado | aplicar la misma fórmula correcta de CPU |
| 5 | mismo archivo | lectura fuera de rango con `n` impar | proteger `left + 1` y usar cero |

No cambies las pruebas. El objetivo es que el mismo contrato pase para `starter/` y `solution/`.

## Ejecutar sin GPU

Desde la raíz del repositorio:

```bash
cmake -S native/exercises/02-reduction/starter \
      -B native/exercises/02-reduction/starter/build \
      -G Ninja
cmake --build native/exercises/02-reduction/starter/build
ctest --test-dir native/exercises/02-reduction/starter/build --output-on-failure
```

Al principio las pruebas deben fallar. Corrige un TODO por vez y vuelve a ejecutar `ctest`.

## Ejecutar la parte CUDA

Solo cuando la parte CPU esté verde y tengas `nvcc` más una GPU NVIDIA:

```bash
cmake -S native/exercises/02-reduction/starter \
      -B native/exercises/02-reduction/starter/build-cuda \
      -G Ninja \
      -DEXERCISE02_CUDA=ON
cmake --build native/exercises/02-reduction/starter/build-cuda
./native/exercises/02-reduction/starter/build-cuda/ejercicio02_gpu
```

El ejecutable CUDA imprime la salida obtenida y la esperada. No reemplaza las pruebas CPU: ambas implementaciones deben expresar la misma aritmética.

## Síntomas y causa probable

| Síntoma | Revisa |
| --- | --- |
| funciona con 8 valores, pierde el noveno | `output_size` y el operando derecho del último par |
| aparecen sumas `x[0]+x[1]`, `x[1]+x[2]` | falta multiplicar el índice de salida por 2 |
| `[7]` se vuelve `[14]` | se duplicó la cola en vez de sumarla con cero |
| CPU pasa, GPU falla solo con tamaños impares | el guard se corrigió en C++, pero no en el kernel |
| el kernel reporta acceso ilegal | se leyó `input[left + 1]` sin comprobar el límite |

## Criterio de éxito

```text
[exercise02.reduction_step] 11 checks, 0 failures
100% tests passed
```

Además debes poder explicar por qué:

```cpp
left = 2 * out;
right = left + 1 < n ? input[left + 1] : 0.0f;
output[out] = input[left] + right;
```

produce pares disjuntos, conserva la suma y genera una salida compacta.
