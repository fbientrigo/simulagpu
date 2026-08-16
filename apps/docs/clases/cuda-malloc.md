---
title: Clase 01 — cudaMalloc
description: Predice qué cambia y qué no cambia cuando cudaMalloc reserva memoria en el device.
---

# Clase 01 — `cudaMalloc`

Una primitiva, una idea central: **reservar memoria no es inicializarla**.
Empieza por la escena y haz la predicción antes de leer una explicación larga.

No necesitas GPU para esta clase. La visualización es un modelo determinista y
el progreso se guarda localmente en este navegador.

<ClaseCudaMalloc />

## Reconocerla en código real

La forma mínima es:

```cpp
float* d_A = nullptr;
const std::size_t bytes = n * sizeof(float);
SIMULAGPU_CUDA_CHECK(cudaMalloc(&d_A, bytes));
```

Puedes verla dentro del flujo completo de suma de vectores en
[`native/examples/vector-add/vector_add_cuda.cu`](https://github.com/fbientrigo/simulagpu/blob/main/native/examples/vector-add/vector_add_cuda.cu).
El macro comprueba el código de error y detiene el programa si la asignación
falla; no cambia lo que hace `cudaMalloc`.

Esta clase no reemplaza la lección amplia
[Del índice global a la suma de vectores](../leccion/indice-global-suma-vectores).
La lección conecta reserva, copias, lanzamiento, guard y verificación; aquí
aislamos una sola llamada para poder predecirla con precisión.

## Después de la clase

- Practica el flujo completo en el
  [Ejercicio 01](../leccion/ejercicio-01-suma-de-vectores), basado en
  [`native/exercises/01-vector-add`](https://github.com/fbientrigo/simulagpu/tree/main/native/exercises/01-vector-add).
- Las cuatro tarjetas del cierre también están en el
  [mazo Anki descargable](../leccion/anki), con los identificadores permanentes
  `malloc-001` a `malloc-004`.

::: info Qué representa el modelo
Representa el cambio lógico de una llamada **exitosa**: aparece una asignación y
`d_A` pasa a identificarla. No ejecuta CUDA, no elige una dirección real, no
simula el hardware y no afirma cuánto tarda. Una llamada real puede fallar; por
eso el código debe comprobar su resultado.
:::
