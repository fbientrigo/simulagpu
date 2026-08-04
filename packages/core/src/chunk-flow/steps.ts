import type { StepFocus, StepId, StepSnapshot } from '@simulagpu/contracts';

/** The numbers every step narration substitutes into its Spanish text. */
export interface StepNumbers {
  readonly totalBytes: number;
  readonly bytesPerChunk: number;
  readonly threadsPerBlock: number;
  readonly chunkCount: number;
  readonly blockCount: number;
  readonly totalThreadSlots: number;
  readonly inactiveThreads: number;
  readonly hasPartialFinalChunk: boolean;
  readonly hasPartialFinalBlock: boolean;
}

interface StepTemplate {
  readonly id: StepId;
  readonly foco: StepFocus;
  readonly titulo: string;
  readonly descripcion: (n: StepNumbers) => string;
}

/** `"1 chunk"` vs `"6 chunks"` — Spanish noun agreement for a count. */
function contar(cantidad: number, singular: string, plural: string = `${singular}s`): string {
  return `${cantidad} ${cantidad === 1 ? singular : plural}`;
}

/** Picks the singular or plural verb form to agree with `cantidad`. */
function verbo(cantidad: number, singular: string, plural: string): string {
  return cantidad === 1 ? singular : plural;
}

/** Bytes handled by the last (possibly partial) chunk. */
function lastChunkBytes(n: StepNumbers): number {
  const remainder = n.totalBytes % n.bytesPerChunk;
  return remainder === 0 ? n.bytesPerChunk : remainder;
}

/** Active threads in the last (possibly partial) block. */
function lastBlockActiveThreads(n: StepNumbers): number {
  const remainder = n.chunkCount % n.threadsPerBlock;
  return remainder === 0 ? n.threadsPerBlock : remainder;
}

