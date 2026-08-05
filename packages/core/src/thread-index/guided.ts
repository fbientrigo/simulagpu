import type {
  GuidedCheckpoint,
  GuidedOption,
  GuidedStep,
  GuidedStepId,
  GuidedTour,
  ThreadIndexSnapshot,
} from '@simulagpu/contracts';

/**
 * The guided walkthrough of the thread-index model.
 *
 * The tour is *content*, not view state: given a snapshot it produces the six
 * steps a learner reads, in the order the ideas depend on each other, with the
 * current numbers already substituted. Which step is on screen, and how much of
 * a step has been revealed, stay in the component — the same rule that keeps
 * `vista` out of `ThreadIndexConfig`.
 *
 * Like the rest of `@simulagpu/core` this is pure: no clocks, no randomness, no
 * platform globals. The same snapshot always yields a deeply equal tour.
 *
 * It narrates arithmetic. It does not execute CUDA.
 */

/** Options per checkpoint. Three fit on a phone screen; more invites guessing. */
const MAX_OPTIONS = 3;

/** A candidate numeric answer before it is filtered against the correct one. */
interface NumericChoice {
  readonly value: number;
  readonly feedback: string;
}

/**
 * Build the answers of a numeric checkpoint.
 *
 * Candidates are the mistakes learners actually make, in the order we would
 * rather show them. Duplicates of the correct answer are dropped — with
 * `blockIdx.x = 0` several classic mistakes collapse onto the right value — so
 * the trailing candidates exist to guarantee the checkpoint always offers a
 * choice. Options are sorted by value so the correct one has no fixed position.
 */
function numericOptions(
  correct: NumericChoice,
  candidates: readonly NumericChoice[],
): readonly GuidedOption[] {
  const chosen = [{ ...correct, correct: true }];
  const seen = new Set<number>([correct.value]);

  for (const candidate of candidates) {
    if (chosen.length >= MAX_OPTIONS) break;
    if (candidate.value < 0 || seen.has(candidate.value)) continue;
    seen.add(candidate.value);
    chosen.push({ ...candidate, correct: false });
  }

  chosen.sort((left, right) => left.value - right.value);

  return Object.freeze(
    chosen.map((choice) =>
      Object.freeze({
        id: `n-${choice.value}`,
        label: String(choice.value),
        correct: choice.correct,
        feedback: choice.feedback,
      }),
    ),
  );
}

function checkpoint(id: GuidedStepId, question: string, options: readonly GuidedOption[]): GuidedCheckpoint {
  return Object.freeze({ id: `${id}-check`, question, options });
}

function step(
  id: GuidedStepId,
  position: number,
  title: string,
  prompt: string,
  detail: string | null,
  quiz: GuidedCheckpoint | null,
): GuidedStep {
  return Object.freeze({ id, position, title, prompt, detail, checkpoint: quiz });
}

function problemStep(snapshot: ThreadIndexSnapshot): GuidedStep {
  const { n, blockSize } = snapshot.config;
  return step(
    'problem',
    1,
    'El problema',
    `Quieres calcular c[i] = a[i] + b[i] para los ${n} elementos del vector. CUDA no reparte ` +
      `elementos: reparte hilos, y los hilos van siempre agrupados en bloques del mismo tamaño. ` +
      `Aquí cada bloque tiene ${blockSize} hilos.`,
    `n = ${n} elementos, blockDim.x = ${blockSize} hilos por bloque`,
    null,
  );
}

function gridStep(snapshot: ThreadIndexSnapshot): GuidedStep {
  const { n, blockSize } = snapshot.config;
  const { gridSize, totalThreads } = snapshot;
  const short = gridSize - 1;

  const options = numericOptions(
    {
      value: gridSize,
      feedback:
        `Correcto: ${gridSize} bloques × ${blockSize} hilos = ${totalThreads} hilos, ` +
        `suficientes para ${n} elementos.`,
    },
    [
      {
        value: short,
        feedback:
          `Esa es la división hacia abajo: ${short} × ${blockSize} = ${short * blockSize} hilos, y ` +
          `${n - short * blockSize} elementos se quedarían sin calcular.`,
      },
      {
        value: gridSize + 1,
        feedback:
          `Sobra un bloque: con ${gridSize} ya hay ${totalThreads} hilos para ${n} elementos. ` +
          `Uno más solo añade hilos que no harán nada.`,
      },
      {
        value: n,
        feedback: `Ese es el número de elementos, no el de bloques. Cada bloque cubre ${blockSize} elementos.`,
      },
    ],
  );

  return step(
    'grid',
    2,
    '¿Cuántos bloques hacen falta?',
    `El host decide cuántos bloques lanza y solo puede pedir bloques enteros. Con ${blockSize} hilos ` +
      `por bloque, la división entera se queda corta en cuanto n no es múltiplo: hay que redondear ` +
      `hacia arriba.`,
    `${snapshot.gridSizeExpression.substituted} = ${gridSize}`,
    checkpoint('grid', `Con n = ${n} y blockDim.x = ${blockSize}, ¿cuántos bloques lanza el host?`, options),
  );
}

