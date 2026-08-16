/** Contracts for the cudaMalloc teaching model. */

export const CUDA_MALLOC_ELEMENT_COUNTS = [1, 2, 4, 8] as const;
export const CUDA_MALLOC_BYTES_PER_ELEMENT = 4;

export type CudaMallocElementCount = (typeof CUDA_MALLOC_ELEMENT_COUNTS)[number];

export interface CudaMallocConfig {
  readonly elementCount: CudaMallocElementCount;
}

export type CudaMallocConfigInput = Partial<Record<keyof CudaMallocConfig, unknown>>;

export interface CudaMallocHostCell {
  readonly index: number;
  readonly value: number;
  readonly state: 'valid';
  readonly symbol: '●';
}

export interface CudaMallocDeviceCell {
  readonly index: number;
  readonly state: 'allocated-undefined';
  readonly symbol: '?';
}

export interface CudaMallocDeviceAllocation {
  readonly id: 'device-allocation';
  readonly byteCount: number;
  readonly cells: readonly CudaMallocDeviceCell[];
}

export interface CudaMallocSceneState {
  /** The host variable changes from null to an abstract device-allocation identifier. */
  readonly devicePointer: null | 'device-allocation';
  readonly hostCells: readonly CudaMallocHostCell[];
  readonly deviceAllocation: CudaMallocDeviceAllocation | null;
}

export interface CudaMallocAction {
  readonly code: 'cudaMalloc(&d_A, bytes);';
  readonly byteCount: number;
  readonly byteExpression: string;
}

/** Immutable truth for one successful, explanatory cudaMalloc transition. */
export interface CudaMallocSnapshot {
  readonly config: CudaMallocConfig;
  readonly before: CudaMallocSceneState;
  readonly action: CudaMallocAction;
  readonly after: CudaMallocSceneState;
  readonly changed: readonly string[];
  readonly unchanged: readonly string[];
  readonly why: string;
}
