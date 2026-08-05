<script setup lang="ts">
/**
 * Guided explanation of the CUDA global thread index.
 *
 * Two modes, one model. `guiado` walks the six ideas in dependency order and
 * reveals each fact only once the learner has met the one it rests on; `libre`
 * is the unrestricted explorer for someone who already knows the story.
 *
 * Boundaries this component respects (see `docs/architecture.md`):
 *  - it never computes indexing itself; every number and every sentence it
 *    shows comes from `@simulagpu/core`;
 *  - it never mutates the snapshot; changing a control builds a new one;
 *  - mode, current step and answered checkpoints are presentation state. They
 *    change what is *shown*, never what is computed, and they stay out of the
 *    config, the snapshot and the URL.
 *
 * It is an explanatory model. It does not execute CUDA.
 */
import { computed, onMounted, ref, watch } from 'vue';
import {
  THREAD_INDEX_LIMITS,
  type GuidedCheckpoint,
  type GuidedStepId,
  type ThreadIndexConfig,
} from '@simulagpu/contracts';
import {
  GUIDED_THREAD_INDEX_CONFIG,
  buildGuidedTour,
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

/**
 * With no query the walkthrough starts on its own small preset rather than on
 * the model default: ten elements in blocks of four fit on a phone screen and
 * already have a partial last block.
 */
const config = ref<ThreadIndexConfig>(
  props.initialQuery.trim() === '' ? GUIDED_THREAD_INDEX_CONFIG : decodeThreadIndexConfig(props.initialQuery),
);

/** The single source of every number rendered below. */
const snapshot = computed(() => buildThreadIndexSnapshot(config.value));
/** The single source of every sentence the guided mode shows. */
const recorrido = computed(() => buildGuidedTour(snapshot.value));

/* ------------------------------------------------------------------ */
/* Presentation state. None of this reaches the config, the snapshot or the URL. */

type Modo = 'guiado' | 'libre';
const modo = ref<Modo>('guiado');

const pasoIndice = ref(0);
const pasos = computed(() => recorrido.value.steps);
const paso = computed(() => pasos.value[pasoIndice.value]);
const checkpointActual = computed(() => paso.value?.checkpoint ?? null);
const esUltimoPaso = computed(() => pasoIndice.value >= recorrido.value.totalSteps - 1);

/**
 * Chosen option per checkpoint.
 *
 * Keyed by the question itself, not just by the checkpoint id: every number a
 * question depends on is written into its text, so a configuration change
 * silently retires the old answer while an unrelated change — picking another
 * thread does not move `gridDim.x` — leaves it standing.
 */
const respuestas = ref<Record<string, string>>({});

type Vista = 'estructura' | 'indices' | 'memoria';
const vista = ref<Vista>('indices');

const VISTAS: ReadonlyArray<{ id: Vista; etiqueta: string; ayuda: string }> = [
  { id: 'estructura', etiqueta: 'Estructura', ayuda: 'Solo la jerarquía grilla / bloque / hilo.' },
  { id: 'indices', etiqueta: 'Índices', ayuda: 'Muestra el índice global i de cada hilo.' },
  { id: 'memoria', etiqueta: 'Memoria', ayuda: 'Muestra qué elemento del vector escribe cada hilo.' },
];

/** Shortcuts for the sizes the lesson keeps coming back to, so nobody has to type on a phone. */
const PRESETS_N = [10, 12, 100, 1000] as const;
const bloqueEtiquetas = THREAD_INDEX_LIMITS.blockSizes;

/* ------------------------------------------------------------------ */
/* Progressive disclosure */

function indiceDe(id: GuidedStepId): number {
  return pasos.value.findIndex((candidato) => candidato.id === id);
}

/** True when the step has no checkpoint, or when its checkpoint has been answered. */
function respondido(id: GuidedStepId): boolean {
  const objetivo = pasos.value.find((candidato) => candidato.id === id);
  if (objetivo === undefined) return false;
  if (objetivo.checkpoint === null) return true;
  return elegida(objetivo.checkpoint) !== undefined;
}

/**
 * Has the learner reached — and settled — the step that introduces this fact?
 *
 * This is what keeps the walkthrough from spoiling itself: the grid does not
 * show global indices while the learner is being asked to compute one, and it
 * does not colour discarded threads while the guard is still the question.
 */
function revelado(id: GuidedStepId): boolean {
  if (modo.value === 'libre') return true;
  const objetivo = indiceDe(id);
  if (objetivo === -1) return false;
  if (pasoIndice.value > objetivo) return true;
  return pasoIndice.value === objetivo && respondido(id);
}

const vistaEfectiva = computed<Vista>(() => {
  if (modo.value === 'libre') return vista.value;
  if (revelado('element')) return 'memoria';
  if (revelado('index')) return 'indices';
  return 'estructura';
});

const mostrarGrilla = computed(() => modo.value === 'libre' || pasoIndice.value >= indiceDe('grid'));
const mostrarTarjeta = computed(() => modo.value === 'libre' || pasoIndice.value >= indiceDe('thread'));
const mostrarControlesTamano = computed(
  () =>
    modo.value === 'libre' ||
    pasoIndice.value === indiceDe('problem') ||
    pasoIndice.value === indiceDe('element'),
);
const mostrarControlesHilo = computed(() => modo.value === 'libre' || pasoIndice.value >= indiceDe('thread'));
const mostrarAtajoDescartado = computed(
  () =>
    snapshot.value.inactiveThreads > 0 && (modo.value === 'libre' || pasoIndice.value >= indiceDe('guard')),
);

/* ------------------------------------------------------------------ */
/* Model updates */

function actualizar(cambio: Partial<ThreadIndexConfig>): void {
  config.value = normalizeThreadIndexConfig({ ...config.value, ...cambio });
}

function alNumero(evento: Event): number {
  return Number((evento.target as HTMLInputElement | HTMLSelectElement).value);
}

/** Position of the selected thread in launch order, counting across block boundaries. */
const hiloLineal = computed(
  () => config.value.selectedBlock * config.value.blockSize + config.value.selectedThread,
);

function seleccionarLineal(indice: number): void {
  const destino = Math.min(Math.max(indice, 0), snapshot.value.totalThreads - 1);
  actualizar({
    selectedBlock: Math.floor(destino / config.value.blockSize),
    selectedThread: destino % config.value.blockSize,
  });
}

function moverHilo(delta: number): void {
  seleccionarLineal(hiloLineal.value + delta);
}

function seleccionarHilo(bloqueIdx: number, hiloIdx: number): void {
  actualizar({ selectedBlock: bloqueIdx, selectedThread: hiloIdx });
}

/** The first thread the guard throws away is exactly the one with `i == n`. */
function verHiloDescartado(): void {
  if (snapshot.value.inactiveThreads > 0) {
    seleccionarLineal(config.value.n);
  }
}

/* ------------------------------------------------------------------ */
/* Navigation and checkpoints */

function irAPaso(indice: number): void {
  pasoIndice.value = Math.min(Math.max(indice, 0), recorrido.value.totalSteps - 1);
}

function avanzar(): void {
  if (esUltimoPaso.value) {
    modo.value = 'libre';
    return;
  }
  irAPaso(pasoIndice.value + 1);
}

function clave(checkpoint: GuidedCheckpoint): string {
  return `${checkpoint.id}|${checkpoint.question}`;
}

function elegida(checkpoint: GuidedCheckpoint): string | undefined {
  return respuestas.value[clave(checkpoint)];
}

function responder(checkpoint: GuidedCheckpoint, opcionId: string): void {
  respuestas.value = { ...respuestas.value, [clave(checkpoint)]: opcionId };
}

function respuestaElegida(checkpoint: GuidedCheckpoint) {
  return checkpoint.options.find((opcion) => opcion.id === elegida(checkpoint)) ?? null;
}

/* ------------------------------------------------------------------ */
/* URL synchronization: the only place in the web layer that touches a browser global. */

const enlaceCompartible = computed(() => `?${encodeThreadIndexConfig(config.value)}`);

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

/* ------------------------------------------------------------------ */
/* Grid rendering */

/**
 * Large grids are summarized instead of rendered thread by thread. This is a
 * rendering budget, not a change to the model: `snapshot.blocks` still holds
 * every block.
 */
const bloquesVisibles = computed(() => snapshot.value.blocks.slice(0, THREAD_INDEX_LIMITS.maxRenderedBlocks));
const bloquesOcultos = computed(() => snapshot.value.blocks.length - bloquesVisibles.value.length);
/**
 * Only bound the height once the grid is too tall to read at once. A nested
 * scrollbar is a nuisance on a phone, so the guided preset — twelve cells — never
 * gets one, while a launch big enough to bury the rest of the lesson does.
 */
const grillaDesplazable = computed(() => snapshot.value.totalThreads > 64);

function estaSeleccionado(bloqueIdx: number, hiloIdx: number): boolean {
  return bloqueIdx === config.value.selectedBlock && hiloIdx === config.value.selectedThread;
}

function claseHilo(activo: boolean, bloqueIdx: number, hiloIdx: number): string[] {
  const clases = [
    revelado('guard') ? (activo ? 'sgpu-hilo--activo' : 'sgpu-hilo--inactivo') : 'sgpu-hilo--neutro',
  ];
  if (estaSeleccionado(bloqueIdx, hiloIdx)) {
    clases.push('sgpu-hilo--seleccionado');
  }
  return clases;
}

function descripcionHilo(bloqueIdx: number, hiloIdx: number, indice: number, activo: boolean): string {
  const base = `Bloque ${bloqueIdx}, hilo ${hiloIdx}`;
  if (!revelado('index')) return `${base}. Seleccionar este hilo.`;
  const conIndice = `${base}, índice global ${indice}`;
  if (!revelado('guard')) return `${conIndice}. Seleccionar este hilo.`;
  return activo
    ? `${conIndice}. Activo: escribe c[${indice}].`
    : `${conIndice}. Inactivo: el guard i < n lo descarta.`;
}

const operacionSeleccionada = computed(() =>
  snapshot.value.selected.active
    ? `c[${snapshot.value.selected.globalIndex}] = a[${snapshot.value.selected.globalIndex}] + b[${snapshot.value.selected.globalIndex}]`
    : 'ninguna: el guard lo descartó',
);
</script>

<template>
  <section class="sgpu-explorador" aria-labelledby="sgpu-titulo">
    <header class="sgpu-cabecera">
      <h3 id="sgpu-titulo" class="sgpu-titulo">Explorador del índice global</h3>
      <p class="sgpu-aviso">
        Modelo explicativo. No ejecuta CUDA: reproduce con aritmética exacta cómo CUDA reparte los elementos
        del vector entre los hilos.
      </p>
      <div class="sgpu-modos" role="group" aria-label="Modo del explorador">
        <button
          type="button"
          class="sgpu-modo"
          :class="{ 'sgpu-modo--activo': modo === 'guiado' }"
          :aria-pressed="modo === 'guiado'"
          data-test="modo-guiado"
          @click="modo = 'guiado'"
        >
          Recorrido guiado
        </button>
        <button
          type="button"
          class="sgpu-modo"
          :class="{ 'sgpu-modo--activo': modo === 'libre' }"
          :aria-pressed="modo === 'libre'"
          data-test="modo-libre"
          @click="modo = 'libre'"
        >
          Exploración libre
        </button>
      </div>
    </header>

    <!-- ------------------------------------------------------------ -->
    <!-- Guided mode -->
    <div v-if="modo === 'guiado' && paso" class="sgpu-guia">
      <ol class="sgpu-progreso" aria-label="Pasos del recorrido">
        <li v-for="(item, indice) in pasos" :key="item.id">
          <button
            type="button"
            class="sgpu-progreso__paso"
            :class="{
              'sgpu-progreso__paso--actual': indice === pasoIndice,
              'sgpu-progreso__paso--visto': indice < pasoIndice,
            }"
            :aria-current="indice === pasoIndice ? 'step' : undefined"
            :aria-label="`Paso ${item.position}: ${item.title}`"
            @click="irAPaso(indice)"
          >
            {{ item.position }}
          </button>
        </li>
      </ol>

      <p class="sgpu-paso__contador" data-test="paso-progreso">
        Paso {{ paso.position }} de {{ recorrido.totalSteps }}
      </p>
      <h4 class="sgpu-paso__titulo" data-test="paso-titulo">{{ paso.title }}</h4>
      <p class="sgpu-paso__texto" data-test="paso-texto">{{ paso.prompt }}</p>

      <p v-if="paso.detail && respondido(paso.id)" class="sgpu-detalle">
        <code data-test="paso-detalle">{{ paso.detail }}</code>
      </p>

      <!-- A group rather than a fieldset: a legend long enough to wrap breaks out
           of the border it is meant to sit in, which on a phone is every legend. -->
      <div
        v-if="checkpointActual"
        class="sgpu-checkpoint"
        role="group"
        :aria-labelledby="`sgpu-pregunta-${checkpointActual.id}`"
      >
        <p :id="`sgpu-pregunta-${checkpointActual.id}`" class="sgpu-pregunta" data-test="checkpoint-pregunta">
          {{ checkpointActual.question }}
        </p>
        <div class="sgpu-opciones">
          <button
            v-for="opcion in checkpointActual.options"
            :key="opcion.id"
            type="button"
            class="sgpu-opcion"
            :class="{
              'sgpu-opcion--elegida': elegida(checkpointActual) === opcion.id,
              'sgpu-opcion--correcta': elegida(checkpointActual) !== undefined && opcion.correct,
            }"
            :aria-pressed="elegida(checkpointActual) === opcion.id"
            :data-test="`checkpoint-opcion-${opcion.id}`"
            @click="responder(checkpointActual, opcion.id)"
          >
            {{ opcion.label }}
          </button>
        </div>
        <p
          v-if="respuestaElegida(checkpointActual)"
          class="sgpu-feedback"
          :class="respuestaElegida(checkpointActual)?.correct ? 'sgpu-feedback--bien' : 'sgpu-feedback--mal'"
          role="status"
          data-test="checkpoint-respuesta"
        >
          {{ respuestaElegida(checkpointActual)?.feedback }}
        </p>
      </div>
    </div>

    <!-- ------------------------------------------------------------ -->
    <!-- Controls -->
    <div v-if="mostrarControlesTamano" class="sgpu-controles" role="group" aria-label="Tamaño del problema">
      <label class="sgpu-control">
        <span class="sgpu-control__etiqueta">Longitud del vector (n)</span>
        <span class="sgpu-control__fila">
          <input
            type="number"
            inputmode="numeric"
            class="sgpu-control__numero"
            :min="THREAD_INDEX_LIMITS.minN"
            :max="THREAD_INDEX_LIMITS.maxN"
            :value="config.n"
            aria-label="Longitud del vector n"
            data-test="n"
            @change="actualizar({ n: alNumero($event) })"
          />
          <button
            v-for="preset in PRESETS_N"
            :key="preset"
            type="button"
            class="sgpu-chip"
            :class="{ 'sgpu-chip--activo': config.n === preset }"
            :data-test="`preset-n-${preset}`"
            @click="actualizar({ n: preset })"
          >
            {{ preset }}
          </button>
        </span>
      </label>

      <label class="sgpu-control">
        <span class="sgpu-control__etiqueta">Hilos por bloque (blockDim.x)</span>
        <select
          :value="config.blockSize"
          aria-label="Hilos por bloque"
          data-test="block-size"
          @change="actualizar({ blockSize: alNumero($event) as ThreadIndexConfig['blockSize'] })"
        >
          <option v-for="tam in bloqueEtiquetas" :key="tam" :value="tam">{{ tam }}</option>
        </select>
      </label>
    </div>

    <div v-if="mostrarControlesHilo" class="sgpu-navegacion-hilo" role="group" aria-label="Hilo seleccionado">
      <button
        type="button"
        class="sgpu-boton"
        :disabled="hiloLineal === 0"
        data-test="hilo-anterior"
        @click="moverHilo(-1)"
      >
        ← Hilo anterior
      </button>
      <button
        type="button"
        class="sgpu-boton"
        :disabled="hiloLineal >= snapshot.totalThreads - 1"
        data-test="hilo-siguiente"
        @click="moverHilo(1)"
      >
        Hilo siguiente →
      </button>
      <button
        v-if="mostrarAtajoDescartado"
        type="button"
        class="sgpu-boton"
        data-test="hilo-descartado"
        @click="verHiloDescartado"
      >
        Ver un hilo descartado
      </button>
    </div>

    <!-- ------------------------------------------------------------ -->
    <!-- One card for the current thread, instead of facts scattered around -->
    <dl v-if="mostrarTarjeta" class="sgpu-tarjeta" data-test="tarjeta" aria-label="Hilo seleccionado">
      <div class="sgpu-tarjeta__dato">
        <dt>blockIdx.x</dt>
        <dd data-test="tarjeta-bloque">{{ config.selectedBlock }}</dd>
      </div>
      <div class="sgpu-tarjeta__dato">
        <dt>threadIdx.x</dt>
        <dd data-test="tarjeta-hilo">{{ config.selectedThread }}</dd>
      </div>
      <div class="sgpu-tarjeta__dato">
        <dt>índice global i</dt>
        <dd data-test="tarjeta-indice">
          {{ revelado('index') ? snapshot.selected.globalIndex : '?' }}
        </dd>
      </div>
      <div class="sgpu-tarjeta__dato sgpu-tarjeta__dato--ancho">
        <dt>if (i &lt; n)</dt>
        <dd data-test="tarjeta-estado">
          <template v-if="!revelado('guard')">?</template>
          <template v-else-if="snapshot.selected.active">activo</template>
          <template v-else>descartado</template>
        </dd>
      </div>
      <div class="sgpu-tarjeta__dato sgpu-tarjeta__dato--ancho">
        <dt>operación</dt>
        <dd data-test="tarjeta-operacion">
          {{ revelado('element') ? operacionSeleccionada : '?' }}
        </dd>
      </div>
    </dl>

    <!-- ------------------------------------------------------------ -->
    <!-- Free exploration: everything the model knows, at once -->
    <template v-if="modo === 'libre'">
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

      <p class="sgpu-formulas">
        <code data-test="grid-substituted">
          {{ snapshot.gridSizeExpression.substituted }} = {{ snapshot.gridSize }}
        </code>
        <code data-test="index-substituted">
          {{ snapshot.indexExpression.substituted }} = {{ snapshot.indexExpression.value }}
        </code>
      </p>
    </template>

    <!-- ------------------------------------------------------------ -->
    <!-- The grid -->
    <div
      v-if="mostrarGrilla"
      class="sgpu-grilla"
      :class="{ 'sgpu-grilla--desplazable': grillaDesplazable }"
      role="group"
      aria-label="Bloques e hilos de la grilla. Toca un hilo para seleccionarlo."
    >
      <article
        v-for="bloque in bloquesVisibles"
        :key="bloque.blockIdx"
        class="sgpu-bloque"
        :class="{
          'sgpu-bloque--frontera': bloque.isBoundaryBlock && revelado('guard'),
          'sgpu-bloque--seleccionado': bloque.blockIdx === config.selectedBlock,
        }"
      >
        <header class="sgpu-bloque__cabecera">
          <span class="sgpu-bloque__titulo">blockIdx.x = {{ bloque.blockIdx }}</span>
          <span v-if="revelado('guard')" class="sgpu-bloque__conteo">
            {{ bloque.activeCount }} / {{ config.blockSize }} activos
          </span>
        </header>

        <ol class="sgpu-hilos" :aria-label="`Hilos del bloque ${bloque.blockIdx}`">
          <li v-for="hilo in bloque.threads" :key="hilo.threadIdx">
            <button
              type="button"
              class="sgpu-hilo"
              :class="claseHilo(hilo.active, bloque.blockIdx, hilo.threadIdx)"
              :aria-label="descripcionHilo(bloque.blockIdx, hilo.threadIdx, hilo.globalIndex, hilo.active)"
              :aria-pressed="estaSeleccionado(bloque.blockIdx, hilo.threadIdx)"
              @click="seleccionarHilo(bloque.blockIdx, hilo.threadIdx)"
            >
              <span aria-hidden="true">
                <template v-if="vistaEfectiva === 'estructura'">t{{ hilo.threadIdx }}</template>
                <template v-else-if="vistaEfectiva === 'indices'">{{ hilo.globalIndex }}</template>
                <template v-else>
                  <template v-if="hilo.element !== null">c[{{ hilo.element }}]</template>
                  <template v-else>&mdash;</template>
                </template>
              </span>
            </button>
          </li>
        </ol>
      </article>

      <p v-if="bloquesOcultos > 0" class="sgpu-truncado" data-test="truncado">
        Se muestran los primeros {{ bloquesVisibles.length }} bloques de {{ snapshot.gridSize }}. Quedan
        {{ bloquesOcultos }} bloques sin dibujar; el modelo sí los calculó todos.
      </p>
    </div>

    <!-- ------------------------------------------------------------ -->
    <nav v-if="modo === 'guiado'" class="sgpu-nav" aria-label="Navegación del recorrido">
      <button
        type="button"
        class="sgpu-boton"
        :disabled="pasoIndice === 0"
        data-test="paso-anterior"
        @click="irAPaso(pasoIndice - 1)"
      >
        Anterior
      </button>
      <button
        type="button"
        class="sgpu-boton sgpu-boton--principal"
        data-test="paso-siguiente"
        @click="avanzar"
      >
        {{ esUltimoPaso ? 'Explorar por mi cuenta' : 'Siguiente' }}
      </button>
    </nav>

    <p v-else class="sgpu-enlace">
      Configuración actual: <code data-test="enlace">{{ enlaceCompartible }}</code>
    </p>
  </section>
