<script setup lang="ts">
import { computed, ref } from 'vue';
import type { AccessPatternKind, MemoryAccessConfig } from '@simulagpu/contracts';
import {
  DEFAULT_MEMORY_ACCESS_CONFIG,
  buildMemoryAccessSnapshot,
  normalizeMemoryAccessConfig,
} from '@simulagpu/core';
import '@simulagpu/theme/tokens.css';

const config = ref<MemoryAccessConfig>({ ...DEFAULT_MEMORY_ACCESS_CONFIG });
const pattern = ref<AccessPatternKind>('contiguous');
const stage = ref<'independent' | 'cooperative' | 'reuse'>('independent');
const snapshot = computed(() => buildMemoryAccessSnapshot(config.value));
const selectedPattern = computed(() => snapshot.value.accessPatterns[pattern.value]);

function updateStride(event: Event): void {
  const stride = Number((event.target as HTMLInputElement).value);
  config.value = normalizeMemoryAccessConfig({ ...config.value, stride });
}
</script>

<template>
  <section class="sgpu-memory" aria-labelledby="sgpu-memory-title">
    <h3 id="sgpu-memory-title">Laboratorio de cooperación y acceso a memoria</h3>
    <p class="sgpu-memory__notice">
      Este laboratorio muestra un <strong>modelo determinista</strong> de índices lógicos y dependencias. No
      ejecuta CUDA, no simula transacciones de memoria, cachés ni scheduling, y no predice rendimiento.
    </p>

    <div class="sgpu-memory__controls" role="group" aria-label="Vista del patrón de acceso">
      <button type="button" :aria-pressed="stage === 'independent'" @click="stage = 'independent'">
        1. Trabajo independiente
      </button>
      <button type="button" :aria-pressed="stage === 'cooperative'" @click="stage = 'cooperative'">
        2. Dependencia entre hilos
      </button>
      <button type="button" :aria-pressed="stage === 'reuse'" @click="stage = 'reuse'">
        3. Oportunidad de reutilización
      </button>
    </div>

    <div class="sgpu-memory__regions">
      <article>
        <h4>Valores privados por hilo</h4>
        <div class="sgpu-memory__cells">
          <span v-for="thread in snapshot.threads" :key="`private-${thread.threadIdx}`">
            <small>t{{ thread.threadIdx }}</small>
            {{ thread.privateValue }}
          </span>
        </div>
      </article>
      <article>
        <h4>Memoria global · índice lógico ≠ valor</h4>
        <div class="sgpu-memory__cells">
          <span v-for="(value, index) in snapshot.phaseOneGlobalOutput" :key="`global-${index}`">
            <small>[{{ index }}]</small>
            {{ value }}
          </span>
        </div>
      </article>
    </div>

    <div v-if="stage === 'independent'" class="sgpu-memory__panel" data-test="independent-stage">
      <h4>Mismo trabajo lógico, distinta organización de accesos</h4>
      <div class="sgpu-memory__pattern-controls">
        <button type="button" :aria-pressed="pattern === 'contiguous'" @click="pattern = 'contiguous'">
          Contiguo
        </button>
        <button type="button" :aria-pressed="pattern === 'strided'" @click="pattern = 'strided'">
          Con stride
        </button>
        <label>
          Stride: {{ config.stride }}
          <input min="2" max="7" type="range" :value="config.stride" @input="updateStride" />
        </label>
      </div>
      <ol class="sgpu-memory__mapping">
        <li v-for="(address, threadIdx) in selectedPattern.addresses" :key="`${pattern}-${threadIdx}`">
          hilo {{ threadIdx }} → dirección lógica [{{ address }}]
        </li>
      </ol>
      <p>
        Diferencias entre direcciones consecutivas:
        <code>{{ selectedPattern.adjacentDeltas.join(', ') || '—' }}</code>.
        Aquí «contiguo» describe la relación entre índices; no afirma cuántas transacciones hará un hardware real.
      </p>
    </div>

    <div v-else-if="stage === 'cooperative'" class="sgpu-memory__panel" data-test="cooperative-stage">
      <h4>La segunda fase depende de resultados de otros hilos</h4>
      <div class="sgpu-memory__thread-reads">
        <article v-for="thread in snapshot.threads" :key="`reads-${thread.threadIdx}`">
          <strong>hilo {{ thread.threadIdx }}</strong>
          <span v-for="read in thread.phaseTwoReads" :key="`${thread.threadIdx}-${read.role}`">
            {{ read.role }}: {{ read.address === null ? 'fuera del borde' : `[${read.address}] = ${read.value}` }}
          </span>
        </article>
      </div>
      <p class="sgpu-memory__barrier">
        <code>fase 1 → __syncthreads() → fase 2</code><br />
        La barrera conocida es necesaria porque la fase 2 consume valores escritos por otros hilos del
        <strong>mismo bloque</strong>. No coordina bloques distintos.
      </p>
    </div>

    <div v-else class="sgpu-memory__panel" data-test="reuse-stage">
      <h4>¿Qué valores se leen varias veces?</h4>
      <ul>
        <li v-for="opportunity in snapshot.reuseOpportunities" :key="opportunity.address">
          global[{{ opportunity.address }}] = {{ opportunity.value }} es leído por hilos
          {{ opportunity.readerThreads.join(', ') }}.
        </li>
      </ul>
      <p>
        Repetir una lectura crea una <strong>oportunidad de reutilización</strong>. La pregunta que queda abierta es:
        ¿dónde podría un bloque guardar temporalmente esos valores para reutilizarlos? La primitiva siguiente responde
        esa pregunta; aquí no declaramos ni operamos <code>__shared__</code>.
      </p>
    </div>
  </section>
</template>

<style scoped>
.sgpu-memory {
  display: grid;
  gap: 1rem;
}

.sgpu-memory__notice,
.sgpu-memory__panel,
.sgpu-memory__regions article {
  border: 1px solid var(--sgpu-border, #8886);
  border-radius: 0.75rem;
  padding: 1rem;
}

.sgpu-memory__controls,
.sgpu-memory__pattern-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}

.sgpu-memory button,
.sgpu-memory input {
  min-height: 44px;
}

.sgpu-memory button:focus-visible,
.sgpu-memory input:focus-visible {
  outline: 3px solid currentColor;
  outline-offset: 2px;
}

.sgpu-memory__regions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  gap: 1rem;
}

.sgpu-memory__cells {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(3.75rem, 1fr));
  gap: 0.5rem;
}

.sgpu-memory__cells span {
  display: grid;
  min-height: 3.5rem;
  place-items: center;
  border: 2px solid currentColor;
  border-radius: 0.5rem;
}

.sgpu-memory__cells small {
  font-weight: 700;
}

.sgpu-memory__mapping,
.sgpu-memory__thread-reads {
  display: grid;
  gap: 0.5rem;
}

.sgpu-memory__thread-reads article {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding: 0.5rem;
  border-bottom: 1px solid var(--sgpu-border, #8886);
}

.sgpu-memory__barrier {
  text-align: center;
  font-weight: 600;
}

@media (prefers-reduced-motion: reduce) {
  .sgpu-memory * {
    scroll-behavior: auto !important;
    transition: none !important;
  }
}
</style>
