<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { CUDA_MALLOC_ELEMENT_COUNTS, type CudaMallocElementCount } from '@simulagpu/contracts';
import { buildCudaMallocSnapshot, normalizeCudaMallocConfig } from '@simulagpu/core';
import '@simulagpu/theme/tokens.css';

import {
  CUDA_MALLOC_CARD_IDS,
  CUDA_MALLOC_CLASS_ID,
  type CudaMallocPrediction,
  createDefaultLearnerState,
  loadLearnerState,
  resetLearnerState,
  saveLearnerState,
} from './cudaMallocProgress.js';

const STEPS = [
  { id: 0, short: 'Ver', label: 'VER' },
  { id: 1, short: 'Predecir', label: 'PREDECIR' },
  { id: 2, short: 'Ejecutar', label: 'EJECUTAR' },
  { id: 3, short: 'Explicar', label: 'EXPLICAR' },
  { id: 4, short: 'Detalles', label: 'PECULIARIDADES' },
  { id: 5, short: 'Comprobar', label: 'COMPROBAR' },
  { id: 6, short: 'Retener', label: 'RETENER' },
] as const;

type Frame = 'before' | 'action' | 'after';

const PREDICTIONS: ReadonlyArray<{ id: CudaMallocPrediction; label: string }> = [
  { id: 'reserva-sin-copiar', label: 'Aparece una asignación sin datos inicializados.' },
  { id: 'copia-datos', label: 'Los valores de h_A se copian al device.' },
  { id: 'inicializa-cero', label: 'Aparece una asignación llena de ceros.' },
];

const CHECKS = [
  {
    question: 'Después de cudaMalloc, ¿qué contienen las celdas del device?',
    options: ['Ceros', 'Los valores de h_A', 'Contenido indefinido'],
    correct: 2,
    explanation: 'La reserva crea espacio, pero no escribe valores en él.',
  },
  {
    question: '¿Qué cambió en la llamada exitosa?',
    options: ['d_A y la asignación del device', 'Los valores de h_A', 'El resultado de un kernel'],
    correct: 0,
    explanation: 'Cambia el puntero d_A y aparece la asignación; h_A conserva sus valores.',
  },
  {
    question: '¿Qué obligación queda para más adelante?',
    options: [
      'Liberar la asignación con cudaFree',
      'Copiar h_A otra vez al host',
      'Lanzar siempre ocho hilos',
    ],
    correct: 0,
    explanation: 'Una asignación exitosa ocupa memoria hasta que se libera con cudaFree.',
  },
] as const;

const CARDS = [
  {
    id: CUDA_MALLOC_CARD_IDS[0],
    question: '¿cudaMalloc inicializa la memoria del device?',
    answer: 'No. Solo reserva la asignación; su contenido queda indefinido.',
  },
  {
    id: CUDA_MALLOC_CARD_IDS[1],
    question: '¿Qué modifica cudaMalloc(&d_A, bytes) cuando tiene éxito?',
    answer: 'Escribe en d_A un puntero a una nueva asignación de bytes en el device.',
  },
  {
    id: CUDA_MALLOC_CARD_IDS[2],
    question: '¿cudaMalloc cambia o elimina el arreglo h_A del host?',
    answer: 'No. h_A y sus valores permanecen iguales.',
  },
  {
    id: CUDA_MALLOC_CARD_IDS[3],
    question: '¿Qué debes hacer con el resultado de cudaMalloc?',
    answer: 'Comprobar el código de error y, si tuvo éxito, liberar después con cudaFree.',
  },
] as const;

const currentStep = ref(0);
const elementCount = ref<CudaMallocElementCount>(4);
const prediction = ref<CudaMallocPrediction | null>(null);
const predictionSubmitted = ref(false);
const frame = ref<Frame>('before');
const checkAnswers = ref<Array<number | null>>([null, null, null]);
const seenCards = ref<string[]>([]);
const currentCardIndex = ref(0);
const cardRevealed = ref(false);
const completed = ref(false);
const storageStatus = ref('');

const config = computed(() => normalizeCudaMallocConfig({ elementCount: elementCount.value }));
const snapshot = computed(() => buildCudaMallocSnapshot(config.value));
const scene = computed(() => (frame.value === 'after' ? snapshot.value.after : snapshot.value.before));
const currentCard = computed(() => CARDS[currentCardIndex.value] ?? CARDS[0]);
const checksCorrect = computed(() =>
  checkAnswers.value.reduce<number>(
    (total, answer, index) => total + (answer === CHECKS[index]?.correct ? 1 : 0),
    0,
  ),
);
const canComplete = computed(
  () => checksCorrect.value === CHECKS.length && seenCards.value.length === CARDS.length,
);

