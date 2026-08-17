<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
  CUDA_MEMCPY_ELEMENT_COUNTS,
  type CudaMemcpyDirection,
  type CudaMemcpyElementCount,
  type CudaMemcpyRegion,
} from '@simulagpu/contracts';
import { buildCudaMemcpySnapshot, normalizeCudaMemcpyConfig } from '@simulagpu/core';
import '@simulagpu/theme/tokens.css';

import {
  CUDA_MEMCPY_CARD_IDS,
  CUDA_MEMCPY_CLASS_ID,
  createDefaultMemcpyState,
  loadMemcpyState,
  resetMemcpyState,
  saveMemcpyState,
} from './cudaMemcpyProgress.js';

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

const DIRECTIONS: ReadonlyArray<{ id: CudaMemcpyDirection; label: string }> = [
  { id: 'host-to-device', label: 'Host → Device' },
  { id: 'device-to-host', label: 'Device → Host' },
];

const CHECKS = [
  {
    question: 'En cudaMemcpy(d_x, h_x, 8 * sizeof(float), cudaMemcpyHostToDevice), ¿qué memoria se modifica?',
    options: ['h_x, el origen', 'd_x, el destino', 'Ninguna: solo se reserva memoria'],
    correct: 1,
    explanation:
      'El destino d_x recibe la copia; h_x es el origen y no cambia. cudaMemcpy no reserva memoria.',
  },
  {
    question:
      'Quieres copiar N floats pero escribes cudaMemcpy(d, h, N, cudaMemcpyHostToDevice). ¿Cuál es el error?',
    options: [
      'Falta el guard i < n',
      'N son elementos; el conteo va en bytes: usa N * sizeof(float)',
      'La dirección debería ser DeviceToHost',
    ],
    correct: 1,
    explanation: 'El tercer argumento son bytes. Para N floats el conteo correcto es N * sizeof(float).',
  },
  {
    question:
      'Traes un resultado de d_result a h_result con cudaMemcpy(h_result, d_result, sizeof(float), cudaMemcpyHostToDevice). ¿Qué corriges?',
    options: [
      'El orden de origen y destino',
      'La dirección: debe ser cudaMemcpyDeviceToHost',
      'El número de bytes',
    ],
    correct: 1,
    explanation:
      'El origen está en el device y el destino en el host: la dirección correcta es cudaMemcpyDeviceToHost.',
  },
] as const;

const CARDS = [
  {
    id: CUDA_MEMCPY_CARD_IDS[0],
    question: '¿Cuál es la diferencia clave entre cudaMalloc y cudaMemcpy?',
    answer: 'cudaMalloc reserva memoria en el device; cudaMemcpy copia datos entre regiones que ya existen.',
  },
  {
    id: CUDA_MEMCPY_CARD_IDS[1],
    question: 'En cudaMemcpy(dst, src, bytes, kind), ¿qué contenido se sobrescribe?',
    answer: 'El rango indicado del destino. El contenido del origen no cambia.',
  },
  {
    id: CUDA_MEMCPY_CARD_IDS[2],
    question: '¿El tercer argumento de cudaMemcpy es un número de elementos?',
    answer: 'No. Es un número de bytes. Para N valores de tipo T se usa N * sizeof(T).',
  },
  {
    id: CUDA_MEMCPY_CARD_IDS[3],
    question: '¿Qué describe cudaMemcpyHostToDevice?',
    answer: 'Que el origen está en memoria del host y el destino en memoria del device.',
  },
  {
    id: CUDA_MEMCPY_CARD_IDS[4],
    question: '¿Cómo recuperas un resultado del device para usarlo en el host?',
    answer: 'Copiándolo a memoria del host con cudaMemcpy(..., cudaMemcpyDeviceToHost).',
  },
  {
    id: CUDA_MEMCPY_CARD_IDS[5],
    question: 'Un programa copia N floats pero pasa N como conteo de bytes. ¿Cuál es el error probable?',
    answer: 'Confundió número de elementos con bytes; el conteo correcto es N * sizeof(float).',
  },
] as const;

const currentStep = ref(0);
const direction = ref<CudaMemcpyDirection>('host-to-device');
const elementCount = ref<CudaMemcpyElementCount>(3);
const predictedIndices = ref<number[]>([]);
const predictionSubmitted = ref(false);
const frame = ref<Frame>('before');
const checkAnswers = ref<Array<number | null>>([null, null, null]);
const seenCards = ref<string[]>([]);
const currentCardIndex = ref(0);
const cardRevealed = ref(false);
const completed = ref(false);
const storageStatus = ref('');

