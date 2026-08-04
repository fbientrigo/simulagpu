---
title: De una suma secuencial a una reducción paralela
description: Clase 02 de SimulaGPU: carreras de datos, reducción en árbol, tamaños impares, sincronización, memoria compartida y punto flotante.
---

# De una suma secuencial a una reducción paralela

Esta es la segunda clase de SimulaGPU. En la primera, cada hilo escribía un elemento distinto. Ahora todos los datos deben contribuir a **un solo resultado**:

```cpp
float suma = x[0] + x[1] + ... + x[n - 1];
```

Ese cambio parece pequeño, pero introduce casi todos los problemas centrales de la programación paralela: trabajo compartido, carreras de datos, sincronización, reducción de resultados parciales y diferencias de punto flotante.

Al terminar podrás:

- explicar por qué `sum += input[i]` no se vuelve correcto por ejecutarlo con muchos hilos;
- transformar una suma en una reducción por pares;
- escribir una pasada que funcione con tamaños pares, impares y unitarios;
- distinguir una barrera de sincronización de una operación atómica;
- explicar para qué sirve la memoria compartida en una reducción por bloque;
- comprobar el resultado contra un oráculo CPU con una tolerancia justificada.

**Requisito:** haber completado [Clase 01 — Índice global y suma de vectores](./indice-global-suma-vectores).

