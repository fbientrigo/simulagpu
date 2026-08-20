---
title: Descarga Anki
description: Descarga e importa en Anki el mazo de repaso de SimulaGPU.
---

<script setup>
import { withBase } from 'vitepress';
</script>

# Descarga Anki

El mazo descargable usa el mismo contenido canónico que las [tarjetas interactivas](./anki). Puedes estudiar en la web o llevar exactamente las mismas preguntas a Anki.

<a :href="withBase('/descargas/simulagpu-anki.tsv')" download class="descarga-anki">
  Descargar simulagpu-anki.tsv
</a>

## Cómo importar

1. Descarga el archivo.
2. En Anki: **Archivo → Importar…** y elige el `.tsv`.
3. Deja marcado **Permitir HTML en los campos**.
4. El mazo aparece, por compatibilidad con la primera versión, como `SimulaGPU::01 Índice global`.

El nombre histórico del mazo se conserva temporalmente para no duplicar notas a quienes ya importaron la versión anterior.

## Qué contiene

37 tarjetas para:

- [Clase 01 — Del índice global a la suma de vectores](./indice-global-suma-vectores);
- [Clase 02 — De una suma secuencial a una reducción paralela](./reduccion-paralela);
- [Clase complementaria — `cudaMalloc`](../clases/cuda-malloc);
- [Clase complementaria — `cudaMemcpy`](../clases/cuda-memcpy).

| Lección | Tarjetas | Conceptos principales |
| --- | ---: | --- |
| Índice global y suma de vectores | 18 | grilla, bloque, guard, transferencias, errores y medición |
| Reducción paralela | 9 | carreras, árbol, cola impar, reducción por pasadas y punto flotante |
| `cudaMalloc` | 4 | reserva, contenido indefinido, punteros y liberación |
| `cudaMemcpy` | 6 | origen y destino, dirección, bytes vs elementos, copiar no es mover |

Cada tarjeta mantiene un identificador permanente. Ese identificador permite que una futura capa de repetición espaciada conserve historial sin crear otro conjunto de tarjetas.

## Cómo estudiar estas tarjetas

Sirven para **recordar**, no para reemplazar los ejercicios. Intenta formular la respuesta antes de revelar y califica el recuerdo, no la dificultad de la pregunta.

Si prefieres una sesión rápida sin instalar nada, abre las [tarjetas interactivas](./anki).

## Para quien contribuye

Las tarjetas se escriben una sola vez en YAML bajo `anki/cards/`. `pnpm anki:build` genera tanto el TSV descargable como el JSON que consume el reviewer web. Ninguno de los dos archivos generados se versiona.

El formato está documentado en [`anki/README.md`](https://github.com/fbientrigo/simulagpu/blob/main/anki/README.md). La generación de `.apkg` sigue aplazada para evitar dependencias y plantillas binarias.

<style>
.descarga-anki {
  display: inline-block;
  margin: 0.75rem 0 1rem;
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