function threadStep(snapshot: ThreadIndexSnapshot): GuidedStep {
  const { selectedBlock, selectedThread } = snapshot.config;
  return step(
    'thread',
    3,
    'Ponte en el lugar de un hilo',
    'Un hilo solo conoce dos cosas de sí mismo: en qué bloque está (blockIdx.x) y qué posición ocupa ' +
      'dentro de ese bloque (threadIdx.x). Nada más. Toca un hilo de la grilla para verlo desde dentro.',
    `blockIdx.x = ${selectedBlock}, threadIdx.x = ${selectedThread}`,
    null,
  );
}

function indexStep(snapshot: ThreadIndexSnapshot): GuidedStep {
  const { blockSize, selectedBlock, selectedThread } = snapshot.config;
  const { substituted, value } = snapshot.indexExpression;

  const options = numericOptions({ value, feedback: `Correcto: ${substituted} = ${value}.` }, [
    {
      value: selectedBlock + selectedThread,
      feedback:
        `Sumaste los dos índices. blockIdx.x hay que multiplicarlo por blockDim.x: cada bloque ` +
        `anterior ocupa ${blockSize} elementos, no uno.`,
    },
    {
      value: selectedBlock * blockSize,
      feedback: `Ese es el primer elemento de tu bloque. Te falta sumar threadIdx.x = ${selectedThread}.`,
    },
    {
      value: selectedThread,
      feedback:
        `Ese es threadIdx.x, tu posición dentro del bloque. Delante de ti hay ${selectedBlock} ` +
        `bloques enteros que también ocupan sitio.`,
    },
    { value: value + 1, feedback: `No: ${substituted} = ${value}.` },
    { value: value + blockSize, feedback: `No: ${substituted} = ${value}.` },
  ]);

  return step(
    'index',
    4,
    'El índice global',
    'Con esas dos coordenadas el hilo deduce qué elemento le toca: delante de su bloque hay ' +
      'blockIdx.x bloques completos de blockDim.x elementos, y dentro del suyo ocupa la posición ' +
      'threadIdx.x.',
    `${substituted} = ${value}`,
    checkpoint(
      'index',
      `Eres el hilo threadIdx.x = ${selectedThread} del bloque blockIdx.x = ${selectedBlock}, con ` +
        `blockDim.x = ${blockSize}. ¿Qué índice global i te toca?`,
      options,
    ),
  );
}

function guardStep(snapshot: ThreadIndexSnapshot): GuidedStep {
  const { n } = snapshot.config;
  const { totalThreads, inactiveThreads, selected } = snapshot;
  const index = selected.globalIndex;

  const prompt = snapshot.hasPartialBlock
    ? `Redondear hacia arriba creó ${totalThreads} hilos para ${n} elementos: sobran ` +
      `${inactiveThreads}. Todos entran al kernel, así que cada hilo tiene que comprobar por sí ` +
      `mismo si le corresponde trabajo.`
    : `Aquí la división fue exacta: ${totalThreads} hilos para ${n} elementos, no sobra ninguno. ` +
      `Aun así el guard se escribe siempre, porque el mismo kernel se usará con otros valores de n.`;

  const writes: GuidedOption = Object.freeze({
    id: 'writes',
    label: `Sí, escribe c[${index}]`,
    correct: selected.active,
    feedback: selected.active
      ? `Correcto: ${index} < ${n} es verdadero, así que este hilo hace su suma.`
      : `No: ${index} >= ${n}. Si escribiera, tocaría memoria fuera del arreglo c.`,
  });

  const skips: GuidedOption = Object.freeze({
    id: 'skips',
    label: 'No, termina sin escribir',
    correct: !selected.active,
    feedback: selected.active
      ? `No: ${index} < ${n}, así que a este hilo sí le corresponde un elemento.`
      : `Correcto: ${index} >= ${n}. El hilo entra al kernel, evalúa la condición y termina sin ` +
        `escribir nada.`,
  });

  return step(
    'guard',
    5,
    'El guard if (i < n)',
    prompt,
    `if (${index} < ${n}) → ${selected.active ? 'verdadero' : 'falso'}`,
    checkpoint(
      'guard',
      `Tu hilo calculó i = ${index} y el vector tiene n = ${n} elementos. ¿Pasa el guard if (i < n)?`,
      Object.freeze([writes, skips]),
    ),
  );
}

