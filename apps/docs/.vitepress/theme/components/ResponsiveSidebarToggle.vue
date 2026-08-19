<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vitepress';

const COMPACT_QUERY = '(min-width: 960px) and (max-width: 1100px)';
const OPEN_CLASS = 'sgpu-sidebar-open';
const FOCUS_CLASS = 'sgpu-focus-mode';
const SIDEBAR_ID = 'simulagpu-course-sidebar';

const route = useRoute();
const open = ref(false);
const focusMode = ref(false);

let sidebar: HTMLElement | null = null;
let previousSidebarId: string | null = null;
let compactQuery: MediaQueryList | null = null;
let nativeFullscreenActive = false;

function syncOpenClass(): void {
  document.documentElement.classList.toggle(OPEN_CLASS, open.value);
}

function setFocusMode(active: boolean): void {
  focusMode.value = active;
  document.documentElement.classList.toggle(FOCUS_CLASS, active);
}

function closeSidebar(): void {
  open.value = false;
  syncOpenClass();
}

function toggleSidebar(): void {
  open.value = !open.value;
  syncOpenClass();
}

async function toggleFocusMode(): Promise<void> {
  if (focusMode.value) {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        // The CSS focus mode still provides the intended mobile experience.
      }
    }
    nativeFullscreenActive = false;
    setFocusMode(false);
    return;
  }

  closeSidebar();
  setFocusMode(true);

  if (!document.documentElement.requestFullscreen) return;

  try {
    await document.documentElement.requestFullscreen();
    nativeFullscreenActive = true;
  } catch {
    // Some mobile browsers block the Fullscreen API. Keep the CSS focus mode
    // as a deterministic fallback instead of failing the interaction.
    nativeFullscreenActive = false;
  }
}

function handleFullscreenChange(): void {
  if (document.fullscreenElement) {
    nativeFullscreenActive = true;
    setFocusMode(true);
    return;
  }

  if (nativeFullscreenActive) {
    nativeFullscreenActive = false;
    setFocusMode(false);
  }
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return;

  if (open.value) closeSidebar();
  if (focusMode.value && !document.fullscreenElement) setFocusMode(false);
}

function handleCompactChange(event: MediaQueryListEvent): void {
  if (!event.matches) closeSidebar();
}

onMounted(() => {
  sidebar = document.querySelector<HTMLElement>('.VPSidebar');
  if (sidebar) {
    previousSidebarId = sidebar.id || null;
    sidebar.id = SIDEBAR_ID;
  }

  compactQuery = window.matchMedia(COMPACT_QUERY);
  compactQuery.addEventListener('change', handleCompactChange);
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  window.addEventListener('keydown', handleKeydown);
});

watch(
  () => route.path,
  () => closeSidebar(),
);

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
  compactQuery?.removeEventListener('change', handleCompactChange);
  document.documentElement.classList.remove(OPEN_CLASS, FOCUS_CLASS);

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
    class="sgpu-focus-toggle"
    type="button"
    :aria-pressed="focusMode"
    :aria-label="focusMode ? 'Salir de pantalla completa' : 'Abrir en pantalla completa'"
    @click="toggleFocusMode"
  >
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path v-if="focusMode" d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
      <path v-else d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" />
    </svg>
    <span>{{ focusMode ? 'Salir' : 'Pantalla completa' }}</span>
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
.sgpu-focus-toggle,
.sgpu-sidebar-backdrop {
  display: none;
}

.sgpu-sidebar-toggle,
.sgpu-focus-toggle {
  position: fixed;
  bottom: max(12px, env(safe-area-inset-bottom));
  z-index: 80;
  min-height: 44px;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  background: color-mix(in srgb, var(--vp-c-bg) 94%, transparent);
  box-shadow: 0 8px 24px rgb(0 0 0 / 14%);
  color: var(--vp-c-text-1);
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  backdrop-filter: blur(12px);
}

.sgpu-sidebar-toggle:hover,
.sgpu-focus-toggle:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.sgpu-sidebar-toggle:focus-visible,
.sgpu-focus-toggle:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

.sgpu-sidebar-toggle svg,
.sgpu-focus-toggle svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2;
}

@media (min-width: 960px) and (max-width: 1100px) {
  .sgpu-sidebar-toggle {
    left: max(12px, env(safe-area-inset-left));
    display: inline-flex;
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

@media (max-width: 767px), (pointer: coarse) and (max-width: 1100px) {
  .sgpu-focus-toggle {
    right: max(12px, env(safe-area-inset-right));
    display: inline-flex;
  }

  html.sgpu-focus-mode .sgpu-sidebar-toggle {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .VPSidebar {
    transition: none !important;
  }
}
</style>
