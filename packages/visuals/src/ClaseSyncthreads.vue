<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type {
  SyncthreadsScenario,
  SyncthreadsThreadSnapshot,
  SyncthreadsThreadState,
} from '@simulagpu/contracts';
import { buildSyncthreadsSnapshot, normalizeSyncthreadsConfig } from '@simulagpu/core';
import '@simulagpu/theme/tokens.css';

import {
  SYNCTHREADS_CARD_IDS,
  SYNCTHREADS_CLASS_ID,
  createDefaultSyncthreadsState,
  loadSyncthreadsState,
  resetSyncthreadsState,
  saveSyncthreadsState,
} from './syncthreadsProgress.js';

const STEPS = [
  { id: 0, short: 'Ver', label: 'VER' },
  { id: 1, short: 'Predecir', label: 'PREDECIR' },
  { id: 2, short: 'Ejecutar', label: 'EJECUTAR' },
  { id: 3, short: 'Explicar', label: 'EXPLICAR' },
  { id: 4, short: 'Detalles', label: 'PECULIARIDADES' },
  { id: 5, short: 'Comprobar', label: 'COMPROBAR' },
  { id: 6, short: 'Retener', label: 'RETENER' },
] as const;

const PREDICTION = {
  question: 'T0 llega primero a __syncthreads(). ¿Qué ocurre?',
  options: [
    'T0 continúa de inmediato.',
    'T0 espera a los demás hilos de su bloque.',
    'Toda la GPU se detiene.',
    'T0 espera a todos los hilos de la grid.',
  ],
  correct: 1,
  feedback: [
    'No. Llegar a la barrera no es cruzarla: T0 no puede continuar hasta que el bloque esté completo.',
    'Correcto. T0 queda ESPERANDO hasta que todos los hilos de Block 0 alcancen la barrera.',
    'No. La barrera no detiene la GPU; coordina a los hilos de un bloque.',
    'No. El alcance de __syncthreads() es el bloque, no la grid entera.',
  ],
} as const;

const CHECKS = [
  {
    question: 'T0 y T2 ya llegaron a __syncthreads(); T1 y T3 no. ¿Puede T0 cruzar la barrera?',
    options: ['Sí, ya hizo su trabajo', 'No: espera a que todo el bloque llegue', 'Sí, porque es el hilo 0'],
    correct: 1,
    explanation:
      'Mientras falte un hilo participante, nadie cruza. T0 sigue en ESPERANDO hasta que T1 y T3 lleguen.',
  },
  {
    question: 'Block 0 completó su barrera; Block 1 aún no. ¿Debe Block 0 esperar a Block 1?',
    options: [
      'Sí, todos los bloques se sincronizan juntos',
      'No: __syncthreads() sincroniza dentro de un bloque',
      'Solo si comparten la misma grid',
    ],
    correct: 1,
    explanation:
      'El alcance es el bloque. Block 0 se libera con sus cuatro hilos, sin importar en qué estado esté Block 1.',
  },
  {
    question: 'En un bloque parcial, ¿por qué es inseguro if (i < N) { __syncthreads(); }?',
    options: [
      'Porque la comparación i < N es lenta',
      'Porque algunos hilos nunca ejecutan la barrera: participación divergente',
      'Porque N debe ser potencia de dos',
    ],
    correct: 1,
    explanation:
      'Los hilos sin elemento válido saltan el if y nunca ejecutan la barrera. La participación queda divergente y el patrón es inválido.',
  },
  {
    question: '¿Qué calcula __syncthreads() por sí misma?',
    options: [
      'Suma los valores de los hilos del bloque',
      'Nada: solo coordina orden y visibilidad',
      'Copia datos a memoria compartida',
    ],
    correct: 1,
    explanation:
      'La barrera no combina, no copia ni reduce valores. Solo garantiza que el bloque llegó al mismo punto antes de continuar.',
  },
] as const;

