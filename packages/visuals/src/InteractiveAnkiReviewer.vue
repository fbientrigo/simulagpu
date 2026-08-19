<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import '@simulagpu/theme/tokens.css';

interface WebCard {
  id: string;
  tipo: string;
  frontHtml: string;
  backHtml: string;
  tags: string[];
}

interface WebDeck {
  version: 1;
  deck: string;
  cards: WebCard[];
}

type Rating = 'missed' | 'known';
type LoadState = 'loading' | 'ready' | 'error';

const props = defineProps<{
  source: string;
}>();

const SWIPE_THRESHOLD = 104;
const cards = ref<WebCard[]>([]);
const loadState = ref<LoadState>('loading');
const loadError = ref('');
const currentIndex = ref(0);
const revealed = ref(false);
const missed = ref(0);
const known = ref(0);
const dragX = ref(0);
const dragY = ref(0);
const tiltX = ref(0);
const tiltY = ref(0);
const rotationZ = ref(0);
const isDragging = ref(false);
const isLeaving = ref(false);
const prefersReducedMotion = ref(false);

let activePointerId: number | null = null;
let startX = 0;
let startY = 0;
let movedDuringPointer = false;
let suppressNextClick = false;

const currentCard = computed(() => cards.value[currentIndex.value] ?? null);
const complete = computed(() => loadState.value === 'ready' && currentIndex.value >= cards.value.length);
const progressText = computed(() => {
  if (cards.value.length === 0) return '0 / 0';
  if (complete.value) return `${cards.value.length} / ${cards.value.length}`;
  return `${currentIndex.value + 1} / ${cards.value.length}`;
});

const shellStyle = computed(() => ({
  transform: [
    `translate3d(${dragX.value}px, ${dragY.value}px, 0)`,
    `rotateX(${tiltX.value}deg)`,
    `rotateY(${tiltY.value}deg)`,
    `rotateZ(${rotationZ.value}deg)`,
  ].join(' '),
}));

const leftHintStyle = computed(() => ({
  opacity: String(Math.min(1, Math.max(0, -dragX.value / SWIPE_THRESHOLD))),
}));

const rightHintStyle = computed(() => ({
  opacity: String(Math.min(1, Math.max(0, dragX.value / SWIPE_THRESHOLD))),
}));

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isWebDeck(value: unknown): value is WebDeck {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    typeof value.deck !== 'string' ||
    !Array.isArray(value.cards)
  ) {
    return false;
  }

  return value.cards.every(
    (card) =>
      isRecord(card) &&
      typeof card.id === 'string' &&
      typeof card.tipo === 'string' &&
      typeof card.frontHtml === 'string' &&
      typeof card.backHtml === 'string' &&
      Array.isArray(card.tags) &&
      card.tags.every((tag) => typeof tag === 'string'),
  );
}

onMounted(async () => {
  prefersReducedMotion.value = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  try {
    const response = await fetch(props.source);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload: unknown = await response.json();
    if (!isWebDeck(payload)) throw new Error('formato inesperado');

    cards.value = payload.cards;
    loadState.value = 'ready';
  } catch (error) {
    loadState.value = 'error';
    loadError.value = error instanceof Error ? error.message : 'error desconocido';
  }
});

function reveal(): void {
  if (!currentCard.value || isLeaving.value) return;
  revealed.value = true;
}

function resetMotion(): void {
  dragX.value = 0;
  dragY.value = 0;
  tiltX.value = 0;
  tiltY.value = 0;
  rotationZ.value = 0;
}

function advance(rating: Rating): void {
  if (rating === 'known') known.value += 1;
  else missed.value += 1;

  currentIndex.value += 1;
  revealed.value = false;
  isLeaving.value = false;
  resetMotion();
}

function animateRating(rating: Rating): void {
  if (!revealed.value || isLeaving.value) return;

  const direction = rating === 'known' ? 1 : -1;
  isLeaving.value = true;
  dragX.value = direction * 440;
  dragY.value = -12;
  rotationZ.value = direction * 10;

  const delay = prefersReducedMotion.value ? 0 : 180;
  window.setTimeout(() => advance(rating), delay);
}

