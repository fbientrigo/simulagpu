import type {
  ExerciseCaseSnapshot,
  ExerciseOptionSnapshot,
  ExerciseQuestionSnapshot,
} from '@simulagpu/contracts';

import { ceilDiv } from './config.js';

/** `"1 bloque"` vs `"6 bloques"` — Spanish noun agreement for a count. */
function contar(cantidad: number, singular: string, plural: string = `${singular}s`): string {
  return `${cantidad} ${cantidad === 1 ? singular : plural}`;
}

/** `"crea"` vs `"crean"` — Spanish verb agreement for a count. */
function verboCrear(cantidad: number): string {
  return cantidad === 1 ? 'crea' : 'crean';
}

interface ExerciseCaseInput {
  readonly id: string;
  readonly totalBytes: number;
  readonly bytesPerChunk: number;
  readonly threadsPerBlock: number;
}

/**
 * Deterministic exercise configurations. At least two are required; three
 * are provided so the learner sees both an exact-division case and one with
 * inactive threads. `CASE_1` is the exact example from the mission brief.
 */
const EXERCISE_CASE_INPUTS: readonly ExerciseCaseInput[] = [
  { id: 'ejercicio-1', totalBytes: 96, bytesPerChunk: 16, threadsPerBlock: 4 },
  { id: 'ejercicio-2', totalBytes: 64, bytesPerChunk: 8, threadsPerBlock: 4 },
  { id: 'ejercicio-3', totalBytes: 192, bytesPerChunk: 32, threadsPerBlock: 8 },
];

/**
 * Build a deterministic, deduplicated, ascending list of options that always
 * contains `correct`. Distractors that collide with the correct value or
 * with each other are skipped and replaced by `correct + 1`, `correct + 2`,
 * ... until `targetCount` distinct non-negative options exist.
 */
function buildOptions(
  correct: number,
  distractors: readonly number[],
  targetCount = 3,
): readonly ExerciseOptionSnapshot[] {
  const values = new Set<number>([correct]);
  for (const candidate of distractors) {
    if (candidate >= 0) values.add(candidate);
  }
  let filler = correct + 1;
  while (values.size < targetCount) {
    if (filler >= 0) values.add(filler);
    filler += 1;
  }
  return Object.freeze(
    [...values].sort((a, b) => a - b).map((value) => Object.freeze({ value, label: String(value) })),
  );
}

function buildQuestions(input: ExerciseCaseInput): readonly ExerciseQuestionSnapshot[] {
  const { totalBytes, bytesPerChunk, threadsPerBlock } = input;
  const chunkCount = ceilDiv(totalBytes, bytesPerChunk);
  const blockCount = ceilDiv(chunkCount, threadsPerBlock);
  const totalThreadSlots = blockCount * threadsPerBlock;
  const inactiveThreads = totalThreadSlots - chunkCount;

  const chunksQuestion: ExerciseQuestionSnapshot = Object.freeze({
    id: `${input.id}-chunks`,
    prompt: `Con ${totalBytes} bytes totales y chunks de ${bytesPerChunk} bytes, ¿cuántos chunks se crean?`,
    correctValue: chunkCount,
    options: buildOptions(chunkCount, [Math.floor(totalBytes / bytesPerChunk)]),
    explanation: `número de chunks = ceil(${totalBytes} / ${bytesPerChunk}) = ${chunkCount}.`,
  });

  const blocksQuestion: ExerciseQuestionSnapshot = Object.freeze({
    id: `${input.id}-blocks`,
    prompt: `Con ${chunkCount} chunks y ${threadsPerBlock} hilos por bloque, ¿cuántos bloques hacen falta?`,
    correctValue: blockCount,
    options: buildOptions(blockCount, [Math.floor(chunkCount / threadsPerBlock)]),
    explanation: `número de bloques = ceil(${chunkCount} / ${threadsPerBlock}) = ${blockCount}.`,
  });

  const inactiveQuestion: ExerciseQuestionSnapshot = Object.freeze({
    id: `${input.id}-inactive`,
    prompt: `Con ${contar(blockCount, 'bloque')} de ${threadsPerBlock} hilos cada uno y ${chunkCount} chunks, ¿cuántos hilos quedan inactivos?`,
    correctValue: inactiveThreads,
    options: buildOptions(inactiveThreads, [0, threadsPerBlock]),
    explanation:
      inactiveThreads > 0
        ? `${contar(blockCount, 'bloque')} ${verboCrear(blockCount)} ${totalThreadSlots} hilos, pero solo hay ${chunkCount} chunks: ` +
          `${totalThreadSlots} - ${chunkCount} = ${inactiveThreads} hilos inactivos.`
        : `${contar(blockCount, 'bloque')} ${verboCrear(blockCount)} ${totalThreadSlots} hilos y hay exactamente ${chunkCount} chunks: ` +
          `${totalThreadSlots} - ${chunkCount} = 0 hilos inactivos.`,
  });

  return Object.freeze([chunksQuestion, blocksQuestion, inactiveQuestion]);
}

/**
 * Build the deterministic set of guided-exercise cases. Pure: calling this
 * twice yields deeply equal results, with no randomness involved.
 */
export function buildExerciseCases(): readonly ExerciseCaseSnapshot[] {
  return Object.freeze(
    EXERCISE_CASE_INPUTS.map((input) =>
      Object.freeze({
        id: input.id,
        totalBytes: input.totalBytes,
        bytesPerChunk: input.bytesPerChunk,
        threadsPerBlock: input.threadsPerBlock,
        questions: buildQuestions(input),
      }),
    ),
  );
}
