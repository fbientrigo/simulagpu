/**
 * SimulaGPU project execution resolver.
 *
 *   node scripts/roadmap/roadmap.mjs status            # human status board
 *   node scripts/roadmap/roadmap.mjs status --json     # machine-readable state
 *   node scripts/roadmap/roadmap.mjs next              # the one next work item
 *   node scripts/roadmap/roadmap.mjs next --json       # machine-readable next item
 *   node scripts/roadmap/roadmap.mjs validate          # fail if the ledger is inconsistent
 *   node scripts/roadmap/roadmap.mjs <cmd> --file PATH  # operate on another ledger
 *
 * Determinism is the whole point. The same ledger state must always render the
 * same status and resolve the same next item. There is no clock, no randomness,
 * no network, and no LLM in the selection path — only algorithmic sorting.
 *
 * This engine deliberately consumes docs/project/roadmap.json (engineering
 * truth) and NOT docs/curriculum/manifest.ts (pedagogical truth). Cross-checks
 * between the two live in tests/project-roadmap.test.ts, which can import the
 * TypeScript manifest; keeping them out of here keeps the CLI dependency-free.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(HERE, '..', '..');
export const DEFAULT_LEDGER_PATH = join(REPO_ROOT, 'docs', 'project', 'roadmap.json');

const REQUIRED_ITEM_FIELDS = [
  'id',
  'track',
  'status',
  'priority',
  'dependsOn',
  'contract',
  'definitionOfDone',
  'verification',
  'evidence',
  'unlocks',
];

/** Read and parse a ledger file. */
export function loadRoadmapFromFile(path = DEFAULT_LEDGER_PATH) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/** Index items by id. Assumes ids are unique (validate first). */
export function indexById(roadmap) {
  const byId = new Map();
  for (const item of roadmap.items ?? []) byId.set(item.id, item);
  return byId;
}

/** True when every declared dependency of `item` is a DONE item. */
export function dependenciesSatisfied(item, byId) {
  return item.dependsOn.every((depId) => byId.get(depId)?.status === 'done');
}

/**
 * Structural + lifecycle validation. Pure: no filesystem access.
 * Returns a list of human-readable error strings; empty means valid.
 */
export function validateRoadmap(roadmap) {
  const errors = [];
  if (!roadmap || typeof roadmap !== 'object') return ['ledger is not an object'];
  if (!Array.isArray(roadmap.items)) return ['ledger.items is missing or not an array'];

  const states = new Set(roadmap.states ?? []);
  const tracks = new Set(roadmap.tracks ?? []);
  const seen = new Set();
  const byId = indexById(roadmap);

  for (const item of roadmap.items) {
    const where = `item "${item?.id ?? '<unknown>'}"`;

    for (const field of REQUIRED_ITEM_FIELDS) {
      if (!(field in item)) errors.push(`${where}: missing required field "${field}"`);
    }
    if (typeof item.id !== 'string' || item.id.length === 0) {
      errors.push(`${where}: id must be a non-empty string`);
      continue;
    }
    if (seen.has(item.id)) errors.push(`${where}: duplicate id`);
    seen.add(item.id);

    if (!states.has(item.status)) errors.push(`${where}: invalid status "${item.status}"`);
    if (!tracks.has(item.track)) errors.push(`${where}: invalid track "${item.track}"`);
    if (typeof item.priority !== 'number') errors.push(`${where}: priority must be a number`);

    for (const key of ['dependsOn', 'definitionOfDone', 'verification', 'evidence', 'unlocks']) {
      if (!Array.isArray(item[key])) errors.push(`${where}: "${key}" must be an array`);
    }

    if (Array.isArray(item.dependsOn)) {
      for (const depId of item.dependsOn) {
        if (depId === item.id) errors.push(`${where}: depends on itself`);
        else if (!byId.has(depId)) errors.push(`${where}: depends on unknown item "${depId}"`);
      }
    }
    if (Array.isArray(item.unlocks)) {
      for (const unlockedId of item.unlocks) {
        if (!byId.has(unlockedId)) errors.push(`${where}: unlocks unknown item "${unlockedId}"`);
      }
    }

    // Lifecycle invariants.
    if (item.status === 'done' && Array.isArray(item.evidence) && item.evidence.length === 0) {
      errors.push(`${where}: DONE items require at least one evidence entry`);
    }
    if (item.status === 'wip') {
      const h = item.handoff;
      if (!h || typeof h !== 'object') {
        errors.push(`${where}: WIP items require a handoff object`);
      } else {
        if (typeof h.branch !== 'string') errors.push(`${where}: WIP handoff needs a branch`);
        if (!Array.isArray(h.remaining) || h.remaining.length === 0) {
          errors.push(`${where}: WIP handoff needs a non-empty "remaining" list`);
        }
      }
    }
    if (item.status === 'blocked') {
      const b = item.blocker;
      if (!b || typeof b !== 'object' || typeof b.reason !== 'string' || b.reason.length === 0) {
        errors.push(`${where}: BLOCKED items require a blocker with a reason`);
      }
    }

    // The core invariant: the ledger must never advertise an item as executable
    // (ready) or complete (done) while a required dependency is unfinished.
    if (Array.isArray(item.dependsOn) && (item.status === 'ready' || item.status === 'done')) {
      for (const depId of item.dependsOn) {
        const dep = byId.get(depId);
        if (dep && dep.status !== 'done') {
          errors.push(
            `${where}: status "${item.status}" contradicts unfinished dependency "${depId}" (${dep.status})`,
          );
        }
      }
    }
  }

  errors.push(...detectCycles(roadmap, byId));
  return errors;
}

