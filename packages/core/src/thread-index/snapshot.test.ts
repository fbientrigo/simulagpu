import { describe, expect, it } from 'vitest';
import { THREAD_INDEX_LIMITS } from '@simulagpu/contracts';

import { normalizeThreadIndexConfig } from './config.js';
import { buildThreadIndexSnapshot, globalIndex, isActive } from './snapshot.js';

const build = (input: Parameters<typeof normalizeThreadIndexConfig>[0]) =>
  buildThreadIndexSnapshot(normalizeThreadIndexConfig(input));

describe('globalIndex', () => {
  it('implements blockIdx.x * blockDim.x + threadIdx.x', () => {
    expect(globalIndex(0, 32, 0)).toBe(0);
    expect(globalIndex(0, 32, 31)).toBe(31);
    expect(globalIndex(1, 32, 0)).toBe(32);
    expect(globalIndex(3, 32, 5)).toBe(101);
  });

  it('assigns every element of the vector to exactly one thread', () => {
    const blockSize = 16;
    const n = 100;
    const seen = new Set<number>();
    for (let b = 0; b < Math.ceil(n / blockSize); b += 1) {
      for (let t = 0; t < blockSize; t += 1) {
        const i = globalIndex(b, blockSize, t);
        if (isActive(i, n)) {
          expect(seen.has(i)).toBe(false);
          seen.add(i);
        }
      }
    }
    expect(seen.size).toBe(n);
  });
});

describe('buildThreadIndexSnapshot', () => {
  it('is deterministic: the same config yields a deeply equal snapshot', () => {
    const config = normalizeThreadIndexConfig({ n: 100, blockSize: 32, selectedBlock: 3, selectedThread: 5 });
    expect(buildThreadIndexSnapshot(config)).toEqual(buildThreadIndexSnapshot(config));
  });

  it('is JSON-serializable and survives a round trip unchanged', () => {
    const snapshot = build({ n: 70, blockSize: 16 });
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
  });

  it('produces frozen data at every level', () => {
    const snapshot = build({ n: 70, blockSize: 16 });
    const block = snapshot.blocks[0];
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.blocks)).toBe(true);
    expect(Object.isFrozen(block)).toBe(true);
    expect(Object.isFrozen(block?.threads)).toBe(true);
    expect(Object.isFrozen(block?.threads[0])).toBe(true);
  });

  it('uses ceiling division for the grid size', () => {
    expect(build({ n: 100, blockSize: 32 }).gridSize).toBe(4);
    expect(build({ n: 128, blockSize: 32 }).gridSize).toBe(4);
    expect(build({ n: 129, blockSize: 32 }).gridSize).toBe(5);
  });

  it('activates exactly n threads for every configuration in range', () => {
    for (const blockSize of THREAD_INDEX_LIMITS.blockSizes) {
      for (const n of [1, 2, blockSize - 1, blockSize, blockSize + 1, 3 * blockSize + 7]) {
        if (n < 1) continue;
        const snapshot = build({ n, blockSize });
        const active = snapshot.blocks.flatMap((block) => block.threads).filter((thread) => thread.active);
        expect(active).toHaveLength(n);
        expect(active.map((thread) => thread.globalIndex)).toEqual([...Array(n).keys()]);
      }
    }
  });

  it('reports the launch overshoot caused by ceiling division', () => {
    const snapshot = build({ n: 100, blockSize: 32 });
    expect(snapshot.totalThreads).toBe(128);
    expect(snapshot.inactiveThreads).toBe(28);
    expect(snapshot.hasPartialBlock).toBe(true);
    expect(snapshot.partialBlockIdx).toBe(3);
  });

  it('reports no partial block when n divides evenly', () => {
    const snapshot = build({ n: 128, blockSize: 32 });
    expect(snapshot.totalThreads).toBe(128);
    expect(snapshot.inactiveThreads).toBe(0);
    expect(snapshot.hasPartialBlock).toBe(false);
    expect(snapshot.partialBlockIdx).toBeNull();
    expect(snapshot.blocks.some((block) => block.isBoundaryBlock)).toBe(false);
  });

  it('marks only the last block as a boundary block', () => {
    const snapshot = build({ n: 100, blockSize: 32 });
    expect(snapshot.blocks.map((block) => block.isBoundaryBlock)).toEqual([false, false, false, true]);
    expect(snapshot.blocks[3]?.activeCount).toBe(4);
  });

  it('handles n = 1', () => {
    const snapshot = build({ n: 1, blockSize: 256 });
    expect(snapshot.gridSize).toBe(1);
    expect(snapshot.totalThreads).toBe(256);
    expect(snapshot.inactiveThreads).toBe(255);
    expect(snapshot.blocks[0]?.activeCount).toBe(1);
  });

  it('gives inactive threads a null element instead of an out-of-range one', () => {
    const snapshot = build({ n: 100, blockSize: 32 });
    const tail = snapshot.blocks[3]?.threads ?? [];
    expect(tail[3]).toMatchObject({ globalIndex: 99, active: true, element: 99 });
    expect(tail[4]).toMatchObject({ globalIndex: 100, active: false, element: null });
  });

  it('substitutes the selected values into the index expression', () => {
    const snapshot = build({ n: 100, blockSize: 32, selectedBlock: 3, selectedThread: 5 });
    expect(snapshot.indexExpression).toEqual({
      formula: 'i = blockIdx.x * blockDim.x + threadIdx.x',
      substituted: 'i = 3 * 32 + 5',
      evaluated: 'i = 101',
      value: 101,
    });
  });

  it('substitutes the selected values into the grid-size expression', () => {
    const snapshot = build({ n: 100, blockSize: 32 });
    expect(snapshot.gridSizeExpression).toEqual({
      formula: 'gridDim.x = ceil(n / blockDim.x)',
      substituted: 'gridDim.x = (100 + 32 - 1) / 32',
      evaluated: 'gridDim.x = 4',
      value: 4,
    });
  });

  it('selects a thread that may itself be inactive', () => {
    const snapshot = build({ n: 100, blockSize: 32, selectedBlock: 3, selectedThread: 5 });
    expect(snapshot.selected).toEqual({
      blockIdx: 3,
      threadIdx: 5,
      globalIndex: 101,
      active: false,
      element: null,
    });
  });

  it('does not carry any presentation state', () => {
    const snapshot = build({ n: 100, blockSize: 32 });
    // Rule 4 of the architecture contract: presentation stages change what is
    // shown, never what is computed. Nothing view-related may leak in here.
    expect(Object.keys(snapshot.config).sort()).toEqual([
      'blockSize',
      'n',
      'selectedBlock',
      'selectedThread',
    ]);
    for (const forbidden of ['stage', 'vista', 'theme', 'zoom', 'visible']) {
      expect(snapshot).not.toHaveProperty(forbidden);
    }
  });
});