function persist(): void {
  const state = createDefaultLearnerState();
  state.completedClasses = completed.value ? [CUDA_MALLOC_CLASS_ID] : [];
  state.classProgress['cuda-malloc'] = {
    step: currentStep.value,
    elementCount: elementCount.value,
    prediction: prediction.value,
    checkAnswers: [...checkAnswers.value],
  };
  state.anki['cuda-malloc'].seen = [...seenCards.value];
  if (!saveLearnerState(state)) {
    storageStatus.value = 'El progreso continúa en esta página, pero el navegador no permitió guardarlo.';
  }
}

onMounted(() => {
  const state = loadLearnerState();
  const progress = state.classProgress['cuda-malloc'];
  currentStep.value = progress.step;
  elementCount.value = progress.elementCount;
  prediction.value = progress.prediction;
  predictionSubmitted.value = progress.prediction !== null;
  checkAnswers.value = [...progress.checkAnswers];
  seenCards.value = [...state.anki['cuda-malloc'].seen];
  completed.value = state.completedClasses.includes(CUDA_MALLOC_CLASS_ID);
  if (currentStep.value >= 2) frame.value = 'after';
});

function chooseElementCount(count: CudaMallocElementCount): void {
  elementCount.value = count;
  frame.value = 'before';
  persist();
}

function goToStep(step: number): void {
  currentStep.value = Math.max(0, Math.min(6, step));
  if (currentStep.value === 0 || currentStep.value === 1) frame.value = 'before';
  if (currentStep.value >= 3) frame.value = 'after';
  persist();
}

function choosePrediction(value: CudaMallocPrediction): void {
  prediction.value = value;
  predictionSubmitted.value = true;
  persist();
}

function beginExecution(): void {
  currentStep.value = 2;
  frame.value = 'action';
  persist();
}

function showFrame(value: Frame): void {
  frame.value = value;
}

function answerCheck(checkIndex: number, answerIndex: number): void {
  checkAnswers.value[checkIndex] = answerIndex;
  checkAnswers.value = [...checkAnswers.value];
  persist();
}

function revealCard(): void {
  cardRevealed.value = true;
  const id = currentCard.value.id;
  if (!seenCards.value.includes(id)) {
    seenCards.value = [...seenCards.value, id];
    persist();
  }
}

function nextCard(): void {
  currentCardIndex.value = (currentCardIndex.value + 1) % CARDS.length;
  cardRevealed.value = false;
}

function completeClass(): void {
  if (!canComplete.value) return;
  completed.value = true;
  storageStatus.value = 'Clase completada y guardada en este navegador.';
  persist();
}

function resetProgress(): void {
  const state = resetLearnerState();
  const progress = state.classProgress['cuda-malloc'];
  currentStep.value = progress.step;
  elementCount.value = progress.elementCount;
  prediction.value = progress.prediction;
  predictionSubmitted.value = false;
  frame.value = 'before';
  checkAnswers.value = [...progress.checkAnswers];
  seenCards.value = [];
  currentCardIndex.value = 0;
  cardRevealed.value = false;
  completed.value = false;
  storageStatus.value = 'Progreso local reiniciado.';
}
</script>

