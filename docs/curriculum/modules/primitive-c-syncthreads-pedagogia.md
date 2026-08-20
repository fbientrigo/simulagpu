# Primitiva C — `__syncthreads()`
## Especificación pedagógica (diseño, no implementación)

> Este documento es un complemento detallado del esqueleto congelado
> `primitive-c-syncthreads.md` (que el manifiesto y los tests de contrato
> siguen usando tal cual). Recoge la pedagogía completa que guió la
> implementación de esta primitiva.
>
> **Estado: implementada.** La primitiva ya es una lección vertical completa
> (`status: implemented` en `docs/curriculum/manifest.ts`). Este documento se
> conserva como justificación de diseño; la lección publicada vive en
> `apps/docs/clases/syncthreads.md`, el modelo en `packages/core/src/syncthreads`,
> la visualización en `packages/visuals/src/ClaseSyncthreads.vue`, el ejemplo en
> `native/examples/syncthreads`, el ejercicio en `native/exercises/03-syncthreads`
> y las tarjetas en `anki/cards/04-syncthreads.yaml`. No dupliques aquí la prosa
> final de la lección.

---

# Identidad del módulo

- **Id estable:** `primitive-c`
- **Título:** Primitiva C — `__syncthreads()`
- **Tipo:** primitiva; pista alfabética operacional
- **Posición en la secuencia:** 6 de 15 (Clase 2 → **Primitiva C** → Clase 3)
- **Estado actual:** `PLANNED` (solo diseño pedagógico en este documento)

---

# Pregunta central de aprendizaje

> **¿Qué exactamente debe ocurrir en `__syncthreads()` antes de que cualquier
> hilo de un bloque pueda continuar más allá de esa barrera?**

Al terminar, el aprendiz debe poder razonar sobre:

```cpp
trabajo_antes();

__syncthreads();

trabajo_despues();
```

y explicar, sin memorizar sintaxis:

1. qué hilos participan;
2. qué pasa cuando un hilo llega antes que los demás;
3. qué evento libera la barrera;
4. qué trabajo queda garantizado antes de `trabajo_despues()`;
5. cuál es el alcance de la sincronización;
6. por qué otro bloque no forma parte de esta barrera;
7. por qué es peligroso que solo algunos hilos del bloque ejecuten la barrera.

---

# Por qué existe aquí en la secuencia

```
Primitiva B — cudaMemcpy
→ Clase 2 — Reducción paralela
→ Primitiva C — __syncthreads()
→ Clase 3 — Cooperación, memoria y patrones de acceso
→ Primitiva D — __shared__
```

Clase 2 ya obligó al aprendiz a pensar en **fases**: una pasada de reducción
produce valores intermedios que la siguiente pasada consume. Ese mismo
documento ya menciona `__syncthreads()` de pasada, como frontera entre
niveles de un árbol de reducción en memoria compartida (sección 6–7 de
`apps/docs/leccion/reduccion-paralela.md`). Primitiva C toma esa mención de
pasada y la convierte en la primera pregunta operativa propia: **¿cómo se
establece, dentro de un bloque, que una fase cooperativa terminó antes de que
empiece la siguiente?**

Primitiva C entrega el vocabulario de sincronización que Clase 3 necesitará
para hablar de cooperación y memoria, y que Primitiva D (`__shared__`)
necesitará para justificar por qué una escritura en memoria compartida debe
ir seguida de una barrera antes de que otro hilo la lea. Primitiva C **no**
resuelve el problema de dónde se guardan esos datos intermedios — esa
pregunta queda deliberadamente abierta para Clase 3 / Primitiva D.

---

# Prerrequisitos

## REQUERIDO

- **Clase 2 — Reducción paralela** (`class-2`, implementada). El aprendiz ya
  vio pasadas, valores intermedios, y una carrera de datos real
  (`*sum += input[i]`). Ya leyó, aunque de pasada, que `__syncthreads()` es
  "una barrera dentro de un bloque" y que "ningún hilo del bloque puede pasar
  hasta que todos los hilos activos del bloque hayan llegado". Primitiva C
  profundiza exactamente esa frase.
