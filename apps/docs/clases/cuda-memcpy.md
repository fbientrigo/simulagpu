---
title: Primitiva B — cudaMemcpy
description: Predice exactamente qué celdas cambian tras una copia, dado un origen, un destino, un conteo de bytes y una dirección.
---

# Primitiva B — `cudaMemcpy`

Una primitiva, una idea central: **copiar no es mover, y copiar no es reservar**.
`cudaMalloc` te dio espacio en el device; `cudaMemcpy` es lo que finalmente pone
tus datos ahí —y lo que trae un resultado de vuelta.

Empieza por la escena y haz la predicción antes de leer una explicación larga.
No necesitas GPU: la visualización es un modelo determinista y el progreso se
guarda localmente en este navegador.

<ClaseCudaMemcpy />

## Reconocerla en código real

La forma mínima, enviando la entrada al device:

```cpp
cudaMemcpy(d_input, h_input, n * sizeof(int32_t), cudaMemcpyHostToDevice);
```

y recuperando un resultado al host:

```cpp
cudaMemcpy(&h_result, d_result, sizeof(int32_t), cudaMemcpyDeviceToHost);
```

La firma es `cudaMemcpy(destino, origen, bytes, dirección)`: el destino va
primero y el tercer argumento son **bytes**, no elementos. Para copiar `n`
valores de tipo `T` se usa `n * sizeof(T)`.

Puedes ver una ida y vuelta real —host → device → host— en el ejemplo ejecutable
[`native/examples/cuda-memcpy/`](https://github.com/fbientrigo/simulagpu/tree/main/native/examples/cuda-memcpy),
que comprueba que los valores del viaje redondo coinciden con los originales.

## `cudaMalloc` frente a `cudaMemcpy`

Esta clase separa deliberadamente dos operaciones que suelen confundirse:

| Operación | Qué hace | Qué **no** hace |
| --- | --- | --- |
| `cudaMalloc` | Reserva memoria en el device y escribe el puntero. | No copia datos ni inicializa las celdas. |
| `cudaMemcpy` | Copia bytes entre regiones que ya existen. | No reserva memoria, no ejecuta kernels ni transforma valores. |

La primitiva anterior, [`cudaMalloc`](./cuda-malloc), deja el device con celdas
sin inicializar (`?`). Aquí ves cómo esas celdas pasan a contener copias del
origen —y cómo las celdas fuera del rango copiado conservan su estado previo.

## Después de la clase

- El flujo completo (reserva, copias, lanzamiento, guard y verificación) vive en
  la lección [Del índice global a la suma de vectores](../leccion/indice-global-suma-vectores),
  que reutiliza estas dos direcciones de copia.
- Las seis tarjetas del cierre también están en el
  [mazo Anki descargable](../leccion/anki), con los identificadores permanentes
  `memcpy-001` a `memcpy-006`.

::: info Qué representa el modelo
Representa el cambio lógico de una copia **síncrona y exitosa**: compara el
estado antes con el estado después. **No ejecuta CUDA**, no reserva memoria, no
lanza kernels y no modela tiempos, asincronía ni concurrencia. El origen nunca
se vacía: copiar no es mover.
:::
