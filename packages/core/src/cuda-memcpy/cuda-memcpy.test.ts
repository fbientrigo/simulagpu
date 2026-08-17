import { describe, expect, it } from 'vitest';
import { CUDA_MEMCPY_DIRECTIONS, CUDA_MEMCPY_ELEMENT_COUNTS } from '@simulagpu/contracts';

import { DEFAULT_CUDA_MEMCPY_CONFIG, normalizeCudaMemcpyConfig } from './config.js';
import { decodeCudaMemcpyConfig, encodeCudaMemcpyConfig } from './serialize.js';
import { buildCudaMemcpySnapshot } from './snapshot.js';

const build = (direction: unknown, elementCount: unknown) =>
  buildCudaMemcpySnapshot(normalizeCudaMemcpyConfig({ direction, elementCount }));

describe('normalizeCudaMemcpyConfig', () => {
  it('returns a frozen default and is idempotent', () => {
    const once = normalizeCudaMemcpyConfig();
    expect(once).toEqual(DEFAULT_CUDA_MEMCPY_CONFIG);
    expect(Object.isFrozen(once)).toBe(true);
    expect(normalizeCudaMemcpyConfig(once)).toEqual(once);
  });

  it('normalizes junk and snaps element counts into the 1/3/5 budget', () => {
    expect(normalizeCudaMemcpyConfig({ elementCount: 'junk' })).toEqual(DEFAULT_CUDA_MEMCPY_CONFIG);
    expect(normalizeCudaMemcpyConfig({ elementCount: -20 }).elementCount).toBe(1);
    expect(normalizeCudaMemcpyConfig({ elementCount: 2 }).elementCount).toBe(1);
    expect(normalizeCudaMemcpyConfig({ elementCount: 4 }).elementCount).toBe(3);
    expect(normalizeCudaMemcpyConfig({ elementCount: 999 }).elementCount).toBe(5);
  });

  it('accepts direction aliases and defaults to host-to-device', () => {
    expect(normalizeCudaMemcpyConfig({ direction: 'd2h' }).direction).toBe('device-to-host');
    expect(normalizeCudaMemcpyConfig({ direction: 'device-to-host' }).direction).toBe('device-to-host');
    expect(normalizeCudaMemcpyConfig({ direction: 'h2d' }).direction).toBe('host-to-device');
    expect(normalizeCudaMemcpyConfig({ direction: 'nonsense' }).direction).toBe('host-to-device');
  });

  it('round-trips every normalized config through the stable query format', () => {
    for (const direction of CUDA_MEMCPY_DIRECTIONS) {
      for (const elementCount of CUDA_MEMCPY_ELEMENT_COUNTS) {
        const config = normalizeCudaMemcpyConfig({ direction, elementCount });
        expect(decodeCudaMemcpyConfig(encodeCudaMemcpyConfig(config))).toEqual(config);
      }
    }
    expect(decodeCudaMemcpyConfig('?unknown=x&d=d2h&n=5')).toEqual({
      direction: 'device-to-host',
      elementCount: 5,
    });
  });
});

describe('buildCudaMemcpySnapshot — determinism and shape', () => {
  it('is deterministic and survives a JSON round trip', () => {
    const config = normalizeCudaMemcpyConfig({ direction: 'host-to-device', elementCount: 3 });
    const snapshot = buildCudaMemcpySnapshot(config);
    expect(snapshot).toEqual(buildCudaMemcpySnapshot(config));
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
  });

  it('is deeply frozen', () => {
    const snapshot = build('host-to-device', 3);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.before)).toBe(true);
    expect(Object.isFrozen(snapshot.before.host)).toBe(true);
    expect(Object.isFrozen(snapshot.before.host.cells)).toBe(true);
    expect(Object.isFrozen(snapshot.before.host.cells[0])).toBe(true);
    expect(Object.isFrozen(snapshot.after.device.cells)).toBe(true);
    expect(Object.isFrozen(snapshot.action)).toBe(true);
    expect(Object.isFrozen(snapshot.changed)).toBe(true);
    expect(Object.isFrozen(snapshot.unchanged)).toBe(true);
    expect(Object.isFrozen(snapshot.affectedIndices)).toBe(true);
  });

  it('never uses undefined as a serialized value (uninitialized cells are null)', () => {
    const snapshot = build('host-to-device', 3);
    const undefinedCell = snapshot.before.device.cells[4];
    expect(undefinedCell?.state).toBe('undefined');
    expect(undefinedCell?.value).toBeNull();
    expect(undefinedCell?.symbol).toBe('?');
  });

  it('contains no presentation, animation, quiz, or persistence state', () => {
    const snapshot = build('host-to-device', 3);
    for (const forbidden of ['step', 'stage', 'frame', 'animation', 'prediction', 'quiz', 'progress']) {
      expect(snapshot).not.toHaveProperty(forbidden);
      expect(snapshot.config).not.toHaveProperty(forbidden);
    }
  });
});

