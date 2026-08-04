// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

import LaboratorioReduccion from './LaboratorioReduccion.vue';

const mountLab = () => mount(LaboratorioReduccion);
const text = (wrapper: ReturnType<typeof mountLab>, test: string) =>
  wrapper.get(`[data-test="${test}"]`).text();

describe('LaboratorioReduccion', () => {
  it('renders the deterministic power-of-two reduction', () => {
    const wrapper = mountLab();

    expect(text(wrapper, 'initial-values')).toBe('[3, 1, 7, 0, 4, 1, 6, 3]');
    expect(text(wrapper, 'reference')).toBe('25');
    expect(text(wrapper, 'result')).toBe('25');
    expect(wrapper.findAll('.sgpu-par')).toHaveLength(4);
  });

  it('shows the odd tail and preserves it with zero', async () => {
    const wrapper = mountLab();
    await wrapper.get('[data-test="preset"]').setValue('tamano-impar');

    expect(text(wrapper, 'reference')).toBe('29');
    expect(text(wrapper, 'result')).toBe('29');
    expect(text(wrapper, 'reduction-pass')).toContain('sin pareja');
  });

  it('makes a broken pair mapping visible', async () => {
    const wrapper = mountLab();
    await wrapper.get('[data-test="index-strategy"]').setValue('pares-solapados');

    expect(text(wrapper, 'result')).not.toBe(text(wrapper, 'reference'));
    expect(text(wrapper, 'diagnostics')).toContain('reutiliza elementos');
  });

  it('starts with an incorrect exercise and reports failing boundary cases', async () => {
    const wrapper = mountLab();
    await wrapper.get('[data-test="run-tests"]').trigger('click');

    expect(text(wrapper, 'exercise-summary')).toContain('Aún hay fallos');
    expect(wrapper.findAll('.sgpu-caso--falla').length).toBeGreaterThan(0);
  });

  it('passes after selecting the three correct fragments', async () => {
    const wrapper = mountLab();
    await wrapper.get('[data-test="left-expression"]').setValue('2 * out');
    await wrapper.get('[data-test="right-expression"]').setValue('left + 1 < n ? input[left + 1] : 0.0f');
    await wrapper.get('[data-test="write-expression"]').setValue('output[out]');
    await wrapper.get('[data-test="run-tests"]').trigger('click');

    expect(text(wrapper, 'exercise-summary')).toContain('Pruebas aprobadas');
    expect(wrapper.findAll('.sgpu-caso--correcto')).toHaveLength(3);
    expect(text(wrapper, 'assembled-code')).toContain('const int left = 2 * out;');
  });

  it('states that the runner is not a CUDA compiler or GPU execution', () => {
    const wrapper = mountLab();
    expect(wrapper.text()).toContain('No compila CUDA');
    expect(wrapper.text()).toContain('no usa una GPU');
  });
});