</template>

<style scoped>
.sgpu-explorador {
  border: 1px solid var(--sgpu-border);
  border-radius: var(--sgpu-radius-md);
  padding: clamp(var(--sgpu-gap-md), 3vw, var(--sgpu-gap-lg));
  background: var(--sgpu-surface);
  color: var(--sgpu-text);
  /* Long substituted formulas must never push the page sideways on a phone. */
  overflow-wrap: break-word;
}

.sgpu-cabecera {
  margin-bottom: var(--sgpu-gap-md);
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

.sgpu-modos {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sgpu-gap-sm);
}

.sgpu-modo,
.sgpu-vista,
.sgpu-chip,
.sgpu-boton,
.sgpu-opcion {
  border: 1px solid var(--sgpu-border);
  border-radius: var(--sgpu-radius-sm);
  background: var(--sgpu-surface-muted);
  color: var(--sgpu-text);
  font-size: var(--sgpu-font-size-sm);
  cursor: pointer;
  touch-action: manipulation;
}

.sgpu-modo {
  flex: 1 1 9rem;
  min-height: 2.5rem;
  padding: 0 var(--sgpu-gap-md);
}

.sgpu-modo--activo,
.sgpu-vista--activa,
.sgpu-chip--activo {
  border-color: var(--sgpu-selected-border);
  box-shadow: 0 0 0 2px var(--sgpu-selected-ring);
}

