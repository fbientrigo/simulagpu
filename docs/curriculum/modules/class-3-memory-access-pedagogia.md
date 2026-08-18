# Clase 3 — Cooperación, memoria y patrones de acceso

> Especificación pedagógica detallada. Complementa el scaffold de ingeniería
> `class-3-memory-access.md`; no es una implementación y no publica todavía una ruta.

# Identidad del módulo

- **Id estable:** `class-3`
- **Tipo:** clase numerada integrativa
- **Posición:** después de Primitiva C — `__syncthreads()` y antes de Primitiva D — `__shared__`
- **Estado:** diseño pedagógico; implementación pendiente
- **Representación principal:** 2D precisa, indexada y determinista

# Pregunta central

> **¿Qué cambia cuando los threads dejan de trabajar sobre datos completamente independientes y el patrón de acceso a memoria pasa a ser parte del problema?**

La clase debe integrar cuatro decisiones que hasta ahora aparecían separadas:

1. qué dato necesita cada thread;
2. si esa necesidad depende del trabajo de otros threads;
3. dónde existe una frontera de sincronización;
4. qué patrón de direcciones y qué reutilización produce el algoritmo.

El estudiante no necesita salir sabiendo optimizar una GPU. Debe salir sabiendo **mirar un patrón pequeño y hacer preguntas correctas sobre cooperación y memoria**.

# Por qué existe aquí

La progresión deseada es:

```text
Clase 2
muchos valores → etapas → un resultado

Primitiva C
una fase dependiente no cruza la barrera antes que el bloque

Clase 3
aplicar esa coordinación a un problema donde los datos y sus direcciones importan

Primitiva D
dar nombre y semántica operacional al almacenamiento reutilizable del bloque
```

Clase 3 no debe repetir Primitiva C y tampoco debe adelantar Primitiva D.

Su trabajo es abrir el espacio conceptual entre ambas:

```text
sé coordinar fases
+
veo datos repetidos / dependencias
→
reconozco una oportunidad de cooperación y reutilización
```

# Qué debe poder llevarse un estudiante si esta es su última clase

La clase debe cerrar un circuito completo aunque el estudiante nunca continúe.

Al terminar debe poder mirar un algoritmo GPU pequeño y responder:

- ¿cada thread puede resolver su salida usando solo datos propios?
- ¿qué otros índices necesita?
- ¿hay una fase que depende de trabajo previo de otros threads del mismo bloque?
- ¿dónde iría una frontera de sincronización conocida?
- ¿los threads están accediendo a posiciones contiguas o separadas por un stride?
- ¿qué valores son usados repetidamente?
- ¿dónde hay una oportunidad razonable de reutilizar datos?

No necesita conocer aún la sintaxis de `__shared__` para que este razonamiento sea útil.

# Prerrequisitos

## REQUERIDO

### Clase 0

El estudiante conoce:

- grid, bloque y thread;
- thread id e índice global;
- bloques finales parciales;
- diferencia entre thread lanzado y elemento válido.

### Clase 1

El estudiante domina:

```text
thread → índice → elemento
```

y puede razonar sobre `i < N`.

### Clase 2

El estudiante entiende:

- transformación por etapas;
- valores intermedios;
- dependencias entre una etapa y la siguiente;
- corrección antes de rendimiento.

No se asume conocimiento profundo de primitivas posteriores.

### Primitiva C — `__syncthreads()`

Se asume ya aprendido:

```text
threads llegan por separado
→ los que llegan antes esperan
→ todo el bloque alcanza la barrera
→ la fase dependiente puede continuar
```

También se asume:

- alcance al bloque;
- no sincroniza bloques distintos;
- la participación divergente puede ser inválida.

Clase 3 **usa** este vocabulario; no vuelve a enseñarlo desde cero.

## ÚTIL PERO NO REQUERIDO

- `cudaMalloc` y `cudaMemcpy` como vocabulario de memoria de device y movimiento explícito;
- familiaridad básica con arreglos y direcciones contiguas.

## AÚN NO INTRODUCIDO

No asumir:

- declaración o semántica operacional de `__shared__`;
- bank conflicts;
- warps como unidad de optimización;
- occupancy;
- cachés detalladas;
- atomics;
- streams;
- medición con CUDA events;
- profiling.

# Modelo mental mínimo