function restart(): void {
  currentIndex.value = 0;
  revealed.value = false;
  missed.value = 0;
  known.value = 0;
  isLeaving.value = false;
  resetMotion();
}

function onPointerDown(event: PointerEvent): void {
  if (event.button !== 0 || isLeaving.value) return;
  activePointerId = event.pointerId;
  startX = event.clientX;
  startY = event.clientY;
  movedDuringPointer = false;
  suppressNextClick = false;
  isDragging.value = true;
  (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
}

function onPointerMove(event: PointerEvent): void {
  const element = event.currentTarget as HTMLElement;

  if (activePointerId === event.pointerId) {
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    dragX.value = dx;
    dragY.value = Math.max(-72, Math.min(72, dy));
    tiltY.value = Math.max(-9, Math.min(9, dx / 24));
    tiltX.value = Math.max(-6, Math.min(6, -dy / 32));
    rotationZ.value = Math.max(-9, Math.min(9, dx / 28));
    movedDuringPointer ||= Math.hypot(dx, dy) > 7;
    return;
  }

  if (event.pointerType !== 'mouse') return;
  const rect = element.getBoundingClientRect();
  const nx = (event.clientX - rect.left) / Math.max(rect.width, 1) - 0.5;
  const ny = (event.clientY - rect.top) / Math.max(rect.height, 1) - 0.5;
  tiltY.value = nx * 7;
  tiltX.value = -ny * 5;
}

function finishPointer(event: PointerEvent): void {
  if (activePointerId !== event.pointerId) return;

  (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
  activePointerId = null;
  isDragging.value = false;
  suppressNextClick = movedDuringPointer;

  if (revealed.value && Math.abs(dragX.value) >= SWIPE_THRESHOLD) {
    animateRating(dragX.value > 0 ? 'known' : 'missed');
    return;
  }

  resetMotion();
}

function onPointerLeave(): void {
  if (activePointerId === null && !isLeaving.value) resetMotion();
}

function onCardClick(): void {
  if (suppressNextClick) {
    suppressNextClick = false;
    return;
  }
  reveal();
}
</script>

<template>
  <section class="anki-reviewer" aria-labelledby="anki-reviewer-title">
    <header class="reviewer-head">
      <div>
        <p class="eyebrow">RETAIN · repaso web</p>
        <h2 id="anki-reviewer-title">Tarjetas interactivas</h2>
      </div>
      <div class="review-progress" aria-live="polite">
        <strong>{{ progressText }}</strong>
        <span v-if="cards.length">{{ known }} recordadas · {{ missed }} repasar</span>
      </div>
    </header>

    <p class="review-instruction">
      Intenta responder antes de revelar. En escritorio puedes mover la tarjeta; en móvil, revela y desliza a
      la derecha si la supiste o a la izquierda si quieres repasarla.
    </p>

    <div v-if="loadState === 'loading'" class="review-state" role="status">Cargando tarjetas…</div>
    <div v-else-if="loadState === 'error'" class="review-state review-error" role="alert">
      No se pudo cargar el mazo: {{ loadError }}.
    </div>

    <div v-else-if="complete" class="review-complete" data-test="review-complete">
      <p class="eyebrow">Sesión terminada</p>
      <h3>{{ known }} de {{ cards.length }} recordadas</h3>
      <p>{{ missed }} quedaron marcadas para repasar en esta sesión.</p>
      <button type="button" class="review-button primary" @click="restart">Repetir mazo</button>
    </div>

    <div v-else-if="currentCard" class="review-stage">
      <div class="swipe-hint swipe-left" :style="leftHintStyle" aria-hidden="true">REPASAR</div>
      <div class="swipe-hint swipe-right" :style="rightHintStyle" aria-hidden="true">LA SUPE</div>

      <div
        class="card-shell"
        :class="{ dragging: isDragging, leaving: isLeaving }"
        :style="shellStyle"
        role="button"
        tabindex="0"
        :aria-pressed="revealed"
        :aria-label="
          revealed
            ? undefined
            : `Tarjeta ${currentCard.id}. Pulsa Enter, espacio o haz clic para revelar la respuesta.`
        "
        data-test="interactive-card"
        @click="onCardClick"
        @keydown.enter.prevent="reveal"
        @keydown.space.prevent="reveal"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="finishPointer"
        @pointercancel="finishPointer"
        @pointerleave="onPointerLeave"
      >
        <div class="card-flip" :class="{ revealed }">
          <article class="card-face card-front" :aria-hidden="revealed">
            <div class="card-meta">
              <span>{{ currentCard.tipo }}</span>
              <code>{{ currentCard.id }}</code>
            </div>
            <div class="card-copy" v-html="currentCard.frontHtml"></div>
            <p class="card-action">Toca para revelar</p>
          </article>

          <article class="card-face card-back" :aria-hidden="!revealed">
            <div class="card-meta">
              <span>respuesta</span>
              <code>{{ currentCard.id }}</code>
            </div>
            <div class="card-copy" v-html="currentCard.backHtml"></div>
            <p class="card-action">Ahora califica tu recuerdo</p>
          </article>
        </div>
      </div>

      <div v-if="revealed" class="rating-actions" data-test="rating-actions">
        <button
          type="button"
          class="review-button"
          data-test="missed-button"
          :disabled="isLeaving"
          @click="animateRating('missed')"
        >
          ← No la supe
        </button>
        <button
          type="button"
          class="review-button primary"
          data-test="known-button"
          :disabled="isLeaving"
          @click="animateRating('known')"
        >
          La supe →
        </button>
      </div>
      <p v-else class="keyboard-hint">Enter / espacio también revelan.</p>
    </div>
  </section>
</template>

<style scoped>
.anki-reviewer {
  --card-radius: 24px;
  margin: 1.5rem 0 2rem;
  padding: clamp(1rem, 3vw, 1.5rem);
  border: 1px solid var(--sgpu-border);
  border-radius: 20px;
  background: color-mix(in srgb, var(--sgpu-surface-muted) 82%, transparent);
  color: var(--sgpu-text);
  overflow: hidden;
}

.reviewer-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.reviewer-head h2,
.review-complete h3 {
  margin: 0;
  line-height: 1.15;
}

.eyebrow {
  margin: 0 0 0.35rem;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--sgpu-selected-border);
}

.review-progress {
  display: grid;
  justify-items: end;
  gap: 0.15rem;
  min-width: max-content;
}

.review-progress strong {
  font-size: 1.1rem;
}

.review-progress span,
.review-instruction,
.keyboard-hint,
.card-action,
.review-complete p {
  color: var(--sgpu-text-muted);
}

.review-progress span {
  font-size: 0.78rem;
}

.review-instruction {
  max-width: 68ch;
  margin: 0.85rem 0 1.2rem;
  font-size: 0.92rem;
}

.review-state,
.review-complete {
  min-height: 260px;
  display: grid;
  place-content: center;
  justify-items: center;
  text-align: center;
}

.review-error {
  color: var(--sgpu-invalid-border);
}

.review-stage {
  position: relative;
  min-height: 470px;
  display: grid;
  align-content: start;
  justify-items: center;
  perspective: 1100px;
  isolation: isolate;
}

.card-shell {
  position: relative;
  z-index: 2;
  width: min(100%, 420px);
  aspect-ratio: 5 / 7;
  max-height: 560px;
  cursor: grab;
  outline: none;
  transform-style: preserve-3d;
  transition:
    transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1),
    opacity 160ms ease;
  touch-action: pan-y;
  will-change: transform;
}

