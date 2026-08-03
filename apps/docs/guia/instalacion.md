---
title: Instalación
description: Qué necesitas para trabajar con SimulaGPU, con y sin GPU.
---

# Instalación

SimulaGPU tiene dos mitades independientes. Puedes usar cualquiera de las dos
por separado.

| Quiero… | Necesito |
| --- | --- |
| leer las lecciones y usar el explorador | un navegador |
| compilar y probar el código de C++ | CMake, Ninja y un compilador de C++17 |
| ejecutar los kernels CUDA | además, una GPU NVIDIA y el CUDA Toolkit |
| trabajar sobre el sitio de documentación | Node 20+ y pnpm |

## Solo el código nativo (lo más habitual)

Esto es lo único que hace falta para hacer el
[Ejercicio 01](../leccion/ejercicio-01-suma-de-vectores) completo salvo la parte
de GPU.

### Requisitos

- CMake 3.20 o superior
- Ninja
- GCC 9+, Clang 10+ o MSVC 2019+

::: code-group
```bash [Debian / Ubuntu]
sudo apt-get install -y build-essential cmake ninja-build
```

```bash [Fedora / RHEL]
sudo dnf install -y gcc-c++ cmake ninja-build
```

```bash [macOS]
xcode-select --install
brew install cmake ninja
```
:::

### Construir y probar

```bash
git clone https://github.com/fbientrigo/simulagpu.git
cd simulagpu

cmake -S native -B native/build -G Ninja -DCMAKE_BUILD_TYPE=RelWithDebInfo
cmake --build native/build
ctest --test-dir native/build --output-on-failure
```

No hay dependencias que descargar: la configuración no necesita red.

Si todo va bien, la configuración imprime:

```
-- CUDA: not found, building the CPU-only configuration
```

Eso no es un problema. Es la configuración solo-CPU, y es completa.

## Con GPU NVIDIA

Instala el [CUDA Toolkit](https://developer.nvidia.com/cuda-downloads) y
comprueba que `nvcc` está en el `PATH`:

```bash
nvcc --version
```

Después, CUDA se detecta sola:

```bash
cmake -S native -B native/build-cuda -G Ninja -DCMAKE_BUILD_TYPE=RelWithDebInfo
cmake --build native/build-cuda
./native/build-cuda/examples/vector-add/vector_add_example
```

Para **exigir** CUDA y que la configuración falle si no está — útil en un script
donde el silencio saldría caro:

```bash
cmake -S native -B native/build-cuda -G Ninja -DSIMULAGPU_CUDA=ON
```

Para forzar la construcción solo-CPU aunque haya `nvcc`:

```bash
cmake -S native -B native/build-cpu -G Ninja -DSIMULAGPU_CUDA=OFF
```

### Sanitizers

Para cazar accesos fuera de rango en la parte de CPU:

```bash
cmake -S native -B native/build-asan -G Ninja \
  -DCMAKE_BUILD_TYPE=Debug -DSIMULAGPU_ENABLE_SANITIZERS=ON
cmake --build native/build-asan
ctest --test-dir native/build-asan --output-on-failure
```

## El sitio de documentación

Solo si vas a modificar las lecciones o las visualizaciones.

### Requisitos

- Node.js 20.19 o superior
- pnpm 10 (`corepack enable && corepack prepare pnpm@10 --activate`)

### Levantarlo

```bash
pnpm install
pnpm dev
```

El sitio queda en `http://localhost:5173`. `pnpm dev` genera antes el TSV de
Anki, así que el enlace de descarga funciona en local.

La lista completa de comandos está en [Comandos](./comandos).
