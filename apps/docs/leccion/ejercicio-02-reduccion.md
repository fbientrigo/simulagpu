---
title: Ejercicio 02 — Una pasada de reducción
description: Corrige una reducción que solapa pares y falla con tamaños impares; valida la misma aritmética en CPU y CUDA.
---

# Ejercicio 02 — Una pasada de reducción

Vas a corregir una implementación deliberadamente incorrecta. Compila, corre y produce números plausibles, pero viola dos invariantes:

1. cada elemento debe pertenecer a un solo par;
2. un elemento sin pareja debe conservarse.

## Resultado esperado

```text
[2, 4, 6, 8]     → [6, 14]
[2, 4, 6, 8, 10] → [6, 14, 10]
[7]               → [7]
```

## Orden recomendado

1. Corrige `output_size` para reservar `ceil(n / 2)` salidas.
2. Corrige `left_index` para obtener pares disjuntos.
3. Corrige `right_value` para usar cero cuando no existe vecino derecho.
4. Ejecuta las pruebas CPU hasta obtener verde.
5. Recién entonces aplica las mismas decisiones al kernel CUDA.

## Comandos CPU

```bash
cmake -S native/exercises/02-reduction/starter \
      -B native/exercises/02-reduction/starter/build \
      -G Ninja
cmake --build native/exercises/02-reduction/starter/build
ctest --test-dir native/exercises/02-reduction/starter/build --output-on-failure
```

El starter debe comenzar rojo. No edites `tests/test_reduction_step.cpp`.

## Comandos CUDA opcionales

```bash
cmake -S native/exercises/02-reduction/starter \
      -B native/exercises/02-reduction/starter/build-cuda \
      -G Ninja \
      -DEXERCISE02_CUDA=ON
cmake --build native/exercises/02-reduction/starter/build-cuda
./native/exercises/02-reduction/starter/build-cuda/ejercicio02_gpu
```

Esta parte requiere CUDA Toolkit y una GPU NVIDIA. El CI estándar no la compila ni la ejecuta.

## Pistas progresivas

::: details Pista 1 — tamaño de salida
Una pasada genera una salida por pareja y una salida adicional si sobra un elemento. Busca una división entera redondeada hacia arriba.
:::

::: details Pista 2 — pares disjuntos
El índice de salida 0 usa entradas 0 y 1. El índice de salida 1 debe usar 2 y 3. ¿Qué multiplicación transforma `out` en el índice izquierdo?
:::

::: details Pista 3 — elemento impar
La operación es suma. Necesitas el elemento neutro que no cambia el valor restante.
:::

::: details Pista 4 — salida compacta
El arreglo de salida tiene `ceil(n / 2)` posiciones. Escribe usando el índice de salida, no el índice izquierdo de la entrada.
:::

## Éxito

```text
[exercise02.reduction_step] 11 checks, 0 failures
100% tests passed
```

El README completo del ejercicio está en
[`native/exercises/02-reduction/README.md`](https://github.com/fbientrigo/simulagpu/blob/main/native/exercises/02-reduction/README.md).

Vuelve a [Clase 02 — Reducción paralela](./reduccion-paralela) para relacionar esta pasada con el árbol completo, memoria compartida y sincronización.
