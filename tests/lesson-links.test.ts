import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * A lesson is only finished when it ties five things together: prose, an
 * interactive model, runnable code, an exercise and review cards. This suite
 * checks the ties are actually there, because a broken link is the failure
 * mode nobody notices until a student hits it.
 */
const repoPath = (path: string) => fileURLToPath(new URL(`../${path}`, import.meta.url));
const read = (path: string) => readFileSync(repoPath(path), 'utf8');

const LESSON_01 = 'apps/docs/leccion/indice-global-suma-vectores.md';
const CUDA_MALLOC_CLASS = 'apps/docs/clases/cuda-malloc.md';
const CUDA_MEMCPY_CLASS = 'apps/docs/clases/cuda-memcpy.md';
const lesson01 = read(LESSON_01);
const cudaMallocClass = read(CUDA_MALLOC_CLASS);
const cudaMemcpyClass = read(CUDA_MEMCPY_CLASS);

const LESSON_02 = 'apps/docs/leccion/reduccion-paralela.md';
const lesson02 = read(LESSON_02);

describe('clase cudaMalloc', () => {
  it('embeds the focused interactive class', () => {
    expect(cudaMallocClass).toContain('<ClaseCudaMalloc');
    expect(read('apps/docs/.vitepress/theme/index.ts')).toContain("app.component('ClaseCudaMalloc'");
  });

  it('reuses the existing runnable example and exercise instead of duplicating native code', () => {
    for (const path of ['native/examples/vector-add/vector_add_cuda.cu', 'native/exercises/01-vector-add']) {
      expect(cudaMallocClass).toContain(path);
      expect(existsSync(repoPath(path)), `${path} no existe`).toBe(true);
    }
  });

  it('links to the broad lesson and downloadable Anki review', () => {
    expect(cudaMallocClass).toContain('../leccion/indice-global-suma-vectores');
    expect(cudaMallocClass).toContain('../leccion/anki');
  });

  it('states the model boundary and the allocation-not-initialization idea', () => {
    expect(cudaMallocClass).toMatch(/No ejecuta CUDA|no ejecuta CUDA/);
    expect(cudaMallocClass).toMatch(/reservar memoria no es inicializarla|no inicializa/i);
  });
});

describe('clase cudaMemcpy', () => {
  it('embeds the focused interactive class and registers it in VitePress', () => {
    expect(cudaMemcpyClass).toContain('<ClaseCudaMemcpy');
    expect(read('apps/docs/.vitepress/theme/index.ts')).toContain("app.component('ClaseCudaMemcpy'");
  });

  it('links to a runnable native round-trip example that exists', () => {
    expect(cudaMemcpyClass).toContain('native/examples/cuda-memcpy');
    expect(existsSync(repoPath('native/examples/cuda-memcpy')), 'el ejemplo nativo no existe').toBe(true);
    expect(existsSync(repoPath('native/examples/cuda-memcpy/memcpy_roundtrip_cuda.cu'))).toBe(true);
  });

  it('links to the broad lesson and downloadable Anki review', () => {
    expect(cudaMemcpyClass).toContain('../leccion/indice-global-suma-vectores');
    expect(cudaMemcpyClass).toContain('../leccion/anki');
  });

  it('states the model boundary and the copy-is-not-allocation idea', () => {
    expect(cudaMemcpyClass).toMatch(/No ejecuta CUDA|no ejecuta CUDA/);
    expect(cudaMemcpyClass).toMatch(/copiar no es mover|copiar no es reservar/i);
    expect(cudaMemcpyClass).toContain('cudaMemcpyHostToDevice');
    expect(cudaMemcpyClass).toContain('cudaMemcpyDeviceToHost');
  });
});