const CARDS = [
  {
    id: SYNCTHREADS_CARD_IDS[0],
    question: '¿Qué hace un hilo que llega a __syncthreads() antes que los demás de su bloque?',
    answer: 'Espera. No puede cruzar la barrera hasta que el bloque completo la alcance.',
  },
  {
    id: SYNCTHREADS_CARD_IDS[1],
    question: '¿__syncthreads() sincroniza distintos bloques de hilos?',
    answer: 'No. Su alcance es el bloque de hilos, no la grid completa.',
  },
  {
    id: SYNCTHREADS_CARD_IDS[2],
    question: '¿Qué evento libera la barrera de un bloque?',
    answer: 'Que todos los hilos participantes del bloque hayan llegado al mismo __syncthreads().',
  },
  {
    id: SYNCTHREADS_CARD_IDS[3],
    question: '¿Por qué puede ser inseguro poner __syncthreads() dentro de if (i < N) en un bloque parcial?',
    answer:
      'Porque algunos hilos saltan la barrera mientras otros la alcanzan: la participación es divergente.',
  },
  {
    id: SYNCTHREADS_CARD_IDS[4],
    question: '¿__syncthreads() obliga a ejecutar cada instrucción al mismo tiempo (lockstep)?',
    answer:
      'No. Es una frontera de sincronización de bloque; los hilos pueden llegar en momentos lógicos distintos.',
  },
  {
    id: SYNCTHREADS_CARD_IDS[5],
    question:
      'Un kernel falla o se cuelga solo con ciertos tamaños, cerca de una barrera. ¿Qué revisas primero?',
    answer:
      'Si todos los hilos requeridos de cada bloque alcanzan el mismo __syncthreads(), sobre todo en condiciones divergentes o guardas de rango.',
  },
] as const;

const STATE_SHORT: Record<SyncthreadsThreadState, string> = {
  before: 'ANTES',
  waiting: 'ESPERANDO',
  released: 'LIBERADO',
  after: 'DESPUÉS',
  invalid: 'NO LLEGA',
};

const STATE_SYMBOL: Record<SyncthreadsThreadState, string> = {
  before: '·',
  waiting: '⏸',
  released: '✓',
  after: '→',
  invalid: '✕',
};

const currentStep = ref(0);
const stageIndex = ref(0);
const predictedOption = ref<number | null>(null);
const predictionSubmitted = ref(false);
const checkAnswers = ref<Array<number | null>>([null, null, null, null]);
const seenCards = ref<string[]>([]);
const currentCardIndex = ref(0);
const cardRevealed = ref(false);
const completed = ref(false);
const storageStatus = ref('');

// The primary progression is the model the arrival controls drive.
const primarySnapshot = computed(() =>
  buildSyncthreadsSnapshot(normalizeSyncthreadsConfig({ scenario: 'primary' })),
);
const releaseStageIndex = computed(() => primarySnapshot.value.arrivalOrder.length); // 4
const lastStageIndex = computed(() => primarySnapshot.value.stages.length - 1); // 5

// Which scenario the on-screen scene shows, derived purely from the teaching step.
const sceneScenario = computed<SyncthreadsScenario>(() => {
  if (currentStep.value === 4) return 'divergent';
  if (currentStep.value === 5) return 'scope';
  return 'primary';
});

const activeSnapshot = computed(() =>
  sceneScenario.value === 'primary'
    ? primarySnapshot.value
    : buildSyncthreadsSnapshot(normalizeSyncthreadsConfig({ scenario: sceneScenario.value })),
);

const activeStage = computed(() => {
  if (sceneScenario.value !== 'primary') return activeSnapshot.value.stages[0];
  const clamped = Math.max(0, Math.min(stageIndex.value, lastStageIndex.value));
  return activeSnapshot.value.stages[clamped];
});

const arrivalOrderLabel = computed(() => primarySnapshot.value.arrivalOrder.join(' → '));
const canAdvanceArrival = computed(() => stageIndex.value < releaseStageIndex.value);
const canContinue = computed(() => stageIndex.value === releaseStageIndex.value);
const predictionCorrect = computed(() => predictedOption.value === PREDICTION.correct);

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