El modelo tiene cinco entidades:

```text
THREAD
ÍNDICE / DIRECCIÓN
VALOR
FASE
RELACIÓN DE REUTILIZACIÓN
```

La escena principal usa un único arreglo global pequeño y cuatro threads del mismo bloque.

El estudiante debe poder separar siempre:

```text
T2 accede al índice 4
```

de:

```text
input[4] contiene 17
```

Índice y valor nunca son el mismo concepto visual.

## Modelo de acceso

Cada thread posee una lista determinista de índices solicitados.

Ejemplo independiente:

```text
T0 → [0]
T1 → [1]
T2 → [2]
T3 → [3]
```

Ejemplo con stride:

```text
T0 → [0]
T1 → [2]
T2 → [4]
T3 → [6]
```

Ejemplo con vecindad y reutilización:

```text
T0 → [0,1]
T1 → [1,2]
T2 → [2,3]
T3 → [3,4]
```

Aquí `[1]`, `[2]` y `[3]` son pedidos por más de un thread.

## Qué cambia

Al cambiar el patrón:

- cambia qué direcciones solicita cada thread;
- puede aparecer dependencia entre fases;
- puede aparecer reutilización potencial.

## Qué no cambia

No cambia automáticamente:

- el valor almacenado en cada índice;
- el número de threads;
- el bloque al que pertenecen;
- el significado matemático de una suma simple;
- ninguna métrica real de rendimiento.

La visualización no debe inferir throughput ni scheduling.

# Conceptos dentro del alcance

- trabajo independiente vs trabajo cooperativo;
- valores privados de un thread como idea conceptual mínima;
- memoria global del device como región indexada visible;
- acceso contiguo;
- acceso con stride;
- patrón thread → dirección;
- dependencia entre fases;
- aplicación de una barrera ya conocida;
- lecturas repetidas;
- oportunidad de reutilización;
- motivación de almacenamiento reutilizable a nivel de bloque, sin enseñar aún `__shared__`.

# Fuera del alcance

- sintaxis de `__shared__`;
- tamaño, declaración estática/dinámica o lifetime detallado de shared memory;
- bank conflicts;
- modelar transacciones reales de DRAM;
- cache lines, sectors o políticas de caché;
- throughput o latencia fabricada;
- occupancy;
- warp scheduling;
- Tensor Cores;
- profiling;
- optimización específica de arquitectura.

La clase puede decir:

> “El patrón de direcciones importa para el comportamiento de memoria.”

No puede decir sin medición:

> “Este patrón es 2.3× más rápido.”

# Misconcepciones

## 1. “Cada thread GPU siempre trabaja de forma completamente independiente.”

**Prioridad máxima.**

Clase 1 hacía útil ese modelo. Clase 3 debe mostrar exactamente dónde deja de alcanzar.

Un thread puede seguir siendo dueño de una salida y, aun así, necesitar datos que también usan otros threads o una fase producida cooperativamente.

## 2. “Si la aritmética es la misma, el patrón de memoria no importa.”

Dos asignaciones pueden efectuar la misma cantidad de sumas y usar direcciones organizadas de forma distinta.

La clase enseña la estructura, no un ranking numérico de rendimiento.

## 3. “`__syncthreads()` comparte los datos.”

Falso.

La barrera coordina fases. No crea almacenamiento, no mueve valores y no copia datos por sí misma.

Este error debe quedar eliminado antes de Primitiva D.

## 4. “Si varios threads necesitan el mismo valor, necesariamente hay que volver a pedirlo de la misma forma cada vez.”

No se entrega todavía la solución operacional.

La clase debe lograr que el estudiante vea la **oportunidad de reutilización**.

# Experiencia interactiva principal

## Elección del problema

Usar una operación de vecindad 1D deliberadamente trivial:

```text
y[i] = x[i] + x[i + 1]
```

No interesa la matemática. Interesa que cada salida use dos entradas y que los vecinos compartan una de ellas.

Con cuatro threads:

```text
x:   [3] [5] [2] [7] [4]
idx:  0   1   2   3   4

T0 calcula y[0] con x[0], x[1]
T1 calcula y[1] con x[1], x[2]
T2 calcula y[2] con x[2], x[3]
T3 calcula y[3] con x[3], x[4]
```

Se ve inmediatamente:

