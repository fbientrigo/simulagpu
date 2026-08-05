import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Clase 0 is a prerequisite-free introduction, not a full vertical slice
 * (see `AGENTS.md`): no native code, no exercise, no Anki cards. This suite
 * checks the parts it does ship — page, visualization, navigation,
 * attribution — are actually wired together.
 */
const repoPath = (path: string) => fileURLToPath(new URL(`../${path}`, import.meta.url));
const read = (path: string) => readFileSync(repoPath(path), 'utf8');

const PAGE = 'apps/docs/clase-0/modelo-mental-gpu.md';
const page = read(PAGE);

describe('Clase 0 — página', () => {
  it('embeds the isometric simulator', () => {
    expect(page).toContain('<SimuladorIsometricoGPU');
  });

  it('states it has no prerequisites', () => {
    expect(page.toLowerCase()).toMatch(/prerrequisitos.{0,20}ninguno/is);
  });

  it('shows both formulas', () => {
    expect(page).toContain('número de chunks  = ceil(bytes totales / bytes por chunk)');
    expect(page).toContain('número de bloques = ceil(número de chunks / hilos por bloque)');
  });

  it('does not claim the simulator executes CUDA or emulates hardware', () => {
    expect(page).toMatch(/No ejecuta CUDA|no ejecuta CUDA/);
    expect(page).toMatch(/no emula el hardware/i);
  });

  it('links forward to lesson 01', () => {
    expect(page).toContain('../leccion/indice-global-suma-vectores');
  });

  it('records attribution', () => {
    expect(read('docs/sources.md')).toMatch(/Clase 0/);
  });

  it('covers every required concept', () => {
    const topics: Array<[string, RegExp]> = [
      ['CPU / host', /host/i],
      ['GPU / device', /device/i],
      ['bytes', /bytes/i],
      ['chunks', /chunks?/i],
      ['grid', /grid/i],
      ['blocks', /bloques? \(block\)/i],
      ['threads', /hilos? \(thread\)/i],
      ['inactive threads', /hilos inactivos/i],
      ['host/device transfer', /transferencia/i],
      ['chunk-count formula', /número de chunks\s*=\s*ceil/],
      ['block-count formula', /número de bloques\s*=\s*ceil/],
    ];
    for (const [topic, pattern] of topics) {
      expect(pattern.test(page), `Clase 0 no cubre: ${topic}`).toBe(true);
    }
  });
});

describe('Clase 0 — navegación del sitio', () => {
  const config = read('apps/docs/.vitepress/config.ts');

  it('is registered in the nav bar', () => {
    expect(config).toContain('/clase-0/modelo-mental-gpu');
  });

  it('is registered in the sidebar', () => {
    expect(config).toMatch(/Clase 0/);
  });

  it('the component is registered on the VitePress theme', () => {
    const theme = read('apps/docs/.vitepress/theme/index.ts');
    expect(theme).toContain('SimuladorIsometricoGPU');
  });
});

describe('Clase 0 — exports', () => {
  it('exports the component from @simulagpu/visuals', () => {
    expect(read('packages/visuals/src/index.ts')).toContain('SimuladorIsometricoGPU');
  });

  it('exports the chunk-flow model from @simulagpu/core', () => {
    const index = read('packages/core/src/index.ts');
    expect(index).toContain('buildChunkFlowSnapshot');
    expect(index).toContain('normalizeChunkFlowConfig');
    expect(index).toContain('buildExerciseCases');
  });

  it('exports the chunk-flow contracts from @simulagpu/contracts', () => {
    const index = read('packages/contracts/src/index.ts');
    expect(index).toContain('CHUNK_FLOW_LIMITS');
    expect(index).toContain('ChunkFlowSnapshot');
  });
});

describe('Clase 0 — deliberately no native code, exercise, or Anki cards', () => {
  it('is not referenced by the Anki card sources', () => {
    expect(existsSync(repoPath('anki/cards'))).toBe(true);
    // No card file mentions the chunk-flow model; Clase 0 is a prerequisite-free
    // introduction by design, not a full five-piece lesson.
    const cardsMentionClase0 = read('anki/cards/01-indice-global.yaml').includes('chunk-flow');
    expect(cardsMentionClase0).toBe(false);
  });
});
