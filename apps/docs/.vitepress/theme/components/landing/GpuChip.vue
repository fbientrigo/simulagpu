<script setup lang="ts">
/**
 * Static inline SVG GPU visual. No runtime generator, no external asset —
 * just markup, so it themes with CSS custom properties like any other part
 * of the page (light/dark, reduced motion).
 *
 * Structurally grounded in real GPU package organization (an educational
 * metaphor, not a schematic of a specific chip): a substrate/package, a
 * compute die with an SM grid and a shared L2 cache bar, and memory stacks
 * flanking the die the way HBM sits beside a GPU die on package.
 */
</script>

<template>
  <svg
    class="gpu-chip"
    viewBox="0 0 200 200"
    role="img"
    aria-label="Representación esquemática de una GPU: die con núcleos SM, caché y memoria en el mismo empaquetado"
  >
    <g class="gpu-chip__pins">
      <line v-for="n in 8" :key="`t${n}`" :x1="24 + n * 18" y1="4" :x2="24 + n * 18" y2="24" />
      <line v-for="n in 8" :key="`b${n}`" :x1="24 + n * 18" y1="176" :x2="24 + n * 18" y2="196" />
      <line v-for="n in 8" :key="`l${n}`" x1="4" :y1="24 + n * 18" x2="24" :y2="24 + n * 18" />
      <line v-for="n in 8" :key="`r${n}`" x1="176" :y1="24 + n * 18" x2="196" :y2="24 + n * 18" />
    </g>

    <rect class="gpu-chip__package" x="24" y="24" width="152" height="152" rx="10" />

    <g class="gpu-chip__memory">
      <rect x="32" y="70" width="14" height="60" rx="3" />
      <rect x="154" y="70" width="14" height="60" rx="3" />
    </g>

    <rect class="gpu-chip__die" x="54" y="54" width="92" height="92" rx="8" />

    <g class="gpu-chip__sms">
      <rect
        v-for="i in 8"
        :key="i"
        :x="64 + ((i - 1) % 4) * 18"
        :y="64 + Math.floor((i - 1) / 4) * 18"
        width="15"
        height="15"
        rx="3"
      />
    </g>

    <rect class="gpu-chip__cache" x="64" y="103" width="69" height="18" rx="3" />
  </svg>
</template>

<style scoped>
.gpu-chip {
  width: 100%;
  height: 100%;
  overflow: visible;
}

.gpu-chip__pins line {
  stroke: var(--sgpu-landing-chip-pin);
  stroke-width: 3;
  stroke-linecap: round;
}

.gpu-chip__package {
  fill: var(--sgpu-landing-chip-package);
  stroke: var(--sgpu-landing-chip-package-border);
  stroke-width: 1.5;
}

.gpu-chip__memory rect {
  fill: var(--sgpu-landing-chip-memory);
  stroke: var(--sgpu-landing-chip-memory-border);
  stroke-width: 1.25;
}

.gpu-chip__die {
  fill: var(--sgpu-landing-chip-die);
  stroke: var(--sgpu-landing-chip-die-border);
  stroke-width: 1.5;
}

.gpu-chip__sms rect {
  fill: var(--sgpu-landing-chip-core);
}

.gpu-chip__cache {
  fill: var(--sgpu-landing-chip-cache);
}
</style>