```text
x[1] lo usan T0 y T1
x[2] lo usan T1 y T2
x[3] lo usan T2 y T3
```

La escena sirve para conectar dependencia de datos, patrón de direcciones y reutilización sin introducir una matemática nueva.

# Secuencia pedagógica / uso del motor de aprendizaje

Clase 3 es integrativa; no debe copiar mecánicamente el flujo de una primitiva. Se usa el motor como gramática causal:

```text
SEE → PREDICT → MANIPULATE → OBSERVE → EXPLAIN → APPLY
```

Las etapas siguientes pueden vivir dentro de un solo componente y una sola geometría estable.

## Estado 1 — SEE: volver al caso independiente

### Qué aparece

```text
BLOCK 0
T0 T1 T2 T3

x[0] x[1] x[2] x[3] x[4]
```

Primero cada thread solicita un único elemento:

```text
T0→0  T1→1  T2→2  T3→3
```

### Qué hace el estudiante

Identifica qué dato corresponde a cada thread.

### Qué enseña

Recupera el modelo conocido de Clase 1 antes de romperlo.

### Qué NO hacer

No explicar todavía coalescing, reuse ni shared memory.

---

## Estado 2 — PREDICT: aparece la vecindad

La operación cambia a:

```text
y[i] = x[i] + x[i+1]
```

### Pregunta

> ¿Qué entradas necesita T2?

Respuesta:

```text
x[2] y x[3]
```

Luego:

> ¿Hay algún valor que también necesite otro thread?

Respuesta esperada:

```text
sí; x[2] también lo usa T1 y x[3] también lo usa T3
```

### Qué enseña

El thread sigue siendo dueño de una salida, pero el patrón de lectura dejó de ser “un thread, un único dato”.

---

## Estado 3 — OBSERVE: hacer visible la reutilización

### Qué aparece

Solo dos niveles de highlight simultáneos:

1. thread seleccionado;
2. valores que comparte con vecinos.

Ejemplo al seleccionar T2:

```text
T2 → x[2], x[3]
      ↑      ↑
     T1     T3 también los usan
```

### Qué hace el estudiante

Selecciona uno de los cuatro threads y observa sus peticiones.

### Control justificado

**Selector de thread T0–T3.**

¿Qué enseña manipularlo?

> Que la reutilización es una relación entre peticiones de distintos threads, no una propiedad abstracta del arreglo.

No agregar zoom, speed, scheduler, block size libre ni más parámetros.

---

## Estado 4 — MANIPULATE: comparar patrón contiguo y stride

Mantener los mismos cuatro thread lanes y la misma fila indexada.

Control único:

```text
Patrón: CONTIGUO | STRIDE 2
```

Escena contigua:

```text
T0→0  T1→1  T2→2  T3→3
```

Escena stride 2:

```text
T0→0  T1→2  T2→4  T3→6
```

Para esta comparación se puede ampliar la fila hasta índices 0–6, pero la geometría debe seguir fija entre ambas opciones.

### Pregunta previa

> ¿Qué cambia entre ambas configuraciones: los valores o las direcciones que pide cada thread?

Respuesta:

> Las direcciones solicitadas.

### Resultado pedagógico

El estudiante puede decir:

- contiguo: threads vecinos solicitan índices vecinos;
- stride 2: los índices solicitados quedan separados por dos posiciones.

No simular transacciones de hardware.

---

## Estado 5 — APPLY PRIMITIVE C: una fase cooperativa conceptual

Volver al patrón de vecindad.

Plantear una estrategia conceptual, todavía sin nombrar una API de almacenamiento:

```text
FASE A
el bloque reúne una vez el pequeño conjunto de datos reutilizables

BARRERA CONOCIDA
__syncthreads()

FASE B
los threads consumen esos datos para sus salidas
```

La región de la Fase A debe rotularse explícitamente:

> **Área conceptual de datos reutilizables del bloque — todavía no es una API enseñada.**

No mostrar `__shared__` ni declaración CUDA.

### Pregunta

> T0 terminó su contribución a la Fase A. T3 todavía no. ¿Puede T0 empezar la Fase B si esa fase depende del conjunto completo?

Respuesta:

> No. Esta es exactamente una dependencia entre fases del mismo bloque; se aplica la barrera ya aprendida.

### Qué enseña

