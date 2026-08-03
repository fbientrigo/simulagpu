import { describe, expect, it } from 'vitest';
import { THREAD_INDEX_LIMITS } from '@simulagpu/contracts';

import { DEFAULT_THREAD_INDEX_CONFIG, normalizeThreadIndexConfig } from './config.js';
import { decodeThreadIndexConfig, encodeThreadIndexConfig } from './serialize.js';
import { buildThreadIndexSnapshot } from './snapshot.js';

describe('encodeThreadIndexConfig', () => {
  it('emits a stable key order', () => {
    expect(encodeThreadIndexConfig(DEFAULT_THREAD_INDEX_CONFIG)).toBe('n=100&bs=32&b=3&t=5');
  });
});

describe('decodeThreadIndexConfig', () => {
  it('accepts a leading question mark', () => {
    expect(decodeThreadIndexConfig('?n=64&bs=16&b=1&t=2')).toEqual({
      n: 64,
      blockSize: 16,
      selectedBlock: 1,
      selectedThread: 2,
    });
  });

  it('falls back to defaults for an empty query', () => {
    expect(decodeThreadIndexConfig('')).toEqual(DEFAULT_THREAD_INDEX_CONFIG);
  });

  it('ignores unknown keys', () => {
    expect(decodeThreadIndexConfig('utm_source=clase&n=64&bs=16&b=0&t=0')).toEqual({
      n: 64,
      blockSize: 16,
      selectedBlock: 0,
      selectedThread: 0,
    });
  });

  it('repairs out-of-range values instead of failing', () => {
    expect(decodeThreadIndexConfig('n=-1&bs=7&b=999&t=999')).toEqual({
      n: 1,
      blockSize: 4,
      selectedBlock: 0,
      selectedThread: 3,
    });
  });
});

describe('round trip', () => {
  it('decode(encode(config)) is the identity for every config in range', () => {
    for (const blockSize of THREAD_INDEX_LIMITS.blockSizes) {
      for (const n of [1, 7, blockSize, blockSize + 1, 100, 1000, THREAD_INDEX_LIMITS.maxN]) {
        const config = normalizeThreadIndexConfig({ n, blockSize, selectedBlock: 1, selectedThread: 0 });
        expect(decodeThreadIndexConfig(encodeThreadIndexConfig(config))).toEqual(config);
      }
    }
  });

  it('reproduces the same snapshot from a shared URL', () => {
    const original = normalizeThreadIndexConfig({
      n: 100,
      blockSize: 32,
      selectedBlock: 3,
      selectedThread: 5,
    });
    const shared = decodeThreadIndexConfig(encodeThreadIndexConfig(original));
    expect(buildThreadIndexSnapshot(shared)).toEqual(buildThreadIndexSnapshot(original));
  });
});
