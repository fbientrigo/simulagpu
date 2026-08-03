# ADR-0005 — The Anki TSV is generated, not committed

Status: Accepted
Date: 2026-08-03

## Context

Anki cards are authored in YAML (`anki/cards/*.yaml`) and imported as TSV. The
site must serve that TSV as a static download, which means it has to exist under
`apps/docs/public/` at build time.

The easy path is to commit the generated file. That creates two problems:

- every card edit produces two diffs, one meaningful and one mechanical, and
  reviewers learn to skim both;
- the two can disagree. A regenerated-but-not-committed TSV, or a hand-edited
  one, and the published cards silently stop matching the source.

There is also a rule this repository holds itself to: no generated assets in
Git. Committing this file would be the first exception, and exceptions
accumulate.

## Decision

The TSV is a build artefact.

- Output path: `apps/docs/public/descargas/simulagpu-anki.tsv`.
- Git-ignored (`apps/docs/public/descargas/*.tsv`).
- `pnpm dev` and `pnpm build` run `pnpm anki:build` first, so local development
  and the production build both have it.
- CI regenerates it before building the site.

Generation is deterministic, which is what makes the arrangement safe:

- cards sorted by `id`, so file order and authoring order cannot change the
  output;
- no timestamps, no hostnames, no version strings in the file;
- LF line endings, single trailing newline;
- a stable HTML conversion (backtick spans become escaped `<code>`, newlines
  become `<br>`).

`node anki/scripts/build-anki.mjs --check` verifies an existing file matches
what the sources produce, without writing.

## Consequences

**Easy**

- A card diff is a card diff.
- The published file cannot drift from its source, because it is produced from
  it every time.
- `tests/anki-build.test.ts` asserts two runs produce identical bytes, so a
  non-deterministic change to the generator fails CI instead of showing up as a
  mysterious diff later.

**Hard**

- The file is absent in a fresh clone until something generates it. Anyone
  running `vitepress build` directly, bypassing `pnpm build`, gets a site with a
  broken download link. Mitigated by wiring generation into `dev` and `build`,
  and by documenting it in `anki/README.md`.
- One more step CI must not forget. It is a step, not a convention: the site
  build depends on it.

**Forbidden**

- Committing anything under `apps/docs/public/descargas/`.
- Hand-editing the TSV. The YAML is the source.

## Alternatives considered

**Commit the TSV.** Simplest, and the file is always there. Rejected: generated
diffs on every card change, and a real drift risk.

**Generate at request time.** Needs a server. The site is static.

**Skip the TSV and link to the YAML.** Honest, and useless to a learner — Anki
cannot import it.
