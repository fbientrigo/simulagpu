---
title: Del índice global a la suma de vectores
description: Cómo una GPU reparte un vector entre miles de hilos, por qué hace falta el guard i < n y cómo comprobar que el resultado es correcto.
---

# Del índice global a la suma de vectores

Esta es la primera lección de SimulaGPU. Al terminar vas a poder mirar un kernel
CUDA de suma de vectores, señalar la línea que calcula el índice global y
explicar qué pasaría si faltara la línea siguiente.

**Lo que necesitas antes de empezar:** C o C++ básico (punteros y arreglos). No
necesitas GPU: casi todo lo que vas a practicar se comprueba en CPU.

**Cómo está armada la lección:**

| Pieza | Dónde |
| --- | --- |
| Explicación | esta página |
| Visualización interactiva | [más abajo](#el-explorador-del-indice-global) |
| Código ejecutable | [`native/examples/vector-add/`](https://github.com/fbientrigo/simulagpu/tree/main/native/examples/vector-add) |
| Ejercicio | [Ejercicio 01](./ejercicio-01-suma-de-vectores) |
| Tarjetas de repaso | [Tarjetas Anki](./anki) |

---

## 1. Quién hace qué: CPU y GPU

Un programa CUDA tiene dos mitades que corren en dos máquinas distintas dentro
del mismo computador.

El **host** es la CPU. Se ocupa de la logística: leer los datos, reservar
memoria en la GPU, copiar los datos allí, decidir cuántos hilos lanzar, pedir
el resultado de vuelta y comprobar que sea correcto. El host toma todas las
decisiones.

El **device** es la GPU. Ejecuta un *kernel*: una función que se lanza una vez y
corre en miles de hilos a la vez, todos con el mismo código y cada uno sobre
datos distintos. El device no decide nada; hace exactamente lo que se le pidió,
tantas veces como se le pidió.

Esa asimetría explica la mayor parte de los errores de principiante. La GPU no
va a avisarte de que pediste pocos hilos, ni de que uno de ellos escribió fuera
del arreglo. Eso te toca a ti, en el host.

El cálculo que vamos a usar es el más simple posible:

```c
c[i] = a[i] + b[i]   // para todo i entre 0 y n-1
```

Cada elemento es independiente de los demás. No hay orden que respetar, no hay
resultados compartidos. Es exactamente la forma que a una GPU le sienta bien, y
por eso es el primer ejemplo de todos los cursos de CUDA.

## 2. Grilla, bloque, hilo

Cuando lanzas un kernel, CUDA crea los hilos organizados en dos niveles:

- una **grilla** (*grid*) contiene bloques;
- un **bloque** (*block*) contiene hilos;
- un **hilo** (*thread*) ejecuta el kernel una vez.

En un lanzamiento unidimensional, que es el que usa esta lección:

| Variable | Qué es |
| --- | --- |
| `gridDim.x` | cuántos bloques tiene la grilla |
| `blockIdx.x` | cuál de esos bloques soy yo (0 … `gridDim.x - 1`) |
| `blockDim.x` | cuántos hilos tiene cada bloque |
| `threadIdx.x` | cuál de esos hilos soy yo (0 … `blockDim.x - 1`) |

Los bloques existen porque el hardware ejecuta los hilos en grupos: un bloque se
asigna entero a un multiprocesador y sus hilos pueden coordinarse entre sí.
Nada de eso importa todavía. Por ahora el bloque es simplemente la unidad en la
que CUDA te obliga a agrupar tus hilos.

Tamaños típicos de bloque: 128, 256 o 512. El máximo son 1024 hilos por bloque.

## 3. El índice global

Aquí está el punto central de la lección.

Un hilo que arranca sabe **solo sus coordenadas**: en qué bloque está y qué
posición ocupa dentro de él. No sabe qué elemento del vector le toca. Tiene que
deducirlo:

```c
int i = blockIdx.x * blockDim.x + threadIdx.x;
```

Se lee así: *"delante de mi bloque hay `blockIdx.x` bloques completos, cada uno
de `blockDim.x` elementos; dentro del mío, yo estoy en la posición
`threadIdx.x`"*.

Con `blockDim.x = 32`:

| Bloque | Hilos | Índices globales que cubre |
| --- | --- | --- |
| 0 | 0 … 31 | 0 … 31 |
| 1 | 0 … 31 | 32 … 63 |
| 2 | 0 … 31 | 64 … 95 |
| 3 | 0 … 31 | 96 … 127 |

El hilo 5 del bloque 3 obtiene `i = 3 * 32 + 5 = 101`.

Lo importante no es la fórmula, es la propiedad: **ningún par de hilos obtiene
el mismo `i`, y ningún `i` entre 0 y `gridDim.x * blockDim.x - 1` se queda sin
hilo.** El reparto es una biyección. Por eso no hace falta ningún tipo de
coordinación entre hilos: cada uno tiene su elemento y nadie pisa a nadie.

::: tip Cámbialo y míralo
En el [explorador](#el-explorador-del-indice-global) de más abajo, toca
cualquier hilo de la grilla y mira cómo se sustituyen sus coordenadas en la
fórmula. El recorrido guiado te lo pregunta antes de enseñártelo.
:::

## 4. Por qué hace falta `if (i < n)`

El número de hilos que crea un lanzamiento es `gridDim.x * blockDim.x`. Ese
número es un múltiplo del tamaño de bloque. Tu vector, casi nunca.

Con `n = 100` y `blockDim.x = 32` hacen falta 4 bloques, que son 128 hilos. Los
hilos con `i = 100, 101, … 127` existen y ejecutan el kernel igual que los
demás, pero no les corresponde ningún elemento.

Si el kernel escribe sin preguntar:

```c
__global__ void mal(const float* a, const float* b, float* c, int n) {
    int i = blockIdx.x * blockDim.x + threadIdx.x;
    c[i] = a[i] + b[i];   // 28 hilos escriben más allá del final de c
}
```

Ese es un acceso fuera de rango en memoria de device. Los desenlaces posibles,
de mejor a peor:

1. la GPU lo detecta y el siguiente `cudaGetLastError` devuelve
   `an illegal memory access was encountered`;
2. la escritura cae en memoria reservada por otra parte del programa y corrompe
   datos sin decir nada;
3. el resultado sale bien hoy y mal mañana, con otro tamaño de entrada.

La versión correcta añade una línea:

```c
__global__ void vector_add_kernel(const float* a, const float* b, float* c, int n) {
    const int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i < n) {
        c[i] = a[i] + b[i];
    }
}
```

Los hilos sobrantes entran, evalúan la condición, no hacen nada y terminan.
Cuesta casi nada y es obligatorio.

::: warning El error que más se repite
Probar con `n = 1024` y `blockDim.x = 256`. La división es exacta, no sobra
ningún hilo, y un kernel sin guard pasa la prueba. Prueba siempre con un `n`
que **no** sea múltiplo del tamaño de bloque.
:::

## 5. Cuántos bloques: división redondeada hacia arriba

El host tiene que elegir `gridDim.x` de modo que se cubra todo el vector. La
división entera no sirve:

```c
int blocks = n / block_size;        // MAL: 100 / 32 = 3, o sea 96 hilos
```

Con eso los elementos 96, 97, 98 y 99 nunca se calculan. Y no salta ningún
error: el kernel corre, termina bien, y el resultado está mal en cuatro
posiciones.

Hace falta redondear hacia arriba:

```c
int blocks = n / block_size + (n % block_size != 0 ? 1 : 0);   // 4
```

Vas a ver mucho más a menudo esta otra forma, que es equivalente:

```c
int blocks = (n + block_size - 1) / block_size;                // 4
```

Es más corta y es la que aparece en casi todo el código de CUDA. La única
diferencia es que `n + block_size - 1` puede desbordarse si `n` está cerca del
máximo de su tipo; la primera forma nunca se desborda. SimulaGPU usa la primera
en el código y muestra la segunda en el explorador, para que reconozcas las dos.

Consecuencia directa: **`gridDim.x * blockDim.x >= n` siempre, y la diferencia
es el número de hilos inactivos.** Redondear hacia arriba es lo que crea los
hilos sobrantes; el guard `if (i < n)` es lo que los neutraliza. Las dos cosas
van juntas.

## 6. El explorador del índice global {#el-explorador-del-indice-global}

El explorador abre en **recorrido guiado**: seis pasos cortos con un ejemplo
diminuto, `n = 10` y bloques de 4, que cabe entero en la pantalla de un
teléfono. Cada paso te pregunta antes de responderte, y solo enseña un dato
nuevo cuando ya tiene sentido:

1. cuántos elementos hay y de qué tamaño son los bloques;
2. cuántos bloques hacen falta (`gridDim.x`, redondeando hacia arriba);
3. qué hilo eres — lo eliges tocándolo en la grilla;
4. qué índice global te toca (`i = blockIdx.x * blockDim.x + threadIdx.x`);
5. si pasas el guard `if (i < n)`;
6. qué elemento acabas procesando, o por qué no procesas ninguno.

Mientras tanto, una sola tarjeta resume el hilo actual: `blockIdx.x`,
`threadIdx.x`, `i`, si está activo o descartado, y la operación que ejecuta. Los
valores aparecen con un `?` hasta el paso que los explica, así que la grilla no
te adelanta la respuesta que te acaba de preguntar.

<ExploradorIndiceGlobal />

::: info Qué es y qué no es
El explorador es un **modelo explicativo**: reproduce con aritmética exacta el
reparto de elementos entre hilos. No ejecuta CUDA, no simula el hardware y no
dice nada sobre el orden de ejecución ni sobre el rendimiento.

Su estado se guarda en la URL (`?n=100&bs=32&b=3&t=5`), así que puedes copiar
la dirección y compartir exactamente la configuración que estás viendo. El modo
y el paso en que vas no viajan en la dirección: son cómo estás mirando el
modelo, no qué modelo estás mirando.
:::

Cuando termines el recorrido, el botón te deja en **exploración libre**: los
mismos números sin pasos, con el resumen completo del lanzamiento. Tres cosas
que vale la pena probar ahí:

1. `n = 100`, bloques de 32 → 4 bloques, 128 hilos, 28 inactivos.
2. `n = 128`, bloques de 32 → 4 bloques, 128 hilos, **0** inactivos. Ningún
   borde punteado: éste es el caso que esconde los errores.
3. `n = 1`, bloques de 256 → 1 bloque, 256 hilos, 255 inactivos. Un solo hilo
   trabaja y el resto solo evalúa la condición.

## 7. Memoria del host y memoria del device

La GPU tiene su propia memoria física. Un puntero de `malloc` apunta a memoria
del host y **el kernel no puede dereferenciarlo**. Al revés tampoco: el host no
puede leer directamente un puntero de device.

```c
float* host_a = (float*)malloc(bytes);   // memoria del host
float* device_a = nullptr;
cudaMalloc(&device_a, bytes);            // memoria del device
```

Fíjate en que `cudaMalloc` recibe la **dirección** del puntero (`&device_a`), no
el puntero. Tiene que modificar tu variable, y su valor de retorno ya está
ocupado por el código de error.

## 8. Las dos transferencias

Los datos viajan explícitamente en las dos direcciones:

```c
// host → device: subir las entradas antes de lanzar
cudaMemcpy(device_a, host_a, bytes, cudaMemcpyHostToDevice);
cudaMemcpy(device_b, host_b, bytes, cudaMemcpyHostToDevice);

// ... lanzamiento del kernel ...

// device → host: bajar el resultado, o no sirve de nada
cudaMemcpy(host_c, device_c, bytes, cudaMemcpyDeviceToHost);
```

El orden de los argumentos es `(destino, origen, bytes, dirección)`, igual que
`memcpy`. La dirección debe coincidir con los punteros; equivocarse ahí es un
error frecuente y el mensaje que produce no siempre es obvio.

Un síntoma clásico: el kernel corre sin errores y el resultado en el host sigue
lleno de ceros. Falta la copia de vuelta.

## 9. El lanzamiento

```c
const int block_size = 256;
const int blocks = n / block_size + (n % block_size != 0 ? 1 : 0);

vector_add_kernel<<<blocks, block_size>>>(device_a, device_b, device_c, n);
```

La sintaxis `<<<A, B>>>` es una extensión de CUDA al lenguaje: `A` es la
dimensión de la grilla y `B` la del bloque. Se crean `A * B` hilos.

Dos cosas que sorprenden la primera vez:

- **Los punteros que se pasan son los de device.** El kernel corre en la GPU;
  los punteros del host no significan nada allí.
- **El lanzamiento es asíncrono.** La llamada vuelve enseguida, normalmente
  antes de que el kernel haya empezado siquiera. Eso tiene consecuencias
  directas sobre los errores y sobre la medición de tiempos.

## 10. Sincronización y errores de CUDA

Como el lanzamiento es asíncrono, un kernel falla **después** de que la llamada
haya vuelto. Por eso hay que preguntar dos veces:

```c
vector_add_kernel<<<blocks, block_size>>>(device_a, device_b, device_c, n);

// 1. errores de configuración del lanzamiento (bloque demasiado grande, etc.)
cudaError_t err = cudaGetLastError();
if (err != cudaSuccess) { /* informar y abortar */ }

// 2. errores ocurridos durante la ejecución (acceso ilegal, etc.)
err = cudaDeviceSynchronize();
if (err != cudaSuccess) { /* informar y abortar */ }
```

Comprobar solo una de las dos deja pasar la mitad de los fallos.

En SimulaGPU esto está encapsulado en dos macros, en
[`native/common/include/simulagpu/cuda_check.cuh`](https://github.com/fbientrigo/simulagpu/blob/main/native/common/include/simulagpu/cuda_check.cuh):

```c
SIMULAGPU_CUDA_CHECK(cudaMalloc(&device_a, bytes));   // envuelve una llamada
SIMULAGPU_CUDA_CHECK_KERNEL();                        // hace las dos preguntas
```

Cuando algo falla, imprimen archivo, línea, la llamada exacta y el mensaje de
CUDA, y **detienen el programa**. Seguir adelante después de un `cudaMalloc`
fallido solo produce una cascada de errores posteriores que tapan la causa
real.

## 11. Comprobar el resultado contra la CPU

Que un kernel no dé error no significa que calcule bien. Un kernel que no hace
nada tampoco da error.

La única prueba es comparar contra una implementación secuencial obviamente
correcta — el **oráculo**:

```cpp
void vector_add(const float* a, const float* b, float* c, int n) {
  for (int i = 0; i < n; ++i) {
    c[i] = a[i] + b[i];
  }
}
```

Se compara elemento por elemento. Para la suma de vectores la tolerancia
correcta es **cero**: `a + b` es una sola operación IEEE-754 con resultado
redondeado correctamente, así que la CPU y la GPU tienen que dar exactamente lo
mismo. Cualquier diferencia es un error, no redondeo.

(Eso deja de ser cierto en cuanto sumas muchos números en distinto orden, que es
lo que pasa en una reducción. Ahí sí hará falta tolerancia — pero eso es otra
lección.)

Cuidado con NaN: `nan > tolerancia` es `false`, así que una comparación ingenua
da por bueno un resultado corrupto. Hay que preguntar por NaN aparte.

En SimulaGPU el oráculo y las comparaciones viven en
[`native/common/`](https://github.com/fbientrigo/simulagpu/tree/main/native/common),
y **se prueban con `ctest` sin GPU**.

## 12. Medir: kernel contra extremo a extremo

Un cronómetro del host alrededor del lanzamiento no mide el kernel: mide lo que
tarda en encolarse. Para medir el kernel hay que usar eventos CUDA, que se
graban en el stream:

```c
cudaEventRecord(inicio);
vector_add_kernel<<<blocks, block_size>>>(...);
cudaEventRecord(fin);
cudaEventSynchronize(fin);
cudaEventElapsedTime(&ms, inicio, fin);
```

Pero el tiempo de kernel no es lo que cuesta usar la GPU. El coste real incluye
`cudaMalloc`, la subida de `a` y `b`, la bajada de `c` y `cudaFree`.

Para la suma de vectores esa diferencia es enorme, y por una razón estructural:
por cada elemento se transfieren 12 bytes (dos entradas y una salida) para
hacer **una sola suma**. La operación está limitada por el ancho de banda del
bus, no por la capacidad de cálculo. Informar solo el tiempo de kernel de una
suma de vectores es la forma más común de exagerar una aceleración.

El ejemplo de esta lección mide las dos cosas por separado y las imprime en
columnas distintas, precisamente para que la diferencia se vea:

```
         n  gridDim  inactivos     cpu (ms)  kernel (ms)   total (ms)   estado
         1        1        255        0.000        0.000        0.000      cpu
       100        1        156        0.000        0.000        0.000      cpu
       256        1          0        0.000        0.000        0.000      cpu
       257        2        255        0.000        0.000        0.000      cpu
      1000        4         24        0.000        0.000        0.000      cpu
   4194304    16384          0        5.854        0.000        0.000      cpu
```

(Salida real de la configuración solo-CPU: las columnas de GPU están en cero
porque no se ejecutó ningún kernel.)

::: warning
SimulaGPU no publica números de rendimiento. La v0.1 se escribió en una máquina
sin GPU ni `nvcc`, así que las columnas `kernel` y `total` solo se llenan si tú
compilas con CUDA y ejecutas en tu propio hardware. Las cifras dependen tanto de
la GPU, del bus y del tamaño del problema que una tabla publicada no te diría
nada útil.
:::

## 13. Cuando `n` no es múltiplo del tamaño de bloque

Es el caso normal, y conviene tenerlo interiorizado. Con `blockDim.x = 256`:

| `n` | `gridDim.x` | Hilos creados | Inactivos | Qué enseña |
| --- | --- | --- | --- | --- |
| 1 | 1 | 256 | 255 | un bloque casi entero sin trabajo |
| 100 | 1 | 256 | 156 | `n` menor que un bloque |
| 256 | 1 | 256 | 0 | división exacta: el caso engañoso |
| 257 | 2 | 512 | 255 | un elemento fuerza un bloque entero |
| 1000 | 4 | 1024 | 24 | el caso realista |
| 4 194 304 | 16 384 | 4 194 304 | 0 | entrada grande, división exacta |

Esos son exactamente los tamaños que ejecuta
[`native/examples/vector-add/main.cpp`](https://github.com/fbientrigo/simulagpu/blob/main/native/examples/vector-add/main.cpp),
y los que cubren las pruebas de
[`native/common/tests/`](https://github.com/fbientrigo/simulagpu/tree/main/native/common/tests).

## Ejecutar el ejemplo

Sin GPU (construye y prueba toda la parte de CPU):

```bash
cmake -S native -B native/build -G Ninja -DCMAKE_BUILD_TYPE=RelWithDebInfo
cmake --build native/build
ctest --test-dir native/build --output-on-failure
./native/build/examples/vector-add/vector_add_example
```

Con GPU NVIDIA y `nvcc` instalados, CUDA se detecta sola. Para exigirla y que
la configuración falle si no está:

```bash
cmake -S native -B native/build-cuda -G Ninja -DSIMULAGPU_CUDA=ON
cmake --build native/build-cuda
./native/build-cuda/examples/vector-add/vector_add_example
```

## Resumen

- El host decide cuántos hilos hay; el device solo obedece.
- Cada hilo deduce su elemento: `i = blockIdx.x * blockDim.x + threadIdx.x`.
- `gridDim.x` se calcula redondeando hacia arriba, lo que crea hilos de más.
- `if (i < n)` es lo que impide que esos hilos escriban fuera del arreglo.
- Host y device tienen memorias separadas; las transferencias son explícitas y
  en las dos direcciones.
- Un kernel que no da error puede estar calculando mal. Compara siempre contra
  un oráculo de CPU.
- El tiempo de kernel y el tiempo real de usar la GPU son cosas distintas.

## Sigue

1. Haz el **[Ejercicio 01](./ejercicio-01-suma-de-vectores)**. Los cuatro
   primeros TODO se verifican sin GPU.
2. Descarga las **[tarjetas Anki](./anki)** y repásalas unos días.

Esta lección se apoya en el material del curso GPU Programming de la CERN STEAM
Academy 2026; la atribución completa está en
[Fuentes y atribución](../referencia/fuentes).
