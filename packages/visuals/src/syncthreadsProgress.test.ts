import { describe, expect, it } from 'vitest';

import {
  SYNCTHREADS_CLASS_ID,
  SYNCTHREADS_STORAGE_KEY,
  createDefaultSyncthreadsState,
  parseSyncthreadsState,
  resetSyncthreadsState,
  saveSyncthreadsState,
} from './syncthreadsProgress.js';

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

describe('syncthreadsProgress', () => {
  it('defaults to the primary SEE state', () => {
    const state = createDefaultSyncthreadsState();
    expect(state.currentClass).toBe(SYNCTHREADS_CLASS_ID);
    expect(state.classProgress.syncthreads).toMatchObject({
      step: 0,
      scenario: 'primary',
      predictedOption: null,
    });
    expect(state.classProgress.syncthreads.checkAnswers).toEqual([null, null, null, null]);
    expect(state.completedClasses).toEqual([]);
  });

  it('round-trips a valid saved state', () => {
    const storage = new MemoryStorage();
    const state = createDefaultSyncthreadsState();
    state.classProgress.syncthreads.scenario = 'divergent';
    state.classProgress.syncthreads.predictedOption = 1;
    state.classProgress.syncthreads.checkAnswers = [1, 0, 2, null];
    state.anki.syncthreads.seen = ['syncthreads-002'];
    expect(saveSyncthreadsState(state, storage)).toBe(true);

    const restored = parseSyncthreadsState(storage.getItem(SYNCTHREADS_STORAGE_KEY));
    expect(restored.classProgress.syncthreads.scenario).toBe('divergent');
    expect(restored.classProgress.syncthreads.predictedOption).toBe(1);
    expect(restored.classProgress.syncthreads.checkAnswers).toEqual([1, 0, 2, null]);
    expect(restored.anki.syncthreads.seen).toEqual(['syncthreads-002']);
  });

  it('falls back to defaults on malformed or foreign data', () => {
    expect(parseSyncthreadsState(null)).toEqual(createDefaultSyncthreadsState());
    expect(parseSyncthreadsState('not json')).toEqual(createDefaultSyncthreadsState());
    expect(parseSyncthreadsState(JSON.stringify({ version: 1, currentClass: 'cuda-memcpy' }))).toEqual(
      createDefaultSyncthreadsState(),
    );
    const bad = JSON.stringify({
      version: 1,
      currentClass: 'syncthreads',
      completedClasses: [],
      classProgress: {
        syncthreads: {
          step: 0,
          scenario: 'nonsense',
          predictedOption: null,
          checkAnswers: [null, null, null, null],
        },
      },
      anki: { syncthreads: { seen: [] } },
    });
    expect(parseSyncthreadsState(bad)).toEqual(createDefaultSyncthreadsState());
  });

  it('reset returns a fresh default and removes only its own key', () => {
    const storage = new MemoryStorage();
    saveSyncthreadsState(createDefaultSyncthreadsState(), storage);
    storage.setItem('other-key', 'keep');
    const reset = resetSyncthreadsState(storage);
    expect(reset).toEqual(createDefaultSyncthreadsState());
    expect(storage.getItem(SYNCTHREADS_STORAGE_KEY)).toBeNull();
    expect(storage.getItem('other-key')).toBe('keep');
  });
});