/* ---- guided walkthrough ---- */

.sgpu-guia {
  margin-bottom: var(--sgpu-gap-md);
}

.sgpu-progreso {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sgpu-gap-xs);
  list-style: none;
  margin: 0 0 var(--sgpu-gap-sm);
  padding: 0;
}

.sgpu-progreso__paso {
  width: 2rem;
  height: 2rem;
  border: 1px solid var(--sgpu-border);
  border-radius: 50%;
  background: var(--sgpu-surface-muted);
  color: var(--sgpu-text-muted);
  font-family: var(--sgpu-font-mono);
  font-size: var(--sgpu-font-size-xs);
  cursor: pointer;
  touch-action: manipulation;
}

.sgpu-progreso__paso--visto {
  background: var(--sgpu-active-bg);
  border-color: var(--sgpu-active-border);
  color: var(--sgpu-active-text);
}

.sgpu-progreso__paso--actual {
  border-color: var(--sgpu-selected-border);
  box-shadow: 0 0 0 2px var(--sgpu-selected-ring);
  color: var(--sgpu-text);
  font-weight: 700;
}

.sgpu-paso__contador {
  margin: 0;
  font-size: var(--sgpu-font-size-xs);
  color: var(--sgpu-text-muted);
}

.sgpu-paso__titulo {
  margin: var(--sgpu-gap-xs) 0 var(--sgpu-gap-sm);
  font-size: var(--sgpu-font-size-md);
}

