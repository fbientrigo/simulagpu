---
title: 'Ejercicio 04 — Patrones de acceso y vecindad'
description: 'Ejercicio CPU-testable de la Clase 3 para practicar índices contiguos, stride y bordes.'
---

# Ejercicio 04 — Patrones de acceso y vecindad

El ejercicio vive en `native/exercises/04-memory-access/`. El starter compila, pero sus pruebas comienzan rojas porque contiene tres errores deliberados de índices.

```bash
cd native/exercises/04-memory-access/starter
cmake -S . -B build -G Ninja
cmake --build build
ctest --test-dir build --output-on-failure
```

Corrige únicamente `starter/src/memory_access.cpp` hasta que las pruebas queden verdes.

Practicarás tres ideas:

1. hilo `t` → dirección contigua `t`;
2. hilo `t` → dirección con stride `(t * stride) % n`;
3. vecinos válidos de un índice sin leer fuera del arreglo.

Las pruebas son CPU-only. No necesitas CUDA y no se mide rendimiento GPU.

Consulta el [`README.md` del ejercicio](https://github.com/fbientrigo/simulagpu/tree/main/native/exercises/04-memory-access) para la tabla de TODO, síntomas comunes y criterio de éxito.

[Volver a Clase 3](./cooperacion-memoria-acceso)
