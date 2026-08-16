import type { CudaMallocElementCount } from '@simulagpu/contracts';

export const LEARNER_STORAGE_KEY = 'simulagpu:v1:learner';
export const CUDA_MALLOC_CLASS_ID = 'cuda-malloc';
export const CUDA_MALLOC_CARD_IDS = ['malloc-001', 'malloc-002', 'malloc-003', 'malloc-004'] as const;

export type CudaMallocPrediction = 'reserva-sin-copiar' | 'copia-datos' | 'inicializa-cero';

export interface LearnerStateV1 {
  version: 1;
  completedClasses: string[];
  currentClass: typeof CUDA_MALLOC_CLASS_ID;
  classProgress: {
    'cuda-malloc': {
      step: number;
      elementCount: CudaMallocElementCount;
      prediction: CudaMallocPrediction | null;
      checkAnswers: Array<number | null>;
    };
  };
  anki: {
    'cuda-malloc': {
      seen: string[];
    };
  };
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const ELEMENT_COUNTS = new Set([1, 2, 4, 8]);
const PREDICTIONS = new Set<CudaMallocPrediction>(['reserva-sin-copiar', 'copia-datos', 'inicializa-cero']);
const CARD_IDS = new Set<string>(CUDA_MALLOC_CARD_IDS);

export function createDefaultLearnerState(): LearnerStateV1 {
  return {
    version: 1,
    completedClasses: [],
    currentClass: CUDA_MALLOC_CLASS_ID,
    classProgress: {
      'cuda-malloc': {
        step: 0,
        elementCount: 4,
        prediction: null,
        checkAnswers: [null, null, null],
      },
    },
    anki: { 'cuda-malloc': { seen: [] } },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Strict parsing: unsupported or malformed data falls back as one unit. */
export function parseLearnerState(serialized: string | null): LearnerStateV1 {
  if (serialized === null) return createDefaultLearnerState();

  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!isRecord(parsed) || parsed.version !== 1 || parsed.currentClass !== CUDA_MALLOC_CLASS_ID) {
      return createDefaultLearnerState();
    }

    const classProgress = parsed.classProgress;
    const anki = parsed.anki;
    if (!isRecord(classProgress) || !isRecord(classProgress[CUDA_MALLOC_CLASS_ID])) {
      return createDefaultLearnerState();
    }
    if (!isRecord(anki) || !isRecord(anki[CUDA_MALLOC_CLASS_ID])) {
      return createDefaultLearnerState();
    }

    const progress = classProgress[CUDA_MALLOC_CLASS_ID];
    const review = anki[CUDA_MALLOC_CLASS_ID];
    const completedClasses = parsed.completedClasses;
    if (
      !Number.isInteger(progress.step) ||
      (progress.step as number) < 0 ||
      (progress.step as number) > 6 ||
      !ELEMENT_COUNTS.has(progress.elementCount as number) ||
      !(
        progress.prediction === null ||
        (typeof progress.prediction === 'string' &&
          PREDICTIONS.has(progress.prediction as CudaMallocPrediction))
      ) ||
      !Array.isArray(progress.checkAnswers) ||
      progress.checkAnswers.length !== 3 ||
      !progress.checkAnswers.every(
        (answer) => answer === null || (Number.isInteger(answer) && answer >= 0 && answer <= 2),
      ) ||
      !Array.isArray(completedClasses) ||
      !completedClasses.every((id) => id === CUDA_MALLOC_CLASS_ID) ||
      !Array.isArray(review.seen) ||
      !review.seen.every((id) => typeof id === 'string' && CARD_IDS.has(id))
    ) {
      return createDefaultLearnerState();
    }

    return {
      version: 1,
      completedClasses: [...new Set(completedClasses as string[])],
      currentClass: CUDA_MALLOC_CLASS_ID,
      classProgress: {
        'cuda-malloc': {
          step: progress.step as number,
          elementCount: progress.elementCount as CudaMallocElementCount,
          prediction: progress.prediction as CudaMallocPrediction | null,
          checkAnswers: [...(progress.checkAnswers as Array<number | null>)],
        },
      },
      anki: {
        'cuda-malloc': { seen: [...new Set(review.seen as string[])] },
      },
    };
  } catch {
    return createDefaultLearnerState();
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

export function loadLearnerState(storage: StorageLike | null = getBrowserStorage()): LearnerStateV1 {
  if (storage === null) return createDefaultLearnerState();
  try {
    return parseLearnerState(storage.getItem(LEARNER_STORAGE_KEY));
  } catch {
    return createDefaultLearnerState();
  }
}

export function saveLearnerState(
  state: LearnerStateV1,
  storage: StorageLike | null = getBrowserStorage(),
): boolean {
  if (storage === null) return false;
  try {
    storage.setItem(LEARNER_STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function resetLearnerState(storage: StorageLike | null = getBrowserStorage()): LearnerStateV1 {
  if (storage !== null) {
    try {
      storage.removeItem(LEARNER_STORAGE_KEY);
    } catch {
      // Reset still succeeds in memory when storage is blocked.
    }
  }
  return createDefaultLearnerState();
}
