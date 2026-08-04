import {
  REDUCTION_LIMITS,
  type ReductionConfig,
  type ReductionExerciseCase,
  type ReductionExerciseEvaluation,
  type ReductionPairSnapshot,
  type ReductionPassSnapshot,
  type ReductionPreset,
  type ReductionSnapshot,
  type ReductionSubmission,
} from '@simulagpu/contracts';

export const DEFAULT_REDUCTION_CONFIG: ReductionConfig = Object.freeze({
  preset: 'potencia-de-dos',
  indexStrategy: 'pares-adyacentes',
  tailStrategy: 'sumar-cero',
  selectedPass: 0,
});

export const DEFAULT_REDUCTION_SUBMISSION: ReductionSubmission = Object.freeze({
  leftExpression: '2 * out',
  rightExpression: 'left + 1 < n ? input[left + 1] : 0.0f',
  writeExpression: 'output[out]',
});

const PRESETS: Readonly<Record<ReductionPreset, readonly number[]>> = Object.freeze({
  'potencia-de-dos': Object.freeze([3, 1, 7, 0, 4, 1, 6, 3]),
  'tamano-impar': Object.freeze([5, 1, 4, 2, 8, 3, 6]),
  cancelacion: Object.freeze([100_000_000, 1, -100_000_000, 3, 0.25, 0.25, 0.5]),
});

const PRESET_IDS = Object.freeze(Object.keys(PRESETS) as ReductionPreset[]);
const INDEX_STRATEGIES = Object.freeze(['pares-adyacentes', 'pares-solapados'] as const);
const TAIL_STRATEGIES = Object.freeze(['sumar-cero', 'descartar'] as const);

function isMember<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === 'string' && values.includes(value as T);
}

function finiteInteger(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.trunc(value);
}

export function normalizeReductionConfig(
  input: Partial<Record<keyof ReductionConfig, unknown>> = {},
): ReductionConfig {
  const preset = isMember(input.preset, PRESET_IDS) ? input.preset : DEFAULT_REDUCTION_CONFIG.preset;
  const indexStrategy = isMember(input.indexStrategy, INDEX_STRATEGIES)
    ? input.indexStrategy
    : DEFAULT_REDUCTION_CONFIG.indexStrategy;
  const tailStrategy = isMember(input.tailStrategy, TAIL_STRATEGIES)
    ? input.tailStrategy
    : DEFAULT_REDUCTION_CONFIG.tailStrategy;
  const requestedPass = finiteInteger(input.selectedPass, DEFAULT_REDUCTION_CONFIG.selectedPass);
  const selectedPass = Math.min(Math.max(requestedPass, 0), REDUCTION_LIMITS.maxPasses - 1);

  return Object.freeze({ preset, indexStrategy, tailStrategy, selectedPass });
}

function freezeNumbers(values: readonly number[]): readonly number[] {
  return Object.freeze([...values]);
}

function sumExact(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0);
}

export function sumFloat32Sequential(values: readonly number[]): number {
  let sum = Math.fround(0);
  for (const value of values) {
    sum = Math.fround(sum + Math.fround(value));
  }
  return sum;
}

function buildPass(input: readonly number[], pass: number, config: ReductionConfig): ReductionPassSnapshot {
  const outputCount = Math.ceil(input.length / 2);
  const pairs: ReductionPairSnapshot[] = [];
  const output: number[] = [];
  let droppedTailIndex: number | null = null;

  for (let out = 0; out < outputCount; out += 1) {
    const leftIndex = config.indexStrategy === 'pares-adyacentes' ? 2 * out : out;
    const rightIndex = leftIndex + 1;
    const leftValue = input[leftIndex] ?? 0;
    const rightInRange = rightIndex < input.length;
    const rightValue = rightInRange ? (input[rightIndex] ?? 0) : null;

    let outputValue: number | null;
    if (!rightInRange && config.tailStrategy === 'descartar') {
      outputValue = null;
      droppedTailIndex = leftIndex;
    } else {
      outputValue = Math.fround(Math.fround(leftValue) + Math.fround(rightValue ?? 0));
      output.push(outputValue);
    }

    pairs.push(
      Object.freeze({
        outputIndex: out,
        leftIndex,
        rightIndex,
        leftValue,
        rightValue,
        rightInRange,
        outputValue,
      }),
    );
  }

  return Object.freeze({
    pass,
    input: freezeNumbers(input),
    pairs: Object.freeze(pairs),
    output: freezeNumbers(output),
    droppedTailIndex,
  });
}

function diagnosticsFor(config: ReductionConfig, passes: readonly ReductionPassSnapshot[]): readonly string[] {
  const diagnostics: string[] = [];

  if (config.indexStrategy === 'pares-solapados') {
    diagnostics.push(
      'La expresión left = out reutiliza elementos entre pares y deja parte de la entrada sin cubrir.',
    );
  }

  const dropped = passes.find((pass) => pass.droppedTailIndex !== null);
  if (dropped?.droppedTailIndex !== null && dropped?.droppedTailIndex !== undefined) {
    diagnostics.push(
      `La pasada ${dropped.pass + 1} descartó el elemento impar de índice ${dropped.droppedTailIndex}.`,
    );
  }

  if (config.preset === 'cancelacion') {
    diagnostics.push(
      'Las sumas de punto flotante no son asociativas: cambiar el árbol puede cambiar los últimos bits.',
    );
  }

  if (diagnostics.length === 0) {
    diagnostics.push('Cada pasada cubre pares disjuntos y conserva el elemento impar sumándolo con cero.');
  }

  return Object.freeze(diagnostics);
}

