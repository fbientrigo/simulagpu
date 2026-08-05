// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

import SimuladorIsometricoGPU from './SimuladorIsometricoGPU.vue';

const montar = (initialQuery: string) =>
  mount(SimuladorIsometricoGPU, { props: { initialQuery, syncUrl: false } });

const texto = (wrapper: ReturnType<typeof montar>, test: string) =>
  wrapper.get(`[data-test="${test}"]`).text();

const boton = (wrapper: ReturnType<typeof montar>, test: string) => wrapper.get(`[data-test="${test}"]`);

describe('SimuladorIsometricoGPU', () => {
  it('shows a Spanish title', () => {
    const wrapper = montar('');
    expect(wrapper.get('#sim-titulo').text()).toContain('Simulador isométrico de GPU');
  });

  it('shows the explanatory-model disclaimer', () => {
    const wrapper = montar('');
    const aviso = texto(wrapper, 'aviso');
    expect(aviso).toContain('modelo explicativo determinista');
    expect(aviso).toContain('No ejecuta CUDA');
    expect(aviso).toContain('no mide rendimiento real');
  });

  it('renders the initial chunk, block and thread counts from the model', () => {
    const wrapper = montar('tb=96&bpc=16&tpb=4&sk=thread&si=7');
    expect(texto(wrapper, 'chunk-count')).toBe('6');
    expect(texto(wrapper, 'block-count')).toBe('2');
    expect(texto(wrapper, 'inactive-threads')).toBe('2');
  });

  it('shows the substituted formulas', () => {
    const wrapper = montar('tb=64&bpc=8&tpb=4');
    expect(texto(wrapper, 'chunk-substituted')).toBe('número de chunks = ceil(64 / 8)');
    expect(texto(wrapper, 'chunk-evaluated')).toBe('número de chunks = 8');
    expect(texto(wrapper, 'block-substituted')).toBe('número de bloques = ceil(8 / 4)');
    expect(texto(wrapper, 'block-evaluated')).toBe('número de bloques = 2');
  });

  it('rebuilds the snapshot when a control changes', async () => {
    const wrapper = montar('tb=96&bpc=16&tpb=4');
    await wrapper.get('[data-test="control-total-bytes"]').setValue('256');
    await wrapper.get('[data-test="control-bytes-per-chunk"]').setValue('32');
    await wrapper.get('[data-test="control-threads-per-block"]').setValue('8');

    expect(texto(wrapper, 'chunk-count')).toBe('8');
    expect(texto(wrapper, 'block-count')).toBe('1');
    expect(texto(wrapper, 'inactive-threads')).toBe('0');
  });

  it('moves forward and backward through the guided steps', async () => {
    const wrapper = montar('');
    expect(texto(wrapper, 'paso-indicador')).toContain('Paso 1 de 10');

    await boton(wrapper, 'paso-siguiente').trigger('click');
    expect(texto(wrapper, 'paso-indicador')).toContain('Paso 2 de 10');

    await boton(wrapper, 'paso-anterior').trigger('click');
    expect(texto(wrapper, 'paso-indicador')).toContain('Paso 1 de 10');
  });

  it('does not step before the first or after the last step', async () => {
    const wrapper = montar('');
    await boton(wrapper, 'paso-anterior').trigger('click');
    expect(texto(wrapper, 'paso-indicador')).toContain('Paso 1 de 10');

    for (let i = 0; i < 12; i += 1) {
      await boton(wrapper, 'paso-siguiente').trigger('click');
    }
    expect(texto(wrapper, 'paso-indicador')).toContain('Paso 10 de 10');
  });

  it('restart returns to the first step', async () => {
    const wrapper = montar('');
    await boton(wrapper, 'paso-siguiente').trigger('click');
    await boton(wrapper, 'paso-siguiente').trigger('click');
    expect(texto(wrapper, 'paso-indicador')).toContain('Paso 3 de 10');

    await boton(wrapper, 'reiniciar').trigger('click');
    expect(texto(wrapper, 'paso-indicador')).toContain('Paso 1 de 10');
  });

  it('changes the step narration text as steps advance', async () => {
    const wrapper = montar('');
    const primerTitulo = texto(wrapper, 'paso-titulo');
    await boton(wrapper, 'paso-siguiente').trigger('click');
    const segundoTitulo = texto(wrapper, 'paso-titulo');
    expect(segundoTitulo).not.toBe(primerTitulo);
  });

  it('starts and pauses automatic playback deterministically, using fake timers', async () => {
    vi.useFakeTimers();
    try {
      const wrapper = montar('');
      await boton(wrapper, 'reproducir').trigger('click');
      expect(texto(wrapper, 'paso-indicador')).toContain('Paso 1 de 10');

      await vi.advanceTimersByTimeAsync(1800);
      expect(texto(wrapper, 'paso-indicador')).toContain('Paso 2 de 10');

      await vi.advanceTimersByTimeAsync(1800);
      expect(texto(wrapper, 'paso-indicador')).toContain('Paso 3 de 10');

      await boton(wrapper, 'pausar').trigger('click');
      await vi.advanceTimersByTimeAsync(10_000);
      expect(texto(wrapper, 'paso-indicador')).toContain('Paso 3 de 10');
    } finally {
      vi.useRealTimers();
    }
  });

  it('automatic playback stops by itself at the last step', async () => {
    vi.useFakeTimers();
    try {
      const wrapper = montar('');
      await boton(wrapper, 'reproducir').trigger('click');
      await vi.advanceTimersByTimeAsync(1800 * 20);
      expect(texto(wrapper, 'paso-indicador')).toContain('Paso 10 de 10');
      // The play button must be available again once playback stopped on its own.
      expect(wrapper.find('[data-test="reproducir"]').exists()).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('updates the explanation panel when a chunk is selected', async () => {
    const wrapper = montar('tb=96&bpc=16&tpb=4');
    const chunkButtons = wrapper.findAll('.sim-chunk');
    await chunkButtons[2]?.trigger('click');
    expect(texto(wrapper, 'seleccion-descripcion')).toContain('Chunk 2');
  });

  it('updates the explanation panel when a block is selected', async () => {
    const wrapper = montar('tb=96&bpc=16&tpb=4');
    const blockButtons = wrapper.findAll('.sim-bloque');
    await blockButtons[1]?.trigger('click');
    expect(texto(wrapper, 'seleccion-descripcion')).toContain('Bloque 1');
  });

  it('updates the explanation panel when a thread is selected', async () => {
    const wrapper = montar('tb=96&bpc=16&tpb=4');
    const threadButtons = wrapper.findAll('.sim-hilo');
    await threadButtons[threadButtons.length - 1]?.trigger('click');
    expect(texto(wrapper, 'seleccion-descripcion')).toContain('inactivo');
  });

  it('visually and textually distinguishes inactive threads', () => {
    const wrapper = montar('tb=96&bpc=16&tpb=4');
    const inactivos = wrapper.findAll('.sim-hilo--inactivo');
    const activos = wrapper.findAll('.sim-hilo--activo');
    expect(inactivos).toHaveLength(2);
    expect(activos).toHaveLength(6);
    for (const hilo of inactivos) {
      expect(hilo.attributes('aria-label')).toContain('inactivo');
    }
  });

  it('exposes a shareable configuration string', () => {
    const wrapper = montar('tb=96&bpc=16&tpb=4&sk=thread&si=7');
    expect(texto(wrapper, 'enlace')).toBe('?tb=96&bpc=16&tpb=4&sk=thread&si=7');
  });

  it('repairs an invalid query instead of failing', () => {
    const wrapper = montar('tb=abc&bpc=999&tpb=-3&sk=weird&si=');
    expect(texto(wrapper, 'chunk-count')).not.toBe('');
  });

  describe('mini exercise', () => {
    it('shows the exact configuration from the mission brief', () => {
      const wrapper = montar('');
      const casos = wrapper.findAll('[data-test="ejercicio-caso"]');
      expect(casos.length).toBeGreaterThanOrEqual(2);
      expect(wrapper.text()).toContain('96 bytes totales, chunks de 16 bytes, 4 hilos por bloque');
    });

    it('gives explanatory feedback for a correct answer', async () => {
      const wrapper = montar('');
      const primerCaso = wrapper.get('[data-test="ejercicio-caso"]');
      const primeraOpcion = primerCaso.findAll('.sim-opcion')[0];
      expect(primeraOpcion).toBeDefined();
      await primeraOpcion?.trigger('click');
      const feedback = primerCaso.find('[data-test="pregunta-feedback"]');
      expect(feedback.exists()).toBe(true);
      expect(feedback.text().length).toBeGreaterThan(0);
    });

    it('distinguishes correct from incorrect feedback', async () => {
      const wrapper = montar('');
      const pregunta = wrapper.findAll('.sim-pregunta')[0];
      expect(pregunta).toBeDefined();
      const opciones = pregunta?.findAll('.sim-opcion') ?? [];

      for (const opcion of opciones) {
        await opcion.trigger('click');
        const feedback = pregunta?.get('[data-test="pregunta-feedback"]');
        expect(feedback?.text()).toMatch(/¡Correcto!|No es correcto\./);
      }
    });
  });

  describe('accessibility', () => {
    it('labels every control', () => {
      const wrapper = montar('');
      expect(wrapper.get('[data-test="control-total-bytes"]').attributes('aria-label')).toBeTruthy();
      expect(wrapper.get('[data-test="control-bytes-per-chunk"]').attributes('aria-label')).toBeTruthy();
      expect(wrapper.get('[data-test="control-threads-per-block"]').attributes('aria-label')).toBeTruthy();
      expect(wrapper.get('[data-test="control-modo"]').attributes('aria-label')).toBeTruthy();
    });

    it('labels every chunk, block and thread for assistive technology', () => {
      const wrapper = montar('tb=64&bpc=8&tpb=4');
      for (const el of wrapper.findAll('.sim-chunk')) {
        expect(el.attributes('aria-label')).toBeTruthy();
      }
      for (const el of wrapper.findAll('.sim-bloque')) {
        expect(el.attributes('aria-label')).toBeTruthy();
      }
      for (const el of wrapper.findAll('.sim-hilo')) {
        expect(el.attributes('aria-label')).toBeTruthy();
      }
    });

    it('uses native buttons for every interactive tile, so they are keyboard-activatable by default', () => {
      const wrapper = montar('tb=64&bpc=8&tpb=4');
      for (const el of [
        ...wrapper.findAll('.sim-chunk'),
        ...wrapper.findAll('.sim-bloque'),
        ...wrapper.findAll('.sim-hilo'),
      ]) {
        expect(el.element.tagName).toBe('BUTTON');
      }
    });
  });
});