| Pieza | Dónde |
| --- | --- |
| Explicación | esta página |
| Laboratorio interactivo | [más abajo](#laboratorio-interactivo) |
| Código ejecutable | [`native/examples/reduction/`](https://github.com/fbientrigo/simulagpu/tree/main/native/examples/reduction) |
| Ejercicio nativo | [Ejercicio 02](./ejercicio-02-reduccion) |
| Tarjetas de repaso | [Tarjetas Anki](./anki) |

---

## 1. El primer intento produce una carrera

Una versión secuencial correcta es directa:

```cpp
float sum = 0.0f;
for (int i = 0; i < n; ++i) {
  sum += input[i];
}
```

El intento ingenuo en CUDA suele conservar la misma idea:

```cpp
__global__ void suma_incorrecta(const float* input, float* sum, int n) {
  const int i = blockIdx.x * blockDim.x + threadIdx.x;
  if (i < n) {
    *sum += input[i];
  }
}
```

Todos los hilos actualizan la misma dirección. La expresión `*sum += input[i]` no es una acción indivisible: primero lee `*sum`, luego calcula y finalmente escribe. Dos hilos pueden leer el mismo valor anterior y uno de los incrementos se pierde.

Ejemplo:

```text
sum empieza en 10
hilo A lee 10 y calcula 10 + 3 = 13
hilo B lee 10 y calcula 10 + 7 = 17
A escribe 13
B escribe 17
resultado: 17, pero debería ser 20
```

Eso es una **carrera de datos**: el resultado depende del orden temporal de operaciones concurrentes que no están coordinadas.

::: warning Un error que puede parecer correcto
Probar el kernel una sola vez no demuestra nada. Una carrera puede producir el resultado esperado por accidente, cambiar entre ejecuciones o aparecer solo con entradas grandes.
:::

## 2. ¿Por qué no usar `atomicAdd` para todo?

Una operación atómica hace indivisible la actualización:

```cpp
atomicAdd(sum, input[i]);
```

Eso corrige la carrera, pero obliga a miles de hilos a competir por una sola dirección. La operación queda serializada alrededor de ese punto caliente.

Los atómicos son útiles cuando:

- hay pocas colisiones;
- el cálculo por hilo es mucho más costoso que la actualización;
- se acumulan pocos resultados parciales, no millones de elementos individuales.

Para una suma masiva, la estrategia habitual es reducir primero localmente y usar muy pocas actualizaciones globales al final.

## 3. La idea central: reducir por pares

En lugar de que todos escriban el mismo acumulador, cada hilo produce una salida independiente:

```text
entrada: [3, 1, 7, 0, 4, 1, 6, 3]
           \ /   \ /   \ /   \ /
pasada 1:  [4,    7,    5,    9]
             \    /      \    /
pasada 2:    [11,         14]
                \         /
pasada 3:       [25]
```

Cada pasada reduce aproximadamente a la mitad el número de valores. Con `n` elementos hacen falta `ceil(log2(n))` niveles si se conserva una estructura binaria.

La primera pasada asigna un par a cada hilo:

```cpp
__global__ void reduce_pass(const float* input, float* output, int n) {
  const int out = blockIdx.x * blockDim.x + threadIdx.x;
  const int left = 2 * out;

  if (left < n) {
    const float right = left + 1 < n ? input[left + 1] : 0.0f;
    output[out] = input[left] + right;
  }
}
```

Tres líneas contienen la mayor parte de la lección:

1. `left = 2 * out`: los pares son disjuntos: `(0,1)`, `(2,3)`, `(4,5)`…;
2. `left + 1 < n ? ... : 0`: un elemento sin pareja no se pierde;
3. `output[out]`: la salida es compacta, sin huecos.

## 4. El tamaño de la siguiente pasada

Una pasada sobre `n` valores produce:

```cpp
next_n = n / 2 + (n % 2 != 0 ? 1 : 0);
```

Es decir, `ceil(n / 2)`.

El host debe repetir el proceso y recalcular la grilla en cada paso:

```cpp
int current_n = n;
while (current_n > 1) {
  const int next_n = current_n / 2 + (current_n % 2 != 0 ? 1 : 0);
  const int blocks = next_n / block_size + (next_n % block_size != 0 ? 1 : 0);

  reduce_pass<<<blocks, block_size>>>(input, output, current_n);
  // comprobar lanzamiento y ejecución
  std::swap(input, output);
  current_n = next_n;
}
```

No se puede conservar la grilla inicial: el trabajo cae a la mitad en cada iteración.

## 5. El caso impar no es un detalle

Con siete valores:

```text
[5, 1, 4, 2, 8, 3, 6]
```

los primeros seis forman tres pares. El `6` final debe sobrevivir:

```text
[5+1, 4+2, 8+3, 6+0] = [6, 6, 11, 6]
```

Duplicarlo (`6 + 6`) cambia la suma. Descartarlo pierde información. Leer `input[left + 1]` sin guard accede fuera del arreglo.

Por eso las pruebas mínimas deben incluir:

- `n = 1`;
- un tamaño par;
- un tamaño impar;
- un tamaño justo por encima de un bloque;
- una entrada grande que no sea potencia de dos.

## 6. Barrera, atómico y lanzamiento nuevo no son lo mismo

### `__syncthreads()`

Es una barrera **dentro de un bloque**. Ningún hilo del bloque puede pasar hasta que todos los hilos activos del bloque hayan llegado.

Sirve cuando una etapa escribe valores en memoria compartida y la siguiente etapa debe leerlos:

```cpp
shared[tid] = value;
__syncthreads();

if (tid < stride) {
  shared[tid] += shared[tid + stride];
}
__syncthreads();
```

No sincroniza bloques distintos.

### `atomicAdd`

Protege una actualización concreta de memoria. No obliga a todos los hilos a llegar al mismo punto ni hace visible una fase completa por sí sola.

### Un nuevo lanzamiento

El final de un kernel separa globalmente una pasada de la siguiente cuando el host respeta el orden de ejecución y comprueba los errores. Por eso la versión introductoria usa un lanzamiento por pasada: es más fácil razonar sobre su corrección.

## 7. Memoria compartida: reducir dentro del bloque

La versión anterior lee y escribe memoria global en cada nivel. Una mejora habitual es:

1. cada bloque carga una porción de la entrada a memoria compartida;
2. sus hilos reducen esa porción en árbol, con barreras entre niveles;
3. el bloque escribe un solo parcial en memoria global;
4. una etapa posterior reduce los parciales.

La memoria compartida es pequeña, está situada cerca de los núcleos del multiprocesador y puede ser usada por todos los hilos del bloque. Su ventaja no es que sea “mágicamente rápida”, sino que permite reutilizar datos sin volver a memoria global en cada nivel.

Un esquema clásico es:

```cpp
extern __shared__ float shared[];
const int tid = threadIdx.x;
const int global = blockIdx.x * blockDim.x + tid;

shared[tid] = global < n ? input[global] : 0.0f;
__syncthreads();

for (int stride = blockDim.x / 2; stride > 0; stride /= 2) {
  if (tid < stride) {
    shared[tid] += shared[tid + stride];
  }
  __syncthreads();
}

if (tid == 0) {
  partials[blockIdx.x] = shared[0];
}
```

Esta forma exige bloques con tamaño potencia de dos o lógica adicional para otros tamaños. También exige que **todos** los hilos del bloque alcancen cada barrera; poner `__syncthreads()` dentro de una rama que no toman todos puede bloquear el kernel.

## 8. Punto flotante: el orden cambia el resultado

La suma de números reales es asociativa:

```text
(a + b) + c = a + (b + c)
```

La suma de `float` no siempre lo es porque cada operación redondea. Una reducción en árbol cambia el orden respecto de un bucle secuencial:

```text
secuencial: (((a + b) + c) + d)
árbol:      (a + b) + (c + d)
```

Por eso no debes exigir igualdad bit a bit para una reducción general. La validación necesita:

- una referencia CPU más estable, por ejemplo suma de Kahan o acumulación en `double`;
- tolerancia absoluta y relativa justificadas por magnitud y tamaño;
- pruebas explícitas con cancelación y valores muy distintos;
- rechazo explícito de `NaN` e infinito inesperado.

No basta con usar una tolerancia enorme: eso solo oculta errores de índices.

## 9. Laboratorio interactivo {#laboratorio-interactivo}

Primero cambia la entrada y recorre las pasadas del árbol. Luego rompe deliberadamente la asignación de pares o descarta la cola impar y observa dónde deja de conservarse la suma.

En la segunda mitad hay un editor guiado. Los tres `select` modifican líneas reales del kernel. **Ejecutar pruebas** evalúa el comportamiento equivalente en CPU para tamaños par, impar y unitario.

<LaboratorioReduccion />

::: info Qué ejecuta el navegador
El laboratorio no contiene `nvcc` ni acceso a una GPU. Ejecuta un modelo aritmético determinista y un conjunto de pruebas CPU. La ejecución CUDA real está en el árbol `native/` y requiere CUDA Toolkit más una GPU NVIDIA.
:::

## 10. Ejecutar el ejemplo nativo

Configuración solo CPU:

```bash
cmake -S native -B native/build -G Ninja -DSIMULAGPU_CUDA=OFF
cmake --build native/build
ctest --test-dir native/build --output-on-failure
./native/build/examples/reduction/reduction_example
```

Con CUDA disponible:

```bash
cmake -S native -B native/build-cuda -G Ninja -DSIMULAGPU_CUDA=ON
cmake --build native/build-cuda
./native/build-cuda/examples/reduction/reduction_example
```

La parte CPU siempre se compila. La unidad CUDA solo se añade si CMake encontró `nvcc`; el repositorio no afirma que ese código haya sido compilado o ejecutado en CI.

## 11. Criterio de dominio

Has terminado esta clase cuando puedes responder sin memorizar código:

1. ¿qué dirección escribiría cada hilo en una pasada?;
2. ¿qué sucede con el último valor cuando `n` es impar?;
3. ¿por qué una barrera dentro del bloque no sincroniza toda la grilla?;
4. ¿por qué `atomicAdd` puede ser correcto y aun así ser una mala reducción?;
5. ¿por qué el resultado GPU puede diferir algunos bits del bucle CPU?;
6. ¿qué prueba concreta detectaría cada fallo?

Continúa con el [Ejercicio 02 — Implementar una pasada de reducción](./ejercicio-02-reduccion).
