<script setup lang="ts">
/**
 * Clase 0: interactive isometric-style mental model of how a GPU divides
 * data into chunks and distributes it across blocks and threads.
 *
 * Boundaries this component respects (see `docs/architecture.md`):
 *  - it never computes chunk/block/thread arithmetic itself; every number it
 *    shows comes from a snapshot produced by `@simulagpu/core`;
 *  - it never mutates the snapshot; changing a control builds a new one;
 *  - the current guided step and autoplay state are presentation only. They
 *    change what is narrated and highlighted, never what is computed.
 *
 * It is an explanatory model. It does not execute CUDA and does not emulate
 * GPU hardware.
 */
import { computed, onUnmounted, reactive, ref, watch } from 'vue';
import { CHUNK_FLOW_LIMITS, type ChunkFlowConfig, type SelectionKind } from '@simulagpu/contracts';
import {
  STEP_COUNT,
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

/** The single source of every number rendered below. */
const snapshot = computed(() => buildChunkFlowSnapshot(config.value));

function actualizar(cambio: Partial<ChunkFlowConfig>): void {
  config.value = normalizeChunkFlowConfig({ ...config.value, ...cambio });
}

function alNumero(evento: Event): number {
  return Number((evento.target as HTMLInputElement | HTMLSelectElement).value);
}

function seleccionar(kind: SelectionKind, index: number): void {
  actualizar({ selectedKind: kind, selectedIndex: index });
}

const enlaceCompartible = computed(() => `?${encodeChunkFlowConfig(config.value)}`);

function escribirUrl(): void {
  if (!props.syncUrl || typeof window === 'undefined') return;
  const url = `${window.location.pathname}${enlaceCompartible.value}${window.location.hash}`;
  window.history.replaceState(window.history.state, '', url);
}

watch(config, escribirUrl);

/* --- Guided pedagogical sequence: presentation state, never the model. --- */

const currentStepIndex = ref(0);
const pasoActual = computed(() => snapshot.value.steps[currentStepIndex.value]);

type Modo = 'paso' | 'auto';
const modo = ref<Modo>('paso');
const reproduciendo = ref(false);

const AUTOPLAY_INTERVAL_MS = 1800;
let temporizador: ReturnType<typeof setInterval> | undefined;

function limpiarTemporizador(): void {
  if (temporizador !== undefined) {
    clearInterval(temporizador);
    temporizador = undefined;
  }
}

function irAPaso(indice: number): void {
  if (indice < 0) currentStepIndex.value = 0;
  else if (indice >= STEP_COUNT) currentStepIndex.value = STEP_COUNT - 1;
  else currentStepIndex.value = indice;
}

function pausar(): void {
  reproduciendo.value = false;
  limpiarTemporizador();
}

function reproducir(): void {
  if (reproduciendo.value) return;
  reproduciendo.value = true;
  limpiarTemporizador();
  // The interval only advances a presentation index on a fixed cadence; it
  // never touches `config`, so the computed values it reveals never depend
  // on timing. Playback is deterministic in content, not in wall-clock pace.
  temporizador = setInterval(() => {
    if (currentStepIndex.value >= STEP_COUNT - 1) {
      pausar();
      return;
    }
    currentStepIndex.value += 1;
  }, AUTOPLAY_INTERVAL_MS);
}

function pasoSiguiente(): void {
  irAPaso(currentStepIndex.value + 1);
}

function pasoAnterior(): void {
  irAPaso(currentStepIndex.value - 1);
}

function reiniciar(): void {
  pausar();
  modo.value = 'paso';
  irAPaso(0);
}

watch(modo, (nuevo) => {
  if (nuevo === 'auto') reproducir();
  else pausar();
});

onUnmounted(limpiarTemporizador);

/* --- Rendering budgets: a display concern, never a change to the model. --- */

const chunksVisibles = computed(() => snapshot.value.chunks.slice(0, CHUNK_FLOW_LIMITS.maxRenderedChunks));
const chunksOcultos = computed(() => snapshot.value.chunks.length - chunksVisibles.value.length);

const bloquesVisibles = computed(() => snapshot.value.blocks.slice(0, CHUNK_FLOW_LIMITS.maxRenderedBlocks));
const bloquesOcultos = computed(() => snapshot.value.blocks.length - bloquesVisibles.value.length);

function claseChunk(indice: number, esParcial: boolean): string[] {
  const clases = [esParcial ? 'sim-chunk--parcial' : 'sim-chunk--completo'];
  if (config.value.selectedKind === 'chunk' && config.value.selectedIndex === indice) {
    clases.push('sim-tile--seleccionado');
  }
  return clases;
}

function claseHilo(activo: boolean, slot: number): string[] {
  const clases = [activo ? 'sim-hilo--activo' : 'sim-hilo--inactivo'];
  if (config.value.selectedKind === 'thread' && config.value.selectedIndex === slot) {
    clases.push('sim-tile--seleccionado');
  }
  return clases;
}

function claseBloque(indice: number, esParcial: boolean): string[] {
  const clases = [esParcial ? 'sim-bloque--parcial' : 'sim-bloque--completo'];
  if (config.value.selectedKind === 'block' && config.value.selectedIndex === indice) {
    clases.push('sim-tile--seleccionado');
  }
  return clases;
}

/* --- Guided comprehension exercise. Deterministic: no randomness involved. --- */

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
  <section class="sim-simulador" aria-labelledby="sim-titulo">
    <h3 id="sim-titulo" class="sim-titulo">Simulador isométrico de GPU — Clase 0</h3>
    <p class="sim-aviso" data-test="aviso">
      Este es un <strong>modelo explicativo determinista</strong>. No ejecuta CUDA, no emula el hardware
      interno de una GPU y no mide rendimiento real.
    </p>

    <div class="sim-controles" role="group" aria-label="Controles de la configuración">
      <label class="sim-control">
        <span class="sim-control__etiqueta">Bytes totales</span>
        <select
          :value="config.totalBytes"
          aria-label="Bytes totales"
          data-test="control-total-bytes"
          @change="actualizar({ totalBytes: alNumero($event) })"
        >
          <option v-for="opcion in CHUNK_FLOW_LIMITS.totalBytesOptions" :key="opcion" :value="opcion">
            {{ opcion }}
          </option>
        </select>
      </label>

      <label class="sim-control">
        <span class="sim-control__etiqueta">Bytes por chunk</span>
        <select
          :value="config.bytesPerChunk"
          aria-label="Bytes por chunk"
          data-test="control-bytes-per-chunk"
          @change="actualizar({ bytesPerChunk: alNumero($event) as ChunkFlowConfig['bytesPerChunk'] })"
        >
          <option v-for="opcion in CHUNK_FLOW_LIMITS.bytesPerChunkOptions" :key="opcion" :value="opcion">
            {{ opcion }}
          </option>
        </select>
      </label>

      <label class="sim-control">
        <span class="sim-control__etiqueta">Hilos por bloque</span>
        <select
          :value="config.threadsPerBlock"
          aria-label="Hilos por bloque"
          data-test="control-threads-per-block"
          @change="actualizar({ threadsPerBlock: alNumero($event) as ChunkFlowConfig['threadsPerBlock'] })"
        >
          <option v-for="opcion in CHUNK_FLOW_LIMITS.threadsPerBlockOptions" :key="opcion" :value="opcion">
            {{ opcion }}
          </option>
        </select>
      </label>

      <label class="sim-control">
        <span class="sim-control__etiqueta">Modo</span>
        <select v-model="modo" aria-label="Modo de reproducción" data-test="control-modo">
          <option value="paso">Paso a paso</option>
          <option value="auto">Automático</option>
        </select>
      </label>
    </div>

    <div class="sim-formulas">
      <p class="sim-formula">
        <code data-test="chunk-formula">{{ snapshot.chunkCountExpression.formula }}</code>
        <code data-test="chunk-substituted">{{ snapshot.chunkCountExpression.substituted }}</code>
        <code data-test="chunk-evaluated">{{ snapshot.chunkCountExpression.evaluated }}</code>
      </p>
      <p class="sim-formula">
        <code data-test="block-formula">{{ snapshot.blockCountExpression.formula }}</code>
        <code data-test="block-substituted">{{ snapshot.blockCountExpression.substituted }}</code>
        <code data-test="block-evaluated">{{ snapshot.blockCountExpression.evaluated }}</code>
      </p>
    </div>

    <dl class="sim-resumen">
      <div class="sim-resumen__dato">
        <dt>Chunks</dt>
        <dd data-test="chunk-count">{{ snapshot.chunkCount }}</dd>
      </div>
      <div class="sim-resumen__dato">
        <dt>Bloques</dt>
        <dd data-test="block-count">{{ snapshot.blockCount }}</dd>
      </div>
      <div class="sim-resumen__dato">
        <dt>Hilos inactivos</dt>
        <dd data-test="inactive-threads">{{ snapshot.inactiveThreads }}</dd>
      </div>
    </dl>

    <nav class="sim-navegacion-pasos" aria-label="Navegación de la secuencia guiada">
      <button
        type="button"
        data-test="paso-anterior"
        :disabled="currentStepIndex === 0"
        @click="pasoAnterior"
      >
        ← Paso anterior
      </button>
      <span class="sim-paso-indicador" data-test="paso-indicador" aria-live="polite">
        Paso {{ currentStepIndex + 1 }} de {{ STEP_COUNT }}
      </span>
      <button
        type="button"
        data-test="paso-siguiente"
        :disabled="currentStepIndex === STEP_COUNT - 1"
        @click="pasoSiguiente"
      >
        Paso siguiente →
      </button>
      <button type="button" data-test="reiniciar" @click="reiniciar">Reiniciar</button>
      <button
        v-if="!reproduciendo"
        type="button"
        data-test="reproducir"
        aria-label="Reproducir automáticamente"
        @click="
          modo = 'auto';
          reproducir();
        "
      >
        ▶ Reproducir
      </button>
      <button
        v-else
        type="button"
        data-test="pausar"
        aria-label="Pausar reproducción automática"
        @click="pausar"
      >
        ⏸ Pausar
      </button>
    </nav>

    <div class="sim-panel-explicacion" aria-live="polite">
      <article class="sim-explicacion-paso">
        <h4 data-test="paso-titulo">{{ pasoActual?.titulo }}</h4>
        <p data-test="paso-descripcion">{{ pasoActual?.descripcion }}</p>
      </article>
      <article class="sim-explicacion-seleccion" data-test="explicacion-seleccion">
        <h4>Objeto seleccionado</h4>
        <p data-test="seleccion-descripcion">{{ snapshot.selected.descripcion }}</p>
      </article>
    </div>

    <!--
      Isometric-style scene. Deliberately built from flat, unrotated HTML
      buttons (so text stays legible and the layout stays responsive) plus
      skewed decorative accents that read as depth. This is an explanatory
      diagram, not a 3D engine — see `docs/architecture.md`.
    -->
    <div class="sim-escena" :class="`sim-escena--foco-${pasoActual?.foco ?? 'ninguno'}`">
      <section class="sim-estacion sim-estacion--cpu" aria-labelledby="sim-estacion-cpu-titulo">
        <h4 id="sim-estacion-cpu-titulo" class="sim-estacion__titulo">CPU (host)</h4>
        <p class="sim-estacion__dato">{{ config.totalBytes }} bytes</p>
      </section>

      <section class="sim-estacion sim-estacion--chunks" aria-label="Chunks del vector de datos">
        <h4 class="sim-estacion__titulo">Chunks</h4>
        <ol class="sim-fila-tiles" aria-label="Lista de chunks">
          <li v-for="chunk in chunksVisibles" :key="chunk.index">
            <button
              type="button"
              class="sim-tile sim-chunk"
              :class="claseChunk(chunk.index, chunk.isPartial)"
              :aria-pressed="config.selectedKind === 'chunk' && config.selectedIndex === chunk.index"
              :aria-label="`Chunk ${chunk.index}, ${chunk.byteCount} bytes${chunk.isPartial ? ', incompleto' : ''}`"
              @click="seleccionar('chunk', chunk.index)"
            >
              <span aria-hidden="true">c{{ chunk.index }}</span>
            </button>
          </li>
        </ol>
        <p v-if="chunksOcultos > 0" class="sim-truncado" data-test="chunks-truncado">
          Se muestran los primeros {{ chunksVisibles.length }} chunks de {{ snapshot.chunkCount }}. El modelo
          calculó los {{ chunksOcultos }} restantes igual.
        </p>
      </section>

      <div class="sim-puente" aria-hidden="true">
        <span class="sim-puente__flecha">→</span>
        <span class="sim-puente__etiqueta">host → device (conceptual)</span>
      </div>

      <section class="sim-estacion sim-estacion--gpu" aria-label="Grid de la GPU: bloques e hilos">
        <h4 class="sim-estacion__titulo">GPU (device) — grid</h4>
        <ol class="sim-grid" aria-label="Bloques de la grid">
          <li v-for="bloque in bloquesVisibles" :key="bloque.index" class="sim-bloque-contenedor">
            <button
              type="button"
              class="sim-tile sim-bloque"
              :class="claseBloque(bloque.index, bloque.isPartialBlock)"
              :aria-pressed="config.selectedKind === 'block' && config.selectedIndex === bloque.index"
              :aria-label="`Bloque ${bloque.index}: ${bloque.activeCount} de ${config.threadsPerBlock} hilos activos${bloque.isPartialBlock ? ', bloque incompleto' : ''}`"
              @click="seleccionar('block', bloque.index)"
            >
              <span aria-hidden="true">b{{ bloque.index }}</span>
            </button>
            <ol class="sim-hilos" :aria-label="`Hilos del bloque ${bloque.index}`">
              <li v-for="hilo in bloque.threads" :key="hilo.slot">
                <button
                  type="button"
                  class="sim-tile sim-hilo"
                  :class="claseHilo(hilo.active, hilo.slot)"
                  :aria-pressed="config.selectedKind === 'thread' && config.selectedIndex === hilo.slot"
                  :aria-label="
                    hilo.active
                      ? `Hilo ${hilo.threadIdx} del bloque ${hilo.blockIdx}: activo, procesa el chunk ${hilo.chunkIndex}`
                      : `Hilo ${hilo.threadIdx} del bloque ${hilo.blockIdx}: inactivo`
                  "
                  @click="seleccionar('thread', hilo.slot)"
                >
                  <span aria-hidden="true">{{ hilo.active ? `c${hilo.chunkIndex}` : '—' }}</span>
                </button>
              </li>
            </ol>
          </li>
        </ol>
        <p v-if="bloquesOcultos > 0" class="sim-truncado" data-test="bloques-truncado">
          Se muestran los primeros {{ bloquesVisibles.length }} bloques de {{ snapshot.blockCount }}. El
          modelo calculó los {{ bloquesOcultos }} restantes igual.
        </p>
      </section>

      <div class="sim-puente sim-puente--retorno" aria-hidden="true">
        <span class="sim-puente__flecha">→</span>
        <span class="sim-puente__etiqueta">device → host (conceptual)</span>
      </div>

      <section class="sim-estacion sim-estacion--resultado" aria-label="Resultado de vuelta en la CPU">
        <h4 class="sim-estacion__titulo">CPU (host) — resultado</h4>
        <p class="sim-estacion__dato">{{ snapshot.chunkCount }} chunks procesados</p>
      </section>
    </div>

    <p class="sim-enlace">
      Configuración actual: <code data-test="enlace">{{ enlaceCompartible }}</code>
    </p>

    <section class="sim-ejercicio" aria-labelledby="sim-ejercicio-titulo">
      <h4 id="sim-ejercicio-titulo">Comprueba tu modelo mental</h4>
      <p>Responde con lo que calcularías tú, antes de mirar la explicación.</p>

      <article
        v-for="caso in casosEjercicio"
        :key="caso.id"
        class="sim-ejercicio-caso"
        data-test="ejercicio-caso"
      >
        <h5>
          {{ caso.totalBytes }} bytes totales, chunks de {{ caso.bytesPerChunk }} bytes,
          {{ caso.threadsPerBlock }}
          hilos por bloque
        </h5>

        <div
          v-for="pregunta in caso.questions"
          :key="pregunta.id"
          class="sim-pregunta"
          role="group"
          :aria-label="pregunta.prompt"
        >
          <p class="sim-pregunta__enunciado">{{ pregunta.prompt }}</p>
          <div class="sim-pregunta__opciones">
            <button
              v-for="opcion in pregunta.options"
              :key="opcion.value"
              type="button"
              class="sim-opcion"
              :class="{ 'sim-opcion--elegida': respuestas[pregunta.id] === opcion.value }"
              :aria-pressed="respuestas[pregunta.id] === opcion.value"
              @click="responder(pregunta.id, opcion.value)"
            >
              {{ opcion.label }}
            </button>
          </div>
          <p
            v-if="estadoRespuesta(pregunta.id, pregunta.correctValue) !== 'sin-responder'"
            class="sim-pregunta__feedback"
            :class="{
              'sim-pregunta__feedback--correcta':
                estadoRespuesta(pregunta.id, pregunta.correctValue) === 'correcta',
              'sim-pregunta__feedback--incorrecta':
                estadoRespuesta(pregunta.id, pregunta.correctValue) === 'incorrecta',
            }"
            data-test="pregunta-feedback"
            role="status"
          >
            {{
              estadoRespuesta(pregunta.id, pregunta.correctValue) === 'correcta'
                ? '¡Correcto!'
                : 'No es correcto.'
            }}
            {{ pregunta.explanation }}
          </p>
        </div>
      </article>
    </section>
  </section>
