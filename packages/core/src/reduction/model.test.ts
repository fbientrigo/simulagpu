import { describe, expect, it } from 'vitest';

import {
  DEFAULT_REDUCTION_CONFIG,
  DEFAULT_REDUCTION_SUBMISSION,
  buildReductionSnapshot,
  evaluateReductionSubmission,
  normalizeReductionConfig,
} from './model.js';

describe('reduction teaching model', () => {
  it('is deterministic and JSON-serializable', () => {
    const first = buildReductionSnapshot(DEFAULT_REDUCTION_CONFIG);
    const second = buildReductionSnapshot(DEFAULT_REDUCTION_CONFIG);

    expect(first).toEqual(second);
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
  });

  it('deep-freezes the learner-facing snapshot', () => {
    const snapshot = buildReductionSnapshot(DEFAULT_REDUCTION_CONFIG);

    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.passes)).toBe(true);
    expect(Object.isFrozen(snapshot.passes[0])).toBe(true);
    expect(Object.isFrozen(snapshot.passes[0]?.pairs)).toBe(true);
    expect(Object.isFrozen(snapshot.passes[0]?.pairs[0])).toBe(true);
  });

  it('reduces the power-of-two preset exactly', () => {
    const snapshot = buildReductionSnapshot(DEFAULT_REDUCTION_CONFIG);

    expect(snapshot.passes.map((pass) => pass.output.length)).toEqual([4, 2, 1]);
    expect(snapshot.result).toBe(25);
    expect(snapshot.reference).toBe(25);
    expect(snapshot.exactForIntegerPresets).toBe(true);
  });

  it('carries an odd tail by adding zero', () => {
    const snapshot = buildReductionSnapshot({
      ...DEFAULT_REDUCTION_CONFIG,
      preset: 'tamano-impar',
    });

    expect(snapshot.passes[0]?.output).toEqual([6, 6, 11, 6]);
    expect(snapshot.passes[0]?.pairs[3]?.rightInRange).toBe(false);
    expect(snapshot.passes[0]?.pairs[3]?.rightValue).toBeNull();
    expect(snapshot.result).toBe(29);
  });

  it('makes a dropped odd tail visible instead of silently accepting it', () => {
    const snapshot = buildReductionSnapshot({
      ...DEFAULT_REDUCTION_CONFIG,
      preset: 'tamano-impar',
      tailStrategy: 'descartar',
    });

    expect(snapshot.result).not.toBe(snapshot.reference);
    expect(snapshot.diagnostics.join(' ')).toContain('descartó');
  });

  it('shows why overlapping pairs do not partition the input', () => {
    const snapshot = buildReductionSnapshot({
      ...DEFAULT_REDUCTION_CONFIG,
      indexStrategy: 'pares-solapados',
    });

    expect(snapshot.result).not.toBe(snapshot.reference);
    expect(snapshot.diagnostics.join(' ')).toContain('reutiliza elementos');
  });

  it('normalizes junk input and is idempotent', () => {
    const normalized = normalizeReductionConfig({
      preset: 'otro',
      indexStrategy: null,
      tailStrategy: 42,
      selectedPass: -100,
    });

    expect(normalized).toEqual(DEFAULT_REDUCTION_CONFIG);
    expect(normalizeReductionConfig(normalized)).toEqual(normalized);
  });

  it('clamps the selected pass to a real pass', () => {
    const snapshot = buildReductionSnapshot({
      ...DEFAULT_REDUCTION_CONFIG,
      selectedPass: 999,
    });

    expect(snapshot.config.selectedPass).toBe(snapshot.passes.length - 1);
    expect(snapshot.selected).toBe(snapshot.passes.at(-1));
  });
});

describe('guided reduction exercise', () => {
  it('passes the even, odd, and singleton cases with the correct fragments', () => {
    const evaluation = evaluateReductionSubmission(DEFAULT_REDUCTION_SUBMISSION);

    expect(evaluation.passed).toBe(true);
    expect(evaluation.cases).toHaveLength(3);
    expect(evaluation.cases.every((testCase) => testCase.passed)).toBe(true);
  });

  it('rejects an unguarded right-hand read', () => {
    const evaluation = evaluateReductionSubmission({
      ...DEFAULT_REDUCTION_SUBMISSION,
      rightExpression: 'input[left + 1]',
    });

    expect(evaluation.passed).toBe(false);
    expect(evaluation.cases.find((testCase) => testCase.id === 'impar')?.actual).toBeNull();
  });

  it('rejects overlapping pairs and the wrong output index', () => {
    const overlap = evaluateReductionSubmission({
      ...DEFAULT_REDUCTION_SUBMISSION,
      leftExpression: 'out',
    });
    const wrongWrite = evaluateReductionSubmission({
      ...DEFAULT_REDUCTION_SUBMISSION,
      writeExpression: 'output[left]',
    });

    expect(overlap.passed).toBe(false);
    expect(wrongWrite.passed).toBe(false);
  });
});
