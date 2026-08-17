<script setup lang="ts">
/**
 * Clase 0: mental model for host -> chunks -> grid/block/thread work
 * distribution. Canonical cell grammar shared with ClaseCudaMalloc: index and
 * value are visually distinct, host/device stay explicit, and inactive
 * threads state why they do nothing.
 */
import { computed, reactive, ref, watch } from 'vue';
import { CHUNK_FLOW_LIMITS, type ChunkFlowConfig, type SelectionKind } from '@simulagpu/contracts';
import {
  buildChunkFlowSnapshot,
  buildExerciseCases,
  decodeChunkFlowConfig,
  encodeChunkFlowConfig,
  normalizeChunkFlowConfig,
} from '@simulagpu/core';
import '@simulagpu/theme/tokens.css';

const props = withDefaults(
  defineProps<{
    /** Serialized configuration used for the initial render, e.g. `tb=96&bpc=16&tpb=4&sk=thread&si=7`. */
    initialQuery?: string;
    /** Keep `window.location` in sync so the current view can be shared or bookmarked. */
    syncUrl?: boolean;
  }>(),
  { initialQuery: '', syncUrl: true },
);

const config = ref<ChunkFlowConfig>(decodeChunkFlowConfig(props.initialQuery));
const snapshot = computed(() => buildChunkFlowSnapshot(config.value));

function actualizar(cambio: Partial<ChunkFlowConfig>): void {
  config.value = normalizeChunkFlowConfig({ ...config.value, ...cambio });
}

function seleccionar(kind: SelectionKind, index: number): void {
  actualizar({ selectedKind: kind, selectedIndex: index });
}

function esSeleccionado(kind: SelectionKind, index: number): boolean {
  return config.value.selectedKind === kind && config.value.selectedIndex === index;
}

const enlaceCompartible = computed(() => `?${encodeChunkFlowConfig(config.value)}`);

function escribirUrl(): void {
  if (!props.syncUrl || typeof window === 'undefined') return;
  const url = `${window.location.pathname}${enlaceCompartible.value}${window.location.hash}`;
  window.history.replaceState(window.history.state, '', url);
}

watch(config, escribirUrl);

/* Guided narration: presentation-only step pointer over the model's ten narrated steps. */
const currentStepIndex = ref(0);
const pasoActual = computed(() => snapshot.value.steps[currentStepIndex.value]);

function irAPaso(indice: number): void {
  currentStepIndex.value = Math.min(Math.max(indice, 0), snapshot.value.steps.length - 1);
}

/* Rendering budgets are view concerns; they never alter the snapshot. */
const chunksVisibles = computed(() => snapshot.value.chunks.slice(0, CHUNK_FLOW_LIMITS.maxRenderedChunks));
const chunksOcultos = computed(() => snapshot.value.chunks.length - chunksVisibles.value.length);
const bloquesVisibles = computed(() => snapshot.value.blocks.slice(0, CHUNK_FLOW_LIMITS.maxRenderedBlocks));
const bloquesOcultos = computed(() => snapshot.value.blocks.length - bloquesVisibles.value.length);

function rangoBytes(startByte: number, endByte: number): string {
  return endByte - startByte === 1 ? `byte ${startByte}` : `bytes ${startByte}–${endByte - 1}`;
}

/* Guided comprehension exercise. Deterministic: no randomness involved. */
const casosEjercicio = buildExerciseCases();
const respuestas = reactive<Record<string, number | null>>(
  Object.fromEntries(casosEjercicio.flatMap((caso) => caso.questions.map((pregunta) => [pregunta.id, null]))),
);

function responder(preguntaId: string, valor: number): void {
  respuestas[preguntaId] = valor;
}

function estadoRespuesta(preguntaId: string, correcta: number): 'sin-responder' | 'correcta' | 'incorrecta' {
  const respuesta = respuestas[preguntaId];
  if (respuesta === null || respuesta === undefined) return 'sin-responder';
  return respuesta === correcta ? 'correcta' : 'incorrecta';
}
</script>