describe('deterministic model invariants', () => {
  it('invariant 1: source values never change because of the copy (H2D and D2H)', () => {
    const h2d = build('host-to-device', 3);
    expect(h2d.after.host).toEqual(h2d.before.host);

    const d2h = build('device-to-host', 3);
    expect(d2h.after.device).toEqual(d2h.before.device);
  });

  it('invariant 2: only the requested destination range changes', () => {
    const snapshot = build('host-to-device', 3);
    const before = snapshot.before.device.cells;
    const after = snapshot.after.device.cells;
    // First three copied.
    expect(after.slice(0, 3).map((c) => c.value)).toEqual([4, 7, 1]);
    expect(after.slice(0, 3).every((c) => c.state === 'known')).toBe(true);
    // Tail identical to before.
    expect(after.slice(3)).toEqual(before.slice(3));
    expect(snapshot.affectedIndices).toEqual([0, 1, 2]);
    expect(snapshot.unaffectedIndices).toEqual([3, 4]);
  });

  it('invariant 3: uncopied destination cells preserve prior state — proven with known D2H tail', () => {
    const snapshot = build('device-to-host', 3);
    const after = snapshot.after.host.cells;
    // Copied region holds the device values.
    expect(after.slice(0, 3).map((c) => c.value)).toEqual([31, 12, 5]);
    // The tail keeps its previous -1 values: "not copied" means unchanged, not reset.
    expect(after.slice(3).map((c) => c.value)).toEqual([-1, -1]);
    expect(after.slice(3).every((c) => c.state === 'known')).toBe(true);
  });

  it('invariant 4: byteCount = elementCount × 4 for every whole-element case', () => {
    for (const direction of CUDA_MEMCPY_DIRECTIONS) {
      for (const elementCount of CUDA_MEMCPY_ELEMENT_COUNTS) {
        const snapshot = build(direction, elementCount);
        expect(snapshot.byteCount).toBe(elementCount * 4);
        expect(snapshot.action.byteCount).toBe(elementCount * 4);
        expect(snapshot.byteExpression).toBe(`${elementCount} × sizeof(int32_t) = ${elementCount * 4} bytes`);
      }
    }
  });

  it('invariant 5: H2D means host source → device destination', () => {
    const snapshot = build('host-to-device', 3);
    expect(snapshot.sourceLocation).toBe('host');
    expect(snapshot.destinationLocation).toBe('device');
    expect(snapshot.sourceId).toBe('h_input');
    expect(snapshot.destinationId).toBe('d_input');
    expect(snapshot.kind).toBe('cudaMemcpyHostToDevice');
    expect(snapshot.before.host.role).toBe('source');
    expect(snapshot.before.device.role).toBe('destination');
  });

  it('invariant 6: D2H means device source → host destination', () => {
    const snapshot = build('device-to-host', 3);
    expect(snapshot.sourceLocation).toBe('device');
    expect(snapshot.destinationLocation).toBe('host');
    expect(snapshot.sourceId).toBe('d_result');
    expect(snapshot.destinationId).toBe('h_result');
    expect(snapshot.kind).toBe('cudaMemcpyDeviceToHost');
    expect(snapshot.before.device.role).toBe('source');
    expect(snapshot.before.host.role).toBe('destination');
  });

  it('invariants 7-9: no allocation change, no kernel launch, no timing/async in the model', () => {
    for (const direction of CUDA_MEMCPY_DIRECTIONS) {
      const snapshot = build(direction, 3);
      // No allocation is created or resized: cell counts are stable before/after.
      expect(snapshot.before.host.cells).toHaveLength(5);
      expect(snapshot.after.host.cells).toHaveLength(5);
      expect(snapshot.before.device.cells).toHaveLength(5);
      expect(snapshot.after.device.cells).toHaveLength(5);
      // No kernel launch syntax anywhere in the modeled call.
      expect(snapshot.action.code).not.toContain('<<<');
      // No timing/async vocabulary in the modeled truth.
      const serialized = JSON.stringify(snapshot).toLowerCase();
      for (const forbidden of ['async', 'stream', 'ms', 'latency', 'bandwidth', 'kernel<<<']) {
        expect(serialized.includes(forbidden)).toBe(false);
      }
    }
  });

  it('keeps host/device geometry stable across direction changes (both rows always present)', () => {
    const h2d = build('host-to-device', 1);
    const d2h = build('device-to-host', 1);
    expect(h2d.before.host.location).toBe('host');
    expect(h2d.before.device.location).toBe('device');
    expect(d2h.before.host.location).toBe('host');
    expect(d2h.before.device.location).toBe('device');
  });
});

describe('boundary element counts', () => {
  it('smallest case (1) copies exactly one cell and leaves a four-cell tail', () => {
    const snapshot = build('host-to-device', 1);
    expect(snapshot.affectedIndices).toEqual([0]);
    expect(snapshot.unaffectedIndices).toEqual([1, 2, 3, 4]);
    expect(snapshot.after.device.cells[0]?.value).toBe(4);
    expect(snapshot.after.device.cells.slice(1).every((c) => c.state === 'undefined')).toBe(true);
  });

  it('exact-fit case (5) copies the whole buffer with no tail', () => {
    const snapshot = build('host-to-device', 5);
    expect(snapshot.affectedIndices).toEqual([0, 1, 2, 3, 4]);
    expect(snapshot.unaffectedIndices).toEqual([]);
    expect(snapshot.after.device.cells.map((c) => c.value)).toEqual([4, 7, 1, 9, 3]);
    expect(snapshot.unchanged.join(' ')).toMatch(/no queda cola sin tocar/i);
  });
});
