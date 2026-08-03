<script setup lang="ts">
/**
 * Interactive explanation of the CUDA global thread index.
 *
 * Boundaries this component respects (see `docs/architecture.md`):
 *  - it never computes indexing itself; every number it shows comes from a
 *    snapshot produced by `@simulagpu/core`;
 *  - it never mutates the snapshot; changing a control builds a new one;
 *  - `vista` is presentation only. It changes which columns are visible, never
 *    what the model computed.
 *
 * It is an explanatory model. It does not execute CUDA.
 */
import { computed, onMounted, ref, watch } from 'vue';
import { THREAD_INDEX_LIMITS, type ThreadIndexConfig } from '@simulagpu/contracts';
import {
  buildThreadIndexSnapshot,
  decodeThreadIndexConfig,
  encodeThreadIndexConfig,
  normalizeThreadIndexConfig,
} from '@simulagpu/core';
import '@simulagpu/theme/tokens.css';

const props = withDefaults(
  defineProps<{
    /** Serialized configuration used for the initial render, e.g. `n=100&bs=32&b=3&t=5`. */
    initialQuery?: string;
    /** Keep `window.location` in sync so the current view can be shared or bookmarked. */
    syncUrl?: boolean;
  }>(),
  { initialQuery: '', syncUrl: true },
);

const config = ref<ThreadIndexConfig>(decodeThreadIndexConfig(props.initialQuery));

/** The single source of every number rendered below. */
const snapshot = computed(() => buildThreadIndexSnapshot(config.value));

/** Presentation stage. Deliberately outside the config: it changes nothing that is computed. */
type Vista = 'estructura' | 'indices' | 'memoria';
const vista = ref<Vista>('indices');

const VISTAS: ReadonlyArray<{ id: Vista; etiqueta: string; ayuda: string }> = [
  { id: 'estructura', etiqueta: 'Estructura', ayuda: 'Solo la jerarquía grilla / bloque / hilo.' },
  { id: 'indices', etiqueta: 'Índices', ayuda: 'Muestra el índice global i de cada hilo.' },
  { id: 'memoria', etiqueta: 'Memoria', ayuda: 'Muestra qué elemento del vector escribe cada hilo.' },
];

const bloqueEtiquetas = THREAD_INDEX_LIMITS.blockSizes;

/**
 * Large grids are summarized instead of rendered thread by thread. This is a
 * rendering budget, not a change to the model: `snapshot.blocks` still holds
 * every block.
 */
const bloquesVisibles = computed(() => snapshot.value.blocks.slice(0, THREAD_INDEX_LIMITS.maxRenderedBlocks));
const bloquesOcultos = computed(() => snapshot.value.blocks.length - bloquesVisibles.value.length);

function actualizar(cambio: Partial<ThreadIndexConfig>): void {
  config.value = normalizeThreadIndexConfig({ ...config.value, ...cambio });
}

function alNumero(evento: Event): number {
  return Number((evento.target as HTMLInputElement | HTMLSelectElement).value);
}

const enlaceCompartible = computed(() => `?${encodeThreadIndexConfig(config.value)}`);

/**
 * URL synchronization lives here, in the view layer, so that the teaching model
 * stays free of platform globals.
 */
function escribirUrl(): void {
  if (!props.syncUrl || typeof window === 'undefined') return;
  const url = `${window.location.pathname}${enlaceCompartible.value}${window.location.hash}`;
  window.history.replaceState(window.history.state, '', url);
}

onMounted(() => {
  if (props.syncUrl && typeof window !== 'undefined' && window.location.search.length > 1) {
    config.value = decodeThreadIndexConfig(window.location.search);
  }
  escribirUrl();
});

watch(config, escribirUrl);

function claseHilo(activo: boolean, bloqueIdx: number, hiloIdx: number): string[] {
  const clases = [activo ? 'sgpu-hilo--activo' : 'sgpu-hilo--inactivo'];
  if (bloqueIdx === config.value.selectedBlock && hiloIdx === config.value.selectedThread) {
    clases.push('sgpu-hilo--seleccionado');
  }
  return clases;
}

function descripcionHilo(bloqueIdx: number, hiloIdx: number, indice: number, activo: boolean): string {
  const base = `Bloque ${bloqueIdx}, hilo ${hiloIdx}, índice global ${indice}`;
  return activo ? `${base}. Activo: escribe c[${indice}].` : `${base}. Inactivo: el guard i < n lo descarta.`;
}
</script>

