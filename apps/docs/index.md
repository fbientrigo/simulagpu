---
layout: home

hero:
  name: SimulaGPU
  text: Programación GPU y paralela, en español
  tagline: Manipula modelos, completa kernels con controles guiados y ejecuta pruebas de corrección antes de necesitar una GPU.
  actions:
    - theme: brand
      text: Empezar por la Clase 0
      link: /clase-0/modelo-mental-gpu
    - theme: alt
      text: Clase 01
      link: /leccion/indice-global-suma-vectores
    - theme: alt
      text: Ver cudaMalloc
      link: /clases/cuda-malloc
    - theme: alt
      text: Abrir laboratorio de reducción
      link: /leccion/reduccion-paralela#laboratorio-interactivo

features:
  - title: Primero correcto
    details: Cada kernel parte de un oráculo CPU y casos de frontera. El rendimiento solo se discute después de demostrar que el resultado conserva los datos.
  - title: Código interactivo guiado
    details: La Clase 02 integra controles select dentro de un bloque CUDA. Puedes cambiar índices y guards, ejecutar pruebas y observar exactamente qué caso falla.
  - title: Empieza sin GPU
    details: Los modelos, el runner del navegador y las pruebas C++ CPU-only funcionan sin CUDA. La ruta GPU es opcional y está separada con honestidad.
---

## Qué es SimulaGPU

Cada clase enlaza cinco piezas sobre el mismo concepto:

1. **documentación** en español;
2. una **visualización o laboratorio interactivo** determinista;
3. **código C++ y CUDA** ejecutable;
4. un **ejercicio** con starter, solución y pruebas compartidas;
5. **tarjetas Anki** para repaso espaciado.

## Clases disponibles

### Clase 0 — El modelo mental de una GPU

Sin prerrequisitos y sin código: cómo se dividen los datos en chunks y se
reparten entre bloques e hilos, antes de ver una sola línea de CUDA.

- [Clase 0](/clase-0/modelo-mental-gpu)

### Clase 01 — Índice global

Aprende cómo una grilla reparte un vector entre hilos y por qué hacen falta la división redondeada hacia arriba y el guard de límites.

- [Lección 01](/leccion/indice-global-suma-vectores)
- [Ejercicio 01](/leccion/ejercicio-01-suma-de-vectores)

### Clase complementaria — `cudaMalloc`

Una clase corta de metodología: predice la transición de `cudaMalloc`, separa
lo que cambió de lo que no cambió y comprueba que reservar memoria no la
inicializa.

- [Clase `cudaMalloc`](/clases/cuda-malloc)

### Clase 02 — Reducción paralela

Aprende por qué un acumulador compartido crea una carrera, cómo una reducción en árbol combina pares disjuntos, cómo conservar una cola impar y dónde entran sincronización, memoria compartida y error de punto flotante.

El laboratorio permite seleccionar fragmentos del kernel y ejecutar pruebas guiadas para tamaños par, impar y unitario.

- [Lección y laboratorio 02](/leccion/reduccion-paralela)
- [Ejercicio 02](/leccion/ejercicio-02-reduccion)
- [Tarjetas Anki de ambas clases](/leccion/anki)

## Qué ejecuta el navegador

Las visualizaciones son modelos explicativos. En la Clase 02, **Ejecutar pruebas** evalúa un subconjunto controlado del kernel mediante aritmética CPU determinista. Esto permite feedback inmediato y seguro en GitHub Pages.

No contiene `nvcc`, no ejecuta una GPU y no simula planificación ni rendimiento. Para CUDA real, usa los ejemplos y ejercicios de `native/` en una máquina con CUDA Toolkit y GPU NVIDIA.

## Estado de verificación

Toda la ruta CPU se construye y prueba en cada cambio: modelos TypeScript, componentes Vue, sitio estático, C++ y CTest. Los `.cu` están aislados detrás de detección opcional y no forman parte del CI estándar sin GPU.

SimulaGPU no publica cifras de rendimiento que no haya medido.
