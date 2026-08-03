#!/usr/bin/env node
/**
 * Build the importable Anki TSV from the YAML sources in anki/cards/.
 *
 *   node anki/scripts/build-anki.mjs            # write the TSV
 *   node anki/scripts/build-anki.mjs --check    # fail if the TSV is stale
 *
 * Determinism is the point: the same sources must always produce byte-identical
 * output, so the file can be regenerated in CI and compared. That means no
 * timestamps, no filesystem ordering, and an explicit sort by card id.
 *
 * Validation is hand-written against anki/schema/card.schema.json rather than
 * done with a JSON-Schema library. The schema is small, it changes with the
 * script, and adding a validator dependency for one call site is not worth it.
 */

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

import yaml from 'js-yaml';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');
const CARDS_DIR = join(REPO_ROOT, 'anki', 'cards');
const OUTPUT_PATH = join(REPO_ROOT, 'apps', 'docs', 'public', 'descargas', 'simulagpu-anki.tsv');

const NOTETYPES = ['Basic'];
const TIPOS = ['conceptual', 'calculo', 'frontera', 'lanzamiento', 'memoria', 'medicion', 'errores'];
const ID_PATTERN = /^[a-z0-9]+-\d{3}$/;
const TAG_PATTERN = /^[a-z0-9-]+$/;

class ValidationError extends Error {}

function fail(where, message) {
  throw new ValidationError(`${where}: ${message}`);
}

function validateDeck(deck, file) {
  if (typeof deck !== 'object' || deck === null || Array.isArray(deck)) {
    fail(file, 'the top level must be a mapping');
  }
  for (const key of ['deck', 'notetype', 'leccion', 'cards']) {
    if (!(key in deck)) fail(file, `missing required key "${key}"`);
  }
  for (const key of Object.keys(deck)) {
    if (!['deck', 'notetype', 'leccion', 'cards'].includes(key)) {
      fail(file, `unknown key "${key}"`);
    }
  }
  if (typeof deck.deck !== 'string' || deck.deck.length === 0)
    fail(file, '"deck" must be a non-empty string');
  if (!NOTETYPES.includes(deck.notetype)) {
    fail(file, `"notetype" must be one of ${NOTETYPES.join(', ')}`);
  }
  if (typeof deck.leccion !== 'string' || !deck.leccion.startsWith('/')) {
    fail(file, '"leccion" must be a site-relative path starting with "/"');
  }
  if (!Array.isArray(deck.cards) || deck.cards.length === 0) fail(file, '"cards" must be a non-empty list');
}

