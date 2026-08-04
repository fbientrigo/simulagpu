/**
 * Contracts for the parallel-reduction teaching model.
 *
 * The model is deliberately small and deterministic. It explains how adjacent
 * pairs are reduced over multiple passes and evaluates a constrained guided
 * exercise. It does not model CUDA scheduling, warps, memory latency, or timing.
 *
 * Everything declared here is JSON-serializable and has no runtime dependency.
 */

export const REDUCTION_LIMITS = {
  maxInputLength: 16,
  maxPasses: 8,
} as const;

export type ReductionPreset = 'potencia-de-dos' | 'tamano-impar' | 'cancelacion';
export type ReductionIndexStrategy = 'pares-adyacentes' | 'pares-solapados';
export type ReductionTailStrategy = 'sumar-cero' | 'descartar';

export interface ReductionConfig {
  readonly preset: ReductionPreset;
  readonly indexStrategy: ReductionIndexStrategy;
  readonly tailStrategy: ReductionTailStrategy;
  readonly selectedPass: number;
}

export interface ReductionPairSnapshot {
  readonly outputIndex: number;
  readonly leftIndex: number;
  readonly rightIndex: number;
  readonly leftValue: number;
  readonly rightValue: number | null;
  readonly rightInRange: boolean;
  readonly outputValue: number | null;
}

export interface ReductionPassSnapshot {
  readonly pass: number;
  readonly input: readonly number[];
  readonly pairs: readonly ReductionPairSnapshot[];
  readonly output: readonly number[];
  readonly droppedTailIndex: number | null;
}

export interface ReductionSnapshot {
  readonly config: ReductionConfig;
  readonly initialValues: readonly number[];
  readonly passes: readonly ReductionPassSnapshot[];
  readonly selected: ReductionPassSnapshot;
  readonly result: number | null;
  readonly reference: number;
  readonly sequentialFloat32: number;
  readonly absoluteError: number | null;
  readonly exactForIntegerPresets: boolean;
  readonly diagnostics: readonly string[];
}

export type ReductionLeftExpression = '2 * out' | 'out';
export type ReductionRightExpression =
  | 'left + 1 < n ? input[left + 1] : 0.0f'
  | 'input[left + 1]'
  | 'left + 1 < n ? input[left + 1] : input[left]';
export type ReductionWriteExpression = 'output[out]' | 'output[left]';

export interface ReductionSubmission {
  readonly leftExpression: ReductionLeftExpression;
  readonly rightExpression: ReductionRightExpression;
  readonly writeExpression: ReductionWriteExpression;
}

export interface ReductionExerciseCase {
  readonly id: string;
  readonly label: string;
  readonly input: readonly number[];
  readonly expected: readonly number[];
  readonly actual: readonly number[] | null;
  readonly passed: boolean;
  readonly message: string;
}

export interface ReductionExerciseEvaluation {
  readonly submission: ReductionSubmission;
  readonly code: string;
  readonly cases: readonly ReductionExerciseCase[];
  readonly passed: boolean;
  readonly summary: string;
}
