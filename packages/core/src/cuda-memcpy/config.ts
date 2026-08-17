import {
  CUDA_MEMCPY_DIRECTIONS,
  CUDA_MEMCPY_ELEMENT_COUNTS,
  type CudaMemcpyConfig,
  type CudaMemcpyConfigInput,
  type CudaMemcpyDirection,
  type CudaMemcpyElementCount,
} from '@simulagpu/contracts';

export const DEFAULT_CUDA_MEMCPY_CONFIG: CudaMemcpyConfig = Object.freeze({
  direction: 'host-to-device',
  elementCount: 3,
});

function toInteger(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.trunc(parsed);
  }
  return fallback;
}

function toDirection(value: unknown): CudaMemcpyDirection {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'device-to-host' || normalized === 'd2h' || normalized === 'devicetohost') {
      return 'device-to-host';
    }
    if (normalized === 'host-to-device' || normalized === 'h2d' || normalized === 'hosttodevice') {
      return 'host-to-device';
    }
  }
  return DEFAULT_CUDA_MEMCPY_CONFIG.direction;
}

/** Snap any request down to the largest supported whole-element count. */
function toElementCount(value: unknown): CudaMemcpyElementCount {
  const requested = toInteger(value, DEFAULT_CUDA_MEMCPY_CONFIG.elementCount);
  let selected: CudaMemcpyElementCount = CUDA_MEMCPY_ELEMENT_COUNTS[0];
  for (const count of CUDA_MEMCPY_ELEMENT_COUNTS) {
    if (count <= requested) selected = count;
  }
  return selected;
}

/** Every input yields one valid, frozen config; normalization is idempotent. */
export function normalizeCudaMemcpyConfig(input: CudaMemcpyConfigInput = {}): CudaMemcpyConfig {
  return Object.freeze({
    direction: toDirection(input.direction),
    elementCount: toElementCount(input.elementCount),
  });
}

export { CUDA_MEMCPY_DIRECTIONS };
