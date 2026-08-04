---
title: Fuentes y atribución
description: De dónde vienen los conceptos de SimulaGPU y qué se reutilizó de cada fuente.
---

# Fuentes y atribución

Esta página es el resumen para lectores. El registro completo, entrada por
entrada, está en
[`docs/sources.md`](https://github.com/fbientrigo/simulagpu/blob/main/docs/sources.md).

## De dónde viene la lección 01

**Curso GPU Programming, CERN STEAM Academy 2026**
([CERN-STEAM-Academy/26-GPU-PROGRAMMING](https://github.com/CERN-STEAM-Academy/26-GPU-PROGRAMMING)),
por Anton Wijs y Jan Heemstra (Eindhoven University of Technology).
Licencia: **GPL-3.0**.

De ahí vienen la elección de la suma de vectores como primer ejercicio, la
secuencia de conceptos —índice global, guard de límites, división redondeada
hacia arriba, transferencias, verificación contra CPU—, la idea de entregar un
kernel deliberadamente roto para que el estudiante lo arregle, y la lista de
temas posteriores con los que esta base debe seguir siendo compatible.

**No se copió ningún archivo de código.** La GPL-3.0 es una licencia copyleft:
reutilizar su código obligaría a licenciar SimulaGPU bajo los mismos términos.
Todos los ejemplos de este repositorio están reescritos desde cero.

**CSC Latin America 2026 — HEP Computing Exercises** (`csc2026_e1`).
Sin archivo de licencia, es decir, todos los derechos reservados.

De ahí vienen patrones pedagógicos, no código: "primero correcto, después
paralelo, después rápido"; ejercicios autocontenidos con su propio
`CMakeLists.txt`; código de partida deliberadamente incorrecto en vez de
archivos que faltan; CMake con Ninja como flujo de trabajo documentado; y CI
como red de seguridad didáctica.

Tampoco se copió código de ahí.

## De dónde viene la Clase 0

La Clase 0 reutiliza la misma terminología estándar de grid, bloque, hilo,
host y device que la lección 01 (vocabulario estándar de CUDA, sin obligación
de atribución). El resto — dividir un buffer de bytes en chunks, las dos
fórmulas, la secuencia guiada de diez pasos y el simulador isométrico— es
original de SimulaGPU: ninguno de los repositorios de referencia enseña la
introducción a la GPU con esta metáfora.

## Qué es original

Todo el contenido de este sitio, el código de `native/`, `packages/` y `apps/`,
las tarjetas de Anki y las visualizaciones se escribieron para SimulaGPU.

## Advertencia sobre CUDA

El código CUDA de este repositorio **no ha sido compilado ni ejecutado**: la
v0.1 se escribió en una máquina sin GPU y sin `nvcc`. Está aislado detrás de
detección opcional de CMake, revisado a mano y basado en la API documentada,
pero no verificado en hardware.

Si lo ejecutas y encuentras un error,
[abre un issue](https://github.com/fbientrigo/simulagpu/issues).