function zoneOf(state: SyncthreadsThreadState): 'antes' | 'sync' | 'despues' {
  if (state === 'waiting' || state === 'released') return 'sync';
  if (state === 'after') return 'despues';
  return 'antes';
}

function threadClass(thread: SyncthreadsThreadSnapshot): string {
  return `lane--${thread.state}`;
}

function persist(): void {
  const state = createDefaultSyncthreadsState();
  state.completedClasses = completed.value ? [SYNCTHREADS_CLASS_ID] : [];
  state.classProgress.syncthreads = {
    step: currentStep.value,
    scenario: sceneScenario.value,
    predictedOption: predictedOption.value,
    checkAnswers: [...checkAnswers.value],
  };
  state.anki.syncthreads.seen = [...seenCards.value];
  if (!saveSyncthreadsState(state)) {
    storageStatus.value = 'El progreso continúa en esta página, pero el navegador no permitió guardarlo.';
  }
}

onMounted(() => {
  const state = loadSyncthreadsState();
  const progress = state.classProgress.syncthreads;
  currentStep.value = progress.step;
  predictedOption.value = progress.predictedOption;
  predictionSubmitted.value = progress.predictedOption !== null;
  checkAnswers.value = [...progress.checkAnswers];
  seenCards.value = [...state.anki.syncthreads.seen];
  completed.value = state.completedClasses.includes(SYNCTHREADS_CLASS_ID);
  stageIndex.value = currentStep.value >= 3 ? releaseStageIndex.value : 0;
});

function goToStep(step: number): void {
  currentStep.value = Math.max(0, Math.min(6, step));
  if (currentStep.value <= 1) stageIndex.value = 0;
  if (currentStep.value === 3) stageIndex.value = releaseStageIndex.value;
  persist();
}

function choosePrediction(index: number): void {
  predictedOption.value = index;
  predictionSubmitted.value = true;
  persist();
}

function advanceArrival(): void {
  if (canAdvanceArrival.value) stageIndex.value += 1;
}

function continuePastBarrier(): void {
  if (canContinue.value) stageIndex.value = lastStageIndex.value;
}

function restartArrivals(): void {
  stageIndex.value = 0;
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
  resetSyncthreadsState();
  currentStep.value = 0;
  stageIndex.value = 0;
  predictedOption.value = null;
  predictionSubmitted.value = false;
  checkAnswers.value = [null, null, null, null];
  seenCards.value = [];
  currentCardIndex.value = 0;
  cardRevealed.value = false;
  completed.value = false;
  storageStatus.value = 'Progreso local reiniciado.';
}
</script>

