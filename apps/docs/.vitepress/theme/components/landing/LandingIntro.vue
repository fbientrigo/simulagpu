<script setup lang="ts">
import GpuChip from './GpuChip.vue';

defineProps<{ entering?: boolean }>();
const emit = defineEmits<{ enter: [] }>();
</script>

<template>
  <section class="intro" :class="{ 'intro--entering': entering }" data-test="landing-intro">
    <div class="intro__copy">
      <p class="intro__eyebrow" data-test="intro-eyebrow">
        <span class="intro__dot" aria-hidden="true" />
        CUDA interactivo
      </p>
      <h1 class="intro__headline">
        Entiende CUDA<br />
        desde dentro de la GPU.
      </h1>
      <p class="intro__sub">
        Ve hilos, memoria y sincronización como operaciones que puedes inspeccionar, no como una caja negra.
      </p>
      <button
        type="button"
        class="intro__cta"
        data-test="enter-gpu-cta"
        :disabled="entering"
        @click="emit('enter')"
      >
        Entrar a la GPU
        <span class="intro__cta-arrow" aria-hidden="true">→</span>
      </button>
    </div>
    <div class="intro__visual" aria-hidden="true">
      <GpuChip />
    </div>
  </section>
</template>

<style scoped>
.intro {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--sgpu-gap-lg, 20px);
  align-items: center;
  justify-items: center;
  text-align: center;
  min-height: min(72vh, 640px);
  padding-block: clamp(2rem, 6vw, 4rem);
  overflow: hidden;
}

.intro__copy {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  max-width: 40rem;
  /* `backwards`, not `both`: once the entrance keyframe ends, the animation
     must stop pinning opacity/transform so the entering-state transition
     below (same properties) can take over instead of being shadowed by it. */
  animation: landing-rise 360ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
}

.intro__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  margin: 0;
  padding: 0.3em 0.9em;
  border-radius: 999px;
  border: 1px solid var(--sgpu-landing-pill-border);
  background: var(--sgpu-landing-pill-bg);
  color: var(--sgpu-landing-pill-text);
  font-size: var(--sgpu-font-size-xs, 0.7rem);
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.intro__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--sgpu-landing-accent);
}

.intro__headline {
  margin: 0;
  font-size: clamp(1.9rem, 5vw, 3.2rem);
  line-height: 1.12;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--sgpu-text);
}

.intro__sub {
  margin: 0;
  max-width: 34rem;
  color: var(--sgpu-text-muted);
  font-size: clamp(0.95rem, 2vw, 1.1rem);
  line-height: 1.5;
}

.intro__cta {
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  margin-top: 0.5rem;
  padding: 0.85em 1.6em;
  min-height: 44px;
  border: none;
  border-radius: 999px;
  background: var(--sgpu-landing-accent);
  color: var(--sgpu-landing-accent-contrast);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    transform 200ms ease,
    box-shadow 200ms ease;
  box-shadow: 0 8px 24px -8px var(--sgpu-landing-accent-shadow);
}

.intro__cta:hover,
.intro__cta:focus-visible {
  transform: translateY(-1px);
  box-shadow: 0 12px 28px -8px var(--sgpu-landing-accent-shadow);
}

.intro__cta:active {
  transform: scale(0.97);
}

.intro__cta-arrow {
  transition: transform 200ms ease;
}

.intro__cta:hover .intro__cta-arrow,
.intro__cta:focus-visible .intro__cta-arrow {
  transform: translateX(3px);
}

.intro__visual {
  width: min(60vw, 220px);
  aspect-ratio: 1;
  animation: landing-rise 420ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
  animation-delay: 80ms;
  transition: transform 550ms cubic-bezier(0.3, 0, 0.2, 1);
  transform: scale(1);
  will-change: transform;
}

.intro--entering .intro__copy {
  transition:
    opacity 260ms ease,
    transform 260ms ease;
  opacity: 0;
  transform: translateY(-10px);
}

.intro--entering .intro__visual {
  transform: scale(2.6);
}

@keyframes landing-rise {
  from {
    opacity: 0;
    transform: translateY(14px);
    filter: blur(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
  }
}

@media (min-width: 768px) {
  .intro {
    grid-template-columns: minmax(0, 1fr) minmax(0, 320px);
    text-align: left;
    justify-items: stretch;
  }

  .intro__copy {
    align-items: flex-start;
  }

  .intro__visual {
    width: 100%;
    max-width: 320px;
    justify-self: end;
  }
}

@media (prefers-reduced-motion: reduce) {
  .intro__copy,
  .intro__visual {
    animation: none;
  }

  .intro__cta,
  .intro__cta-arrow {
    transition: none;
  }

  .intro__cta:active {
    transform: none;
  }
}
</style>