<template>
  <section class="sgpu-explorador" aria-labelledby="sgpu-titulo">
    <h3 id="sgpu-titulo" class="sgpu-titulo">Explorador del índice global</h3>
    <p class="sgpu-aviso">
      Modelo explicativo. No ejecuta CUDA: reproduce con aritmética exacta cómo CUDA reparte los elementos del
      vector entre los hilos.
    </p>

    <div class="sgpu-controles" role="group" aria-label="Controles de la configuración del lanzamiento">
      <label class="sgpu-control">
        <span class="sgpu-control__etiqueta">Longitud del vector (n)</span>
        <input
          type="range"
          :min="THREAD_INDEX_LIMITS.minN"
          :max="256"
          :value="config.n"
          aria-label="Longitud del vector n"
          @input="actualizar({ n: alNumero($event) })"
        />
        <input
          type="number"
          class="sgpu-control__numero"
          :min="THREAD_INDEX_LIMITS.minN"
          :max="THREAD_INDEX_LIMITS.maxN"
          :value="config.n"
          aria-label="Longitud exacta del vector n"
          @change="actualizar({ n: alNumero($event) })"
        />
      </label>

      <label class="sgpu-control">
        <span class="sgpu-control__etiqueta">Hilos por bloque (blockDim.x)</span>
        <select
          :value="config.blockSize"
          aria-label="Hilos por bloque"
          @change="actualizar({ blockSize: alNumero($event) as ThreadIndexConfig['blockSize'] })"
        >
          <option v-for="tam in bloqueEtiquetas" :key="tam" :value="tam">{{ tam }}</option>
        </select>
      </label>

      <label class="sgpu-control">
        <span class="sgpu-control__etiqueta">Bloque seleccionado (blockIdx.x)</span>
        <input
          type="range"
          min="0"
          :max="snapshot.gridSize - 1"
          :value="config.selectedBlock"
          aria-label="Bloque seleccionado"
          @input="actualizar({ selectedBlock: alNumero($event) })"
        />
        <output class="sgpu-control__valor">{{ config.selectedBlock }}</output>
      </label>

      <label class="sgpu-control">
        <span class="sgpu-control__etiqueta">Hilo seleccionado (threadIdx.x)</span>
        <input
          type="range"
          min="0"
          :max="config.blockSize - 1"
          :value="config.selectedThread"
          aria-label="Hilo seleccionado dentro del bloque"
          @input="actualizar({ selectedThread: alNumero($event) })"
        />
        <output class="sgpu-control__valor">{{ config.selectedThread }}</output>
      </label>
    </div>

    <div class="sgpu-vistas" role="group" aria-label="Nivel de detalle mostrado">
      <button
        v-for="opcion in VISTAS"
        :key="opcion.id"
        type="button"
        class="sgpu-vista"
        :class="{ 'sgpu-vista--activa': vista === opcion.id }"
        :aria-pressed="vista === opcion.id"
        :title="opcion.ayuda"
        @click="vista = opcion.id"
      >
        {{ opcion.etiqueta }}
      </button>
    </div>

    <dl class="sgpu-resumen">
      <div class="sgpu-resumen__dato">
        <dt>Bloques lanzados (gridDim.x)</dt>
        <dd data-test="grid-size">{{ snapshot.gridSize }}</dd>
      </div>
      <div class="sgpu-resumen__dato">
        <dt>Hilos creados</dt>
        <dd data-test="total-threads">{{ snapshot.totalThreads }}</dd>
      </div>
      <div class="sgpu-resumen__dato">
        <dt>Hilos inactivos</dt>
        <dd data-test="inactive-threads">{{ snapshot.inactiveThreads }}</dd>
      </div>
      <div class="sgpu-resumen__dato">
        <dt>Último bloque parcial</dt>
        <dd data-test="partial-block">
          {{ snapshot.hasPartialBlock ? `sí, bloque ${snapshot.partialBlockIdx}` : 'no' }}
        </dd>
      </div>
    </dl>

    <div class="sgpu-formulas">
      <p class="sgpu-formula">
        <code data-test="index-formula">{{ snapshot.indexExpression.formula }}</code>
        <code data-test="index-substituted">{{ snapshot.indexExpression.substituted }}</code>
        <code data-test="index-evaluated">{{ snapshot.indexExpression.evaluated }}</code>
      </p>
      <p class="sgpu-formula">
        <code data-test="grid-formula">{{ snapshot.gridSizeExpression.formula }}</code>
        <code data-test="grid-substituted">{{ snapshot.gridSizeExpression.substituted }}</code>
        <code data-test="grid-evaluated">{{ snapshot.gridSizeExpression.evaluated }}</code>
      </p>
      <p class="sgpu-veredicto" data-test="veredicto">
        <template v-if="snapshot.selected.active">
          El hilo seleccionado está <strong>activo</strong>: {{ snapshot.selected.globalIndex }} &lt;
          {{ config.n }}, así que ejecuta
          <code
            >c[{{ snapshot.selected.globalIndex }}] = a[{{ snapshot.selected.globalIndex }}] + b[{{
              snapshot.selected.globalIndex
            }}]</code
          >.
        </template>
        <template v-else>
          El hilo seleccionado está <strong>inactivo</strong>: {{ snapshot.selected.globalIndex }} &gt;=
          {{ config.n }}. Sin el guard <code>if (i &lt; n)</code> escribiría fuera del arreglo.
        </template>
      </p>
    </div>

    <div class="sgpu-grilla" role="group" aria-label="Bloques e hilos de la grilla">
      <article
        v-for="bloque in bloquesVisibles"
        :key="bloque.blockIdx"
        class="sgpu-bloque"
        :class="{
          'sgpu-bloque--frontera': bloque.isBoundaryBlock,
          'sgpu-bloque--seleccionado': bloque.blockIdx === config.selectedBlock,
        }"
      >
        <header class="sgpu-bloque__cabecera">
          <span class="sgpu-bloque__titulo">blockIdx.x = {{ bloque.blockIdx }}</span>
          <span class="sgpu-bloque__conteo">{{ bloque.activeCount }} / {{ config.blockSize }} activos</span>
        </header>

        <ol class="sgpu-hilos" :aria-label="`Hilos del bloque ${bloque.blockIdx}`">
          <li
            v-for="hilo in bloque.threads"
            :key="hilo.threadIdx"
            class="sgpu-hilo"
            :class="claseHilo(hilo.active, bloque.blockIdx, hilo.threadIdx)"
            :title="descripcionHilo(bloque.blockIdx, hilo.threadIdx, hilo.globalIndex, hilo.active)"
          >
            <span class="sgpu-sr-solo">{{
              descripcionHilo(bloque.blockIdx, hilo.threadIdx, hilo.globalIndex, hilo.active)
            }}</span>
            <span aria-hidden="true" class="sgpu-hilo__contenido">
              <template v-if="vista === 'estructura'">t{{ hilo.threadIdx }}</template>
              <template v-else-if="vista === 'indices'">{{ hilo.globalIndex }}</template>
              <template v-else>
                <span v-if="hilo.element !== null">c[{{ hilo.element }}]</span>
                <span v-else>&mdash;</span>
              </template>
            </span>
          </li>
        </ol>
      </article>

      <p v-if="bloquesOcultos > 0" class="sgpu-truncado" data-test="truncado">
        Se muestran los primeros {{ bloquesVisibles.length }} bloques de {{ snapshot.gridSize }}. Quedan
        {{ bloquesOcultos }} bloques sin dibujar; el modelo si los calculo todos.
      </p>
    </div>

    <p class="sgpu-enlace">
      Configuración actual: <code data-test="enlace">{{ enlaceCompartible }}</code>
    </p>
  </section>