<template>
  <section class="malloc-class" aria-labelledby="malloc-title">
    <header class="class-header">
      <p class="eyebrow">Clase 01 · una primitiva</p>
      <h2 id="malloc-title"><code>cudaMalloc</code>: reservar no es inicializar</h2>
      <p>Al terminar podrás reconocer esta llamada y predecir qué cambia —y qué no— cuando tiene éxito.</p>
      <p class="model-note">
        <strong>Modelo explicativo:</strong> no ejecuta CUDA ni emula hardware. Representa una llamada exitosa
        con estados deterministas; no inventa direcciones, tiempos ni datos.
      </p>
    </header>

    <nav class="step-nav" aria-label="Pasos de la clase">
      <button
        v-for="step in STEPS"
        :key="step.id"
        type="button"
        class="step-button"
        :class="{ 'step-button--current': currentStep === step.id }"
        :aria-current="currentStep === step.id ? 'step' : undefined"
        @click="goToStep(step.id)"
      >
        <span aria-hidden="true">{{ step.id + 1 }}</span> {{ step.short }}
      </button>
    </nav>

    <div class="size-control" role="group" aria-label="Cantidad de elementos float">
      <span>Elementos:</span>
      <button
        v-for="count in CUDA_MALLOC_ELEMENT_COUNTS"
        :key="count"
        type="button"
        :aria-pressed="elementCount === count"
        :class="{ selected: elementCount === count }"
        @click="chooseElementCount(count)"
      >
        {{ count }}
      </button>
      <span class="byte-count">{{ snapshot.action.byteCount }} bytes</span>
    </div>

    <section class="scene" aria-labelledby="scene-title">
      <div class="scene-heading">
        <h3 id="scene-title">
          Estado {{ frame === 'before' ? 'ANTES' : frame === 'action' ? 'durante la ACCIÓN' : 'DESPUÉS' }}
        </h3>
        <code>{{ snapshot.action.code }}</code>
      </div>

      <div class="memory-layout" aria-live="polite">
        <article class="memory-panel memory-panel--host">
          <h4><span aria-hidden="true">CPU</span> Host</h4>
          <div class="pointer" :class="{ changing: frame === 'action' }" data-test="pointer-state">
            <span><code>d_A</code> (variable del host)</span>
            <strong v-if="frame === 'before'"><span aria-hidden="true">○</span> nullptr</strong>
            <strong v-else-if="frame === 'action'"
              ><span aria-hidden="true">↻</span> se está escribiendo</strong
            >
            <strong v-else><span aria-hidden="true">→</span> asignación del device</strong>
          </div>
          <p class="cell-label"><code>h_A</code>: índice arriba · valor almacenado abajo</p>
          <ol class="cells host-cells" aria-label="Celdas de h_A ordenadas por índice con su valor">
            <li
              v-for="cell in scene.hostCells"
              :key="cell.index"
              class="cell cell--valid"
              data-test="host-cell"
            >
              <span class="sr-only">Celda [{{ cell.index }}], valor {{ cell.value }}</span>
              <span class="cell-index" aria-hidden="true">[{{ cell.index }}]</span>
              <strong class="cell-content" aria-hidden="true">{{ cell.value }}</strong>
            </li>
          </ol>
        </article>

        <article class="memory-panel memory-panel--device" :class="{ changing: frame === 'action' }">
          <h4><span aria-hidden="true">GPU</span> Device</h4>
          <template v-if="frame === 'action'">
            <div class="empty-state changing-state" data-test="device-state">
              <span aria-hidden="true">↻</span>
              Reservando {{ snapshot.action.byteCount }} bytes…
            </div>
          </template>
          <template v-else-if="scene.deviceAllocation === null">
            <div class="empty-state" data-test="device-state">
              <span aria-hidden="true">○</span>
              Sin asignación para <code>d_A</code>
            </div>
          </template>
          <template v-else>
            <p class="cell-label">Asignada: índice arriba · contenido indefinido abajo</p>
            <ol class="cells device-cells" aria-label="Celdas ordenadas por índice con contenido indefinido">
              <li
                v-for="cell in scene.deviceAllocation.cells"
                :key="cell.index"
                class="cell cell--undefined"
                data-test="device-cell"
              >
                <span class="sr-only">Celda [{{ cell.index }}], contenido indefinido</span>
                <span class="cell-index" aria-hidden="true">[{{ cell.index }}]</span>
                <strong class="cell-content" aria-hidden="true">{{ cell.symbol }}</strong>
              </li>
            </ol>
          </template>
        </article>
      </div>
    </section>

    <section class="stage" :aria-labelledby="`stage-${currentStep}`">
      <p class="stage-label">{{ STEPS[currentStep]?.label }}</p>

      <template v-if="currentStep === 0">
        <h3 id="stage-0">Mira el estado mínimo</h3>
        <p>
          <code>h_A</code> ya tiene datos válidos en el host. La variable <code>d_A</code> vale
          <code>nullptr</code> y todavía no identifica memoria del device.
        </p>
        <button type="button" class="primary-action" @click="goToStep(1)">Hacer una predicción</button>
      </template>

      <template v-else-if="currentStep === 1">
        <h3 id="stage-1">¿Qué aparecerá después de la llamada?</h3>
        <div class="answer-list" role="group" aria-label="Predicción sobre cudaMalloc">
          <button
            v-for="option in PREDICTIONS"
            :key="option.id"
            type="button"
            :aria-pressed="prediction === option.id"
            :class="{ selected: prediction === option.id }"
            @click="choosePrediction(option.id)"
          >
            {{ option.label }}
          </button>
        </div>
        <p v-if="predictionSubmitted" class="feedback" role="status" data-test="prediction-feedback">
          Predicción guardada. Ahora ejecuta la transición para contrastarla.
        </p>
        <button type="button" class="primary-action" :disabled="!predictionSubmitted" @click="beginExecution">
          Ejecutar: ver la acción
        </button>
      </template>

      <template v-else-if="currentStep === 2">
        <h3 id="stage-2">Ejecuta cuadro por cuadro</h3>
        <p>
          La transición está detenida en cada estado: puedes avanzar, volver o repetir sin cambiar el modelo.
        </p>
        <div class="frame-controls" role="group" aria-label="Cuadros de la transición">
          <button type="button" :aria-pressed="frame === 'before'" @click="showFrame('before')">
            1 · Antes
          </button>
          <button type="button" :aria-pressed="frame === 'action'" @click="showFrame('action')">
            2 · Acción
          </button>
          <button type="button" :aria-pressed="frame === 'after'" @click="showFrame('after')">
            3 · Después
          </button>
        </div>
        <p v-if="frame === 'action'" class="action-fact" role="status">
          <code>{{ snapshot.action.byteExpression }}</code
          >. La llamada recibe <code>&amp;d_A</code> para poder escribir el puntero resultante.
        </p>
        <button v-if="frame !== 'after'" type="button" class="primary-action" @click="showFrame('after')">
          Ver el resultado
        </button>
        <button v-else type="button" class="primary-action" @click="goToStep(3)">
          Explicar el resultado
        </button>
        <button type="button" class="secondary-action" @click="showFrame('before')">
          Repetir desde antes
        </button>
      </template>

      <template v-else-if="currentStep === 3">
        <h3 id="stage-3">Antes → acción → después</h3>
        <div class="causal-grid">
          <article class="fact fact--changed" data-test="changed">
            <h4><span aria-hidden="true">↻</span> CAMBIÓ</h4>
            <ul>
              <li v-for="fact in snapshot.changed" :key="fact">{{ fact }}</li>
            </ul>
          </article>
          <article class="fact fact--unchanged" data-test="unchanged">
            <h4><span aria-hidden="true">=</span> NO CAMBIÓ</h4>
            <ul>
              <li v-for="fact in snapshot.unchanged" :key="fact">{{ fact }}</li>
            </ul>
          </article>
          <article class="fact fact--why" data-test="why">
            <h4><span aria-hidden="true">→</span> POR QUÉ</h4>
            <p>{{ snapshot.why }}</p>
          </article>
        </div>
        <button type="button" class="primary-action" @click="goToStep(4)">Ver las peculiaridades</button>
      </template>

      <template v-else-if="currentStep === 4">
        <h3 id="stage-4">Tres peculiaridades que sí importan ahora</h3>
        <ol class="quirks">
          <li>
            <strong>Asignar no inicializa.</strong> Leer esas celdas antes de escribir datos usa contenido
            indefinido.
          </li>
          <li>
            <strong>La asignación puede fallar.</strong> Comprueba el código devuelto antes de usar
            <code>d_A</code>.
          </li>
          <li>
            <strong>La memoria sigue ocupada.</strong> Una asignación exitosa necesita un
            <code>cudaFree(d_A)</code> posterior.
          </li>
        </ol>
        <button type="button" class="primary-action" @click="goToStep(5)">Comprobar lo entendido</button>
      </template>

      <template v-else-if="currentStep === 5">
        <h3 id="stage-5">Tres comprobaciones cortas</h3>
        <ol class="checks">
          <li v-for="(check, checkIndex) in CHECKS" :key="check.question" class="check-card">
            <fieldset>
              <legend>{{ check.question }}</legend>
              <label v-for="(option, optionIndex) in check.options" :key="option">
                <input
                  type="radio"
                  :name="`check-${checkIndex}`"
                  :checked="checkAnswers[checkIndex] === optionIndex"
                  @change="answerCheck(checkIndex, optionIndex)"
                />
                <span>{{ option }}</span>
              </label>
            </fieldset>
            <p v-if="checkAnswers[checkIndex] !== null" class="feedback" role="status">
              <strong>{{ checkAnswers[checkIndex] === check.correct ? 'Correcto.' : 'Todavía no.' }}</strong>
              {{ check.explanation }}
            </p>
          </li>
        </ol>
        <p class="score" data-test="check-score">{{ checksCorrect }} / {{ CHECKS.length }} correctas</p>
        <button type="button" class="primary-action" @click="goToStep(6)">Ir al repaso Anki</button>
      </template>

      <template v-else>
        <h3 id="stage-6">Repaso final: cuatro tarjetas</h3>
        <p>Intenta responder en voz baja antes de mostrar cada reverso.</p>
        <article class="anki-card" data-test="anki-card">
          <p class="anki-progress">Tarjeta {{ currentCardIndex + 1 }} de {{ CARDS.length }}</p>
          <h4>{{ currentCard.question }}</h4>
          <button v-if="!cardRevealed" type="button" class="primary-action" @click="revealCard">
            Mostrar respuesta
          </button>
          <div v-else class="anki-answer" role="status">
            <p>{{ currentCard.answer }}</p>
            <button type="button" class="primary-action" @click="nextCard">Siguiente tarjeta</button>
          </div>
        </article>
        <p data-test="anki-seen">Vistas: {{ seenCards.length }} / {{ CARDS.length }}</p>
        <button type="button" class="complete-action" :disabled="!canComplete" @click="completeClass">
          {{ completed ? 'Clase completada ✓' : 'Marcar clase como completada' }}
        </button>
        <p v-if="!canComplete" class="completion-hint">
          Para completar: responde bien las tres comprobaciones y revela las cuatro tarjetas.
        </p>
      </template>
    </section>

    <footer class="class-footer">
      <p class="storage-note">
        <span aria-hidden="true">▣</span> El progreso se guarda solo en este navegador. No hay cuenta,
        analítica ni seguimiento.
      </p>
      <button type="button" class="reset-action" @click="resetProgress">Reiniciar progreso local</button>
      <p class="sr-status" role="status" aria-live="polite" data-test="storage-status">{{ storageStatus }}</p>
    </footer>
  </section>
