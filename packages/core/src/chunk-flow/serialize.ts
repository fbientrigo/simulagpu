import type { ChunkFlowConfig, ChunkFlowConfigInput } from '@simulagpu/contracts';

import { normalizeChunkFlowConfig } from './config.js';

/**
 * Query-string keys. Short, stable, and part of the public URL contract:
 * once a lesson links to `?tb=96&bpc=16&tpb=4`, that link must keep working.
 */
const KEYS = {
  totalBytes: 'tb',
  bytesPerChunk: 'bpc',
  threadsPerBlock: 'tpb',
  selectedKind: 'sk',
  selectedIndex: 'si',
} as const;

/**
 * Serialize a config to a query string such as `tb=96&bpc=16&tpb=4&sk=thread&si=7`.
 *
 * Implemented with plain string operations rather than `URLSearchParams`
 * because this package must not depend on platform globals.
 */
export function encodeChunkFlowConfig(config: ChunkFlowConfig): string {
  return [
    `${KEYS.totalBytes}=${config.totalBytes}`,
    `${KEYS.bytesPerChunk}=${config.bytesPerChunk}`,
    `${KEYS.threadsPerBlock}=${config.threadsPerBlock}`,
    `${KEYS.selectedKind}=${config.selectedKind}`,
    `${KEYS.selectedIndex}=${config.selectedIndex}`,
  ].join('&');
}

function parseQuery(query: string): Map<string, string> {
  const result = new Map<string, string>();
  const trimmed = query.startsWith('?') ? query.slice(1) : query;
  if (trimmed === '') {
    return result;
  }
  for (const pair of trimmed.split('&')) {
    if (pair === '') continue;
    const separator = pair.indexOf('=');
    if (separator === -1) {
      result.set(pair, '');
    } else {
      result.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
  }
  return result;
}

/**
 * Parse a query string back into a valid config.
 *
 * Unknown keys are ignored and malformed values fall back to defaults, so
 * any string produces a usable configuration. `decode(encode(c))` equals `c`
 * for every normalized `c`.
 */
export function decodeChunkFlowConfig(query: string): ChunkFlowConfig {
  const params = parseQuery(query);
  const input: ChunkFlowConfigInput = {};

  const totalBytes = params.get(KEYS.totalBytes);
  if (totalBytes !== undefined) input.totalBytes = totalBytes;

  const bytesPerChunk = params.get(KEYS.bytesPerChunk);
  if (bytesPerChunk !== undefined) input.bytesPerChunk = bytesPerChunk;

  const threadsPerBlock = params.get(KEYS.threadsPerBlock);
  if (threadsPerBlock !== undefined) input.threadsPerBlock = threadsPerBlock;

  const selectedKind = params.get(KEYS.selectedKind);
  if (selectedKind !== undefined) input.selectedKind = selectedKind;

  const selectedIndex = params.get(KEYS.selectedIndex);
  if (selectedIndex !== undefined) input.selectedIndex = selectedIndex;

  return normalizeChunkFlowConfig(input);
}