.sgpu-paso__texto {
  margin: 0 0 var(--sgpu-gap-sm);
  font-size: var(--sgpu-font-size-sm);
  line-height: 1.55;
}

.sgpu-detalle {
  margin: 0 0 var(--sgpu-gap-md);
  padding: var(--sgpu-gap-sm);
  border-left: 3px solid var(--sgpu-selected-border);
  background: var(--sgpu-surface-muted);
  overflow-x: auto;
}

.sgpu-detalle code {
  font-family: var(--sgpu-font-mono);
  font-size: var(--sgpu-font-size-sm);
  /* Wrap at spaces rather than clip: a substituted formula that runs off a
     narrow screen is worse than one that takes two lines. */
  overflow-wrap: break-word;
}

.sgpu-checkpoint {
  margin: 0 0 var(--sgpu-gap-md);
  padding: var(--sgpu-gap-md);
  border: 1px solid var(--sgpu-border);
  border-radius: var(--sgpu-radius-sm);
}

.sgpu-pregunta {
  margin: 0;
  font-size: var(--sgpu-font-size-sm);
  font-weight: 700;
  line-height: 1.5;
}

.sgpu-opciones {
  display: grid;
  gap: var(--sgpu-gap-sm);
  margin-top: var(--sgpu-gap-sm);
}