</template>

<style scoped>
.malloc-class {
  max-width: 100%;
  overflow-wrap: anywhere;
  border: 1px solid var(--sgpu-border);
  border-radius: var(--sgpu-radius-md);
  background: var(--sgpu-surface);
  color: var(--sgpu-text);
}

.class-header,
.stage,
.class-footer {
  padding: clamp(1rem, 4vw, 1.5rem);
}

.class-header h2,
.stage h3,
.scene h3,
.memory-panel h4 {
  margin-top: 0;
}

.eyebrow,
.stage-label {
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

.step-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 0 clamp(1rem, 4vw, 1.5rem) 1rem;
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

button:hover {
  border-color: var(--sgpu-selected-border);
}

button:focus-visible {
  outline: 3px solid var(--sgpu-selected-ring);
  outline-offset: 2px;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.step-button {
  flex: 1 1 6.5rem;
  font-size: var(--sgpu-font-size-xs);
}

.step-button--current,
button.selected,
button[aria-pressed='true'] {
  border: 2px solid var(--sgpu-selected-border);
  box-shadow: 0 0 0 2px var(--sgpu-selected-ring);
}

.size-control {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sgpu-gap-sm);
  padding: 0 clamp(1rem, 4vw, 1.5rem) 1rem;
  font-size: var(--sgpu-font-size-sm);
}

.size-control button {
  min-width: 44px;
  padding-inline: 0.5rem;
}

.byte-count {
  margin-left: auto;
  font-family: var(--sgpu-font-mono);
}

.scene {
  padding: clamp(1rem, 4vw, 1.5rem);
  border-block: 1px solid var(--sgpu-border);
  background: var(--sgpu-surface-muted);
}

.scene-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--sgpu-gap-sm);
  margin-bottom: var(--sgpu-gap-md);
}

