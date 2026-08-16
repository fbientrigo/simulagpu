<script setup lang="ts">
/**
 * Guided laboratory for one pairwise-reduction pass.
 *
 * The component only renders deterministic snapshots and exercise evaluations
 * produced by @simulagpu/core. It does not compile CUDA, execute a GPU, or model
 * scheduling. The learner-facing copy states that boundary explicitly.
 */
import { computed, ref } from 'vue';
import type {
  ReductionConfig,
  ReductionExerciseEvaluation,
  ReductionLeftExpression,
  ReductionPreset,
  ReductionRightExpression,
  ReductionSubmission,
  ReductionTailStrategy,
  ReductionWriteExpression,
} from '@simulagpu/contracts';
import {
  DEFAULT_REDUCTION_CONFIG,
  buildReductionSnapshot,
  evaluateReductionSubmission,
  normalizeReductionConfig,
  renderReductionSubmission,
} from '@simulagpu/core';
import '@simulagpu/theme/tokens.css';

const config = ref<ReductionConfig>(DEFAULT_REDUCTION_CONFIG);
const snapshot = computed(() => buildReductionSnapshot(config.value));

const leftExpression = ref<ReductionLeftExpression>('out');
const rightExpression = ref<ReductionRightExpression>('input[left + 1]');
const writeExpression = ref<ReductionWriteExpression>('output[left]');
const evaluation = ref<ReductionExerciseEvaluation | null>(null);

const submission = computed<ReductionSubmission>(() => ({
  leftExpression: leftExpression.value,
  rightExpression: rightExpression.value,
  writeExpression: writeExpression.value,
}));
const code = computed(() => renderReductionSubmission(submission.value));

const PRESETS: ReadonlyArray<{ value: ReductionPreset; label: string }> = [
  { value: 'potencia-de-dos', label: '8 valores: árbol limpio' },
  { value: 'tamano-impar', label: '7 valores: cola impar' },
  { value: 'cancelacion', label: 'Punto flotante: cancelación' },
];

function updateConfig(change: Partial<ReductionConfig>): void {
  config.value = normalizeReductionConfig({ ...config.value, ...change });
}

function asNumber(event: Event): number {
  return Number((event.target as HTMLInputElement).value);
}

function runTests(): void {
  evaluation.value = evaluateReductionSubmission(submission.value);
}

function loadCorrectSolution(): void {
  leftExpression.value = '2 * out';
  rightExpression.value = 'left + 1 < n ? input[left + 1] : 0.0f';
  writeExpression.value = 'output[out]';
  evaluation.value = null;
}

function formatVector(values: readonly number[] | null): string {
  return values === null ? 'no ejecutó' : `[${values.join(', ')}]`;
}
</script>

