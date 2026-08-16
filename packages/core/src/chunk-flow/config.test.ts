import { describe, expect, it } from 'vitest';
import { CHUNK_FLOW_LIMITS } from '@simulagpu/contracts';

import { DEFAULT_CHUNK_FLOW_CONFIG, ceilDiv, normalizeChunkFlowConfig } from './config.js';

describe('ceilDiv', () => {
  it('rounds up when the division has a remainder', () => {
    expect(ceilDiv(64, 8)).toBe(8);
    expect(ceilDiv(100, 16)).toBe(7);
    expect(ceilDiv(1, 32)).toBe(1);
  });

  it('is exact when the division has no remainder', () => {
    expect(ceilDiv(96, 16)).toBe(6);
    expect(ceilDiv(256, 32)).toBe(8);
  });
});

describe('normalizeChunkFlowConfig', () => {
  it('returns the defaults for empty input', () => {
    expect(normalizeChunkFlowConfig()).toEqual(DEFAULT_CHUNK_FLOW_CONFIG);
  });

  it('is idempotent', () => {
    const once = normalizeChunkFlowConfig({
      totalBytes: 192,
      bytesPerChunk: 32,
      threadsPerBlock: 8,
      selectedKind: 'block',
      selectedIndex: 1,
    });
    expect(normalizeChunkFlowConfig(once)).toEqual(once);
  });

  it('accepts numeric strings, as they arrive from a URL', () => {
    expect(
      normalizeChunkFlowConfig({
        totalBytes: '64',
        bytesPerChunk: '8',
        threadsPerBlock: '4',
        selectedKind: 'chunk',
        selectedIndex: '2',
      }),
    ).toEqual({
      totalBytes: 64,
      bytesPerChunk: 8,
      threadsPerBlock: 4,
      selectedKind: 'chunk',
      selectedIndex: 2,
    });
  });

  it('clamps totalBytes into the supported range without snapping it to the select options', () => {
    expect(normalizeChunkFlowConfig({ totalBytes: 100 }).totalBytes).toBe(100);
    expect(normalizeChunkFlowConfig({ totalBytes: 0 }).totalBytes).toBe(CHUNK_FLOW_LIMITS.minTotalBytes);
    expect(normalizeChunkFlowConfig({ totalBytes: -5 }).totalBytes).toBe(CHUNK_FLOW_LIMITS.minTotalBytes);
    expect(normalizeChunkFlowConfig({ totalBytes: 10_000_000 }).totalBytes).toBe(
      CHUNK_FLOW_LIMITS.maxTotalBytes,
    );
  });

  it('snaps bytesPerChunk down to an allowed option', () => {
    expect(normalizeChunkFlowConfig({ bytesPerChunk: 20 }).bytesPerChunk).toBe(16);
    expect(normalizeChunkFlowConfig({ bytesPerChunk: 0 }).bytesPerChunk).toBe(4);
    expect(normalizeChunkFlowConfig({ bytesPerChunk: 999 }).bytesPerChunk).toBe(32);
  });

  it('snaps threadsPerBlock down to an allowed option', () => {
    expect(normalizeChunkFlowConfig({ threadsPerBlock: 6 }).threadsPerBlock).toBe(4);
    expect(normalizeChunkFlowConfig({ threadsPerBlock: 0 }).threadsPerBlock).toBe(2);
    expect(normalizeChunkFlowConfig({ threadsPerBlock: 999 }).threadsPerBlock).toBe(8);
  });

  it('falls back to the default selection kind for junk input', () => {
    expect(normalizeChunkFlowConfig({ selectedKind: 'nonsense' }).selectedKind).toBe(
      DEFAULT_CHUNK_FLOW_CONFIG.selectedKind,
    );
  });

  it('keeps the selected chunk inside the chunk count', () => {
    // totalBytes = 64, bytesPerChunk = 16 -> chunkCount = 4, so valid chunk indices are 0..3.
    expect(
      normalizeChunkFlowConfig({
        totalBytes: 64,
        bytesPerChunk: 16,
        selectedKind: 'chunk',
        selectedIndex: 99,
      }).selectedIndex,
    ).toBe(3);
    expect(
      normalizeChunkFlowConfig({
        totalBytes: 64,
        bytesPerChunk: 16,
        selectedKind: 'chunk',
        selectedIndex: -4,
      }).selectedIndex,
    ).toBe(0);
  });

  it('keeps the selected block inside the block count', () => {
    // chunkCount = 6, threadsPerBlock = 4 -> blockCount = 2, so valid block indices are 0..1.
    expect(
      normalizeChunkFlowConfig({
        totalBytes: 96,
        bytesPerChunk: 16,
        threadsPerBlock: 4,
        selectedKind: 'block',
        selectedIndex: 99,
      }).selectedIndex,
    ).toBe(1);
  });

  it('keeps the selected thread inside the total thread slots', () => {
    // chunkCount = 6, threadsPerBlock = 4 -> blockCount = 2 -> totalThreadSlots = 8.
    expect(
      normalizeChunkFlowConfig({
        totalBytes: 96,
        bytesPerChunk: 16,
        threadsPerBlock: 4,
        selectedKind: 'thread',
        selectedIndex: 99,
      }).selectedIndex,
    ).toBe(7);
  });

  it('rejects junk without throwing', () => {
    const config = normalizeChunkFlowConfig({
      totalBytes: 'not a number',
      bytesPerChunk: null,
      threadsPerBlock: {},
      selectedKind: undefined,
      selectedIndex: 'nope',
    });
    expect(config).toEqual(DEFAULT_CHUNK_FLOW_CONFIG);
  });

  it('returns a frozen object', () => {
    expect(Object.isFrozen(normalizeChunkFlowConfig())).toBe(true);
  });
});
