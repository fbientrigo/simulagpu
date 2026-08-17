/** Contracts for the cudaMemcpy teaching model. */

/** Complete int32_t elements the primary scene lets the learner copy. */
export const CUDA_MEMCPY_ELEMENT_COUNTS = [1, 3, 5] as const;
/** Every canonical buffer in this primitive has exactly five cells. */
export const CUDA_MEMCPY_BUFFER_LENGTH = 5;
/** The modeled element type is int32_t, so every element occupies four bytes. */
export const CUDA_MEMCPY_BYTES_PER_ELEMENT = 4;
export const CUDA_MEMCPY_DIRECTIONS = ['host-to-device', 'device-to-host'] as const;

export type CudaMemcpyElementCount = (typeof CUDA_MEMCPY_ELEMENT_COUNTS)[number];
export type CudaMemcpyDirection = (typeof CUDA_MEMCPY_DIRECTIONS)[number];
export type CudaMemcpyLocation = 'host' | 'device';
export type CudaMemcpyRole = 'source' | 'destination';

/** The enum a real cudaMemcpy call would pass as its fourth argument. */
export type CudaMemcpyKind = 'cudaMemcpyHostToDevice' | 'cudaMemcpyDeviceToHost';

export interface CudaMemcpyConfig {
  readonly direction: CudaMemcpyDirection;
  readonly elementCount: CudaMemcpyElementCount;
}

export type CudaMemcpyConfigInput = Partial<Record<keyof CudaMemcpyConfig, unknown>>;

/**
 * One indexed memory cell. A cell is either `known` (it holds a concrete
 * int32_t value) or `undefined` (allocated storage the model has not given a
 * meaningful value). `value` is `null` exactly when the state is `undefined`,
 * so the snapshot stays JSON-serializable without `undefined`.
 */
export interface CudaMemcpyCell {
  readonly index: number;
  readonly state: 'known' | 'undefined';
  readonly value: number | null;
  /** The value rendered as text, or '?' for an undefined cell. */
  readonly symbol: string;
}

export interface CudaMemcpyRegion {
  /** Stable identifier such as `h_input` or `d_result`. */
  readonly id: string;
  readonly location: CudaMemcpyLocation;
  readonly role: CudaMemcpyRole;
  readonly cells: readonly CudaMemcpyCell[];
}

/**
 * A scene always exposes the host region on one side and the device region on
 * the other, regardless of direction, so the visual geometry never rearranges.
 * The `role` field on each region records which one is read and which one is
 * overwritten for the current direction.
 */
export interface CudaMemcpyScene {
  readonly host: CudaMemcpyRegion;
  readonly device: CudaMemcpyRegion;
}

export interface CudaMemcpyAction {
  readonly code: string;
  readonly kind: CudaMemcpyKind;
  readonly byteCount: number;
  readonly byteExpression: string;
}

/** Immutable truth for one explanatory cudaMemcpy transition. */
export interface CudaMemcpySnapshot {
  readonly config: CudaMemcpyConfig;
  readonly direction: CudaMemcpyDirection;
  readonly kind: CudaMemcpyKind;
  readonly elementCount: number;
  readonly byteCount: number;
  readonly byteExpression: string;
  /** Where the source region lives for this direction. */
  readonly sourceLocation: CudaMemcpyLocation;
  /** Where the destination region lives for this direction. */
  readonly destinationLocation: CudaMemcpyLocation;
  readonly sourceId: string;
  readonly destinationId: string;
  /** Destination indices overwritten by the copy. */
  readonly affectedIndices: readonly number[];
  /** Destination indices left exactly as they were. */
  readonly unaffectedIndices: readonly number[];
  readonly before: CudaMemcpyScene;
  readonly action: CudaMemcpyAction;
  readonly after: CudaMemcpyScene;
  readonly changed: readonly string[];
  readonly unchanged: readonly string[];
  readonly why: string;
}
