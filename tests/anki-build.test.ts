import { describe, expect, it } from 'vitest';

// @ts-expect-error -- plain ESM script, intentionally not TypeScript.
import { loadCards, renderTsv, toAnkiHtml } from '../anki/scripts/build-anki.mjs';

interface Row {
  id: string;
  tipo: string;
  anverso: string;
  reverso: string;
  etiquetas: string;
  deck: string;
}

const deck = loadCards() as { rows: Row[]; deck: string };

describe('anki deck sources', () => {
  it('builds the 34 cards promised by the lesson pages', () => {
    expect(deck.rows).toHaveLength(34);
    expect(deck.rows.filter((row) => row.id.startsWith('idx-'))).toHaveLength(18);
    expect(deck.rows.filter((row) => row.id.startsWith('red-'))).toHaveLength(12);
    expect(deck.rows.filter((row) => row.id.startsWith('malloc-'))).toHaveLength(4);
  });

  it('covers every required area', () => {
    const tipos = new Set(deck.rows.map((row) => row.tipo));
    for (const required of [
      'conceptual',
      'calculo',
      'frontera',
      'lanzamiento',
      'memoria',
      'medicion',
      'errores',
    ]) {
      expect(tipos, `falta el tipo ${required}`).toContain(required);
    }
  });

  it('includes exactly the four permanent cudaMalloc class cards', () => {
    expect(deck.rows.filter((row) => row.id.startsWith('malloc-')).map((row) => row.id)).toEqual([
      'malloc-001',
      'malloc-002',
      'malloc-003',
      'malloc-004',
    ]);
  });

  it('gives every card a unique id', () => {
    const ids = deck.rows.map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('tags every card with its own id', () => {
    for (const row of deck.rows) {
      expect(row.etiquetas.split(' ')).toContain(row.id);
    }
  });
});

describe('renderTsv', () => {
  it('is reproducible: two runs produce identical bytes', () => {
    expect(renderTsv(loadCards())).toBe(renderTsv(loadCards()));
  });

  it('emits the header Anki needs to configure the import by itself', () => {
    const lines = renderTsv(deck).split('\n');
    expect(lines.slice(0, 6)).toEqual([
      '#separator:tab',
      '#html:true',
      '#notetype:Basic',
      '#deck:SimulaGPU::01 Índice global',
      '#columns:Front\tBack\tTags',
      '#tags column:3',
    ]);
  });

  it('emits exactly three columns per card and no stray tabs', () => {
    const body = renderTsv(deck).split('\n').slice(6).filter(Boolean);
    expect(body).toHaveLength(deck.rows.length);
    for (const line of body) {
      expect(line.split('\t')).toHaveLength(3);
    }
  });

  it('sorts by id so file order cannot change the output', () => {
    const ids = deck.rows.map((row) => row.id);
    expect(ids).toEqual([...ids].sort());
  });

  it('ends with a single LF and contains no CR', () => {
    const tsv = renderTsv(deck);
    expect(tsv.endsWith('\n')).toBe(true);
    expect(tsv.endsWith('\n\n')).toBe(false);
    expect(tsv).not.toContain('\r');
  });
});

describe('toAnkiHtml', () => {
  it('converts backtick spans to <code>', () => {
    expect(toAnkiHtml('vale `i = 3`')).toBe('vale <code>i = 3</code>');
  });

  it('escapes markup inside code spans so launch syntax survives', () => {
    expect(toAnkiHtml('`kernel<<<A, B>>>()`')).toBe('<code>kernel&lt;&lt;&lt;A, B&gt;&gt;&gt;()</code>');
    expect(toAnkiHtml('`a & b`')).toBe('<code>a &amp; b</code>');
  });

  it('converts newlines to <br> without leaving a trailing one', () => {
    expect(toAnkiHtml('uno\ndos\n')).toBe('uno<br>dos');
  });

  it('leaves the authored HTML subset alone', () => {
    expect(toAnkiHtml('<strong>si</strong>')).toBe('<strong>si</strong>');
  });
});