describe('lección 01', () => {
  it('embeds the interactive visualization', () => {
    expect(lesson01).toContain('<ExploradorIndiceGlobal');
  });

  it('links to the exercise and to the Anki page', () => {
    expect(lesson01).toContain('./ejercicio-01-suma-de-vectores');
    expect(lesson01).toContain('./anki');
  });

  it('links to source files that exist', () => {
    const referenced = [
      'native/examples/vector-add',
      'native/examples/vector-add/main.cpp',
      'native/common',
      'native/common/tests',
      'native/common/include/simulagpu/cuda_check.cuh',
    ];
    for (const path of referenced) {
      expect(lesson01, `la lección no menciona ${path}`).toContain(path);
      expect(existsSync(repoPath(path)), `${path} no existe en el repositorio`).toBe(true);
    }
  });

  it('records attribution', () => {
    expect(lesson01).toContain('../referencia/fuentes');
    expect(read('docs/sources.md')).toContain('26-GPU-PROGRAMMING');
  });

  it('teaches every topic the vertical slice promises', () => {
    const topics: Array<[string, RegExp]> = [
      ['CPU vs GPU', /host.*CPU|CPU.*host/i],
      ['grid / block / thread', /grilla.*bloque.*hilo/is],
      ['global index formula', /blockIdx\.x \* blockDim\.x \+ threadIdx\.x/],
      ['bounds guard', /if \(i < n\)/],
      ['ceiling division', /redondead[ao] hacia arriba/i],
      ['host and device memory', /cudaMalloc/],
      ['host to device transfer', /cudaMemcpyHostToDevice/],
      ['device to host transfer', /cudaMemcpyDeviceToHost/],
      ['launch configuration', /<<<blocks, block_size>>>/],
      ['synchronization', /cudaDeviceSynchronize/],
      ['error checking', /cudaGetLastError/],
      ['CPU oracle', /oráculo/i],
      ['kernel vs end-to-end timing', /cudaEventElapsedTime/],
      ['non-divisible N', /no es múltiplo del tamaño de bloque/i],
    ];
    for (const [topic, pattern] of topics) {
      expect(pattern.test(lesson01), `la lección no cubre: ${topic}`).toBe(true);
    }
  });

  it('describes the guided walkthrough the explorer opens on', () => {
    expect(lesson01).toContain('recorrido guiado');
    // The preset the component starts from, so the prose and the screen agree.
    expect(lesson01).toContain('`n = 10` y bloques de 4');
    expect(lesson01).toContain('exploración libre');
  });

  it('lists the guided steps in the order the model builds them', () => {
    const positions = [
      'cuántos elementos hay',
      'cuántos bloques hacen falta',
      'qué hilo eres',
      'qué índice global te toca',
      'si pasas el guard',
      'qué elemento acabas procesando',
    ].map((fragment) => {
      const at = lesson01.indexOf(fragment);
      expect(at, `la lección no describe el paso: ${fragment}`).toBeGreaterThan(-1);
      return at;
    });
    expect(positions).toEqual([...positions].sort((left, right) => left - right));
  });

  it('describes files that exist', () => {
    for (const path of [
      'packages/visuals/src/ExploradorIndiceGlobal.vue',
      'packages/core/src/thread-index/guided.ts',
    ]) {
      expect(existsSync(repoPath(path)), `${path} no existe en el repositorio`).toBe(true);
    }
  });

  it('does not claim the visualization executes CUDA', () => {
    expect(lesson01).toMatch(/No ejecuta CUDA|no ejecuta CUDA/);
  });
});

describe('página del ejercicio 01', () => {
  const page = read('apps/docs/leccion/ejercicio-01-suma-de-vectores.md');

  it('points back to the lesson and to the cards', () => {
    expect(page).toContain('./indice-global-suma-vectores');
    expect(page).toContain('./anki');
  });

  it('describes files that exist', () => {
    for (const path of [
      'native/exercises/01-vector-add/starter/src/index_math.cpp',
      'native/exercises/01-vector-add/starter/src/vector_add.cu',
      'native/exercises/01-vector-add/solution/src/index_math.cpp',
      'native/exercises/01-vector-add/tests/test_index_math.cpp',
    ]) {
      expect(existsSync(repoPath(path)), `${path} no existe`).toBe(true);
    }
  });

  it('keeps the starter TODOs and the solution in sync in count', () => {
    const starter = read('native/exercises/01-vector-add/starter/src/index_math.cpp');
    const kernel = read('native/exercises/01-vector-add/starter/src/vector_add.cu');
    const todos = [...`${starter}${kernel}`.matchAll(/TODO (\d+) —/g)].map((match) => match[1]);
    expect(todos).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
  });
});

