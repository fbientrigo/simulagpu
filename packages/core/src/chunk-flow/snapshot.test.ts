import { describe, expect, it } from 'vitest';

import { normalizeChunkFlowConfig } from './config.js';
import { buildChunkFlowSnapshot } from './snapshot.js';
import { STEP_COUNT } from './steps.js';

const build = (input: Parameters<typeof normalizeChunkFlowConfig>[0]) =>
  buildChunkFlowSnapshot(normalizeChunkFlowConfig(input));

describe('buildChunkFlowSnapshot — determinism, serialization, immutability', () => {
  it('is deterministic: the same config yields a deeply equal snapshot', () => {
    const config = normalizeChunkFlowConfig({ totalBytes: 96, bytesPerChunk: 16, threadsPerBlock: 4 });
    expect(buildChunkFlowSnapshot(config)).toEqual(buildChunkFlowSnapshot(config));
  });

  it('is JSON-serializable and survives a round trip unchanged', () => {
    const snapshot = build({ totalBytes: 100, bytesPerChunk: 16, threadsPerBlock: 4 });
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
  });

  it('produces frozen data at every level', () => {
    const snapshot = build({ totalBytes: 96, bytesPerChunk: 16, threadsPerBlock: 4 });
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.chunks)).toBe(true);
    expect(Object.isFrozen(snapshot.chunks[0])).toBe(true);
    expect(Object.isFrozen(snapshot.blocks)).toBe(true);
    expect(Object.isFrozen(snapshot.blocks[0])).toBe(true);
    expect(Object.isFrozen(snapshot.blocks[0]?.threads)).toBe(true);
    expect(Object.isFrozen(snapshot.blocks[0]?.threads[0])).toBe(true);
    expect(Object.isFrozen(snapshot.steps)).toBe(true);
    expect(Object.isFrozen(snapshot.steps[0])).toBe(true);
  });

  it('rejects mutation of a frozen snapshot', () => {
    const snapshot = build({ totalBytes: 64, bytesPerChunk: 8, threadsPerBlock: 4 });
    expect(() => {
      // @ts-expect-error intentional violation for the test
      snapshot.chunkCount = 999;
    }).toThrow();
  });
});

describe('buildChunkFlowSnapshot — boundary configurations', () => {
  it('32 bytes / 4 bytes per chunk / 2 threads per block', () => {
    const snapshot = build({ totalBytes: 32, bytesPerChunk: 4, threadsPerBlock: 2 });
    expect(snapshot.chunkCount).toBe(8);
    expect(snapshot.blockCount).toBe(4);
    expect(snapshot.totalThreadSlots).toBe(8);
    expect(snapshot.inactiveThreads).toBe(0);
    expect(snapshot.hasPartialFinalChunk).toBe(false);
    expect(snapshot.hasPartialFinalBlock).toBe(false);
  });

  it('64 bytes / 8 bytes per chunk / 4 threads per block', () => {
    const snapshot = build({ totalBytes: 64, bytesPerChunk: 8, threadsPerBlock: 4 });
    expect(snapshot.chunkCount).toBe(8);
    expect(snapshot.blockCount).toBe(2);
    expect(snapshot.totalThreadSlots).toBe(8);
    expect(snapshot.inactiveThreads).toBe(0);
    expect(snapshot.hasPartialFinalChunk).toBe(false);
    expect(snapshot.hasPartialFinalBlock).toBe(false);
  });

  it('96 bytes / 16 bytes per chunk / 4 threads per block (the guided-exercise example)', () => {
    const snapshot = build({ totalBytes: 96, bytesPerChunk: 16, threadsPerBlock: 4 });
    expect(snapshot.chunkCount).toBe(6);
    expect(snapshot.blockCount).toBe(2);
    expect(snapshot.totalThreadSlots).toBe(8);
    expect(snapshot.inactiveThreads).toBe(2);
    expect(snapshot.hasPartialFinalChunk).toBe(false);
    expect(snapshot.hasPartialFinalBlock).toBe(true);
  });

  it('100 bytes / 16 bytes per chunk / 4 threads per block (model-only boundary, not in the select)', () => {
    const snapshot = build({ totalBytes: 100, bytesPerChunk: 16, threadsPerBlock: 4 });
    expect(snapshot.chunkCount).toBe(7);
    expect(snapshot.blockCount).toBe(2);
    expect(snapshot.totalThreadSlots).toBe(8);
    expect(snapshot.inactiveThreads).toBe(1);
    expect(snapshot.hasPartialFinalChunk).toBe(true);
    const lastChunk = snapshot.chunks[snapshot.chunks.length - 1];
    expect(lastChunk).toMatchObject({ byteCount: 4, isPartial: true });
  });

  it('256 bytes / 32 bytes per chunk / 8 threads per block (largest select combination)', () => {
    const snapshot = build({ totalBytes: 256, bytesPerChunk: 32, threadsPerBlock: 8 });
    expect(snapshot.chunkCount).toBe(8);
    expect(snapshot.blockCount).toBe(1);
    expect(snapshot.totalThreadSlots).toBe(8);
    expect(snapshot.inactiveThreads).toBe(0);
    expect(snapshot.hasPartialFinalChunk).toBe(false);
    expect(snapshot.hasPartialFinalBlock).toBe(false);
  });

  it('handles the smallest supported configuration', () => {
    const snapshot = build({ totalBytes: 1, bytesPerChunk: 4, threadsPerBlock: 2 });
    expect(snapshot.chunkCount).toBe(1);
    expect(snapshot.blockCount).toBe(1);
    expect(snapshot.totalThreadSlots).toBe(2);
    expect(snapshot.inactiveThreads).toBe(1);
    expect(snapshot.hasPartialFinalChunk).toBe(true);
    expect(snapshot.chunks[0]).toMatchObject({ byteCount: 1, isPartial: true });
  });

  it('handles the largest supported configuration', () => {
    const snapshot = build({ totalBytes: 4096, bytesPerChunk: 4, threadsPerBlock: 2 });
    expect(snapshot.chunkCount).toBe(1024);
    expect(snapshot.blockCount).toBe(512);
    expect(snapshot.totalThreadSlots).toBe(1024);
    expect(snapshot.inactiveThreads).toBe(0);
    expect(snapshot.hasPartialFinalChunk).toBe(false);
  });

  it('exact block fit: chunk count is a multiple of threads per block', () => {
    const snapshot = build({ totalBytes: 64, bytesPerChunk: 8, threadsPerBlock: 4 });
    expect(snapshot.blocks.every((block) => !block.isPartialBlock)).toBe(true);
  });

  it('incomplete final block: only the last block is marked partial', () => {
    const snapshot = build({ totalBytes: 96, bytesPerChunk: 16, threadsPerBlock: 4 });
    expect(snapshot.blocks.map((block) => block.isPartialBlock)).toEqual([false, true]);
    expect(snapshot.blocks[1]?.activeCount).toBe(2);
  });
});

