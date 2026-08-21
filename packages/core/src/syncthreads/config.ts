import {
  SYNCTHREADS_SCENARIOS,
  type SyncthreadsConfig,
  type SyncthreadsConfigInput,
  type SyncthreadsScenario,
} from '@simulagpu/contracts';

export const DEFAULT_SYNCTHREADS_CONFIG: SyncthreadsConfig = Object.freeze({
  scenario: 'primary',
});

const SCENARIO_SET = new Set<SyncthreadsScenario>(SYNCTHREADS_SCENARIOS);

function toScenario(value: unknown): SyncthreadsScenario {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (SCENARIO_SET.has(normalized as SyncthreadsScenario)) {
      return normalized as SyncthreadsScenario;
    }
    // Friendly aliases so links stay forgiving.
    if (normalized === 'block' || normalized === 'blocks' || normalized === 'alcance') return 'scope';
    if (normalized === 'divergente' || normalized === 'partial' || normalized === 'invalid') {
      return 'divergent';
    }
  }
  return DEFAULT_SYNCTHREADS_CONFIG.scenario;
}

/** Every input yields one valid, frozen config; normalization is idempotent. */
export function normalizeSyncthreadsConfig(input: SyncthreadsConfigInput = {}): SyncthreadsConfig {
  return Object.freeze({
    scenario: toScenario(input.scenario),
  });
}

export { SYNCTHREADS_SCENARIOS };