- **Clase 0 — El modelo mental de una GPU** (`class-0`, implementada):
  grid, bloque, hilo, id de hilo, hilos pertenecen a bloques, bloque final
  parcial, guardas de rango (`if (i < N)`), un hilo lanzado puede no tener un
  elemento válido que procesar (concepto "hilo inactivo" / "hilos
  inactivos"). Este último punto es central para el caso límite de la
  primitiva.
- **Clase 1 — Índice global y suma de vectores** (`class-1`, implementada):
  cada hilo opera sobre un índice distinto; `if (i < N)` como guarda de rango
  normal. Esto crea la trampa futura de poner una barrera dentro de esa
  guarda.

## ÚTIL PERO NO REQUERIDO

- **Primitiva A — `cudaMalloc`** (`primitive-a`): la memoria del device
  existe independientemente de los hilos; reservar no es inicializar. No es
  central para sincronización, pero el vocabulario "device" ya está fijado.
- **Primitiva B — `cudaMemcpy`** (`primitive-b`): transferencia explícita
  host/device. Queda como conocimiento de fondo, no se reutiliza
  directamente en esta primitiva.

## AÚN NO INTRODUCIDO

- `__shared__` y declaración de memoria compartida (llega en Primitiva D);
- staging en tiles;
- coalescing / patrones de acceso (Clase 3);
- atómicos (Primitiva E);
- streams (Primitiva F/G);
- warp intrinsics, `__syncwarp`;
- Cooperative Groups;
- sincronización a nivel de grid;
- otras barreras de CUDA además de `__syncthreads()`.

La primitiva **no depende** de ninguno de estos conceptos y no debe
introducirlos.

---

# Modelo mental mínimo

**Entidades:**

- un bloque (`Block 0` en la escena principal);
- un conjunto fijo y pequeño de hilos dentro de ese bloque (4 hilos:
  `T0`–`T3`);
- una barrera (`__syncthreads()`), un único punto por hilo en esta escena;
- una fase "antes" y una fase "después" de trabajo, ambas abstractas
  (no requieren memoria compartida real).

**Estados por hilo** (frontera de sincronización, no del hilo entero):

```
ANTES → ESPERANDO → LIBERADO → DESPUÉS
```

- `ANTES`: el hilo todavía no llegó a la barrera.
- `ESPERANDO`: el hilo llegó a la barrera pero el bloque aún no está
  completo. El hilo **no** ha terminado nada; solo llegó a este punto y no
  puede cruzar.
- `LIBERADO`: el último hilo requerido del bloque llegó; la barrera queda
  satisfecha y todos los hilos que esperaban pasan a este estado en el mismo
  instante lógico.
- `DESPUÉS`: el hilo continúa con el trabajo posterior a la barrera.

**Transición que libera la barrera:**

> Todos los hilos participantes del bloque alcanzaron la barrera.

No hay temporizador, no hay "primero en llegar gana": la liberación es un
evento binario a nivel de bloque, no una carrera.

**Alcance de la sincronización:** un bloque. Ningún otro bloque participa,
se entera, ni se ve afectado.

**Qué cambia con la barrera:**

- el orden lógico permitido: ningún hilo cruza antes de que el bloque
  completo llegue;
- la disponibilidad, para los hilos del bloque, del trabajo previo relevante
  (lecturas/escrituras en memoria global o compartida hechas por hilos de
  ese bloque antes de la barrera) una vez el bloque continúa.

**Qué NO cambia / NO implica:**

- no implica que los hilos ejecutaron el trabajo previo al mismo tiempo
  real (no es lockstep de instrucción a instrucción);
- no calcula nada por sí misma (no combina valores, no copia, no reduce);
- no sincroniza otros bloques;
- no garantiza un orden de llegada específico entre hilos.

---

# Conceptos dentro del alcance

- hilos que llegan a una barrera de forma independiente;
- alcance exclusivo al bloque (no hay sincronización entre bloques);
- estados `ANTES` / `ESPERANDO` / `LIBERADO` / `DESPUÉS`;
- la barrera como frontera de orden, no como ejecución simultánea;
- disponibilidad del trabajo previo del bloque después de la barrera
  (enunciado de forma mínima y concreta, sin modelo de memoria completo);
- uso divergente/inválido de la barrera dentro de una condición no uniforme
  (el caso `if (i < N) { ...; __syncthreads(); }`);
- participación uniforme como condición de seguridad, incluso dentro de una
  condición (ej. `if (blockIdx.x == 0) { __syncthreads(); }` es seguro
  porque todo el bloque comparte el mismo `blockIdx.x`).

# Explícitamente fuera del alcance

- `__shared__` y memoria compartida como primitiva (llega después);
- conflictos de banco de memoria compartida;
- sincronización de warp, `__syncwarp()`;
- Cooperative Groups;
- barreras a nivel de grid / lanzamiento cooperativo;
- fences de memoria como familia de API separada;
- atómicos;
- streams, sincronización host, copias asíncronas;
- benchmarks de rendimiento, ocupación, detalles de planificación de
  hardware (warps, SMs);
- una reducción optimizada con memoria compartida (eso es de Clase 2/Clase 3,
  no se reimplementa aquí).

Si otra API se menciona (p. ej. `atomicAdd`, ya visto en Clase 2), es solo
para descartar una confusión puntual — nunca para enseñarla aquí.

---

# Misconcepciones a atacar

Ordenadas por importancia pedagógica.

### 1. "Mi hilo puede continuar apenas llega a `__syncthreads()`" — PRINCIPAL

Falsa. Llegar a la barrera no es cruzarla. La experiencia interactiva
principal existe casi exclusivamente para desmentir esto de forma
experimentable, no solo explicada.

### 2. "`__syncthreads()` sincroniza toda la grid"

Falsa. Su alcance normal es un bloque. Un bloque puede satisfacer su barrera
sin que otro bloque haya llegado siquiera cerca de la suya. Esta es la
segunda comprobación visual fuerte de la lección (escena de dos bloques).

### 3. "Un hilo sin elemento válido no necesita participar en la barrera"

Potencialmente peligrosa, y la conexión más directa con Clase 0. Un hilo
puede no tener trabajo útil por una guarda de rango y seguir existiendo en
el bloque. Si la barrera requiere participación de todo el bloque, dejar que
solo los hilos "con datos" la ejecuten produce un patrón de sincronización
inválido.

### 4. "La barrera implica ejecución en lockstep"

Falsa. Los hilos pueden llegar a la barrera en momentos lógicos distintos.
La garantía es sobre el cruce de la frontera, no sobre que el trabajo previo
ocurrió de forma simultánea instrucción por instrucción. No se debe intentar
simular planificación real de warps para desmentir esto — basta con mostrar
llegadas en orden distinto y la misma liberación conjunta.

### 5. "La barrera calcula algo"

Falsa. `__syncthreads()` coordina orden y visibilidad; no combina valores,
no copia datos, no ejecuta una reducción por sí misma.

### 6. "Más barreras siempre es más seguro"

Falsa, pero secundaria en esta primitiva: se menciona para que el aprendiz
no salga con el hábito de "cuando dude, ponga una barrera", pero **no** se
convierte en lección de rendimiento aquí. La razón correcta para una barrera
es semántica: una fase posterior depende de que la fase anterior haya
llegado a ese punto en todo el bloque.

---

# Experiencia interactiva principal

**Escena:** un bloque, cuatro hilos, una barrera.

```
Block 0
T0 ── trabajo antes ──►│ __syncthreads() │──► trabajo después
T1 ── trabajo antes ──►│ __syncthreads() │──► trabajo después
T2 ── trabajo antes ──►│ __syncthreads() │──► trabajo después
T3 ── trabajo antes ──►│ __syncthreads() │──► trabajo después
```

**Estado inicial (SEE):** los cuatro hilos en `ANTES`, ningún hilo
esperando, geometría de carriles fija (block boundary, posiciones de T0–T3,
posición de la barrera, regiones antes/después) — nada de esto se mueve
durante toda la interacción, solo el estado semántico de cada hilo cambia.

**Predicción (PREDICT):** antes de tocar nada, se pregunta:

> T0 llega primero a `__syncthreads()`. ¿Qué pasa?
>
> A. T0 continúa de inmediato.
> B. T0 espera a los demás hilos de su bloque.
> C. Toda la GPU se detiene.
> D. T0 espera a todos los hilos de la grid.

Correcta: **B**. Esto obliga a razonar sobre el estado antes de revelarlo.

**Interacción (EXECUTE):** un único control, **"Avanzar siguiente
llegada"**, revela llegadas ya fijadas por el modelo determinista — no hay
temporizador ni azar. Orden de llegada fijado para esta escena:

```
1. T0 llega  → T0 pasa a ESPERANDO
2. T2 llega  → T2 pasa a ESPERANDO
3. T1 llega  → T1 pasa a ESPERANDO
4. T3 llega  → última llegada → barrera satisfecha
             → T0, T1, T2, T3 pasan a LIBERADO en el mismo paso
```

Después de cada uno de los tres primeros pasos, la interfaz debe mostrar
explícitamente: *"T1 y T3 todavía no llegaron. Nadie cruza."* — el
contraestado explícito de la misconcepción #1.

Un control adicional, **"Continuar a después"**, mueve los hilos liberados a
`DESPUÉS` y hace visible la frontera cruzada.

Un control **"Reiniciar"** permite repetir el razonamiento completo.

El orden de llegada (`T0, T2, T1, T3`) es un dato explicativo del modelo, no
una simulación de planificación real; la interfaz debe rotularlo como
escenario didáctico determinista, tal como exige el disclaimer estándar del
motor ("no ejecuta CUDA").

**Explicación (EXPLAIN):** una vez liberados los cuatro hilos:

```
Antes de la barrera:  cada hilo llega de forma independiente.
En la barrera:        las llegadas tempranas esperan.
Liberación:            solo cuando todo el bloque llegó.
Después de la barrera: los hilos pueden continuar.
```

Más la garantía mínima de cooperación, con esta redacción (o una variante
técnicamente equivalente en español natural):

> "Primero todo el bloque llega a este punto; después el bloque puede
> continuar con la fase siguiente, y el trabajo relevante hecho antes de la
> barrera por hilos de este bloque queda disponible para el resto del
> bloque."

Sin ampliar a coherencia de caché, fences, ni jerarquía de memoria.

**Condición de éxito de esta experiencia:** el aprendiz debe poder predecir
correctamente, sin ver el resultado, si un hilo dado puede cruzar la
barrera en un estado intermedio dado (por ejemplo: "T0 y T2 esperan; T1 y T3
no llegaron — ¿puede T0 cruzar?" → No).

---

# Uso del motor de aprendizaje

Mapeo a la secuencia causal estándar del motor (`SEE → PREDICT → EXECUTE →
EXPLAIN → QUIRK → CHECK → RETAIN`), usando solo las etapas que tienen un
trabajo pedagógico real.

## SEE
- **Qué aparece:** un bloque, cuatro hilos, la barrera, una pequeña porción
  de trabajo antes y después, todos en `ANTES`.
- **Qué hace el aprendiz:** identifica las entidades y señala mentalmente
  "antes de la barrera / barrera / después de la barrera".
- **Qué enseña:** vocabulario espacial antes de cualquier manipulación.
- **Misconcepción/invariante que apunta:** ninguna todavía — establece la
  escena.

## PREDICT
- **Qué aparece:** la pregunta de opción múltiple sobre T0 llegando primero.
- **Qué hace el aprendiz:** elige una respuesta antes de ver el estado
  cambiar.
- **Qué enseña:** fuerza razonamiento causal previo a la revelación.
- **Misconcepción que apunta:** #1 ("mi hilo continúa de inmediato").

## EXECUTE
- **Qué aparece:** llegadas deterministas reveladas paso a paso mediante
  "Avanzar siguiente llegada".
- **Qué hace el aprendiz:** avanza el modelo y observa `ESPERANDO`
  acumularse sin que nadie cruce, hasta la liberación conjunta.
- **Qué enseña:** hace observable la espera, no solo enunciada.
- **Misconcepción que apunta:** #1 y #4 (llegar ≠ cruzar; llegar ≠
  simultaneidad real).

## EXPLAIN
- **Qué aparece:** el resumen causal (antes/en la barrera/liberación/después)
  más la garantía mínima de disponibilidad del trabajo previo.
- **Qué hace el aprendiz:** lee la conexión entre "barrera satisfecha" y la
  garantía causal que sigue.
- **Qué enseña:** conecta el evento observado con el porqué se usa en
  cooperación.
- **Invariante que fija:** liberación = todo el bloque llegó; disponibilidad
  del trabajo previo tras la barrera.

## QUIRK / EDGE
- **Qué aparece:** el caso límite de bloque parcial con `if (i < N) { ...;
  __syncthreads(); }` (ver sección dedicada más abajo).
- **Qué hace el aprendiz:** identifica qué hilos ejecutan la barrera y por
  qué esa participación divergente es un patrón inválido.
- **Qué enseña:** que "sin dato válido" no es lo mismo que "fuera del
  bloque" (conexión directa con Clase 0).
- **Misconcepción que apunta:** #3.

## CHECK
- **Qué aparece:** la escena de dos bloques (alcance) y preguntas de
  colocación de barrera (Ejercicios 3 y 5).
- **Qué hace el aprendiz:** aplica el modelo a una situación nueva sin
  guía paso a paso.
- **Qué enseña:** verifica alcance y razonamiento de dependencia en
  transferencia, no solo repetición de la escena principal.
- **Misconcepción que apunta:** #2, y refuerza #6 sin convertirla en lección
  de rendimiento.

## RETAIN
- **Qué aparece:** las tarjetas Anki de esta primitiva (ver sección
  dedicada).
- **Qué hace el aprendiz:** repaso espaciado fuera de la sesión.
- **Qué enseña:** fija los invariantes de alcance, espera, participación y
  uso, no trivia de sintaxis.

No se usa una etapa separada de "QUIRK" y "CHECK" como pantallas
completamente distintas de UI si el motor ya las trata como una sección
continua tras EXPLAIN — lo que importa es que ambas cargas pedagógicas
existan, en el orden dado.

---

# Estados de interacción

Verdad determinista mínima que el modelo debe poder responder sin animación:

```
bloque:            id de bloque (ej. 0 y 1 en la escena de alcance)
hilos:             lista fija de ids (T0..T3)
ordenLlegada:       secuencia fija y explícita de ids de hilo
                    (ej. [T0, T2, T1, T3])
estadoPorHilo:      ANTES | ESPERANDO | LIBERADO | DESPUES
barreraSatisfecha:  booleano — verdadero solo cuando
                    todos los hilos participantes están en
                    ESPERANDO o más adelante
pasoActual:         índice dentro de ordenLlegada, 0..N
```

Preguntas que el modelo debe poder responder en cualquier paso, sin
animación:

- ¿qué hilos ya llegaron?
- ¿qué hilos esperan?
- ¿está la barrera satisfecha?
- ¿qué hilos pueden continuar?

Para el caso de participación inválida (bloque parcial), el estado no debe
fingir un resultado de hardware. Se representa con un estado explícito
adicional, por ejemplo `PARTICIPACION_INVALIDA`, aplicado a los hilos que
quedarían fuera de una barrera no uniforme, con una etiqueta textual clara
en vez de intentar "colgar" la escena.

---

# Gramática visual

**Representación elegida:** vista 2D estable de "carriles de hilo con
barrera" (no un timeline de tiempo real, no celdas de memoria, no
isométrico).