/**
 * Build the immutable explanatory model used by the reduction lesson.
 *
 * Every addition is rounded with `Math.fround` to make the floating-point
 * example behave like a sequence of IEEE-754 binary32 additions. This is still
 * a CPU arithmetic model: it does not execute CUDA or model scheduling.
 */
export function buildReductionSnapshot(inputConfig: ReductionConfig): ReductionSnapshot {
  const normalized = normalizeReductionConfig(inputConfig);
  const initialValues = PRESETS[normalized.preset];
  const passes: ReductionPassSnapshot[] = [];
  let current = initialValues;

  for (let pass = 0; current.length > 1 && pass < REDUCTION_LIMITS.maxPasses; pass += 1) {
    const snapshot = buildPass(current, pass, normalized);
    passes.push(snapshot);
    if (snapshot.output.length === 0 || snapshot.output.length >= current.length) break;
    current = snapshot.output;
  }

  const selectedPass = Math.min(normalized.selectedPass, Math.max(passes.length - 1, 0));
  const config = Object.freeze({ ...normalized, selectedPass });
  const selected = passes[selectedPass];
  if (!selected) {
    throw new Error('The reduction teaching model requires an input with at least two values.');
  }

  const result = current.length === 1 ? (current[0] ?? null) : null;
  const reference = sumExact(initialValues);
  const absoluteError = result === null ? null : Math.abs(result - reference);

  return Object.freeze({
    config,
    initialValues,
    passes: Object.freeze(passes),
    selected,
    result,
    reference,
    sequentialFloat32: sumFloat32Sequential(initialValues),
    absoluteError,
    exactForIntegerPresets:
      normalized.preset === 'cancelacion' ? false : result !== null && result === reference,
    diagnostics: diagnosticsFor(config, passes),
  });
}

export function renderReductionSubmission(submission: ReductionSubmission): string {
  return [
    '__global__ void reduce_pass(const float* input, float* output, int n) {',
    '  const int out = blockIdx.x * blockDim.x + threadIdx.x;',
    `  const int left = ${submission.leftExpression};`,
    '  if (left < n) {',
    `    const float right = ${submission.rightExpression};`,
    `    ${submission.writeExpression} = input[left] + right;`,
    '  }',
    '}',
  ].join('\n');
}

function sameNumbers(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function evaluateOnePass(
  input: readonly number[],
  submission: ReductionSubmission,
): { actual: readonly number[] | null; message: string } {
  if (submission.writeExpression !== 'output[out]') {
    return {
      actual: null,
      message: 'Cada hilo debe escribir en output[out]; usar left crea huecos y escrituras fuera del arreglo de salida.',
    };
  }

  const output: number[] = [];
  const outputCount = Math.ceil(input.length / 2);

  for (let out = 0; out < outputCount; out += 1) {
    const left = submission.leftExpression === '2 * out' ? 2 * out : out;
    if (left >= input.length) continue;

    const rightIndex = left + 1;
    let right: number;
    if (rightIndex < input.length) {
      right = input[rightIndex] ?? 0;
    } else if (submission.rightExpression === 'left + 1 < n ? input[left + 1] : 0.0f') {
      right = 0;
    } else if (submission.rightExpression === 'left + 1 < n ? input[left + 1] : input[left]') {
      right = input[left] ?? 0;
    } else {
      return {
        actual: null,
        message: 'La lectura input[left + 1] sale del arreglo cuando n es impar o vale 1.',
      };
    }

    output.push(Math.fround(Math.fround(input[left] ?? 0) + Math.fround(right)));
  }

  return { actual: Object.freeze(output), message: 'La pasada terminó sin accesos inválidos.' };
}

export function evaluateReductionSubmission(submission: ReductionSubmission): ReductionExerciseEvaluation {
  const definitions = [
    { id: 'par', label: 'Tamaño par', input: [2, 4, 6, 8], expected: [6, 14] },
    { id: 'impar', label: 'Tamaño impar', input: [2, 4, 6, 8, 10], expected: [6, 14, 10] },
    { id: 'uno', label: 'Un solo elemento', input: [7], expected: [7] },
  ] as const;

  const cases: ReductionExerciseCase[] = definitions.map((definition) => {
    const result = evaluateOnePass(definition.input, submission);
    const passed = result.actual !== null && sameNumbers(result.actual, definition.expected);
    return Object.freeze({
      id: definition.id,
      label: definition.label,
      input: freezeNumbers(definition.input),
      expected: freezeNumbers(definition.expected),
      actual: result.actual,
      passed,
      message: passed ? 'Correcto: la salida coincide con el oráculo CPU.' : result.message,
    });
  });

  const passed = cases.every((testCase) => testCase.passed);
  return Object.freeze({
    submission: Object.freeze({ ...submission }),
    code: renderReductionSubmission(submission),
    cases: Object.freeze(cases),
    passed,
    summary: passed
      ? 'Las tres pruebas pasan. La pasada reduce pares adyacentes y conserva la cola impar.'
      : 'Aún falla al menos un caso de frontera. Corrige una línea y vuelve a ejecutar.',
  });
}
