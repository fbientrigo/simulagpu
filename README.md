# SimulaGPU

Plataforma educativa estática para aprender **programación GPU y paralela en español** mediante documentación, modelos interactivos deterministas, código C++/CUDA ejecutable, ejercicios con pruebas y tarjetas Anki.

> **Clase 0 y dos clases verticales completas.** La Clase 0 es una introducción
> interactiva sin prerrequisitos ni código al modelo mental de chunks, bloques
> e hilos. La Clase 01 introduce el índice global con suma de vectores. La
> Clase 02 introduce carreras de datos y reducción paralela con un laboratorio
> donde el alumno modifica fragmentos del kernel mediante `select` y ejecuta
> pruebas guiadas en el navegador.

La versión también conserva la clase complementaria de metodología *una
primitiva por vez*: `cudaMalloc` reserva memoria, pero no la inicializa.

## Empezar

**Solo quiero leer y practicar la parte CPU** — no hace falta GPU ni Node:

```bash
git clone https://github.com/fbientrigo/simulagpu.git
cd simulagpu

cmake -S native -B native/build -G Ninja -DCMAKE_BUILD_TYPE=RelWithDebInfo
cmake --build native/build
ctest --test-dir native/build --output-on-failure

./native/build/examples/vector-add/vector_add_example
./native/build/examples/reduction/reduction_example
```

`native/` no descarga dependencias y puede configurarse sin CUDA.

**Quiero levantar el sitio interactivo:**

```bash
pnpm install
pnpm dev
```

Guía detallada: [`apps/docs/guia/instalacion.md`](apps/docs/guia/instalacion.md).

## Qué hay dentro

```text
simulagpu/
├── apps/docs/          sitio VitePress y lecciones en español
├── packages/
│   ├── contracts/      contratos TypeScript sin dependencias
│   ├── core/           modelos didácticos puros y deterministas
│   ├── visuals/        visualizaciones y laboratorios Vue
│   └── theme/          tokens CSS compartidos
├── native/
│   ├── common/         oráculos CPU, aritmética y validación
│   ├── examples/       ejemplos ejecutables CPU + CUDA opcional
│   └── exercises/      starter + solución + pruebas compartidas
├── anki/               tarjetas YAML y generador TSV
├── docs/               arquitectura, roadmap, ADRs y atribución
└── tests/              pruebas transversales de enlaces y artefactos
```

## Clase complementaria — `cudaMalloc`: reservar no es inicializar

Primera demostración de la metodología **una primitiva por clase**. Empieza con
una predicción, recorre `ANTES → ACCIÓN → DESPUÉS`, separa lo que cambió de lo
que no cambió, termina con tres comprobaciones y cuatro tarjetas. El progreso se
guarda solo en `localStorage`, sin cuenta ni seguimiento.

| Pieza | Dónde |
| --- | --- |
| Clase | [`apps/docs/clases/cuda-malloc.md`](apps/docs/clases/cuda-malloc.md) |
| Visualización | [`packages/visuals/src/ClaseCudaMalloc.vue`](packages/visuals/src/ClaseCudaMalloc.vue) |
| Modelo | [`packages/core/src/cuda-malloc/`](packages/core/src/cuda-malloc/) |
| Tarjetas | [`anki/cards/01-cuda-malloc.yaml`](anki/cards/01-cuda-malloc.yaml) |
| Metodología | [`docs/class-methodology.md`](docs/class-methodology.md) |

La clase reutiliza el ejemplo y el ejercicio de suma de vectores como contexto
ejecutable; no duplica código nativo para una reserva que no tiene un núcleo
CPU equivalente útil.

## Clase 0 — El modelo mental de una GPU

Introducción interactiva, sin prerrequisitos y sin código, a cómo una GPU
divide datos en chunks y los reparte entre bloques e hilos. Enseña las dos
fórmulas centrales (`número de chunks = ceil(bytes totales / bytes por
chunk)`, `número de bloques = ceil(número de chunks / hilos por bloque)`) con
una secuencia guiada de diez pasos y un ejercicio de comprobación.

| Pieza | Dónde |
| --- | --- |
| Lección | [`apps/docs/clase-0/modelo-mental-gpu.md`](apps/docs/clase-0/modelo-mental-gpu.md) |
| Visualización | [`packages/visuals/src/ModeloMentalGpu.vue`](packages/visuals/src/ModeloMentalGpu.vue) |
| Modelo | [`packages/core/src/chunk-flow/`](packages/core/src/chunk-flow/) |

Deliberadamente sin código ejecutable ni ejercicio nativo: es una introducción
conceptual, no una lección completa según el contrato de `AGENTS.md`. El
código C++ y CUDA real empieza en la Clase 01.

