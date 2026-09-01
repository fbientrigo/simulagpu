---
title: Cooperación, memoria y patrones de acceso
description: 'Clase 03 de SimulaGPU: dependencias entre hilos, memoria global, barreras, accesos contiguos y con stride, y oportunidades de reutilización.'
---

# Cooperación, memoria y patrones de acceso

Hasta ahora podíamos asignar trabajo de forma que cada hilo resolviera su parte casi de manera independiente. En esta clase aparece una situación distinta: **un hilo necesita datos relacionados con los que producen o leen otros hilos**.

La pregunta central es:

> ¿Qué cambia cuando la organización de los datos y las dependencias entre hilos pasan a formar parte del algoritmo?

Al terminar podrás:

- distinguir un valor privado de un hilo de un valor almacenado en memoria global;
- detectar cuándo una segunda fase depende de resultados escritos por otros hilos del mismo bloque;
- colocar una barrera de bloque en una frontera de fases que realmente la necesita;
- comparar un mapeo de direcciones contiguo con uno con `stride`;
- reconocer valores leídos repetidamente y explicar por qué existe una oportunidad de reutilización.

**Requisitos:** [Clase 02 — Reducción paralela](./reduccion-paralela) y [Primitiva C — `__syncthreads()`](../clases/syncthreads).

