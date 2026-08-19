<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vitepress';

const COMPACT_QUERY = '(min-width: 960px) and (max-width: 1100px)';
const OPEN_CLASS = 'sgpu-sidebar-open';
const SIDEBAR_ID = 'simulagpu-course-sidebar';

const route = useRoute();
const open = ref(false);

let sidebar: HTMLElement | null = null;
let previousSidebarId: string | null = null;
let compactQuery: MediaQueryList | null = null;

function syncOpenClass(): void {
  document.documentElement.classList.toggle(OPEN_CLASS, open.value);
}

function closeSidebar(): void {
  open.value = false;
  syncOpenClass();
}

function toggleSidebar(): void {
  open.value = !open.value;
  syncOpenClass();
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && open.value) {
    closeSidebar();
  }
}

function handleCompactChange(event: MediaQueryListEvent): void {
  if (!event.matches) {
    closeSidebar();
  }
}

onMounted(() => {
  sidebar = document.querySelector<HTMLElement>('.VPSidebar');
  if (sidebar) {
    previousSidebarId = sidebar.id || null;
    sidebar.id = SIDEBAR_ID;
  }

  compactQuery = window.matchMedia(COMPACT_QUERY);
  compactQuery.addEventListener('change', handleCompactChange);
  window.addEventListener('keydown', handleKeydown);
});

watch(
  () => route.path,
  () => closeSidebar(),
);

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
  compactQuery?.removeEventListener('change', handleCompactChange);
  document.documentElement.classList.remove(OPEN_CLASS);

  if (sidebar?.id === SIDEBAR_ID) {
    if (previousSidebarId) {
      sidebar.id = previousSidebarId;
    } else {
      sidebar.removeAttribute('id');
    }
  }
});
</script>

<template>
  <button
    class="sgpu-sidebar-toggle"
    type="button"
    :aria-controls="SIDEBAR_ID"
    :aria-expanded="open"
    :aria-label="open ? 'Cerrar temario' : 'Abrir temario'"
    @click="toggleSidebar"
  >
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path v-if="open" d="M6 6l12 12M18 6 6 18" />
      <path v-else d="M4 7h16M4 12h16M4 17h16" />
    </svg>
    <span>{{ open ? 'Cerrar' : 'Temario' }}</span>
  </button>

  <button
    v-if="open"
    class="sgpu-sidebar-backdrop"
    type="button"
    tabindex="-1"
    aria-label="Cerrar temario"
    @click="closeSidebar"
  />
</template>

<style>
.sgpu-sidebar-toggle,
.sgpu-sidebar-backdrop {
  display: none;
}

@media (min-width: 960px) and (max-width: 1100px) {
  .sgpu-sidebar-toggle {
    position: fixed;
    bottom: max(12px, env(safe-area-inset-bottom));
    left: max(12px, env(safe-area-inset-left));
    z-index: 80;
    display: inline-flex;
    min-height: 44px;
    align-items: center;
    gap: 8px;
    padding: 0 14px;
    border: 1px solid var(--vp-c-divider);
    border-radius: 999px;
    background: var(--vp-c-bg);
    box-shadow: 0 8px 24px rgb(0 0 0 / 14%);
    color: var(--vp-c-text-1);
    font: inherit;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }

  .sgpu-sidebar-toggle:hover {
    border-color: var(--vp-c-brand-1);
    color: var(--vp-c-brand-1);
  }

  .sgpu-sidebar-toggle:focus-visible {
    outline: 2px solid var(--vp-c-brand-1);
    outline-offset: 2px;
  }

  .sgpu-sidebar-toggle svg {
    width: 18px;
    height: 18px;
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-width: 2;
  }

  .sgpu-sidebar-backdrop {
    position: fixed;
    inset: 0;
    z-index: 59;
    display: block;
    padding: 0;
    border: 0;
    background: rgb(0 0 0 / 28%);
  }

  .VPSidebar {
    z-index: 60 !important;
    transform: translateX(-100%) !important;
    box-shadow: 16px 0 32px rgb(0 0 0 / 12%);
    transition: transform 180ms ease;
  }

  html.sgpu-sidebar-open .VPSidebar {
    visibility: visible !important;
    transform: translateX(0) !important;
  }

  .VPContent.has-sidebar {
    padding-left: 0 !important;
  }

  .VPNavBar.has-sidebar .content {
    padding-left: 0 !important;
  }

  html.sgpu-sidebar-open body {
    overflow: hidden;
  }
}

@media (prefers-reduced-motion: reduce) {
  .VPSidebar {
    transition: none !important;
  }
}
</style>
