import { describe, expect, it } from 'vitest';

import { normalizeChunkFlowConfig } from './config.js';
import { decodeChunkFlowConfig, encodeChunkFlowConfig } from './serialize.js';

describe('encodeChunkFlowConfig / decodeChunkFlowConfig', () => {
  it('produces the expected query string', () => {
    const config = normalizeChunkFlowConfig({
      totalBytes: 96,
      bytesPerChunk: 16,
      threadsPerBlock: 4,
      selectedKind: 'thread',
      selectedIndex: 7,
    });
    expect(encodeChunkFlowConfig(config)).toBe('tb=96&bpc=16&tpb=4&sk=thread&si=7');
  });

  it('round-trips: decode(encode(c)) equals c, for every normalized c', () => {
    const configs = [
      normalizeChunkFlowConfig(),
      normalizeChunkFlowConfig({ totalBytes: 32, bytesPerChunk: 4, threadsPerBlock: 2 }),
      normalizeChunkFlowConfig({
        totalBytes: 256,
        bytesPerChunk: 32,
        threadsPerBlock: 8,
        selectedKind: 'block',
        selectedIndex: 0,
      }),
      normalizeChunkFlowConfig({
        totalBytes: 100,
        bytesPerChunk: 16,
        threadsPerBlock: 4,
        selectedKind: 'chunk',
        selectedIndex: 6,
      }),
    ];
    for (const config of configs) {
      expect(decodeChunkFlowConfig(encodeChunkFlowConfig(config))).toEqual(config);
    }
  });

  it('ignores a leading question mark', () => {
    const config = normalizeChunkFlowConfig({ totalBytes: 64, bytesPerChunk: 8, threadsPerBlock: 4 });
    const query = encodeChunkFlowConfig(config);
    expect(decodeChunkFlowConfig(`?${query}`)).toEqual(decodeChunkFlowConfig(query));
  });

  it('repairs an invalid query instead of failing', () => {
    const config = decodeChunkFlowConfig('tb=abc&bpc=999&tpb=-3&sk=weird&si=');
    expect(config.totalBytes).toBeGreaterThan(0);
    expect(config.bytesPerChunk).toBeGreaterThan(0);
    expect(config.threadsPerBlock).toBeGreaterThan(0);
  });

  it('falls back to defaults for an empty string', () => {
    expect(decodeChunkFlowConfig('')).toEqual(normalizeChunkFlowConfig());
  });
});