</template>

<style scoped>
.sgpu-explorador {
  border: 1px solid var(--sgpu-border);
  border-radius: var(--sgpu-radius-md);
  padding: var(--sgpu-gap-lg);
  background: var(--sgpu-surface);
  color: var(--sgpu-text);
}

.sgpu-titulo {
  margin: 0 0 var(--sgpu-gap-sm);
  font-size: 1.05rem;
}

.sgpu-aviso {
  margin: 0 0 var(--sgpu-gap-md);
  font-size: var(--sgpu-font-size-sm);
  color: var(--sgpu-text-muted);
}

.sgpu-controles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--sgpu-gap-md);
  margin-bottom: var(--sgpu-gap-md);
}

.sgpu-control {
  display: flex;
  flex-direction: column;
  gap: var(--sgpu-gap-xs);
  font-size: var(--sgpu-font-size-sm);
}

.sgpu-control__etiqueta {
  color: var(--sgpu-text-muted);
}

.sgpu-control__numero {
  width: 8rem;
  padding: 2px 4px;
  border: 1px solid var(--sgpu-border);
  border-radius: var(--sgpu-radius-sm);
  background: var(--sgpu-surface-muted);
  color: var(--sgpu-text);
}

.sgpu-control__valor {
  font-family: var(--sgpu-font-mono);
}

