// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

import ExploradorIndiceGlobal from './ExploradorIndiceGlobal.vue';

const montar = (initialQuery = '') =>
  mount(ExploradorIndiceGlobal, { props: { initialQuery, syncUrl: false } });

type Wrapper = ReturnType<typeof montar>;

const texto = (wrapper: Wrapper, test: string) => wrapper.get(`[data-test="${test}"]`).text();
const existe = (wrapper: Wrapper, test: string) => wrapper.find(`[data-test="${test}"]`).exists();
const valor = (wrapper: Wrapper, test: string) =>
  (wrapper.get(`[data-test="${test}"]`).element as HTMLInputElement | HTMLSelectElement).value;

const pulsar = (wrapper: Wrapper, test: string) => wrapper.get(`[data-test="${test}"]`).trigger('click');
const responder = (wrapper: Wrapper, opcion: string) => pulsar(wrapper, `checkpoint-opcion-${opcion}`);

async function avanzar(wrapper: Wrapper, veces = 1): Promise<void> {
  for (let paso = 0; paso < veces; paso += 1) {
    await pulsar(wrapper, 'paso-siguiente');
  }
}

const hilos = (wrapper: Wrapper) => wrapper.findAll('.sgpu-hilo');
const modoLibre = (wrapper: Wrapper) => pulsar(wrapper, 'modo-libre');

/**
 * The walkthrough opens on n = 10 with blocks of 4: three blocks, twelve
 * threads, two of them discarded. Every guided expectation below is that
 * launch.
 */