<template>
  <section class="sync-class" aria-labelledby="sync-title">
    <header class="class-header">
      <p class="eyebrow">Primitiva C · una primitiva</p>
      <h2 id="sync-title"><code>__syncthreads()</code>: llegar no es cruzar</h2>
      <p>
        Al terminar podrás predecir quién espera y quién puede continuar en <code>__syncthreads()</code>,
        explicar que su alcance es un solo bloque y rechazar una participación divergente inválida.
      </p>
      <p class="model-note">
        <strong>Modelo explicativo:</strong> no ejecuta CUDA ni simula un planificador de hardware. Muestra
        estados de sincronización (<em>antes</em>, <em>esperando</em>, <em>liberado</em>, <em>después</em>) en
        un escenario determinista; no modela warps, tiempos ni ejecución en lockstep.
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

    <section class="scene" aria-labelledby="scene-title">
      <div class="scene-heading">
        <h3 id="scene-title">
          Escena:
          {{
            sceneScenario === 'primary'
              ? 'un bloque, una barrera'
              : sceneScenario === 'scope'
                ? 'alcance por bloque'
                : 'bloque parcial (participación inválida)'
          }}
        </h3>
        <p class="arrival-order" data-test="arrival-order">
          Orden de llegada didáctico: <strong>{{ arrivalOrderLabel }}</strong>
        </p>
      </div>

      <div class="blocks" aria-live="polite">
        <article
          v-for="block in activeStage?.blocks ?? []"
          :key="block.id"
          class="block"
          :class="{ 'block--satisfied': block.barrierSatisfied }"
          :data-test="`block-${block.id}`"
        >
          <header class="block-header">
            <h4>{{ block.label }}</h4>
            <span
              class="barrier-badge"
              :class="block.barrierSatisfied ? 'barrier-badge--ok' : 'barrier-badge--wait'"
              :data-test="`barrier-${block.id}`"
            >
              {{ block.barrierSatisfied ? 'barrera satisfecha' : 'barrera cerrada' }}
            </span>
          </header>

          <ol class="lanes" :aria-label="`Carriles de hilo de ${block.label}`">
            <li
              v-for="thread in block.threads"
              :key="thread.id"
              class="lane"
              :class="threadClass(thread)"
              :data-test="`lane-${block.id}-${thread.id}`"
            >
              <span class="lane-id" aria-hidden="true">{{ thread.id }}</span>
              <span class="sr-only">{{ thread.ariaLabel }}</span>
              <div class="lane-track">
                <span class="zone zone--antes" :class="{ 'zone--active': zoneOf(thread.state) === 'antes' }">
                  <span
                    v-if="zoneOf(thread.state) === 'antes'"
                    class="token"
                    :data-test="`token-${block.id}-${thread.id}`"
                    aria-hidden="true"
                    >{{ STATE_SYMBOL[thread.state] }}</span
                  >
                </span>
                <span class="barrier" aria-hidden="true">SYNC</span>
                <span
                  class="zone zone--despues"
                  :class="{ 'zone--active': zoneOf(thread.state) === 'despues' }"
                >
                  <span
                    v-if="zoneOf(thread.state) === 'despues'"
                    class="token"
                    :data-test="`token-${block.id}-${thread.id}`"
                    aria-hidden="true"
                    >{{ STATE_SYMBOL[thread.state] }}</span
                  >
                </span>
                <span
                  v-if="zoneOf(thread.state) === 'sync'"
                  class="token token--barrier"
                  :data-test="`token-${block.id}-${thread.id}`"
                  aria-hidden="true"
                  >{{ STATE_SYMBOL[thread.state] }}</span
                >
              </div>
              <span class="lane-state" :data-test="`state-${block.id}-${thread.id}`">
                {{ STATE_SHORT[thread.state] }}
              </span>
            </li>
          </ol>

          <p class="block-note" :data-test="`note-${block.id}`">{{ block.note }}</p>
        </article>
      </div>

      <p class="scene-caption" role="status" data-test="scene-caption">{{ activeStage?.caption }}</p>
    </section>

    <section class="stage" :aria-labelledby="`stage-${currentStep}`">
      <p class="stage-label">{{ STEPS[currentStep]?.label }}</p>

      <template v-if="currentStep === 0">
        <h3 id="stage-0">Mira la escena mínima</h3>
        <p>
          Un bloque, <code>Block 0</code>, con cuatro hilos <code>T0</code>–<code>T3</code>. Cada hilo hace un
          trabajo <strong>antes</strong>, alcanza <code>__syncthreads()</code> y luego continúa
          <strong>después</strong>. Ahora mismo los cuatro están en ANTES: nadie llegó a la barrera.
        </p>
        <button type="button" class="primary-action" @click="goToStep(1)">Hacer una predicción</button>
      </template>

      <template v-else-if="currentStep === 1">
        <h3 id="stage-1">Predice antes de ver</h3>
        <p>{{ PREDICTION.question }}</p>
        <div class="options" role="group" aria-label="Opciones de predicción">
          <button
            v-for="(option, index) in PREDICTION.options"
            :key="option"
            type="button"
            class="option"
            :class="{ 'option--chosen': predictedOption === index }"
            :aria-pressed="predictedOption === index"
            :data-test="`predict-option-${index}`"
            @click="choosePrediction(index)"
          >
            {{ option }}
          </button>
        </div>
        <p v-if="predictionSubmitted" class="feedback" role="status" data-test="prediction-feedback">
          <strong>{{ predictionCorrect ? '¡Correcto!' : 'Todavía no.' }}</strong>
          {{ PREDICTION.feedback[predictedOption ?? 0] }}
        </p>
        <button v-if="predictionSubmitted" type="button" class="primary-action" @click="goToStep(2)">
          Ejecutar las llegadas
        </button>
      </template>

      <template v-else-if="currentStep === 2">
        <h3 id="stage-2">Avanza llegada por llegada</h3>
        <p>
          Revela las llegadas en el orden didáctico fijo <strong>{{ arrivalOrderLabel }}</strong
          >. Observa cómo se acumula ESPERANDO sin que nadie cruce, hasta la liberación conjunta.
        </p>
        <div class="frame-controls" role="group" aria-label="Controles de ejecución">
          <button
            type="button"
            class="primary-action"
            :disabled="!canAdvanceArrival"
            data-test="advance-arrival"
            @click="advanceArrival"
          >
            Avanzar siguiente llegada
          </button>
          <button
            type="button"
            :disabled="!canContinue"
            data-test="continue-barrier"
            @click="continuePastBarrier"
          >
            Continuar a después
          </button>
          <button type="button" data-test="restart-arrivals" @click="restartArrivals">Reiniciar</button>
        </div>
        <p class="counter-state" role="status" data-test="counter-state">
          <template v-if="activeStage?.barrierSatisfied && stageIndex === lastStageIndex">
            Los cuatro hilos cruzaron juntos la barrera.
          </template>
          <template v-else-if="activeStage?.barrierSatisfied">
            La barrera quedó satisfecha: los cuatro hilos están LIBERADOS.
          </template>
          <template v-else>
            Todavía no llegaron: <strong>{{ (activeStage?.notArrivedIds ?? []).join(', ') }}</strong
            >. La barrera sigue cerrada; ningún hilo puede continuar.
          </template>
        </p>
        <button
          v-if="activeStage?.barrierSatisfied"
          type="button"
          class="primary-action"
          @click="goToStep(3)"
        >
          Explicar el resultado
        </button>
      </template>

      <template v-else-if="currentStep === 3">
        <h3 id="stage-3">Antes → barrera → después</h3>
        <div class="causal-grid">
          <article class="fact fact--changed" data-test="changed">
            <h4><span aria-hidden="true">↻</span> CAMBIÓ</h4>
            <ul>
              <li v-for="fact in primarySnapshot.changed" :key="fact">{{ fact }}</li>
            </ul>
          </article>
          <article class="fact fact--unchanged" data-test="unchanged">
            <h4><span aria-hidden="true">=</span> NO CAMBIÓ</h4>
            <ul>
              <li v-for="fact in primarySnapshot.unchanged" :key="fact">{{ fact }}</li>
            </ul>
          </article>
          <article class="fact fact--why" data-test="why">
            <h4><span aria-hidden="true">→</span> POR QUÉ</h4>
            <p>{{ primarySnapshot.why }}</p>
          </article>
        </div>
        <button type="button" class="primary-action" @click="goToStep(4)">Ver la peculiaridad</button>
      </template>

      <template v-else-if="currentStep === 4">
        <h3 id="stage-4">La trampa del bloque parcial</h3>
        <p>
          Reutiliza el bloque final parcial de la Clase 0: con <code>N = 2</code>, solo <code>T0</code> y
          <code>T1</code> tienen elemento válido.
        </p>
        <pre data-test="divergent-code"><code>{{ activeSnapshot.code }}</code></pre>
        <p>
          <code>T2</code> y <code>T3</code> saltan el <code>if</code> y <strong>nunca</strong> ejecutan la
          barrera. No es que estén "fuera del bloque": siguen siendo hilos de <code>Block 0</code> sin dato
          válido. La barrera de bloque necesita participación compatible de todo el bloque, así que este
          patrón es <strong>inválido</strong>.
        </p>
        <p class="counter-state" data-test="divergent-why">{{ activeSnapshot.why }}</p>
        <p class="safe-note">
          Forma segura: sacar la barrera del <code>if</code> para que todo el bloque la ejecute.
          <br />
          <code>if (i &lt; N) { work(i); }</code> · <code>__syncthreads();</code> ·
          <code>if (i &lt; N) { dependent_work(i); }</code>
        </p>
        <p class="model-note small">
          El modelo no simula un cuelgue ni un deadlock: marca la participación como inválida y explica la
          causa.
        </p>
        <button type="button" class="primary-action" @click="goToStep(5)">Comprobar lo entendido</button>
      </template>

      <template v-else-if="currentStep === 5">
        <h3 id="stage-5">Alcance y comprobaciones</h3>
        <p>
          Arriba, <code>Block 0</code> ya liberó su barrera mientras <code>Block 1</code> sigue con hilos en
          ANTES. Ninguna línea une las dos barreras: no hay barrera compartida entre bloques.
        </p>
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
        <p class="handoff">
          Pregunta abierta para la Clase 3:
          <em>¿dónde pueden dejar los hilos datos que otros hilos del mismo bloque reutilicen?</em> Ahora
          sabemos <strong>cómo</strong> coordinar fases; después veremos <strong>qué</strong> organización de
          memoria hace útil esa cooperación.
        </p>
        <button type="button" class="primary-action" @click="goToStep(6)">Ir al repaso Anki</button>
      </template>

      <template v-else>
        <h3 id="stage-6">Repaso final: seis tarjetas</h3>
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
          Para completar: responde bien las cuatro comprobaciones y revela las seis tarjetas.
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
.sync-class {
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
.block h4 {
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

.model-note.small {
  font-size: var(--sgpu-font-size-xs);
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

.scene {
  padding: clamp(1rem, 4vw, 1.5rem);
  border-block: 1px solid var(--sgpu-border);
  background: var(--sgpu-surface-muted);
}

.scene-heading {
  margin-bottom: var(--sgpu-gap-md);
}

.scene-heading h3 {
  margin-bottom: var(--sgpu-gap-sm);
}

.arrival-order {
  margin: 0;
  font-size: var(--sgpu-font-size-sm);
  color: var(--sgpu-text-muted);
}

.blocks {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--sgpu-gap-md);
}

.block {
  min-width: 0;
  border: 2px solid var(--sgpu-border);
  border-radius: var(--sgpu-radius-md);
  padding: var(--sgpu-gap-md);
  background: var(--sgpu-surface);
}

.block--satisfied {
  border-color: var(--sgpu-active-border);
}

.block-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--sgpu-gap-sm);
  margin-bottom: var(--sgpu-gap-md);
}

