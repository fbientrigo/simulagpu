import type { SyncthreadsScenario } from '@simulagpu/contracts';

/**
 * Progress for the __syncthreads() primitive lives under its own versioned key.
 *
 * Each primitive keeps an independent sibling key rather than a premature shared
 * schema (the design contract forbids abstracting from a handful of instances).
 * Each lesson resets only its own key.
 */
export const SYNCTHREADS_STORAGE_KEY = 'simulagpu:v1:learner:syncthreads';
export const SYNCTHREADS_CLASS_ID = 'syncthreads';
export const SYNCTHREADS_CARD_IDS = [
  'syncthreads-001',
  'syncthreads-002',
  'syncthreads-003',
  'syncthreads-004',
  'syncthreads-005',
  'syncthreads-006',
] as const;

export const SYNCTHREADS_CHECK_COUNT = 4;
const MAX_STEP = 6;

export interface SyncthreadsLearnerStateV1 {
  version: 1;
  completedClasses: string[];
  currentClass: typeof SYNCTHREADS_CLASS_ID;
  classProgress: {
    syncthreads: {
      step: number;
      scenario: SyncthreadsScenario;
      /** Learner's prediction of what T0 does when it arrives first (option index). */
      predictedOption: number | null;
      checkAnswers: Array<number | null>;
    };
  };
  anki: {
    syncthreads: {
      seen: string[];
    };
  };
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const SCENARIOS = new Set<SyncthreadsScenario>(['primary', 'scope', 'divergent']);
const CARD_IDS = new Set<string>(SYNCTHREADS_CARD_IDS);

export function createDefaultSyncthreadsState(): SyncthreadsLearnerStateV1 {
  return {
    version: 1,
    completedClasses: [],
    currentClass: SYNCTHREADS_CLASS_ID,
    classProgress: {
      syncthreads: {
        step: 0,
        scenario: 'primary',
        predictedOption: null,
        checkAnswers: [null, null, null, null],
      },
    },
    anki: { syncthreads: { seen: [] } },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Strict parsing: unsupported or malformed data falls back as one unit. */
export function parseSyncthreadsState(serialized: string | null): SyncthreadsLearnerStateV1 {
  if (serialized === null) return createDefaultSyncthreadsState();

  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!isRecord(parsed) || parsed.version !== 1 || parsed.currentClass !== SYNCTHREADS_CLASS_ID) {
      return createDefaultSyncthreadsState();
    }

    const classProgress = parsed.classProgress;
    const anki = parsed.anki;
    if (!isRecord(classProgress) || !isRecord(classProgress[SYNCTHREADS_CLASS_ID])) {
      return createDefaultSyncthreadsState();
    }
    if (!isRecord(anki) || !isRecord(anki[SYNCTHREADS_CLASS_ID])) {
      return createDefaultSyncthreadsState();
    }

    const progress = classProgress[SYNCTHREADS_CLASS_ID];
    const review = anki[SYNCTHREADS_CLASS_ID];
    const completedClasses = parsed.completedClasses;

    if (
      !Number.isInteger(progress.step) ||
      (progress.step as number) < 0 ||
      (progress.step as number) > MAX_STEP ||
      !(typeof progress.scenario === 'string' && SCENARIOS.has(progress.scenario as SyncthreadsScenario)) ||
      !(
        progress.predictedOption === null ||
        (Number.isInteger(progress.predictedOption) &&
          (progress.predictedOption as number) >= 0 &&
          (progress.predictedOption as number) <= 3)
      ) ||
      !Array.isArray(progress.checkAnswers) ||
      progress.checkAnswers.length !== SYNCTHREADS_CHECK_COUNT ||
      !progress.checkAnswers.every(
        (answer) => answer === null || (Number.isInteger(answer) && answer >= 0 && answer <= 3),
      ) ||
      !Array.isArray(completedClasses) ||
      !completedClasses.every((id) => id === SYNCTHREADS_CLASS_ID) ||
      !Array.isArray(review.seen) ||
      !review.seen.every((id) => typeof id === 'string' && CARD_IDS.has(id))
    ) {
      return createDefaultSyncthreadsState();
    }

    return {
      version: 1,
      completedClasses: [...new Set(completedClasses as string[])],
      currentClass: SYNCTHREADS_CLASS_ID,
      classProgress: {
        syncthreads: {
          step: progress.step as number,
          scenario: progress.scenario as SyncthreadsScenario,
          predictedOption: progress.predictedOption as number | null,
          checkAnswers: [...(progress.checkAnswers as Array<number | null>)],
        },
      },
      anki: {
        syncthreads: { seen: [...new Set(review.seen as string[])] },
      },
    };
  } catch {
    return createDefaultSyncthreadsState();
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

export function loadSyncthreadsState(
  storage: StorageLike | null = getBrowserStorage(),
): SyncthreadsLearnerStateV1 {
  if (storage === null) return createDefaultSyncthreadsState();
  try {
    return parseSyncthreadsState(storage.getItem(SYNCTHREADS_STORAGE_KEY));
  } catch {
    return createDefaultSyncthreadsState();
  }
}

export function saveSyncthreadsState(
  state: SyncthreadsLearnerStateV1,
  storage: StorageLike | null = getBrowserStorage(),
): boolean {
  if (storage === null) return false;
  try {
    storage.setItem(SYNCTHREADS_STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function resetSyncthreadsState(
  storage: StorageLike | null = getBrowserStorage(),
): SyncthreadsLearnerStateV1 {
  if (storage !== null) {
    try {
      storage.removeItem(SYNCTHREADS_STORAGE_KEY);
    } catch {
      // Reset still succeeds in memory when storage is blocked.
    }
  }
  return createDefaultSyncthreadsState();
}
