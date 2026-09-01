/** Contracts for the Class 3 memory-access teaching model. */

export interface MemoryAccessConfig {
  readonly threadCount: number;
  readonly elementCount: number;
  readonly stride: number;
  readonly neighborhoodRadius: number;
}

export type AccessPatternKind = 'contiguous' | 'strided';

export interface MemoryAccessRead {
  readonly address: number | null;
  readonly value: number | null;
  readonly role: 'left' | 'self' | 'right';
}

export interface MemoryAccessThread {
  readonly threadIdx: number;
  readonly privateValue: number;
  readonly contiguousAddress: number;
  readonly stridedAddress: number;
  readonly phaseOneWriteAddress: number;
  readonly phaseOneValue: number;
  readonly phaseTwoReads: readonly MemoryAccessRead[];
}

export interface AccessPatternSummary {
  readonly kind: AccessPatternKind;
  readonly addresses: readonly number[];
  readonly adjacentDeltas: readonly number[];
}

export interface ReuseOpportunity {
  readonly address: number;
  readonly value: number;
  readonly readerThreads: readonly number[];
}

export interface MemoryAccessSnapshot {
  readonly config: MemoryAccessConfig;
  readonly globalInput: readonly number[];
  readonly phaseOneGlobalOutput: readonly number[];
  readonly threads: readonly MemoryAccessThread[];
  readonly accessPatterns: Readonly<{
    contiguous: AccessPatternSummary;
    strided: AccessPatternSummary;
  }>;
  readonly cooperation: Readonly<{
    phaseBoundaryRequiresBarrier: true;
    reason: string;
    scope: 'block';
  }>;
  readonly reuseOpportunities: readonly ReuseOpportunity[];
  readonly assumptions: readonly string[];
}