.block-header h4 {
  margin: 0;
}

.barrier-badge {
  border: 1px solid currentColor;
  border-radius: 999px;
  padding: 0.1rem 0.5rem;
  font-size: var(--sgpu-font-size-xs);
  font-weight: 700;
}

.barrier-badge--ok {
  border-color: var(--sgpu-active-border);
  color: var(--sgpu-active-text);
  background: var(--sgpu-active-bg);
}

.barrier-badge--wait {
  border-style: dashed;
  color: var(--sgpu-text-muted);
}

.lanes {
  display: grid;
  gap: var(--sgpu-gap-sm);
  list-style: none;
  margin: 0;
  padding: 0;
}

.lane {
  display: grid;
  grid-template-columns: 2.5rem minmax(0, 1fr) 5.5rem;
  align-items: center;
  gap: var(--sgpu-gap-sm);
  padding: var(--sgpu-gap-xs) var(--sgpu-gap-sm);
  border: 1px solid var(--sgpu-border);
  border-radius: var(--sgpu-radius-sm);
  font-family: var(--sgpu-font-mono);
}

.lane-id {
  font-weight: 700;
}

.lane-track {
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: var(--sgpu-gap-xs);
  min-height: 2.25rem;
}

.zone {
  display: grid;
  place-items: center;
  min-height: 2rem;
  border: 1px dashed var(--sgpu-inactive-border);
  border-radius: var(--sgpu-radius-sm);
  background: var(--sgpu-surface-muted);
}

