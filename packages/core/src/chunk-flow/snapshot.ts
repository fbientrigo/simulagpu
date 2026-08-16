import type {
  ChunkFlowBlockSnapshot as BlockSnapshot,
  ChunkFlowConfig,
  ChunkFlowSnapshot,
  ChunkFlowThreadSnapshot as ThreadSnapshot,
  ChunkSnapshot,
  CountExpression,
  SelectedObjectSnapshot,
} from '@simulagpu/contracts';

import { ceilDiv } from './config.js';
import { buildStepSnapshots } from './steps.js';

function buildChunk(index: number, config: ChunkFlowConfig): ChunkSnapshot {
  const startByte = index * config.bytesPerChunk;
  const endByte = Math.min(startByte + config.bytesPerChunk, config.totalBytes);
  const byteCount = endByte - startByte;
  const blockIdx = Math.floor(index / config.threadsPerBlock);
  const threadIdx = index % config.threadsPerBlock;
  return Object.freeze({
    index,
    startByte,
    endByte,
    byteCount,
    isPartial: byteCount < config.bytesPerChunk,
    threadSlot: index,
    blockIdx,
    threadIdx,
  });
}

function buildThread(slot: number, config: ChunkFlowConfig, chunkCount: number): ThreadSnapshot {
  const blockIdx = Math.floor(slot / config.threadsPerBlock);
  const threadIdx = slot % config.threadsPerBlock;
  const active = slot < chunkCount;
  return Object.freeze({
    slot,
    blockIdx,
    threadIdx,
    active,
    chunkIndex: active ? slot : null,
  });
}

function buildChunkCountExpression(config: ChunkFlowConfig, value: number): CountExpression {
  return Object.freeze({
    formula: 'número de chunks = ceil(bytes totales / bytes por chunk)',
    substituted: `número de chunks = ceil(${config.totalBytes} / ${config.bytesPerChunk})`,
    evaluated: `número de chunks = ${value}`,
    value,
  });
}

function buildBlockCountExpression(
  config: ChunkFlowConfig,
  chunkCount: number,
  value: number,
): CountExpression {
  return Object.freeze({
    formula: 'número de bloques = ceil(número de chunks / hilos por bloque)',
    substituted: `número de bloques = ceil(${chunkCount} / ${config.threadsPerBlock})`,
    evaluated: `número de bloques = ${value}`,
    value,
  });
}

function describeChunk(chunk: ChunkSnapshot, bytesPerChunk: number): string {
  const rango =
    chunk.byteCount === 1 ? `byte ${chunk.startByte}` : `bytes ${chunk.startByte}–${chunk.endByte - 1}`;
  const parcial = chunk.isPartial ? ', incompleto: tiene menos bytes que los demás chunks' : '';
  return (
    `Chunk ${chunk.index}: ${rango} (${chunk.byteCount} de ${bytesPerChunk} bytes)` +
    `${parcial}. Lo procesa el hilo ${chunk.threadIdx} del bloque ${chunk.blockIdx}.`
  );
}

function describeBlock(block: BlockSnapshot, threadsPerBlock: number): string {
  const parcial = block.isPartialBlock
    ? ', bloque incompleto: le faltan chunks para llenar todos sus hilos'
    : '';
  return `Bloque ${block.index}: ${block.activeCount} de ${threadsPerBlock} hilos activos${parcial}.`;
}

function describeThread(thread: ThreadSnapshot): string {
  const base = `Hilo ${thread.threadIdx} del bloque ${thread.blockIdx} (posición ${thread.slot} en la grid)`;
  return thread.active
    ? `${base}: activo, procesa el chunk ${thread.chunkIndex}.`
    : `${base}: inactivo, no tiene ningún chunk asignado.`;
}