</template>

<style scoped>
.sim-simulador {
  border: 1px solid var(--sgpu-border);
  border-radius: var(--sgpu-radius-md);
  padding: var(--sgpu-gap-lg);
  background: var(--sgpu-surface);
  color: var(--sgpu-text);
}

.sim-titulo {
  margin: 0 0 var(--sgpu-gap-sm);
  font-size: 1.05rem;
}

.sim-aviso {
  margin: 0 0 var(--sgpu-gap-md);
  font-size: var(--sgpu-font-size-sm);
  color: var(--sgpu-text-muted);
}

.sim-controles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--sgpu-gap-md);
  margin-bottom: var(--sgpu-gap-md);
}

.sim-control {
  display: flex;
  flex-direction: column;
  gap: var(--sgpu-gap-xs);
  font-size: var(--sgpu-font-size-sm);
  min-width: 0;
}

.sim-control__etiqueta {
  color: var(--sgpu-text-muted);
}

.sim-control select {
  padding: 4px 6px;
  border: 1px solid var(--sgpu-border);
  border-radius: var(--sgpu-radius-sm);
  background: var(--sgpu-surface-muted);
  color: var(--sgpu-text);
  max-width: 100%;
}

.sim-formulas {
  margin-bottom: var(--sgpu-gap-md);
}

