import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { landingClasses } from '../apps/docs/.vitepress/theme/components/landing/classes';
import {
  CURRICULUM_MANIFEST,
  CURRICULUM_MODULES,
  CURRICULUM_SEQUENCE,
  REFERENCE_PRIMITIVES,
} from '../docs/curriculum/manifest';

const repoPath = (path: string) => fileURLToPath(new URL(`../${path}`, import.meta.url));
const read = (path: string) => readFileSync(repoPath(path), 'utf8');
const routeToDocPath = (route: string) => {
  const pathWithoutHash = route.split('#')[0] ?? route;
  return `apps/docs${pathWithoutHash}.md`;
};

const expectedSequence = [
  'class-0',
  'primitive-a',
  'class-1',
  'primitive-b',
  'class-2',
  'primitive-c',
  'class-3',
  'primitive-d',
  'class-4',
  'primitive-e',
  'class-5',
  'primitive-f',
  'class-6',
  'primitive-g',
  'class-7',
];
const expectedReferencePrimitives = ['primitive-h', 'primitive-i', 'primitive-j', 'primitive-k'];
const modulesById = new Map(CURRICULUM_MODULES.map((module) => [module.id, module]));

describe('curriculum contract', () => {
  it('freezes the exact Class 0 to Class 7 interleaving', () => {
    expect(CURRICULUM_MANIFEST.sequence).toEqual(expectedSequence);
    expect(CURRICULUM_SEQUENCE).toHaveLength(15);

    const orderedModules = [...CURRICULUM_MODULES]
      .filter((module) => module.sequencePosition <= CURRICULUM_SEQUENCE.length)
      .sort((left, right) => left.sequencePosition - right.sequencePosition)
      .map((module) => module.id);
    expect(orderedModules).toEqual(expectedSequence);
  });

  it('reserves H through K outside the first interleaved sequence', () => {
    expect(REFERENCE_PRIMITIVES).toEqual(expectedReferencePrimitives);
    expect(CURRICULUM_MANIFEST.referencePrimitives).toEqual(expectedReferencePrimitives);
    const firstSequenceIds = new Set<string>(CURRICULUM_SEQUENCE);
    expect(expectedReferencePrimitives.every((id) => !firstSequenceIds.has(id))).toBe(true);
  });

  it('keeps class ids, primitive ids, and sequence positions unique', () => {
    const classIds = CURRICULUM_MODULES.filter((module) => module.kind === 'class').map(
      (module) => module.id,
    );
    const primitiveIds = CURRICULUM_MODULES.filter((module) => module.kind === 'primitive').map(
      (module) => module.id,
    );
    const positions = CURRICULUM_MODULES.map((module) => module.sequencePosition);

    expect(new Set(classIds).size).toBe(classIds.length);
    expect(new Set(primitiveIds).size).toBe(primitiveIds.length);
    expect(new Set(positions).size).toBe(positions.length);
    expect(CURRICULUM_MODULES).toHaveLength(19);
  });

  it('makes prerequisites and unlocks point to known modules in curriculum order', () => {
    for (const module of CURRICULUM_MODULES) {
      for (const prerequisiteId of module.prerequisites) {
        const prerequisite = modulesById.get(prerequisiteId);
        expect(prerequisite, `${module.id} references unknown prerequisite ${prerequisiteId}`).toBeDefined();
        if (prerequisite) {
          expect(prerequisite.sequencePosition, `${module.id} depends on a later module`).toBeLessThan(
            module.sequencePosition,
          );
        }
      }

      for (const unlockedId of module.unlocks) {
        const unlocked = modulesById.get(unlockedId);
        expect(unlocked, `${module.id} unlocks unknown module ${unlockedId}`).toBeDefined();
        if (unlocked) {
          expect(unlocked.sequencePosition, `${module.id} unlocks a prior module`).toBeGreaterThan(
            module.sequencePosition,
          );
        }
      }
    }
  });

  it('points every implemented module at its current page, route, and files', () => {
    const implemented = CURRICULUM_MODULES.filter((module) => module.status === 'implemented');
    expect(implemented.map((module) => module.id)).toEqual([
      'class-0',
      'primitive-a',
      'class-1',
      'primitive-b',
      'class-2',
    ]);

    const routes = implemented.map((module) => module.implementation?.route);
    expect(new Set(routes).size).toBe(routes.length);

    for (const module of implemented) {
      expect(module.implementation, `${module.id} is implemented without references`).not.toBeNull();
      if (!module.implementation) continue;

      expect(existsSync(repoPath(module.implementation.docPath)), `${module.id} document is missing`).toBe(
        true,
      );
      expect(
        existsSync(repoPath(routeToDocPath(module.implementation.route))),
        `${module.id} route is missing`,
      ).toBe(true);
      for (const reference of module.implementation.references) {
        expect(existsSync(repoPath(reference)), `${module.id} reference is missing: ${reference}`).toBe(true);
      }
    }
  });

  it('keeps planned modules route-less and gives each one a real engineering scaffold', () => {
    const scaffoldSections = [
      '# Identity',
      '# Central question / skill',
      '# Prerequisites',
      '# Concepts in scope',
      '# Explicitly out of scope',
      '# Intended interaction',
      '# Intended visual grammar',
      '# Definition of learned',
      '# Dependencies / prerequisites for implementation',
      '# Status: PLANNED',
    ];

    for (const module of CURRICULUM_MODULES.filter((entry) => entry.status === 'planned')) {
      expect(module.implementation, `${module.id} is planned but has an implementation`).toBeNull();
      expect(module.scaffoldPath, `${module.id} has no scaffold path`).not.toBeNull();
      if (!module.scaffoldPath) continue;

      const scaffold = read(module.scaffoldPath);
      expect(existsSync(repoPath(module.scaffoldPath))).toBe(true);
      for (const section of scaffoldSections) {
        expect(scaffold, `${module.id} is missing ${section}`).toContain(section);
      }
    }
  });
});

