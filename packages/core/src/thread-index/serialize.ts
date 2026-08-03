import type { ThreadIndexConfig, ThreadIndexConfigInput } from '@simulagpu/contracts';

import { normalizeThreadIndexConfig } from './config.js';

/**
 * Query-string keys. Short, stable, and part of the public URL contract: once
 * a lesson links to `?n=100&bs=32`, that link must keep working.
 */
const KEYS = {
  n: 'n',
  blockSize: 'bs',
  selectedBlock: 'b',
  selectedThread: 't',
} as const;

/**
 * Serialize a config to a query string such as `n=100&bs=32&b=3&t=5`.
 *
 * Implemented with plain string operations rather than `URLSearchParams`
 * because this package must not depend on platform globals. Values are
 * integers, so no escaping is required; key order is fixed so that equal
 * configs always produce byte-identical strings.
 */
export function encodeThreadIndexConfig(config: ThreadIndexConfig): string {
  return [
    `${KEYS.n}=${config.n}`,
    `${KEYS.blockSize}=${config.blockSize}`,
    `${KEYS.selectedBlock}=${config.selectedBlock}`,
    `${KEYS.selectedThread}=${config.selectedThread}`,
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
 * Unknown keys are ignored and malformed values fall back to defaults, so any
 * string produces a usable configuration. `decode(encode(c))` equals `c` for
 * every normalized `c`.
 */
export function decodeThreadIndexConfig(query: string): ThreadIndexConfig {
  const params = parseQuery(query);
  const input: ThreadIndexConfigInput = {};

  const n = params.get(KEYS.n);
  if (n !== undefined) input.n = n;

  const blockSize = params.get(KEYS.blockSize);
  if (blockSize !== undefined) input.blockSize = blockSize;

  const selectedBlock = params.get(KEYS.selectedBlock);
  if (selectedBlock !== undefined) input.selectedBlock = selectedBlock;

  const selectedThread = params.get(KEYS.selectedThread);
  if (selectedThread !== undefined) input.selectedThread = selectedThread;

  return normalizeThreadIndexConfig(input);
}
