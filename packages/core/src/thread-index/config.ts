import {
  THREAD_INDEX_LIMITS,
  type BlockSize,
  type ThreadIndexConfig,
  type ThreadIndexConfigInput,
} from '@simulagpu/contracts';

/** Default configuration: small enough to read, with a deliberately partial last block. */
export const DEFAULT_THREAD_INDEX_CONFIG: ThreadIndexConfig = Object.freeze({
  n: 100,
  blockSize: 32,
  selectedBlock: 3,
  selectedThread: 5,
});

/**
 * Where the guided walkthrough starts.
 *
 * Twelve threads across three blocks: the whole launch fits on a phone screen
 * at once, and `10 % 4 !== 0` means the last block is partial from the first
 * step, so the guard has something to do. Deliberately not the default config —
 * `DEFAULT_THREAD_INDEX_CONFIG` is what an empty or unparseable query decodes
 * to, and that is part of the URL contract.
 */
export const GUIDED_THREAD_INDEX_CONFIG: ThreadIndexConfig = Object.freeze({
  n: 10,
  blockSize: 4,
  selectedBlock: 0,
  selectedThread: 0,
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

/**
 * Snap an arbitrary number to the nearest allowed block size, preferring the
 * largest allowed value that does not exceed it.
 */
function toBlockSize(value: unknown, fallback: BlockSize): BlockSize {
  const requested = toInteger(value, fallback);
  const sizes = THREAD_INDEX_LIMITS.blockSizes;
  let chosen: BlockSize = sizes[0];
  for (const size of sizes) {
    if (size <= requested) {
      chosen = size;
    }
  }
  return chosen;
}

/** Ceiling division for non-negative integers, without floating-point rounding. */
export function ceilDiv(numerator: number, denominator: number): number {
  return Math.floor((numerator + denominator - 1) / denominator);
}

/**
 * Turn untrusted input into a valid `ThreadIndexConfig`.
 *
 * Normalization is total: every input produces a config, and normalizing an
 * already-normalized config is a no-op (idempotence). That property is what
 * makes URL round-trips and snapshot determinism testable.
 */
export function normalizeThreadIndexConfig(input: ThreadIndexConfigInput = {}): ThreadIndexConfig {
  const blockSize = toBlockSize(input.blockSize, DEFAULT_THREAD_INDEX_CONFIG.blockSize);

  const n = clamp(
    toInteger(input.n, DEFAULT_THREAD_INDEX_CONFIG.n),
    THREAD_INDEX_LIMITS.minN,
    THREAD_INDEX_LIMITS.maxN,
  );

  const gridSize = ceilDiv(n, blockSize);

  const selectedBlock = clamp(
    toInteger(input.selectedBlock, DEFAULT_THREAD_INDEX_CONFIG.selectedBlock),
    0,
    gridSize - 1,
  );

  const selectedThread = clamp(
    toInteger(input.selectedThread, DEFAULT_THREAD_INDEX_CONFIG.selectedThread),
    0,
    blockSize - 1,
  );

  return Object.freeze({ n, blockSize, selectedBlock, selectedThread });
}
