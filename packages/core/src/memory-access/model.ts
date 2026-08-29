export interface MemoryAccessConfig {
  threadCount: number;
  elementCount: number;
  stride: number;
  neighborhoodRadius: number;
}

export type AccessPatternKind = 'contiguous' | 'strided';

export interface MemoryAccessRead {
  address: number | null;
  value: number | null;
  role: 'left' | 'self' | 'right';
}

export interface MemoryAccessThread {
  threadIdx: number;
  privateValue: number;
  contiguousAddress: number;
  stridedAddress: number;
  phaseOneWriteAddress: number;
  phaseOneValue: number;
  phaseTwoReads: readonly MemoryAccessRead[];
}

export interface AccessPatternSummary {
  kind: AccessPatternKind;
  addresses: readonly number[];
  adjacentDeltas: readonly number[];
}

export interface ReuseOpportunity {
  address: number;
  value: number;
  readerThreads: readonly number[];
}

export interface MemoryAccessSnapshot {
  config: Readonly<MemoryAccessConfig>;
  globalInput: readonly number[];
  phaseOneGlobalOutput: readonly number[];
  threads: readonly MemoryAccessThread[];
  accessPatterns: Readonly<{
    contiguous: AccessPatternSummary;
    strided: AccessPatternSummary;
  }>;
  cooperation: Readonly<{
    phaseBoundaryRequiresBarrier: true;
    reason: string;
    scope: 'block';
  }>;
  reuseOpportunities: readonly ReuseOpportunity[];
  assumptions: readonly string[];
}

export const DEFAULT_MEMORY_ACCESS_CONFIG: Readonly<MemoryAccessConfig> = Object.freeze({
  threadCount: 6,
  elementCount: 8,
  stride: 2,
  neighborhoodRadius: 1,
});

const clampInteger = (value: unknown, fallback: number, minimum: number, maximum: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.trunc(value)));
};

export function normalizeMemoryAccessConfig(input: Partial<MemoryAccessConfig> = {}): MemoryAccessConfig {
  const elementCount = clampInteger(input.elementCount, DEFAULT_MEMORY_ACCESS_CONFIG.elementCount, 2, 8);
  const threadCount = clampInteger(input.threadCount, DEFAULT_MEMORY_ACCESS_CONFIG.threadCount, 1, elementCount);
  const stride = clampInteger(input.stride, DEFAULT_MEMORY_ACCESS_CONFIG.stride, 2, Math.max(2, elementCount - 1));
  const neighborhoodRadius = clampInteger(
    input.neighborhoodRadius,
    DEFAULT_MEMORY_ACCESS_CONFIG.neighborhoodRadius,
    1,
    1,
  );

  return { threadCount, elementCount, stride, neighborhoodRadius };
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested);
  }
  return value;
}

const buildDeltas = (addresses: readonly number[]): number[] =>
  addresses.slice(1).map((address, index) => address - addresses[index]!);

const boundedRead = (
  output: readonly number[],
  address: number,
  role: MemoryAccessRead['role'],
): MemoryAccessRead => ({
  address: address >= 0 && address < output.length ? address : null,
  value: address >= 0 && address < output.length ? output[address]! : null,
  role,
});

export function buildMemoryAccessSnapshot(input: Partial<MemoryAccessConfig> = {}): MemoryAccessSnapshot {
  const config = normalizeMemoryAccessConfig(input);
  const globalInput = Array.from({ length: config.elementCount }, (_, index) => (index + 1) * 10);

  // Phase one is intentionally ordinary global-memory work. Each active thread
  // produces one deterministic value at its own address.
  const phaseOneGlobalOutput = Array.from({ length: config.elementCount }, (_, index) =>
    index < config.threadCount ? globalInput[index]! + index : 0,
  );

  const contiguousAddresses = Array.from({ length: config.threadCount }, (_, threadIdx) => threadIdx);
  const stridedAddresses = Array.from(
    { length: config.threadCount },
    (_, threadIdx) => (threadIdx * config.stride) % config.elementCount,
  );

  const threads: MemoryAccessThread[] = Array.from({ length: config.threadCount }, (_, threadIdx) => ({
    threadIdx,
    privateValue: threadIdx + 1,
    contiguousAddress: contiguousAddresses[threadIdx]!,
    stridedAddress: stridedAddresses[threadIdx]!,
    phaseOneWriteAddress: threadIdx,
    phaseOneValue: phaseOneGlobalOutput[threadIdx]!,
    phaseTwoReads: [
      boundedRead(phaseOneGlobalOutput, threadIdx - config.neighborhoodRadius, 'left'),
      boundedRead(phaseOneGlobalOutput, threadIdx, 'self'),
      boundedRead(phaseOneGlobalOutput, threadIdx + config.neighborhoodRadius, 'right'),
    ],
  }));

  const readersByAddress = new Map<number, number[]>();
  for (const thread of threads) {
    for (const read of thread.phaseTwoReads) {
      if (read.address === null) continue;
      const readers = readersByAddress.get(read.address) ?? [];
      readers.push(thread.threadIdx);
      readersByAddress.set(read.address, readers);
    }
  }

  const reuseOpportunities: ReuseOpportunity[] = [...readersByAddress.entries()]
    .filter(([, readers]) => readers.length > 1)
    .sort(([left], [right]) => left - right)
    .map(([address, readerThreads]) => ({
      address,
      value: phaseOneGlobalOutput[address]!,
      readerThreads,
    }));

  return deepFreeze({
    config,
    globalInput,
    phaseOneGlobalOutput,
    threads,
    accessPatterns: {
      contiguous: {
        kind: 'contiguous',
        addresses: contiguousAddresses,
        adjacentDeltas: buildDeltas(contiguousAddresses),
      },
      strided: {
        kind: 'strided',
        addresses: stridedAddresses,
        adjacentDeltas: buildDeltas(stridedAddresses),
      },
    },
    cooperation: {
      phaseBoundaryRequiresBarrier: true,
      reason: 'Phase two reads values produced by other threads in the same block during phase one.',
      scope: 'block',
    },
    reuseOpportunities,
    assumptions: [
      'One teaching block is shown; inter-block coordination is outside this model.',
      'Addresses are logical element indices, not byte addresses or hardware transactions.',
      'The model compares access organization qualitatively and does not predict timing or speedup.',
      'Reusable block-local storage is only motivated here; __shared__ semantics belong to Primitive D.',
    ],
  });
}

export function encodeMemoryAccessConfig(input: Partial<MemoryAccessConfig> = {}): string {
  const config = normalizeMemoryAccessConfig(input);
  return `threads=${config.threadCount}&elements=${config.elementCount}&stride=${config.stride}&radius=${config.neighborhoodRadius}`;
}

export function decodeMemoryAccessConfig(encoded: string): MemoryAccessConfig {
  const entries: Record<string, number> = {};
  for (const pair of encoded.split('&')) {
    const [key, rawValue] = pair.split('=', 2);
    if (!key || rawValue === undefined) continue;
    const value = Number(rawValue);
    if (Number.isFinite(value)) entries[key] = value;
  }

  return normalizeMemoryAccessConfig({
    threadCount: entries.threads,
    elementCount: entries.elements,
    stride: entries.stride,
    neighborhoodRadius: entries.radius,
  });
}