<template>
  <section class="sgpu-reduccion" aria-labelledby="sgpu-reduccion-titulo">
    <h3 id="sgpu-reduccion-titulo" class="sgpu-reduccion__titulo">Laboratorio de reducción paralela</h3>
    <p class="sgpu-reduccion__aviso">
      Este laboratorio ejecuta un <strong>modelo CPU determinista</strong> de una pasada de reducción y sus
      pruebas. No compila CUDA, no usa una GPU y no predice rendimiento.
    </p>

    <div class="sgpu-reduccion__controles" role="group" aria-label="Configuración del árbol de reducción">
      <label>
        <span>Entrada</span>
        <select
          :value="config.preset"
          data-test="preset"
          @change="updateConfig({ preset: ($event.target as HTMLSelectElement).value as ReductionPreset })"
        >
          <option v-for="preset in PRESETS" :key="preset.value" :value="preset.value">
            {{ preset.label }}
          </option>
        </select>
      </label>

      <label>
        <span>Asignación de pares</span>
        <select
          :value="config.indexStrategy"
          data-test="index-strategy"
          @change="
            updateConfig({
              indexStrategy: ($event.target as HTMLSelectElement).value as ReductionConfig['indexStrategy'],
            })
          "
        >
          <option value="pares-adyacentes">left = 2 × out</option>
          <option value="pares-solapados">left = out</option>
        </select>
      </label>

      <label>
        <span>Elemento sin pareja</span>
        <select
          :value="config.tailStrategy"
          data-test="tail-strategy"
          @change="
            updateConfig({
              tailStrategy: ($event.target as HTMLSelectElement).value as ReductionTailStrategy,
            })
          "
        >
          <option value="sumar-cero">Conservar: sumar con 0</option>
          <option value="descartar">Descartar</option>
        </select>
      </label>
    </div>

    <dl class="sgpu-reduccion__resumen">
      <div>
        <dt>Entrada</dt>
        <dd data-test="initial-values">{{ formatVector(snapshot.initialValues) }}</dd>
      </div>
      <div>
        <dt>Referencia</dt>
        <dd data-test="reference">{{ snapshot.reference }}</dd>
      </div>
      <div>
        <dt>Resultado del árbol</dt>
        <dd data-test="result">{{ snapshot.result ?? 'sin resultado' }}</dd>
      </div>
      <div>
        <dt>Error absoluto</dt>
        <dd data-test="absolute-error">{{ snapshot.absoluteError ?? '—' }}</dd>
      </div>
    </dl>

    <div class="sgpu-reduccion__pasada-control">
      <label>
        <span>Pasada mostrada: {{ config.selectedPass + 1 }} de {{ snapshot.passes.length }}</span>
        <input
          type="range"
          min="0"
          :max="snapshot.passes.length - 1"
          :value="config.selectedPass"
          aria-label="Pasada de reducción mostrada"
          @input="updateConfig({ selectedPass: asNumber($event) })"
        />
      </label>
    </div>

    <div class="sgpu-reduccion__arbol" data-test="reduction-pass">
      <div class="sgpu-reduccion__vector">
        <span v-for="(value, index) in snapshot.selected.input" :key="`in-${index}`" class="sgpu-valor">
          <small>in[{{ index }}]</small>{{ value }}
        </span>
      </div>

      <div class="sgpu-reduccion__pares" aria-label="Pares procesados en la pasada seleccionada">
        <article v-for="pair in snapshot.selected.pairs" :key="pair.outputIndex" class="sgpu-par">
          <code>out[{{ pair.outputIndex }}]</code>
          <span>
            in[{{ pair.leftIndex }}] = {{ pair.leftValue }}
            <template v-if="pair.rightInRange"> + in[{{ pair.rightIndex }}] = {{ pair.rightValue }}</template>
            <template v-else> + 0 (sin pareja)</template>
          </span>
          <strong>{{ pair.outputValue ?? 'descartado' }}</strong>
        </article>
      </div>

      <div class="sgpu-reduccion__vector sgpu-reduccion__vector--salida">
        <span v-for="(value, index) in snapshot.selected.output" :key="`out-${index}`" class="sgpu-valor">
          <small>out[{{ index }}]</small>{{ value }}
        </span>
      </div>
    </div>

    <ul class="sgpu-reduccion__diagnosticos" data-test="diagnostics">
      <li v-for="diagnostic in snapshot.diagnostics" :key="diagnostic">{{ diagnostic }}</li>
    </ul>

    <hr />

    <h4>Ejercicio guiado: completa una pasada</h4>
    <p>
      Empieza con líneas incorrectas. Cambia los tres fragmentos y pulsa <strong>Ejecutar pruebas</strong>. El
      runner comprueba tamaños par, impar y unitario contra un oráculo CPU.
    </p>

    <div class="sgpu-editor" aria-label="Editor guiado de una pasada de reducción">
      <div><code>__global__ void reduce_pass(const float* input, float* output, int n) {</code></div>
      <div><code>&nbsp;&nbsp;const int out = blockIdx.x * blockDim.x + threadIdx.x;</code></div>
      <label class="sgpu-editor__linea">
        <code>&nbsp;&nbsp;const int left = </code>
        <select
          v-model="leftExpression"
          data-test="left-expression"
          aria-label="Expresión del índice izquierdo"
        >
          <option value="out">out</option>
          <option value="2 * out">2 * out</option>
        </select>
        <code>;</code>
      </label>
      <div><code>&nbsp;&nbsp;if (left &lt; n) {</code></div>
      <label class="sgpu-editor__linea">
        <code>&nbsp;&nbsp;&nbsp;&nbsp;const float right = </code>
        <select
          v-model="rightExpression"
          data-test="right-expression"
          aria-label="Lectura del operando derecho"
        >
          <option value="input[left + 1]">input[left + 1]</option>
          <option value="left + 1 < n ? input[left + 1] : input[left]">
            left + 1 &lt; n ? input[left + 1] : input[left]
          </option>
          <option value="left + 1 < n ? input[left + 1] : 0.0f">
            left + 1 &lt; n ? input[left + 1] : 0.0f
          </option>
        </select>
        <code>;</code>
      </label>
      <label class="sgpu-editor__linea">
        <code>&nbsp;&nbsp;&nbsp;&nbsp;</code>
        <select
          v-model="writeExpression"
          data-test="write-expression"
          aria-label="Índice del arreglo de salida"
        >
          <option value="output[left]">output[left]</option>
          <option value="output[out]">output[out]</option>
        </select>
        <code> = input[left] + right;</code>
      </label>
      <div><code>&nbsp;&nbsp;}</code></div>
      <div><code>}</code></div>
    </div>

    <details class="sgpu-reduccion__codigo">
      <summary>Ver el kernel ensamblado</summary>
      <pre><code data-test="assembled-code">{{ code }}</code></pre>
    </details>

    <div class="sgpu-reduccion__acciones">
      <button type="button" class="sgpu-boton sgpu-boton--principal" data-test="run-tests" @click="runTests">
        Ejecutar pruebas
      </button>
      <button type="button" class="sgpu-boton" @click="loadCorrectSolution">Cargar solución correcta</button>
    </div>

    <section v-if="evaluation" class="sgpu-resultados" aria-live="polite">
      <h5 :class="evaluation.passed ? 'sgpu-correcto' : 'sgpu-falla'" data-test="exercise-summary">
        {{ evaluation.passed ? 'Pruebas aprobadas' : 'Aún hay fallos' }}
      </h5>
      <p>{{ evaluation.summary }}</p>
      <article
        v-for="testCase in evaluation.cases"
        :key="testCase.id"
        class="sgpu-caso"
        :class="testCase.passed ? 'sgpu-caso--correcto' : 'sgpu-caso--falla'"
      >
        <strong>{{ testCase.label }}</strong>
        <code>entrada = {{ formatVector(testCase.input) }}</code>
        <code>esperado = {{ formatVector(testCase.expected) }}</code>
        <code>obtenido = {{ formatVector(testCase.actual) }}</code>
        <span>{{ testCase.message }}</span>
      </article>
    </section>
  </section>
