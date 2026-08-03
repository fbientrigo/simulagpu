// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

import ExploradorIndiceGlobal from './ExploradorIndiceGlobal.vue';

const montar = (initialQuery: string) =>
  mount(ExploradorIndiceGlobal, { props: { initialQuery, syncUrl: false } });

const texto = (wrapper: ReturnType<typeof montar>, test: string) =>
  wrapper.get(`[data-test="${test}"]`).text();

describe('ExploradorIndiceGlobal', () => {
  it('renders the values the model computed for the initial query', () => {
    const wrapper = montar('n=100&bs=32&b=3&t=5');

    expect(texto(wrapper, 'grid-size')).toBe('4');
    expect(texto(wrapper, 'total-threads')).toBe('128');
    expect(texto(wrapper, 'inactive-threads')).toBe('28');
    expect(texto(wrapper, 'index-substituted')).toBe('i = 3 * 32 + 5');
    expect(texto(wrapper, 'index-evaluated')).toBe('i = 101');
    expect(texto(wrapper, 'grid-substituted')).toBe('gridDim.x = (100 + 32 - 1) / 32');
  });

  it('draws one element per thread of the grid', () => {
    const wrapper = montar('n=100&bs=32&b=0&t=0');
    expect(wrapper.findAll('.sgpu-hilo')).toHaveLength(128);
    expect(wrapper.findAll('.sgpu-hilo--activo')).toHaveLength(100);
    expect(wrapper.findAll('.sgpu-hilo--inactivo')).toHaveLength(28);
  });

  it('explains why a boundary thread is inactive', () => {
    const wrapper = montar('n=100&bs=32&b=3&t=5');
    expect(texto(wrapper, 'veredicto')).toContain('inactivo');
  });

  it('explains what an active thread writes', () => {
    const wrapper = montar('n=100&bs=32&b=3&t=1');
    const veredicto = texto(wrapper, 'veredicto');
    expect(veredicto).toContain('activo');
    expect(veredicto).toContain('c[97]');
  });

  it('rebuilds the snapshot when a control changes', async () => {
    const wrapper = montar('n=100&bs=32&b=0&t=0');
    await wrapper.get('select').setValue('16');

    expect(texto(wrapper, 'grid-size')).toBe('7');
    expect(texto(wrapper, 'total-threads')).toBe('112');
    expect(texto(wrapper, 'inactive-threads')).toBe('12');
  });

  it('reports an evenly divisible launch as having no partial block', async () => {
    const wrapper = montar('n=128&bs=32&b=0&t=0');
    expect(texto(wrapper, 'partial-block')).toBe('no');
    expect(wrapper.findAll('.sgpu-hilo--inactivo')).toHaveLength(0);
  });

  it('changes what is shown, not what is computed, when the stage changes', async () => {
    const wrapper = montar('n=100&bs=32&b=3&t=5');
    const antes = {
      grid: texto(wrapper, 'grid-size'),
      indice: texto(wrapper, 'index-evaluated'),
      inactivos: texto(wrapper, 'inactive-threads'),
      hilos: wrapper.findAll('.sgpu-hilo').length,
    };

    const botones = wrapper.findAll('.sgpu-vista');
    await botones[0]?.trigger('click');
    expect(wrapper.findAll('.sgpu-hilo')[0]?.text()).toContain('t0');

    await botones[2]?.trigger('click');
    expect(wrapper.findAll('.sgpu-hilo')[0]?.text()).toContain('c[0]');

    expect({
      grid: texto(wrapper, 'grid-size'),
      indice: texto(wrapper, 'index-evaluated'),
      inactivos: texto(wrapper, 'inactive-threads'),
      hilos: wrapper.findAll('.sgpu-hilo').length,
    }).toEqual(antes);
  });

  it('exposes a shareable configuration string', () => {
    const wrapper = montar('n=100&bs=32&b=3&t=5');
    expect(texto(wrapper, 'enlace')).toBe('?n=100&bs=32&b=3&t=5');
  });

  it('summarizes instead of drawing an unbounded number of blocks', () => {
    const wrapper = montar('n=4096&bs=1&b=0&t=0');
    expect(wrapper.findAll('.sgpu-bloque')).toHaveLength(64);
    expect(texto(wrapper, 'truncado')).toContain('4096');
  });

  it('labels every thread for screen readers', () => {
    const wrapper = montar('n=4&bs=4&b=0&t=0');
    const etiquetas = wrapper.findAll('.sgpu-sr-solo').map((node) => node.text());
    expect(etiquetas[0]).toBe('Bloque 0, hilo 0, índice global 0. Activo: escribe c[0].');
  });

  it('repairs an invalid query instead of failing', () => {
    const wrapper = montar('n=abc&bs=999&b=-3&t=');
    expect(texto(wrapper, 'grid-size')).toBe('1');
  });
});
