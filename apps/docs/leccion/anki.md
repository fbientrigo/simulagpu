---
title: Tarjetas interactivas
description: Repasa en la web las tarjetas de SimulaGPU en una sesión rápida y enfocada.
---

<script setup>
import { onBeforeUnmount, onMounted } from 'vue';
import { withBase } from 'vitepress';

const SESSION_CLASS = 'sgpu-anki-session';

onMounted(() => {
  document.documentElement.classList.add(SESSION_CLASS);
});

onBeforeUnmount(() => {
  document.documentElement.classList.remove(SESSION_CLASS);
});
</script>

<a class="anki-mobile-home" :href="withBase('/')" aria-label="Volver al inicio de SimulaGPU">
  <span aria-hidden="true">←</span>
  <span>Inicio</span>
</a>

<h1 class="anki-page-title">Tarjetas interactivas</h1>
<p class="anki-page-intro">
  Repasa directamente en la web. Toca una tarjeta para revelar la respuesta y califica tu recuerdo para avanzar.
</p>

<InteractiveAnkiReviewer :source="withBase('/data/simulagpu-anki.json')" />

<p class="anki-download-link">
  ¿Prefieres estudiar en Anki? <a :href="withBase('/leccion/descarga-anki')">Descarga el mazo y revisa los detalles.</a>
</p>

<style>
.anki-mobile-home {
  display: none;
}

.anki-page-title {
  margin-top: 0;
}

.anki-page-intro {
  max-width: 68ch;
}

.anki-download-link {
  margin-top: -0.5rem;
}

@media (max-width: 767px), (pointer: coarse) and (max-width: 1100px) {
  .anki-page-title,
  .anki-page-intro,
  .anki-download-link {
    display: none;
  }

  .anki-mobile-home {
    display: inline-flex;
    min-height: 44px;
    align-items: center;
    gap: 0.45rem;
    margin: 0 0 0.5rem;
    padding: 0 0.35rem;
    color: var(--vp-c-text-2);
    font-size: 0.9rem;
    font-weight: 650;
    text-decoration: none;
  }

  .anki-mobile-home:hover,
  .anki-mobile-home:focus-visible {
    color: var(--vp-c-brand-1);
  }
}
</style>