```
T0 ─────────► │ SYNC │ ─────────►
T1 ─────────► │ SYNC │ ─────────►
T2 ─────────► │ SYNC │ ─────────►
T3 ─────────► │ SYNC │ ─────────►
```

Esto comunica una **frontera de dependencia**, no tiempo físico transcurrido.

**Por qué esta representación y no otras:**

- *Celdas de memoria solas* (la gramática usada en `cudaMalloc`/`cudaMemcpy`):
  no puede mostrar con claridad "un hilo llegó y espera" — esa es una
  relación entre hilos, no entre celdas de datos.
- *Vista 2.5D / isométrica*: la profundidad no aporta ninguna información
  de sincronización aquí; el manifiesto reserva 2.5D para Clase 4
  (tiles de matriz), no para esta primitiva.
- *Timeline libre de animación en tiempo real*: arriesga enseñar
  planificación falsa y tiempos falsos, justo lo que el motor prohíbe
  explícitamente. Los carriles de hilo con barrera, en cambio, muestran
  cambios de **estado semántico** (`ANTES`/`ESPERANDO`/`LIBERADO`/`DESPUÉS`)
  en posiciones geométricas fijas.

**Geometría estable (no debe moverse durante las transiciones):**

- límite del bloque;
- posición de cada carril de hilo;
- ids de hilo;
- posición de la barrera;
- regiones antes/después.

