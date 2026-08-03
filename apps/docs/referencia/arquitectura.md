---
title: Arquitectura
description: Cómo está organizado SimulaGPU y qué reglas siguen las visualizaciones y el código nativo.
---

# Arquitectura

Resumen para quien lee las lecciones o quiere contribuir contenido. El
documento técnico completo, en inglés, está en
[`docs/architecture.md`](https://github.com/fbientrigo/simulagpu/blob/main/docs/architecture.md).

## Dos mitades

**La web** produce el sitio estático que estás leyendo y las visualizaciones
interactivas. **El código nativo** es C++ y CUDA que se compila y se ejecuta en
tu máquina. No se hablan entre sí: comparten los conceptos, no el código.

## Cómo fluye la parte web

```
contratos → modelos deterministas → snapshots inmutables → visualizaciones Vue → sitio VitePress
```

La flecha va en un solo sentido. Cada capa conoce a la anterior y nunca a la
siguiente.

Las reglas que importan al leer una visualización de SimulaGPU:

1. **El modelo no sabe que existe un navegador.** No importa Vue, ni VitePress,
   ni el DOM. Corre igual en una prueba, en Node o en tu navegador.
2. **La visualización no modifica el modelo.** Mover un control produce un
   *snapshot* nuevo; el anterior queda intacto.
3. **La misma configuración produce siempre el mismo resultado.** Por eso el
   estado cabe en la URL: `?n=100&bs=32&b=3&t=5` reproduce exactamente lo que
   estabas viendo.
4. **Los niveles de detalle cambian lo que se muestra, nunca lo que se calcula.**
   Cambiar entre "Estructura", "Índices" y "Memoria" no altera ni un número.

## Qué es y qué no es una visualización

Las visualizaciones de SimulaGPU son **modelos explicativos**. Calculan con
aritmética exacta el reparto de datos entre hilos —qué hilo toca qué elemento—
y lo dibujan.

No son simuladores. No ejecutan CUDA, no modelan warps, ni planificación, ni
jerarquía de memoria, ni tiempos. Cuando una visualización pudiera dar a
entender lo contrario, lo dice explícitamente en la propia página.

## Cómo fluye el código nativo

```
native/common → native/examples → native/exercises → pruebas y mediciones
```

Reglas:

1. **Todo ejercicio de CUDA tiene un oráculo de CPU correcto.** Sin referencia
   contra la que comparar, "funciona" no significa nada.
2. **La corrección va antes que el rendimiento.** Ninguna medición se publica
   antes de que el resultado esté verificado.
3. **La configuración solo-CPU compila sin CUDA instalada.** Puedes hacer casi
   todos los ejercicios sin GPU.
4. **CUDA es opcional y CMake la detecta sola.**
5. **CI no necesita GPU.** Lo que se comprueba automáticamente es la parte de
   CPU.
6. **El tiempo de kernel y el tiempo extremo a extremo se informan por
   separado.** Mezclarlos es la forma más fácil de exagerar una aceleración.
7. **Los errores de CUDA se informan y detienen el programa**, no se ignoran.

## Lo que deliberadamente no existe

La v0.1 no tiene backend, ni base de datos, ni autenticación, ni Docker, ni
gestor de contenidos, ni sistema de plugins, ni infraestructura de traducción,
ni framework genérico de visualización, ni capa de abstracción sobre CUDA. Se
publica como sitio estático en GitHub Pages y nada más.

No es una lista de pendientes: es una lista de cosas que se añadirán solo si
aparece un segundo caso real que las justifique.
