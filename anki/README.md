# Tarjetas Anki

Las tarjetas se escriben en YAML (`cards/`) y se convierten en un TSV
importable con:

```bash
pnpm anki:build
```

El resultado se escribe en `apps/docs/public/descargas/simulagpu-anki.tsv` y el
sitio de documentación lo publica como descarga. **El TSV no se versiona**: es
un archivo generado, y se reconstruye en cada build y en CI.

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
  estudiante pegado a la tarjeta, y también la clave de ordenación del TSV. No
  se reutiliza ni se renumera: si una tarjeta ya no sirve, se borra y su id se
  retira.
- Lo que va entre acentos graves se convierte en `<code>` y se escapa, así que
  `kernel<<<A, B>>>()` llega entero a Anki.
- Los saltos de línea se convierten en `<br>`.
- Las etiquetas van en minúscula, sin espacios ni acentos.
- El `id` se añade automáticamente como etiqueta.

## Reproducibilidad

La salida es determinista: las tarjetas se ordenan por `id`, no hay marcas de
tiempo y los saltos de línea son LF. Dos ejecuciones producen bytes idénticos,
y `tests/anki-build.test.ts` lo comprueba.

Para verificar que el TSV publicado está al día sin reescribirlo:

```bash
node anki/scripts/build-anki.mjs --check
```

## APKG

La generación de `.apkg` está aplazada (ver [`../docs/roadmap.md`](../docs/roadmap.md)).
El TSV cubre el caso de uso completo sin añadir dependencias ni binarios al
repositorio.
