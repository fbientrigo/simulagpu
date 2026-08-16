<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import LandingIntro from './LandingIntro.vue';
import GpuClassMap from './GpuClassMap.vue';
import { landingClasses } from './classes';

/**
 * Prefixes a root-relative path with the site's base path.
 *
 * VitePress's own `withBase()` reads `base` from a virtual module injected
 * by its Vite plugin, which only exists in the real app build/dev graph —
 * not under Vitest. `import.meta.env.BASE_URL` is a plain Vite built-in that
 * VitePress's `base` config feeds directly into, so it carries the same
 * value without the extra dependency, and works unmocked in tests too.
 */
function withSiteBase(path: string): string {
  const base = import.meta.env.BASE_URL ?? '/';
  return `${base}${path}`.replace(/\/{2,}/g, '/');
}

/**
 * `entering` plays the zoom-into-the-die motion (GPU scales up, copy fades
 * away) before the class map takes over; `idle`/`inside` are the two stable
 * states the rest of the app cares about.
 */
type LandingState = 'idle' | 'entering' | 'inside';

const ENTER_DURATION_MS = 550;

const state = ref<LandingState>('idle');
const classMapRef = ref<InstanceType<typeof GpuClassMap> | null>(null);

const resolvedClasses = computed(() =>
  landingClasses.map((item) => ({
    ...item,
    href: withSiteBase(item.href),
    secondary: item.secondary ? { ...item.secondary, href: withSiteBase(item.secondary.href) } : undefined,
  })),
);

const backgroundSrc = withSiteBase('/landing/gpu-grid.svg');

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

async function handleEnter() {
  if (prefersReducedMotion()) {
    state.value = 'inside';
  } else {
    state.value = 'entering';
    await new Promise((resolve) => setTimeout(resolve, ENTER_DURATION_MS));
    state.value = 'inside';
  }
  await nextTick();
  classMapRef.value?.focusHeading();
}

function handleBack() {
  state.value = 'idle';
}
</script>

<template>
  <div class="landing" data-test="landing-root">
    <img
      class="landing__bg"
      :class="{ 'landing__bg--receding': state === 'entering' }"
      :src="backgroundSrc"
      alt=""
      aria-hidden="true"
    />
    <Transition name="landing-fade" mode="out-in">
      <LandingIntro
        v-if="state !== 'inside'"
        key="intro"
        :entering="state === 'entering'"
        @enter="handleEnter"
      />
      <GpuClassMap v-else key="map" ref="classMapRef" :items="resolvedClasses" @back="handleBack" />
    </Transition>
  </div>
</template>

<style scoped>
.landing {
  position: relative;
  width: 100%;
  max-width: 72rem;
  margin-inline: auto;
  padding-inline: clamp(1rem, 4vw, 2.5rem);
}

.landing__bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: var(--sgpu-landing-bg-opacity, 0.08);
  pointer-events: none;
  z-index: -1;
  mask-image: radial-gradient(ellipse at center, black 0%, transparent 75%);
  -webkit-mask-image: radial-gradient(ellipse at center, black 0%, transparent 75%);
  transition: opacity 550ms cubic-bezier(0.16, 1, 0.3, 1);
}

.landing__bg--receding {
  opacity: 0;
}

.landing-fade-enter-active,
.landing-fade-leave-active {
  transition:
    opacity 320ms cubic-bezier(0.16, 1, 0.3, 1),
    transform 320ms cubic-bezier(0.16, 1, 0.3, 1);
}

.landing-fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.landing-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (prefers-reduced-motion: reduce) {
  .landing-fade-enter-active,
  .landing-fade-leave-active {
    transition: opacity 1ms linear;
  }

  .landing-fade-enter-from,
  .landing-fade-leave-to {
    transform: none;
  }

  .landing__bg {
    transition: none;
  }
}
</style>