const config = computed(() =>
  normalizeCudaMemcpyConfig({ direction: direction.value, elementCount: elementCount.value }),
);
const snapshot = computed(() => buildCudaMemcpySnapshot(config.value));
const scene = computed(() => (frame.value === 'after' ? snapshot.value.after : snapshot.value.before));
const regions = computed<CudaMemcpyRegion[]>(() => [scene.value.host, scene.value.device]);
const affected = computed(() => new Set(snapshot.value.affectedIndices));

const predictionCorrect = computed(() => {
  const predicted = [...predictedIndices.value].sort((a, b) => a - b);
  const expected = [...snapshot.value.affectedIndices];
  return predicted.length === expected.length && predicted.every((value, i) => value === expected[i]);
});

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

function roleLabel(region: CudaMemcpyRegion): string {
  return region.role === 'source' ? 'ORIGEN · solo lectura' : 'DESTINO · se sobrescribe';
}

function locationLabel(region: CudaMemcpyRegion): string {
  return region.location === 'host' ? 'Host (CPU)' : 'Device (GPU)';
}

function isDestinationRegion(region: CudaMemcpyRegion): boolean {
  return region.role === 'destination';
}

function isCopied(region: CudaMemcpyRegion, index: number): boolean {
  return frame.value === 'after' && isDestinationRegion(region) && affected.value.has(index);
}

function persist(): void {
  const state = createDefaultMemcpyState();
  state.completedClasses = completed.value ? [CUDA_MEMCPY_CLASS_ID] : [];
  state.classProgress['cuda-memcpy'] = {
    step: currentStep.value,
    direction: direction.value,
    elementCount: elementCount.value,
    predictedIndices: [...predictedIndices.value],
    checkAnswers: [...checkAnswers.value],
  };
  state.anki['cuda-memcpy'].seen = [...seenCards.value];
  if (!saveMemcpyState(state)) {
    storageStatus.value = 'El progreso continúa en esta página, pero el navegador no permitió guardarlo.';
  }
}

onMounted(() => {
  const state = loadMemcpyState();
  const progress = state.classProgress['cuda-memcpy'];
  currentStep.value = progress.step;
  direction.value = progress.direction;
  elementCount.value = progress.elementCount;
  predictedIndices.value = [...progress.predictedIndices];
  predictionSubmitted.value = progress.predictedIndices.length > 0;
  checkAnswers.value = [...progress.checkAnswers];
  seenCards.value = [...state.anki['cuda-memcpy'].seen];
  completed.value = state.completedClasses.includes(CUDA_MEMCPY_CLASS_ID);
  if (currentStep.value >= 3) frame.value = 'after';
});

function chooseDirection(value: CudaMemcpyDirection): void {
  direction.value = value;
  frame.value = currentStep.value >= 3 ? 'after' : 'before';
  predictedIndices.value = [];
  predictionSubmitted.value = false;
  persist();
}

function chooseElementCount(count: CudaMemcpyElementCount): void {
  elementCount.value = count;
  frame.value = currentStep.value >= 3 ? 'after' : 'before';
  predictedIndices.value = [];
  predictionSubmitted.value = false;
  persist();
}

function goToStep(step: number): void {
  currentStep.value = Math.max(0, Math.min(6, step));
  if (currentStep.value <= 1) frame.value = 'before';
  if (currentStep.value >= 3) frame.value = 'after';
  persist();
}

function togglePredicted(index: number): void {
  const next = new Set(predictedIndices.value);
  if (next.has(index)) next.delete(index);
  else next.add(index);
  predictedIndices.value = [...next].sort((a, b) => a - b);
  persist();
}

