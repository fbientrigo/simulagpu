---
title: 'Clase 0: modelo mental de una GPU'
description: Antes de escribir una línea de CUDA, entiende cómo una GPU reparte datos entre miles de hilos usando chunks, bloques y una grid.
---

# Clase 0 — El modelo mental de una GPU

Esta es la clase cero de SimulaGPU: una introducción visual e interactiva,
sin código, para quien nunca ha programado una GPU. Al terminar vas a poder
mirar cualquier bloque de datos, decir cuántos "trocitos" (chunks) se forman,
cuántos hilos hacen falta, y por qué algunos de esos hilos a veces no tienen
nada que hacer.

**Prerrequisitos:** ninguno. No necesitas saber programar en CUDA, ni C++, ni
tener una GPU. Esta clase es 100% conceptual.

## Qué vas a aprender

- qué son el **host** (CPU) y el **device** (GPU), y qué hace cada uno;
- qué es un **byte** y por qué los datos se miden en bytes antes de repartirse;
- por qué los datos se dividen en **chunks** (piezas) antes de procesarlos;
- qué es la **grid**, qué es un **bloque** (block) y qué es un **hilo**
  (thread), y cómo se relacionan entre sí;
- por qué el trabajo en paralelo se organiza así, y no como una simple lista
  de tareas;
- por qué el último bloque a veces tiene **hilos inactivos**, y qué significa
  eso;
- que la transferencia de datos entre CPU y GPU es un paso real, aunque este
  modelo no lo mida;
- las dos fórmulas centrales de esta clase:

```
número de chunks  = ceil(bytes totales / bytes por chunk)
número de bloques = ceil(número de chunks / hilos por bloque)
```

::: warning Qué NO es esta clase
El simulador de más abajo es un **modelo explicativo determinista**. No
ejecuta CUDA, no emula el hardware interno de una GPU y no mide rendimiento
real. Tampoco enseña ocupancia, warps, coalescing, memoria compartida,
registros, instalación de CUDA ni optimización de kernels — esos temas
llegan más adelante, empezando por la
[Lección 01](../leccion/indice-global-suma-vectores).
:::

## De dónde salen estos números

Imagina que la CPU (el **host**) tiene un bloque de datos: por ejemplo, 64
bytes. Antes de mandarlos a la GPU (el **device**), el host los corta en
piezas del mismo tamaño, llamadas **chunks**. Si cada chunk mide 8 bytes:

```
número de chunks = ceil(64 / 8) = 8 chunks
```

Cada chunk necesita alguien que lo procese: un **hilo** (thread). Pero los
hilos no se lanzan sueltos — se agrupan en **bloques** (block) de tamaño
fijo. Si cada bloque tiene 4 hilos:

```
número de bloques = ceil(8 / 4) = 2 bloques
```

Los bloques, juntos, forman la **grid**. La jerarquía completa queda así:

```
grid → bloques (block) → hilos (thread) → chunk
```

## Cuando la división no es exacta

Con 64 bytes, chunks de 8 bytes y 4 hilos por bloque, todo encaja perfecto: 8
chunks, 2 bloques, 8 hilos, ninguno sobra. Pero eso no siempre pasa.

Con **96 bytes**, chunks de **16 bytes** y **4 hilos por bloque**:

```
número de chunks  = ceil(96 / 16) = 6 chunks
número de bloques = ceil(6 / 4)   = 2 bloques
```

Dos bloques de 4 hilos son 8 hilos en total, pero solo hay 6 chunks. **Los
otros 2 hilos quedan inactivos**: existen, entran a "ejecutar", pero no
tienen ningún chunk asignado. Esto es el equivalente conceptual de un guard
de límites (`if (índice < total)`) que vas a ver escrito como código de
verdad en la [Lección 01](../leccion/indice-global-suma-vectores). Por ahora,
basta con verlo: hilos que existen pero no hacen nada.

Esta situación — la división que no cae exacta — es la norma, no la
excepción. Por eso el simulador de abajo empieza justo en esa configuración.

## El modelo guiado

Usa los controles para cambiar la configuración. Cada chunk y cada hilo se
puede seleccionar — con clic o con teclado — y el panel de explicación se
actualiza según lo que hayas elegido. Los diez pasos guiados narran, en orden,
por qué la división no cae exacta.

<ModeloMentalGpu />

### Cómo usar los controles