`__syncthreads()` coordina la transición, pero **no crea el lugar donde viven los datos**.

Esta distinción es el puente curricular principal.

---

## Estado 6 — EXPLAIN: cerrar el circuito

Mostrar una síntesis pequeña:

```text
thread → direcciones que necesita
          ↓
patrón contiguo / stride
          ↓
valores repetidos entre threads
          ↓
si cooperamos: separar producir/reunir de consumir
          ↓
la barrera coordina fases
```

La conclusión debe ser:

> “Ya puedes detectar dependencias, patrones de acceso y oportunidades de reutilización sin asumir todavía cómo CUDA implementa ese almacenamiento.”

---

## Estado 7 — OPEN QUESTION: preparar Primitiva D

Solo después del cierre anterior:

> **Si un bloque quiere conservar esos datos reutilizables en un lugar accesible por sus propios threads, ¿qué almacenamiento ofrece CUDA para hacerlo?**

No responder profundamente aquí.

# Estados deterministas

La futura implementación debería modelar verdad pura aproximadamente como:

```text
scenario:
  independent | neighborhood | contiguous | strided | cooperative

threads:
  T0..T3

memoryCells:
  index
  value

requestsByThread:
  threadId → [indices]

selectedThread:
  presentación solamente; NO pertenece al snapshot de verdad

reusedIndices:
  índices solicitados por más de un thread

dependency:
  none | phaseA-before-phaseB

barrierRequired:
  boolean derivado del escenario cooperativo
```

El modelo debe poder responder sin animación:

- qué índices solicita cada thread;
- cuáles son contiguos/strided según la configuración didáctica;
- qué índices son repetidos;
- si existe dependencia entre las fases modeladas;
- si la barrera es necesaria para esa dependencia.

No debe contener:

- tiempo;
- ancho de banda;
- latencia;
- scheduling;
- caché simulada;
- transacciones de DRAM;
- “speedup”.

# Gramática visual

## Representación

2D precisa:

- threads en carriles estables;
- memoria como fila indexada;
- valor dentro de cada celda claramente separado del índice;
- flechas thread → índice;
- etiquetas de región y fase.

## Geometría estable

No mover entre estados:

- orden T0–T3;
- fila de memoria;
- orden de índices;
- posición general de regiones.

Cambiar solo:

- flechas activas;
- estado semántico;
- labels;
- highlights.

## Por qué no 2.5D

La profundidad no aporta a thread → address → value.

Reservar 2.5D para estructuras donde la profundidad sí codifique una relación útil, especialmente tiles de matrices en Clase 4.

## Por qué no timeline-first

La clase no trata de tiempo físico. La barrera aparece como frontera lógica conocida, no como timeline de ejecución.

# Patrones de acceso

La comparación introductoria debe limitarse a dos reglas visuales claras:

```text
CONTIGUO
threads vecinos → índices vecinos

STRIDE 2
threads vecinos → índices separados por dos
```

La palabra “coalescing” puede aparecer como vocabulario introductorio solo después de que el estudiante vea el patrón.

Redacción segura:

> “En CUDA, la forma en que threads cercanos agrupan sus direcciones puede cambiar cómo se sirven las solicitudes de memoria. Aquí solo modelamos la estructura de direcciones; no simulamos las transacciones ni su rendimiento.”

No enseñar aún reglas específicas de segmentos o arquitecturas.

# Cooperación y sincronización

Clase 3 debe reutilizar Primitiva C con una sola pregunta funcional:

> ¿Existe una fase B que dependa de que el bloque complete una fase A?

Si sí:

```text
FASE A
→ __syncthreads()
→ FASE B
```

No volver a explicar:

- orden de llegada;
- estado ESPERANDO;
- alcance entre bloques;
- divergencia.

Eso ya pertenece a Primitiva C.

El único recordatorio necesario:

> “La barrera coordina el bloque; no almacena ni copia los datos.”

# Oportunidad de reutilización

La clase debe diferenciar tres niveles:

### Observación

```text
x[2] es solicitado por T1 y T2
```

### Oportunidad

```text
ese valor podría ser reunido una vez y reutilizado por el bloque
```

### Solución CUDA concreta

**Fuera de esta clase.**

No convertir “reutilización” automáticamente en “más rápido”.

Redacción correcta:

