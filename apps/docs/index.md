---
layout: home

hero:
  name: SimulaGPU
  text: Programación GPU y paralela, en español
  tagline: Modelos deterministas que puedes manipular, código que puedes ejecutar y ejercicios que puedes verificar — sin necesitar una GPU para empezar.
  actions:
    - theme: brand
      text: Empezar por la Clase 0
      link: /clase-0/modelo-mental-gpu
    - theme: alt
      text: Lección 01
      link: /leccion/indice-global-suma-vectores
    - theme: alt
      text: Instalación
      link: /guia/instalacion

features:
  - title: Explica antes de optimizar
    details: Primero entender qué hilo toca qué dato, después que sea correcto, y solo entonces que sea rápido. Ningún truco de rendimiento antes de que el resultado esté verificado.
  - title: Visualizaciones que no mienten
    details: Modelos explicativos deterministas, con pruebas unitarias y estado compartible por URL. No simulan hardware ni ejecutan CUDA, y lo dicen.
  - title: Empieza sin GPU
    details: La aritmética de índices, el oráculo de CPU y las pruebas se compilan y ejecutan en cualquier máquina. CUDA es opcional y se detecta sola.
---

## Qué es esto

SimulaGPU es una plataforma educativa estática para aprender programación GPU y
paralela. Cada lección enlaza cinco piezas que tratan del mismo tema:

1. **documentación** que explica el concepto;
2. una **visualización interactiva** determinista para manipularlo;
3. **código C++ y CUDA** ejecutable;
4. un **ejercicio** con pruebas que te dicen si lo lograste;
5. **tarjetas Anki** para que no se te olvide en tres semanas.

## Estado: v0.1

Esta versión contiene la arquitectura completa, una introducción interactiva
sin prerrequisitos, y **una** lección terminada de principio a fin:

- [Clase 0: el modelo mental de una GPU](/clase-0/modelo-mental-gpu) — sin
  prerrequisitos, sin código, solo el modelo conceptual de chunks, bloques e
  hilos.
- [Del índice global a la suma de vectores](/leccion/indice-global-suma-vectores)
- [Ejercicio 01](/leccion/ejercicio-01-suma-de-vectores)
- [Tarjetas Anki](/leccion/anki)

Lo que viene después está en el
[roadmap](https://github.com/fbientrigo/simulagpu/blob/main/docs/roadmap.md):
reducciones, memoria compartida, algoritmos irregulares y casos aplicados.

## Honestidad sobre lo que se ejecutó

El código CUDA de este repositorio se escribió en una máquina **sin GPU y sin
`nvcc`**. Está aislado detrás de detección opcional de CMake y no ha sido
compilado ni ejecutado. Toda la parte de CPU sí: se construye y se prueba en
cada cambio.

SimulaGPU no publica cifras de rendimiento que no haya medido.
