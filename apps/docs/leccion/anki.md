---
title: Tarjetas Anki — Clases 01 y 02
description: Mazo de 40 tarjetas para repasar cudaMalloc, cudaMemcpy, índice global, suma de vectores y reducción paralela.
---

<script setup>
// withBase respects the site's base path, so the link keeps working when the
// site is served from a subdirectory such as /simulagpu/.
import { withBase } from 'vitepress';
</script>

# Tarjetas Anki — Clases 01 y 02

Mazo de repaso espaciado para:

- [Clase 01 — Del índice global a la suma de vectores](./indice-global-suma-vectores);
- [Clase 02 — De una suma secuencial a una reducción paralela](./reduccion-paralela).
- [Clase complementaria — `cudaMalloc`](../clases/cuda-malloc).
- [Clase complementaria — `cudaMemcpy`](../clases/cuda-memcpy).

<a :href="withBase('/descargas/simulagpu-anki.tsv')" download class="descarga-anki">
  Descargar simulagpu-anki.tsv
</a>

## Qué contiene

40 tarjetas:

| Lección | Tarjetas | Conceptos principales |
| --- | ---: | --- |
| Índice global y suma de vectores | 18 | grilla, bloque, guard, transferencias, errores y medición |
| Reducción paralela | 12 | carreras, árbol, cola impar, barreras, memoria compartida y punto flotante |
| `cudaMalloc` | 4 | reserva, contenido indefinido, punteros y liberación |
| `cudaMemcpy` | 6 | origen y destino, dirección, bytes vs elementos, copiar no es mover |

Cada tarjeta tiene un identificador permanente: `idx-*` para la Clase 01 y `red-*` para la Clase 02.
Las cuatro tarjetas de `cudaMalloc` usan identificadores permanentes `malloc-*` y las seis de `cudaMemcpy`
usan `memcpy-*`.

## Cómo importarlo

1. Descarga el archivo con el botón de arriba.
2. En Anki: **Archivo → Importar…** y elige el `.tsv`.
3. Deja marcado **Permitir HTML en los campos**.
4. El mazo aparece, por compatibilidad con la primera versión, como `SimulaGPU::01 Índice global`.

El nombre histórico del mazo se conserva temporalmente para no duplicar notas a quienes ya importaron la versión anterior. Las tarjetas de reducción llevan las etiquetas `reduccion` y `red-*`, por lo que pueden filtrarse o moverse a otro submazo dentro de Anki.

## Cómo usarlo

Estas tarjetas sirven para **recordar**, no para reemplazar los ejercicios. Completa primero la lección y ejecuta sus pruebas. Después, cinco minutos diarios son suficientes para mantener fórmulas, invariantes y errores comunes accesibles.

## Para quien contribuye

Las tarjetas se escriben en YAML bajo `anki/cards/`. El TSV se genera de forma determinista con:

```bash
pnpm anki:build
```

El formato está documentado en
[`anki/README.md`](https://github.com/fbientrigo/simulagpu/blob/main/anki/README.md).
La generación de `.apkg` sigue aplazada para evitar dependencias y plantillas binarias.

<style>
.descarga-anki {
  display: inline-block;
  margin: 1rem 0 1.5rem;
  padding: 0.6rem 1.1rem;
  border-radius: 8px;
  background: var(--vp-c-brand-1);
  color: var(--vp-c-white);
  font-weight: 600;
  text-decoration: none;
}
.descarga-anki:hover {
  background: var(--vp-c-brand-2);
}
</style>
