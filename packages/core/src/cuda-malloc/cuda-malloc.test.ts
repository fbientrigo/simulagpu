import { describe, expect, it } from 'vitest';
import { CUDA_MALLOC_ELEMENT_COUNTS } from '@simulagpu/contracts';

import { DEFAULT_CUDA_MALLOC_CONFIG, normalizeCudaMallocConfig } from './config.js';
import { decodeCudaMallocConfig, encodeCudaMallocConfig } from './serialize.js';
import { buildCudaMallocSnapshot } from './snapshot.js';

const build = (elementCount: unknown) => buildCudaMallocSnapshot(normalizeCudaMallocConfig({ elementCount }));

describe('normalizeCudaMallocConfig', () => {
  it('returns a frozen default and is idempotent', () => {
    const once = normalizeCudaMallocConfig();
    expect(once).toEqual(DEFAULT_CUDA_MALLOC_CONFIG);
    expect(Object.isFrozen(once)).toBe(true);
    expect(normalizeCudaMallocConfig(once)).toEqual(once);
  });

  it('normalizes junk and snaps values into the 1/2/4/8 budget', () => {
    expect(normalizeCudaMallocConfig({ elementCount: 'junk' })).toEqual(DEFAULT_CUDA_MALLOC_CONFIG);
    expect(normalizeCudaMallocConfig({ elementCount: -20 }).elementCount).toBe(1);
    expect(normalizeCudaMallocConfig({ elementCount: 3 }).elementCount).toBe(2);
    expect(normalizeCudaMallocConfig({ elementCount: 999 }).elementCount).toBe(8);
  });

  it('round-trips every normalized config through the stable query format', () => {
    for (const elementCount of CUDA_MALLOC_ELEMENT_COUNTS) {
      const config = normalizeCudaMallocConfig({ elementCount });
      expect(decodeCudaMallocConfig(encodeCudaMallocConfig(config))).toEqual(config);
    }
    expect(decodeCudaMallocConfig('?unknown=x&m=8')).toEqual({ elementCount: 8 });
  });
});

describe('buildCudaMallocSnapshot', () => {
  it('is deterministic and survives a JSON round trip', () => {
    const config = normalizeCudaMallocConfig({ elementCount: 4 });
    const snapshot = buildCudaMallocSnapshot(config);
    expect(snapshot).toEqual(buildCudaMallocSnapshot(config));
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
  });

  it('is deeply frozen', () => {
    const snapshot = build(4);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.before)).toBe(true);
    expect(Object.isFrozen(snapshot.before.hostCells)).toBe(true);
    expect(Object.isFrozen(snapshot.before.hostCells[0])).toBe(true);
    expect(Object.isFrozen(snapshot.action)).toBe(true);
    expect(Object.isFrozen(snapshot.after)).toBe(true);
    expect(Object.isFrozen(snapshot.after.deviceAllocation)).toBe(true);
    expect(Object.isFrozen(snapshot.after.deviceAllocation?.cells)).toBe(true);
    expect(Object.isFrozen(snapshot.after.deviceAllocation?.cells[0])).toBe(true);
    expect(Object.isFrozen(snapshot.changed)).toBe(true);
    expect(Object.isFrozen(snapshot.unchanged)).toBe(true);
  });

  it('models the before/action/after transition without initialization or copying', () => {
    const snapshot = build(4);
    expect(snapshot.before.devicePointer).toBeNull();
    expect(snapshot.before.deviceAllocation).toBeNull();
    expect(snapshot.action).toMatchObject({ byteCount: 16, code: 'cudaMalloc(&d_A, bytes);' });
    expect(snapshot.after.devicePointer).toBe('device-allocation');
    expect(snapshot.after.deviceAllocation?.cells).toHaveLength(4);
    expect(snapshot.after.deviceAllocation?.cells.every((cell) => cell.symbol === '?')).toBe(true);
    expect(snapshot.after.hostCells).toEqual(snapshot.before.hostCells);
    expect(snapshot.unchanged.join(' ')).toMatch(/No se copió|no quedaron inicializadas/i);
  });

  it('covers the complete 1/2/4/8 presentation boundary', () => {
    for (const elementCount of CUDA_MALLOC_ELEMENT_COUNTS) {
      const snapshot = build(elementCount);
      expect(snapshot.action.byteCount).toBe(elementCount * 4);
      expect(snapshot.before.hostCells).toHaveLength(elementCount);
      expect(snapshot.after.deviceAllocation?.cells).toHaveLength(elementCount);
    }
  });

  it('contains no presentation, animation, quiz, or persistence state', () => {
    const snapshot = build(4);
    for (const forbidden of ['step', 'stage', 'frame', 'animation', 'prediction', 'quiz', 'progress']) {
      expect(snapshot).not.toHaveProperty(forbidden);
      expect(snapshot.config).not.toHaveProperty(forbidden);
    }
  });
});