const STEP_TEMPLATES: readonly StepTemplate[] = [
  {
    id: 'cpu',
    foco: 'cpu',
    titulo: '1. Los datos comienzan en la CPU',
    descripcion: (n) =>
      `El host (CPU) tiene ${n.totalBytes} bytes de datos listos para procesar. Antes de tocar la GPU (device), ` +
      `el host organiza esos bytes en piezas más pequeñas llamadas chunks.`,
  },
  {
    id: 'chunks',
    foco: 'chunks',
    titulo: '2. Dividimos los datos en chunks',
    descripcion: (n) =>
      `Cada chunk mide ${n.bytesPerChunk} bytes. número de chunks = ceil(${n.totalBytes} / ${n.bytesPerChunk}) = ` +
      `${contar(n.chunkCount, 'chunk')}.` +
      (n.hasPartialFinalChunk
        ? ` El último chunk solo tiene ${contar(lastChunkBytes(n), 'byte')}: es un chunk incompleto.`
        : ` Los ${n.totalBytes} bytes se reparten exactos entre ${contar(n.chunkCount, 'chunk')}: ninguno queda incompleto.`),
  },
  {
    id: 'transferencia',
    foco: 'transferencia',
    titulo: '3. Preparamos el trabajo para la GPU',
    descripcion: (n) =>
      `${contar(n.chunkCount, 'chunk')} ${verbo(n.chunkCount, 'viaja', 'viajan')}, de forma conceptual, del host ` +
      `(CPU) a la memoria del device (GPU). Este modelo no mide una transferencia real ni cuenta bytes por ` +
      `segundo: es un paso explicativo, no una medición.`,
  },
  {
    id: 'hilos',
    foco: 'hilos',
    titulo: '4. Los chunks se asignan a hilos',
    descripcion: (n) =>
      `En este modelo introductorio cada hilo (thread) procesa exactamente un chunk: el chunk 0 lo procesa el ` +
      `hilo 0, el chunk 1 el hilo 1, y así hasta cubrir ${contar(n.chunkCount, 'chunk')}.`,
  },
  {
    id: 'bloques',
    foco: 'bloques',
    titulo: '5. Los hilos se organizan en bloques',
    descripcion: (n) =>
      `Los hilos no viajan sueltos: se agrupan en bloques (block) de ${n.threadsPerBlock} hilos cada uno. ` +
      `número de bloques = ceil(${n.chunkCount} / ${n.threadsPerBlock}) = ${contar(n.blockCount, 'bloque')}.`,
  },
  {
    id: 'grid',
    foco: 'grid',
    titulo: '6. Todos los bloques forman la grid',
    descripcion: (n) =>
      `${contar(n.blockCount, 'bloque')} ${verbo(n.blockCount, 'forma', 'juntos forman')} la grid. La jerarquía ` +
      `completa queda así: grid → bloques (block) → hilos (thread) → chunk.`,
  },
  {
    id: 'paralelo',
    foco: 'hilos',
    titulo: '7. El procesamiento ocurre en paralelo',
    descripcion: (n) =>
      `${contar(n.chunkCount, 'hilo activo procesa', 'hilos activos procesan')} su chunk de forma independiente ` +
      `entre sí: ninguno necesita el resultado de otro. Este modelo resalta juntos los hilos activos para mostrar ` +
      `esa independencia; no implica que una GPU real ejecute todos los hilos en el mismo instante físico.`,
  },
  {
    id: 'inactivos',
    foco: 'inactivos',
    titulo: '8. Algunos hilos pueden quedar inactivos',
    descripcion: (n) =>
      n.hasPartialFinalBlock
        ? `El último bloque tiene ${n.threadsPerBlock} hilos, pero solo ${lastBlockActiveThreads(n)} ` +
          `${verbo(lastBlockActiveThreads(n), 'tiene', 'tienen')} un chunk asignado. ${contar(n.inactiveThreads, 'hilo queda', 'hilos quedan')} ` +
          `inactivos: existen, entran a ejecutar, pero no tienen trabajo — el equivalente conceptual de un guard ` +
          `de límites (bounds check) como "if (índice < total)".`
        : `En esta configuración ${contar(n.blockCount, 'bloque queda', 'bloques quedan')} completos: ` +
          `${contar(n.totalThreadSlots, 'hilo tiene', 'hilos tienen')} chunk asignado y no hay hilos inactivos. ` +
          `Prueba otra combinación para ver un bloque incompleto.`,
  },
  {
    id: 'resultado',
    foco: 'resultado',
    titulo: '9. El resultado vuelve a la CPU',
    descripcion: (n) =>
      `Cada hilo activo entrega el resultado de su chunk. ${contar(n.chunkCount, 'chunk procesado regresa', 'chunks procesados regresan')}, ` +
      `de forma conceptual, del device (GPU) al host (CPU), donde se ensambla el resultado final.`,
  },
  {
    id: 'comprobacion',
    foco: 'ninguno',
    titulo: '10. Comprueba tu modelo mental',
    descripcion: (n) =>
      `Con ${n.totalBytes} bytes totales, chunks de ${n.bytesPerChunk} bytes e hilos por bloque de ` +
      `${n.threadsPerBlock}: ¿cuántos chunks, bloques e hilos inactivos hay? Resuélvelo en el ejercicio guiado antes de seguir.`,
  },
];

/**
 * Narrate all ten steps of the guided sequence for a given set of computed
 * numbers. Pure and deterministic: the same numbers always produce the same
 * Spanish text.
 */
export function buildStepSnapshots(numbers: StepNumbers): readonly StepSnapshot[] {
  return Object.freeze(
    STEP_TEMPLATES.map((template, index) =>
      Object.freeze({
        id: template.id,
        index,
        titulo: template.titulo,
        descripcion: template.descripcion(numbers),
        foco: template.foco,
      }),
    ),
  );
}

/** Total number of steps in the guided sequence. */
export const STEP_COUNT = STEP_TEMPLATES.length;