> “Reutilizar puede evitar peticiones globales repetidas en ciertos diseños; comprobar su impacto real requiere una implementación y medición apropiadas.”

# Ejercicios

Mantener 5 ejercicios fuertes.

## 1. Reconocimiento — direcciones

Dado:

```text
T0→0 T1→1 T2→2 T3→3
```

preguntar:

> ¿Qué índice solicita T2?

Objetivo: confirmar thread ≠ index ≠ value.

## 2. Predicción — vecindad

Dado:

```text
y[i] = x[i] + x[i+1]
```

preguntar:

> ¿Qué entradas necesita T1 y cuál comparte con un vecino?

Objetivo: detectar reutilización concreta.

## 3. Clasificación — patrón de acceso

Comparar:

```text
A: 0,1,2,3
B: 0,2,4,6
```

preguntar:

> ¿Cuál es contiguo y cuál tiene stride 2?

No preguntar “cuál es X veces más rápido”.

## 4. Explicación — barrera

Escenario:

```text
Fase A reúne datos requeridos por todo el bloque.
Fase B los consume.
```

Preguntar:

> ¿Por qué puede existir una barrera entre A y B? ¿Qué NO aporta la barrera?

Respuesta esperada:

- evita empezar la fase dependiente antes de completar la frontera del bloque;
- no proporciona almacenamiento por sí misma.

## 5. Aplicación independiente

Dar un patrón nuevo pequeño, por ejemplo:

```text
z[i] = x[i] + x[i+2]
```

Pedir:

1. listar las direcciones de T0–T3;
2. identificar si existe reutilización entre solicitudes;
3. describir el stride aparente de una selección concreta;
4. decidir si una estrategia cooperativa de dos fases necesitaría una frontera;
5. explicar qué pregunta quedaría sobre dónde almacenar lo reutilizable.

Este es el criterio fuerte de transferencia.

# Rol de CUDA nativo

## Modelo navegador

Es la pieza principal.

Debe mostrar relaciones exactas:

```text
thread → índice → valor
```

más:

```text
índices repetidos
fase A → barrera → fase B
```

## CUDA nativo

No es obligatorio para aprobar el diseño de esta clase.

No añadir un ejemplo nuevo solo por simetría con otras clases.

Si más adelante se incluye uno, debe servir para corrección o inspección de direcciones, no para inventar rendimiento.

La comparación real de rendimiento debe esperar una infraestructura de medición adecuada.

# Checks / definición de aprendido

El estudiante domina Clase 3 si, ante un patrón que no vio en la lección, puede:

1. mapear cada thread a los índices que solicita;
2. distinguir índice de valor almacenado;
3. reconocer si el trabajo es independiente o tiene una fase cooperativa;
4. ubicar una frontera `__syncthreads()` cuando una fase B depende de que el bloque complete A;
5. decir que la barrera coordina pero no almacena;
6. clasificar un mapping simple como contiguo o strided;
7. señalar qué datos son pedidos por varios threads;
8. explicar que esa repetición crea una oportunidad de reutilización sin prometer un speedup.

# Anki

Mantener 5 tarjetas de alto valor.

## class3-001

**Frente:** ¿Qué diferencia hay entre “thread”, “índice de memoria” y “valor almacenado”?  
**Reverso:** El thread ejecuta trabajo; el índice identifica una posición; el valor es el contenido guardado en esa posición.

## class3-002

**Frente:** ¿Qué caracteriza un patrón contiguo de acceso en el modelo introductorio?  
**Reverso:** Threads vecinos solicitan índices vecinos, por ejemplo T0→0, T1→1, T2→2, T3→3.

## class3-003

**Frente:** ¿Qué es un acceso con stride?  
**Reverso:** Un mapping donde las direcciones solicitadas avanzan con un salto fijo mayor que uno, por ejemplo 0,2,4,6 para stride 2.

## class3-004

**Frente:** ¿Qué hace `__syncthreads()` en un patrón cooperativo y qué no hace?  
**Reverso:** Separa fases dependientes dentro del bloque; no crea almacenamiento ni copia datos por sí misma.

## class3-005

**Frente:** ¿Qué indica que existe una oportunidad de reutilización de datos?  
**Reverso:** Que varios threads o varias operaciones necesitan repetidamente los mismos valores; eso sugiere estudiar una forma de conservarlos para reutilizarlos.