.sgpu-opcion {
  min-height: 2.75rem;
  padding: var(--sgpu-gap-sm) var(--sgpu-gap-md);
  text-align: left;
}

.sgpu-opcion--elegida {
  border-color: var(--sgpu-selected-border);
  box-shadow: 0 0 0 2px var(--sgpu-selected-ring);
}

/* Once answered, the right option is marked whatever the learner picked. */
.sgpu-opcion--correcta {
  background: var(--sgpu-active-bg);
  border-color: var(--sgpu-active-border);
  color: var(--sgpu-active-text);
}

.sgpu-feedback {
  margin: var(--sgpu-gap-sm) 0 0;
  font-size: var(--sgpu-font-size-sm);
  line-height: 1.5;
}

.sgpu-feedback--bien {
  color: var(--sgpu-active-text);
}

.sgpu-feedback--mal {
  color: var(--sgpu-text);
}

/* ---- controls ---- */

.sgpu-controles {
  display: grid;
  /* min() keeps the track from overflowing a 320px screen. */
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr));
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

.sgpu-control__fila {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sgpu-gap-xs);
}

.sgpu-control__numero,
.sgpu-controles select {
  min-height: 2.5rem;
  padding: 0 var(--sgpu-gap-sm);
  border: 1px solid var(--sgpu-border);
  border-radius: var(--sgpu-radius-sm);
  background: var(--sgpu-surface-muted);
  color: var(--sgpu-text);
  font-size: var(--sgpu-font-size-sm);
}

