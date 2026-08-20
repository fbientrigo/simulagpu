import {
  SYNCTHREADS_ARRIVAL_ORDER,
  SYNCTHREADS_LANE_COUNT,
  type SyncthreadsBlockSnapshot,
  type SyncthreadsConfig,
  type SyncthreadsScenario,
  type SyncthreadsSnapshot,
  type SyncthreadsStageSnapshot,
  type SyncthreadsThreadSnapshot,
  type SyncthreadsThreadState,
} from '@simulagpu/contracts';

/**
 * Deterministic explanatory model for a block-wide barrier.
 *
 * It does NOT execute CUDA, model a warp scheduler, real timing, or lockstep
 * execution. It reproduces one thing: the causal state each thread has with
 * respect to __syncthreads() — before, waiting, released, after — plus the
 * block-scope and invalid-participation facts the primitive teaches. The
 * arrival order is a fixed teaching device, not a simulated schedule.
 */

const LANE_IDS = ['T0', 'T1', 'T2', 'T3'] as const;

const STATE_LABEL: Record<SyncthreadsThreadState, string> = {
  before: 'antes de la barrera',
  waiting: 'esperando en la barrera',
  released: 'liberado',
  after: 'después de la barrera',
  invalid: 'participación inválida',
};

function laneOf(id: string): number {
  return LANE_IDS.indexOf(id as (typeof LANE_IDS)[number]);
}

function thread(id: string, state: SyncthreadsThreadState, hasElement: boolean): SyncthreadsThreadSnapshot {
  return Object.freeze({
    id,
    lane: laneOf(id),
    state,
    hasElement,
    ariaLabel: `${id} — ${STATE_LABEL[state]}`,
  });
}

/** Ids sorted by lane, so display order never depends on arrival order. */
function byLane(ids: readonly string[]): readonly string[] {
  return Object.freeze([...ids].sort((a, b) => laneOf(a) - laneOf(b)));
}

function joinIds(ids: readonly string[]): string {
  const ordered = byLane(ids);
  if (ordered.length === 0) return '';
  if (ordered.length === 1) return ordered[0] as string;
  return `${ordered.slice(0, -1).join(', ')} y ${ordered[ordered.length - 1]}`;
}

/** Build the six-stage progression of the primary Block 0 scene. */
function buildPrimaryStages(): readonly SyncthreadsStageSnapshot[] {
  const order = SYNCTHREADS_ARRIVAL_ORDER;
  const total = order.length;
  const stages: SyncthreadsStageSnapshot[] = [];

  // Stages 0..total: 0 = nobody arrived, k = first k arrived, total = all released.
  for (let arrivedCount = 0; arrivedCount <= total; arrivedCount += 1) {
    const arrived = new Set(order.slice(0, arrivedCount));
    const satisfied = arrivedCount === total;
    const waitingIds = byLane(order.filter((id) => arrived.has(id)));
    const notArrivedIds = byLane(order.filter((id) => !arrived.has(id)));
    const arrivedThreadId = arrivedCount === 0 ? null : (order[arrivedCount - 1] as string);

    const threads = LANE_IDS.map((id) => {
      const state: SyncthreadsThreadState = satisfied ? 'released' : arrived.has(id) ? 'waiting' : 'before';
      return thread(id, state, true);
    });

    let caption: string;
    if (arrivedCount === 0) {
      caption =
        'Estado inicial: los cuatro hilos de Block 0 están en ANTES. Nadie ha llegado todavía a __syncthreads().';
    } else if (satisfied) {
      caption = `${arrivedThreadId} es el último hilo del bloque en llegar. La barrera queda satisfecha y los cuatro hilos pasan a LIBERADO en la misma transición lógica.`;
    } else {
      caption = `${arrivedThreadId} llegó a la barrera y quedó ESPERANDO. Todavía no llegaron: ${joinIds(notArrivedIds)}. La barrera sigue cerrada; ningún hilo puede continuar.`;
    }

    const note = satisfied
      ? 'Los cuatro hilos de Block 0 llegaron: la barrera está satisfecha.'
      : arrivedCount === 0
        ? 'Ningún hilo llegó todavía.'
        : `${joinIds(notArrivedIds)} todavía no ${notArrivedIds.length === 1 ? 'llegó' : 'llegaron'}. La barrera sigue cerrada. Ningún hilo puede continuar.`;

    stages.push(
      Object.freeze({
        index: arrivedCount,
        arrivedThreadId,
        caption,
        blocks: Object.freeze([
          Object.freeze({
            id: 0,
            label: 'Block 0',
            threads: Object.freeze(threads),
            barrierSatisfied: satisfied,
            note,
          }),
        ]),
        barrierSatisfied: satisfied,
        waitingIds,
        notArrivedIds,
        crossingAllowed: satisfied,
      }),
    );
  }

  // Final continue stage: released threads move past the barrier.
  const afterThreads = LANE_IDS.map((id) => thread(id, 'after', true));
  stages.push(
    Object.freeze({
      index: total + 1,
      arrivedThreadId: null,
      caption:
        'Con la barrera ya satisfecha, los hilos de Block 0 continúan con el trabajo posterior (DESPUÉS). Recién ahora el trabajo previo del bloque queda disponible para la fase siguiente.',
      blocks: Object.freeze([
        Object.freeze({
          id: 0,
          label: 'Block 0',
          threads: Object.freeze(afterThreads),
          barrierSatisfied: true,
          note: 'Todos cruzaron juntos: nadie se adelantó a la barrera.',
        }),
      ]),
      barrierSatisfied: true,
      waitingIds: Object.freeze([]),
      notArrivedIds: Object.freeze([]),
      crossingAllowed: true,
    }),
  );

  return Object.freeze(stages);
}