function submitPrediction(): void {
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
  resetMemcpyState();
  const state = createDefaultMemcpyState();
  const progress = state.classProgress['cuda-memcpy'];
  currentStep.value = progress.step;
  direction.value = progress.direction;
  elementCount.value = progress.elementCount;
  predictedIndices.value = [];
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
  <section class="memcpy-class" aria-labelledby="memcpy-title">
    <header class="class-header">
      <p class="eyebrow">Primitiva B · una primitiva</p>
      <h2 id="memcpy-title"><code>cudaMemcpy</code>: copiar no es mover</h2>
      <p>
        Al terminar podrás predecir exactamente qué celdas cambian tras una copia, dado un origen, un destino,
        un conteo de bytes y una dirección.
      </p>
      <p class="model-note">
        <strong>Modelo explicativo:</strong> no ejecuta CUDA ni emula hardware. Compara el estado
        <em>antes</em> con el estado <em>después</em> de una copia; no lanza kernels, no reserva memoria y no
        modela tiempos ni concurrencia.
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

    <div class="controls">
      <div class="control-group" role="group" aria-label="Dirección de la copia">
        <span>Dirección:</span>
        <button
          v-for="option in DIRECTIONS"
          :key="option.id"
          type="button"
          :aria-pressed="direction === option.id"
          :class="{ selected: direction === option.id }"
          @click="chooseDirection(option.id)"
        >
          {{ option.label }}
        </button>
      </div>
      <div class="control-group" role="group" aria-label="Elementos completos a copiar">
        <span>Elementos:</span>
        <button
          v-for="count in CUDA_MEMCPY_ELEMENT_COUNTS"
          :key="count"
          type="button"
          :aria-pressed="elementCount === count"
          :class="{ selected: elementCount === count }"
          @click="chooseElementCount(count)"
        >
          {{ count }}
        </button>
        <span class="byte-count" data-test="byte-expression">{{ snapshot.byteExpression }}</span>
      </div>
    </div>

    <section class="scene" aria-labelledby="scene-title">
      <div class="scene-heading">
        <h3 id="scene-title">
          Estado
          {{ frame === 'before' ? 'ANTES' : frame === 'action' ? 'durante la ACCIÓN' : 'DESPUÉS' }}
        </h3>
        <code data-test="call-code">{{ snapshot.action.code }}</code>
      </div>

      <div class="memory-layout" aria-live="polite">
        <article
          v-for="region in regions"
          :key="region.id"
          class="memory-panel"
          :class="[
            region.location === 'host' ? 'memory-panel--host' : 'memory-panel--device',
            { 'memory-panel--source': region.role === 'source' && frame === 'action' },
          ]"
          :data-test="`region-${region.location}`"
        >
          <h4>
            <span class="loc-badge" aria-hidden="true">{{ region.location === 'host' ? 'CPU' : 'GPU' }}</span>
            {{ locationLabel(region) }}
            <span class="role-badge" :data-test="`role-${region.location}`">{{ roleLabel(region) }}</span>
          </h4>
          <p class="cell-label">
            <code>{{ region.id }}</code
            >: índice arriba · contenido abajo
          </p>
          <ol class="cells" :aria-label="`Celdas de ${region.id} ordenadas por índice`">
            <li v-for="cell in region.cells" :key="cell.index" class="cell-slot">
              <template v-if="currentStep === 1 && isDestinationRegion(region) && !predictionSubmitted">
                <button
                  type="button"
                  class="cell cell--button"
                  :class="{
                    'cell--undefined': cell.state === 'undefined',
                    'cell--known': cell.state === 'known',
                    'cell--predicted': predictedIndices.includes(cell.index),
                  }"
                  :aria-pressed="predictedIndices.includes(cell.index)"
                  :data-test="`predict-cell-${cell.index}`"
                  @click="togglePredicted(cell.index)"
                >
                  <span class="sr-only">
                    Celda [{{ cell.index }}] del destino,
                    {{
                      cell.state === 'undefined'
                        ? 'contenido no inicializado, valor no determinado por el modelo'
                        : `valor ${cell.value}`
                    }},
                    {{ predictedIndices.includes(cell.index) ? 'marcada como que cambia' : 'sin marcar' }}
                  </span>
                  <span class="cell-index" aria-hidden="true">[{{ cell.index }}]</span>
                  <strong class="cell-content" aria-hidden="true">{{ cell.symbol }}</strong>
                </button>
              </template>
              <template v-else>
                <div
                  class="cell"
                  :class="{
                    'cell--undefined': cell.state === 'undefined',
                    'cell--known': cell.state === 'known',
                    'cell--copied': isCopied(region, cell.index),
                  }"
                  :data-test="`cell-${region.location}-${cell.index}`"
                >
                  <span class="sr-only">
                    Celda [{{ cell.index }}] de {{ region.id }},
                    {{
                      cell.state === 'undefined'
                        ? 'contenido no inicializado, valor no determinado por el modelo'
                        : `valor ${cell.value}`
                    }}<template v-if="isCopied(region, cell.index)">, recién copiada del origen</template>
                  </span>
                  <span class="cell-index" aria-hidden="true">[{{ cell.index }}]</span>
                  <strong class="cell-content" aria-hidden="true">{{ cell.symbol }}</strong>
                  <span v-if="isCopied(region, cell.index)" class="copied-tag" aria-hidden="true"
                    >copiada</span
                  >
                </div>
              </template>
            </li>
          </ol>
          <p
            v-if="isDestinationRegion(region) && frame === 'after'"
            class="range-note"
            :data-test="`tail-note-${region.location}`"
          >
            <template v-if="snapshot.unaffectedIndices.length > 0">
              Celdas [{{ snapshot.unaffectedIndices.join(', ') }}]: fuera de la copia, sin cambios.
            </template>
            <template v-else>Se copiaron las 5 celdas: no queda cola sin tocar.</template>
          </p>
        </article>
      </div>

      <p class="copy-indicator" :class="{ pulsing: frame === 'action' }" data-test="copy-indicator">
        <span aria-hidden="true">{{ direction === 'host-to-device' ? '⬇' : '⬆' }}</span>
        Copia de {{ snapshot.byteCount }} bytes: <code>{{ snapshot.sourceId }}</code> →
        <code>{{ snapshot.destinationId }}</code> ({{
          direction === 'host-to-device' ? 'host a device' : 'device a host'
        }})
      </p>
    </section>

    <section class="stage" :aria-labelledby="`stage-${currentStep}`">
      <p class="stage-label">{{ STEPS[currentStep]?.label }}</p>

      <template v-if="currentStep === 0">
        <h3 id="stage-0">Mira el estado mínimo</h3>
        <p>
          <code>cudaMalloc</code> ya dio espacio en el device, pero sus celdas siguen sin un valor determinado
          (<code>?</code>). El origen tiene datos; el destino todavía no. Una llamada a
          <code>cudaMalloc</code> <strong>no</strong> pone tus datos del host en el device: eso es trabajo de
          <code>cudaMemcpy</code>.
        </p>
        <button type="button" class="primary-action" @click="goToStep(1)">Hacer una predicción</button>
      </template>

      <template v-else-if="currentStep === 1">
        <h3 id="stage-1">¿Qué celdas del destino cambiarán?</h3>
        <p>Marca en la escena las celdas del <strong>destino</strong> que crees que cambian tras la copia.</p>
        <p class="feedback" role="status" data-test="prediction-count">
          Celdas marcadas: {{ predictedIndices.length }}
        </p>
        <button
          type="button"
          class="primary-action"
          :disabled="predictedIndices.length === 0"
          @click="submitPrediction"
        >
          Comprobar mi predicción
        </button>
        <p v-if="predictionSubmitted" class="feedback" role="status" data-test="prediction-feedback">
          <strong>{{ predictionCorrect ? '¡Correcto!' : 'Todavía no.' }}</strong>
          La copia de {{ snapshot.elementCount }} elementos afecta a las celdas [{{
            snapshot.affectedIndices.join(', ')
          }}] del destino.
        </p>
        <button v-if="predictionSubmitted" type="button" class="primary-action" @click="beginExecution">
          Ejecutar: ver la acción
        </button>
      </template>

      <template v-else-if="currentStep === 2">
        <h3 id="stage-2">Ejecuta cuadro por cuadro</h3>
        <p>
          La transición está detenida en cada estado. El origen nunca desaparece: se resalta y su copia
          aparece en el destino.
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
          <code>{{ snapshot.byteExpression }}</code
          >. Se leen esos bytes del origen y se sobrescribe el mismo rango del destino.
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
        <p class="reverse-hint">
          Cambia la <strong>dirección</strong> arriba para ver el camino inverso: recuperar un resultado del
          device al host con <code>cudaMemcpyDeviceToHost</code>.
        </p>
        <button type="button" class="primary-action" @click="goToStep(4)">Ver las peculiaridades</button>
      </template>

      <template v-else-if="currentStep === 4">
        <h3 id="stage-4">Tres peculiaridades que sí importan ahora</h3>
        <ol class="quirks">
          <li>
            <strong>El conteo son bytes, no elementos.</strong> Para cinco <code>int32_t</code>,
            <code>cudaMemcpy(d, h, 5, cudaMemcpyHostToDevice)</code> pide <strong>5 bytes</strong>, no cinco
            enteros. Cinco enteros son <code>5 * sizeof(int32_t) = 20 bytes</code>.
          </li>
          <li>
            <strong>Copiar no es mover.</strong> Tras la copia, origen y destino contienen ambos los mismos
            valores. El origen no se vacía.
          </li>
          <li>
            <strong>El orden importa.</strong> La firma es
            <code>cudaMemcpy(destino, origen, bytes, dirección)</code>: el destino va primero.
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

        <div class="apply-block">
          <h4>Aplícalo: el flujo mínimo de la Clase 02</h4>
          <p>
            Enviar la entrada y recuperar el resultado son dos <code>cudaMemcpy</code> en direcciones
            opuestas:
          </p>
          <pre data-test="apply-skeleton"><code>// A — enviar N valores de entrada al device
