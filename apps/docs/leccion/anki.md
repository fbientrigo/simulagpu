---
title: Tarjetas Anki — repaso interactivo
description: Repasa en la web las 40 tarjetas de cudaMalloc, cudaMemcpy, índice global, suma de vectores y reducción paralela.
---

<script setup>
// withBase respects the site's base path, so both the reviewer and download keep
// working when the site is served from a subdirectory such as /simulagpu/.
import { withBase } from 'vitepress';
</script>

# Tarjetas Anki — repaso interactivo

No necesitas descargar nada para repasar. Las tarjetas que ves aquí salen del
mismo mazo canónico que la exportación de Anki.

<InteractiveAnkiReviewer :source="withBase('/data/simulagpu-anki.json')" />

## Qué contiene

40 tarjetas para:

- [Clase 01 — Del índice global a la suma de vectores](./indice-global-suma-vectores);
- [Clase 02 — De una suma secuencial a una reducción paralela](./reduccion-paralela);
- [Clase complementaria — `cudaMalloc`](../clases/cuda-malloc);
- [Clase complementaria — `cudaMemcpy`](../clases/cuda-memcpy).

| Lección | Tarjetas | Conceptos principales |
| --- | ---: | --- |
| Índice global y suma de vectores | 18 | grilla, bloque, guard, transferencias, errores y medición |
| Reducción paralela | 12 | carreras, árbol, cola impar, barreras, memoria compartida y punto flotante |
| `cudaMalloc` | 4 | reserva, contenido indefinido, punteros y liberación |
| `cudaMemcpy` | 6 | origen y destino, dirección, bytes vs elementos, copiar no es mover |

Cada tarjeta mantiene un identificador permanente. Ese identificador es la base
para que una futura capa de repetición espaciada pueda conservar historial sin
crear otro conjunto de tarjetas.

## ¿Prefieres Anki?

La descarga sigue disponible como opción. Es exactamente el mismo contenido en
formato TSV para importar en la aplicación de Anki.

<a :href="withBase('/descargas/simulagpu-anki.tsv')" download class="descarga-anki">
  Descargar simulagpu-anki.tsv
</a>

1. Descarga el archivo.
2. En Anki: **Archivo → Importar…** y elige el `.tsv`.
3. Deja marcado **Permitir HTML en los campos**.
4. El mazo aparece, por compatibilidad con la primera versión, como `SimulaGPU::01 Índice global`.

El nombre histórico del mazo se conserva temporalmente para no duplicar notas a
quienes ya importaron la versión anterior.

## Cómo usar estas tarjetas

Sirven para **recordar**, no para reemplazar los ejercicios. Intenta formular la
respuesta antes de revelar. Después califica el recuerdo, no la dificultad de la
pregunta: **La supe** si pudiste recuperarla; **No la supe** si necesitaste ver la
respuesta.

## Para quien contribuye

Las tarjetas se escriben una sola vez en YAML bajo `anki/cards/`. `pnpm
anki:build` genera tanto el TSV descargable como el JSON que consume este
reviewer. Ninguno de los dos archivos generados se versiona.

El formato está documentado en
[`anki/README.md`](https://github.com/fbientrigo/simulagpu/blob/main/anki/README.md).
La generación de `.apkg` sigue aplazada para evitar dependencias y plantillas
binarias.

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