<template>
  <section class="mental-model" aria-labelledby="mental-model-title">
    <header class="class-header">
      <p class="eyebrow">Clase 0 · modelo mental</p>
      <h2 id="mental-model-title">De bytes en la CPU a hilos en la GPU</h2>
      <p>Cómo se divide un bloque de datos del host en chunks, y cómo esos chunks se reparten entre hilos.</p>
      <p class="model-note">
        <strong>Modelo explicativo:</strong> no ejecuta CUDA ni mide hardware. Reproduce la aritmética de
        reparto — qué hilo procesa qué chunk — y nada más.
      </p>
    </header>

    <div class="config-controls">
      <div class="config-group" role="group" aria-label="Bytes totales en el host">
        <span>Bytes totales:</span>
        <button
          v-for="opcion in CHUNK_FLOW_LIMITS.totalBytesOptions"
          :key="opcion"
          type="button"
          :aria-pressed="config.totalBytes === opcion"
          :class="{ selected: config.totalBytes === opcion }"
          @click="actualizar({ totalBytes: opcion })"
        >
          {{ opcion }}
        </button>
      </div>
      <div class="config-group" role="group" aria-label="Bytes por chunk">
        <span>Bytes por chunk:</span>
        <button
          v-for="opcion in CHUNK_FLOW_LIMITS.bytesPerChunkOptions"
          :key="opcion"
          type="button"
          :aria-pressed="config.bytesPerChunk === opcion"
          :class="{ selected: config.bytesPerChunk === opcion }"
          @click="actualizar({ bytesPerChunk: opcion })"
        >
          {{ opcion }}
        </button>
      </div>
      <div class="config-group" role="group" aria-label="Hilos por bloque">
        <span>Hilos por bloque:</span>
        <button
          v-for="opcion in CHUNK_FLOW_LIMITS.threadsPerBlockOptions"
          :key="opcion"
          type="button"
          :aria-pressed="config.threadsPerBlock === opcion"
          :class="{ selected: config.threadsPerBlock === opcion }"
          @click="actualizar({ threadsPerBlock: opcion })"
        >
          {{ opcion }}
        </button>
      </div>
    </div>

    <section class="scene" aria-labelledby="scene-title">
      <div class="scene-heading">
        <h3 id="scene-title">Datos e hilos</h3>
        <p class="expr" data-test="chunk-count-expr">{{ snapshot.chunkCountExpression.evaluated }}</p>
        <p class="expr" data-test="block-count-expr">{{ snapshot.blockCountExpression.evaluated }}</p>
      </div>

      <article class="memory-panel memory-panel--host">
        <h4><span aria-hidden="true">CPU</span> Host: datos divididos en chunks</h4>
        <p class="cell-label">índice de chunk arriba · rango de bytes abajo</p>
        <ol class="cells" aria-label="Chunks del host ordenados por índice, con su rango de bytes">
          <li
            v-for="chunk in chunksVisibles"
            :key="chunk.index"
            class="cell cell--valid"
            :class="{
              'cell--selected': esSeleccionado('chunk', chunk.index),
              'cell--changing': chunk.isPartial,
            }"
          >
            <button type="button" class="cell-button" @click="seleccionar('chunk', chunk.index)">
              <span class="sr-only"
                >Chunk {{ chunk.index }}, {{ rangoBytes(chunk.startByte, chunk.endByte)
                }}{{ chunk.isPartial ? ', incompleto' : '' }}</span
              >
              <span class="cell-index" aria-hidden="true">[{{ chunk.index }}]</span>
              <strong class="cell-content" aria-hidden="true">{{
                rangoBytes(chunk.startByte, chunk.endByte)
              }}</strong>
              <span v-if="chunk.isPartial" class="cell-badge" aria-hidden="true">parcial</span>
            </button>
          </li>
        </ol>
        <p v-if="chunksOcultos > 0" class="hidden-note">+{{ chunksOcultos }} chunks más no mostrados</p>
      </article>

      <article class="memory-panel memory-panel--device">
        <h4><span aria-hidden="true">GPU</span> Device: grid → bloques → hilos</h4>
        <p class="cell-label">índice global de hilo arriba · chunk asignado abajo</p>
        <div class="blocks" aria-label="Bloques de la grid, cada uno con sus hilos">
          <div v-for="block in bloquesVisibles" :key="block.index" class="block-row">
            <p class="block-label">
              Bloque {{ block.index }}
              <span v-if="block.isPartialBlock" class="cell-badge" aria-hidden="true">incompleto</span>
            </p>
            <ol class="cells" :aria-label="`Hilos del bloque ${block.index} ordenados por índice`">
              <li
                v-for="thread in block.threads"
                :key="thread.slot"
                class="cell"
                :class="[
                  thread.active ? 'cell--valid' : 'cell--inactive',
                  { 'cell--selected': esSeleccionado('thread', thread.slot) },
                ]"
              >
                <button type="button" class="cell-button" @click="seleccionar('thread', thread.slot)">
                  <span class="sr-only">
                    Hilo {{ thread.threadIdx }} del bloque {{ thread.blockIdx }}, índice global
                    {{ thread.slot }},
                    {{
                      thread.active ? `procesa el chunk ${thread.chunkIndex}` : 'inactivo, sin chunk asignado'
                    }}
                  </span>
                  <span class="cell-index" aria-hidden="true">[{{ thread.slot }}]</span>
                  <strong class="cell-content" aria-hidden="true">{{
                    thread.active ? `c${thread.chunkIndex}` : '∅'
                  }}</strong>
                  <span v-if="!thread.active" class="cell-badge" aria-hidden="true">inactivo</span>
                </button>
              </li>
            </ol>
          </div>
        </div>
        <p v-if="bloquesOcultos > 0" class="hidden-note">+{{ bloquesOcultos }} bloques más no mostrados</p>
      </article>

      <p class="selection-summary" role="status" aria-live="polite" data-test="selection-summary">
        {{ snapshot.selected.descripcion }}
      </p>
    </section>

    <section class="stage" aria-labelledby="stage-title">
      <nav class="step-nav" aria-label="Pasos del modelo mental">
        <button
          v-for="(paso, indice) in snapshot.steps"
          :key="paso.id"
          type="button"
          class="step-button"
          :class="{ 'step-button--current': currentStepIndex === indice }"
          :aria-current="currentStepIndex === indice ? 'step' : undefined"
          @click="irAPaso(indice)"
        >
          <span aria-hidden="true">{{ indice + 1 }}</span> {{ paso.titulo.replace(/^\d+\.\s*/, '') }}
        </button>
      </nav>
      <article class="step-card">
        <h3 id="stage-title">{{ pasoActual?.titulo }}</h3>
        <p>{{ pasoActual?.descripcion }}</p>
      </article>
      <div class="step-controls">
        <button
          type="button"
          class="secondary-action"
          :disabled="currentStepIndex === 0"
          @click="irAPaso(currentStepIndex - 1)"
        >
          Anterior
        </button>
        <button
          type="button"
          class="primary-action"
          :disabled="currentStepIndex === snapshot.steps.length - 1"
          @click="irAPaso(currentStepIndex + 1)"
        >
          Siguiente
        </button>
      </div>
    </section>

    <section class="exercise" aria-labelledby="exercise-title">
      <h3 id="exercise-title">Comprueba tu modelo mental</h3>
      <div v-for="caso in casosEjercicio" :key="caso.id" class="exercise-case">
        <p class="exercise-case-config">
          {{ caso.totalBytes }} bytes totales · chunks de {{ caso.bytesPerChunk }} bytes ·
          {{ caso.threadsPerBlock }}
          hilos por bloque
        </p>
        <ol class="checks">
          <li v-for="pregunta in caso.questions" :key="pregunta.id" class="check-card">
            <fieldset>
              <legend>{{ pregunta.prompt }}</legend>
              <label v-for="opcion in pregunta.options" :key="opcion.value">
                <input
                  type="radio"
                  :name="pregunta.id"
                  :checked="respuestas[pregunta.id] === opcion.value"
                  @change="responder(pregunta.id, opcion.value)"
                />
                <span>{{ opcion.label }}</span>
              </label>
            </fieldset>
            <p
              v-if="estadoRespuesta(pregunta.id, pregunta.correctValue) !== 'sin-responder'"
              class="feedback"
              role="status"
            >
              <strong>{{
                estadoRespuesta(pregunta.id, pregunta.correctValue) === 'correcta'
                  ? 'Correcto.'
                  : 'Todavía no.'
              }}</strong>
              {{ pregunta.explanation }}
            </p>
          </li>
        </ol>
      </div>
    </section>
  </section>