describe('public navigation safety', () => {
  const config = read('apps/docs/.vitepress/config.ts');
  const landing = JSON.stringify(landingClasses);
  const planned = CURRICULUM_MODULES.filter((module) => module.status === 'planned');

  it('does not expose planned ids or scaffolds through the landing or VitePress config', () => {
    for (const module of planned) {
      expect(config, `planned module ${module.id} leaked into VitePress config`).not.toContain(module.id);
      expect(landing, `planned module ${module.id} leaked into landing data`).not.toContain(module.id);
      expect(config, `planned title ${module.title} leaked into VitePress config`).not.toContain(
        module.title,
      );
      expect(landing, `planned title ${module.title} leaked into landing data`).not.toContain(module.title);
      if (module.scaffoldPath) {
        expect(config).not.toContain(module.scaffoldPath);
        expect(landing).not.toContain(module.scaffoldPath);
      }
    }
  });

  it('keeps landing routes real and outside the planned module set', () => {
    // Planned entries are contractually route-less; this set stays empty until
    // a future entry receives an implemented status and a real public route.
    const plannedRoutes = new Set<string>();
    const routes = landingClasses.flatMap(({ href, secondary }) =>
      secondary ? [href, secondary.href] : [href],
    );

    for (const route of routes) {
      expect(existsSync(repoPath(routeToDocPath(route))), `landing route is missing: ${route}`).toBe(true);
      expect(plannedRoutes.has(route), `landing exposes a planned route: ${route}`).toBe(false);
    }
  });
});

describe('Clase 0 current-implementation invariants', () => {
  const classZero = modulesById.get('class-0');

  it('keeps Clase 0 implemented against the cleaned mental-model component', () => {
    expect(classZero, 'class-0 is missing from the manifest').toBeDefined();
    expect(classZero?.status).toBe('implemented');
    expect(classZero?.implementation, 'class-0 has no implementation references').not.toBeNull();
    expect(classZero?.implementation?.route).toBe('/clase-0/modelo-mental-gpu');
    expect(classZero?.implementation?.references).toContain('packages/visuals/src/ModeloMentalGpu.vue');
    expect(classZero?.implementation?.references).toContain('packages/core/src/chunk-flow');
  });

  it('does not re-freeze Clase 0 as an isometric / 2.5D lesson', () => {
    // The retired visual was isometric; the current cleaned component is precise 2D.
    expect(classZero?.visualGrammar).toBe('precise-2d');
  });

  it('never references the retired isometric component from any implemented module', () => {
    // Live implementation references must reject the legacy component; historical
    // provenance in docs/sources.md and docs/roadmap.md is intentionally not checked here.
    for (const module of CURRICULUM_MODULES.filter((entry) => entry.status === 'implemented')) {
      for (const reference of module.implementation?.references ?? []) {
        expect(reference, `${module.id} references the retired isometric component`).not.toContain(
          'SimuladorIsometricoGPU',
        );
      }
    }
  });

  it('keeps the live Clase 0 export and VitePress registration on the cleaned visualization', () => {
    const visualsIndex = read('packages/visuals/src/index.ts');
    const theme = read('apps/docs/.vitepress/theme/index.ts');
    expect(visualsIndex).toContain('ModeloMentalGpu');
    expect(visualsIndex).not.toContain('SimuladorIsometricoGPU');
    expect(theme).toContain('ModeloMentalGpu');
    expect(theme).not.toContain('SimuladorIsometricoGPU');
  });
});
