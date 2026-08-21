---
title: Primitiva C — __syncthreads()
description: Predice quién espera y quién puede continuar en una barrera de bloque, entiende que su alcance es un solo bloque y rechaza la participación divergente inválida.
---

# Primitiva C — `__syncthreads()`

Una primitiva, una idea central: **llegar a la barrera no es cruzarla**.
`__syncthreads()` coordina fases dentro de **un** bloque: los hilos que llegan
temprano esperan, y la barrera se libera solo cuando todos los hilos
participantes de ese bloque la alcanzan.

Empieza por la escena y haz la predicción antes de leer la explicación. No
necesitas GPU: la visualización es un modelo determinista y el progreso se
guarda localmente en este navegador.

<ClaseSyncthreads />

## Reconocerla en código real

La forma mínima, con una fase que produce y otra que consume:

```cpp
producir();      // cada hilo del bloque escribe su parte

__syncthreads(); // frontera: todo el bloque llega antes de seguir

consumir();       // ahora el trabajo previo del bloque está disponible
```

La barrera es una **frontera de dependencia entre fases**, no una operación que
calcule, copie o reduzca datos. Su alcance es el bloque: otro bloque no forma
parte de esta barrera y no la espera.

Un uso peligroso aparece al mezclar la barrera con una guarda de rango sobre un
bloque parcial:

```cpp
if (i < N) {
    work(i);
    __syncthreads(); // ¡inseguro! T2 y T3 (sin dato válido) nunca la ejecutan
}
```

Los hilos sin elemento válido saltan el `if` por completo, así que la
participación queda **divergente**: no todos los hilos del bloque alcanzan la
misma barrera. La forma segura saca la barrera de la rama para que todo el
bloque la ejecute.

## Verla en un ejemplo ejecutable

Puedes ver una sincronización de fase a nivel de bloque —fase 1 escribe, la
barrera separa, fase 2 lee— en el ejemplo ejecutable
[`native/examples/syncthreads/`](https://github.com/fbientrigo/simulagpu/tree/main/native/examples/syncthreads),
que compara el resultado contra un oráculo CPU. El núcleo aritmético es
comprobable sin GPU; la parte CUDA es opcional y se compila solo si hay `nvcc`.

Y puedes practicar colocando la barrera correcta en el ejercicio
[`native/exercises/03-syncthreads/`](https://github.com/fbientrigo/simulagpu/tree/main/native/exercises/03-syncthreads).

## De dónde viene y a dónde va

- La [Clase 02 — Reducción paralela](../leccion/reduccion-paralela) ya obligó a
  pensar en **fases**: una pasada produce valores intermedios que la siguiente
  consume. Esta primitiva convierte esa idea en la pregunta operativa: ¿cómo se
  establece, dentro de un bloque, que una fase terminó antes de empezar la
  siguiente?
- Queda una pregunta deliberadamente abierta para la **Clase 3**: ¿dónde pueden
  dejar los hilos datos que otros hilos del mismo bloque reutilicen? Aquí
  aprendimos **cómo** coordinar fases; el **dónde** de la memoria compartida
  llega después.
- Las seis tarjetas del cierre también están en el
  [mazo Anki descargable](../leccion/anki), con los identificadores permanentes
  `syncthreads-001` a `syncthreads-006`.

::: info Qué representa el modelo
Representa los estados de sincronización de los hilos frente a la barrera
(**antes → esperando → liberado → después**) en un escenario determinista con un
orden de llegada fijo. **No ejecuta CUDA**, no modela warps, planificación,
tiempos ni ejecución en lockstep, y no simula un cuelgue: la participación
divergente se marca como inválida y se explica su causa. El orden de llegada
`T0 → T2 → T1 → T3` es un recurso didáctico, no una planificación real.
:::
