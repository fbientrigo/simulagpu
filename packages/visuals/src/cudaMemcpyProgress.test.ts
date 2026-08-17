import { describe, expect, it } from 'vitest';

import {
  CUDA_MEMCPY_CLASS_ID,
  createDefaultMemcpyState,
  parseMemcpyState,
  resetMemcpyState,
  saveMemcpyState,
} from './cudaMemcpyProgress.js';

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
}

describe('cudaMemcpyProgress', () => {
  it('defaults to the H2D, 3-element SEE state', () => {
    const state = createDefaultMemcpyState();
    expect(state.currentClass).toBe(CUDA_MEMCPY_CLASS_ID);
    expect(state.classProgress['cuda-memcpy']).toMatchObject({
      step: 0,
      direction: 'host-to-device',
      elementCount: 3,
      predictedIndices: [],
    });
    expect(state.completedClasses).toEqual([]);
  });

  it('round-trips a valid saved state', () => {
    const storage = new MemoryStorage();
    const state = createDefaultMemcpyState();
    state.classProgress['cuda-memcpy'].direction = 'device-to-host';
    state.classProgress['cuda-memcpy'].elementCount = 5;
    state.classProgress['cuda-memcpy'].predictedIndices = [0, 2, 4];
    state.anki['cuda-memcpy'].seen = ['memcpy-002'];
    expect(saveMemcpyState(state, storage)).toBe(true);

    const restored = parseMemcpyState(storage.getItem('simulagpu:v1:learner:memcpy'));
    expect(restored.classProgress['cuda-memcpy'].direction).toBe('device-to-host');
    expect(restored.classProgress['cuda-memcpy'].elementCount).toBe(5);
    expect(restored.classProgress['cuda-memcpy'].predictedIndices).toEqual([0, 2, 4]);
    expect(restored.anki['cuda-memcpy'].seen).toEqual(['memcpy-002']);
  });

  it('falls back to defaults on malformed or foreign data', () => {
    expect(parseMemcpyState(null)).toEqual(createDefaultMemcpyState());
    expect(parseMemcpyState('not json')).toEqual(createDefaultMemcpyState());
    expect(parseMemcpyState(JSON.stringify({ version: 1, currentClass: 'cuda-malloc' }))).toEqual(
      createDefaultMemcpyState(),
    );
    // Out-of-range element count is rejected as one unit.
    const bad = JSON.stringify({
      version: 1,
      currentClass: 'cuda-memcpy',
      completedClasses: [],
      classProgress: {
        'cuda-memcpy': {
          step: 0,
          direction: 'host-to-device',
          elementCount: 2,
          predictedIndices: [],
          checkAnswers: [null, null, null],
        },
      },
      anki: { 'cuda-memcpy': { seen: [] } },
    });
    expect(parseMemcpyState(bad)).toEqual(createDefaultMemcpyState());
  });

  it('reset returns a fresh default and removes the key', () => {
    const storage = new MemoryStorage();
    saveMemcpyState(createDefaultMemcpyState(), storage);
    const reset = resetMemcpyState(storage);
    expect(reset).toEqual(createDefaultMemcpyState());
    expect(storage.getItem('simulagpu:v1:learner:memcpy')).toBeNull();
  });
});