</template>

<style scoped>
.mental-model {
  max-width: 100%;
  overflow-wrap: anywhere;
  border: 1px solid var(--sgpu-border);
  border-radius: var(--sgpu-radius-md);
  background: var(--sgpu-surface);
  color: var(--sgpu-text);
}

.class-header,
.stage,
.exercise {
  padding: clamp(1rem, 4vw, 1.5rem);
}

.class-header h2,
.stage h3,
.scene h3,
.memory-panel h4,
.exercise h3 {
  margin-top: 0;
}

.eyebrow {
  margin: 0 0 var(--sgpu-gap-sm);
  color: var(--sgpu-text-muted);
  font-size: var(--sgpu-font-size-xs);
  font-weight: 700;
  letter-spacing: 0.08em;
}

.model-note {
  margin-bottom: 0;
  padding: var(--sgpu-gap-md);
  border-left: 4px solid var(--sgpu-boundary-accent);
  background: var(--sgpu-surface-muted);
  font-size: var(--sgpu-font-size-sm);
}

.config-controls {
  display: flex;
  flex-direction: column;
  gap: var(--sgpu-gap-sm);
  padding: 0 clamp(1rem, 4vw, 1.5rem) 1rem;
}

.config-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sgpu-gap-sm);
  font-size: var(--sgpu-font-size-sm);
}