.zone--active {
  border-style: solid;
  border-color: var(--sgpu-selected-border);
}

.barrier {
  padding: 0.15rem 0.35rem;
  border: 2px solid var(--sgpu-boundary-accent);
  border-radius: var(--sgpu-radius-sm);
  background: var(--sgpu-changing-bg);
  color: var(--sgpu-changing-text);
  font-size: var(--sgpu-font-size-xs);
  font-weight: 700;
  letter-spacing: 0.05em;
}

.token {
  display: inline-grid;
  place-items: center;
  min-width: 1.6rem;
  min-height: 1.6rem;
  border-radius: 999px;
  font-size: 1rem;
  font-weight: 700;
}

.token--barrier {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.lane-state {
  font-size: var(--sgpu-font-size-xs);
  font-weight: 700;
  text-align: right;
}

/* Semantic state colours; every state also carries a text label + symbol. */
.lane--before .lane-state {
  color: var(--sgpu-text-muted);
}
.lane--waiting {
  border-color: var(--sgpu-changing-border);
}
.lane--waiting .token--barrier {
  background: var(--sgpu-changing-bg);
  color: var(--sgpu-changing-text);
  border: 2px solid var(--sgpu-changing-border);
}
.lane--released {
  border-color: var(--sgpu-active-border);
}
.lane--released .token--barrier {
  background: var(--sgpu-active-bg);
  color: var(--sgpu-active-text);
  border: 2px solid var(--sgpu-active-border);
}
.lane--after {
  border-color: var(--sgpu-active-border);
}
.lane--after .token {
  background: var(--sgpu-active-bg);
  color: var(--sgpu-active-text);
}
.lane--invalid {
  border-color: var(--sgpu-invalid-border);
  background: var(--sgpu-invalid-bg);
}
.lane--invalid .lane-state {
  color: var(--sgpu-invalid-text);
}
.lane--invalid .token {
  background: var(--sgpu-invalid-bg);
  color: var(--sgpu-invalid-text);
  border: 2px solid var(--sgpu-invalid-border);
}

.block-note {
  margin: var(--sgpu-gap-md) 0 0;
  font-size: var(--sgpu-font-size-sm);
}

.scene-caption {
  margin: var(--sgpu-gap-md) 0 0;
  padding: var(--sgpu-gap-sm) var(--sgpu-gap-md);
  border: 1px dashed var(--sgpu-border);
  border-radius: var(--sgpu-radius-sm);
  font-size: var(--sgpu-font-size-sm);
}

.stage {
  min-height: 18rem;
}

.stage > :last-child {
  margin-bottom: 0;
}

.options {
  display: grid;
  gap: var(--sgpu-gap-sm);
  margin-block: var(--sgpu-gap-md);
}

.option {
  text-align: left;
}

.option--chosen {
  border: 2px solid var(--sgpu-selected-border);
  box-shadow: 0 0 0 2px var(--sgpu-selected-ring);
}

.frame-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--sgpu-gap-sm);
  margin-block: var(--sgpu-gap-md);
}

.primary-action,
.complete-action {
  border-color: var(--sgpu-selected-border);
  background: var(--sgpu-selected-border);
  color: #ffffff;
}

.reset-action {
  margin-left: var(--sgpu-gap-sm);
}

.feedback,
.counter-state,
.score,
.completion-hint,
.handoff,
.safe-note {
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

pre {
  overflow-x: auto;
  margin: var(--sgpu-gap-md) 0;
  padding: var(--sgpu-gap-md);
  border-radius: var(--sgpu-radius-sm);
  background: var(--sgpu-surface);
  border: 1px solid var(--sgpu-border);
  font-family: var(--sgpu-font-mono);
  font-size: var(--sgpu-font-size-sm);
}

.checks {
  padding-left: 1.25rem;
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
  .causal-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .fact--why {
    grid-column: 1 / -1;
  }

  .frame-controls {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .blocks {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 420px) {
  .lane {
    grid-template-columns: 2.25rem minmax(0, 1fr) 4.5rem;
  }

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
</style>
