import {
  CUDA_MEMCPY_BUFFER_LENGTH,
  CUDA_MEMCPY_BYTES_PER_ELEMENT,
  type CudaMemcpyCell,
  type CudaMemcpyConfig,
  type CudaMemcpyDirection,
  type CudaMemcpyKind,
  type CudaMemcpyRegion,
  type CudaMemcpyScene,
  type CudaMemcpySnapshot,
} from '@simulagpu/contracts';

/**
 * Fixed, deterministic data for the two canonical scenarios.
 *
 * Host→Device: the host holds a known input array and the device buffer is
 * allocated but not meaningfully initialized (every cell is `?`).
 *
 * Device→Host: the device holds a known result and the host destination holds
 * distinct known prior values (-1). Copying only part of it proves that an
 * uncopied destination cell keeps its previous value — it is not reset.
 */
const H2D_HOST_VALUES = [4, 7, 1, 9, 3] as const;
const D2H_DEVICE_VALUES = [31, 12, 5, 8, 2] as const;
const D2H_HOST_PRIOR = [-1, -1, -1, -1, -1] as const;

function knownCell(index: number, value: number): CudaMemcpyCell {
  return Object.freeze({ index, state: 'known' as const, value, symbol: String(value) });
}

function undefinedCell(index: number): CudaMemcpyCell {
  return Object.freeze({ index, state: 'undefined' as const, value: null, symbol: '?' });
}

function knownCells(values: readonly number[]): readonly CudaMemcpyCell[] {
  return Object.freeze(values.map((value, index) => knownCell(index, value)));
}

function undefinedCells(length: number): readonly CudaMemcpyCell[] {
  return Object.freeze(Array.from({ length }, (_, index) => undefinedCell(index)));
}

/**
 * Overwrite the first `elementCount` destination cells with copies of the
 * source values, leaving the remaining destination cells exactly as they were.
 */
function copyInto(
  destinationBefore: readonly CudaMemcpyCell[],
  sourceValues: readonly number[],
  elementCount: number,
): readonly CudaMemcpyCell[] {
  return Object.freeze(
    destinationBefore.map((cell, index) =>
      index < elementCount ? knownCell(index, sourceValues[index] as number) : cell,
    ),
  );
}

function region(
  id: string,
  location: CudaMemcpyRegion['location'],
  role: CudaMemcpyRegion['role'],
  cells: readonly CudaMemcpyCell[],
): CudaMemcpyRegion {
  return Object.freeze({ id, location, role, cells });
}

function scene(host: CudaMemcpyRegion, device: CudaMemcpyRegion): CudaMemcpyScene {
  return Object.freeze({ host, device });
}

interface DirectionShape {
  readonly kind: CudaMemcpyKind;
  readonly sourceId: string;
  readonly destinationId: string;
  readonly sourceLocation: CudaMemcpyRegion['location'];
  readonly destinationLocation: CudaMemcpyRegion['location'];
}

function shapeFor(direction: CudaMemcpyDirection): DirectionShape {
  if (direction === 'device-to-host') {
    return {
      kind: 'cudaMemcpyDeviceToHost',
      sourceId: 'd_result',
      destinationId: 'h_result',
      sourceLocation: 'device',
      destinationLocation: 'host',
    };
  }
  return {
    kind: 'cudaMemcpyHostToDevice',
    sourceId: 'h_input',
    destinationId: 'd_input',
    sourceLocation: 'host',
    destinationLocation: 'device',
  };
}

/**
 * Build the complete truth for one explanatory cudaMemcpy transition.
 *
 * This model does not call CUDA, allocate memory, choose an address, run a
 * kernel, or model any timing/asynchrony. It only expresses the before→after
 * state change the learner must predict: a copy that overwrites the requested
 * destination range and leaves everything else — including the source — intact.
 */
