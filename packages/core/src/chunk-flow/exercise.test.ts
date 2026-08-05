import { describe, expect, it } from 'vitest';

import { buildExerciseCases } from './exercise.js';

describe('buildExerciseCases', () => {
  it('is deterministic across calls', () => {
    expect(buildExerciseCases()).toEqual(buildExerciseCases());
  });

  it('is JSON-serializable and survives a round trip unchanged', () => {
    const cases = buildExerciseCases();
    expect(JSON.parse(JSON.stringify(cases))).toEqual(cases);
  });

  it('is frozen at every level', () => {
    const cases = buildExerciseCases();
    expect(Object.isFrozen(cases)).toBe(true);
    expect(Object.isFrozen(cases[0])).toBe(true);
    expect(Object.isFrozen(cases[0]?.questions)).toBe(true);
    expect(Object.isFrozen(cases[0]?.questions[0])).toBe(true);
    expect(Object.isFrozen(cases[0]?.questions[0]?.options)).toBe(true);
  });

  it('provides at least two generated deterministic configurations', () => {
    const cases = buildExerciseCases();
    expect(cases.length).toBeGreaterThanOrEqual(2);
    const totalByteCombos = new Set(
      cases.map((c) => `${c.totalBytes}/${c.bytesPerChunk}/${c.threadsPerBlock}`),
    );
    expect(totalByteCombos.size).toBe(cases.length);
  });

  it('matches the mission brief example: 96 bytes / 16 bytes per chunk / 4 threads per block', () => {
    const cases = buildExerciseCases();
    const brief = cases.find((c) => c.totalBytes === 96 && c.bytesPerChunk === 16 && c.threadsPerBlock === 4);
    expect(brief).toBeDefined();

    const chunks = brief?.questions.find((q) => q.id.endsWith('-chunks'));
    const blocks = brief?.questions.find((q) => q.id.endsWith('-blocks'));
    const inactive = brief?.questions.find((q) => q.id.endsWith('-inactive'));

    expect(chunks?.correctValue).toBe(6);
    expect(blocks?.correctValue).toBe(2);
    expect(inactive?.correctValue).toBe(2);
  });

  it('every question offers the correct value among its options, with no duplicates', () => {
    for (const exerciseCase of buildExerciseCases()) {
      for (const question of exerciseCase.questions) {
        const values = question.options.map((option) => option.value);
        expect(values).toContain(question.correctValue);
        expect(new Set(values).size).toBe(values.length);
        expect(values).toEqual([...values].sort((a, b) => a - b));
      }
    }
  });

  it('every option value is non-negative', () => {
    for (const exerciseCase of buildExerciseCases()) {
      for (const question of exerciseCase.questions) {
        for (const option of question.options) {
          expect(option.value).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('every question has a non-empty explanation', () => {
    for (const exerciseCase of buildExerciseCases()) {
      for (const question of exerciseCase.questions) {
        expect(question.explanation.length).toBeGreaterThan(0);
      }
    }
  });

  it('includes at least one exact-division case with zero inactive threads', () => {
    const cases = buildExerciseCases();
    const hasExactCase = cases.some((c) => {
      const inactive = c.questions.find((q) => q.id.endsWith('-inactive'));
      return inactive?.correctValue === 0;
    });
    expect(hasExactCase).toBe(true);
  });
});
