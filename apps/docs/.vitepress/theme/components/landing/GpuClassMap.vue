<script setup lang="ts">
import { ref } from 'vue';

export interface ClassMapItem {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  secondary?: { label: string; href: string } | undefined;
}

defineProps<{ items: ClassMapItem[] }>();
const emit = defineEmits<{ back: [] }>();

const headingRef = ref<HTMLHeadingElement | null>(null);

function focusHeading() {
  headingRef.value?.focus();
}

defineExpose({ focusHeading });
</script>

<template>
  <section class="class-map" data-test="gpu-class-map">
    <div class="class-map__header">
      <button type="button" class="class-map__back" data-test="back-to-intro" @click="emit('back')">
        <span aria-hidden="true">←</span> GPU
      </button>
      <h2 class="class-map__title" ref="headingRef" tabindex="-1">Elige una clase</h2>
      <p class="class-map__sub">Estas son las clases ya disponibles en SimulaGPU.</p>
    </div>

    <ul class="class-map__grid">
      <li
        v-for="(item, i) in items"
        :key="item.id"
        class="class-map__item"
        :style="{ '--i': i }"
      >
        <a class="class-map__card" :href="item.href" data-test="class-card">
          <span class="class-map__eyebrow">{{ item.eyebrow }}</span>
          <span class="class-map__card-title">{{ item.title }}</span>
          <span class="class-map__desc">{{ item.description }}</span>
          <span
            v-if="item.secondary"
            class="class-map__secondary"
            data-test="class-card-secondary"
          >
            {{ item.secondary.label }} →
          </span>
        </a>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.class-map {
  padding-block: clamp(1.5rem, 5vw, 3rem);
}

.class-map__header {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: clamp(1.25rem, 4vw, 2rem);
}

.class-map__back {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 0.4em;
  margin-bottom: 0.5rem;
  padding: 0.4em 0.9em;
  min-height: 44px;
  border: 1px solid var(--sgpu-border);
  border-radius: 999px;
  background: var(--sgpu-surface);
  color: var(--sgpu-text-muted);
  font-size: var(--sgpu-font-size-sm, 0.82rem);
  cursor: pointer;
  transition: border-color 200ms ease, color 200ms ease;
}

.class-map__back:hover,
.class-map__back:focus-visible {
  border-color: var(--sgpu-landing-accent);
  color: var(--sgpu-text);
}

.class-map__title {
  margin: 0;
  font-size: clamp(1.4rem, 4vw, 2rem);
  font-weight: 700;
  color: var(--sgpu-text);
  outline: none;
}

.class-map__sub {
  margin: 0;
  color: var(--sgpu-text-muted);
  font-size: 0.95rem;
}

.class-map__grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.85rem;
}

.class-map__item {
  animation: landing-rise 320ms cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: calc(var(--i, 0) * 60ms);
}

.class-map__card {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  height: 100%;
  padding: 1rem 1.1rem;
  min-height: 44px;
  border: 1px solid var(--sgpu-border);
  border-radius: var(--sgpu-radius-md, 8px);
  background: var(--sgpu-surface);
  color: inherit;
  text-decoration: none;
  transition:
    border-color 200ms ease,
    transform 200ms ease,
    box-shadow 200ms ease;
}

.class-map__card:hover,
.class-map__card:focus-visible {
  border-color: var(--sgpu-landing-accent);
  transform: translateY(-2px);
  box-shadow: 0 10px 24px -12px var(--sgpu-landing-accent-shadow);
}

.class-map__card:active {
  transform: scale(0.98);
}

.class-map__eyebrow {
  font-size: var(--sgpu-font-size-xs, 0.7rem);
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--sgpu-landing-accent);
}

.class-map__card-title {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--sgpu-text);
}

.class-map__desc {
  font-size: 0.88rem;
  color: var(--sgpu-text-muted);
  line-height: 1.45;
}

.class-map__secondary {
  margin-top: 0.15rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--sgpu-landing-accent);
}

@keyframes landing-rise {
  from {
    opacity: 0;
    transform: translateY(12px);
    filter: blur(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
  }
}

@media (min-width: 640px) {
  .class-map__grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .class-map__grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (prefers-reduced-motion: reduce) {
  .class-map__item {
    animation: none;
  }

  .class-map__card,
  .class-map__back {
    transition: none;
  }

  .class-map__card:hover,
  .class-map__card:focus-visible,
  .class-map__card:active {
    transform: none;
  }
}
</style>