/** Two blocks: Block 0 satisfies its barrier while Block 1 is still partial. */
function buildScopeStage(): SyncthreadsStageSnapshot {
  const block0: SyncthreadsBlockSnapshot = Object.freeze({
    id: 0,
    label: 'Block 0',
    threads: Object.freeze(LANE_IDS.map((id) => thread(id, 'released', true))),
    barrierSatisfied: true,
    note: 'Block 0 satisfizo su barrera: sus cuatro hilos llegaron.',
  });
  const block1: SyncthreadsBlockSnapshot = Object.freeze({
    id: 1,
    label: 'Block 1',
    threads: Object.freeze(LANE_IDS.map((id) => thread(id, id === 'T2' ? 'waiting' : 'before', true))),
    barrierSatisfied: false,
    note: 'Block 1 aún no: solo T2 llegó. Block 0 no espera a Block 1.',
  });

  return Object.freeze({
    index: 0,
    arrivedThreadId: null,
    caption:
      'Block 0 liberó su barrera con sus cuatro hilos, mientras Block 1 sigue con hilos en ANTES. La sincronización de __syncthreads() es de bloque: Block 0 no espera a Block 1.',
    blocks: Object.freeze([block0, block1]),
    barrierSatisfied: true,
    waitingIds: byLane(LANE_IDS),
    notArrivedIds: Object.freeze([]),
    crossingAllowed: true,
  });
}

/** Partial block under `if (i < N)`: two threads reach the barrier, two skip it. */
function buildDivergentStage(): SyncthreadsStageSnapshot {
  const threads = LANE_IDS.map((id) => {
    const hasElement = id === 'T0' || id === 'T1';
    return thread(id, hasElement ? 'waiting' : 'invalid', hasElement);
  });

  return Object.freeze({
    index: 0,
    arrivedThreadId: null,
    caption:
      'Con N = 2, solo T0 y T1 entran a la rama if (i < N) y ejecutan __syncthreads(). T2 y T3 saltan la barrera por completo: la participación es divergente y el patrón es inválido.',
    blocks: Object.freeze([
      Object.freeze({
        id: 0,
        label: 'Block 0',
        threads: Object.freeze(threads),
        barrierSatisfied: false,
        note: 'T2 y T3 existen en el bloque pero no tienen elemento válido, así que nunca ejecutan la barrera. "Sin dato válido" no es lo mismo que "fuera del bloque".',
      }),
    ]),
    barrierSatisfied: false,
    waitingIds: byLane(['T0', 'T1']),
    notArrivedIds: byLane(['T2', 'T3']),
    crossingAllowed: false,
  });
}