cudaMemcpy(d_input, h_input, N * sizeof(float), cudaMemcpyHostToDevice);

// el kernel de reducción ocurre aquí

// B — recuperar un resultado al host
cudaMemcpy(&h_result, d_result, sizeof(float), cudaMemcpyDeviceToHost);</code></pre>
        </div>

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
          Para completar: responde bien las tres comprobaciones y revela las seis tarjetas.
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
.memcpy-class {
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

.controls {
  display: grid;
  gap: var(--sgpu-gap-sm);
  padding: 0 clamp(1rem, 4vw, 1.5rem) 1rem;
}

.control-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sgpu-gap-sm);
  font-size: var(--sgpu-font-size-sm);
}

.control-group button {
  min-width: 44px;
  padding-inline: 0.6rem;
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

/* Deliberately a single column: host stays on top, device on the bottom, and
   the copy indicator sits between them. The geometry never rearranges when the
   direction or the element count changes. */
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

.memory-panel--source {
  border-style: double;
  box-shadow: 0 0 0 2px var(--sgpu-selected-ring);
}

.memory-panel h4 {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sgpu-gap-sm);
  margin: 0 0 var(--sgpu-gap-md);
  line-height: 1.2;
}

.loc-badge {
  display: inline-block;
  border: 1px solid currentColor;
  border-radius: 999px;
  padding: 0.1rem 0.45rem;
  font-size: var(--sgpu-font-size-xs);
}