## Clase 01 — Índice global y suma de vectores

Enseña `blockIdx.x * blockDim.x + threadIdx.x`, el guard `i < n`, división redondeada hacia arriba, transferencias host/device y verificación contra un oráculo CPU.

| Pieza | Ruta |
| --- | --- |
| Lección | [`apps/docs/leccion/indice-global-suma-vectores.md`](apps/docs/leccion/indice-global-suma-vectores.md) |
| Visualización | [`packages/visuals/src/ExploradorIndiceGlobal.vue`](packages/visuals/src/ExploradorIndiceGlobal.vue) |
| Ejemplo | [`native/examples/vector-add/`](native/examples/vector-add/) |
| Ejercicio | [`native/exercises/01-vector-add/`](native/exercises/01-vector-add/) |
| Tarjetas | [`anki/cards/01-indice-global.yaml`](anki/cards/01-indice-global.yaml) |

## Clase 02 — Reducción paralela

Pasa de operaciones independientes a una salida compartida. Cubre carrera de datos, `atomicAdd`, pares adyacentes, reducción en árbol, tamaños impares, `__syncthreads()`, memoria compartida y no asociatividad de `float`.

El laboratorio web presenta código CUDA con tres fragmentos seleccionables. **Ejecutar pruebas** evalúa su aritmética equivalente en CPU para entradas pares, impares y unitarias. Es deliberadamente un runner pedagógico limitado: no compila CUDA ni simula hardware.

| Pieza | Ruta |
| --- | --- |
| Lección | [`apps/docs/leccion/reduccion-paralela.md`](apps/docs/leccion/reduccion-paralela.md) |
| Laboratorio | [`packages/visuals/src/LaboratorioReduccion.vue`](packages/visuals/src/LaboratorioReduccion.vue) |
| Modelo y runner | [`packages/core/src/reduction/`](packages/core/src/reduction/) |
| Ejemplo | [`native/examples/reduction/`](native/examples/reduction/) |
| Ejercicio | [`native/exercises/02-reduction/`](native/exercises/02-reduction/) |
| Tarjetas | [`anki/cards/02-reduccion.yaml`](anki/cards/02-reduccion.yaml) |

## Comandos

| Comando | Qué hace |
| --- | --- |
| `pnpm dev` | genera el TSV de Anki y sirve el sitio |
| `pnpm build` | construye el sitio estático |
| `pnpm test` | pruebas unitarias Vitest |
| `pnpm typecheck` | TypeScript y Vue en modo estricto |
| `pnpm lint` | ESLint + Prettier |
| `pnpm anki:build` | regenera el TSV determinista |
| `pnpm native:verify` | configura, compila y ejecuta CTest |
| `pnpm verify` | validación completa web + native |

Lista completa: [`apps/docs/guia/comandos.md`](apps/docs/guia/comandos.md).

## Sin GPU

La configuración CPU-only compila y prueba las ideas centrales de ambas clases. CUDA es opcional y CMake la detecta automáticamente; `-DSIMULAGPU_CUDA=OFF` fuerza la ruta sin toolkit.

El CI estándar no instala `nvcc` ni tiene GPU. Por tanto, los `.cu` no forman parte del build obligatorio y el repositorio no afirma que hayan sido compilados o ejecutados en CI. Las cifras que imprimen los ejemplos son mediciones locales, no benchmarks publicados.

## Contribuir

Lee [`AGENTS.md`](AGENTS.md) antes de modificar el repositorio. Define la arquitectura, la política de idioma, el contrato de ejercicios y la condición de terminado.

- [`docs/architecture.md`](docs/architecture.md) — capas y límites
- [`docs/curriculum/manifest.ts`](docs/curriculum/manifest.ts) — orden pedagógico congelado
- [`docs/project/roadmap.json`](docs/project/roadmap.json) — estado de ejecución del proyecto (`pnpm roadmap:status`)
- [`docs/sources.md`](docs/sources.md) — atribución exacta
- [`docs/adr/`](docs/adr/) — decisiones de arquitectura

## Fuentes

Los conceptos GPU se apoyan en el curso GPU Programming de la [CERN STEAM Academy 2026](https://github.com/CERN-STEAM-Academy/26-GPU-PROGRAMMING), y los patrones pedagógicos en `csc2026_e1` de CSC Latin America 2026. **No se copió código de ninguno**: las implementaciones y el contenido se escribieron desde cero. Registro completo en [`docs/sources.md`](docs/sources.md).

## Licencia

Aún no hay archivo `LICENSE`; por defecto, el contenido permanece bajo todos los derechos reservados. La decisión está registrada en el roadmap.
