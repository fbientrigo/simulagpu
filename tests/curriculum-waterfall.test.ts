import { describe, expect, it } from 'vitest';
import { CURRICULUM_MODULES, CURRICULUM_SEQUENCE } from '../docs/curriculum/manifest';

const modulesById = new Map(CURRICULUM_MODULES.map((module) => [module.id, module]));

describe('curriculum waterfall contract', () => {
  it('uses unlocks only for the immediate next module in the frozen main sequence', () => {
    for (const [index, moduleId] of CURRICULUM_SEQUENCE.entries()) {
      const module = modulesById.get(moduleId);
      expect(module, `${moduleId} is missing from the manifest`).toBeDefined();
      if (!module) continue;

      const nextId = CURRICULUM_SEQUENCE[index + 1];
      expect(module.unlocks).toEqual(nextId ? [nextId] : []);
    }
  });

  it('keeps future primitive semantics out of the class that only motivates them', () => {
    const class2 = modulesById.get('class-2');
    const class3 = modulesById.get('class-3');

    expect(class2?.concepts.join(' ')).not.toContain('__syncthreads');
    expect(class2?.concepts.join(' ')).not.toContain('__shared__');
    expect(class2?.concepts.join(' ')).not.toContain('atomic update');
    expect(class2?.deferred.join(' ')).toContain('__syncthreads()');
    expect(class2?.deferred.join(' ')).toContain('__shared__');
    expect(class2?.deferred.join(' ')).toContain('atomic');

    expect(class3?.title).toBe('Clase 3 — Cooperación, memoria y patrones de acceso');
    expect(class3?.concepts.join(' ')).not.toContain('__shared__');
    expect(class3?.deferred.join(' ')).toContain('__shared__');
    expect(class3?.unlocks).toEqual(['primitive-d']);
  });

  it('keeps every numbered class after Clase 0 dependent on the immediately previous primitive', () => {
    for (const [index, classId] of CURRICULUM_SEQUENCE.entries()) {
      if (!classId.startsWith('class-') || classId === 'class-0') continue;

      const previousId = CURRICULUM_SEQUENCE[index - 1];
      const module = modulesById.get(classId);

      expect(previousId, `${classId} has no previous module`).toBeDefined();
      if (!previousId) continue;

      expect(previousId.startsWith('primitive-')).toBe(true);
      expect(module?.prerequisites).toContain(previousId);
    }
  });
});
