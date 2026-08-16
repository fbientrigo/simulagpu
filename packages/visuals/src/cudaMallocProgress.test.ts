import { describe, expect, it } from 'vitest';

import {
  CUDA_MALLOC_CLASS_ID,
  LEARNER_STORAGE_KEY,
  createDefaultLearnerState,
  loadLearnerState,
  parseLearnerState,
  resetLearnerState,
  saveLearnerState,
} from './cudaMallocProgress.js';

class MemoryStorage {
  readonly values = new Map<string, string>();
  failReads = false;
  failWrites = false;

  getItem(key: string): string | null {
    if (this.failReads) throw new Error('blocked');
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.failWrites) throw new Error('quota');
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

describe('cudaMalloc learner persistence', () => {
  it('round-trips compact class, check, and Anki state', () => {
    const storage = new MemoryStorage();
    const state = createDefaultLearnerState();
    state.completedClasses.push(CUDA_MALLOC_CLASS_ID);
    state.classProgress['cuda-malloc'] = {
      step: 6,
      elementCount: 8,
      prediction: 'reserva-sin-copiar',
      checkAnswers: [1, 0, 2],
    };
    state.anki['cuda-malloc'].seen = ['malloc-001', 'malloc-003'];

    expect(saveLearnerState(state, storage)).toBe(true);
    expect(loadLearnerState(storage)).toEqual(state);
  });

  it('falls back for missing, corrupt, unsupported, or malformed state', () => {
    const fallback = createDefaultLearnerState();
    expect(parseLearnerState(null)).toEqual(fallback);
    expect(parseLearnerState('{bad json')).toEqual(fallback);
    expect(parseLearnerState(JSON.stringify({ version: 2 }))).toEqual(fallback);

    const malformed = createDefaultLearnerState();
    malformed.classProgress['cuda-malloc'].step = 99;
    expect(parseLearnerState(JSON.stringify(malformed))).toEqual(fallback);
  });

  it('deduplicates valid completed-class and seen-card ids', () => {
    const state = createDefaultLearnerState();
    state.completedClasses = [CUDA_MALLOC_CLASS_ID, CUDA_MALLOC_CLASS_ID];
    state.anki['cuda-malloc'].seen = ['malloc-001', 'malloc-001'];
    const parsed = parseLearnerState(JSON.stringify(state));
    expect(parsed.completedClasses).toEqual([CUDA_MALLOC_CLASS_ID]);
    expect(parsed.anki['cuda-malloc'].seen).toEqual(['malloc-001']);
  });

  it('degrades gracefully when storage is unavailable or throws', () => {
    const storage = new MemoryStorage();
    storage.failReads = true;
    expect(loadLearnerState(storage)).toEqual(createDefaultLearnerState());
    expect(loadLearnerState(null)).toEqual(createDefaultLearnerState());

    storage.failReads = false;
    storage.failWrites = true;
    expect(saveLearnerState(createDefaultLearnerState(), storage)).toBe(false);
    expect(saveLearnerState(createDefaultLearnerState(), null)).toBe(false);
  });

  it('reset removes only the SimulaGPU versioned key', () => {
    const storage = new MemoryStorage();
    storage.values.set(LEARNER_STORAGE_KEY, '{}');
    storage.values.set('another-app', 'keep');
    expect(resetLearnerState(storage)).toEqual(createDefaultLearnerState());
    expect(storage.values.has(LEARNER_STORAGE_KEY)).toBe(false);
    expect(storage.values.get('another-app')).toBe('keep');
  });
});