describe('recorrido guiado', () => {
  it('is the default experience and opens on the small preset', () => {
    const wrapper = montar();

    expect(texto(wrapper, 'paso-progreso')).toBe('Paso 1 de 6');
    expect(texto(wrapper, 'paso-titulo')).toBe('El problema');
    expect(valor(wrapper, 'n')).toBe('10');
    expect(valor(wrapper, 'block-size')).toBe('4');
    expect(texto(wrapper, 'paso-detalle')).toBe('n = 10 elementos, blockDim.x = 4 hilos por bloque');
  });

  it('holds back the dashboard the free explorer shows', () => {
    const wrapper = montar();

    for (const dato of ['grid-size', 'total-threads', 'inactive-threads', 'partial-block', 'enlace']) {
      expect(existe(wrapper, dato), `${dato} no debería estar en el modo guiado`).toBe(false);
    }
  });

  it('does not draw the grid until the step that explains how many blocks there are', async () => {
    const wrapper = montar();
    expect(hilos(wrapper)).toHaveLength(0);

    await avanzar(wrapper);
    expect(texto(wrapper, 'paso-titulo')).toBe('¿Cuántos bloques hacen falta?');
    expect(hilos(wrapper)).toHaveLength(12);
  });

  it('asks how many blocks are launched before revealing the division', async () => {
    const wrapper = montar();
    await avanzar(wrapper);

    expect(texto(wrapper, 'checkpoint-pregunta')).toContain('¿cuántos bloques lanza el host?');
    expect(existe(wrapper, 'paso-detalle')).toBe(false);

    await responder(wrapper, 'n-3');

    expect(texto(wrapper, 'checkpoint-respuesta')).toContain('Correcto');
    expect(texto(wrapper, 'paso-detalle')).toBe('gridDim.x = (10 + 4 - 1) / 4 = 3');
  });

  it('explains the floor-division mistake instead of only rejecting it', async () => {
    const wrapper = montar();
    await avanzar(wrapper);
    await responder(wrapper, 'n-2');

    const respuesta = texto(wrapper, 'checkpoint-respuesta');
    expect(respuesta).toContain('división hacia abajo');
    expect(respuesta).toContain('2 elementos se quedarían sin calcular');
  });

  it('keeps the global index off the screen until the learner has computed one', async () => {
    const wrapper = montar();
    await avanzar(wrapper, 3);
    expect(texto(wrapper, 'paso-titulo')).toBe('El índice global');

    // The cells still show threadIdx.x, and the card still hides i.
    expect(hilos(wrapper)[5]?.text()).toBe('t1');
    expect(texto(wrapper, 'tarjeta-indice')).toBe('?');

    await responder(wrapper, 'n-0');

    expect(hilos(wrapper)[5]?.text()).toBe('5');
    expect(texto(wrapper, 'tarjeta-indice')).toBe('0');
  });

  it('keeps active and discarded threads indistinguishable until the guard step', async () => {
    const wrapper = montar();
    await avanzar(wrapper);

    expect(wrapper.findAll('.sgpu-hilo--neutro')).toHaveLength(12);
    expect(wrapper.findAll('.sgpu-hilo--activo')).toHaveLength(0);
    expect(wrapper.findAll('.sgpu-hilo--inactivo')).toHaveLength(0);
    expect(existe(wrapper, 'tarjeta-estado')).toBe(false);
  });

  it('selects a thread by touching the grid, with no blockIdx or threadIdx slider', async () => {
    const wrapper = montar();
    await avanzar(wrapper, 2);
    expect(texto(wrapper, 'paso-titulo')).toBe('Ponte en el lugar de un hilo');
    expect(wrapper.findAll('input[type="range"]')).toHaveLength(0);

    // Sixth cell of the grid: block 1, thread 1.
    await hilos(wrapper)[5]?.trigger('click');

    expect(texto(wrapper, 'tarjeta-bloque')).toBe('1');
    expect(texto(wrapper, 'tarjeta-hilo')).toBe('1');
    expect(texto(wrapper, 'tarjeta-indice')).toBe('?');
  });

  it('walks to the next thread across a block boundary', async () => {
    const wrapper = montar();
    await avanzar(wrapper, 2);
    await hilos(wrapper)[3]?.trigger('click');
    expect(texto(wrapper, 'tarjeta-bloque')).toBe('0');
    expect(texto(wrapper, 'tarjeta-hilo')).toBe('3');

    await pulsar(wrapper, 'hilo-siguiente');

    expect(texto(wrapper, 'tarjeta-bloque')).toBe('1');
    expect(texto(wrapper, 'tarjeta-hilo')).toBe('0');

    await pulsar(wrapper, 'hilo-anterior');
    expect(texto(wrapper, 'tarjeta-bloque')).toBe('0');
    expect(texto(wrapper, 'tarjeta-hilo')).toBe('3');
  });

  it('marks the index checkpoint against the model, not against the view', async () => {
    const wrapper = montar();
    await avanzar(wrapper, 2);
    await hilos(wrapper)[5]?.trigger('click');
    await avanzar(wrapper);

    // blockIdx.x = 1, blockDim.x = 4, threadIdx.x = 1 -> i = 5, and 1 + 1 = 2 is the classic slip.
    await responder(wrapper, 'n-2');
    expect(texto(wrapper, 'checkpoint-respuesta')).toContain('Sumaste los dos índices');

    await responder(wrapper, 'n-5');
    expect(texto(wrapper, 'checkpoint-respuesta')).toContain('Correcto: i = 1 * 4 + 1 = 5.');
    expect(texto(wrapper, 'paso-detalle')).toBe('i = 1 * 4 + 1 = 5');
  });

  it('evaluates the guard for the selected thread and reveals its verdict', async () => {
    const wrapper = montar();
    await avanzar(wrapper, 2);
    await hilos(wrapper)[5]?.trigger('click');
    await avanzar(wrapper, 2);
    expect(texto(wrapper, 'paso-titulo')).toBe('El guard if (i < n)');
    expect(texto(wrapper, 'tarjeta-estado')).toBe('?');

    await responder(wrapper, 'writes');

    expect(texto(wrapper, 'checkpoint-respuesta')).toContain('Correcto: 5 < 10 es verdadero');
    expect(texto(wrapper, 'tarjeta-estado')).toBe('activo');
    expect(wrapper.findAll('.sgpu-hilo--activo')).toHaveLength(10);
    expect(wrapper.findAll('.sgpu-hilo--inactivo')).toHaveLength(2);
  });

  it('jumps to a discarded thread and asks the guard question again about it', async () => {
    const wrapper = montar();
    await avanzar(wrapper, 4);
    await pulsar(wrapper, 'hilo-descartado');

    // The first thread the guard throws away is the one with i == n.
    expect(texto(wrapper, 'checkpoint-pregunta')).toContain('i = 10');
    expect(texto(wrapper, 'tarjeta-bloque')).toBe('2');
    expect(texto(wrapper, 'tarjeta-hilo')).toBe('2');

    await responder(wrapper, 'writes');
    expect(texto(wrapper, 'checkpoint-respuesta')).toContain('fuera del arreglo c');

    await responder(wrapper, 'skips');
    expect(texto(wrapper, 'checkpoint-respuesta')).toContain('termina sin escribir nada');
    expect(texto(wrapper, 'tarjeta-estado')).toBe('descartado');
  });

  it('ends by naming the element the thread processes', async () => {
    const wrapper = montar();
    await avanzar(wrapper, 2);
    await hilos(wrapper)[5]?.trigger('click');
    await avanzar(wrapper, 3);

    expect(texto(wrapper, 'paso-progreso')).toBe('Paso 6 de 6');
    expect(texto(wrapper, 'tarjeta-operacion')).toBe('?');

    await responder(wrapper, 'ceil');

    expect(texto(wrapper, 'tarjeta-operacion')).toBe('c[5] = a[5] + b[5]');
    expect(texto(wrapper, 'paso-detalle')).toBe('c[5] = a[5] + b[5]');
    expect(texto(wrapper, 'checkpoint-respuesta')).toContain('Correcto');
  });

  it('reports no operation for a thread the guard discarded', async () => {
    const wrapper = montar();
    await avanzar(wrapper, 5);
    await pulsar(wrapper, 'hilo-descartado');
    await responder(wrapper, 'ceil');

    expect(texto(wrapper, 'tarjeta-operacion')).toBe('ninguna: el guard lo descartó');
  });

  it('hands over to free exploration after the last step', async () => {
    const wrapper = montar();
    await avanzar(wrapper, 5);
    expect(texto(wrapper, 'paso-siguiente')).toBe('Explorar por mi cuenta');

    await avanzar(wrapper);

    expect(existe(wrapper, 'paso-progreso')).toBe(false);
    expect(texto(wrapper, 'grid-size')).toBe('3');
  });

  it('retires an answer when the configuration behind its question changes', async () => {
    const wrapper = montar();
    await avanzar(wrapper);
    await responder(wrapper, 'n-3');
    expect(existe(wrapper, 'paso-detalle')).toBe(true);

    await pulsar(wrapper, 'paso-anterior');
    await pulsar(wrapper, 'preset-n-100');
    await avanzar(wrapper);

    expect(texto(wrapper, 'checkpoint-pregunta')).toContain('n = 100');
    expect(existe(wrapper, 'paso-detalle')).toBe(false);
  });

  it('keeps an answer that the change could not have invalidated', async () => {
    const wrapper = montar();
    await avanzar(wrapper);
    await responder(wrapper, 'n-3');

    // Picking another thread moves neither n nor blockDim.x, so gridDim.x is untouched.
    await hilos(wrapper)[7]?.trigger('click');

    expect(texto(wrapper, 'paso-detalle')).toBe('gridDim.x = (10 + 4 - 1) / 4 = 3');
  });

  it('lets the learner jump back through the progress trail', async () => {
    const wrapper = montar();
    await avanzar(wrapper, 3);

    const pasos = wrapper.findAll('.sgpu-progreso__paso');
    expect(pasos).toHaveLength(6);
    await pasos[1]?.trigger('click');

    expect(texto(wrapper, 'paso-progreso')).toBe('Paso 2 de 6');
  });

  it('honours a shared configuration instead of the preset', () => {
    const wrapper = montar('n=100&bs=32&b=3&t=5');
    expect(texto(wrapper, 'paso-detalle')).toBe('n = 100 elementos, blockDim.x = 32 hilos por bloque');
  });
});

