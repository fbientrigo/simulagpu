// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';

import ClaseCudaMalloc from './ClaseCudaMalloc.vue';
import {
  CUDA_MALLOC_CARD_IDS,
  CUDA_MALLOC_CLASS_ID,
  LEARNER_STORAGE_KEY,
  createDefaultLearnerState,
  loadLearnerState,
  saveLearnerState,
} from './cudaMallocProgress.js';

const mountClass = async () => {
  const wrapper = mount(ClaseCudaMalloc);
  await nextTick();
  return wrapper;
};

beforeEach(() => {
  window.localStorage.clear();
});

describe('ClaseCudaMalloc', () => {
  it('starts with the smallest meaningful before state and never draws more than eight cells per layer', async () => {
    const wrapper = await mountClass();
    expect(wrapper.get('[data-test="pointer-state"]').text()).toContain('nullptr');
    expect(wrapper.get('[data-test="device-state"]').text()).toContain('Sin asignación');
    expect(wrapper.findAll('.host-cells .cell')).toHaveLength(4);
    expect(wrapper.findAll('[data-test="device-cell"]')).toHaveLength(0);

    const sizeButtons = wrapper.findAll('.size-control button');
    await sizeButtons[3]?.trigger('click');
    expect(wrapper.findAll('.host-cells .cell')).toHaveLength(8);

    await wrapper.findAll('.step-button')[3]?.trigger('click');
    expect(wrapper.findAll('[data-test="device-cell"]')).toHaveLength(8);
  });

  it('renders stable ascending indices separately from host values and undefined device contents', async () => {
    const wrapper = await mountClass();
    const hostCells = wrapper.findAll('[data-test="host-cell"]');

    expect(
      hostCells.map((cell) => [cell.get('.cell-index').text(), cell.get('.cell-content').text()]),
    ).toEqual([
      ['[0]', '3'],
      ['[1]', '1'],
      ['[2]', '4'],
      ['[3]', '2'],
    ]);
    expect(hostCells.map((cell) => cell.get('.sr-only').text())).toEqual([
      'Celda [0], valor 3',
      'Celda [1], valor 1',
      'Celda [2], valor 4',
      'Celda [3], valor 2',
    ]);

    await wrapper.findAll('.step-button')[3]?.trigger('click');
    const deviceCells = wrapper.findAll('[data-test="device-cell"]');
    expect(
      deviceCells.map((cell) => [cell.get('.cell-index').text(), cell.get('.cell-content').text()]),
    ).toEqual([
      ['[0]', '?'],
      ['[1]', '?'],
      ['[2]', '?'],
      ['[3]', '?'],
    ]);
    expect(deviceCells.map((cell) => cell.get('.sr-only').text())).toEqual([
      'Celda [0], contenido indefinido',
      'Celda [1], contenido indefinido',
      'Celda [2], contenido indefinido',
      'Celda [3], contenido indefinido',
    ]);
  });

  it('records a one-tap prediction before revealing and executes the transition frame by frame', async () => {
    const wrapper = await mountClass();
    await wrapper.findAll('.step-button')[1]?.trigger('click');
    await wrapper.findAll('.answer-list button')[0]?.trigger('click');

    expect(wrapper.get('[data-test="prediction-feedback"]').text()).toContain('Predicción guardada');
    expect(wrapper.findAll('[data-test="device-cell"]')).toHaveLength(0);

    await wrapper.get('.stage .primary-action').trigger('click');
    expect(wrapper.get('[data-test="device-state"]').text()).toContain('Reservando');
    expect(wrapper.get('[data-test="pointer-state"]').text()).toContain('se está escribiendo');

    await wrapper.findAll('.frame-controls button')[2]?.trigger('click');
    expect(wrapper.get('[data-test="pointer-state"]').text()).toContain('asignación del device');
    expect(wrapper.findAll('[data-test="device-cell"]')).toHaveLength(4);
    expect(wrapper.findAll('[data-test="device-cell"]')[0]?.text()).toContain('?');

    await wrapper.get('.secondary-action').trigger('click');
    expect(wrapper.get('[data-test="pointer-state"]').text()).toContain('nullptr');
  });

  it('makes changed, unchanged, and why explicit', async () => {
    const wrapper = await mountClass();
    await wrapper.findAll('.step-button')[3]?.trigger('click');

    expect(wrapper.get('[data-test="changed"]').text()).toContain('d_A deja de ser nullptr');
    expect(wrapper.get('[data-test="unchanged"]').text()).toContain('h_A');
    expect(wrapper.get('[data-test="unchanged"]').text()).toContain('No se copió ningún dato');
    expect(wrapper.get('[data-test="why"]').text()).toContain('no recibe datos');
  });

  it('gives immediate feedback for all three short checks', async () => {
    const wrapper = await mountClass();
    await wrapper.findAll('.step-button')[5]?.trigger('click');
    const fieldsets = wrapper.findAll('.check-card fieldset');

    await fieldsets[0]?.findAll('input')[2]?.setValue(true);
    await fieldsets[1]?.findAll('input')[0]?.setValue(true);
    await fieldsets[2]?.findAll('input')[0]?.setValue(true);

    expect(wrapper.get('[data-test="check-score"]').text()).toBe('3 / 3 correctas');
    expect(wrapper.findAll('.check-card .feedback')).toHaveLength(3);
    expect(wrapper.findAll('.check-card .feedback').every((node) => node.text().includes('Correcto.'))).toBe(
      true,
    );
  });

  it('restores the last class position, configuration, answers, and completed card state', async () => {
    const state = createDefaultLearnerState();
    state.classProgress['cuda-malloc'] = {
      step: 3,
      elementCount: 8,
      prediction: 'reserva-sin-copiar',
      checkAnswers: [2, 0, null],
    };
    state.anki['cuda-malloc'].seen = ['malloc-001'];
    saveLearnerState(state, window.localStorage);

    const wrapper = await mountClass();
    expect(wrapper.get('#stage-3').text()).toContain('Antes');
    expect(wrapper.findAll('[data-test="device-cell"]')).toHaveLength(8);
    expect(wrapper.findAll('.size-control button')[3]?.attributes('aria-pressed')).toBe('true');
  });

  it('resets only local lesson progress and returns to SEE', async () => {
    const state = createDefaultLearnerState();
    state.classProgress['cuda-malloc'].step = 6;
    saveLearnerState(state, window.localStorage);
    window.localStorage.setItem('other-key', 'keep');

    const wrapper = await mountClass();
    await wrapper.get('.reset-action').trigger('click');

    expect(wrapper.get('#stage-0').text()).toContain('Mira el estado mínimo');
    expect(window.localStorage.getItem(LEARNER_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem('other-key')).toBe('keep');
    expect(wrapper.get('[data-test="storage-status"]').text()).toContain('reiniciado');
  });

  it('runs a four-card local review and persists class completion', async () => {
    const state = createDefaultLearnerState();
    state.classProgress['cuda-malloc'].step = 6;
    state.classProgress['cuda-malloc'].checkAnswers = [2, 0, 0];
    saveLearnerState(state, window.localStorage);

    const wrapper = await mountClass();
    for (let index = 0; index < CUDA_MALLOC_CARD_IDS.length; index += 1) {
      await wrapper.get('.anki-card .primary-action').trigger('click');
      expect(wrapper.get('.anki-answer').text().length).toBeGreaterThan(10);
      await wrapper.get('.anki-answer .primary-action').trigger('click');
    }

    expect(wrapper.get('[data-test="anki-seen"]').text()).toContain('4 / 4');
    const completeButton = wrapper.get('.complete-action');
    expect(completeButton.attributes()).not.toHaveProperty('disabled');
    await completeButton.trigger('click');

    expect(loadLearnerState(window.localStorage).completedClasses).toContain(CUDA_MALLOC_CLASS_ID);
  });

  it('uses reachable native controls and exposes state changes to assistive technology', async () => {
    const wrapper = await mountClass();
    expect(wrapper.get('.step-nav').attributes('aria-label')).toBe('Pasos de la clase');
    expect(wrapper.findAll('.step-nav button')).toHaveLength(7);
    expect(wrapper.findAll('.step-nav button').every((node) => node.element.tagName === 'BUTTON')).toBe(true);
    expect(wrapper.get('.memory-layout').attributes('aria-live')).toBe('polite');

    await wrapper.findAll('.step-button')[5]?.trigger('click');
    expect(wrapper.findAll('input[type="radio"]')).toHaveLength(9);
    expect(wrapper.findAll('.check-card fieldset')).toHaveLength(3);
  });
});