No incluir sintaxis de `__shared__` en este mazo.

# Accesibilidad / móvil

- diseño funcional a ~360 px;
- sin hover obligatorio;
- controles ≥44 px;
- thread id siempre textual;
- índice y valor con labels accesibles diferentes;
- patrón contiguo/stride no distinguido solo por color;
- flechas acompañadas por texto o resumen accesible;
- `prefers-reduced-motion` elimina movimiento sin ocultar ninguna relación;
- máximo cuatro threads visibles en la escena principal;
- máximo dos highlights simultáneos;
- si las flechas se vuelven densas en móvil, seleccionar un thread a la vez en vez de mostrar todas superpuestas.

Ejemplo de aria-label:

```text
“T2 solicita índice 2, valor 2, y índice 3, valor 7.”
```

No usar solamente:

```text
“T2: azul”.
```

# Dependencias de implementación

Antes de implementar:

- inspeccionar `AGENTS.md` y `docs/class-methodology.md` vigentes;
- preservar verdad determinista de `packages/core`;
- revisar Primitive C real, no asumir que su componente final tendrá exactamente la forma del diseño;
- comparar componentes existentes antes de extraer cualquier pieza compartida;
- no crear un framework genérico de accesos a memoria;
- mantener Clase 3 como una sola experiencia progresiva si es viable;
- usar el scaffold `class-3-memory-access.md` como contrato de alto nivel y este documento como autoridad pedagógica detallada.

# Invariantes de futura implementación

1. **Determinismo:** misma configuración produce requests, reuse y dependencias idénticas.
2. **Índice ≠ valor:** nunca inferir el valor desde el número de índice ni fusionar ambos visualmente.
3. **Mapping explícito:** cada flecha thread→memoria corresponde a una relación presente en el modelo.
4. **Contiguo:** el escenario canónico produce `[0,1,2,3]` para T0–T3.
5. **Stride 2:** el escenario canónico produce `[0,2,4,6]`.
6. **Vecindad:** para `y[i]=x[i]+x[i+1]`, T2 solicita `[2,3]`.
7. **Reuse derivado:** un índice se marca reutilizado solo si aparece en las peticiones de más de un thread del escenario.
8. **Barrera semántica:** solo marcar barrera requerida cuando la Fase B modelada depende del conjunto producido/reunido en A.
9. **Barrera no almacena:** el snapshot no debe atribuir a `__syncthreads()` creación o copia de valores.
10. **Sin `__shared__` operacional:** ningún estado de esta clase depende de sintaxis, tamaño o lifetime de shared memory.
11. **Sin simulación de hardware:** no hay clocks, random scheduling, latencia, bandwidth, cache transactions o speedup.
12. **Geometría estable:** presentación puede resaltar mappings, pero no reordenar threads o índices para hacer parecer mejor un patrón.

# Preguntas abiertas

## 1. Título contractual

El manifiesto actual todavía puede usar el título histórico `Clase 3 — Memoria de GPU y patrones de acceso`. La intención pedagógica refinada es `Clase 3 — Cooperación, memoria y patrones de acceso`. Antes de implementar, decidir si se actualiza el título del manifiesto; el orden y el id `class-3` no deben cambiar.

## 2. Palabra “coalescing”

Confirmar en implementación cuánto vocabulario explícito introducir. La clase necesita la intuición de organización de direcciones; no necesita todavía reglas hardware-específicas.

## 3. Área conceptual de reutilización

El visual debe motivar almacenamiento a nivel de bloque sin parecer una API ya aprendida. Si una caja “área reutilizable” se confunde con shared memory real, usar una representación todavía más abstracta: “datos requeridos para Fase B”.

## 4. CUDA nativo

No hay necesidad pedagógica demostrada todavía. Mantenerlo fuera hasta que una implementación concreta justifique el costo.

# Cierre curricular

La clase debe cerrar con dos movimientos separados:

Primero, cierre completo:

> **Ya puedes mirar un algoritmo pequeño y razonar sobre dependencias, sincronización, direcciones y reutilización.**

Después, solo como apertura:

> **Si el bloque quiere guardar esos datos reutilizables en un lugar accesible por sus threads, ¿qué herramienta de CUDA ofrece ese almacenamiento?**

Esa segunda pregunta pertenece a Primitiva D — `__shared__`.