| Control | Qué cambia |
| --- | --- |
| **Bytes totales** | cuántos bytes tiene el buffer que empieza en la CPU |
| **Bytes por chunk** | el tamaño de cada pieza en la que se divide el buffer |
| **Hilos por bloque** | cuántos hilos entran en cada bloque de la grid |
| **Anterior / Siguiente** | navegan la secuencia guiada de diez pasos |
| **Reiniciar** | vuelve al primer paso y pausa la reproducción automática |

Selecciona cualquier chunk, bloque o hilo del diagrama para ver su
explicación individual: a qué bytes corresponde, si está activo, y por qué.

### La secuencia guiada

1. Los datos comienzan en la CPU.
2. Dividimos los datos en chunks.
3. Preparamos el trabajo para la GPU (transferencia conceptual).
4. Los chunks se asignan a hilos.
5. Los hilos se organizan en bloques.
6. Todos los bloques forman la grid.
7. El procesamiento ocurre en paralelo.
8. Algunos hilos pueden quedar inactivos.
9. El resultado vuelve a la CPU.
10. Comprueba tu modelo mental.

## Ejemplos resueltos

| Bytes totales | Bytes por chunk | Hilos por bloque | Chunks | Bloques | Hilos inactivos |
| --- | --- | --- | --- | --- | --- |
| 32 | 4 | 2 | 8 | 4 | 0 |
| 64 | 8 | 4 | 8 | 2 | 0 |
| 96 | 16 | 4 | 6 | 2 | 2 |
| 128 | 32 | 8 | 4 | 1 | 4 |
| 256 | 32 | 8 | 8 | 1 | 0 |

Prueba estas cinco combinaciones en el simulador y confirma que los números
coinciden. Fíjate en particular en la fila de 128 bytes: no es que algo esté
mal — un solo bloque de 8 hilos, con solo 4 chunks que repartir, deja la
mitad de los hilos sin trabajo. Eso es exactamente lo que la fórmula predice.

## Errores comunes al pensar en esto

**"Si sobran hilos, algo está mal configurado."** No. Que el número de
chunks no sea múltiplo del tamaño de bloque es la situación normal, no un
error. El diseño existe precisamente para manejarla: los hilos de más entran,
no hacen nada, y terminan.

**"Cada hilo tiene que saber cuántos hilos hay en total."** No. Cada hilo
solo necesita saber su propia posición (en qué bloque está, y dónde dentro de
ese bloque) para deducir qué chunk le toca. No hay coordinación necesaria
entre hilos para repartirse el trabajo.

**"La transferencia de datos entre CPU y GPU es instantánea o no cuesta
nada."** No: es un paso real con un costo real, aunque este modelo
explicativo no lo mida. Este simulador solo muestra que la transferencia
ocurre — no cuánto tarda.

**"Todos los hilos activos hacen su trabajo exactamente al mismo tiempo
físico."** El modelo agrupa los hilos activos para mostrar que son
*independientes* entre sí — ninguno espera el resultado de otro — pero eso no
es lo mismo que decir que el hardware real los ejecuta todos en el mismo
instante. Cómo se planifica la ejecución real es un tema de una clase
posterior.

## Comprueba tu modelo mental

El simulador incluye un ejercicio guiado al final, con al menos tres
configuraciones distintas. Para cada una, antes de mirar la respuesta,
intenta calcular tú:

1. ¿Cuántos chunks se crean?
2. ¿Cuántos bloques hacen falta?
3. ¿Cuántos hilos quedan inactivos?

Usa las dos fórmulas de esta clase. El simulador te da retroalimentación
explicativa, no solo si acertaste o no.

## Resumen

- El host (CPU) prepara los datos; el device (GPU) los procesa.
- Los datos se dividen en chunks de tamaño fijo antes de repartirse.
- `número de chunks = ceil(bytes totales / bytes por chunk)`.
- Los hilos se agrupan en bloques; los bloques forman la grid.
- `número de bloques = ceil(número de chunks / hilos por bloque)`.
- Cuando la división no es exacta, el último bloque tiene hilos inactivos —
  la situación normal, no un error.
- La transferencia entre host y device es un paso real, aunque este modelo no
  lo mida.
- El simulador es un modelo explicativo determinista: no ejecuta CUDA ni
  emula hardware.

## Sigue

Con este modelo mental ya puedes seguir con la
**[Lección 01: del índice global a la suma de vectores](../leccion/indice-global-suma-vectores)**,
donde estas mismas ideas se convierten en código C++ y CUDA real, con un
kernel que puedes compilar y ejecutar.