.sim-formula {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sgpu-gap-sm);
  margin: 0 0 var(--sgpu-gap-xs);
}

.sim-formula code {
  font-family: var(--sgpu-font-mono);
  font-size: var(--sgpu-font-size-sm);
}

.sim-resumen {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: var(--sgpu-gap-sm);
  margin: 0 0 var(--sgpu-gap-md);
}

.sim-resumen__dato {
  background: var(--sgpu-surface-muted);
  border-radius: var(--sgpu-radius-sm);
  padding: var(--sgpu-gap-sm);
}

.sim-resumen dt {
  font-size: var(--sgpu-font-size-xs);
  color: var(--sgpu-text-muted);
}

.sim-resumen dd {
  margin: 0;
  font-family: var(--sgpu-font-mono);
  font-size: var(--sgpu-font-size-md);
}

.sim-navegacion-pasos {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sgpu-gap-sm);
  margin-bottom: var(--sgpu-gap-md);
}

.sim-navegacion-pasos button {
  padding: 4px 10px;
  border: 1px solid var(--sgpu-border);
  border-radius: var(--sgpu-radius-sm);
  background: var(--sgpu-surface-muted);
  color: var(--sgpu-text);
  font-size: var(--sgpu-font-size-sm);
  cursor: pointer;
}

