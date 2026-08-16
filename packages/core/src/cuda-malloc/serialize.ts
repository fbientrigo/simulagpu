import type { CudaMallocConfig, CudaMallocConfigInput } from '@simulagpu/contracts';

import { normalizeCudaMallocConfig } from './config.js';

const ELEMENT_COUNT_KEY = 'm';

export function encodeCudaMallocConfig(config: CudaMallocConfig): string {
  return `${ELEMENT_COUNT_KEY}=${config.elementCount}`;
}

export function decodeCudaMallocConfig(query: string): CudaMallocConfig {
  const input: CudaMallocConfigInput = {};
  const trimmed = query.startsWith('?') ? query.slice(1) : query;
  for (const pair of trimmed.split('&')) {
    const separator = pair.indexOf('=');
    const key = separator === -1 ? pair : pair.slice(0, separator);
    if (key === ELEMENT_COUNT_KEY) {
      input.elementCount = separator === -1 ? '' : pair.slice(separator + 1);
    }
  }
  return normalizeCudaMallocConfig(input);
}