Solo cambia el estado semántico de cada hilo, nunca su posición ni el orden
de los carriles (los hilos que llegan no se "adelantan" visualmente).

Vocabulario semántico reutilizado del contrato del motor: los estados deben
llevar etiqueta de texto explícita además de color (invariante ya fijado
para `cudaMalloc`/`cudaMemcpy`: el color nunca es el único indicador).

---

# Escena de alcance por bloque

Escena compacta de dos bloques, después de que el aprendiz ya entendió una
barrera:

```
Block 0                      Block 1
T0 ─► SYNC                   T0 ─► (aún en ANTES)
T1 ─► SYNC                   T1 ─► (aún en ANTES)
T2 ─► SYNC                   T2 ─► SYNC
T3 ─► SYNC                   T3 ─► (aún en ANTES)
```

**Pregunta:**

> Todos los hilos del Block 0 llegaron a `__syncthreads()`. Algunos hilos
> del Block 1 todavía no. ¿Puede el Block 0 satisfacer su barrera?

**Correcta:**

> Sí. `__syncthreads()` coordina los hilos dentro del Block 0. No espera al
> Block 1.

La escena debe hacer visualmente evidente que Block 0 se libera mientras
Block 1 sigue en `ANTES`/`ESPERANDO` parcial, sin ninguna línea o elemento
visual que sugiera una barrera compartida entre bloques.