.card-shell:hover,
.card-shell:focus-visible {
  z-index: 3;
}

.card-shell:focus-visible {
  border-radius: var(--card-radius);
  box-shadow: 0 0 0 3px var(--sgpu-selected-border);
}

.card-shell.dragging {
  cursor: grabbing;
  transition: none;
}

.card-shell.leaving {
  opacity: 0;
}

.card-flip {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transition: transform 320ms cubic-bezier(0.2, 0.75, 0.25, 1);
}

.card-flip.revealed {
  transform: rotateY(180deg);
}

.card-face {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 1.25rem;
  padding: clamp(1.25rem, 5vw, 2rem);
  border: 1px solid color-mix(in srgb, var(--sgpu-selected-border) 34%, var(--sgpu-border));
  border-radius: var(--card-radius);
  background:
    radial-gradient(
      circle at 22% 12%,
      color-mix(in srgb, var(--sgpu-selected-border) 14%, transparent),
      transparent 34%
    ),
    var(--sgpu-surface);
  box-shadow:
    0 24px 60px color-mix(in srgb, #000000 24%, transparent),
    inset 0 1px 0 color-mix(in srgb, #ffffff 9%, transparent);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.card-back {
  transform: rotateY(180deg);
  background:
    radial-gradient(
      circle at 78% 12%,
      color-mix(in srgb, var(--sgpu-device-border) 18%, transparent),
      transparent 36%
    ),
    var(--sgpu-surface);
}

.card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--sgpu-text-muted);
}

