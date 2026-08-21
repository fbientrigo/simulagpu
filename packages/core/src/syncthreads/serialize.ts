import type { SyncthreadsConfig, SyncthreadsConfigInput } from '@simulagpu/contracts';

import { normalizeSyncthreadsConfig } from './config.js';

const SCENARIO_KEY = 's';

export function encodeSyncthreadsConfig(config: SyncthreadsConfig): string {
  return `${SCENARIO_KEY}=${config.scenario}`;
}

export function decodeSyncthreadsConfig(query: string): SyncthreadsConfig {
  const input: SyncthreadsConfigInput = {};
  const trimmed = query.startsWith('?') ? query.slice(1) : query;
  for (const pair of trimmed.split('&')) {
    const separator = pair.indexOf('=');
    const key = separator === -1 ? pair : pair.slice(0, separator);
    const value = separator === -1 ? '' : pair.slice(separator + 1);
    if (key === SCENARIO_KEY) input.scenario = value;
  }
  return normalizeSyncthreadsConfig(input);
}
