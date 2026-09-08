import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoPath = (path: string) => fileURLToPath(new URL(`../${path}`, import.meta.url));
const read = (path: string) => readFileSync(repoPath(path), 'utf8');
const lesson = read('apps/docs/leccion/cooperacion-memoria-acceso.md');

describe('Clase 3 vertical slice', () => {
  it('embeds and registers the deterministic laboratory', () => {
    expect(lesson).toContain('<LaboratorioAccesoMemoria');
    expect(read('apps/docs/.vitepress/theme/index.ts')).toContain("app.component('LaboratorioAccesoMemoria'");
  });

  it('links to native example and exercise paths that exist', () => {
    for (const path of ['native/examples/memory-access', 'native/exercises/04-memory-access']) {
      expect(lesson).toContain(path);
      expect(existsSync(repoPath(path)), `${path} no existe`).toBe(true);
    }
  });

  it('ships model, visualization, exercise tests and retention source', () => {
    for (const path of [
      'packages/contracts/src/memory-access.ts',
      'packages/core/src/memory-access/model.ts',
      'packages/core/src/memory-access/memory-access.test.ts',
      'packages/visuals/src/LaboratorioAccesoMemoria.vue',
      'native/exercises/04-memory-access/tests/test_memory_access.cpp',
      'anki/cards/05-memory-access.yaml',
    ]) {
      expect(existsSync(repoPath(path)), `${path} no existe`).toBe(true);
    }
  });

  it('teaches the owned concepts and preserves Primitive D boundary', () => {
    expect(lesson).toMatch(/valor privado/i);
    expect(lesson).toMatch(/memoria global/i);
    expect(lesson).toContain('__syncthreads()');
    expect(lesson).toMatch(/contiguo/i);
    expect(lesson).toMatch(/stride/i);
    expect(lesson).toMatch(/coalescing/i);
    expect(lesson).toMatch(/oportunidad de reutilización/i);
    expect(lesson).toMatch(/no enseñamos todavía a declarar ni usar `__shared__`/i);
    expect(lesson).toMatch(/no simula.*transacciones|no.*transacciones.*hardware/is);
  });
});