.sim-navegacion-pasos button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sim-paso-indicador {
  font-size: var(--sgpu-font-size-sm);
  color: var(--sgpu-text-muted);
  font-family: var(--sgpu-font-mono);
}

.sim-panel-explicacion {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--sgpu-gap-md);
  margin-bottom: var(--sgpu-gap-lg);
}

.sim-explicacion-paso,
.sim-explicacion-seleccion {
  background: var(--sgpu-surface-muted);
  border-radius: var(--sgpu-radius-sm);
  padding: var(--sgpu-gap-md);
}

.sim-explicacion-paso h4,
.sim-explicacion-seleccion h4 {
  margin: 0 0 var(--sgpu-gap-xs);
  font-size: var(--sgpu-font-size-md);
}

.sim-explicacion-paso p,
.sim-explicacion-seleccion p {
  margin: 0;
  font-size: var(--sgpu-font-size-sm);
}

/* --- Isometric-style scene --- */

.sim-escena {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: var(--sgpu-gap-md);
  padding: var(--sgpu-gap-md);
  margin-bottom: var(--sgpu-gap-lg);
  border-radius: var(--sgpu-radius-md);
  background: linear-gradient(180deg, var(--sgpu-surface-muted), var(--sgpu-surface));
  overflow-x: auto;
}

