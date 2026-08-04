---
title: Fuentes y atribución
description: De dónde vienen los conceptos de SimulaGPU, qué se reutilizó y qué se reescribió desde cero.
---

# Fuentes y atribución

El registro técnico completo, con cada ruta consultada, está en
[`docs/sources.md`](https://github.com/fbientrigo/simulagpu/blob/main/docs/sources.md).

## Curso GPU Programming — CERN STEAM Academy 2026

Repositorio:
[CERN-STEAM-Academy/26-GPU-PROGRAMMING](https://github.com/CERN-STEAM-Academy/26-GPU-PROGRAMMING).
Licencia: **GPL-3.0**.

SimulaGPU usa de este curso la progresión conceptual:

- suma de vectores para aprender índice global y límites;
- reducción para pasar de trabajo independiente a un resultado compartido;
- memoria compartida y reducción optimizada como siguiente nivel;
- algoritmos irregulares y casos aplicados más adelante.

### Clase 01

De `1-vector-add/` vienen la selección del problema y los conceptos de índice
global, guard de límites, división redondeada hacia arriba, transferencias y
validación contra CPU.

### Clase 02

De `2-reduction/reduction.cu` vienen el problema de sumar muchos valores en
paralelo, la reducción por pares en varias pasadas, el cuidado con tamaños
impares y la necesidad de comparar contra una referencia numérica más fiable.

**No se copió código del curso.** La GPL-3.0 es copyleft; todos los ejemplos,
pruebas, visualizaciones y explicaciones de SimulaGPU están reescritos desde
cero. El laboratorio con editor guiado y `select` es original de este proyecto.

## CSC Latin America 2026 — HEP Computing Exercises

Repositorio de referencia: `csc2026_e1`. No contiene archivo `LICENSE`, por lo
que no concede permiso para copiar.

Se reutilizaron únicamente patrones pedagógicos:

- primero corrección, después paralelismo, después rendimiento;
- starter que compila pero está deliberadamente equivocado;
- ejercicio autocontenido con CMake y pruebas;
- el mismo contrato de pruebas para starter y solución;
- CI como red de seguridad didáctica.

Tampoco se copió código de este repositorio.

## Qué ejecuta realmente el sitio

Las visualizaciones y el laboratorio ejecutan modelos aritméticos
deterministas en el navegador. El botón **Ejecutar pruebas** de la Clase 02
comprueba un subconjunto guiado del kernel mediante un oráculo CPU para tamaños
par, impar y unitario.

No contienen `nvcc`, no compilan CUDA, no usan una GPU y no predicen
rendimiento. La ejecución CUDA real vive en `native/` y requiere CUDA Toolkit
más una GPU NVIDIA.

## Estado de verificación

El CI estándar construye y prueba toda la configuración CPU-only. Los archivos
`.cu` están aislados detrás de detección opcional de CMake, pero no son parte
del build obligatorio porque el runner no tiene `nvcc` ni hardware GPU.

SimulaGPU no publica cifras de rendimiento que no haya medido en la máquina que
las produjo.