/** Detect dependency cycles via DFS. Returns error strings. */
function detectCycles(roadmap, byId) {
  const errors = [];
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map();
  for (const item of roadmap.items) color.set(item.id, WHITE);

  const visit = (id, stack) => {
    color.set(id, GRAY);
    stack.push(id);
    const item = byId.get(id);
    for (const depId of item?.dependsOn ?? []) {
      if (!byId.has(depId)) continue;
      const c = color.get(depId);
      if (c === GRAY) {
        const cycle = [...stack.slice(stack.indexOf(depId)), depId].join(' -> ');
        errors.push(`dependency cycle detected: ${cycle}`);
      } else if (c === WHITE) {
        visit(depId, stack);
      }
    }
    stack.pop();
    color.set(id, BLACK);
  };

  for (const item of roadmap.items) {
    if (color.get(item.id) === WHITE) visit(item.id, []);
  }
  return errors;
}

/**
 * Derive per-item eligibility. `ready` is not taken on faith: an item is only
 * eligible when its stored status is `ready` or `wip` AND every dependency is
 * done. `planned` items are never eligible even if their dependencies happen to
 * be done — they await explicit promotion.
 */
export function deriveEligibility(roadmap) {
  const byId = indexById(roadmap);
  return roadmap.items.map((item) => {
    const depsDone = dependenciesSatisfied(item, byId);
    const eligible = depsDone && (item.status === 'ready' || item.status === 'wip');
    return {
      id: item.id,
      track: item.track,
      status: item.status,
      dependenciesSatisfied: depsDone,
      eligible,
      kind: item.status === 'wip' ? 'resume' : eligible ? 'ready' : 'none',
    };
  });
}