.sim-estacion {
  flex: 1 1 200px;
  min-width: 0;
  padding: var(--sgpu-gap-sm) var(--sgpu-gap-md);
  border-radius: var(--sgpu-radius-sm);
  border: 1px solid var(--sgpu-border);
  background: var(--sgpu-surface);
  /* Decorative "depth" accent: a skewed bar under the title, standing in
     for an isometric top face without rotating any readable text. */
  position: relative;
}

.sim-estacion::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 6px;
  border-radius: var(--sgpu-radius-sm) var(--sgpu-radius-sm) 0 0;
  background: var(--sgpu-selected-border);
  transform: skewX(-18deg);
  transform-origin: left;
  opacity: 0.5;
}

.sim-estacion__titulo {
  margin: 0 0 var(--sgpu-gap-xs);
  font-size: var(--sgpu-font-size-sm);
  color: var(--sgpu-text-muted);
}

.sim-estacion__dato {
  margin: 0;
  font-family: var(--sgpu-font-mono);
  font-size: var(--sgpu-font-size-md);
}

.sim-puente {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 4rem;
  color: var(--sgpu-text-muted);
}

.sim-puente__flecha {
  font-size: 1.4rem;
}

.sim-puente__etiqueta {
  font-size: var(--sgpu-font-size-xs);
  text-align: center;
  max-width: 6rem;
}

