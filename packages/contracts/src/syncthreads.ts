/** Contracts for the __syncthreads() teaching model. */

/** The three explanatory scenes this primitive teaches, in learning order. */
export const SYNCTHREADS_SCENARIOS = ['primary', 'scope', 'divergent'] as const;

/**
 * Synchronization-boundary state of one thread. This is the state of the thread
 * *with respect to the barrier*, not the whole thread: `waiting` means "arrived
 * at __syncthreads() but cannot cross yet", never "finished its work".
 *
 * - `before`   — has not reached the barrier yet.
 * - `waiting`  — reached the barrier; the block is not complete, so it cannot cross.
 * - `released` — the last required thread arrived; the barrier is satisfied.
 * - `after`    — continued past the barrier into the next phase.
 * - `invalid`  — divergent participation: this thread never executes the barrier
 *                the rest of the block reaches, so the pattern is unsafe. This is
 *                an explicit label, never a simulated hang.
 */
export const SYNCTHREADS_THREAD_STATES = ['before', 'waiting', 'released', 'after', 'invalid'] as const;

/** Fixed teaching arrival order for the primary Block 0 scene. */
export const SYNCTHREADS_ARRIVAL_ORDER = ['T0', 'T2', 'T1', 'T3'] as const;

/** Every canonical block in this primitive has exactly four thread lanes. */
export const SYNCTHREADS_LANE_COUNT = 4;

export type SyncthreadsScenario = (typeof SYNCTHREADS_SCENARIOS)[number];
export type SyncthreadsThreadState = (typeof SYNCTHREADS_THREAD_STATES)[number];

export interface SyncthreadsConfig {
  readonly scenario: SyncthreadsScenario;
}

export type SyncthreadsConfigInput = Partial<Record<keyof SyncthreadsConfig, unknown>>;

/** One thread lane. Geometry (`lane`) is stable; only `state` changes per stage. */
export interface SyncthreadsThreadSnapshot {
  readonly id: string;
  /** Stable lane position 0..3; never reordered when a thread arrives. */
  readonly lane: number;
  readonly state: SyncthreadsThreadState;
  /**
   * Whether this thread has a valid data element (`i < N`). Always `true`
   * except in the divergent scene, where out-of-range threads have `false`.
   */
  readonly hasElement: boolean;
  /** Screen-reader label such as `T1 — esperando en la barrera`. */
  readonly ariaLabel: string;
}

export interface SyncthreadsBlockSnapshot {
  readonly id: number;
  readonly label: string;
  readonly threads: readonly SyncthreadsThreadSnapshot[];
  /** True only when every participating thread of this block reached the barrier. */
  readonly barrierSatisfied: boolean;
  /** Explicit textual counter-state, e.g. "T1 y T3 todavía no llegaron. Nadie cruza." */
  readonly note: string;
}

/**
 * One frozen frame of the deterministic progression. The current stage index is
 * presentation state owned by the Vue component; the model only exposes the full
 * list of stages and never a notion of "current".
 */
export interface SyncthreadsStageSnapshot {
  readonly index: number;
  /** Id of the thread that arrives at this stage, or `null` for the initial/continue stages. */
  readonly arrivedThreadId: string | null;
  /** Causal sentence describing what just happened, in Spanish. */
  readonly caption: string;
  readonly blocks: readonly SyncthreadsBlockSnapshot[];
  /** Focal-block barrier state at this stage. */
  readonly barrierSatisfied: boolean;
  /** Ids waiting at the barrier in the focal block. */
  readonly waitingIds: readonly string[];
  /** Ids that have not reached the barrier yet in the focal block. */
  readonly notArrivedIds: readonly string[];
  /** Whether any thread of the focal block may cross the barrier at this stage. */
  readonly crossingAllowed: boolean;
}

/** Immutable truth for one explanatory __syncthreads() scene. */
export interface SyncthreadsSnapshot {
  readonly config: SyncthreadsConfig;
  readonly scenario: SyncthreadsScenario;
  /** Fixed arrival order for the focal block (empty for static scenes). */
  readonly arrivalOrder: readonly string[];
  readonly stages: readonly SyncthreadsStageSnapshot[];
  /** The CUDA source fragment the scene illustrates. */
  readonly code: string;
  /**
   * True only for the divergent scene: the barrier is used inside a non-uniform
   * condition, so participation is incompatible across the block. Never modeled
   * as a hang — this flag plus the `invalid` thread state carry the meaning.
   */
  readonly invalidParticipation: boolean;
  readonly changed: readonly string[];
  readonly unchanged: readonly string[];
  readonly why: string;
}
