/**
 * Contracts for the "chunk flow" teaching model (Clase 0).
 *
 * This file has no runtime dependencies and no platform dependencies on
 * purpose: it is the bottom of the one-way web dependency flow
 * (contracts -> core -> visuals -> docs).
 *
 * Clase 0 answers a narrower question than the thread-index model: given a
 * byte count, a chunk size and a block size, how does the data get split
 * into chunks, and how do those chunks map onto blocks and threads? It is an
 * explanatory model, not a simulator: it never claims to execute CUDA or to
 * reproduce GPU hardware behavior.
 *
 * Everything declared here must be JSON-serializable.
 */

/**
 * Pedagogical limits for the four learner-facing controls.
 *
 * The `*Options` arrays are what the interactive controls offer. `core`
 * itself accepts any integer within `minTotalBytes..maxTotalBytes` for
 * `totalBytes` (so boundary configurations outside the select, such as 100
 * bytes, remain valid inputs for model-level tests) while `bytesPerChunk`
 * and `threadsPerBlock` are snapped to the nearest allowed option, mirroring
 * how the thread-index model treats `blockSize`.
 */
export const CHUNK_FLOW_LIMITS = {
  /** Learner-facing options for total bytes in the host buffer. */
  totalBytesOptions: [32, 64, 96, 128, 192, 256] as const,
  /** Learner-facing options for bytes per chunk. */
  bytesPerChunkOptions: [4, 8, 16, 32] as const,
  /** Learner-facing options for threads per block. */
  threadsPerBlockOptions: [2, 4, 8] as const,
  /** Smallest total-byte count the model accepts, for boundary configurations. */
  minTotalBytes: 1,
  /** Largest total-byte count the model accepts, for boundary configurations. */
  maxTotalBytes: 4096,
  /** Rendering budget: chunks shown before the scene summarizes the rest. */
  maxRenderedChunks: 64,
  /** Rendering budget: blocks shown before the scene summarizes the rest. */
  maxRenderedBlocks: 32,
} as const;

/** Bytes-per-chunk offered by the interactive simulator. */
export type BytesPerChunkOption = (typeof CHUNK_FLOW_LIMITS.bytesPerChunkOptions)[number];

/** Threads-per-block offered by the interactive simulator. */
export type ThreadsPerBlockOption = (typeof CHUNK_FLOW_LIMITS.threadsPerBlockOptions)[number];

/** What kind of object is currently selected in the scene. */
export type SelectionKind = 'chunk' | 'block' | 'thread';

/**
 * The complete, normalized input of the teaching model.
 *
 * A `ChunkFlowConfig` is the only thing that determines a snapshot: two
 * equal configs must always produce deeply equal snapshots. The current
 * guided step is deliberately absent here: it changes what is narrated, not
 * what is computed, so it lives in the Vue component as presentation state
 * (see `docs/architecture.md`, rule 4).
 */
export interface ChunkFlowConfig {
  /** Total bytes of input data, as prepared by the host. */
  readonly totalBytes: number;
  /** Bytes per chunk. */
  readonly bytesPerChunk: BytesPerChunkOption;
  /** Threads per block. */
  readonly threadsPerBlock: ThreadsPerBlockOption;
  /** Kind of object the learner currently has selected. */
  readonly selectedKind: SelectionKind;
  /**
   * Index of the selected object, within the range of `selectedKind`:
   * a chunk index, a block index, or a global thread slot index.
   */
  readonly selectedIndex: number;
}

/** Partial, untrusted input (URL query, component props) before normalization. */
export type ChunkFlowConfigInput = Partial<Record<keyof ChunkFlowConfig, unknown>>;

/** One chunk of the divided input data. */
export interface ChunkSnapshot {
  readonly index: number;
  /** Offset of the first byte, inclusive. */
  readonly startByte: number;
  /** Offset one past the last byte (exclusive), i.e. `startByte + byteCount`. */
  readonly endByte: number;
  readonly byteCount: number;
  /** True when this chunk has fewer than `bytesPerChunk` bytes, i.e. it is the incomplete final chunk. */
  readonly isPartial: boolean;
  /** Global thread slot assigned to this chunk. In this model, one thread handles one chunk. */
  readonly threadSlot: number;
  readonly blockIdx: number;
  readonly threadIdx: number;
}

