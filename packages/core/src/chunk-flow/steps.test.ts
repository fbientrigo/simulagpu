import { describe, expect, it } from 'vitest';

import { STEP_COUNT, buildStepSnapshots, type StepNumbers } from './steps.js';

const NUMBERS: StepNumbers = {
  totalBytes: 96,
  bytesPerChunk: 16,
  threadsPerBlock: 4,
  chunkCount: 6,
  blockCount: 2,
  totalThreadSlots: 8,
  inactiveThreads: 2,
  hasPartialFinalChunk: false,
  hasPartialFinalBlock: true,
};

describe('buildStepSnapshots', () => {
  it('is deterministic for the same numbers', () => {
    expect(buildStepSnapshots(NUMBERS)).toEqual(buildStepSnapshots(NUMBERS));
  });

  it('produces exactly STEP_COUNT steps, indexed in order', () => {
    const steps = buildStepSnapshots(NUMBERS);
    expect(steps).toHaveLength(STEP_COUNT);
    steps.forEach((step, index) => expect(step.index).toBe(index));
  });

  it('is frozen at every level', () => {
    const steps = buildStepSnapshots(NUMBERS);
    expect(Object.isFrozen(steps)).toBe(true);
    expect(Object.isFrozen(steps[0])).toBe(true);
  });

  it('substitutes the chunk formula into the "chunks" step', () => {
    const steps = buildStepSnapshots(NUMBERS);
    const step = steps.find((s) => s.id === 'chunks');
    expect(step?.descripcion).toContain('ceil(96 / 16)');
    expect(step?.descripcion).toContain('6 chunks');
  });

  it('mentions the incomplete chunk when hasPartialFinalChunk is true', () => {
    const steps = buildStepSnapshots({ ...NUMBERS, hasPartialFinalChunk: true });
    const step = steps.find((s) => s.id === 'chunks');
    expect(step?.descripcion).toContain('incompleto');
  });

  it('substitutes the block formula into the "bloques" step', () => {
    const steps = buildStepSnapshots(NUMBERS);
    const step = steps.find((s) => s.id === 'bloques');
    expect(step?.descripcion).toContain('ceil(6 / 4)');
    expect(step?.descripcion).toContain('2 bloques');
  });

  it('states the explanatory-model disclaimer in the transfer step', () => {
    const steps = buildStepSnapshots(NUMBERS);
    const step = steps.find((s) => s.id === 'transferencia');
    expect(step?.descripcion.toLowerCase()).toContain('no mide una transferencia real');
  });
});
