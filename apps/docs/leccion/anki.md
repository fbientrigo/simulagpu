---
title: Tarjetas Anki — Índice global
description: Mazo de 22 tarjetas de repaso espaciado para la clase cudaMalloc y la lección del índice global.
---

<script setup>
// withBase respects the site's base path, so the link keeps working when the
// site is served from a subdirectory such as /simulagpu/.
import { withBase } from 'vitepress';
</script>

# Tarjetas Anki — Índice global

Mazo de repaso espaciado de la [clase `cudaMalloc`](../clases/cuda-malloc) y de la lección
[Del índice global a la suma de vectores](./indice-global-suma-vectores).

<a :href="withBase('/descargas/simulagpu-anki.tsv')" download class="descarga-anki">
  Descargar simulagpu-anki.tsv
</a>

## Qué contiene

22 tarjetas: cuatro respuestas rápidas para cerrar la clase `cudaMalloc` y las
18 tarjetas existentes de la lección amplia.

| Área | Tarjetas | Ejemplo |
| --- | --- | --- |
| `cudaMalloc` | 4 | por qué reservar no inicializa ni cambia `h_A` |
| Conceptual | 2 | qué sabe un hilo sobre sí mismo al arrancar |
| Cálculo de índices | 3 | `blockIdx.x = 3`, `blockDim.x = 32`, `threadIdx.x = 5` → `i` |
| Condiciones de frontera | 3 | cuántos hilos sobran con `n = 1000` y bloques de 256 |
| Configuración del lanzamiento | 2 | cómo se calcula `gridDim.x` |
| Transferencias de memoria | 3 | qué dirección lleva `cudaMemcpyHostToDevice` |
| Medición | 2 | tiempo de kernel contra tiempo extremo a extremo |
| Errores comunes | 3 | por qué funciona con `n = 1024` y falla con `n = 1000` |

## Cómo importarlo

1. Descarga el archivo con el botón de arriba.
2. En Anki: **Archivo → Importar…** y elige el `.tsv`.
3. No hace falta configurar nada: el archivo trae dentro el nombre del mazo, el
   tipo de nota y el mapeo de columnas. Deja marcado **Permitir HTML en los
   campos**.
4. El mazo aparece como `SimulaGPU::01 Índice global`.

Cada tarjeta lleva su identificador como etiqueta (`idx-011`, `idx-042`…). Esos
identificadores son permanentes: si el mazo se actualiza, tu historial de repaso
se mantiene.

## Cómo usarlo

Estas tarjetas son para **recordar**, no para aprender. Haz primero la lección y
el [ejercicio](./ejercicio-01-suma-de-vectores); las tarjetas sirven para que
dentro de tres semanas sigas sabiendo por qué hace falta el guard.

Un repaso de cinco minutos al día vale más que una sesión larga cada dos
semanas: para eso está la repetición espaciada.

## Para quien contribuye

Las tarjetas se escriben en YAML, en `anki/cards/`, y el TSV se genera con
`pnpm anki:build`. El formato y las reglas están en
[`anki/README.md`](https://github.com/fbientrigo/simulagpu/blob/main/anki/README.md).

La generación de `.apkg` está aplazada: el TSV cubre el mismo caso de uso sin
añadir dependencias ni archivos binarios al repositorio.

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