describe('buildChunkFlowSnapshot — chunks, threads, and expressions', () => {
  it('assigns every chunk to exactly one thread slot, with no gaps or repeats', () => {
    const snapshot = build({ totalBytes: 100, bytesPerChunk: 16, threadsPerBlock: 4 });
    const activeSlots = snapshot.blocks
      .flatMap((block) => block.threads)
      .filter((thread) => thread.active)
      .map((thread) => thread.slot);
    expect(activeSlots).toEqual([...Array(snapshot.chunkCount).keys()]);
  });

  it('gives inactive threads a null chunkIndex', () => {
    const snapshot = build({ totalBytes: 96, bytesPerChunk: 16, threadsPerBlock: 4 });
    const lastBlock = snapshot.blocks[snapshot.blocks.length - 1];
    expect(lastBlock?.threads[1]).toMatchObject({ active: true, chunkIndex: 5 });
    expect(lastBlock?.threads[2]).toMatchObject({ active: false, chunkIndex: null });
  });

  it('substitutes concrete values into the chunk-count formula', () => {
    const snapshot = build({ totalBytes: 64, bytesPerChunk: 8, threadsPerBlock: 4 });
    expect(snapshot.chunkCountExpression).toEqual({
      formula: 'número de chunks = ceil(bytes totales / bytes por chunk)',
      substituted: 'número de chunks = ceil(64 / 8)',
      evaluated: 'número de chunks = 8',
      value: 8,
    });
  });

  it('substitutes concrete values into the block-count formula', () => {
    const snapshot = build({ totalBytes: 64, bytesPerChunk: 8, threadsPerBlock: 4 });
    expect(snapshot.blockCountExpression).toEqual({
      formula: 'número de bloques = ceil(número de chunks / hilos por bloque)',
      substituted: 'número de bloques = ceil(8 / 4)',
      evaluated: 'número de bloques = 2',
      value: 2,
    });
  });

  it('matches the worked example from the mission brief', () => {
    const snapshot = build({ totalBytes: 64, bytesPerChunk: 8, threadsPerBlock: 4 });
    expect(snapshot.chunkCountExpression.evaluated).toBe('número de chunks = 8');
    expect(snapshot.blockCountExpression.evaluated).toBe('número de bloques = 2');
  });
});

