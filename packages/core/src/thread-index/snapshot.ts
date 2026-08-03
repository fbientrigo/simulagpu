import type {
  BlockSnapshot,
  GridSizeExpression,
  IndexExpression,
  ThreadIndexConfig,
  ThreadIndexSnapshot,
  ThreadSnapshot,
} from '@simulagpu/contracts';

import { ceilDiv } from './config.js';

/**
 * The global 1D index every CUDA thread computes for itself.
 *
 * This mirrors, exactly, the expression the lesson teaches:
 *   `i = blockIdx.x * blockDim.x + threadIdx.x`
 */
export function globalIndex(blockIdx: number, blockDim: number, threadIdx: number): number {
  return blockIdx * blockDim + threadIdx;
}

/** The `if (i < n)` guard, as a function. */
export function isActive(index: number, n: number): boolean {
  return index < n;
}

function buildThread(blockIdx: number, threadIdx: number, config: ThreadIndexConfig): ThreadSnapshot {
  const index = globalIndex(blockIdx, config.blockSize, threadIdx);
  const active = isActive(index, config.n);
  return Object.freeze({
    blockIdx,
    threadIdx,
    globalIndex: index,
    active,
    element: active ? index : null,
  });
}

function buildIndexExpression(config: ThreadIndexConfig, value: number): IndexExpression {
  return Object.freeze({
    formula: 'i = blockIdx.x * blockDim.x + threadIdx.x',
    substituted: `i = ${config.selectedBlock} * ${config.blockSize} + ${config.selectedThread}`,
    evaluated: `i = ${value}`,
    value,
  });
}

function buildGridSizeExpression(config: ThreadIndexConfig, value: number): GridSizeExpression {
  return Object.freeze({
    formula: 'gridDim.x = ceil(n / blockDim.x)',
    substituted: `gridDim.x = (${config.n} + ${config.blockSize} - 1) / ${config.blockSize}`,
    evaluated: `gridDim.x = ${value}`,
    value,
  });
}

/**
 * Run the teaching model.
 *
 * Pure: no clocks, no randomness, no I/O, no mutation of the input. The result
 * is deeply frozen and JSON-serializable, so a configuration always reproduces
 * the same snapshot.
 *
 * This is an explanatory model of how CUDA assigns work to threads. It does
 * not execute CUDA and makes no claim about execution order, warps, or timing.
 */
export function buildThreadIndexSnapshot(config: ThreadIndexConfig): ThreadIndexSnapshot {
  const gridSize = ceilDiv(config.n, config.blockSize);
  const totalThreads = gridSize * config.blockSize;
  const remainder = config.n % config.blockSize;
  const hasPartialBlock = remainder !== 0;

  const blocks: BlockSnapshot[] = [];
  for (let blockIdx = 0; blockIdx < gridSize; blockIdx += 1) {
    const threads: ThreadSnapshot[] = [];
    let activeCount = 0;
    for (let threadIdx = 0; threadIdx < config.blockSize; threadIdx += 1) {
      const thread = buildThread(blockIdx, threadIdx, config);
      if (thread.active) {
        activeCount += 1;
      }
      threads.push(thread);
    }
    blocks.push(
      Object.freeze({
        blockIdx,
        threads: Object.freeze(threads),
        activeCount,
        isBoundaryBlock: activeCount < config.blockSize,
      }),
    );
  }

  const selected = buildThread(config.selectedBlock, config.selectedThread, config);

  return Object.freeze({
    config,
    gridSize,
    totalThreads,
    inactiveThreads: totalThreads - config.n,
    hasPartialBlock,
    partialBlockIdx: hasPartialBlock ? gridSize - 1 : null,
    blocks: Object.freeze(blocks),
    selected,
    indexExpression: buildIndexExpression(config, selected.globalIndex),
    gridSizeExpression: buildGridSizeExpression(config, gridSize),
  });
}