/** One thread slot of the grid. A slot may or may not have a chunk assigned. */
export interface ThreadSnapshot {
  /** Index across the whole grid: `blockIdx * threadsPerBlock + threadIdx`. */
  readonly slot: number;
  readonly blockIdx: number;
  readonly threadIdx: number;
  /** True when a chunk was assigned to this slot. */
  readonly active: boolean;
  /** Index of the chunk this thread processes, or `null` when inactive. */
  readonly chunkIndex: number | null;
}

/** One block of the 1D grid. */
export interface BlockSnapshot {
  readonly index: number;
  readonly threads: readonly ThreadSnapshot[];
  readonly activeCount: number;
  /** True when at least one thread of the block has no chunk assigned. */
  readonly isPartialBlock: boolean;
}

/** A formula with concrete values substituted in, ready to display. */
export interface CountExpression {
  /** e.g. `número de chunks = ceil(bytes totales / bytes por chunk)` */
  readonly formula: string;
  /** e.g. `número de chunks = ceil(64 / 8)` */
  readonly substituted: string;
  /** e.g. `número de chunks = 8` */
  readonly evaluated: string;
  readonly value: number;
}

/** Identifier of one step of the guided pedagogical sequence. */
export type StepId =
  | 'cpu'
  | 'chunks'
  | 'transferencia'
  | 'hilos'
  | 'bloques'
  | 'grid'
  | 'paralelo'
  | 'inactivos'
  | 'resultado'
  | 'comprobacion';

/** Which part of the scene a step wants the learner to look at. */
export type StepFocus =
  'cpu' | 'chunks' | 'transferencia' | 'hilos' | 'bloques' | 'grid' | 'inactivos' | 'resultado' | 'ninguno';

/** One step of the guided sequence, with its Spanish narration for the current config. */
export interface StepSnapshot {
  readonly id: StepId;
  /** Zero-based position in the sequence. */
  readonly index: number;
  readonly titulo: string;
  readonly descripcion: string;
  readonly foco: StepFocus;
}

/** Description of whatever the learner currently has selected. */
export interface SelectedObjectSnapshot {
  readonly kind: SelectionKind;
  readonly index: number;
  readonly descripcion: string;
}

/**
 * The immutable, JSON-serializable result of running the teaching model.
 *
 * Produced by `buildChunkFlowSnapshot` in `@simulagpu/core`. Visualizations
 * read it and never mutate it.
 */
export interface ChunkFlowSnapshot {
  readonly config: ChunkFlowConfig;
  /** `ceil(totalBytes / bytesPerChunk)`. */
  readonly chunkCount: number;
  /** `ceil(chunkCount / threadsPerBlock)`. */
  readonly blockCount: number;
  /** `blockCount * threadsPerBlock` — how many thread slots the grid actually has. */
  readonly totalThreadSlots: number;
  /** `totalThreadSlots - chunkCount` — thread slots with no chunk assigned. */
  readonly inactiveThreads: number;
  /** True when `totalBytes % bytesPerChunk !== 0`, i.e. the last chunk is smaller than the rest. */
  readonly hasPartialFinalChunk: boolean;
  /** True when `totalThreadSlots > chunkCount`, i.e. the last block is not full. */
  readonly hasPartialFinalBlock: boolean;
  readonly chunks: readonly ChunkSnapshot[];
  readonly blocks: readonly BlockSnapshot[];
  readonly chunkCountExpression: CountExpression;
  readonly blockCountExpression: CountExpression;
  readonly selected: SelectedObjectSnapshot;
  /** All ten steps of the guided sequence, narrated for this config. */
  readonly steps: readonly StepSnapshot[];
}

/** One selectable option of a multiple-choice exercise question. */
export interface ExerciseOptionSnapshot {
  readonly value: number;
  readonly label: string;
}

/** One question of a guided exercise case. */
export interface ExerciseQuestionSnapshot {
  readonly id: string;
  readonly prompt: string;
  readonly correctValue: number;
  readonly options: readonly ExerciseOptionSnapshot[];
  readonly explanation: string;
}

/** One deterministic configuration of the guided comprehension exercise. */
export interface ExerciseCaseSnapshot {
  readonly id: string;
  readonly totalBytes: number;
  readonly bytesPerChunk: number;
  readonly threadsPerBlock: number;
  readonly questions: readonly ExerciseQuestionSnapshot[];
}