function scenarioCode(scenario: SyncthreadsScenario): string {
  if (scenario === 'divergent') {
    return 'if (i < N) {\n    work(i);\n    __syncthreads(); // ¡inseguro si el bloque es parcial!\n}';
  }
  if (scenario === 'scope') {
    return '// Cada bloque coordina solo a sus propios hilos.\nproducir();\n__syncthreads();\nconsumir();';
  }
  return 'trabajo_antes();\n__syncthreads();\ntrabajo_despues();';
}

const PRIMARY_CHANGED = Object.freeze([
  'El permiso lógico para cruzar la frontera de sincronización: tras la última llegada, los hilos que esperaban pasan de ESPERANDO a LIBERADO.',
]);

const PRIMARY_UNCHANGED = Object.freeze([
  'Los identificadores de los hilos (T0–T3) y su carril fijo.',
  'La pertenencia al bloque: los cuatro siguen en Block 0.',
  'El orden de llegada fijado por el escenario didáctico (T0, T2, T1, T3).',
  'Los datos: la barrera no calcula, no combina, no copia ni reduce ningún valor.',
  'Otros bloques: esta barrera no los toca ni los espera.',
]);

const PRIMARY_WHY =
  'La barrera se libera porque todos los hilos participantes de Block 0 llegaron al mismo punto de sincronización; recién entonces el bloque puede continuar con la fase siguiente, con el trabajo previo del bloque disponible para el resto del bloque.';

/** Build the complete truth for one explanatory __syncthreads() scene. */
export function buildSyncthreadsSnapshot(config: SyncthreadsConfig): SyncthreadsSnapshot {
  const { scenario } = config;

  if (scenario === 'scope') {
    return Object.freeze({
      config,
      scenario,
      arrivalOrder: Object.freeze([]),
      stages: Object.freeze([buildScopeStage()]),
      code: scenarioCode(scenario),
      invalidParticipation: false,
      changed: Object.freeze([
        'Nada en Block 1 cambió por culpa de Block 0: cada bloque resuelve su propia barrera.',
      ]),
      unchanged: Object.freeze([
        'El estado de Block 1 es independiente del de Block 0.',
        'No existe una barrera compartida entre bloques.',
      ]),
      why: '__syncthreads() coordina a los hilos dentro de un mismo bloque. Su alcance es el bloque, no la grid completa.',
    });
  }

  if (scenario === 'divergent') {
    return Object.freeze({
      config,
      scenario,
      arrivalOrder: Object.freeze([]),
      stages: Object.freeze([buildDivergentStage()]),
      code: scenarioCode(scenario),
      invalidParticipation: true,
      changed: Object.freeze([
        'Nada se libera: la barrera nunca puede satisfacerse porque no todo el bloque la ejecuta.',
      ]),
      unchanged: Object.freeze([
        'T2 y T3 siguen siendo hilos de Block 0 aunque no tengan elemento válido.',
        'El modelo no simula un cuelgue: marca la participación como inválida y explica la causa.',
      ]),
      why: 'Una barrera de bloque necesita participación compatible de todo el bloque. Dentro de if (i < N) sobre un bloque parcial, algunos hilos nunca ejecutan __syncthreads(): la participación es divergente y el patrón es inválido.',
    });
  }

  return Object.freeze({
    config,
    scenario,
    arrivalOrder: SYNCTHREADS_ARRIVAL_ORDER,
    stages: buildPrimaryStages(),
    code: scenarioCode(scenario),
    invalidParticipation: false,
    changed: PRIMARY_CHANGED,
    unchanged: PRIMARY_UNCHANGED,
    why: PRIMARY_WHY,
  });
}

export { SYNCTHREADS_LANE_COUNT };