| Pieza | Dónde |
| --- | --- |
| Explicación | esta página |
| Laboratorio interactivo | [más abajo](#5-laboratorio-interactivo) |
| Código CPU-testable | [`native/examples/memory-access/`](https://github.com/fbientrigo/simulagpu/tree/main/native/examples/memory-access) |
| Ejercicio | [Ejercicio 04 — patrones de acceso](./ejercicio-04-acceso-memoria) · [`native/exercises/04-memory-access/`](https://github.com/fbientrigo/simulagpu/tree/main/native/exercises/04-memory-access) |
| Tarjetas de repaso | [Tarjetas Anki](./anki) |

::: warning Límite de esta clase
Aquí motivamos almacenamiento reutilizable dentro de un bloque, pero **no enseñamos todavía a declarar ni usar `__shared__`**. Esa herramienta pertenece a la Primitiva D. Tampoco simulamos cachés, transacciones de memoria, warps, scheduling ni tiempos de ejecución.
:::

## 1. De trabajo independiente a trabajo cooperativo

En una suma de vectores, el hilo `i` puede leer `A[i]` y `B[i]`, calcular y escribir `C[i]`. Su resultado no necesita el de sus vecinos.

Un patrón de vecindad cambia eso. Imagina dos fases:

```text
fase 1: cada hilo produce output[i]

fase 2: cada hilo usa
        output[i - 1], output[i], output[i + 1]
```

Ahora el hilo `i` puede leer un valor producido por `i - 1` o `i + 1`. La segunda fase no debe comenzar mientras falten escrituras necesarias de la primera.

Como ya conoces la Primitiva C, la frontera conceptual es:

```cpp
// fase 1: cada hilo escribe su resultado
output[i] = ...;

__syncthreads();

// fase 2: los hilos del bloque pueden consumir los resultados requeridos
```

No estamos aprendiendo una barrera nueva. Estamos aprendiendo **a reconocer cuándo una dependencia entre fases requiere la barrera que ya conocemos**.

## 2. ¿Dónde vive cada dato?

Para razonar con claridad separaremos dos casos.

### Valor privado por hilo

Una variable local simple como:

```cpp
float local = input[i] * 2.0f;
```

se trata en nuestro modelo como un valor privado del hilo. Ningún otro hilo lo referencia directamente.

### Memoria global del device

Un arreglo como `output` es visible mediante direcciones lógicas compartidas por el programa. En la escena usaremos índices pequeños:

```text
índice: [0] [1] [2] [3]
valor:   10  21  32  43
```

**Índice y valor no son lo mismo.** El índice responde «¿dónde?». El valor responde «¿qué hay ahí?».

## 3. El patrón de acceso también es información

Supón cuatro hilos. En un patrón contiguo:

```text
hilo 0 → [0]
hilo 1 → [1]
hilo 2 → [2]
hilo 3 → [3]
```

Las direcciones lógicas consecutivas difieren en 1.

Con `stride = 2`:

```text
hilo 0 → [0]
hilo 1 → [2]
hilo 2 → [4]
hilo 3 → [6]
```

Las direcciones difieren en 2.

CUDA usa el término **coalescing** para describir cómo los accesos de hilos cercanos pueden combinarse eficientemente según el hardware. En esta primera aproximación solo construiremos la intuición segura:

> Hilos cercanos que acceden a direcciones cercanas presentan una organización distinta de hilos cercanos que saltan entre direcciones.

No convertiremos esa diferencia en un número de transacciones, latencia ni aceleración: eso requeriría detalles de arquitectura y mediciones que este modelo deliberadamente no contiene.

## 4. Repetir lecturas revela una oportunidad

Con el patrón de vecindad:

```text
hilo 0 lee [0], [1]
hilo 1 lee [0], [1], [2]
hilo 2 lee [1], [2], [3]
```

algunos valores globales aparecen en las lecturas de varios hilos. Por ejemplo `[1]` puede ser usado por tres hilos.

Eso no demuestra por sí solo que un programa será más rápido si cambia. Sí permite afirmar algo más básico y útil:

**existe una oportunidad de reutilizar un dato que varios hilos del mismo bloque necesitan.**

La siguiente primitiva responderá cómo crear almacenamiento block-local para materializar esa reutilización. Aquí nos detenemos antes de su sintaxis y semántica.

## 5. Laboratorio interactivo

La escena mantiene la misma geometría y cambia solo el significado mostrado:

1. trabajo independiente y mapeo hilo → dirección;
2. dependencia entre dos fases y frontera de sincronización;
3. valores leídos más de una vez y oportunidad de reutilización.

<LaboratorioAccesoMemoria />

## 6. Código nativo: verdad CPU-testable

El ejemplo en [`native/examples/memory-access/`](https://github.com/fbientrigo/simulagpu/tree/main/native/examples/memory-access) construye el mismo patrón lógico con C++ ordinario. No intenta reproducir rendimiento de una GPU. Su objetivo es verificar:

- qué dirección corresponde a cada hilo lógico;
- qué vecinos consume cada salida;
- qué posiciones son reutilizadas por más de un hilo.

El [Ejercicio 04 — patrones de acceso](./ejercicio-04-acceso-memoria), cuyo proyecto independiente vive en [`native/exercises/04-memory-access/`](https://github.com/fbientrigo/simulagpu/tree/main/native/exercises/04-memory-access), usa el mismo núcleo CPU-testable para que puedas corregir índices y bordes sin necesitar CUDA instalado.

## 7. Comprueba tu modelo mental

Para un patrón nuevo, sigue este orden:

1. **Propiedad:** ¿qué valor pertenece solo a cada hilo?
2. **Ubicación:** ¿qué valores están en un arreglo global?
3. **Dependencia:** ¿una fase lee algo que otra todavía debe producir?
4. **Sincronización:** si la dependencia es block-local, ¿dónde debe estar la barrera?
5. **Mapeo:** ¿qué dirección lógica toca cada hilo?
6. **Reutilización:** ¿qué direcciones aparecen en las lecturas de varios hilos?

Si puedes contestar esas seis preguntas, ya puedes analizar una familia importante de algoritmos cooperativos sin inventar comportamiento del hardware.

## Siguiente paso

La **Primitiva D — `__shared__`** tomará la oportunidad que acabamos de identificar y enseñará cómo un bloque puede crear almacenamiento reutilizable, cómo se llena y dónde vuelve a ser necesaria la sincronización.
