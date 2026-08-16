import {
  CUDA_MALLOC_ELEMENT_COUNTS,
  type CudaMallocConfig,
  type CudaMallocConfigInput,
  type CudaMallocElementCount,
} from '@simulagpu/contracts';

export const DEFAULT_CUDA_MALLOC_CONFIG: CudaMallocConfig = Object.freeze({
  elementCount: 4,
});

function toInteger(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.trunc(parsed);
  }
  return fallback;
}

function toElementCount(value: unknown): CudaMallocElementCount {
  const requested = toInteger(value, DEFAULT_CUDA_MALLOC_CONFIG.elementCount);
  let selected: CudaMallocElementCount = CUDA_MALLOC_ELEMENT_COUNTS[0];
  for (const count of CUDA_MALLOC_ELEMENT_COUNTS) {
    if (count <= requested) selected = count;
  }
  return selected;
}

/** Every input yields one of the four pedagogical display sizes. */
export function normalizeCudaMallocConfig(input: CudaMallocConfigInput = {}): CudaMallocConfig {
  return Object.freeze({ elementCount: toElementCount(input.elementCount) });
}