.sim-fila-tiles,
.sim-grid,
.sim-hilos {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sgpu-gap-xs);
  list-style: none;
  margin: var(--sgpu-gap-xs) 0 0;
  padding: 0;
}

.sim-bloque-contenedor {
  display: flex;
  flex-direction: column;
  gap: var(--sgpu-gap-xs);
  padding: var(--sgpu-gap-xs);
  border: 1px dashed var(--sgpu-border);
  border-radius: var(--sgpu-radius-sm);
}

.sim-tile {
  min-width: 2.4rem;
  min-height: 1.8rem;
  padding: 2px 4px;
  text-align: center;
  border: 1px solid;
  border-radius: var(--sgpu-radius-sm);
  font-family: var(--sgpu-font-mono);
  font-size: var(--sgpu-font-size-xs);
  cursor: pointer;
  /* A slight skew reads as an isometric facet while the text inside stays
     perfectly horizontal and legible, because the transform is on the
     whole flat tile, not on a separately-rotated face. */
  transform: skewX(-4deg);
}

.sim-tile span {
  display: block;
  transform: skewX(4deg);
}

.sim-chunk--completo {
  background: var(--sgpu-active-bg);
  border-color: var(--sgpu-active-border);
  color: var(--sgpu-active-text);
}

.sim-chunk--parcial {
  background: var(--sgpu-inactive-bg);
  border-color: var(--sgpu-boundary-accent);
  border-style: dashed;
  color: var(--sgpu-text);
}