.card-meta code {
  font-size: 0.72rem;
  text-transform: none;
}

.card-copy {
  margin: auto 0;
  font-size: clamp(1.15rem, 4vw, 1.55rem);
  line-height: 1.55;
  text-align: center;
}

.card-copy :deep(code) {
  white-space: normal;
  overflow-wrap: anywhere;
}

.card-action {
  margin: 0;
  text-align: center;
  font-size: 0.78rem;
}

.rating-actions {
  position: relative;
  z-index: 4;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  width: min(100%, 420px);
  margin-top: 1.25rem;
}

.review-button {
  min-height: 46px;
  border: 1px solid var(--sgpu-border);
  border-radius: 12px;
  padding: 0.7rem 1rem;
  background: var(--sgpu-surface-muted);
  color: var(--sgpu-text);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.review-button:hover:not(:disabled),
.review-button:focus-visible {
  border-color: var(--sgpu-selected-border);
}

.review-button:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--sgpu-selected-border) 35%, transparent);
  outline-offset: 2px;
}

.review-button.primary {
  border-color: var(--sgpu-selected-border);
  background: var(--sgpu-selected-border);
  color: #ffffff;
}

.review-button:disabled {
  cursor: default;
  opacity: 0.55;
}

.swipe-hint {
  position: absolute;
  top: 42%;
  z-index: 1;
  padding: 0.45rem 0.7rem;
  border: 2px solid currentColor;
  border-radius: 10px;
  font-size: 0.78rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  pointer-events: none;
  transition: opacity 80ms linear;
}

.swipe-left {
  left: max(0.5rem, calc(50% - 255px));
  color: var(--sgpu-invalid-border);
  transform: rotate(-8deg);
}

.swipe-right {
  right: max(0.5rem, calc(50% - 255px));
  color: var(--sgpu-selected-border);
  transform: rotate(8deg);
}

.keyboard-hint {
  margin: 0.85rem 0 0;
  font-size: 0.78rem;
}

@media (max-width: 560px) {
  .anki-reviewer {
    margin-inline: -0.25rem;
    padding-inline: 0.8rem;
  }

  .reviewer-head {
    align-items: end;
  }

  .reviewer-head h2 {
    font-size: 1.25rem;
  }

  .review-progress span {
    display: none;
  }

  .review-stage {
    min-height: 430px;
  }

  .card-shell {
    width: min(88vw, 350px);
  }

  .rating-actions {
    width: min(88vw, 350px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .card-shell,
  .card-flip,
  .swipe-hint {
    transition-duration: 0.001ms !important;
  }
}
</style>