export function buildCudaMemcpySnapshot(config: CudaMemcpyConfig): CudaMemcpySnapshot {
  const { direction, elementCount } = config;
  const length = CUDA_MEMCPY_BUFFER_LENGTH;
  const byteCount = elementCount * CUDA_MEMCPY_BYTES_PER_ELEMENT;
  const byteExpression = `${elementCount} × sizeof(int32_t) = ${byteCount} bytes`;
  const shape = shapeFor(direction);

  const affectedIndices = Object.freeze(Array.from({ length: elementCount }, (_, i) => i));
  const unaffectedIndices = Object.freeze(
    Array.from({ length: length - elementCount }, (_, i) => elementCount + i),
  );

  const tailUnchangedNote =
    elementCount < length
      ? `Las celdas ${shape.destinationId}[${elementCount}..${length - 1}] no entran en la copia y conservan su estado previo.`
      : `Se copiaron las ${length} celdas: esta vez no queda cola sin tocar.`;

  let before: CudaMemcpyScene;
  let after: CudaMemcpyScene;
  let changed: readonly string[];
  let unchanged: readonly string[];

  if (direction === 'device-to-host') {
    const deviceSource = knownCells(D2H_DEVICE_VALUES);
    const hostDestinationBefore = knownCells(D2H_HOST_PRIOR);
    const hostDestinationAfter = copyInto(hostDestinationBefore, D2H_DEVICE_VALUES, elementCount);

    before = scene(
      region('h_result', 'host', 'destination', hostDestinationBefore),
      region('d_result', 'device', 'source', deviceSource),
    );
    after = scene(
      region('h_result', 'host', 'destination', hostDestinationAfter),
      region('d_result', 'device', 'source', deviceSource),
    );
    changed = Object.freeze([
      `Las primeras ${elementCount} celdas de h_result pasan a contener copias de d_result[0..${elementCount - 1}].`,
    ]);
    unchanged = Object.freeze([
      'Los valores de d_result (el origen en el device) siguen intactos.',
      tailUnchangedNote,
      'El tamaño de las asignaciones y los punteros no cambian.',
      'No se lanzó ningún kernel ni se transformó ningún valor.',
    ]);
  } else {
    const hostSource = knownCells(H2D_HOST_VALUES);
    const deviceDestinationBefore = undefinedCells(length);
    const deviceDestinationAfter = copyInto(deviceDestinationBefore, H2D_HOST_VALUES, elementCount);

    before = scene(
      region('h_input', 'host', 'source', hostSource),
      region('d_input', 'device', 'destination', deviceDestinationBefore),
    );
    after = scene(
      region('h_input', 'host', 'source', hostSource),
      region('d_input', 'device', 'destination', deviceDestinationAfter),
    );
    changed = Object.freeze([
      `Las primeras ${elementCount} celdas de d_input pasan a contener copias de h_input[0..${elementCount - 1}].`,
    ]);
    unchanged = Object.freeze([
      'Los valores de h_input (el origen en el host) siguen intactos.',
      tailUnchangedNote,
      'El tamaño de la asignación del device y los punteros no cambian.',
      'No se lanzó ningún kernel ni se transformó ningún valor.',
    ]);
  }

  const code = `cudaMemcpy(${shape.destinationId}, ${shape.sourceId}, ${elementCount} * sizeof(int32_t), ${shape.kind});`;

  return Object.freeze({
    config,
    direction,
    kind: shape.kind,
    elementCount,
    byteCount,
    byteExpression,
    sourceLocation: shape.sourceLocation,
    destinationLocation: shape.destinationLocation,
    sourceId: shape.sourceId,
    destinationId: shape.destinationId,
    affectedIndices,
    unaffectedIndices,
    before,
    action: Object.freeze({ code, kind: shape.kind, byteCount, byteExpression }),
    after,
    changed,
    unchanged,
    why: 'cudaMemcpy lee byteCount bytes del origen y sobrescribe el mismo rango del destino: copia, no mueve; no inicializa el resto, no reserva memoria y no ejecuta código en la GPU.',
  });
}
