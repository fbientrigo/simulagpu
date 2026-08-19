# Tarjetas Anki

Las tarjetas se escriben una sola vez en YAML (`cards/`). El mismo build genera
dos formatos desde esa fuente canónica:

```bash
pnpm anki:build
```

- `apps/docs/public/descargas/simulagpu-anki.tsv`: exportación opcional para
  importar en Anki.
- `apps/docs/public/data/simulagpu-anki.json`: transporte generado para el
  repaso interactivo dentro del sitio.

Ninguno se versiona: son artefactos generados y se reconstruyen en cada build y
en CI. El JSON web no es un segundo mazo editable; existe precisamente para que
la experiencia del navegador y la exportación de Anki compartan la misma verdad.

## Repasar sin descargar

La página [Tarjetas Anki](../apps/docs/leccion/anki.md) carga el JSON generado y
permite revelar y calificar las tarjetas directamente en el navegador. No se
necesita instalar ni descargar Anki para usar ese modo.

La exportación TSV se mantiene para quienes quieran conservar su flujo de
spaced repetition en Anki.

## Importar en Anki

1. Ejecuta `pnpm anki:build`, o descarga el TSV desde la página
   [Tarjetas Anki](../apps/docs/leccion/anki.md) del sitio.
2. En Anki: *Archivo → Importar…* y elige el `.tsv`.
3. Las cabeceras `#deck`, `#notetype`, `#columns` y `#tags column:3` ya vienen
   dentro del archivo, así que Anki configura la importación solo. Deja
   marcado *Permitir HTML en los campos*.
4. El mazo se llama `SimulaGPU::01 Índice global`.

## Escribir tarjetas

El formato está descrito en [`schema/card.schema.json`](schema/card.schema.json)
y lo valida `scripts/build-anki.mjs`, que falla con un mensaje concreto si algo
no cuadra.

```yaml
- id: idx-011
  tipo: calculo
  anverso: '`blockIdx.x = 3`, `blockDim.x = 32`, `threadIdx.x = 5`. ¿Cuánto vale `i`?'
  reverso: '`i = 3 * 32 + 5 = 101`'
  etiquetas: [indice, calculo]
```

Reglas que importan:

- **`id` es permanente.** Es lo que mantiene el historial de repaso del
  estudiante pegado a la tarjeta, y también la clave de ordenación de los
  formatos generados. No se reutiliza ni se renumera: si una tarjeta ya no
  sirve, se borra y su id se retira.
- Lo que va entre acentos graves se convierte en `<code>` y se escapa, así que
  `kernel<<<A, B>>>()` llega entero a Anki y al reviewer web.
- Los saltos de línea se convierten en `<br>`.
- Las etiquetas van en minúscula, sin espacios ni acentos.
- El `id` se añade automáticamente como etiqueta.

## Reproducibilidad

Las salidas son deterministas: las tarjetas se ordenan por `id`, no hay marcas
de tiempo y los saltos de línea son LF. Dos ejecuciones producen bytes
idénticos, y `tests/anki-build.test.ts` lo comprueba.

Para verificar que ambos artefactos publicados están al día sin reescribirlos:

```bash
node anki/scripts/build-anki.mjs --check
```

## APKG

La generación de `.apkg` está aplazada (ver [`../docs/roadmap.md`](../docs/roadmap.md)).
El TSV cubre el caso de importación sin añadir dependencias ni binarios al
repositorio.
