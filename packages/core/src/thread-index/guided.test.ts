import { describe, expect, it } from 'vitest';
import { THREAD_INDEX_LIMITS, type GuidedCheckpoint, type GuidedStepId } from '@simulagpu/contracts';

import { GUIDED_THREAD_INDEX_CONFIG, normalizeThreadIndexConfig } from './config.js';
import { buildThreadIndexSnapshot } from './snapshot.js';
import { buildGuidedTour } from './guided.js';

const tour = (input: Parameters<typeof normalizeThreadIndexConfig>[0]) =>
  buildGuidedTour(buildThreadIndexSnapshot(normalizeThreadIndexConfig(input)));

const stepOf = (input: Parameters<typeof normalizeThreadIndexConfig>[0], id: GuidedStepId) => {
  const found = tour(input).steps.find((step) => step.id === id);
  if (found === undefined) throw new Error(`el recorrido no tiene el paso ${id}`);
  return found;
};

const checkpointOf = (input: Parameters<typeof normalizeThreadIndexConfig>[0], id: GuidedStepId) => {
  const { checkpoint } = stepOf(input, id);
  if (checkpoint === null) throw new Error(`el paso ${id} no tiene checkpoint`);
  return checkpoint;
};

const correctOf = (checkpoint: GuidedCheckpoint) => {
  const correct = checkpoint.options.filter((option) => option.correct);
  expect(correct).toHaveLength(1);
  return correct[0];
};

/** The preset the walkthrough opens on: n = 10, blockDim.x = 4. */
const PRESET = GUIDED_THREAD_INDEX_CONFIG;

describe('GUIDED_THREAD_INDEX_CONFIG', () => {
  it('is a valid, already-normalized config', () => {
    expect(normalizeThreadIndexConfig(PRESET)).toEqual(PRESET);
    expect(Object.isFrozen(PRESET)).toBe(true);
  });

  it('is small enough to read and still has a partial last block', () => {
    const snapshot = buildThreadIndexSnapshot(PRESET);
    expect(snapshot.gridSize).toBe(3);
    expect(snapshot.totalThreads).toBe(12);
    expect(snapshot.inactiveThreads).toBe(2);
    expect(snapshot.hasPartialBlock).toBe(true);
  });
});

