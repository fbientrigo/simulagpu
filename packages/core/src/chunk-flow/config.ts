import {
  CHUNK_FLOW_LIMITS,
  type BytesPerChunkOption,
  type ChunkFlowConfig,
  type ChunkFlowConfigInput,
  type SelectionKind,
  type ThreadsPerBlockOption,
} from '@simulagpu/contracts';

/** Default configuration: the exact numbers used in the guided exercise, with a deliberately partial final block. */
export const DEFAULT_CHUNK_FLOW_CONFIG: ChunkFlowConfig = Object.freeze({
  totalBytes: 96,
  bytesPerChunk: 16,
  threadsPerBlock: 4,
  selectedKind: 'thread',
  selectedIndex: 7,
});

function toInteger(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.trunc(parsed);
    }
  }
  return fallback;
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/** Snap an arbitrary number to the nearest allowed option, preferring the largest option that does not exceed it. */
function snapToAllowed<T extends number>(value: unknown, allowed: readonly T[], fallback: T): T {
  const requested = toInteger(value, fallback);
  let chosen: T = allowed[0] as T;
  for (const option of allowed) {
    if (option <= requested) {
      chosen = option;
    }
  }
  return chosen;
}

function normalizeSelectionKind(value: unknown, fallback: SelectionKind): SelectionKind {
  return value === 'chunk' || value === 'block' || value === 'thread' ? value : fallback;
}

/** Ceiling division for non-negative integers, without floating-point rounding. */
export function ceilDiv(numerator: number, denominator: number): number {
  return Math.floor((numerator + denominator - 1) / denominator);
}

/**
 * Turn untrusted input into a valid `ChunkFlowConfig`.
 *
 * Normalization is total: every input produces a config, and normalizing an
 * already-normalized config is a no-op (idempotence). `totalBytes` is
 * clamped rather than snapped to `CHUNK_FLOW_LIMITS.totalBytesOptions`, so a
 * boundary value outside the interactive select — such as 100 bytes —
 * remains a valid, testable configuration of the model.
 */
export function normalizeChunkFlowConfig(input: ChunkFlowConfigInput = {}): ChunkFlowConfig {
  const bytesPerChunk: BytesPerChunkOption = snapToAllowed(
    input.bytesPerChunk,
    CHUNK_FLOW_LIMITS.bytesPerChunkOptions,
    DEFAULT_CHUNK_FLOW_CONFIG.bytesPerChunk,
  );

  const threadsPerBlock: ThreadsPerBlockOption = snapToAllowed(
    input.threadsPerBlock,
    CHUNK_FLOW_LIMITS.threadsPerBlockOptions,
    DEFAULT_CHUNK_FLOW_CONFIG.threadsPerBlock,
  );

  const totalBytes = clamp(
    toInteger(input.totalBytes, DEFAULT_CHUNK_FLOW_CONFIG.totalBytes),
    CHUNK_FLOW_LIMITS.minTotalBytes,
    CHUNK_FLOW_LIMITS.maxTotalBytes,
  );

  const chunkCount = ceilDiv(totalBytes, bytesPerChunk);
  const blockCount = ceilDiv(chunkCount, threadsPerBlock);
  const totalThreadSlots = blockCount * threadsPerBlock;

  const selectedKind = normalizeSelectionKind(input.selectedKind, DEFAULT_CHUNK_FLOW_CONFIG.selectedKind);
  const maxIndexForKind =
    selectedKind === 'chunk'
      ? chunkCount - 1
      : selectedKind === 'block'
        ? blockCount - 1
        : totalThreadSlots - 1;

  const selectedIndex = clamp(
    toInteger(input.selectedIndex, DEFAULT_CHUNK_FLOW_CONFIG.selectedIndex),
    0,
    Math.max(0, maxIndexForKind),
  );

  return Object.freeze({ totalBytes, bytesPerChunk, threadsPerBlock, selectedKind, selectedIndex });
}