.scene-heading h3,
.scene-heading code {
  margin: 0;
}

.scene-heading code {
  white-space: normal;
  word-break: break-word;
}

.memory-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--sgpu-gap-md);
}

.memory-panel {
  min-width: 0;
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
  margin: 0 0 var(--sgpu-gap-md);
  line-height: 1.2;
}

.memory-panel h4 span {
  display: inline-block;
  border: 1px solid currentColor;
  border-radius: 999px;
  padding: 0.1rem 0.45rem;
  font-size: var(--sgpu-font-size-xs);
}

.pointer,
.empty-state {
  display: flex;
  min-height: 3rem;
  align-items: center;
  justify-content: space-between;
  gap: var(--sgpu-gap-sm);
  border: 1px dashed currentColor;
  border-radius: var(--sgpu-radius-sm);
  padding: var(--sgpu-gap-sm);
}

.pointer strong {
  text-align: right;
}

.changing,
.changing-state {
  border-style: double;
  border-color: var(--sgpu-changing-border);
  background: var(--sgpu-changing-bg);
  color: var(--sgpu-changing-text);
}

.cell-label {
  margin: var(--sgpu-gap-md) 0 var(--sgpu-gap-sm);
  font-size: var(--sgpu-font-size-sm);
}

.cells {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(3.25rem, 1fr));
  gap: var(--sgpu-gap-sm);
  list-style: none;
  margin: 0;
  padding: 0;
}

