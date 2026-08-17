import type { CudaMemcpyDirection, CudaMemcpyElementCount } from '@simulagpu/contracts';

/**
 * Progress for the cudaMemcpy primitive lives under its own versioned key.
 *
 * The cudaMalloc lesson owns `simulagpu:v1:learner` with a schema hard-wired to
 * a single class. Rather than turn that into a premature universal schema (the
 * design contract forbids abstracting from two instances), this primitive keeps
 * an independent, sibling key. Each lesson resets only its own key.
 */
export const MEMCPY_STORAGE_KEY = 'simulagpu:v1:learner:memcpy';
export const CUDA_MEMCPY_CLASS_ID = 'cuda-memcpy';
export const CUDA_MEMCPY_CARD_IDS = [
  'memcpy-001',
  'memcpy-002',
  'memcpy-003',
  'memcpy-004',
  'memcpy-005',
  'memcpy-006',
] as const;

export const CUDA_MEMCPY_CHECK_COUNT = 3;
const BUFFER_LENGTH = 5;

export interface MemcpyLearnerStateV1 {
  version: 1;
  completedClasses: string[];
  currentClass: typeof CUDA_MEMCPY_CLASS_ID;
  classProgress: {
    'cuda-memcpy': {
      step: number;
      direction: CudaMemcpyDirection;
      elementCount: CudaMemcpyElementCount;
      predictedIndices: number[];
      checkAnswers: Array<number | null>;
    };
  };
  anki: {
    'cuda-memcpy': {
      seen: string[];
    };
  };
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const DIRECTIONS = new Set<CudaMemcpyDirection>(['host-to-device', 'device-to-host']);
const ELEMENT_COUNTS = new Set([1, 3, 5]);
const CARD_IDS = new Set<string>(CUDA_MEMCPY_CARD_IDS);

export function createDefaultMemcpyState(): MemcpyLearnerStateV1 {
  return {
    version: 1,
    completedClasses: [],
    currentClass: CUDA_MEMCPY_CLASS_ID,
    classProgress: {
      'cuda-memcpy': {
        step: 0,
        direction: 'host-to-device',
        elementCount: 3,
        predictedIndices: [],
        checkAnswers: [null, null, null],
      },
    },
    anki: { 'cuda-memcpy': { seen: [] } },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Strict parsing: unsupported or malformed data falls back as one unit. */
export function parseMemcpyState(serialized: string | null): MemcpyLearnerStateV1 {
  if (serialized === null) return createDefaultMemcpyState();

  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!isRecord(parsed) || parsed.version !== 1 || parsed.currentClass !== CUDA_MEMCPY_CLASS_ID) {
      return createDefaultMemcpyState();
    }

    const classProgress = parsed.classProgress;
    const anki = parsed.anki;
    if (!isRecord(classProgress) || !isRecord(classProgress[CUDA_MEMCPY_CLASS_ID])) {
      return createDefaultMemcpyState();
    }
    if (!isRecord(anki) || !isRecord(anki[CUDA_MEMCPY_CLASS_ID])) {
      return createDefaultMemcpyState();
    }

    const progress = classProgress[CUDA_MEMCPY_CLASS_ID];
    const review = anki[CUDA_MEMCPY_CLASS_ID];
    const completedClasses = parsed.completedClasses;

    if (
      !Number.isInteger(progress.step) ||
      (progress.step as number) < 0 ||
      (progress.step as number) > 6 ||
      !(
        typeof progress.direction === 'string' && DIRECTIONS.has(progress.direction as CudaMemcpyDirection)
      ) ||
      !ELEMENT_COUNTS.has(progress.elementCount as number) ||
      !Array.isArray(progress.predictedIndices) ||
      !progress.predictedIndices.every(
        (index) => Number.isInteger(index) && (index as number) >= 0 && (index as number) < BUFFER_LENGTH,
      ) ||
      !Array.isArray(progress.checkAnswers) ||
      progress.checkAnswers.length !== CUDA_MEMCPY_CHECK_COUNT ||
      !progress.checkAnswers.every(
        (answer) => answer === null || (Number.isInteger(answer) && answer >= 0 && answer <= 2),
      ) ||
      !Array.isArray(completedClasses) ||
      !completedClasses.every((id) => id === CUDA_MEMCPY_CLASS_ID) ||
      !Array.isArray(review.seen) ||
      !review.seen.every((id) => typeof id === 'string' && CARD_IDS.has(id))
    ) {
      return createDefaultMemcpyState();
    }

    return {
      version: 1,
      completedClasses: [...new Set(completedClasses as string[])],
      currentClass: CUDA_MEMCPY_CLASS_ID,
      classProgress: {
        'cuda-memcpy': {
          step: progress.step as number,
          direction: progress.direction as CudaMemcpyDirection,
          elementCount: progress.elementCount as CudaMemcpyElementCount,
          predictedIndices: [...new Set(progress.predictedIndices as number[])].sort((a, b) => a - b),
          checkAnswers: [...(progress.checkAnswers as Array<number | null>)],
        },
      },
      anki: {
        'cuda-memcpy': { seen: [...new Set(review.seen as string[])] },
      },
    };
  } catch {
    return createDefaultMemcpyState();
  }
}

function getBrowserStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadMemcpyState(storage: StorageLike | null = getBrowserStorage()): MemcpyLearnerStateV1 {
  if (storage === null) return createDefaultMemcpyState();
  try {
    return parseMemcpyState(storage.getItem(MEMCPY_STORAGE_KEY));
  } catch {
    return createDefaultMemcpyState();
  }
}

export function saveMemcpyState(
  state: MemcpyLearnerStateV1,
  storage: StorageLike | null = getBrowserStorage(),
): boolean {
  if (storage === null) return false;
  try {
    storage.setItem(MEMCPY_STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function resetMemcpyState(storage: StorageLike | null = getBrowserStorage()): MemcpyLearnerStateV1 {
  if (storage !== null) {
    try {
      storage.removeItem(MEMCPY_STORAGE_KEY);
    } catch {
      // Reset still succeeds in memory when storage is blocked.
    }
  }
  return createDefaultMemcpyState();
}
