/**
 * Type declarations for the dependency-free roadmap engine in `roadmap.mjs`.
 * These exist so the TypeScript test suite can import the pure functions with
 * full type safety without the engine itself depending on a TypeScript toolchain
 * at runtime.
 */

export type RoadmapStatus = 'planned' | 'ready' | 'wip' | 'blocked' | 'done' | 'superseded';

export interface RoadmapBlocker {
  reason: string;
  unblockedBy?: string;
}

export interface RoadmapHandoff {
  branch?: string;
  lastKnownGoodCommit?: string;
  completed?: readonly string[];
  remaining?: readonly string[];
  knownIssues?: readonly string[];
  resumeFrom?: readonly string[];
}

export interface RoadmapItem {
  id: string;
  track: string;
  curriculumId: string | null;
  title: string;
  status: RoadmapStatus;
  priority: number;
  dependsOn: readonly string[];
  contract: string | null;
  definitionOfDone: readonly string[];
  verification: readonly string[];
  evidence: readonly string[];
  unlocks: readonly string[];
  blocker: RoadmapBlocker | null;
  handoff: RoadmapHandoff | null;
  note: string | null;
}

export interface Roadmap {
  version: number;
  about: string;
  states: readonly RoadmapStatus[];
  tracks: readonly string[];
  legalTransitions: readonly (readonly [RoadmapStatus, RoadmapStatus])[];
  globalDefinitionOfDone: string;
  items: RoadmapItem[];
}

export interface Eligibility {
  id: string;
  track: string;
  status: RoadmapStatus;
  dependenciesSatisfied: boolean;
  eligible: boolean;
  kind: 'resume' | 'ready' | 'none';
}

export interface NextResult {
  item: RoadmapItem | null;
  reason: 'resume-wip' | 'ready' | 'no-executable-work';
  blockers: { id: string; reason: string }[];
}

export const REPO_ROOT: string;
export const DEFAULT_LEDGER_PATH: string;

export function loadRoadmapFromFile(path?: string): Roadmap;
export function indexById(roadmap: Roadmap): Map<string, RoadmapItem>;
export function dependenciesSatisfied(item: RoadmapItem, byId: Map<string, RoadmapItem>): boolean;
export function validateRoadmap(roadmap: unknown): string[];
export function deriveEligibility(roadmap: Roadmap): Eligibility[];
export function resolveNext(roadmap: Roadmap): NextResult;
export function renderStatus(roadmap: Roadmap): string;
export function renderNext(result: NextResult): string;
export function validatePaths(roadmap: Roadmap, repoRoot?: string): string[];
