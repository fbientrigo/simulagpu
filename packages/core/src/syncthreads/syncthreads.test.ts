import { describe, expect, it } from 'vitest';
import { SYNCTHREADS_ARRIVAL_ORDER, SYNCTHREADS_SCENARIOS } from '@simulagpu/contracts';

import { DEFAULT_SYNCTHREADS_CONFIG, normalizeSyncthreadsConfig } from './config.js';
import { decodeSyncthreadsConfig, encodeSyncthreadsConfig } from './serialize.js';
import { buildSyncthreadsSnapshot } from './snapshot.js';

const build = (scenario: unknown) => buildSyncthreadsSnapshot(normalizeSyncthreadsConfig({ scenario }));

const stateOf = (stage: ReturnType<typeof build>['stages'][number], id: string) =>
  stage.blocks[0]?.threads.find((thread) => thread.id === id)?.state;

describe('normalizeSyncthreadsConfig', () => {
  it('returns a frozen default and is idempotent', () => {
    const once = normalizeSyncthreadsConfig();
    expect(once).toEqual(DEFAULT_SYNCTHREADS_CONFIG);
    expect(Object.isFrozen(once)).toBe(true);
    expect(normalizeSyncthreadsConfig(once)).toEqual(once);
  });

  it('normalizes junk to the primary scenario and accepts aliases', () => {
    expect(normalizeSyncthreadsConfig({ scenario: 'nonsense' })).toEqual(DEFAULT_SYNCTHREADS_CONFIG);
    expect(normalizeSyncthreadsConfig({ scenario: 'blocks' }).scenario).toBe('scope');
    expect(normalizeSyncthreadsConfig({ scenario: 'partial' }).scenario).toBe('divergent');
    expect(normalizeSyncthreadsConfig({ scenario: 'PRIMARY' }).scenario).toBe('primary');
  });

  it('round-trips every scenario through the stable query format', () => {
    for (const scenario of SYNCTHREADS_SCENARIOS) {
      const config = normalizeSyncthreadsConfig({ scenario });
      expect(decodeSyncthreadsConfig(encodeSyncthreadsConfig(config))).toEqual(config);
    }
    expect(decodeSyncthreadsConfig('?x=1&s=scope')).toEqual({ scenario: 'scope' });
  });
});

describe('buildSyncthreadsSnapshot — determinism, immutability, serialization', () => {
  it('is deterministic and survives a JSON round trip for every scenario', () => {
    for (const scenario of SYNCTHREADS_SCENARIOS) {
      const config = normalizeSyncthreadsConfig({ scenario });
      const snapshot = buildSyncthreadsSnapshot(config);
      expect(snapshot).toEqual(buildSyncthreadsSnapshot(config));
      expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
    }
  });

  it('is deeply frozen', () => {
    const snapshot = build('primary');
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.stages)).toBe(true);
    expect(Object.isFrozen(snapshot.stages[0])).toBe(true);
    expect(Object.isFrozen(snapshot.stages[0]?.blocks)).toBe(true);
    expect(Object.isFrozen(snapshot.stages[0]?.blocks[0])).toBe(true);
    expect(Object.isFrozen(snapshot.stages[0]?.blocks[0]?.threads)).toBe(true);
    expect(Object.isFrozen(snapshot.stages[0]?.blocks[0]?.threads[0])).toBe(true);
    expect(Object.isFrozen(snapshot.changed)).toBe(true);
  });

  it('contains no presentation, animation, or persistence state', () => {
    const snapshot = build('primary');
    for (const forbidden of ['step', 'current', 'stage', 'animation', 'prediction', 'quiz', 'progress']) {
      expect(snapshot).not.toHaveProperty(forbidden);
      expect(snapshot.config).not.toHaveProperty(forbidden);
    }
  });

  it('never exposes a numeric value/aggregate field (the barrier computes nothing)', () => {
    const snapshot = build('primary');
    // The model carries only synchronization state, never data the barrier "produced".
    for (const stage of snapshot.stages) {
      for (const block of stage.blocks) {
        for (const thread of block.threads) {
          expect(thread).not.toHaveProperty('value');
          expect(thread).not.toHaveProperty('sum');
          expect(thread).not.toHaveProperty('result');
          expect(Object.keys(thread).sort()).toEqual(['ariaLabel', 'hasElement', 'id', 'lane', 'state']);
        }
        expect(block).not.toHaveProperty('sum');
        expect(block).not.toHaveProperty('total');
      }
    }
    // No timing/scheduling vocabulary leaks into the serialized truth.
    const serialized = JSON.stringify(snapshot).toLowerCase();
    for (const forbidden of ['latency', 'nanosecond', 'millisecond', 'scheduler', 'warp']) {
      expect(serialized.includes(forbidden)).toBe(false);
    }
  });
});