.sgpu-control__numero {
  width: 5.5rem;
}

.sgpu-chip {
  min-width: 2.75rem;
  min-height: 2.5rem;
  padding: 0 var(--sgpu-gap-sm);
  font-family: var(--sgpu-font-mono);
}

.sgpu-navegacion-hilo,
.sgpu-nav {
  display: flex;
  flex-wrap: wrap;
  /* Keep buttons the same height when one of the labels wraps to two lines. */
  align-items: stretch;
  gap: var(--sgpu-gap-sm);
  margin-bottom: var(--sgpu-gap-md);
}

.sgpu-boton {
  flex: 1 1 9rem;
  min-height: 2.75rem;
  padding: 0 var(--sgpu-gap-md);
}

.sgpu-boton:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sgpu-boton--principal {
  border-color: var(--sgpu-selected-border);
  font-weight: 700;
}

.sgpu-nav {
  margin: var(--sgpu-gap-md) 0 0;
}

/* ---- current-thread card ---- */

.sgpu-tarjeta {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--sgpu-gap-xs);
  margin: 0 0 var(--sgpu-gap-md);
  padding: var(--sgpu-gap-sm);
  border: 1px solid var(--sgpu-selected-border);
  border-radius: var(--sgpu-radius-sm);
  background: var(--sgpu-surface-muted);
}