---

# Caso límite: bloque parcial y condición divergente

Reutiliza directamente el bloque final parcial de Clase 0.

**Configuración:** un bloque de 4 hilos donde solo 2 tienen elemento válido:

```
T0 → elemento válido
T1 → elemento válido
T2 → sin elemento válido (fuera de rango)
T3 → sin elemento válido (fuera de rango)
```

**Patrón mostrado (tentador pero peligroso):**

```cpp
if (i < N) {
    work(i);
    __syncthreads();
}
```

**Pregunta 1:**

> ¿Qué hilos llegan a la barrera?

Respuesta: solo T0 y T1 entran a la rama `if`; T2 y T3 la saltan por
completo, así que nunca ejecutan `__syncthreads()`.

**Pregunta 2:**

> ¿Puede satisfacerse de forma segura la barrera de todo el bloque así?

Respuesta esperada: no. La barrera de bloque requiere participación
compatible de todo el bloque; aquí la participación es divergente entre
hilos del mismo bloque.

**Representación de estado:** no se simula un deadlock ni un resultado de
hardware específico. Se marca explícitamente como
`PARTICIPACION_INVALIDA` (o equivalente textual: *"patrón de sincronización
inválido"*), con una explicación de causa, no una animación de bloqueo.

**Estructura conceptualmente segura a mostrar después:**

```cpp
if (i < N) {
    work(i);
}

__syncthreads();

if (i < N) {
    dependent_work(i);
}
```

**Matiz obligatorio (evitar sobre-simplificación):** no se enseña
"`__syncthreads()` nunca puede ir dentro de un `if`". La regla correcta es
que la ejecución condicional de una barrera de bloque no debe producir
participación incompatible entre los hilos del bloque. Redacción sugerida:

> "Una barrera dentro de una condición solo es segura cuando la condición
> conduce a una participación compatible de todo el bloque."

Ejemplo de condición uniforme y segura, mencionado brevemente (no como
ejercicio central):

```cpp
if (blockIdx.x == 0) {
    __syncthreads();
}
```

Todos los hilos del mismo bloque ven el mismo `blockIdx.x`, así que la
participación es uniforme dentro de ese bloque. Este matiz no debe dominar
la lección — un párrafo y un ejemplo bastan.

---

# Conexión con reducción

Se usa Clase 2 solo como motivación, no se reenseña.

```
Fase 1:
  los hilos producen valores intermedios

        ↓
   BARRERA
        ↓

Fase 2:
  los hilos consumen los valores intermedios
```

**Pregunta:**

> ¿Qué podría salir mal si un hilo empieza la Fase 2 mientras otro hilo
> todavía no terminó de producir un valor que la Fase 2 necesita?

**Respuesta:**

> El consumidor podría observar la fase cooperativa antes de que todas las
> escrituras requeridas estén listas — un resultado incorrecto o
> indefinido, no un simple error visible.

La barrera se introduce como la frontera entre esas dos fases. No se
reimplementa la reducción en árbol, no se requiere `__shared__` para este
punto: basta con "Fase 1 produce, Fase 2 consume, la barrera es la
frontera".

---

# Preparación para Clase 3

La lección debe cerrar con una pregunta deliberadamente sin responder:

> **"¿Dónde pueden dejar los hilos datos que otros hilos del mismo bloque
> reutilicen?"**

No se responde aquí. Pertenece a la próxima secuencia de cooperación y
memoria, y en última instancia a Primitiva D (`__shared__`). El cierre debe
dejar explícito el traspaso curricular:

```
ahora sabemos CÓMO coordinar fases
→ después investigamos QUÉ organización de memoria hace útil la cooperación
```

No se debe adelantar la solución (`__shared__`) más allá de nombrarla como
"lo que viene".

---

# Ejercicios

Progresión de reconocimiento a razonamiento independiente.

## Ejercicio 1 — Reconocimiento
Dado un estado con varios hilos en la barrera, identificar cuáles están
`ANTES`, `ESPERANDO` o `LIBERADO`.

## Ejercicio 2 — Predicción
Tres de cuatro hilos ya llegaron.

> ¿Puede alguno de ellos continuar más allá de la barrera?

Esperado: no.

## Ejercicio 3 — Alcance
Block 0 completó su barrera. Block 1 no.

> ¿Debe Block 0 esperar a Block 1?

Esperado: no.

## Ejercicio 4 — Explicación

> ¿Por qué es útil `__syncthreads()` entre dos fases cooperativas?

La respuesta esperada debe mencionar: que los hilos del bloque llegan a la
frontera de fase; que el trabajo dependiente después de la barrera no
empieza antes de tiempo; que las escrituras previas necesarias quedan
visibles para el bloque. No se exige la redacción exacta del manual de
CUDA.

## Ejercicio 5 — Colocación

Dado:

```cpp
producir();

consumir();
```

donde `consumir()` necesita valores producidos por todos los hilos del
bloque, preguntar dónde va la barrera.

Esperado:

```cpp
producir();

__syncthreads();

consumir();
```

El aprendiz debe explicar por qué, no solo copiar la ubicación.

## Ejercicio 6 — Depuración de bloque parcial

Usar el caso `if (i < N) { ...; __syncthreads(); }`. Pedir identificar por
qué poner la barrera dentro de una rama de validez de dato no uniforme es
peligroso. Debe conectarse explícitamente con el bloque final parcial de
Clase 0.

## Ejercicio 7 — Razonamiento independiente

Dar un algoritmo mínimo de dos fases por hilo y preguntar:

1. ¿La Fase B depende del trabajo de otros hilos?
2. Si sí, ¿dónde está la frontera de sincronización?
3. ¿Qué hilos deben participar?
4. ¿Cuál es el alcance de la sincronización?

Este ejercicio vale más que pedir simplemente escribir
`__syncthreads();` en algún lugar.

---

# Rol de CUDA nativo

**Modelo explicativo en navegador:** hace el trabajo pedagógico principal.
Los estados de espera/liberación son difíciles de observar desde la salida
normal de un programa, así que la visualización determinista importa más
aquí que en primitivas anteriores.

**Ejemplo nativo (opcional, evaluar antes de construir):** solo si aporta
valor real más allá de "las otras primitivas tienen uno". Si se incluye:

- debe ser mínimo;
- debe verificar corrección de una sincronización de fase a nivel de bloque
  de forma determinista (por ejemplo: fase 1 escribe valores conocidos en
  un buffer de device ya existente, la barrera separa las fases, fase 2 lee
  y produce un resultado verificable contra un oráculo CPU);
- no debe depender de observar un orden de planificación arbitrario;
- no debe demostrar deliberadamente un kernel que se cuelga (nada de un
  ejemplo con participación divergente ejecutándose de verdad);
- no debe crear código inseguro que arriesgue colgar las pruebas;
- no debe hacer afirmaciones de tiempo o rendimiento.

**Verificación de corrección:** el ejemplo nativo, si existe, verifica que
el resultado final es correcto dado que la barrera separó las fases —no
intenta visualizar la espera en sí, eso es trabajo del modelo de navegador.

---

# Checks / definición de aprendido

El aprendiz terminó esta primitiva cuando puede responder, sin ver el
código de la escena:

1. si dos hilos ya llegaron y dos no, ¿puede alguno cruzar? (no);
2. ¿qué evento libera la barrera? (que todos los hilos participantes del
   bloque hayan llegado);
3. si Block 0 completó su barrera y Block 1 no, ¿debe esperar Block 0?
   (no);
4. dado un patrón `if (i < N) { ...; __syncthreads(); }` sobre un bloque
   parcial, ¿por qué es inválido? (participación divergente: algunos hilos
   nunca ejecutan la barrera);
5. dado un par fase-productora/fase-consumidora, ¿dónde va la barrera y
   por qué? (entre ambas, para que la fase consumidora no empiece antes de
   que el bloque termine de producir).

---

# Tarjetas Anki

Deck sugerido: `SimulaGPU::03 Primitiva C — __syncthreads()`, mismo formato
que `anki/cards/03-cuda-memcpy.yaml` (`notetype: Basic`), con ids
permanentes `syncthreads-001` a `syncthreads-006`.

```yaml
deck: 'SimulaGPU::03 Primitiva C — __syncthreads()'
notetype: Basic
leccion: /clases/syncthreads   # ruta final a confirmar en implementación

cards:
  - id: syncthreads-001
    tipo: memoria
    anverso: '¿Qué pasa cuando un hilo llega a __syncthreads() antes que los demás hilos de su bloque?'
    reverso: 'Espera. No puede cruzar la barrera hasta que el bloque-wide barrier quede satisfecho.'
    etiquetas: [syncthreads, sincronizacion, espera]

  - id: syncthreads-002
    tipo: memoria
    anverso: '¿__syncthreads() sincroniza distintos bloques de hilos?'
    reverso: 'No. Su alcance de sincronización es el bloque de hilos, no la grid completa.'
    etiquetas: [syncthreads, sincronizacion, alcance]

  - id: syncthreads-003
    tipo: memoria
    anverso: '¿Por qué colocar __syncthreads() entre dos fases cooperativas?'
    reverso: 'Para asegurar que el bloque completo llega a la frontera de la primera fase antes de que el trabajo dependiente empiece, con las escrituras previas necesarias visibles para el bloque.'
    etiquetas: [syncthreads, sincronizacion, cooperacion]

  - id: syncthreads-004
    tipo: errores
    anverso: '¿Por qué puede ser inseguro poner __syncthreads() dentro de if (i < N) en un bloque parcial?'
    reverso: 'Porque algunos hilos del bloque pueden saltarse la barrera mientras otros la alcanzan: la participación queda divergente.'
    etiquetas: [syncthreads, errores, bloque-parcial]

  - id: syncthreads-005
    tipo: memoria
    anverso: '¿__syncthreads() obliga a que todos los hilos ejecuten cada instrucción al mismo tiempo (lockstep)?'
    reverso: 'No. Establece una frontera de sincronización de bloque; los hilos pueden llegar a ella en momentos lógicos distintos.'
    etiquetas: [syncthreads, sincronizacion, misconcepcion]

  - id: syncthreads-006
    tipo: errores
    anverso: 'Un kernel se comporta mal o se cuelga solo con ciertos tamaños de entrada, cerca de una barrera. ¿Qué se debe revisar primero?'
    reverso: 'Si todos los hilos requeridos de cada bloque alcanzan el mismo __syncthreads(), sobre todo alrededor de condiciones divergentes o guardas de rango.'
    etiquetas: [syncthreads, errores, depuracion]
```

---

# Accesibilidad y móvil

- operación completa por teclado (avanzar llegada, continuar, reiniciar);
- `prefers-reduced-motion` elimina animación mientras conserva la
  transición causal completa de estados;
- etiquetas legibles por lector de pantalla para cada estado, no solo color
  (ej. "T1 — esperando", "T2 — liberado");
- límites de bloque, ids de hilo y posición de la barrera siempre
  explícitos en texto, nunca solo en un símbolo visual;
- sin interacciones que dependan de hover;
- diseño ~360px de ancho sin scroll horizontal de página.

**Disposición móvil sugerida** (preserva razonamiento por hilo individual,
no colapsa en un contador opaco):

```
BLOCK 0

T0  [antes] | sync | [después]
T1  [antes] | sync | [después]
T2  [antes] | sync | [después]
T3  [antes] | sync | [después]
```

---

# Dependencias de implementación

No se prescriben nombres de archivo definitivos; se documentan las
ubicaciones que el patrón existente de `primitive-b` sugiere como
convención, a confirmar por inspección del repositorio en el momento de
implementar:

- contrato/tipos deterministas: paquete `packages/contracts/src`
  (equivalente a lo que ya existe para `cuda-memcpy`);
- modelo puro: `packages/core/src/<primitiva>` (config, snapshot,
  serialize, tests — mismo patrón que `packages/core/src/cuda-memcpy`);
- componente visual: `packages/visuals/src/Clase<Primitiva>.vue`, siguiendo
  el contrato de `docs/class-methodology.md` y el ejemplo de referencia
  `ClaseCudaMalloc.vue` / `ClaseCudaMemcpy.vue`;
- página de lección: `apps/docs/clases/<slug>.md`, mismo formato que
  `apps/docs/clases/cuda-memcpy.md` (frontmatter, componente embebido,
  sección "Reconocerla en código real", disclaimer "Qué representa el
  modelo");
- ejemplo nativo opcional: `native/examples/<slug>` si se decide construir
  uno (ver "Rol de CUDA nativo" arriba);
- tarjetas: `anki/cards/<nn>-<slug>.yaml`, mismo esquema que
  `anki/cards/03-cuda-memcpy.yaml`;
- actualización del manifiesto: `docs/curriculum/manifest.ts`, entrada
  `primitive-c`, cambiando `status` a `'implemented'` y agregando el bloque
  `implementation` solo cuando exista una porción vertical real (regla ya
  fijada en `docs/curriculum/README.md`, sección "Publishing rule").

El esqueleto congelado `docs/curriculum/modules/primitive-c-syncthreads.md`
no debe modificarse solo para agregar detalle — sus encabezados en inglés
son verificados literalmente por
`tests/curriculum-contract.test.ts`. Este documento pedagógico es un
complemento, no un reemplazo.

---

# Invariantes que la futura implementación deberá proteger

Concretos y verificables por test, en la línea de los invariantes ya
fijados para `cudaMalloc`/`cudaMemcpy`:

1. **Determinismo:** la misma configuración normalizada (número de hilos,
   orden de llegada fijado) siempre produce un snapshot profundamente igual
   (`assert.deepEqual`), sin `Math.random()`, relojes ni I/O en
   `contracts`/`core`.
2. **Liberación conjunta:** ningún hilo puede estar en `LIBERADO` o
   `DESPUES` mientras exista al menos un hilo participante en `ANTES`.
3. **Alcance de bloque:** el estado de un bloque nunca depende del estado
   de otro bloque en el modelo (la escena de dos bloques debe poder
   satisfacer Block 0 con Block 1 total o parcialmente en `ANTES`).
4. **No hay cruce prematuro:** un hilo en `ESPERANDO` nunca transiciona a
   `LIBERADO` salvo en el mismo paso en que el último hilo participante
   llega.
5. **Participación inválida es un estado explícito, no un cuelgue
   simulado:** el escenario de bloque parcial con barrera divergente debe
   representarse con un estado marcado (`PARTICIPACION_INVALIDA` o
   equivalente) y nunca como una animación de bloqueo o freeze de UI.
6. **Geometría estable:** la posición de cada carril de hilo, el límite de
   bloque y la posición de la barrera no cambian entre pasos; solo cambia
   el estado semántico por hilo.
7. **La barrera no calcula:** el modelo no debe exponer ningún campo que
   combine, sume o transforme valores de hilo — solo estado de
   sincronización.
8. **Sin afirmaciones de rendimiento:** el modelo y el texto no contienen
   números de tiempo, ocupación ni comparaciones de velocidad.

---

# Preguntas abiertas

- **Clase 2 ya vive en `apps/docs/leccion/reduccion-paralela.md`, no en
  `apps/docs/clases/`.** ¿La página de esta primitiva debería vivir junto a
  `cuda-malloc.md`/`cuda-memcpy.md` en `apps/docs/clases/` (patrón
  `primitive-a`/`primitive-b`) o en algún lugar más cercano a
  `apps/docs/leccion/`? El patrón alfabético de primitivas sugiere
  `apps/docs/clases/`, pero debe confirmarse contra la convención de rutas
  vigente al momento de implementar.
- **Reutilización de componente:** el motor de aprendizaje anticipa
  extracción de piezas compartidas solo tras una segunda implementación
  real comparada. Con `cudaMalloc` y `cudaMemcpy` ya implementadas, ¿ya
  existen piezas de UI genéricas extraíbles (fila de carriles, widget de
  pregunta de check) que esta primitiva debería reusar en vez de
  duplicar? Requiere inspección directa de
  `packages/visuals/src/ClaseCudaMalloc.vue` y
  `packages/visuals/src/ClaseCudaMemcpy.vue` en el momento de implementar.
- **Ejemplo nativo:** queda sin decidir si vale la pena construir uno. Esta
  especificación deja los criterios (arriba, "Rol de CUDA nativo") pero no
  fuerza la decisión.
- **Nombre de ruta pública final** (`/clases/syncthreads` u otro slug): el
  YAML de Anki de ejemplo en este documento usa un slug provisional; debe
  confirmarse contra la convención real antes de fijar ids permanentes de
  tarjeta.
