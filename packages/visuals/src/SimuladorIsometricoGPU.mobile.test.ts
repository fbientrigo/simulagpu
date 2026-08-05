// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

import SimuladorIsometricoGPU from './SimuladorIsometricoGPU.vue';

const montar = (initialQuery = 'tb=96&bpc=16&tpb=4&sk=block&si=1') =>
  mount(SimuladorIsometricoGPU, { props: { initialQuery, syncUrl: false } });

describe('SimuladorIsometricoGPU mobile-first guided layout', () => {
  it('puts the current step and progress at the top of the experience', async () => {
    const wrapper = montar();
    const progreso = wrapper.get('[data-test="paso-progreso"]');

    expect(wrapper.get('[data-test="paso-indicador"]').text()).toContain('Paso 1 de 10');
    expect(progreso.attributes('aria-valuenow')).toBe('1');
    expect(progreso.get('.sim-progreso__relleno').attributes('style')).toContain('width: 10%');

    await wrapper.get('[data-test="paso-siguiente"]').trigger('click');
    expect(wrapper.get('[data-test="paso-indicador"]').text()).toContain('Paso 2 de 10');
    expect(progreso.attributes('aria-valuenow')).toBe('2');
    expect(progreso.get('.sim-progreso__relleno').attributes('style')).toContain('width: 20%');
  });

  it('keeps the explanatory-model boundary visible before the interactive scene', () => {
    const wrapper = montar();
    const aviso = wrapper.get('[data-test="aviso"]');

    expect(aviso.text()).toContain('modelo explicativo determinista');
    expect(aviso.text()).toContain('No ejecuta CUDA');
    expect(aviso.element.compareDocumentPosition(wrapper.get('[data-test="escena-interactiva"]').element)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('keeps configuration compact while preserving all controls', () => {
    const wrapper = montar();
    const configuracion = wrapper.get('[data-test="configuracion"]');

    expect(configuracion.element.tagName).toBe('DETAILS');
    expect(configuracion.attributes('open')).toBeUndefined();
    expect(configuracion.text()).toContain('96 B · 16 B/chunk · 4 hilos/bloque');
    expect(configuracion.findAll('select')).toHaveLength(4);
  });

  it('keeps the calculated counts and substituted formulas visible without opening configuration', () => {
    const wrapper = montar();

    expect(wrapper.get('[data-test="chunk-count"]').text()).toBe('6');
    expect(wrapper.get('[data-test="block-count"]').text()).toBe('2');
    expect(wrapper.get('[data-test="inactive-threads"]').text()).toBe('2');
    expect(wrapper.get('[data-test="chunk-substituted"]').text()).toContain('ceil(96 / 16)');
    expect(wrapper.get('[data-test="block-substituted"]').text()).toContain('ceil(6 / 4)');
  });

  it('visibly changes the focused stage as the guided sequence advances', async () => {
    const wrapper = montar();
    const escena = wrapper.get('[data-test="escena-interactiva"] .sim-escena');

    expect(escena.classes()).toContain('sim-escena--foco-cpu');
    await wrapper.get('[data-test="paso-siguiente"]').trigger('click');
    await wrapper.get('[data-test="paso-siguiente"]').trigger('click');
    expect(escena.classes()).toContain('sim-escena--foco-transferencia');
  });

  it('shows selection feedback directly after interacting with the scene', async () => {
    const wrapper = montar();
    const chunks = wrapper.findAll('.sim-chunk');

    await chunks[3]?.trigger('click');
    expect(wrapper.get('[data-test="seleccion-chip"]').text()).toContain('Chunk c3');
    expect(wrapper.get('[data-test="seleccion-descripcion"]').text()).toContain('Chunk 3');
  });

  it('keeps inactive slots explicit inside the compact block grid', () => {
    const wrapper = montar();

    expect(wrapper.findAll('.sim-hilo--activo')).toHaveLength(6);
    expect(wrapper.findAll('.sim-hilo--inactivo')).toHaveLength(2);
    expect(wrapper.findAll('.sim-bloque-contenedor')).toHaveLength(2);
  });

  it('provides a compact four-action guided navigation bar', () => {
    const wrapper = montar();
    const navegacion = wrapper.get('[data-test="navegacion-pasos"]');

    expect(navegacion.findAll('button')).toHaveLength(4);
    expect(navegacion.text()).toContain('Anterior');
    expect(navegacion.text()).toContain('Reproducir');
    expect(navegacion.text()).toContain('Siguiente');
    expect(navegacion.text()).toContain('Reiniciar');
  });
});
