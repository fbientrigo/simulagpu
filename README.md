# SimulaGPU

Plataforma educativa estática para aprender **programación GPU y paralela en
español**: documentación, visualizaciones interactivas deterministas, código C++
y CUDA ejecutable, ejercicios con pruebas, y tarjetas Anki.

> **v0.1 — fundación.** La arquitectura está completa, hay una introducción
> interactiva sin prerrequisitos (*Clase 0*) y **una** lección terminada de
> principio a fin: *Del índice global a la suma de vectores*.

## Empezar

**Solo quiero leer y practicar** (no hace falta GPU ni Node):

```bash
git clone https://github.com/fbientrigo/simulagpu.git
cd simulagpu

cmake -S native -B native/build -G Ninja -DCMAKE_BUILD_TYPE=RelWithDebInfo
cmake --build native/build
ctest --test-dir native/build --output-on-failure

./native/build/examples/vector-add/vector_add_example
```

No hay dependencias que descargar: `native/` no necesita red para configurarse.

**Quiero levantar el sitio de documentación:**

```bash
pnpm install
pnpm dev
```

Guía detallada: [`apps/docs/guia/instalacion.md`](apps/docs/guia/instalacion.md).

## Qué hay dentro

```
simulagpu/
├── apps/docs/          sitio VitePress (contenido en español)
├── packages/
│   ├── contracts/      tipos TypeScript sin dependencias
│   ├── core/           modelos didácticos puros y deterministas
│   ├── visuals/        visualizaciones Vue
│   └── theme/          tokens CSS compartidos
├── native/
│   ├── common/         aritmética de lanzamiento, oráculo de CPU, temporizadores
│   ├── examples/       ejemplos ejecutables
│   └── exercises/      starter + solución + pruebas compartidas
├── anki/               tarjetas en YAML y generador del TSV
├── docs/               documentación de ingeniería y ADRs
└── tests/              pruebas transversales
```

## Clase 0 — El modelo mental de una GPU

Introducción interactiva, sin prerrequisitos y sin código, a cómo una GPU
divide datos en chunks y los reparte entre bloques e hilos. Enseña las dos
fórmulas centrales (`número de chunks = ceil(bytes totales / bytes por
chunk)`, `número de bloques = ceil(número de chunks / hilos por bloque)`) con
una secuencia guiada de diez pasos y un ejercicio de comprobación.

| Pieza | Dónde |
| --- | --- |
| Lección | [`apps/docs/clase-0/modelo-mental-gpu.md`](apps/docs/clase-0/modelo-mental-gpu.md) |
| Visualización | [`packages/visuals/src/SimuladorIsometricoGPU.vue`](packages/visuals/src/SimuladorIsometricoGPU.vue) |
| Modelo | [`packages/core/src/chunk-flow/`](packages/core/src/chunk-flow/) |

Deliberadamente sin código ejecutable ni ejercicio nativo: es una introducción
conceptual, no una lección completa según el contrato de `AGENTS.md`. El
código C++ y CUDA real empieza en la Lección 01.

## Lección 01 — Del índice global a la suma de vectores

Enseña de dónde sale `i = blockIdx.x * blockDim.x + threadIdx.x`, por qué hace
falta `if (i < n)`, por qué el número de bloques se redondea hacia arriba, cómo
viajan los datos entre host y device, y cómo comprobar que el resultado es
correcto en vez de suponerlo.

| Pieza | Dónde |
| --- | --- |
| Lección | [`apps/docs/leccion/indice-global-suma-vectores.md`](apps/docs/leccion/indice-global-suma-vectores.md) |
| Visualización | [`packages/visuals/src/ExploradorIndiceGlobal.vue`](packages/visuals/src/ExploradorIndiceGlobal.vue) |
| Modelo | [`packages/core/src/thread-index/`](packages/core/src/thread-index/) |
| Ejemplo | [`native/examples/vector-add/`](native/examples/vector-add/) |
| Ejercicio | [`native/exercises/01-vector-add/`](native/exercises/01-vector-add/) |
| Tarjetas | [`anki/cards/01-indice-global.yaml`](anki/cards/01-indice-global.yaml) |

## Comandos

| Comando | Qué hace |
| --- | --- |
| `pnpm dev` | genera el TSV de Anki y sirve el sitio |
| `pnpm build` | construye el sitio estático |
| `pnpm test` | pruebas unitarias (Vitest) |
| `pnpm typecheck` | TypeScript estricto |
| `pnpm lint` | ESLint + Prettier |
| `pnpm anki:build` | regenera el TSV de Anki |
| `pnpm verify` | todo lo anterior más la construcción y pruebas nativas |

Lista completa, incluidas las opciones de CMake:
[`apps/docs/guia/comandos.md`](apps/docs/guia/comandos.md).

## Sin GPU

La configuración solo-CPU se construye y se prueba sin CUDA instalada. CUDA es
opcional y CMake la detecta sola
([ADR-0002](docs/adr/0002-optional-cuda-detection.md)); si no está, verás:

```
-- CUDA: not found, building the CPU-only configuration
```

Eso no es un error: es la configuración completa de CPU. En el ejercicio 01,
cuatro de los ocho TODO se verifican sin hardware, y son los que contienen la
mayor parte del aprendizaje.

**El código CUDA de este repositorio no ha sido compilado ni ejecutado.** La
v0.1 se escribió en una máquina sin GPU y sin `nvcc`. Está aislado detrás de la
detección opcional de CMake y revisado a mano, pero no verificado en hardware.
SimulaGPU tampoco publica cifras de rendimiento que no haya medido.

## Contribuir

Lee [`AGENTS.md`](AGENTS.md) antes de tocar nada: contiene los límites de la
arquitectura, la política de idioma, el contrato de autoría de ejercicios y la
definición de terminado.

Documentación de ingeniería:

- [`docs/architecture.md`](docs/architecture.md) — capas, direcciones de
  dependencia, política CPU/CUDA
- [`docs/adr/`](docs/adr/) — decisiones y por qué
- [`docs/roadmap.md`](docs/roadmap.md) — qué viene y qué lo desbloquea
- [`docs/sources.md`](docs/sources.md) — atribución de cada concepto

## Fuentes

Los conceptos de la lección 01 vienen del curso GPU Programming de la
[CERN STEAM Academy 2026](https://github.com/CERN-STEAM-Academy/26-GPU-PROGRAMMING)
(GPL-3.0), y los patrones pedagógicos del material HEP Computing Exercises de
CSC Latin America 2026. **No se copió código de ninguno de los dos**; todos los
ejemplos están reescritos desde cero. Registro completo en
[`docs/sources.md`](docs/sources.md).

## Licencia

Sin definir todavía. Hasta que el propietario del repositorio elija una, el
contenido está por defecto bajo *todos los derechos reservados*. Ver
[`docs/roadmap.md`](docs/roadmap.md).