.sgpu-tarjeta__dato {
  padding: var(--sgpu-gap-xs) var(--sgpu-gap-sm);
}

.sgpu-tarjeta__dato--ancho {
  grid-column: 1 / -1;
}

.sgpu-tarjeta dt {
  font-size: var(--sgpu-font-size-xs);
  color: var(--sgpu-text-muted);
}

.sgpu-tarjeta dd {
  margin: 0;
  font-family: var(--sgpu-font-mono);
  font-size: var(--sgpu-font-size-md);
}

/* ---- free exploration ---- */

.sgpu-vistas {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sgpu-gap-sm);
  margin-bottom: var(--sgpu-gap-md);
}

.sgpu-vista {
  min-height: 2.5rem;
  padding: 0 var(--sgpu-gap-md);
}

.sgpu-resumen {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 10rem), 1fr));
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
  display: flex;
  flex-direction: column;
  gap: var(--sgpu-gap-xs);
  margin: 0 0 var(--sgpu-gap-md);
  overflow-x: auto;
}

.sgpu-formulas code {
  font-family: var(--sgpu-font-mono);
  font-size: var(--sgpu-font-size-sm);
  white-space: nowrap;
}

/* ---- grid ---- */

.sgpu-grilla {
  display: flex;
  flex-direction: column;
  gap: var(--sgpu-gap-sm);
}

