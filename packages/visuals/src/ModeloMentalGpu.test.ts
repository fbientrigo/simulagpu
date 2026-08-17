// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

import ModeloMentalGpu from './ModeloMentalGpu.vue';

const montar = (initialQuery = '') => mount(ModeloMentalGpu, { props: { initialQuery, syncUrl: false } });

describe('ModeloMentalGpu', () => {
  it('shows the explanatory-model disclaimer', () => {
    const wrapper = montar();
    expect(wrapper.text()).toContain('Modelo explicativo');
    expect(wrapper.text()).toContain('no ejecuta CUDA');
  });

  it('renders the initial chunk, block and inactive-thread counts from the model', () => {
    const wrapper = montar('tb=96&bpc=16&tpb=4&sk=thread&si=7');
    expect(wrapper.get('[data-test="chunk-count-expr"]').text()).toBe('número de chunks = 6');
    expect(wrapper.get('[data-test="block-count-expr"]').text()).toBe('número de bloques = 2');
  });

  it('rebuilds the snapshot when a control changes', async () => {
    const wrapper = montar('tb=96&bpc=16&tpb=4');
    const groups = wrapper.findAll('[role="group"]');
    const bytesGroup = groups.find((g) => g.attributes('aria-label') === 'Bytes totales en el host');
    await bytesGroup?.findAll('button').at(-1)?.trigger('click');
    expect(wrapper.get('[data-test="chunk-count-expr"]').text()).toBe('número de chunks = 16');
  });

  it('separates index and value: chunk cells show [index] and a byte range', () => {
    const wrapper = montar('tb=96&bpc=16&tpb=4');
    const firstChunk = wrapper.findAll('.memory-panel--host .cell')[0];
    expect(firstChunk?.get('.cell-index').text()).toBe('[0]');
    expect(firstChunk?.get('.cell-content').text()).toContain('bytes');
  });

  it('distinguishes active from inactive threads, both visually and by label', () => {
    const wrapper = montar('tb=96&bpc=16&tpb=4');
    const activos = wrapper.findAll('.memory-panel--device .cell--valid');
    const inactivos = wrapper.findAll('.memory-panel--device .cell--inactive');
    expect(activos).toHaveLength(6);
    expect(inactivos).toHaveLength(2);
    for (const hilo of inactivos) {
      expect(hilo.text()).toContain('inactivo');
      expect(hilo.get('.cell-content').text()).toBe('∅');
    }
  });

  it('updates the selection summary when a chunk is selected', async () => {
    const wrapper = montar('tb=96&bpc=16&tpb=4');
    const chunkCells = wrapper.findAll('.memory-panel--host .cell-button');
    await chunkCells[2]?.trigger('click');
    expect(wrapper.get('[data-test="selection-summary"]').text()).toContain('Chunk 2');
  });

  it('updates the selection summary when an inactive thread is selected', async () => {
    const wrapper = montar('tb=96&bpc=16&tpb=4');
    const threadCells = wrapper.findAll('.memory-panel--device .cell-button');
    await threadCells[threadCells.length - 1]?.trigger('click');
    expect(wrapper.get('[data-test="selection-summary"]').text()).toContain('inactivo');
  });

  it('moves forward and backward through the guided steps without changing model truth', async () => {
    const wrapper = montar('tb=96&bpc=16&tpb=4');
    const primerTitulo = wrapper.get('#stage-title').text();
    const chunkCountBefore = wrapper.get('[data-test="chunk-count-expr"]').text();

    const stepButtons = wrapper.findAll('.step-button');
    await stepButtons[1]?.trigger('click');
    expect(wrapper.get('#stage-title').text()).not.toBe(primerTitulo);
    expect(wrapper.get('[data-test="chunk-count-expr"]').text()).toBe(chunkCountBefore);

    await wrapper.get('.step-controls .secondary-action').trigger('click');
    expect(wrapper.get('#stage-title').text()).toBe(primerTitulo);
  });

  it('does not step before the first or after the last step', async () => {
    const wrapper = montar();
    const prev = wrapper.get('.step-controls .secondary-action');
    expect((prev.element as HTMLButtonElement).disabled).toBe(true);

    const stepButtons = wrapper.findAll('.step-button');
    const next = wrapper.get('.step-controls .primary-action');
    for (let i = 0; i < stepButtons.length + 2; i += 1) {
      if ((next.element as HTMLButtonElement).disabled) break;
      await next.trigger('click');
    }
    expect((next.element as HTMLButtonElement).disabled).toBe(true);
  });

  it('repairs an invalid query instead of failing', () => {
    const wrapper = montar('tb=abc&bpc=999&tpb=-3&sk=weird&si=');
    expect(wrapper.get('[data-test="chunk-count-expr"]').text()).not.toBe('');
  });

  describe('comprehension exercise', () => {
    it('shows the exact configuration from the mission brief', () => {
      const wrapper = montar();
      expect(wrapper.get('.exercise-case-config').text()).toContain('96 bytes totales');
      expect(wrapper.get('.exercise-case-config').text()).toContain('chunks de 16 bytes');
      expect(wrapper.get('.exercise-case-config').text()).toContain('4 hilos por bloque');
    });

    it('gives explanatory feedback distinguishing correct from incorrect answers', async () => {
      const wrapper = montar();
      const primeraPregunta = wrapper.findAll('.check-card')[0];
      const opciones = primeraPregunta?.findAll('input[type="radio"]') ?? [];
      expect(opciones.length).toBeGreaterThan(1);
      for (const opcion of opciones) {
        await opcion.setValue(true);
        expect(primeraPregunta?.get('.feedback').text()).toMatch(/Correcto\.|Todavía no\./);
      }
    });
  });

  describe('accessibility', () => {
    it('uses native buttons for every interactive cell', () => {
      const wrapper = montar('tb=64&bpc=8&tpb=4');
      for (const el of wrapper.findAll('.cell-button')) {
        expect(el.element.tagName).toBe('BUTTON');
      }
    });

    it('gives every cell a screen-reader label with index and value', () => {
      const wrapper = montar('tb=64&bpc=8&tpb=4');
      for (const el of wrapper.findAll('.cell-button')) {
        expect(el.find('.sr-only').text().length).toBeGreaterThan(0);
      }
    });
  });
});
