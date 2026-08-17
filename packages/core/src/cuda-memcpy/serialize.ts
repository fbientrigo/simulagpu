import type { CudaMemcpyConfig, CudaMemcpyConfigInput } from '@simulagpu/contracts';

import { normalizeCudaMemcpyConfig } from './config.js';

const DIRECTION_KEY = 'd';
const ELEMENT_COUNT_KEY = 'n';

/** Compact, stable tokens for the direction in the query string. */
const DIRECTION_TOKEN: Record<CudaMemcpyConfig['direction'], string> = {
  'host-to-device': 'h2d',
  'device-to-host': 'd2h',
};

export function encodeCudaMemcpyConfig(config: CudaMemcpyConfig): string {
  return `${DIRECTION_KEY}=${DIRECTION_TOKEN[config.direction]}&${ELEMENT_COUNT_KEY}=${config.elementCount}`;
}

export function decodeCudaMemcpyConfig(query: string): CudaMemcpyConfig {
  const input: CudaMemcpyConfigInput = {};
  const trimmed = query.startsWith('?') ? query.slice(1) : query;
  for (const pair of trimmed.split('&')) {
    const separator = pair.indexOf('=');
    const key = separator === -1 ? pair : pair.slice(0, separator);
    const value = separator === -1 ? '' : pair.slice(separator + 1);
    if (key === DIRECTION_KEY) input.direction = value;
    if (key === ELEMENT_COUNT_KEY) input.elementCount = value;
  }
  return normalizeCudaMemcpyConfig(input);
}