button {
  min-height: 44px;
  border: 1px solid var(--sgpu-border);
  border-radius: var(--sgpu-radius-sm);
  padding: 0.55rem 0.75rem;
  background: var(--sgpu-surface-muted);
  color: var(--sgpu-text);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

button:focus-visible {
  outline: 3px solid var(--sgpu-selected-ring);
  outline-offset: 2px;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.config-group button {
  min-width: 44px;
  padding-inline: 0.5rem;
}

button.selected,
button[aria-pressed='true'],
.step-button--current {
  border: 2px solid var(--sgpu-selected-border);
  box-shadow: 0 0 0 2px var(--sgpu-selected-ring);
}

.scene {
  padding: clamp(1rem, 4vw, 1.5rem);
  border-block: 1px solid var(--sgpu-border);
  background: var(--sgpu-surface-muted);
}

.scene-heading {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sgpu-gap-sm);
  align-items: baseline;
  margin-bottom: var(--sgpu-gap-md);
}

.expr {
  margin: 0;
  font-family: var(--sgpu-font-mono);
  font-size: var(--sgpu-font-size-sm);
}

.memory-panel {
  min-width: 0;
  margin-bottom: var(--sgpu-gap-md);
  border: 2px solid;
  border-radius: var(--sgpu-radius-md);
  padding: var(--sgpu-gap-md);
}

.memory-panel--host {
  border-color: var(--sgpu-host-border);
  background: var(--sgpu-host-bg);
  color: var(--sgpu-host-text);
}

.memory-panel--device {
  border-color: var(--sgpu-device-border);
  background: var(--sgpu-device-bg);
  color: var(--sgpu-device-text);
}

.memory-panel h4 {
  display: flex;
  align-items: center;
  gap: var(--sgpu-gap-sm);
  margin: 0 0 var(--sgpu-gap-sm);
  line-height: 1.2;
}

.memory-panel h4 span:first-child {
  display: inline-block;
  border: 1px solid currentColor;
  border-radius: 999px;
  padding: 0.1rem 0.45rem;
  font-size: var(--sgpu-font-size-xs);
}

.cell-label {
  margin: 0 0 var(--sgpu-gap-sm);
  font-size: var(--sgpu-font-size-sm);
}

.block-row + .block-row {
  margin-top: var(--sgpu-gap-md);
}

.block-label {
  margin: 0 0 0.35rem;
  font-size: var(--sgpu-font-size-sm);
  font-weight: 700;
}

.cells {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(3.5rem, 1fr));
  gap: var(--sgpu-gap-sm);
  list-style: none;
  margin: 0;
  padding: 0;
}