function elementStep(snapshot: ThreadIndexSnapshot): GuidedStep {
  const { n, blockSize } = snapshot.config;
  const { gridSize, totalThreads, inactiveThreads, selected } = snapshot;
  const index = selected.globalIndex;

  const prompt = selected.active
    ? 'Cada elemento del vector tiene exactamente un hilo y cada hilo activo tiene exactamente un ' +
      'elemento. Ese reparto uno a uno es lo que evita que los hilos tengan que coordinarse: ' +
      'ninguno pisa el trabajo de otro.'
    : `Este hilo existe, ejecuta el kernel entero y no escribe nada: su índice ${index} cae fuera ` +
      `del vector. Conseguir eso es todo el trabajo del guard.`;

  const quiz = snapshot.hasPartialBlock
    ? checkpoint(
        'element',
        `¿Por qué el lanzamiento crea ${totalThreads} hilos si el vector solo tiene ${n} elementos?`,
        Object.freeze([
          Object.freeze({
            id: 'ceil',
            label: 'Porque los bloques son enteros y gridDim.x se redondea hacia arriba.',
            correct: true,
            feedback:
              `Correcto: ${gridSize} bloques × ${blockSize} hilos = ${totalThreads}, y a los ` +
              `${inactiveThreads} de más los neutraliza el guard.`,
          }),
          Object.freeze({
            id: 'safety',
            label: 'Porque la GPU lanza hilos de más por seguridad.',
            correct: false,
            feedback:
              'No: la GPU crea exactamente los hilos que el host le pide. Los que sobran salen de ' +
              'redondear gridDim.x hacia arriba.',
          }),
          Object.freeze({
            id: 'workers',
            label: 'Porque cada elemento necesita más de un hilo.',
            correct: false,
            feedback:
              `No: cada elemento lo calcula un solo hilo. Los ${inactiveThreads} hilos de más ` +
              `aparecen porque ${n} no es múltiplo de ${blockSize}.`,
          }),
        ]),
      )
    : checkpoint(
        'element',
        `Con n = ${n} y blockDim.x = ${blockSize} la división es exacta y no sobra ningún hilo. ` +
          `¿Puedes borrar el guard if (i < n)?`,
        Object.freeze([
          Object.freeze({
            id: 'keep',
            label: 'No: el mismo kernel se usará con otros valores de n.',
            correct: true,
            feedback:
              `Correcto. El guard cuesta una comparación y es lo único que separa un kernel ` +
              `correcto de uno que escribe fuera del arreglo en cuanto n deja de ser múltiplo de ` +
              `${blockSize}.`,
          }),
          Object.freeze({
            id: 'remove',
            label: `Sí: con n = ${n} no sobra ningún hilo.`,
            correct: false,
            feedback:
              `Con esta n funciona, y por eso este caso esconde el error. Cambia n a un valor que ` +
              `no sea múltiplo de ${blockSize} y el kernel sin guard escribirá fuera de c.`,
          }),
        ]),
      );

  return step(
    'element',
    6,
    'El trabajo del hilo',
    prompt,
    selected.active
      ? `c[${index}] = a[${index}] + b[${index}]`
      : `sin escritura: el guard descartó i = ${index}`,
    quiz,
  );
}

/**
 * Build the guided walkthrough for a snapshot.
 *
 * The order is the dependency order of the ideas: you cannot compute a global
 * index before knowing what a block is, and the guard only makes sense once
 * ceiling division has created threads with nothing to do.
 */
export function buildGuidedTour(snapshot: ThreadIndexSnapshot): GuidedTour {
  const steps = Object.freeze([
    problemStep(snapshot),
    gridStep(snapshot),
    threadStep(snapshot),
    indexStep(snapshot),
    guardStep(snapshot),
    elementStep(snapshot),
  ]);

  return Object.freeze({ steps, totalSteps: steps.length });
}
