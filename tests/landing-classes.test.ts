import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { landingClasses } from '../apps/docs/.vitepress/theme/components/landing/classes';

/**
 * The landing's class selector must only ever point at classes that really
 * exist. This guards against inventing a future lesson (forbidden by the
 * design contract) and against a lesson rename silently breaking the
 * landing without any other test noticing.
 */
const repoFile = (route: string) => fileURLToPath(new URL(`../apps/docs${route}.md`, import.meta.url));

describe('landing classes route to real files', () => {
  it('lists at least one class', () => {
    expect(landingClasses.length).toBeGreaterThan(0);
  });

  it.each(landingClasses)('$id ($href) resolves to a real lesson file', ({ href, secondary }) => {
    expect(existsSync(repoFile(href))).toBe(true);
    if (secondary) {
      expect(existsSync(repoFile(secondary.href))).toBe(true);
    }
  });

  it('does not repeat the same route twice', () => {
    const hrefs = landingClasses.map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});