describe('buildGuidedTour', () => {
  it('is deterministic: the same snapshot yields a deeply equal tour', () => {
    const snapshot = buildThreadIndexSnapshot(PRESET);
    expect(buildGuidedTour(snapshot)).toEqual(buildGuidedTour(snapshot));
  });

  it('is JSON-serializable and survives a round trip unchanged', () => {
    const built = tour(PRESET);
    expect(JSON.parse(JSON.stringify(built))).toEqual(built);
  });

  it('produces frozen data at every level', () => {
    const built = tour(PRESET);
    const step = built.steps[1];
    expect(Object.isFrozen(built)).toBe(true);
    expect(Object.isFrozen(built.steps)).toBe(true);
    expect(Object.isFrozen(step)).toBe(true);
    expect(Object.isFrozen(step?.checkpoint)).toBe(true);
    expect(Object.isFrozen(step?.checkpoint?.options)).toBe(true);
    expect(Object.isFrozen(step?.checkpoint?.options[0])).toBe(true);
  });

  it('teaches the ideas in dependency order', () => {
    const built = tour(PRESET);
    expect(built.steps.map((step) => step.id)).toEqual([
      'problem',
      'grid',
      'thread',
      'index',
      'guard',
      'element',
    ]);
    expect(built.totalSteps).toBe(6);
    expect(built.steps.map((step) => step.position)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('offers between three and five checkpoints', () => {
    const withCheckpoint = tour(PRESET).steps.filter((step) => step.checkpoint !== null);
    expect(withCheckpoint.length).toBeGreaterThanOrEqual(3);
    expect(withCheckpoint.length).toBeLessThanOrEqual(5);
  });

  it('gives every checkpoint exactly one correct answer and unique option ids', () => {
    for (const blockSize of THREAD_INDEX_LIMITS.blockSizes) {
      for (const n of [1, blockSize, blockSize + 1, 3 * blockSize + 1, 97]) {
        for (const selectedThread of [0, blockSize - 1]) {
          const built = tour({ n, blockSize, selectedBlock: 0, selectedThread });
          for (const step of built.steps) {
            if (step.checkpoint === null) continue;
            const { options } = step.checkpoint;
            expect(options.length, `${step.id} con n=${n} bs=${blockSize}`).toBeGreaterThanOrEqual(2);
            expect(options.filter((option) => option.correct)).toHaveLength(1);
            expect(new Set(options.map((option) => option.id)).size).toBe(options.length);
            for (const option of options) {
              expect(option.label.length).toBeGreaterThan(0);
              expect(option.feedback.length).toBeGreaterThan(0);
            }
          }
        }
      }
    }
  });

  it('writes every learner-facing string in Spanish', () => {
    const built = tour(PRESET);
    const prose = built.steps.map((step) => `${step.title} ${step.prompt}`).join(' ');
    // Accents are policy, not decoration: `índice`, not `indice`.
    expect(prose).toContain('índice');
    expect(prose).toContain('bloque');
    expect(prose).not.toMatch(/\bthread\b(?!Idx)/);
  });
});

describe('paso 1: el problema', () => {
  it('states the size of the problem before anything else', () => {
    const step = stepOf(PRESET, 'problem');
    expect(step.prompt).toContain('10 elementos');
    expect(step.detail).toBe('n = 10 elementos, blockDim.x = 4 hilos por bloque');
    expect(step.checkpoint).toBeNull();
  });
});

describe('paso 2: cuántos bloques', () => {
  it('asks for gridDim.x and marks the ceiling division as the answer', () => {
    const checkpoint = checkpointOf(PRESET, 'grid');
    expect(checkpoint.question).toContain('¿cuántos bloques lanza el host?');
    expect(correctOf(checkpoint)?.label).toBe('3');
  });

  it('offers the floor division as the mistake it is', () => {
    const checkpoint = checkpointOf(PRESET, 'grid');
    const floor = checkpoint.options.find((option) => option.label === '2');
    expect(floor?.correct).toBe(false);
    expect(floor?.feedback).toContain('2 elementos se quedarían sin calcular');
  });

  it('still offers a choice when the division is exact', () => {
    const checkpoint = checkpointOf({ n: 12, blockSize: 4 }, 'grid');
    expect(correctOf(checkpoint)?.label).toBe('3');
    expect(checkpoint.options.length).toBeGreaterThanOrEqual(2);
  });

  it('shows the substituted ceiling division as the step detail', () => {
    expect(stepOf(PRESET, 'grid').detail).toBe('gridDim.x = (10 + 4 - 1) / 4 = 3');
  });
});

describe('paso 4: el índice global', () => {
  const CONFIG = { n: 10, blockSize: 4, selectedBlock: 2, selectedThread: 1 };

  it('asks for i and marks blockIdx.x * blockDim.x + threadIdx.x as the answer', () => {
    const checkpoint = checkpointOf(CONFIG, 'index');
    expect(checkpoint.question).toContain('threadIdx.x = 1');
    expect(checkpoint.question).toContain('blockIdx.x = 2');
    expect(correctOf(checkpoint)?.label).toBe('9');
  });

  it('offers the classic mistakes as distractors', () => {
    const checkpoint = checkpointOf(CONFIG, 'index');
    const labels = checkpoint.options.map((option) => option.label);
    // 2 + 1 = 3 (added instead of multiplied) and 2 * 4 = 8 (forgot threadIdx.x).
    expect(labels).toContain('3');
    expect(labels).toContain('8');
  });

  it('sorts the options by value, so the answer has no fixed position', () => {
    const values = checkpointOf(CONFIG, 'index').options.map((option) => Number(option.label));
    expect(values).toEqual([...values].sort((left, right) => left - right));
  });

  it('still offers distinct options when the mistakes collapse onto the answer', () => {
    // blockIdx.x = 0 and threadIdx.x = 0 make every classic mistake produce 0.
    const checkpoint = checkpointOf({ n: 10, blockSize: 4, selectedBlock: 0, selectedThread: 0 }, 'index');
    expect(correctOf(checkpoint)?.label).toBe('0');
    expect(checkpoint.options.length).toBeGreaterThanOrEqual(2);
    expect(new Set(checkpoint.options.map((option) => option.label)).size).toBe(checkpoint.options.length);
  });

  it('shows the substituted formula as the step detail', () => {
    expect(stepOf(CONFIG, 'index').detail).toBe('i = 2 * 4 + 1 = 9');
  });
});

describe('paso 5: el guard', () => {
  it('marks "escribe" as correct for a thread inside the vector', () => {
    const checkpoint = checkpointOf({ n: 10, blockSize: 4, selectedBlock: 2, selectedThread: 1 }, 'guard');
    expect(checkpoint.question).toContain('i = 9');
    expect(correctOf(checkpoint)?.id).toBe('writes');
  });

  it('marks "no escribe" as correct for a thread past the end', () => {
    const checkpoint = checkpointOf({ n: 10, blockSize: 4, selectedBlock: 2, selectedThread: 2 }, 'guard');
    expect(checkpoint.question).toContain('i = 10');
    expect(correctOf(checkpoint)?.id).toBe('skips');
  });

  it('explains the out-of-range write when the learner claims the thread writes', () => {
    const checkpoint = checkpointOf({ n: 10, blockSize: 4, selectedBlock: 2, selectedThread: 3 }, 'guard');
    const writes = checkpoint.options.find((option) => option.id === 'writes');
    expect(writes?.correct).toBe(false);
    expect(writes?.feedback).toContain('fuera del arreglo c');
  });

  it('evaluates the guard in the step detail', () => {
    expect(stepOf({ n: 10, blockSize: 4, selectedBlock: 0, selectedThread: 0 }, 'guard').detail).toBe(
      'if (0 < 10) → verdadero',
    );
    expect(stepOf({ n: 10, blockSize: 4, selectedBlock: 2, selectedThread: 2 }, 'guard').detail).toBe(
      'if (10 < 10) → falso',
    );
  });

  it('says the guard is still needed when nothing overflows', () => {
    expect(stepOf({ n: 12, blockSize: 4 }, 'guard').prompt).toContain('la división fue exacta');
  });
});

describe('paso 6: el trabajo del hilo', () => {
  it('shows the operation an active thread executes', () => {
    expect(stepOf({ n: 10, blockSize: 4, selectedBlock: 1, selectedThread: 1 }, 'element').detail).toBe(
      'c[5] = a[5] + b[5]',
    );
  });

  it('shows that a discarded thread executes nothing', () => {
    expect(stepOf({ n: 10, blockSize: 4, selectedBlock: 2, selectedThread: 3 }, 'element').detail).toBe(
      'sin escritura: el guard descartó i = 11',
    );
  });

  it('asks why the launch overshoots, and blames ceiling division', () => {
    const checkpoint = checkpointOf(PRESET, 'element');
    expect(checkpoint.question).toContain('12 hilos');
    expect(checkpoint.question).toContain('10 elementos');
    expect(correctOf(checkpoint)?.id).toBe('ceil');
  });

  it('turns the exact-division case into the trap it is', () => {
    const checkpoint = checkpointOf({ n: 12, blockSize: 4 }, 'element');
    expect(checkpoint.question).toContain('¿Puedes borrar el guard');
    expect(correctOf(checkpoint)?.id).toBe('keep');
    const remove = checkpoint.options.find((option) => option.id === 'remove');
    expect(remove?.feedback).toContain('escribirá fuera de c');
  });
});

describe('boundary configurations', () => {
  it('handles a single element in a large block', () => {
    const built = tour({ n: 1, blockSize: 256, selectedBlock: 0, selectedThread: 255 });
    expect(built.steps).toHaveLength(6);
    expect(correctOf(checkpointOf({ n: 1, blockSize: 256 }, 'grid'))?.label).toBe('1');
    expect(stepOf({ n: 1, blockSize: 256, selectedBlock: 0, selectedThread: 255 }, 'guard').detail).toBe(
      'if (255 < 1) → falso',
    );
  });

  it('handles one thread per block', () => {
    const built = tour({ n: 3, blockSize: 1, selectedBlock: 2, selectedThread: 0 });
    expect(built.steps[3]?.detail).toBe('i = 2 * 1 + 0 = 2');
    expect(built.steps[1]?.detail).toBe('gridDim.x = (3 + 1 - 1) / 1 = 3');
  });

  it('handles the largest supported vector', () => {
    const built = tour({ n: THREAD_INDEX_LIMITS.maxN, blockSize: 256 });
    expect(built.steps).toHaveLength(6);
    expect(correctOf(checkpointOf({ n: THREAD_INDEX_LIMITS.maxN, blockSize: 256 }, 'grid'))?.label).toBe(
      '16',
    );
  });

  it('carries no presentation state', () => {
    const built = tour(PRESET);
    for (const forbidden of ['current', 'answered', 'visible', 'mode', 'vista']) {
      expect(built).not.toHaveProperty(forbidden);
      expect(built.steps[0]).not.toHaveProperty(forbidden);
    }
  });
});
