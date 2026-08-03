---
title: Comandos
description: Todos los comandos de SimulaGPU, del sitio web y del código nativo.
---

# Comandos

## Sitio web y contenido

Se ejecutan desde la raíz del repositorio.

| Comando | Qué hace |
| --- | --- |
| `pnpm install` | instala las dependencias del workspace |
| `pnpm dev` | genera el TSV de Anki y levanta el sitio en modo desarrollo |
| `pnpm build` | genera el TSV y construye el sitio estático |
| `pnpm preview` | sirve el sitio ya construido |
| `pnpm test` | pruebas unitarias (modelos y visualizaciones) con Vitest |
| `pnpm typecheck` | TypeScript en modo estricto, incluidos los `.vue` |
| `pnpm lint` | ESLint y Prettier en modo comprobación |
| `pnpm format` | aplica Prettier |
| `pnpm anki:build` | regenera el TSV de Anki |
| `pnpm verify` | todo lo anterior más la construcción y las pruebas nativas |

`pnpm verify` es lo que conviene ejecutar antes de abrir un pull request. Es
también, casi línea por línea, lo que corre CI.

::: tip Prettier y el Markdown
Prettier no toca los archivos `.md`. Reformatear Markdown escrito a mano rompe
tablas alineadas y saltos deliberados; el contenido lo cuidan las personas, no
el formateador.
:::

## Código nativo

| Comando | Qué hace |
| --- | --- |
| `pnpm native:configure` | configura la construcción solo-CPU en `native/build` |
| `pnpm native:build` | compila |
| `pnpm native:test` | ejecuta CTest |
| `pnpm native:verify` | los tres anteriores en orden |

Equivalentes directos con CMake, por si prefieres no pasar por pnpm:

```bash
# Solo CPU (CUDA se detecta y se omite si no está)
cmake -S native -B native/build -G Ninja -DCMAKE_BUILD_TYPE=RelWithDebInfo
cmake --build native/build
ctest --test-dir native/build --output-on-failure

# Exigir CUDA: la configuración falla si no hay nvcc
cmake -S native -B native/build-cuda -G Ninja -DSIMULAGPU_CUDA=ON
cmake --build native/build-cuda

# Prohibir CUDA aunque haya nvcc
cmake -S native -B native/build-cpu -G Ninja -DSIMULAGPU_CUDA=OFF

# Con sanitizers
cmake -S native -B native/build-asan -G Ninja \
  -DCMAKE_BUILD_TYPE=Debug -DSIMULAGPU_ENABLE_SANITIZERS=ON
```

### Opciones de CMake

| Opción | Por defecto | Qué hace |
| --- | --- | --- |
| `SIMULAGPU_CUDA` | `AUTO` | `AUTO` usa CUDA si la encuentra, `ON` la exige, `OFF` la prohíbe |
| `SIMULAGPU_BUILD_TESTS` | `ON` | construye los ejecutables de CTest |
| `SIMULAGPU_ENABLE_SANITIZERS` | `OFF` | ASan + UBSan (GCC/Clang) |

### Ejecutables

| Ruta | Qué es |
| --- | --- |
| `native/build/examples/vector-add/vector_add_example` | el ejemplo de la lección 01 |
| `native/build/common/test_launch` | pruebas de la aritmética de índices |
| `native/build/common/test_vector_add_cpu` | pruebas del oráculo de CPU |
| `native/build/exercises/01-vector-add/test_exercise01_index_math` | pruebas de la solución de referencia |

## El ejercicio

El punto de partida del ejercicio es un proyecto CMake aparte, para que puedas
romperlo sin afectar al resto:

```bash
cd native/exercises/01-vector-add/starter
cmake -S . -B build -G Ninja
cmake --build build
ctest --test-dir build --output-on-failure   # falla al empezar: es lo esperado
```
