// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';

import ClaseSyncthreads from './ClaseSyncthreads.vue';
import {
  SYNCTHREADS_CARD_IDS,
  SYNCTHREADS_CLASS_ID,
  SYNCTHREADS_STORAGE_KEY,
  createDefaultSyncthreadsState,
  loadSyncthreadsState,
  saveSyncthreadsState,
} from './syncthreadsProgress.js';

const mountClass = async () => {
  const wrapper = mount(ClaseSyncthreads);
  await nextTick();
  return wrapper;
};

const gotoStep = async (wrapper: Awaited<ReturnType<typeof mountClass>>, index: number) => {
  await wrapper.findAll('.step-button')[index]?.trigger('click');
};

beforeEach(() => {
  window.localStorage.clear();
});

describe('ClaseSyncthreads', () => {
  it('opens on the primary scene with four threads in before and nobody waiting', async () => {
    const wrapper = await mountClass();
    for (const id of ['T0', 'T1', 'T2', 'T3']) {
      expect(wrapper.get(`[data-test="state-0-${id}"]`).text()).toBe('ANTES');
    }
    expect(wrapper.get('[data-test="barrier-0"]').text()).toContain('cerrada');
    expect(wrapper.get('[data-test="arrival-order"]').text()).toContain('T0 → T2 → T1 → T3');
  });

  it('does not reveal arrival state before the prediction is made', async () => {
    const wrapper = await mountClass();
    await gotoStep(wrapper, 1);
    // Still all before; the question is visible.
    expect(wrapper.get('[data-test="state-0-T0"]').text()).toBe('ANTES');
    expect(wrapper.find('[data-test="prediction-feedback"]').exists()).toBe(false);
  });

  it('gives diagnostic feedback for the prediction rather than only right/wrong', async () => {
    const wrapper = await mountClass();
    await gotoStep(wrapper, 1);
    await wrapper.get('[data-test="predict-option-0"]').trigger('click');
    const feedback = wrapper.get('[data-test="prediction-feedback"]');
    expect(feedback.text()).toContain('Todavía no.');
    expect(feedback.text()).toContain('Llegar a la barrera no es cruzarla');

    await wrapper.get('[data-test="predict-option-1"]').trigger('click');
    expect(wrapper.get('[data-test="prediction-feedback"]').text()).toContain('¡Correcto!');
  });

  it('accumulates waiting threads in arrival order and shows the explicit counter-state', async () => {
    const wrapper = await mountClass();
    await gotoStep(wrapper, 2);
    // First arrival: T0.
    await wrapper.get('[data-test="advance-arrival"]').trigger('click');
    expect(wrapper.get('[data-test="state-0-T0"]').text()).toBe('ESPERANDO');
    expect(wrapper.get('[data-test="state-0-T1"]').text()).toBe('ANTES');
    expect(wrapper.get('[data-test="counter-state"]').text()).toContain('La barrera sigue cerrada');
    // Second arrival: T2 (arrival order T0, T2, T1, T3).
    await wrapper.get('[data-test="advance-arrival"]').trigger('click');
    expect(wrapper.get('[data-test="state-0-T2"]').text()).toBe('ESPERANDO');
    expect(wrapper.get('[data-test="state-0-T1"]').text()).toBe('ANTES');
  });

  it('releases every thread jointly only after the final arrival, then continues to after', async () => {
    const wrapper = await mountClass();
    await gotoStep(wrapper, 2);
    for (let i = 0; i < 4; i += 1) {
      await wrapper.get('[data-test="advance-arrival"]').trigger('click');
    }
    for (const id of ['T0', 'T1', 'T2', 'T3']) {
      expect(wrapper.get(`[data-test="state-0-${id}"]`).text()).toBe('LIBERADO');
    }
    expect(wrapper.get('[data-test="barrier-0"]').text()).toContain('satisfecha');
    // Advance is now disabled; continue moves them to after.
    expect(wrapper.get('[data-test="advance-arrival"]').attributes()).toHaveProperty('disabled');
    await wrapper.get('[data-test="continue-barrier"]').trigger('click');
    for (const id of ['T0', 'T1', 'T2', 'T3']) {
      expect(wrapper.get(`[data-test="state-0-${id}"]`).text()).toBe('DESPUÉS');
    }
  });

  it('restart returns the primary scene to the initial all-before state', async () => {
    const wrapper = await mountClass();
    await gotoStep(wrapper, 2);
    await wrapper.get('[data-test="advance-arrival"]').trigger('click');
    await wrapper.get('[data-test="advance-arrival"]').trigger('click');
    await wrapper.get('[data-test="restart-arrivals"]').trigger('click');
    for (const id of ['T0', 'T1', 'T2', 'T3']) {
      expect(wrapper.get(`[data-test="state-0-${id}"]`).text()).toBe('ANTES');
    }
  });

  it('explains what changed and what did not at the barrier', async () => {
    const wrapper = await mountClass();
    await gotoStep(wrapper, 3);
    expect(wrapper.get('[data-test="changed"]').text()).toContain('cruzar');
    expect(wrapper.get('[data-test="unchanged"]').text()).toContain('Block 0');
    expect(wrapper.get('[data-test="why"]').text()).toContain('todos los hilos participantes');
    // The scene shows the released state at EXPLAIN.
    expect(wrapper.get('[data-test="state-0-T3"]').text()).toBe('LIBERADO');
  });

  it('shows the divergent partial-block trap as invalid, not as a hang', async () => {
    const wrapper = await mountClass();
    await gotoStep(wrapper, 4);
    expect(wrapper.get('[data-test="divergent-code"]').text()).toContain('if (i < N)');
    expect(wrapper.get('[data-test="state-0-T0"]').text()).toBe('ESPERANDO');
    expect(wrapper.get('[data-test="state-0-T2"]').text()).toBe('NO LLEGA');
    expect(wrapper.get('[data-test="barrier-0"]').text()).toContain('cerrada');
    expect(wrapper.get('[data-test="divergent-why"]').text()).toContain('divergente');
  });

  it('shows the two-block scope scene and four checks with feedback', async () => {
    const wrapper = await mountClass();
    await gotoStep(wrapper, 5);
    // Both blocks visible; Block 0 satisfied, Block 1 not.
    expect(wrapper.get('[data-test="barrier-0"]').text()).toContain('satisfecha');
    expect(wrapper.get('[data-test="barrier-1"]').text()).toContain('cerrada');

    const fieldsets = wrapper.findAll('.check-card fieldset');
    expect(fieldsets).toHaveLength(4);
    await fieldsets[0]?.findAll('input')[1]?.setValue(true);
    await fieldsets[1]?.findAll('input')[1]?.setValue(true);
    await fieldsets[2]?.findAll('input')[1]?.setValue(true);
    await fieldsets[3]?.findAll('input')[1]?.setValue(true);
    expect(wrapper.get('[data-test="check-score"]').text()).toBe('4 / 4 correctas');
  });

  it('runs the six-card review, persists completion, and reset touches only its own key', async () => {
    const state = createDefaultSyncthreadsState();
    state.classProgress.syncthreads.step = 6;
    state.classProgress.syncthreads.checkAnswers = [1, 1, 1, 1];
    saveSyncthreadsState(state, window.localStorage);
    window.localStorage.setItem('other-key', 'keep');

    const wrapper = await mountClass();
    for (let index = 0; index < SYNCTHREADS_CARD_IDS.length; index += 1) {
      await wrapper.get('.anki-card .primary-action').trigger('click');
      await wrapper.get('.anki-answer .primary-action').trigger('click');
    }
    expect(wrapper.get('[data-test="anki-seen"]').text()).toContain('6 / 6');

    const completeButton = wrapper.get('.complete-action');
    expect(completeButton.attributes()).not.toHaveProperty('disabled');
    await completeButton.trigger('click');
    expect(loadSyncthreadsState(window.localStorage).completedClasses).toContain(SYNCTHREADS_CLASS_ID);

    await wrapper.get('.reset-action').trigger('click');
    expect(window.localStorage.getItem(SYNCTHREADS_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem('other-key')).toBe('keep');
  });

  it('exposes reachable, labelled controls and per-thread accessibility text', async () => {
    const wrapper = await mountClass();
    expect(wrapper.get('.step-nav').attributes('aria-label')).toBe('Pasos de la clase');
    expect(wrapper.findAll('.step-nav button')).toHaveLength(7);
    expect(wrapper.get('.blocks').attributes('aria-live')).toBe('polite');
    // Screen-reader label per lane comes from the model's ariaLabel.
    expect(wrapper.get('[data-test="lane-0-T0"] .sr-only').text()).toContain('T0 —');
  });
});