.sgpu-vistas {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sgpu-gap-sm);
  margin-bottom: var(--sgpu-gap-md);
}

.sgpu-vista {
  padding: 4px 10px;
  border: 1px solid var(--sgpu-border);
  border-radius: var(--sgpu-radius-sm);
  background: var(--sgpu-surface-muted);
  color: var(--sgpu-text);
  font-size: var(--sgpu-font-size-sm);
  cursor: pointer;
}

.sgpu-vista--activa {
  border-color: var(--sgpu-selected-border);
  box-shadow: 0 0 0 2px var(--sgpu-selected-ring);
}

.sgpu-resumen {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--sgpu-gap-sm);
  margin: 0 0 var(--sgpu-gap-md);
}

.sgpu-resumen__dato {
  background: var(--sgpu-surface-muted);
  border-radius: var(--sgpu-radius-sm);
  padding: var(--sgpu-gap-sm);
}

.sgpu-resumen dt {
  font-size: var(--sgpu-font-size-xs);
  color: var(--sgpu-text-muted);
}

.sgpu-resumen dd {
  margin: 0;
  font-family: var(--sgpu-font-mono);
  font-size: var(--sgpu-font-size-md);
}

.sgpu-formulas {
  margin-bottom: var(--sgpu-gap-md);
}

.sgpu-formula {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sgpu-gap-sm);
  margin: 0 0 var(--sgpu-gap-xs);
}

.sgpu-formula code {
  font-family: var(--sgpu-font-mono);
  font-size: var(--sgpu-font-size-sm);
}

.sgpu-veredicto {
  margin: var(--sgpu-gap-sm) 0 0;
  font-size: var(--sgpu-font-size-sm);
}

.sgpu-grilla {
  display: flex;
  flex-direction: column;
  gap: var(--sgpu-gap-sm);
  max-height: 26rem;
  overflow-y: auto;
}

.sgpu-bloque {
  border: 1px solid var(--sgpu-border);
  border-radius: var(--sgpu-radius-sm);
  padding: var(--sgpu-gap-sm);
  background: var(--sgpu-surface-muted);
}

.sgpu-bloque--frontera {
  border-left: 3px solid var(--sgpu-boundary-accent);
}

.sgpu-bloque--seleccionado {
  box-shadow: 0 0 0 2px var(--sgpu-selected-ring);
}

.sgpu-bloque__cabecera {
  display: flex;
  justify-content: space-between;
  gap: var(--sgpu-gap-sm);
  font-family: var(--sgpu-font-mono);
  font-size: var(--sgpu-font-size-xs);
  color: var(--sgpu-text-muted);
  margin-bottom: var(--sgpu-gap-xs);
}

.sgpu-hilos {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sgpu-gap-xs);
  list-style: none;
  margin: 0;
  padding: 0;
}

.sgpu-hilo {
  min-width: 2.6rem;
  padding: 2px 4px;
  text-align: center;
  border: 1px solid;
  border-radius: var(--sgpu-radius-sm);
  font-family: var(--sgpu-font-mono);
  font-size: var(--sgpu-font-size-xs);
}

.sgpu-hilo--activo {
  background: var(--sgpu-active-bg);
  border-color: var(--sgpu-active-border);
  color: var(--sgpu-active-text);
}

/* Inactive threads are also marked with a dashed border so the distinction
   does not depend on colour alone. */
.sgpu-hilo--inactivo {
  background: var(--sgpu-inactive-bg);
  border-color: var(--sgpu-inactive-border);
  border-style: dashed;
  color: var(--sgpu-inactive-text);
}

.sgpu-hilo--seleccionado {
  outline: 2px solid var(--sgpu-selected-border);
  outline-offset: 1px;
}

.sgpu-truncado,
.sgpu-enlace {
  font-size: var(--sgpu-font-size-xs);
  color: var(--sgpu-text-muted);
}

.sgpu-sr-solo {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