.role-badge {
  border: 1px dashed currentColor;
  border-radius: var(--sgpu-radius-sm);
  padding: 0.1rem 0.4rem;
  font-size: var(--sgpu-font-size-xs);
  font-weight: 700;
  letter-spacing: 0.04em;
}

.cell-label {
  margin: var(--sgpu-gap-md) 0 var(--sgpu-gap-sm);
  font-size: var(--sgpu-font-size-sm);
}

.cells {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: var(--sgpu-gap-sm);
  list-style: none;
  margin: 0;
  padding: 0;
}

.cells > li {
  margin: 0;
  min-width: 0;
}

.cell {
  display: grid;
  position: relative;
  width: 100%;
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

.cell--button {
  cursor: pointer;
  color: inherit;
  font-weight: 400;
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

.cell--known {
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

.cell--predicted {
  outline: 3px solid var(--sgpu-selected-border);
  outline-offset: -3px;
}

.cell--copied {
  border-color: var(--sgpu-changing-border);
  border-style: double;
  background: var(--sgpu-changing-bg);
  color: var(--sgpu-changing-text);
}

.copied-tag {
  padding: 0 0.2rem 0.2rem;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.range-note {
  margin: var(--sgpu-gap-md) 0 0;
  font-size: var(--sgpu-font-size-sm);
}

.copy-indicator {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sgpu-gap-sm);
  margin: var(--sgpu-gap-md) 0 0;
  padding: var(--sgpu-gap-sm) var(--sgpu-gap-md);
  border: 1px dashed var(--sgpu-border);
  border-radius: var(--sgpu-radius-sm);
  font-size: var(--sgpu-font-size-sm);
}

.copy-indicator span[aria-hidden='true'] {
  font-size: 1.25rem;
}

.copy-indicator.pulsing {
  border-style: double;
  border-color: var(--sgpu-changing-border);
  background: var(--sgpu-changing-bg);
  color: var(--sgpu-changing-text);
  animation: copy-pulse 1s ease-in-out infinite;
}

@keyframes copy-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.stage {
  min-height: 18rem;
}

.stage > :last-child {
  margin-bottom: 0;
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

.secondary-action,
.reset-action {
  margin-left: var(--sgpu-gap-sm);
}

.feedback,
.action-fact,
.score,
.completion-hint,
.reverse-hint {
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

.apply-block {
  margin-top: var(--sgpu-gap-md);
  padding: var(--sgpu-gap-md);
  border: 1px solid var(--sgpu-border);
  border-radius: var(--sgpu-radius-sm);
  background: var(--sgpu-surface-muted);
}

.apply-block h4 {
  margin-top: 0;
}

.apply-block pre {
  overflow-x: auto;
  margin: 0;
  padding: var(--sgpu-gap-md);
  border-radius: var(--sgpu-radius-sm);
  background: var(--sgpu-surface);
  font-family: var(--sgpu-font-mono);
  font-size: var(--sgpu-font-size-sm);
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

  .copy-indicator.pulsing {
    animation: none;
  }
}
</style>
