import {
  CUDA_MALLOC_BYTES_PER_ELEMENT,
  type CudaMallocConfig,
  type CudaMallocDeviceAllocation,
  type CudaMallocDeviceCell,
  type CudaMallocHostCell,
  type CudaMallocSceneState,
  type CudaMallocSnapshot,
} from '@simulagpu/contracts';

const HOST_VALUES = [3, 1, 4, 2, 7, 0, 5, 6] as const;

function buildHostCells(count: number): readonly CudaMallocHostCell[] {
  return Object.freeze(
    HOST_VALUES.slice(0, count).map((value, index) =>
      Object.freeze({ index, value, state: 'valid' as const, symbol: '●' as const }),
    ),
  );
}

function buildDeviceAllocation(count: number, byteCount: number): CudaMallocDeviceAllocation {
  const cells: CudaMallocDeviceCell[] = Array.from({ length: count }, (_, index) =>
    Object.freeze({ index, state: 'allocated-undefined' as const, symbol: '?' as const }),
  );
  return Object.freeze({
    id: 'device-allocation' as const,
    byteCount,
    cells: Object.freeze(cells),
  });
}

function buildScene(
  hostCells: readonly CudaMallocHostCell[],
  devicePointer: CudaMallocSceneState['devicePointer'],
  deviceAllocation: CudaMallocDeviceAllocation | null,
): CudaMallocSceneState {
  return Object.freeze({ devicePointer, hostCells, deviceAllocation });
}

/**
 * Build the complete truth for a successful cudaMalloc call.
 *
 * This model does not call CUDA, choose an address, emulate hardware, or model
 * timing. It only expresses the state transition the learner must predict.
 */
export function buildCudaMallocSnapshot(config: CudaMallocConfig): CudaMallocSnapshot {
  const byteCount = config.elementCount * CUDA_MALLOC_BYTES_PER_ELEMENT;
  const beforeHostCells = buildHostCells(config.elementCount);
  const afterHostCells = buildHostCells(config.elementCount);

  return Object.freeze({
    config,
    before: buildScene(beforeHostCells, null, null),
    action: Object.freeze({
      code: 'cudaMalloc(&d_A, bytes);' as const,
      byteCount,
      byteExpression: `${config.elementCount} × sizeof(float) = ${byteCount} bytes`,
    }),
    after: buildScene(
      afterHostCells,
      'device-allocation',
      buildDeviceAllocation(config.elementCount, byteCount),
    ),
    changed: Object.freeze([
      'd_A deja de ser nullptr y pasa a identificar la asignación del device.',
      `El device tiene una asignación nueva de ${byteCount} bytes.`,
    ]),
    unchanged: Object.freeze([
      'Los valores del arreglo h_A en el host siguen iguales.',
      'No se copió ningún dato al device y sus celdas no quedaron inicializadas.',
    ]),
    why: 'cudaMalloc reserva memoria y escribe el puntero resultante; no recibe datos que pueda copiar ni un valor con el que inicializar.',
  });
}
