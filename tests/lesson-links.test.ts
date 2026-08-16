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

const LESSON = 'apps/docs/leccion/indice-global-suma-vectores.md';
const CUDA_MALLOC_CLASS = 'apps/docs/clases/cuda-malloc.md';
const lesson = read(LESSON);
const cudaMallocClass = read(CUDA_MALLOC_CLASS);

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

describe('lección 01', () => {
  it('embeds the interactive visualization', () => {
    expect(lesson).toContain('<ExploradorIndiceGlobal');
  });

  it('links to the exercise and to the Anki page', () => {
    expect(lesson).toContain('./ejercicio-01-suma-de-vectores');
    expect(lesson).toContain('./anki');
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
      expect(lesson, `la lección no menciona ${path}`).toContain(path);
      expect(existsSync(repoPath(path)), `${path} no existe en el repositorio`).toBe(true);
    }
  });

  it('records attribution', () => {
    expect(lesson).toContain('../referencia/fuentes');
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
      expect(pattern.test(lesson), `la lección no cubre: ${topic}`).toBe(true);
    }
  });

  it('does not claim the visualization executes CUDA', () => {
    expect(lesson).toMatch(/No ejecuta CUDA|no ejecuta CUDA/);
  });
});

describe('página del ejercicio', () => {
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

describe('página de tarjetas', () => {
  const page = read('apps/docs/leccion/anki.md');

  it('offers the generated TSV as a download', () => {
    expect(page).toContain('simulagpu-anki.tsv');
    // withBase keeps the link correct when the site is served from /simulagpu/.
    expect(page).toContain('withBase');
  });
});
