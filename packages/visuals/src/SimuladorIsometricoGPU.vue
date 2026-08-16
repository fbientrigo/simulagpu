<script setup lang="ts">
/**
 * Clase 0: mobile-first interactive mental model for chunk/block/thread work
 * distribution. The component renders immutable snapshots from core; guided
 * steps, disclosure state and playback are presentation-only concerns.
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
const snapshot = computed(() => buildChunkFlowSnapshot(config.value));

/* Normalize every value crossing the untyped external HTML template boundary. */
function actualizar(cambio: Partial<ChunkFlowConfig>): void {
  config.value = normalizeChunkFlowConfig({ ...config.value, ...cambio });
}

function alNumero(evento: Event): number {
  return Number((evento.target as HTMLInputElement | HTMLSelectElement).value);
}

function seleccionar(kind: SelectionKind, index: number): void {
  actualizar({ selectedKind: kind, selectedIndex: index });
}

const seleccionEtiqueta = computed(() => {
  const index = config.value.selectedIndex;
  if (config.value.selectedKind === 'chunk') return `Chunk c${index}`;
  if (config.value.selectedKind === 'block') return `Bloque b${index}`;
  return `Hilo ${index}`;
});

const enlaceCompartible = computed(() => `?${encodeChunkFlowConfig(config.value)}`);

function escribirUrl(): void {
  if (!props.syncUrl || typeof window === 'undefined') return;
  const url = `${window.location.pathname}${enlaceCompartible.value}${window.location.hash}`;
  window.history.replaceState(window.history.state, '', url);
}

watch(config, escribirUrl);

/* Guided sequence: presentation state, never teaching-model state. */
const currentStepIndex = ref(0);
const pasoActual = computed(() => snapshot.value.steps[currentStepIndex.value]);
const progreso = computed(() => ((currentStepIndex.value + 1) / STEP_COUNT) * 100);

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
  currentStepIndex.value = Math.min(Math.max(indice, 0), STEP_COUNT - 1);
}

function pausar(): void {
  reproduciendo.value = false;
  limpiarTemporizador();
}

function reproducir(): void {
  if (reproduciendo.value) return;
  reproduciendo.value = true;
  limpiarTemporizador();
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

/* Rendering budgets are view concerns and do not alter the snapshot. */
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

function textoRespuesta(preguntaId: string, correcta: number): string {
  return estadoRespuesta(preguntaId, correcta) === 'correcta' ? '¡Correcto!' : 'No es correcto.';
}

/**
 * Vue and Vite load these bindings through the external SFC template. Current
 * static analyzers do not follow `template src`, so this explicit read keeps
 * `noUnusedLocals` and ESLint honest without weakening either project rule.
 */
const externalTemplateBindings = {
  alNumero,
  seleccionar,
  seleccionEtiqueta,
  pasoActual,
  progreso,
  pasoSiguiente,
  pasoAnterior,
  reiniciar,
  chunksOcultos,
  bloquesOcultos,
  claseChunk,
  claseHilo,
  claseBloque,
  responder,
  estadoRespuesta,
  textoRespuesta,
};
void externalTemplateBindings;
</script>

<template src="./SimuladorIsometricoGPU.template.html"></template>

<style scoped src="./SimuladorIsometricoGPU.css"></style>
