// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';

import LaboratorioAccesoMemoria from './LaboratorioAccesoMemoria.vue';

describe('LaboratorioAccesoMemoria', () => {
  it('starts with the contiguous logical mapping', () => {
    const wrapper = mount(LaboratorioAccesoMemoria);
    expect(wrapper.get('[data-test="independent-stage"]').text()).toContain('hilo 0 → dirección lógica [0]');
    expect(wrapper.get('[data-test="independent-stage"]').text()).toContain('hilo 1 → dirección lógica [1]');
  });

  it('shows a fixed strided mapping without modulo wrapping', async () => {
    const wrapper = mount(LaboratorioAccesoMemoria);
    await wrapper.findAll('button')[4]!.trigger('click');
    await nextTick();
    const stage = wrapper.get('[data-test="independent-stage"]');
    expect(stage.text()).toContain('hilo 4 → dirección lógica [8] (fuera del rango)');
    expect(stage.text()).toContain('hilo 5 → dirección lógica [10] (fuera del rango)');
    expect(stage.text()).toContain('2, 2, 2, 2, 2');
  });

  it('reveals the known block-local barrier at the cooperative stage with Spanish role labels', async () => {
    const wrapper = mount(LaboratorioAccesoMemoria);
    await wrapper.findAll('button')[1]!.trigger('click');
    await nextTick();
    const stage = wrapper.get('[data-test="cooperative-stage"]');
    expect(stage.text()).toContain('__syncthreads()');
    expect(stage.text()).toContain('mismo bloque');
    expect(stage.text()).toContain('izquierda:');
    expect(stage.text()).toContain('propio:');
    expect(stage.text()).toContain('derecha:');
    expect(stage.text()).not.toMatch(/\b(left|self|right):/);
  });

  it('motivates reuse without teaching shared-memory operational semantics', async () => {
    const wrapper = mount(LaboratorioAccesoMemoria);
    await wrapper.findAll('button')[2]!.trigger('click');
    await nextTick();
    const stage = wrapper.get('[data-test="reuse-stage"]');
    expect(stage.text()).toContain('oportunidad de reutilización');
    expect(stage.text()).toContain('__shared__');
    expect(stage.text()).toContain('aquí no declaramos ni operamos');
  });
});
