import { describe, expect, it } from 'vitest';
import { THREAD_INDEX_LIMITS } from '@simulagpu/contracts';

import { DEFAULT_THREAD_INDEX_CONFIG, ceilDiv, normalizeThreadIndexConfig } from './config.js';

describe('ceilDiv', () => {
  it('rounds up when the division has a remainder', () => {
    expect(ceilDiv(100, 32)).toBe(4);
    expect(ceilDiv(1, 256)).toBe(1);
    expect(ceilDiv(257, 256)).toBe(2);
  });

  it('is exact when the division has no remainder', () => {
    expect(ceilDiv(256, 256)).toBe(1);
    expect(ceilDiv(1024, 256)).toBe(4);
  });

  it('never loses the tail element, for every size in range', () => {
    for (const blockSize of THREAD_INDEX_LIMITS.blockSizes) {
      for (let n = 1; n <= 600; n += 1) {
        expect(ceilDiv(n, blockSize) * blockSize).toBeGreaterThanOrEqual(n);
        expect((ceilDiv(n, blockSize) - 1) * blockSize).toBeLessThan(n);
      }
    }
  });
});

describe('normalizeThreadIndexConfig', () => {
  it('returns the defaults for empty input', () => {
    expect(normalizeThreadIndexConfig()).toEqual(DEFAULT_THREAD_INDEX_CONFIG);
  });

  it('is idempotent', () => {
    const once = normalizeThreadIndexConfig({ n: 77, blockSize: 16, selectedBlock: 2, selectedThread: 9 });
    expect(normalizeThreadIndexConfig(once)).toEqual(once);
  });

  it('accepts numeric strings, as they arrive from a URL', () => {
    expect(
      normalizeThreadIndexConfig({ n: '65', blockSize: '16', selectedBlock: '1', selectedThread: '0' }),
    ).toEqual({
      n: 65,
      blockSize: 16,
      selectedBlock: 1,
      selectedThread: 0,
    });
  });

  it('clamps n into the supported range', () => {
    expect(normalizeThreadIndexConfig({ n: 0 }).n).toBe(THREAD_INDEX_LIMITS.minN);
    expect(normalizeThreadIndexConfig({ n: -5 }).n).toBe(THREAD_INDEX_LIMITS.minN);
    expect(normalizeThreadIndexConfig({ n: 10_000_000 }).n).toBe(THREAD_INDEX_LIMITS.maxN);
  });

  it('snaps block size down to an allowed power of two', () => {
    expect(normalizeThreadIndexConfig({ blockSize: 33 }).blockSize).toBe(32);
    expect(normalizeThreadIndexConfig({ blockSize: 0 }).blockSize).toBe(1);
    expect(normalizeThreadIndexConfig({ blockSize: 99_999 }).blockSize).toBe(256);
  });

  it('keeps the selected block inside the grid', () => {
    // n = 100, blockSize = 32 -> gridDim.x = 4, so valid blocks are 0..3.
    expect(normalizeThreadIndexConfig({ n: 100, blockSize: 32, selectedBlock: 99 }).selectedBlock).toBe(3);
    expect(normalizeThreadIndexConfig({ n: 100, blockSize: 32, selectedBlock: -4 }).selectedBlock).toBe(0);
  });

  it('keeps the selected thread inside the block', () => {
    expect(normalizeThreadIndexConfig({ blockSize: 16, selectedThread: 40 }).selectedThread).toBe(15);
    expect(normalizeThreadIndexConfig({ blockSize: 16, selectedThread: -1 }).selectedThread).toBe(0);
  });

  it('rejects junk without throwing', () => {
    const config = normalizeThreadIndexConfig({
      n: 'not a number',
      blockSize: null,
      selectedBlock: {},
      selectedThread: undefined,
    });
    expect(config).toEqual(DEFAULT_THREAD_INDEX_CONFIG);
  });

  it('returns a frozen object', () => {
    expect(Object.isFrozen(normalizeThreadIndexConfig())).toBe(true);
  });
});