function validateCard(card, file, index) {
  const where = `${file} card #${index + 1}`;
  if (typeof card !== 'object' || card === null || Array.isArray(card)) fail(where, 'must be a mapping');

  const allowed = ['id', 'tipo', 'anverso', 'reverso', 'etiquetas'];
  for (const key of allowed) {
    if (!(key in card)) fail(where, `missing required key "${key}"`);
  }
  for (const key of Object.keys(card)) {
    if (!allowed.includes(key)) fail(where, `unknown key "${key}"`);
  }

  if (typeof card.id !== 'string' || !ID_PATTERN.test(card.id)) {
    fail(where, `"id" must look like "idx-011", got ${JSON.stringify(card.id)}`);
  }
  if (!TIPOS.includes(card.tipo)) fail(`${where} (${card.id})`, `"tipo" must be one of ${TIPOS.join(', ')}`);

  for (const side of ['anverso', 'reverso']) {
    if (typeof card[side] !== 'string' || card[side].trim().length === 0) {
      fail(`${where} (${card.id})`, `"${side}" must be a non-empty string`);
    }
  }

  if (!Array.isArray(card.etiquetas) || card.etiquetas.length === 0) {
    fail(`${where} (${card.id})`, '"etiquetas" must be a non-empty list');
  }
  for (const tag of card.etiquetas) {
    if (typeof tag !== 'string' || !TAG_PATTERN.test(tag)) {
      fail(`${where} (${card.id})`, `tag ${JSON.stringify(tag)} must be lowercase, unaccented, no spaces`);
    }
  }
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Turn the authored text into the small subset of HTML Anki will render.
 *
 * Only two transformations, both unambiguous:
 *   `code` -> <code>code</code>, with the code span HTML-escaped
 *   newline -> <br>
 *
 * Escaping inside code spans is not cosmetic: `kernel<<<grid, block>>>()` would
 * otherwise reach the browser as markup and disappear from the card. Text
 * outside code spans is passed through, which is why the schema documents that
 * only <code>, <br> and <strong> are expected there.
 */
function toAnkiHtml(text) {
  return text
    .trim()
    .replace(/`([^`]+)`/g, (_match, code) => `<code>${escapeHtml(code)}</code>`)
    .split('\n')
    .map((line) => line.trim())
    .join('<br>')
    .replace(/(<br>)+$/, '');
}

/** A TSV field may contain no tab, newline or carriage return. */
function assertTsvSafe(value, where) {
  if (/[\t\r\n]/.test(value)) fail(where, 'a field contains a tab or a newline after conversion');
  return value;
}

function loadCards() {
  const files = readdirSync(CARDS_DIR)
    .filter((name) => name.endsWith('.yaml') || name.endsWith('.yml'))
    .sort();

  if (files.length === 0) fail('anki/cards', 'no YAML source files found');

  const rows = [];
  const seen = new Map();
  const decks = new Set();

  for (const file of files) {
    const parsed = yaml.load(readFileSync(join(CARDS_DIR, file), 'utf8'));
    validateDeck(parsed, file);
    decks.add(parsed.deck);

    parsed.cards.forEach((card, index) => {
      validateCard(card, file, index);
      if (seen.has(card.id)) {
        fail(file, `duplicate card id "${card.id}", already defined in ${seen.get(card.id)}`);
      }
      seen.set(card.id, file);

      rows.push({
        id: card.id,
        tipo: card.tipo,
        anverso: assertTsvSafe(toAnkiHtml(card.anverso), `${file} ${card.id} anverso`),
        reverso: assertTsvSafe(toAnkiHtml(card.reverso), `${file} ${card.id} reverso`),
        // The id becomes a tag so a card stays identifiable inside Anki, where
        // the TSV columns are gone.
        etiquetas: [...card.etiquetas, card.id].join(' '),
        deck: parsed.deck,
      });
    });
  }

  if (decks.size !== 1) {
    fail('anki/cards', `v0.1 builds exactly one deck, found ${decks.size}: ${[...decks].join(', ')}`);
  }

  // Sort by id so the output never depends on file order or authoring order.
  rows.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { rows, deck: [...decks][0] };
}

function renderTsv({ rows, deck }) {
  const lines = [
    '#separator:tab',
    '#html:true',
    '#notetype:Basic',
    `#deck:${deck}`,
    '#columns:Front\tBack\tTags',
    '#tags column:3',
  ];
  for (const row of rows) {
    lines.push(`${row.anverso}\t${row.reverso}\t${row.etiquetas}`);
  }
  // Trailing newline, LF only: identical on every platform.
  return `${lines.join('\n')}\n`;
}

function main() {
  const check = process.argv.includes('--check');

  let deckData;
  try {
    deckData = loadCards();
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error(`anki:build failed — ${error.message}`);
      process.exit(1);
    }
    throw error;
  }

  const tsv = renderTsv(deckData);
  const digest = createHash('sha256').update(tsv).digest('hex').slice(0, 12);

  if (check) {
    let existing = null;
    try {
      existing = readFileSync(OUTPUT_PATH, 'utf8');
    } catch {
      console.error(`anki:build --check failed — ${OUTPUT_PATH} does not exist. Run "pnpm anki:build".`);
      process.exit(1);
    }
    if (existing !== tsv) {
      console.error('anki:build --check failed — the generated TSV is out of date. Run "pnpm anki:build".');
      process.exit(1);
    }
    console.log(`anki:build --check ok (${deckData.rows.length} tarjetas, sha256:${digest})`);
    return;
  }

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, tsv, 'utf8');

  const porTipo = new Map();
  for (const row of deckData.rows) {
    porTipo.set(row.tipo, (porTipo.get(row.tipo) ?? 0) + 1);
  }
  const resumen = [...porTipo.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([tipo, count]) => `${tipo}=${count}`)
    .join(' ');

  console.log(`anki:build → ${deckData.rows.length} tarjetas  [${resumen}]`);
  console.log(`             ${OUTPUT_PATH}  sha256:${digest}`);
}

// Only act when run as a program. Importing this module (from the tests) must
// have no side effects.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}

export { loadCards, renderTsv, toAnkiHtml, OUTPUT_PATH };
