// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';

import ClaseCudaMemcpy from './ClaseCudaMemcpy.vue';
import {
  CUDA_MEMCPY_CARD_IDS,
  CUDA_MEMCPY_CLASS_ID,
  MEMCPY_STORAGE_KEY,
  createDefaultMemcpyState,
  loadMemcpyState,
  saveMemcpyState,
} from './cudaMemcpyProgress.js';

const mountClass = async () => {
  const wrapper = mount(ClaseCudaMemcpy);
  await nextTick();
  return wrapper;
};

beforeEach(() => {
  window.localStorage.clear();
});

describe('ClaseCudaMemcpy', () => {
  it('opens on the canonical H2D scene: host source with values, device destination undefined', async () => {
    const wrapper = await mountClass();
    // Host region shows known input values.
    const hostCells = wrapper.findAll('[data-test^="cell-host-"]');
    expect(hostCells.map((cell) => cell.get('.cell-content').text())).toEqual(['4', '7', '1', '9', '3']);
    // Device region shows five undefined cells.
    const deviceCells = wrapper.findAll('[data-test^="cell-device-"]');
    expect(deviceCells).toHaveLength(5);
    expect(deviceCells.every((cell) => cell.get('.cell-content').text() === '?')).toBe(true);
    // Roles are textual, not colour-only.
    expect(wrapper.get('[data-test="role-host"]').text()).toContain('ORIGEN');
    expect(wrapper.get('[data-test="role-device"]').text()).toContain('DESTINO');
    // Byte count derives from the default 3 elements.
    expect(wrapper.get('[data-test="byte-expression"]').text()).toBe('3 × sizeof(int32_t) = 12 bytes');
    expect(wrapper.get('[data-test="call-code"]').text()).toContain('cudaMemcpyHostToDevice');
  });

  it('keeps indices visually associated with their values and labels undefined cells accessibly', async () => {
    const wrapper = await mountClass();
    const host0 = wrapper.get('[data-test="cell-host-0"]');
    expect(host0.get('.cell-index').text()).toBe('[0]');
    expect(host0.get('.cell-content').text()).toBe('4');

    const device4 = wrapper.get('[data-test="cell-device-4"]');
    expect(device4.get('.cell-index').text()).toBe('[4]');
    expect(device4.get('.sr-only').text()).toContain('contenido no inicializado');
  });

  it('lets the learner predict destination cells and confirms the affected range', async () => {
    const wrapper = await mountClass();
    await wrapper.findAll('.step-button')[1]?.trigger('click');
    // Destination (device) cells are selectable buttons during prediction.
    await wrapper.get('[data-test="predict-cell-0"]').trigger('click');
    await wrapper.get('[data-test="predict-cell-1"]').trigger('click');
    await wrapper.get('[data-test="predict-cell-2"]').trigger('click');
    expect(wrapper.get('[data-test="prediction-count"]').text()).toContain('3');

    await wrapper.get('.stage .primary-action').trigger('click');
    const feedback = wrapper.get('[data-test="prediction-feedback"]');
    expect(feedback.text()).toContain('¡Correcto!');
    expect(feedback.text()).toContain('[0, 1, 2]');
  });

  it('executes a partial copy: source unchanged, first three device cells copied, tail unchanged', async () => {
    const wrapper = await mountClass();
    await wrapper.findAll('.step-button')[3]?.trigger('click'); // jump to EXPLICAR => frame after

    const deviceCells = wrapper.findAll('[data-test^="cell-device-"]');
    // First three copied from the host source.
    expect(deviceCells.slice(0, 3).map((c) => c.get('.cell-content').text())).toEqual(['4', '7', '1']);
    // Tail remains undefined (not copied, not reset to zero).
    expect(deviceCells.slice(3).every((c) => c.get('.cell-content').text() === '?')).toBe(true);
    // Host source untouched.
    const hostCells = wrapper.findAll('[data-test^="cell-host-"]');
    expect(hostCells.map((c) => c.get('.cell-content').text())).toEqual(['4', '7', '1', '9', '3']);
    // Tail note is textual.
    expect(wrapper.get('[data-test="tail-note-device"]').text()).toContain('[3, 4]');
  });

  it('reverses to D2H and proves an uncopied host tail keeps its prior -1, not a reset', async () => {
    const wrapper = await mountClass();
    // Switch direction to Device -> Host.
    const directionButtons = wrapper.findAll('.control-group')[0]?.findAll('button') ?? [];
    await directionButtons[1]?.trigger('click');
    await wrapper.findAll('.step-button')[3]?.trigger('click'); // EXPLICAR => after

    // Now host is the destination, device is the source.
    expect(wrapper.get('[data-test="role-device"]').text()).toContain('ORIGEN');
    expect(wrapper.get('[data-test="role-host"]').text()).toContain('DESTINO');

    const hostCells = wrapper.findAll('[data-test^="cell-host-"]');
    // First three copied from the device result.
    expect(hostCells.slice(0, 3).map((c) => c.get('.cell-content').text())).toEqual(['31', '12', '5']);
    // Uncopied tail keeps its known prior value -1.
    expect(hostCells.slice(3).map((c) => c.get('.cell-content').text())).toEqual(['-1', '-1']);
    expect(wrapper.get('[data-test="call-code"]').text()).toContain('cudaMemcpyDeviceToHost');
  });

  it('shows the byte-count quirk (count is bytes, not elements)', async () => {
    const wrapper = await mountClass();
    await wrapper.findAll('.step-button')[4]?.trigger('click');
    const quirks = wrapper.get('.quirks').text();
    expect(quirks).toContain('5 bytes');
    expect(quirks).toContain('5 * sizeof(int32_t) = 20 bytes');
    expect(quirks).toContain('Copiar no es mover');
  });

  it('gives immediate feedback for all three checks and shows the H2D + D2H apply skeleton', async () => {
    const wrapper = await mountClass();
    await wrapper.findAll('.step-button')[5]?.trigger('click');
    const fieldsets = wrapper.findAll('.check-card fieldset');
    await fieldsets[0]?.findAll('input')[1]?.setValue(true);
    await fieldsets[1]?.findAll('input')[1]?.setValue(true);
    await fieldsets[2]?.findAll('input')[1]?.setValue(true);
    expect(wrapper.get('[data-test="check-score"]').text()).toBe('3 / 3 correctas');

    const skeleton = wrapper.get('[data-test="apply-skeleton"]').text();
    expect(skeleton).toContain('cudaMemcpyHostToDevice');
    expect(skeleton).toContain('cudaMemcpyDeviceToHost');
  });

  it('recomputes byte count when the element count changes', async () => {
    const wrapper = await mountClass();
    const countButtons = wrapper.findAll('.control-group')[1]?.findAll('button') ?? [];
    // buttons: [1, 3, 5]
    await countButtons[2]?.trigger('click');
    expect(wrapper.get('[data-test="byte-expression"]').text()).toBe('5 × sizeof(int32_t) = 20 bytes');
  });

  it('restores saved position, direction, element count, and card state', async () => {
    const state = createDefaultMemcpyState();
    state.classProgress['cuda-memcpy'] = {
      step: 3,
      direction: 'device-to-host',
      elementCount: 5,
      predictedIndices: [0, 1, 2, 3, 4],
      checkAnswers: [1, 1, null],
    };
    state.anki['cuda-memcpy'].seen = ['memcpy-001'];
    saveMemcpyState(state, window.localStorage);

    const wrapper = await mountClass();
    expect(wrapper.get('#stage-3').text()).toContain('Antes → acción → después');
    expect(wrapper.get('[data-test="byte-expression"]').text()).toBe('5 × sizeof(int32_t) = 20 bytes');
    expect(wrapper.get('[data-test="call-code"]').text()).toContain('cudaMemcpyDeviceToHost');
  });

  it('runs the six-card review and persists completion; reset touches only its own key', async () => {
    const state = createDefaultMemcpyState();
    state.classProgress['cuda-memcpy'].step = 6;
    state.classProgress['cuda-memcpy'].checkAnswers = [1, 1, 1];
    saveMemcpyState(state, window.localStorage);
    window.localStorage.setItem('other-key', 'keep');

    const wrapper = await mountClass();
    for (let index = 0; index < CUDA_MEMCPY_CARD_IDS.length; index += 1) {
      await wrapper.get('.anki-card .primary-action').trigger('click');
      await wrapper.get('.anki-answer .primary-action').trigger('click');
    }
    expect(wrapper.get('[data-test="anki-seen"]').text()).toContain('6 / 6');

    const completeButton = wrapper.get('.complete-action');
    expect(completeButton.attributes()).not.toHaveProperty('disabled');
    await completeButton.trigger('click');
    expect(loadMemcpyState(window.localStorage).completedClasses).toContain(CUDA_MEMCPY_CLASS_ID);

    await wrapper.get('.reset-action').trigger('click');
    expect(window.localStorage.getItem(MEMCPY_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem('other-key')).toBe('keep');
  });

  it('uses reachable native controls and exposes the memory layout to assistive technology', async () => {
    const wrapper = await mountClass();
    expect(wrapper.get('.step-nav').attributes('aria-label')).toBe('Pasos de la clase');
    expect(wrapper.findAll('.step-nav button')).toHaveLength(7);
    expect(wrapper.get('.memory-layout').attributes('aria-live')).toBe('polite');
    expect(wrapper.findAll('.control-group')[0]?.attributes('aria-label')).toBe('Dirección de la copia');
  });
});