/** Deterministic ordering: priority ascending, then id ascending. */
function compareItems(a, b) {
  if (a.priority !== b.priority) return a.priority - b.priority;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Explain why a non-executable item is waiting. */
function waitingReason(item, byId) {
  if (item.status === 'blocked') {
    return `blocked: ${item.blocker?.reason ?? 'no reason recorded'}`;
  }
  const unfinished = item.dependsOn.filter((depId) => byId.get(depId)?.status !== 'done');
  if (unfinished.length > 0) {
    return `${item.status}: waiting on ${unfinished.join(', ')}`;
  }
  if (item.status === 'planned') return 'planned: awaiting promotion to ready (owner intent)';
  return item.status;
}

/**
 * Resolve exactly one next work item.
 *   1. Resume the highest-priority eligible WIP if any exists.
 *   2. Otherwise take the highest-priority eligible READY item.
 *   3. Otherwise return no item plus the blocking explanations.
 */
export function resolveNext(roadmap) {
  const byId = indexById(roadmap);

  const wip = roadmap.items
    .filter((item) => item.status === 'wip' && dependenciesSatisfied(item, byId))
    .sort(compareItems);
  if (wip.length > 0) {
    return { item: wip[0], reason: 'resume-wip', blockers: [] };
  }

  const ready = roadmap.items
    .filter((item) => item.status === 'ready' && dependenciesSatisfied(item, byId))
    .sort(compareItems);
  if (ready.length > 0) {
    return { item: ready[0], reason: 'ready', blockers: [] };
  }

  const blockers = roadmap.items
    .filter((item) => item.status === 'planned' || item.status === 'blocked')
    .sort(compareItems)
    .map((item) => ({ id: item.id, reason: waitingReason(item, byId) }));
  return { item: null, reason: 'no-executable-work', blockers };
}

const STATUS_LABEL = {
  done: 'DONE',
  ready: 'READY',
  wip: 'WIP',
  blocked: 'BLOCKED',
  planned: 'PLANNED',
  superseded: 'SUPERSEDED',
};

/** Render the human status board. */
export function renderStatus(roadmap) {
  const next = resolveNext(roadmap);
  const nextId = next.item?.id ?? null;
  const trackOrder = roadmap.tracks ?? [];
  const lines = ['SimulaGPU execution state', ''];

  for (const track of trackOrder) {
    const items = roadmap.items.filter((item) => item.track === track).sort(compareItems);
    if (items.length === 0) continue;
    lines.push(`[${track}]`);
    for (const item of items) {
      const label = (STATUS_LABEL[item.status] ?? item.status).padEnd(10);
      const marker = item.id === nextId ? '-> ' : '   ';
      lines.push(`  ${marker}${label} ${item.id}`);
    }
    lines.push('');
  }

  if (next.item) {
    lines.push(`Next: ${next.item.id} (${next.reason})`);
  } else {
    lines.push('Next: none — no executable work.');
    for (const blocker of next.blockers.slice(0, 8)) {
      lines.push(`  - ${blocker.id}: ${blocker.reason}`);
    }
  }
  return lines.join('\n');
}

/** Render the single next work item for a human. */
export function renderNext(result) {
  if (!result.item) {
    const lines = ['No executable work item.', '', 'Waiting:'];
    for (const blocker of result.blockers) lines.push(`  - ${blocker.id}: ${blocker.reason}`);
    return lines.join('\n');
  }
  const item = result.item;
  const lines = [
    `NEXT: ${item.id}  (${result.reason})`,
    `  title:      ${item.title ?? ''}`,
    `  track:      ${item.track}`,
    `  status:     ${item.status}`,
    `  contract:   ${item.contract ?? '(none)'}`,
    `  dependsOn:  ${item.dependsOn.length ? item.dependsOn.join(', ') : '(none)'}`,
    `  unlocks:    ${item.unlocks.length ? item.unlocks.join(', ') : '(none)'}`,
    '  definitionOfDone:',
    ...item.definitionOfDone.map((line) => `    - ${line}`),
    `  verification: ${item.verification.join(', ')}`,
  ];
  if (item.handoff) {
    lines.push('  handoff:');
    lines.push(`    branch:    ${item.handoff.branch ?? ''}`);
    lines.push(`    remaining: ${(item.handoff.remaining ?? []).join(', ')}`);
    lines.push(`    resumeFrom: ${(item.handoff.resumeFrom ?? []).join(', ')}`);
  }
  if (item.note) lines.push(`  note: ${item.note}`);
  return lines.join('\n');
}

/** Filesystem-backed checks: contract paths and path-like evidence must exist. */
function looksLikePath(value) {
  return (
    typeof value === 'string' &&
    !value.includes(' ') &&
    !value.startsWith('git:') &&
    (value.includes('/') || /\.[a-z0-9]+$/i.test(value))
  );
}

export function validatePaths(roadmap, repoRoot = REPO_ROOT) {
  const errors = [];
  for (const item of roadmap.items ?? []) {
    if (looksLikePath(item.contract) && !existsSync(join(repoRoot, item.contract))) {
      errors.push(`item "${item.id}": contract path does not exist: ${item.contract}`);
    }
    if (item.status === 'done') {
      const hasRealEvidence = (item.evidence ?? []).some(
        (entry) => looksLikePath(entry) && existsSync(join(repoRoot, entry)),
      );
      if (!hasRealEvidence) {
        errors.push(`item "${item.id}": DONE requires at least one existing evidence path`);
      }
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const positional = [];
  const flags = { json: false, file: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') flags.json = true;
    else if (arg === '--file') {
      i += 1;
      flags.file = argv[i];
    } else positional.push(arg);
  }
  return { command: positional[0] ?? 'status', flags };
}

function main() {
  const { command, flags } = parseArgs(process.argv.slice(2));
  const path = flags.file ? resolve(process.cwd(), flags.file) : DEFAULT_LEDGER_PATH;

  let roadmap;
  try {
    roadmap = loadRoadmapFromFile(path);
  } catch (error) {
    console.error(`Failed to read ledger at ${path}: ${error.message}`);
    process.exit(1);
    return;
  }

  const structural = validateRoadmap(roadmap);

  if (command === 'validate') {
    const errors = [...structural, ...validatePaths(roadmap, REPO_ROOT)];
    if (errors.length > 0) {
      console.error('Roadmap ledger is INVALID:');
      for (const error of errors) console.error(`  - ${error}`);
      process.exit(1);
      return;
    }
    console.log('Roadmap ledger is valid.');
    return;
  }

  if (structural.length > 0) {
    console.error('Refusing to resolve an invalid ledger:');
    for (const error of structural) console.error(`  - ${error}`);
    process.exit(1);
    return;
  }

  if (command === 'status') {
    if (flags.json) {
      console.log(
        JSON.stringify({ eligibility: deriveEligibility(roadmap), next: resolveNext(roadmap) }, null, 2),
      );
    } else {
      console.log(renderStatus(roadmap));
    }
    return;
  }

  if (command === 'next') {
    const result = resolveNext(roadmap);
    if (flags.json) console.log(JSON.stringify(result, null, 2));
    else console.log(renderNext(result));
    return;
  }

  console.error(`Unknown command "${command}". Use: status | next | validate.`);
  process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
