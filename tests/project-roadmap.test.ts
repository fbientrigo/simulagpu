import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import ledger from '../docs/project/roadmap.json';
import {
  deriveEligibility,
  resolveNext,
  validateRoadmap,
  validatePaths,
  type Roadmap,
  type RoadmapItem,
} from '../scripts/roadmap/roadmap.mjs';
import { CURRICULUM_MODULES, CURRICULUM_SEQUENCE, REFERENCE_PRIMITIVES } from '../docs/curriculum/manifest';

const roadmap = ledger as unknown as Roadmap;
const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const byId = new Map<string, RoadmapItem>(roadmap.items.map((item) => [item.id, item]));
const clone = (): Roadmap => structuredClone(roadmap);
const item = (id: string): RoadmapItem => {
  const found = byId.get(id);
  if (!found) throw new Error(`missing test fixture item ${id}`);
  return found;
};

const curriculumIds = new Set<string>(CURRICULUM_MODULES.map((module) => module.id));
const manifestById = new Map<string, (typeof CURRICULUM_MODULES)[number]>(
  CURRICULUM_MODULES.map((module) => [module.id, module]),
);

describe('roadmap ledger — structural invariants', () => {
  it('passes structural validation with no errors', () => {
    expect(validateRoadmap(roadmap)).toEqual([]);
  });

  it('passes filesystem-backed path validation', () => {
    expect(validatePaths(roadmap, repoRoot)).toEqual([]);
  });

  it('keeps every work-item id unique', () => {
    const ids = roadmap.items.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('points every dependency and unlock at a known item', () => {
    for (const entry of roadmap.items) {
      for (const dep of entry.dependsOn) expect(byId.has(dep), `${entry.id} -> ${dep}`).toBe(true);
      for (const unlocked of entry.unlocks)
        expect(byId.has(unlocked), `${entry.id} -> ${unlocked}`).toBe(true);
    }
  });

  it('never lets an item depend on itself', () => {
    for (const entry of roadmap.items) expect(entry.dependsOn).not.toContain(entry.id);
  });

  it('uses only declared statuses and tracks', () => {
    for (const entry of roadmap.items) {
      expect(roadmap.states).toContain(entry.status);
      expect(roadmap.tracks).toContain(entry.track);
    }
  });

  it('resolves every path-like contract to a real file or directory', () => {
    for (const entry of roadmap.items) {
      if (entry.contract && entry.contract.includes('/')) {
        expect(existsSync(new URL(`../${entry.contract}`, import.meta.url)), entry.contract).toBe(true);
      }
    }
  });
});

describe('roadmap ledger — lifecycle invariants', () => {
  it('backs every DONE item with at least one existing evidence path', () => {
    for (const entry of roadmap.items.filter((e) => e.status === 'done')) {
      const real = entry.evidence.filter(
        (ref) => ref.includes('/') && existsSync(new URL(`../${ref}`, import.meta.url)),
      );
      expect(real.length, `${entry.id} has no existing evidence`).toBeGreaterThan(0);
    }
  });

  it('gives every BLOCKED item a concrete blocker reason', () => {
    for (const entry of roadmap.items.filter((e) => e.status === 'blocked')) {
      expect(entry.blocker?.reason?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('gives every WIP item resumable handoff information', () => {
    for (const entry of roadmap.items.filter((e) => e.status === 'wip')) {
      expect(entry.handoff, `${entry.id} wip without handoff`).not.toBeNull();
      expect((entry.handoff?.remaining ?? []).length).toBeGreaterThan(0);
    }
  });

  it('never marks READY or DONE while a dependency is unfinished', () => {
    for (const entry of roadmap.items) {
      if (entry.status === 'ready' || entry.status === 'done') {
        for (const dep of entry.dependsOn) {
          expect(item(dep).status, `${entry.id} depends on unfinished ${dep}`).toBe('done');
        }
      }
    }
  });

  it('keeps superseded items out of the eligible set', () => {
    const supersededClone = clone();
    supersededClone.items[0]!.status = 'superseded';
    const eligibility = deriveEligibility(supersededClone).find((e) => e.id === supersededClone.items[0]!.id);
    expect(eligibility?.eligible).toBe(false);
  });
});

describe('roadmap resolver — determinism and ordering', () => {
  it('returns primitive-c as the deterministic next item', () => {
    const result = resolveNext(roadmap);
    expect(result.item?.id).toBe('primitive-c');
    expect(result.reason).toBe('ready');
  });

  it('returns the identical result on repeated calls against unchanged state', () => {
    expect(resolveNext(roadmap)).toEqual(resolveNext(roadmap));
  });

  it('resumes eligible WIP before starting new READY work', () => {
    const wipClone = clone();
    // Make class-2 a resumable WIP (its dependencies are done) while primitive-c
    // stays READY. The resolver must prefer resuming the WIP.
    const class2 = wipClone.items.find((e) => e.id === 'class-2')!;
    class2.status = 'wip';
    class2.handoff = { branch: 'class/class-2', remaining: ['polish'], resumeFrom: ['packages/core'] };
    const result = resolveNext(wipClone);
    expect(result.reason).toBe('resume-wip');
    expect(result.item?.id).toBe('class-2');
  });

  it('never returns an item whose dependencies are unfinished', () => {
    const depClone = clone();
    // class-2 becomes WIP (not done); primitive-c depends on it and must not be
    // returned, and class-3 (depending on primitive-c) must not be returned either.
    const class2 = depClone.items.find((e) => e.id === 'class-2')!;
    class2.status = 'wip';
    class2.handoff = { branch: 'x', remaining: ['y'] };
    const result = resolveNext(depClone);
    expect(result.item?.id).toBe('class-2');
    expect(result.item?.id).not.toBe('primitive-c');
  });

  it('orders eligible items by priority then id', () => {
    const twoReady = clone();
    const g = twoReady.items.find((e) => e.id === 'primitive-g')!;
    // Force two independent READY items; the lower priority must win.
    g.status = 'ready';
    g.dependsOn = [];
    g.priority = 3;
    const c = twoReady.items.find((e) => e.id === 'primitive-c')!;
    c.priority = 6;
    const result = resolveNext(twoReady);
    expect(result.item?.id).toBe('primitive-g');
  });

  it('reports blockers when nothing is executable', () => {
    const stuck = clone();
    stuck.items.find((e) => e.id === 'primitive-c')!.status = 'planned';
    const result = resolveNext(stuck);
    expect(result.item).toBeNull();
    expect(result.reason).toBe('no-executable-work');
    expect(result.blockers.length).toBeGreaterThan(0);
    expect(result.blockers.some((b) => b.id === 'class-3')).toBe(true);
  });

  it('does not return planned items even when their dependencies are done', () => {
    // Reference primitives H-K are planned with satisfied dependencies.
    const eligibility = deriveEligibility(roadmap);
    for (const id of REFERENCE_PRIMITIVES) {
      expect(eligibility.find((e) => e.id === id)?.eligible, `${id} leaked as eligible`).toBe(false);
    }
  });
});

describe('roadmap ledger — curriculum integration', () => {
  it('references only real curriculum modules from curriculum-track items', () => {
    for (const entry of roadmap.items) {
      if (entry.curriculumId) expect(curriculumIds.has(entry.curriculumId), entry.curriculumId).toBe(true);
    }
  });

  it('keeps the frozen A-G waterfall order in the ledger priorities', () => {
    const curriculumWaterfall = roadmap.items
      .filter((entry) => entry.track === 'curriculum')
      .sort((a, b) => a.priority - b.priority)
      .map((entry) => entry.curriculumId);
    expect(curriculumWaterfall).toEqual([...CURRICULUM_SEQUENCE]);
  });

  it('mirrors manifest prerequisites so execution metadata cannot reorder the curriculum', () => {
    for (const entry of roadmap.items) {
      if (entry.track !== 'curriculum' || !entry.curriculumId) continue;
      const module = manifestById.get(entry.curriculumId)!;
      expect([...entry.dependsOn].sort(), entry.id).toEqual([...module.prerequisites].sort());
    }
  });

  it('never lets a non-curriculum item become a curriculum dependency', () => {
    for (const entry of roadmap.items) {
      if (entry.track !== 'curriculum') continue;
      for (const dep of entry.dependsOn) {
        expect(item(dep).track, `${entry.id} depends on non-curriculum ${dep}`).toBe('curriculum');
      }
    }
  });

  it('does not let the next curriculum candidate skip an unfinished prerequisite', () => {
    // primitive-c is next; class-3 sits behind it and must stay non-eligible.
    const eligibility = deriveEligibility(roadmap);
    expect(eligibility.find((e) => e.id === 'primitive-c')?.eligible).toBe(true);
    expect(eligibility.find((e) => e.id === 'class-3')?.eligible).toBe(false);
  });
});

describe('roadmap validation — regression against malformed ledgers', () => {
  const expectError = (mutate: (draft: Roadmap) => void, fragment: string) => {
    const draft = clone();
    mutate(draft);
    const errors = validateRoadmap(draft);
    expect(
      errors.some((error) => error.includes(fragment)),
      `${fragment}\n${errors.join('\n')}`,
    ).toBe(true);
  };

  it('rejects duplicate ids', () => {
    expectError((draft) => {
      draft.items.push({ ...draft.items[0]! });
    }, 'duplicate id');
  });

  it('rejects unknown dependencies', () => {
    expectError((draft) => {
      draft.items.find((e) => e.id === 'primitive-c')!.dependsOn = ['does-not-exist'];
    }, 'unknown item');
  });

  it('rejects self dependencies', () => {
    expectError((draft) => {
      draft.items.find((e) => e.id === 'primitive-c')!.dependsOn = ['primitive-c'];
    }, 'depends on itself');
  });

  it('rejects dependency cycles', () => {
    expectError((draft) => {
      draft.items.find((e) => e.id === 'class-2')!.dependsOn = ['primitive-c'];
    }, 'cycle');
  });

  it('rejects READY items with unfinished dependencies', () => {
    expectError((draft) => {
      draft.items.find((e) => e.id === 'class-2')!.status = 'planned';
    }, 'contradicts unfinished dependency');
  });

  it('rejects DONE items without evidence', () => {
    expectError((draft) => {
      draft.items.find((e) => e.id === 'class-2')!.evidence = [];
    }, 'require at least one evidence');
  });

  it('rejects WIP items without handoff', () => {
    expectError((draft) => {
      const c = draft.items.find((e) => e.id === 'primitive-c')!;
      c.status = 'wip';
    }, 'require a handoff');
  });

  it('rejects BLOCKED items without a blocker reason', () => {
    expectError((draft) => {
      draft.items.find((e) => e.id === 'license-decision')!.blocker = null;
    }, 'require a blocker');
  });

  it('rejects invalid statuses', () => {
    expectError((draft) => {
      // deliberately corrupt the status
      (draft.items[0] as unknown as { status: string }).status = 'in-progress';
    }, 'invalid status');
  });
});