.cells > li {
  margin: 0;
}

.cell {
  min-width: 0;
  overflow: hidden;
  border: 2px solid;
  border-radius: var(--sgpu-radius-sm);
  font-family: var(--sgpu-font-mono);
  text-align: center;
}

.cell-button {
  display: grid;
  width: 100%;
  min-height: 4.25rem;
  grid-template-rows: auto 1fr auto;
  border: 0;
  border-radius: 0;
  background: transparent;
  padding: 0;
  font: inherit;
  color: inherit;
}

.cell-index {
  padding: 0.2rem 0.25rem;
  border-bottom: 1px solid currentColor;
  font-size: var(--sgpu-font-size-xs);
  font-weight: 700;
}

.cell-content {
  display: grid;
  min-height: 2rem;
  place-items: center;
  padding: 0.2rem;
  font-size: 0.95rem;
}

.cell-badge {
  padding: 0.1rem 0.2rem 0.3rem;
  font-size: var(--sgpu-font-size-xs);
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.cell--valid {
  border-color: var(--sgpu-active-border);
  background: var(--sgpu-active-bg);
  color: var(--sgpu-active-text);
}

.cell--inactive {
  border-color: var(--sgpu-inactive-border);
  border-style: dashed;
  background: var(--sgpu-inactive-bg);
  color: var(--sgpu-inactive-text);
}

.cell--changing {
  border-color: var(--sgpu-changing-border);
  border-style: double;
  background: var(--sgpu-changing-bg);
  color: var(--sgpu-changing-text);
}

.cell--selected {
  box-shadow: 0 0 0 3px var(--sgpu-selected-ring);
  border-color: var(--sgpu-selected-border);
}

.hidden-note {
  margin: var(--sgpu-gap-sm) 0 0;
  color: var(--sgpu-text-muted);
  font-size: var(--sgpu-font-size-xs);
}

.selection-summary {
  margin: var(--sgpu-gap-md) 0 0;
  padding: var(--sgpu-gap-sm);
  border-radius: var(--sgpu-radius-sm);
  background: var(--sgpu-surface);
  font-size: var(--sgpu-font-size-sm);
}

.step-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: var(--sgpu-gap-md);
}

.step-button {
  flex: 1 1 6.5rem;
  font-size: var(--sgpu-font-size-xs);
}

.step-card {
  margin-bottom: var(--sgpu-gap-md);
  padding: var(--sgpu-gap-md);
  border: 1px solid var(--sgpu-border);
  border-radius: var(--sgpu-radius-sm);
  background: var(--sgpu-surface-muted);
}

.step-controls {
  display: flex;
  gap: var(--sgpu-gap-sm);
}

.primary-action {
  border-color: var(--sgpu-selected-border);
  background: var(--sgpu-selected-border);
  color: #ffffff;
}

.exercise {
  border-top: 1px solid var(--sgpu-border);
}

.exercise-case + .exercise-case {
  margin-top: var(--sgpu-gap-md);
}

.exercise-case-config {
  font-family: var(--sgpu-font-mono);
  font-size: var(--sgpu-font-size-sm);
  color: var(--sgpu-text-muted);
}

.checks {
  padding-left: 0;
  list-style: none;
  margin: 0;
}

.check-card {
  margin-bottom: var(--sgpu-gap-md);
}

.check-card fieldset {
  min-width: 0;
  border: 1px solid var(--sgpu-border);
  border-radius: var(--sgpu-radius-sm);
  padding: var(--sgpu-gap-md);
}

.check-card legend {
  padding-inline: var(--sgpu-gap-sm);
  font-weight: 700;
}

.check-card label {
  display: flex;
  min-height: 44px;
  align-items: center;
  gap: var(--sgpu-gap-sm);
}

.check-card input {
  width: 1.25rem;
  height: 1.25rem;
  flex: 0 0 auto;
}

.feedback {
  padding: var(--sgpu-gap-sm);
  border-radius: var(--sgpu-radius-sm);
  background: var(--sgpu-surface-muted);
}

.sr-only {
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

@media (min-width: 720px) {
  .config-controls {
    flex-direction: row;
    flex-wrap: wrap;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cell {
    transition: none;
  }
}
</style>