describe('buildChunkFlowSnapshot — selection', () => {
  it('describes a selected chunk', () => {
    const snapshot = build({
      totalBytes: 96,
      bytesPerChunk: 16,
      threadsPerBlock: 4,
      selectedKind: 'chunk',
      selectedIndex: 5,
    });
    expect(snapshot.selected.kind).toBe('chunk');
    expect(snapshot.selected.index).toBe(5);
    expect(snapshot.selected.descripcion).toContain('Chunk 5');
  });

  it('describes a selected block', () => {
    const snapshot = build({
      totalBytes: 96,
      bytesPerChunk: 16,
      threadsPerBlock: 4,
      selectedKind: 'block',
      selectedIndex: 1,
    });
    expect(snapshot.selected.kind).toBe('block');
    expect(snapshot.selected.descripcion).toContain('incompleto');
  });

  it('describes an inactive selected thread', () => {
    const snapshot = build({
      totalBytes: 96,
      bytesPerChunk: 16,
      threadsPerBlock: 4,
      selectedKind: 'thread',
      selectedIndex: 7,
    });
    expect(snapshot.selected.kind).toBe('thread');
    expect(snapshot.selected.descripcion).toContain('inactivo');
  });

  it('describes an active selected thread', () => {
    const snapshot = build({
      totalBytes: 96,
      bytesPerChunk: 16,
      threadsPerBlock: 4,
      selectedKind: 'thread',
      selectedIndex: 0,
    });
    expect(snapshot.selected.descripcion).toContain('activo');
    expect(snapshot.selected.descripcion).toContain('chunk 0');
  });
});

describe('buildChunkFlowSnapshot — pedagogical steps', () => {
  it('narrates all ten steps', () => {
    const snapshot = build({ totalBytes: 96, bytesPerChunk: 16, threadsPerBlock: 4 });
    expect(snapshot.steps).toHaveLength(STEP_COUNT);
    expect(snapshot.steps).toHaveLength(10);
    expect(snapshot.steps.map((step) => step.id)).toEqual([
      'cpu',
      'chunks',
      'transferencia',
      'hilos',
      'bloques',
      'grid',
      'paralelo',
      'inactivos',
      'resultado',
      'comprobacion',
    ]);
  });

  it('every step has non-empty Spanish content and an index matching its position', () => {
    const snapshot = build({ totalBytes: 96, bytesPerChunk: 16, threadsPerBlock: 4 });
    snapshot.steps.forEach((step, position) => {
      expect(step.index).toBe(position);
      expect(step.titulo.length).toBeGreaterThan(0);
      expect(step.descripcion.length).toBeGreaterThan(0);
    });
  });

  it('the transfer step states this is not a real measurement', () => {
    const snapshot = build({ totalBytes: 96, bytesPerChunk: 16, threadsPerBlock: 4 });
    const transferStep = snapshot.steps.find((step) => step.id === 'transferencia');
    expect(transferStep?.descripcion).toMatch(/no mide una transferencia real/i);
  });

  it('the parallel step does not claim literal simultaneous hardware execution', () => {
    const snapshot = build({ totalBytes: 96, bytesPerChunk: 16, threadsPerBlock: 4 });
    const parallelStep = snapshot.steps.find((step) => step.id === 'paralelo');
    expect(parallelStep?.descripcion).toMatch(/no implica/i);
  });

  it('the inactive-threads step explains the partial block when one exists', () => {
    const snapshot = build({ totalBytes: 96, bytesPerChunk: 16, threadsPerBlock: 4 });
    const inactiveStep = snapshot.steps.find((step) => step.id === 'inactivos');
    expect(inactiveStep?.descripcion).toContain('2 hilos quedan inactivos');
  });

  it('the inactive-threads step says so explicitly when there are none', () => {
    const snapshot = build({ totalBytes: 64, bytesPerChunk: 8, threadsPerBlock: 4 });
    const inactiveStep = snapshot.steps.find((step) => step.id === 'inactivos');
    expect(inactiveStep?.descripcion).toContain('no hay hilos inactivos');
  });

  it('does not carry any presentation state', () => {
    const snapshot = build({ totalBytes: 96, bytesPerChunk: 16, threadsPerBlock: 4 });
    // Rule 4 of the architecture contract: presentation stages change what is
    // shown, never what is computed. The current step, zoom, and theme must
    // never leak into the config or the snapshot.
    expect(Object.keys(snapshot.config).sort()).toEqual([
      'bytesPerChunk',
      'selectedIndex',
      'selectedKind',
      'threadsPerBlock',
      'totalBytes',
    ]);
    for (const forbidden of ['currentStep', 'stepIndex', 'zoom', 'theme', 'animating', 'playing']) {
      expect(snapshot).not.toHaveProperty(forbidden);
    }
  });
});
