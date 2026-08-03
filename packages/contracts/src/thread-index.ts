/**
 * Contracts for the "global thread index" teaching model.
 *
 * This file has no runtime dependencies and no platform dependencies on
 * purpose: it is the bottom of the one-way web dependency flow
 * (contracts -> core -> visuals -> docs).
 *
 * Everything declared here must be JSON-serializable.
 */

/**
 * Inclusive bounds for the four learner-facing controls.
 *
 * These are pedagogical limits, not hardware limits. A real CUDA device caps
 * `blockDim.x` at 1024; we cap it lower because a block that does not fit on
 * screen teaches nothing. `docs/architecture.md` explains the distinction.
 */
export const THREAD_INDEX_LIMITS = {
  /** Vector length `n`. */
  minN: 1,
  maxN: 4096,
  /** Threads per block (`blockDim.x`). Restricted to powers of two. */
  blockSizes: [1, 2, 4, 8, 16, 32, 64, 128, 256] as const,
  /** Number of blocks rendered in full detail before the grid is summarized. */
  maxRenderedBlocks: 64,
} as const;

/** Threads per block offered by the interactive explorer. */
export type BlockSize = (typeof THREAD_INDEX_LIMITS.blockSizes)[number];

/**
 * The complete, normalized input of the teaching model.
 *
 * A `ThreadIndexConfig` is the only thing that determines a snapshot: two
 * equal configs must always produce deeply equal snapshots.
 */
export interface ThreadIndexConfig {
  /** Vector length. */
  readonly n: number;
  /** Threads per block, i.e. `blockDim.x`. */
  readonly blockSize: BlockSize;
  /** Highlighted `blockIdx.x`. */
  readonly selectedBlock: number;
  /** Highlighted `threadIdx.x` inside the selected block. */
  readonly selectedThread: number;
}

/** Partial, untrusted input (URL query, component props) before normalization. */
export type ThreadIndexConfigInput = Partial<Record<keyof ThreadIndexConfig, unknown>>;

/** One thread of one block. */
export interface ThreadSnapshot {
  readonly blockIdx: number;
  readonly threadIdx: number;
  /** `blockIdx.x * blockDim.x + threadIdx.x`. Always computed, even when out of range. */
  readonly globalIndex: number;
  /** `globalIndex < n`. Inactive threads are the ones `if (i < n)` filters out. */
  readonly active: boolean;
  /** Index of the vector element this thread is responsible for, or `null` when inactive. */
  readonly element: number | null;
}

/** One block of the 1D grid. */
export interface BlockSnapshot {
  readonly blockIdx: number;
  readonly threads: readonly ThreadSnapshot[];
  readonly activeCount: number;
  /** True when at least one thread of the block fails the `i < n` guard. */
  readonly isBoundaryBlock: boolean;
}

/** The index formula with the selected values substituted in, ready to display. */
export interface IndexExpression {
  /** `i = blockIdx.x * blockDim.x + threadIdx.x` */
  readonly formula: string;
  /** e.g. `i = 3 * 32 + 5` */
  readonly substituted: string;
  /** e.g. `i = 101` */
  readonly evaluated: string;
  readonly value: number;
}

/** The grid-size formula with the selected values substituted in. */
export interface GridSizeExpression {
  /** `gridDim.x = ceil(n / blockDim.x)` */
  readonly formula: string;
  /** e.g. `gridDim.x = (100 + 32 - 1) / 32` */
  readonly substituted: string;
  /** e.g. `gridDim.x = 4` */
  readonly evaluated: string;
  readonly value: number;
}

/**
 * The immutable, JSON-serializable result of running the teaching model.
 *
 * Produced by `buildThreadIndexSnapshot` in `@simulagpu/core`. Visualizations
 * read it and never mutate it.
 */
export interface ThreadIndexSnapshot {
  readonly config: ThreadIndexConfig;
  /** `gridDim.x`, using ceiling division. */
  readonly gridSize: number;
  /** `gridDim.x * blockDim.x` — how many threads the launch actually creates. */
  readonly totalThreads: number;
  /** `totalThreads - n` — threads that exist but must not write to memory. */
  readonly inactiveThreads: number;
  /** True when `n % blockSize !== 0`, i.e. the last block is partial. */
  readonly hasPartialBlock: boolean;
  /** `blockIdx.x` of the partial block, or `null` when the grid divides evenly. */
  readonly partialBlockIdx: number | null;
  readonly blocks: readonly BlockSnapshot[];
  /** The thread addressed by `selectedBlock` / `selectedThread`. */
  readonly selected: ThreadSnapshot;
  readonly indexExpression: IndexExpression;
  readonly gridSizeExpression: GridSizeExpression;
}