function buildSelected(
  config: ChunkFlowConfig,
  chunks: readonly ChunkSnapshot[],
  blocks: readonly BlockSnapshot[],
): SelectedObjectSnapshot {
  if (config.selectedKind === 'chunk') {
    const chunk = chunks[config.selectedIndex] ?? chunks[0];
    return Object.freeze({
      kind: 'chunk' as const,
      index: chunk ? chunk.index : 0,
      descripcion: chunk
        ? describeChunk(chunk, config.bytesPerChunk)
        : 'No hay chunks en esta configuración.',
    });
  }

  if (config.selectedKind === 'block') {
    const block = blocks[config.selectedIndex] ?? blocks[0];
    return Object.freeze({
      kind: 'block' as const,
      index: block ? block.index : 0,
      descripcion: block
        ? describeBlock(block, config.threadsPerBlock)
        : 'No hay bloques en esta configuración.',
    });
  }

  const blockIdx = Math.floor(config.selectedIndex / config.threadsPerBlock);
  const block = blocks[blockIdx];
  const threadIdx = config.selectedIndex % config.threadsPerBlock;
  const thread = block?.threads[threadIdx];
  return Object.freeze({
    kind: 'thread' as const,
    index: config.selectedIndex,
    descripcion: thread ? describeThread(thread) : 'No hay hilos en esta configuración.',
  });
}

/**
 * Run the teaching model.
 *
 * Pure: no clocks, no randomness, no I/O, no mutation of the input. The
 * result is deeply frozen and JSON-serializable, so a configuration always
 * reproduces the same snapshot.
 *
 * This is an explanatory model of how work is split into chunks and
 * distributed across blocks and threads. It does not execute CUDA and makes
 * no claim about real transfer time, scheduling, or hardware behavior.
 */
export function buildChunkFlowSnapshot(config: ChunkFlowConfig): ChunkFlowSnapshot {
  const chunkCount = ceilDiv(config.totalBytes, config.bytesPerChunk);
  const blockCount = ceilDiv(chunkCount, config.threadsPerBlock);
  const totalThreadSlots = blockCount * config.threadsPerBlock;
  const inactiveThreads = totalThreadSlots - chunkCount;
  const hasPartialFinalChunk = config.totalBytes % config.bytesPerChunk !== 0;
  const hasPartialFinalBlock = inactiveThreads > 0;

  const chunks: ChunkSnapshot[] = [];
  for (let index = 0; index < chunkCount; index += 1) {
    chunks.push(buildChunk(index, config));
  }

  const blocks: BlockSnapshot[] = [];
  for (let blockIdx = 0; blockIdx < blockCount; blockIdx += 1) {
    const threads: ThreadSnapshot[] = [];
    let activeCount = 0;
    for (let threadIdx = 0; threadIdx < config.threadsPerBlock; threadIdx += 1) {
      const slot = blockIdx * config.threadsPerBlock + threadIdx;
      const thread = buildThread(slot, config, chunkCount);
      if (thread.active) activeCount += 1;
      threads.push(thread);
    }
    blocks.push(
      Object.freeze({
        index: blockIdx,
        threads: Object.freeze(threads),
        activeCount,
        isPartialBlock: activeCount < config.threadsPerBlock,
      }),
    );
  }

  const frozenChunks = Object.freeze(chunks);
  const frozenBlocks = Object.freeze(blocks);

  return Object.freeze({
    config,
    chunkCount,
    blockCount,
    totalThreadSlots,
    inactiveThreads,
    hasPartialFinalChunk,
    hasPartialFinalBlock,
    chunks: frozenChunks,
    blocks: frozenBlocks,
    chunkCountExpression: buildChunkCountExpression(config, chunkCount),
    blockCountExpression: buildBlockCountExpression(config, chunkCount, blockCount),
    selected: buildSelected(config, frozenChunks, frozenBlocks),
    steps: buildStepSnapshots({
      totalBytes: config.totalBytes,
      bytesPerChunk: config.bytesPerChunk,
      threadsPerBlock: config.threadsPerBlock,
      chunkCount,
      blockCount,
      totalThreadSlots,
      inactiveThreads,
      hasPartialFinalChunk,
      hasPartialFinalBlock,
    }),
  });
}
