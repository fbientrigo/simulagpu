// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { nextTick } from 'vue';

import InteractiveAnkiReviewer from './InteractiveAnkiReviewer.vue';

const payload = {
  version: 1,
  deck: 'SimulaGPU::01 Índice global',
  cards: [
    {
      id: 'idx-001',
      tipo: 'conceptual',
      frontHtml: '¿Qué identifica <code>threadIdx.x</code>?',
      backHtml: 'El thread dentro de su bloque.',
      tags: ['indice', 'idx-001'],
    },
    {
      id: 'idx-002',
      tipo: 'calculo',
      frontHtml: 'Calcula <code>i</code>.',
      backHtml: '<code>i = blockIdx.x * blockDim.x + threadIdx.x</code>',
      tags: ['indice', 'idx-002'],
    },
  ],
};

async function mountReviewer() {
  const wrapper = mount(InteractiveAnkiReviewer, { props: { source: '/data/simulagpu-anki.json' } });
  await flushPromises();
  return wrapper;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => payload,
    }),
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('InteractiveAnkiReviewer', () => {
  it('loads the generated web deck and reveals only after learner action', async () => {
    const wrapper = await mountReviewer();

    expect(fetch).toHaveBeenCalledWith('/data/simulagpu-anki.json');
    expect(wrapper.get('.review-progress strong').text()).toBe('1 / 2');
    expect(wrapper.get('.card-front').attributes('aria-hidden')).toBe('false');
    expect(wrapper.get('.card-back').attributes('aria-hidden')).toBe('true');
    expect(wrapper.find('[data-test="rating-actions"]').exists()).toBe(false);

    await wrapper.get('[data-test="interactive-card"]').trigger('click');

    expect(wrapper.get('.card-flip').classes()).toContain('revealed');
    expect(wrapper.get('.card-front').attributes('aria-hidden')).toBe('true');
    expect(wrapper.get('.card-back').attributes('aria-hidden')).toBe('false');
    expect(wrapper.find('[data-test="rating-actions"]').exists()).toBe(true);
  });

  it('supports keyboard reveal and native rating buttons', async () => {
    const wrapper = await mountReviewer();
    const card = wrapper.get('[data-test="interactive-card"]');

    expect(card.attributes('role')).toBe('button');
    expect(card.attributes('tabindex')).toBe('0');

    await card.trigger('keydown', { key: 'Enter' });
    expect(wrapper.get('.card-flip').classes()).toContain('revealed');

    await wrapper.get('[data-test="known-button"]').trigger('click');
    vi.runAllTimers();
    await nextTick();

    expect(wrapper.get('.review-progress strong').text()).toBe('2 / 2');
    expect(wrapper.get('.review-progress').text()).toContain('1 recordadas');
    expect(wrapper.get('.card-meta code').text()).toBe('idx-002');
  });

  it('maps a revealed right swipe to known and a left swipe to review', async () => {
    const wrapper = await mountReviewer();
    let card = wrapper.get('[data-test="interactive-card"]');
    await card.trigger('click');

    await card.trigger('pointerdown', {
      pointerId: 1,
      pointerType: 'touch',
      button: 0,
      clientX: 100,
      clientY: 100,
    });
    await card.trigger('pointermove', {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 230,
      clientY: 100,
    });
    await card.trigger('pointerup', {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 230,
      clientY: 100,
    });
    vi.runAllTimers();
    await nextTick();

    expect(wrapper.get('.review-progress').text()).toContain('1 recordadas');

    card = wrapper.get('[data-test="interactive-card"]');
    await card.trigger('keydown', { key: 'Enter' });
    await card.trigger('pointerdown', {
      pointerId: 2,
      pointerType: 'touch',
      button: 0,
      clientX: 230,
      clientY: 100,
    });
    await card.trigger('pointermove', {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 90,
      clientY: 100,
    });
    await card.trigger('pointerup', {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 90,
      clientY: 100,
    });
    vi.runAllTimers();
    await nextTick();

    expect(wrapper.get('[data-test="review-complete"]').text()).toContain('1 de 2 recordadas');
    expect(wrapper.get('[data-test="review-complete"]').text()).toContain('1 quedaron marcadas');
  });

  it('returns to the first card without changing the canonical deck', async () => {
    const wrapper = await mountReviewer();

    for (let index = 0; index < payload.cards.length; index += 1) {
      await wrapper.get('[data-test="interactive-card"]').trigger('click');
      await wrapper.get('[data-test="known-button"]').trigger('click');
      vi.runAllTimers();
      await nextTick();
    }

    await wrapper.get('[data-test="review-complete"] button').trigger('click');
    expect(wrapper.get('.review-progress strong').text()).toBe('1 / 2');
    expect(wrapper.get('.card-meta code').text()).toBe('idx-001');
  });
});
