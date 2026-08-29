import { describe, expect, it } from 'vitest';

import {
  DEFAULT_MEMORY_ACCESS_CONFIG,
  buildMemoryAccessSnapshot,
  decodeMemoryAccessConfig,
  encodeMemoryAccessConfig,
  normalizeMemoryAccessConfig,
} from './model.js';

describe('memory access teaching model', () => {
  it('is deterministic for the same normalized config', () => {
    const config = { threadCount: 5, elementCount: 8, stride: 3, neighborhoodRadius: 1 };
    expect(buildMemoryAccessSnapshot(config)).toEqual(buildMemoryAccessSnapshot(config));
  });

  it('survives a JSON round trip', () => {
    const snapshot = buildMemoryAccessSnapshot();
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
  });

  it('deep-freezes the snapshot and nested collections', () => {
    const snapshot = buildMemoryAccessSnapshot();
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.config)).toBe(true);
    expect(Object.isFrozen(snapshot.threads)).toBe(true);
    expect(Object.isFrozen(snapshot.threads[0])).toBe(true);
    expect(Object.isFrozen(snapshot.threads[0]!.phaseTwoReads)).toBe(true);
    expect(Object.isFrozen(snapshot.reuseOpportunities)).toBe(true);
  });

  it('normalizes junk and is idempotent', () => {
    const normalized = normalizeMemoryAccessConfig({
      threadCount: 99,
      elementCount: -4,
      stride: Number.NaN,
      neighborhoodRadius: 12,
    });

    expect(normalized).toEqual({ threadCount: 2, elementCount: 2, stride: 2, neighborhoodRadius: 1 });
    expect(normalizeMemoryAccessConfig(normalized)).toEqual(normalized);
  });

  it('round-trips the encoded config without browser APIs', () => {
    const config = normalizeMemoryAccessConfig({ threadCount: 4, elementCount: 7, stride: 3 });
    expect(decodeMemoryAccessConfig(encodeMemoryAccessConfig(config))).toEqual(config);
  });

  it('keeps the smallest valid scene well-defined', () => {
    const snapshot = buildMemoryAccessSnapshot({ threadCount: 1, elementCount: 2, stride: 2 });
    expect(snapshot.threads).toHaveLength(1);
    expect(snapshot.threads[0]!.phaseTwoReads.map((read) => read.address)).toEqual([null, 0, 1]);
    expect(snapshot.cooperation.scope).toBe('block');
  });

  it('separates contiguous and strided logical-address mappings', () => {
    const snapshot = buildMemoryAccessSnapshot({ threadCount: 4, elementCount: 8, stride: 2 });
    expect(snapshot.accessPatterns.contiguous.addresses).toEqual([0, 1, 2, 3]);
    expect(snapshot.accessPatterns.contiguous.adjacentDeltas).toEqual([1, 1, 1]);
    expect(snapshot.accessPatterns.strided.addresses).toEqual([0, 2, 4, 6]);
    expect(snapshot.accessPatterns.strided.adjacentDeltas).toEqual([2, 2, 2]);
  });

  it('makes cross-thread reuse opportunities inspectable without teaching shared memory', () => {
    const snapshot = buildMemoryAccessSnapshot(DEFAULT_MEMORY_ACCESS_CONFIG);
    expect(snapshot.reuseOpportunities.length).toBeGreaterThan(0);
    expect(snapshot.reuseOpportunities[0]).toEqual({
      address: 0,
      value: 10,
      readerThreads: [0, 1],
    });
    expect(snapshot.assumptions.some((line) => line.includes('__shared__'))).toBe(true);
  });
});