.sim-bloque--completo {
  background: var(--sgpu-surface-muted);
  border-color: var(--sgpu-border);
}

.sim-bloque--parcial {
  border-color: var(--sgpu-boundary-accent);
  border-left-width: 3px;
}

.sim-hilo--activo {
  background: var(--sgpu-active-bg);
  border-color: var(--sgpu-active-border);
  color: var(--sgpu-active-text);
}

.sim-hilo--inactivo {
  background: var(--sgpu-inactive-bg);
  border-color: var(--sgpu-inactive-border);
  border-style: dashed;
  color: var(--sgpu-inactive-text);
}

.sim-tile--seleccionado {
  outline: 2px solid var(--sgpu-selected-border);
  outline-offset: 1px;
}

.sim-truncado,
.sim-enlace {
  font-size: var(--sgpu-font-size-xs);
  color: var(--sgpu-text-muted);
}

.sim-ejercicio-caso {
  margin-bottom: var(--sgpu-gap-md);
  padding: var(--sgpu-gap-md);
  border-radius: var(--sgpu-radius-sm);
  background: var(--sgpu-surface-muted);
}

.sim-ejercicio-caso h5 {
  margin: 0 0 var(--sgpu-gap-sm);
  font-size: var(--sgpu-font-size-sm);
}

.sim-pregunta {
  margin-bottom: var(--sgpu-gap-sm);
}

.sim-pregunta__enunciado {
  margin: 0 0 4px;
  font-size: var(--sgpu-font-size-sm);
}

.sim-pregunta__opciones {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sgpu-gap-xs);
}

.sim-opcion {
  padding: 4px 10px;
  border: 1px solid var(--sgpu-border);
  border-radius: var(--sgpu-radius-sm);
  background: var(--sgpu-surface);
  color: var(--sgpu-text);
  cursor: pointer;
  font-family: var(--sgpu-font-mono);
}

.sim-opcion--elegida {
  border-color: var(--sgpu-selected-border);
  box-shadow: 0 0 0 2px var(--sgpu-selected-ring);
}

.sim-pregunta__feedback {
  margin: var(--sgpu-gap-xs) 0 0;
  font-size: var(--sgpu-font-size-sm);
}

.sim-pregunta__feedback--correcta {
  color: var(--sgpu-active-border);
}

.sim-pregunta__feedback--incorrecta {
  color: var(--sgpu-boundary-accent);
}

@media (max-width: 420px) {
  .sim-escena {
    flex-direction: column;
  }

  .sim-puente {
    flex-direction: row;
    min-width: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sim-tile,
  .sim-estacion::before {
    transition: none;
  }
}
</style>