describe('primary progression — arrival order T0 → T2 → T1 → T3', () => {
  const snapshot = build('primary');

  it('keeps the fixed teaching arrival order', () => {
    expect(snapshot.arrivalOrder).toEqual([...SYNCTHREADS_ARRIVAL_ORDER]);
  });

  it('starts with all four threads in before and nobody waiting', () => {
    const stage = snapshot.stages[0];
    expect(stage?.barrierSatisfied).toBe(false);
    expect(stage?.crossingAllowed).toBe(false);
    for (const id of ['T0', 'T1', 'T2', 'T3']) {
      expect(stateOf(snapshot.stages[0]!, id)).toBe('before');
    }
    expect(stage?.notArrivedIds).toEqual(['T0', 'T1', 'T2', 'T3']);
  });

  it('accumulates waiting threads in arrival order without anyone crossing', () => {
    // Stage 1: T0 arrived.
    expect(stateOf(snapshot.stages[1]!, 'T0')).toBe('waiting');
    expect(snapshot.stages[1]?.waitingIds).toEqual(['T0']);
    expect(snapshot.stages[1]?.crossingAllowed).toBe(false);
    // Stage 2: T0 + T2 arrived (T2 is second in the order).
    expect(stateOf(snapshot.stages[2]!, 'T2')).toBe('waiting');
    expect(snapshot.stages[2]?.waitingIds).toEqual(['T0', 'T2']);
    expect(snapshot.stages[2]?.notArrivedIds).toEqual(['T1', 'T3']);
    // Stage 3: T0 + T1 + T2 waiting, T3 still missing.
    expect(snapshot.stages[3]?.waitingIds).toEqual(['T0', 'T1', 'T2']);
    expect(snapshot.stages[3]?.notArrivedIds).toEqual(['T3']);
    expect(snapshot.stages[3]?.barrierSatisfied).toBe(false);
    expect(snapshot.stages[3]?.crossingAllowed).toBe(false);
  });

  it('releases every thread jointly only when the last required thread (T3) arrives', () => {
    const release = snapshot.stages[4];
    expect(release?.arrivedThreadId).toBe('T3');
    expect(release?.barrierSatisfied).toBe(true);
    expect(release?.crossingAllowed).toBe(true);
    for (const id of ['T0', 'T1', 'T2', 'T3']) {
      expect(stateOf(snapshot.stages[4]!, id)).toBe('released');
    }
  });

  it('lets released threads continue to after in the final continue stage', () => {
    const last = snapshot.stages[snapshot.stages.length - 1];
    for (const id of ['T0', 'T1', 'T2', 'T3']) {
      expect(stateOf(last!, id)).toBe('after');
    }
    expect(last?.barrierSatisfied).toBe(true);
  });

  it('invariant: no thread is released or after while any participant is still before', () => {
    for (const stage of snapshot.stages) {
      const states = stage.blocks[0]!.threads.map((thread) => thread.state);
      const someBefore = states.includes('before');
      const someReleasedOrAfter = states.some((state) => state === 'released' || state === 'after');
      expect(someBefore && someReleasedOrAfter).toBe(false);
    }
  });

  it('invariant: barrierSatisfied is false until the final arrival', () => {
    // Stages 0..3 unsatisfied, stage 4 (all arrived) and the continue stage satisfied.
    expect(snapshot.stages.slice(0, 4).every((stage) => stage.barrierSatisfied === false)).toBe(true);
    expect(snapshot.stages.slice(4).every((stage) => stage.barrierSatisfied === true)).toBe(true);
  });
});

describe('scope scenario — one block does not wait for another', () => {
  const snapshot = build('scope');

  it('shows Block 0 satisfied while Block 1 stays partial', () => {
    const stage = snapshot.stages[0];
    const block0 = stage?.blocks.find((block) => block.id === 0);
    const block1 = stage?.blocks.find((block) => block.id === 1);
    expect(block0?.barrierSatisfied).toBe(true);
    expect(block0?.threads.every((thread) => thread.state === 'released')).toBe(true);
    expect(block1?.barrierSatisfied).toBe(false);
    expect(block1?.threads.some((thread) => thread.state === 'before')).toBe(true);
  });

  it('never mutates one block based on another: Block 0 stays satisfied regardless of Block 1', () => {
    const block0 = snapshot.stages[0]?.blocks.find((block) => block.id === 0);
    const block1 = snapshot.stages[0]?.blocks.find((block) => block.id === 1);
    // Block 1 has an unsatisfied barrier, but Block 0 is fully released anyway.
    expect(block1?.barrierSatisfied).toBe(false);
    expect(block0?.barrierSatisfied).toBe(true);
  });
});

describe('divergent scenario — invalid participation is labelled, never executed', () => {
  const snapshot = build('divergent');

  it('flags invalid participation explicitly and never satisfies the barrier', () => {
    expect(snapshot.invalidParticipation).toBe(true);
    expect(snapshot.stages[0]?.barrierSatisfied).toBe(false);
    expect(snapshot.stages[0]?.crossingAllowed).toBe(false);
  });

  it('marks out-of-range threads invalid and keeps them in the block', () => {
    expect(stateOf(snapshot.stages[0]!, 'T0')).toBe('waiting');
    expect(stateOf(snapshot.stages[0]!, 'T1')).toBe('waiting');
    expect(stateOf(snapshot.stages[0]!, 'T2')).toBe('invalid');
    expect(stateOf(snapshot.stages[0]!, 'T3')).toBe('invalid');
    const t2 = snapshot.stages[0]?.blocks[0]?.threads.find((thread) => thread.id === 'T2');
    expect(t2?.hasElement).toBe(false);
  });

  it('shows the boundary-guard pattern in its code', () => {
    expect(snapshot.code).toContain('if (i < N)');
    expect(snapshot.code).toContain('__syncthreads()');
  });
});

describe('stable geometry across every scenario', () => {
  it('keeps lanes fixed 0..3 and never reorders threads by arrival', () => {
    for (const scenario of SYNCTHREADS_SCENARIOS) {
      const snapshot = build(scenario);
      for (const stage of snapshot.stages) {
        for (const block of stage.blocks) {
          expect(block.threads.map((thread) => thread.lane)).toEqual([0, 1, 2, 3]);
          expect(block.threads.map((thread) => thread.id)).toEqual(['T0', 'T1', 'T2', 'T3']);
        }
      }
    }
  });
});