.sgpu-grilla--desplazable {
  max-height: min(24rem, 60vh);
  overflow-y: auto;
  /* Keep a phone's scroll gesture inside the grid instead of bouncing the page. */
  overscroll-behavior: contain;
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
  /* auto-fill instead of flex wrapping: cells keep one size and one rhythm at
     any width, and a 4-thread block does not stretch into a single wide row. */
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(2.9rem, 1fr));
  gap: var(--sgpu-gap-xs);
  list-style: none;
  margin: 0;
  padding: 0;
}

/* VitePress styles `.vp-doc li` — including a margin between siblings that
   knocks every cell but the first out of alignment. Reset it here rather than
   fight it from the page. */
.sgpu-hilos li,
.sgpu-progreso li {
  display: flex;
  margin: 0;
  padding: 0;
  list-style: none;
}

.sgpu-hilo {
  width: 100%;
  min-height: 2.25rem;
  padding: 2px;
  text-align: center;
  border: 1px solid;
  border-radius: var(--sgpu-radius-sm);
  font-family: var(--sgpu-font-mono);
  font-size: var(--sgpu-font-size-xs);
  cursor: pointer;
  touch-action: manipulation;
}

/* Before the guard is introduced, no cell claims to be active or discarded. */
.sgpu-hilo--neutro {
  background: var(--sgpu-surface);
  border-color: var(--sgpu-border);
  color: var(--sgpu-text);
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

.sgpu-enlace code {
  overflow-wrap: anywhere;
}

@media (max-width: 30rem) {
  .sgpu-tarjeta {
    grid-template-columns: repeat(2, 1fr);
  }

  .sgpu-tarjeta__dato:nth-child(3) {
    grid-column: 1 / -1;
  }
}
</style>