describe('exploración libre', () => {
  const libre = async (initialQuery: string) => {
    const wrapper = montar(initialQuery);
    await modoLibre(wrapper);
    return wrapper;
  };

  it('renders the values the model computed for the initial query', async () => {
    const wrapper = await libre('n=100&bs=32&b=3&t=5');

    expect(texto(wrapper, 'grid-size')).toBe('4');
    expect(texto(wrapper, 'total-threads')).toBe('128');
    expect(texto(wrapper, 'inactive-threads')).toBe('28');
    expect(texto(wrapper, 'grid-substituted')).toBe('gridDim.x = (100 + 32 - 1) / 32 = 4');
    expect(texto(wrapper, 'index-substituted')).toBe('i = 3 * 32 + 5 = 101');
  });

  it('draws one element per thread of the grid', async () => {
    const wrapper = await libre('n=100&bs=32&b=0&t=0');

    expect(hilos(wrapper)).toHaveLength(128);
    expect(wrapper.findAll('.sgpu-hilo--activo')).toHaveLength(100);
    expect(wrapper.findAll('.sgpu-hilo--inactivo')).toHaveLength(28);
  });

  it('summarizes the selected thread in a single card', async () => {
    const wrapper = await libre('n=100&bs=32&b=3&t=1');

    expect(texto(wrapper, 'tarjeta-bloque')).toBe('3');
    expect(texto(wrapper, 'tarjeta-hilo')).toBe('1');
    expect(texto(wrapper, 'tarjeta-indice')).toBe('97');
    expect(texto(wrapper, 'tarjeta-estado')).toBe('activo');
    expect(texto(wrapper, 'tarjeta-operacion')).toBe('c[97] = a[97] + b[97]');
  });

  it('reports a discarded thread as discarded', async () => {
    const wrapper = await libre('n=100&bs=32&b=3&t=5');

    expect(texto(wrapper, 'tarjeta-indice')).toBe('101');
    expect(texto(wrapper, 'tarjeta-estado')).toBe('descartado');
    expect(texto(wrapper, 'tarjeta-operacion')).toBe('ninguna: el guard lo descartó');
  });

  it('rebuilds the snapshot when a control changes', async () => {
    const wrapper = await libre('n=100&bs=32&b=0&t=0');
    await wrapper.get('[data-test="block-size"]').setValue('16');

    expect(texto(wrapper, 'grid-size')).toBe('7');
    expect(texto(wrapper, 'total-threads')).toBe('112');
    expect(texto(wrapper, 'inactive-threads')).toBe('12');
  });

  it('reports an evenly divisible launch as having no partial block', async () => {
    const wrapper = await libre('n=128&bs=32&b=0&t=0');

    expect(texto(wrapper, 'partial-block')).toBe('no');
    expect(wrapper.findAll('.sgpu-hilo--inactivo')).toHaveLength(0);
  });

  it('changes what is shown, not what is computed, when the stage changes', async () => {
    const wrapper = await libre('n=100&bs=32&b=3&t=5');
    const antes = {
      grid: texto(wrapper, 'grid-size'),
      indice: texto(wrapper, 'index-substituted'),
      inactivos: texto(wrapper, 'inactive-threads'),
      hilos: hilos(wrapper).length,
      tarjeta: texto(wrapper, 'tarjeta-indice'),
    };

    const botones = wrapper.findAll('.sgpu-vista');
    await botones[0]?.trigger('click');
    expect(hilos(wrapper)[0]?.text()).toBe('t0');

    await botones[2]?.trigger('click');
    expect(hilos(wrapper)[0]?.text()).toBe('c[0]');

    expect({
      grid: texto(wrapper, 'grid-size'),
      indice: texto(wrapper, 'index-substituted'),
      inactivos: texto(wrapper, 'inactive-threads'),
      hilos: hilos(wrapper).length,
      tarjeta: texto(wrapper, 'tarjeta-indice'),
    }).toEqual(antes);
  });

  it('exposes a shareable configuration string', async () => {
    const wrapper = await libre('n=100&bs=32&b=3&t=5');
    expect(texto(wrapper, 'enlace')).toBe('?n=100&bs=32&b=3&t=5');
  });

  it('summarizes instead of drawing an unbounded number of blocks', async () => {
    const wrapper = await libre('n=4096&bs=1&b=0&t=0');

    expect(wrapper.findAll('.sgpu-bloque')).toHaveLength(64);
    expect(texto(wrapper, 'truncado')).toContain('4096');
  });

  it('labels every thread for screen readers', async () => {
    const wrapper = await libre('n=4&bs=4&b=0&t=0');
    const etiquetas = hilos(wrapper).map((nodo) => nodo.attributes('aria-label'));

    expect(etiquetas[0]).toBe('Bloque 0, hilo 0, índice global 0. Activo: escribe c[0].');
  });

  it('repairs an invalid query instead of failing', async () => {
    const wrapper = await libre('n=abc&bs=999&b=-3&t=');
    expect(texto(wrapper, 'grid-size')).toBe('1');
  });
});

describe('límites del modelo', () => {
  it('says on screen that it does not execute CUDA', () => {
    expect(montar().text()).toContain('No ejecuta CUDA');
  });
});