</template>

<style scoped>
.sgpu-reduccion {
  border: 1px solid var(--sgpu-border);
  border-radius: var(--sgpu-radius-md);
  padding: var(--sgpu-gap-lg);
  background: var(--sgpu-surface);
  color: var(--sgpu-text);
}

.sgpu-reduccion__titulo {
  margin-top: 0;
}

.sgpu-reduccion__aviso,
.sgpu-reduccion__diagnosticos {
  color: var(--sgpu-text-muted);
}

.sgpu-reduccion__controles,
.sgpu-reduccion__resumen {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--sgpu-gap-md);
  margin-bottom: var(--sgpu-gap-md);
}

.sgpu-reduccion__controles label,
.sgpu-reduccion__pasada-control label {
  display: flex;
  flex-direction: column;
  gap: var(--sgpu-gap-xs);
  font-size: var(--sgpu-font-size-sm);
}

.sgpu-reduccion select,
.sgpu-reduccion input,
.sgpu-boton {
  border: 1px solid var(--sgpu-border);
  border-radius: var(--sgpu-radius-sm);
  background: var(--sgpu-surface-muted);
  color: var(--sgpu-text);
  padding: 0.45rem 0.55rem;
}

.sgpu-reduccion__resumen {
  margin: 0 0 var(--sgpu-gap-md);
}

.sgpu-reduccion__resumen div {
  padding: var(--sgpu-gap-sm);
  border-radius: var(--sgpu-radius-sm);
  background: var(--sgpu-surface-muted);
}

.sgpu-reduccion__resumen dt {
  color: var(--sgpu-text-muted);
  font-size: var(--sgpu-font-size-xs);
}

.sgpu-reduccion__resumen dd {
  margin: 0;
  font-family: var(--sgpu-font-mono);
}

.sgpu-reduccion__arbol {
  display: grid;
  gap: var(--sgpu-gap-md);
  margin: var(--sgpu-gap-md) 0;
}

.sgpu-reduccion__vector {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sgpu-gap-sm);
}

.sgpu-valor {
  min-width: 4.5rem;
  padding: var(--sgpu-gap-sm);
  text-align: center;
  border: 1px solid var(--sgpu-border);
  border-radius: var(--sgpu-radius-sm);
  font-family: var(--sgpu-font-mono);
}

.sgpu-valor small {
  display: block;
  color: var(--sgpu-text-muted);
}

.sgpu-reduccion__vector--salida .sgpu-valor {
  border-color: var(--sgpu-selected-border);
}

.sgpu-reduccion__pares {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: var(--sgpu-gap-sm);
}

.sgpu-par {
  display: grid;
  gap: 0.2rem;
  padding: var(--sgpu-gap-sm);
  border-left: 3px solid var(--sgpu-selected-border);
  background: var(--sgpu-surface-muted);
}

.sgpu-editor {
  overflow-x: auto;
  padding: var(--sgpu-gap-md);
  border: 1px solid var(--sgpu-border);
  border-radius: var(--sgpu-radius-sm);
  background: var(--sgpu-surface-muted);
  font-family: var(--sgpu-font-mono);
  line-height: 1.9;
}

.sgpu-editor__linea {
  display: flex;
  align-items: center;
  min-width: max-content;
}

.sgpu-editor select {
  font-family: var(--sgpu-font-mono);
  padding: 0.15rem 0.35rem;
}

.sgpu-reduccion__codigo pre {
  overflow-x: auto;
}

.sgpu-reduccion__acciones {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sgpu-gap-sm);
  margin: var(--sgpu-gap-md) 0;
}

.sgpu-boton {
  cursor: pointer;
}

.sgpu-boton--principal {
  border-color: var(--sgpu-selected-border);
  font-weight: 700;
}

.sgpu-resultados {
  display: grid;
  gap: var(--sgpu-gap-sm);
}

.sgpu-correcto {
  color: var(--sgpu-active-text);
}

.sgpu-falla {
  color: var(--sgpu-inactive-text);
}

.sgpu-caso {
  display: grid;
  gap: 0.25rem;
  padding: var(--sgpu-gap-sm);
  border: 1px solid var(--sgpu-border);
  border-radius: var(--sgpu-radius-sm);
}

.sgpu-caso--correcto {
  border-left: 4px solid var(--sgpu-active-border);
}

.sgpu-caso--falla {
  border-left: 4px solid var(--sgpu-inactive-border);
}
</style>