.cells > li {
  margin: 0;
}

.cell {
  display: grid;
  min-width: 0;
  min-height: 4.25rem;
  grid-template-rows: auto 1fr;
  overflow: hidden;
  border: 2px solid;
  border-radius: var(--sgpu-radius-sm);
  font-family: var(--sgpu-font-mono);
  text-align: center;
  transition:
    opacity 160ms ease,
    transform 160ms ease;
}

.cell-index {
  padding: 0.2rem 0.25rem;
  border-bottom: 1px solid currentColor;
  font-size: var(--sgpu-font-size-xs);
  font-weight: 700;
}

.cell-content {
  display: grid;
  min-height: 2.5rem;
  place-items: center;
  padding: 0.25rem;
  font-size: 1.125rem;
}

.cell--valid {
  border-color: var(--sgpu-active-border);
  background: var(--sgpu-active-bg);
  color: var(--sgpu-active-text);
}

.cell--undefined {
  border-color: var(--sgpu-undefined-border);
  border-style: dashed;
  background: var(--sgpu-undefined-bg);
  color: var(--sgpu-undefined-text);
}

.stage {
  min-height: 18rem;
}

.stage > :last-child {
  margin-bottom: 0;
}

.answer-list,
.frame-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--sgpu-gap-sm);
  margin-block: var(--sgpu-gap-md);
}

.answer-list button {
  text-align: left;
}

.primary-action,
.complete-action {
  border-color: var(--sgpu-selected-border);
  background: var(--sgpu-selected-border);
  color: #ffffff;
}

.secondary-action,
.reset-action {
  margin-left: var(--sgpu-gap-sm);
}

.feedback,
.action-fact,
.score,
.completion-hint {
  padding: var(--sgpu-gap-sm);
  border-radius: var(--sgpu-radius-sm);
  background: var(--sgpu-surface-muted);
}

.causal-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--sgpu-gap-md);
  margin-bottom: var(--sgpu-gap-md);
}

.fact {
  border: 1px solid var(--sgpu-border);
  border-left-width: 5px;
  border-radius: var(--sgpu-radius-sm);
  padding: var(--sgpu-gap-md);
}

.fact h4 {
  margin-top: 0;
}

.fact--changed {
  border-left-color: var(--sgpu-changing-border);
}

.fact--unchanged {
  border-left-color: var(--sgpu-inactive-border);
}

.fact--why {
  border-left-color: var(--sgpu-selected-border);
}

.quirks,
.checks {
  padding-left: 1.25rem;
}

.quirks li,
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

.anki-card {
  border: 2px solid var(--sgpu-selected-border);
  border-radius: var(--sgpu-radius-md);
  padding: clamp(1rem, 4vw, 1.5rem);
  background: var(--sgpu-surface-muted);
}

.anki-progress,
.storage-note,
.completion-hint {
  color: var(--sgpu-text-muted);
  font-size: var(--sgpu-font-size-sm);
}

.class-footer {
  border-top: 1px solid var(--sgpu-border);
}

.sr-only,
.sr-status {
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
  .memory-layout,
  .causal-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .fact--why {
    grid-column: 1 / -1;
  }

  .frame-controls {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 420px) {
  .byte-count {
    width: 100%;
    margin-left: 0;
  }

  .secondary-action,
  .reset-action {
    display: block;
    width: 100%;
    margin: var(--sgpu-gap-sm) 0 0;
  }

  .primary-action,
  .complete-action {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cell {
    transition: none;
  }
}
</style>
