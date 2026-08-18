---
title: De una suma secuencial a una reducción paralela
description: 'Clase 02 de SimulaGPU: carreras de datos, reducción en árbol, tamaños impares, verificación y punto flotante.'
---

# De una suma secuencial a una reducción paralela

Esta es la segunda clase de SimulaGPU. En la primera, cada hilo escribía un elemento distinto. Ahora todos los datos deben contribuir a **un solo resultado**:

```cpp
float suma = x[0] + x[1] + ... + x[n - 1];
```

Ese cambio introduce una pregunta nueva: **¿cómo transformamos muchos valores en uno sin hacer que todos los hilos compitan por la misma escritura?**

Al terminar podrás:

- explicar por qué `sum += input[i]` no se vuelve correcto por ejecutarlo con muchos hilos;
- transformar una suma en una reducción por pares;
- seguir el origen de cada valor intermedio a través del árbol;
- escribir una pasada que funcione con tamaños pares, impares y unitarios;
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

La solución de esta clase no consiste en proteger ese único acumulador. Cambiaremos la forma del algoritmo para que, en cada pasada, cada hilo escriba una salida distinta. Más adelante estudiaremos herramientas específicas para coordinar hilos o resolver escrituras concurrentes cuando un algoritmo realmente las necesite.

## 2. La idea central: reducir por pares

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
3. `output[out]`: la salida es compacta, sin huecos y cada hilo escribe una posición distinta.

La propiedad importante es fácil de comprobar: **cada salida de una pasada depende solo de su par de entrada**. Eso permite seguir el árbol completo sin depender de un orden arbitrario entre hilos.

## 3. El tamaño de la siguiente pasada

Una pasada sobre `n` valores produce:

```cpp
next_n = n / 2 + (n % 2 != 0 ? 1 : 0);
```

Es decir, `ceil(n / 2)`.

El host repite el proceso y recalcula la grilla en cada paso:

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

No se puede conservar la grilla inicial: el trabajo cae aproximadamente a la mitad en cada iteración.

En esta versión introductoria, **cada pasada es un lanzamiento separado** y consume un buffer para producir el siguiente. Así podemos razonar sobre una transformación completa a la vez sin introducir todavía cooperación entre hilos dentro de un mismo kernel.

## 4. El caso impar no es un detalle

Con siete valores:

```text
[5, 1, 4, 2, 8, 3, 6]
```

los primeros seis forman tres pares. El `6` final debe sobrevivir:

```text
[5+1, 4+2, 8+3, 6+0] = [6, 6, 11, 6]
```

Duplicarlo (`6 + 6`) cambia la suma. Descartarlo pierde información. Leer `input[left + 1]` sin guarda accede fuera del arreglo.

Por eso las pruebas mínimas deben incluir:

- `n = 1`;
- un tamaño par;
- un tamaño impar;
- un tamaño justo por encima de un bloque;
- una entrada grande que no sea potencia de dos.

## 5. De una pasada a un árbol completo

El árbol no necesita una operación nueva en cada nivel. Repite la misma regla sobre una entrada cada vez más pequeña:

```text
8 valores → 4 → 2 → 1
7 valores → 4 → 2 → 1
1 valor   → 1
```

Para verificar una ejecución completa, pregunta en cada nivel:

1. ¿qué índices consume cada salida?;
2. ¿qué valor produce?;
3. ¿qué pasa con la cola impar?;
4. ¿cuántas salidas tendrá la siguiente pasada?

Si puedes responder esas cuatro preguntas, puedes reconstruir el resultado final sin depender de la animación.

## 6. Punto flotante: el orden cambia el resultado

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

- una referencia CPU más estable, por ejemplo acumulación en `double`;
- tolerancia absoluta y relativa justificadas por magnitud y tamaño;
- pruebas explícitas con cancelación y valores muy distintos;
- rechazo explícito de `NaN` e infinito inesperado.

No basta con usar una tolerancia enorme: eso solo oculta errores de índices.

## 7. Laboratorio interactivo {#laboratorio-interactivo}

Primero cambia la entrada y recorre las pasadas del árbol. Luego rompe deliberadamente la asignación de pares o descarta la cola impar y observa dónde deja de conservarse la suma.

En la segunda mitad hay un editor guiado. Los tres `select` modifican líneas reales del kernel. **Ejecutar pruebas** evalúa el comportamiento equivalente en CPU para tamaños par, impar y unitario.

<LaboratorioReduccion />

::: info Qué ejecuta el navegador
El laboratorio no contiene `nvcc` ni acceso a una GPU. Ejecuta un modelo aritmético determinista y un conjunto de pruebas CPU. La ejecución CUDA real está en el árbol `native/` y requiere CUDA Toolkit más una GPU NVIDIA.
:::

## 8. Ejecutar el ejemplo nativo

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

## 9. Criterio de dominio

Has terminado esta clase cuando puedes responder sin memorizar código:

1. ¿por qué un único acumulador compartido produce una carrera?;
2. ¿qué entradas procesa cada hilo en una pasada?;
3. ¿de dónde proviene cada valor intermedio del árbol?;
4. ¿qué sucede con el último valor cuando `n` es impar?;
5. ¿por qué hay que reducir también el tamaño de la siguiente grilla?;
6. ¿por qué el resultado GPU puede diferir algunos bits del bucle CPU?;
7. ¿qué prueba concreta detectaría cada fallo de índices o frontera?

::: tip Lo que ya puedes hacer
Ya puedes seguir cómo muchos valores se transforman en uno mediante etapas y verificar que cada etapa conserva la suma esperada.
:::

### La siguiente pregunta

Hasta ahora cada pasada vive en un lanzamiento separado. Pero muchos algoritmos necesitan que **varios hilos de un mismo bloque completen una fase antes de que alguno empiece una fase dependiente**.

¿Cómo expresamos esa frontera de cooperación sin asumir que los hilos llegan al mismo tiempo?

Esa es la pregunta de la siguiente primitiva.

Continúa con el [Ejercicio 02 — Implementar una pasada de reducción](./ejercicio-02-reduccion).