describe('lección 02', () => {
  it('embeds the guided reduction laboratory', () => {
    expect(lesson02).toContain('<LaboratorioReduccion');
    expect(lesson02).toContain('Ejecutar pruebas');
  });

  it('links the lesson, native example, exercise and cards', () => {
    expect(lesson02).toContain('native/examples/reduction');
    expect(lesson02).toContain('./ejercicio-02-reduccion');
    expect(lesson02).toContain('./anki');
  });

  it('links to every source directory that the vertical slice requires', () => {
    for (const path of [
      'native/examples/reduction',
      'native/exercises/02-reduction',
      'native/common/include/simulagpu/reduction.hpp',
      'packages/visuals/src/LaboratorioReduccion.vue',
      'anki/cards/02-reduccion.yaml',
    ]) {
      expect(existsSync(repoPath(path)), `${path} no existe en el repositorio`).toBe(true);
    }
  });

  it('teaches the high-value reduction concepts', () => {
    const topics: Array<[string, RegExp]> = [
      ['data race', /carrera de datos/i],
      ['adjacent-pair tree', /left = 2 \* out/],
      ['odd tail', /tamaño es impar|tamaño impar/i],
      ['floating-point associativity', /no siempre lo es|no es asociativa/i],
      ['CPU oracle', /oráculo CPU/i],
    ];
    for (const [topic, pattern] of topics) {
      expect(pattern.test(lesson02), `la lección 02 no cubre: ${topic}`).toBe(true);
    }
  });

  it('states that the browser runner does not compile or execute CUDA', () => {
    expect(lesson02).toMatch(/no contiene `nvcc`|no compila CUDA/i);
    expect(lesson02).toMatch(/no usa una GPU|acceso a una GPU/i);
  });

  it('records the CERN reduction exercise and the rewritten status', () => {
    const sources = read('docs/sources.md');
    expect(sources).toContain('2-reduction/reduction.cu');
    expect(sources).toMatch(/rewritten from scratch|reescrito desde cero/i);
  });
});

describe('página del ejercicio 02', () => {
  const page = read('apps/docs/leccion/ejercicio-02-reduccion.md');

  it('points back to lesson 02 and names the starter commands', () => {
    expect(page).toContain('./reduccion-paralela');
    expect(page).toContain('native/exercises/02-reduction/starter');
    expect(page).toContain('ctest');
  });

  it('describes files that exist', () => {
    for (const path of [
      'native/exercises/02-reduction/starter/src/reduction_step.cpp',
      'native/exercises/02-reduction/starter/src/reduction_pass.cu',
      'native/exercises/02-reduction/solution/src/reduction_step.cpp',
      'native/exercises/02-reduction/tests/test_reduction_step.cpp',
    ]) {
      expect(existsSync(repoPath(path)), `${path} no existe`).toBe(true);
    }
  });

  it('keeps five numbered TODOs in the starter', () => {
    const cpu = read('native/exercises/02-reduction/starter/src/reduction_step.cpp');
    const cuda = read('native/exercises/02-reduction/starter/src/reduction_pass.cu');
    const todos = [...`${cpu}${cuda}`.matchAll(/TODO (\d+):/g)].map((match) => match[1]);
    expect(todos).toEqual(['1', '2', '3', '4', '5']);
  });
});

describe('páginas de tarjetas', () => {
  const reviewPage = read('apps/docs/leccion/anki.md');
  const downloadPage = read('apps/docs/leccion/descarga-anki.md');

  it('keeps the interactive review focused and links to download details', () => {
    expect(reviewPage).toContain('<InteractiveAnkiReviewer');
    expect(reviewPage).toContain("withBase('/data/simulagpu-anki.json')");
    expect(reviewPage).toContain("withBase('/leccion/descarga-anki')");
    expect(reviewPage).toContain('sgpu-anki-session');
  });

  it('offers the generated TSV from the download page', () => {
    expect(downloadPage).toContain('simulagpu-anki.tsv');
    // withBase keeps the link correct when the site is served from /simulagpu/.
    expect(downloadPage).toContain('withBase');
  });

  it('covers every lesson card source in the download details', () => {
    expect(read('anki/cards/01-indice-global.yaml')).toContain('idx-001');
    expect(read('anki/cards/02-reduccion.yaml')).toContain('red-001');
    expect(read('anki/cards/03-cuda-memcpy.yaml')).toContain('memcpy-001');
    expect(downloadPage).toContain('37 tarjetas');
  });
});
