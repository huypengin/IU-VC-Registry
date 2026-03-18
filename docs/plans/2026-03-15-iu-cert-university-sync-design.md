# IU Cert University Sync Design

**Date:** 2026-03-15

**Goal:** Add a semi-automatic workflow in `IU-VC-registry` that copies canonical contract artifacts into `IU-cert-university`, then optionally invokes Codex CLI there to adapt local schemas, examples, tests, and docs to the updated contract.

## Problem

`IU-VC-registry` and `IU-cert-university` are distinct repositories with separate copies of the VC contract. A schema or context change in the registry frequently requires coordinated updates in the university repo, but there is no repeatable workflow for that propagation.

Using Codex alone as the sync mechanism is too loose because the canonical contract files already exist and should be copied exactly. Manual copy/paste is deterministic, but error-prone and easy to skip.

## Decision

Use a two-step semi-automatic workflow owned by `IU-VC-registry`:

1. Deterministic file sync
2. Optional Codex adaptation

The registry remains the source of truth. The university repo keeps its own copies and does not import from the registry at runtime.

## Sync Workflow

### Step 1: Deterministic sync

Add a TypeScript command in `IU-VC-registry` that:

- verifies the `IU-cert-university` repo path exists
- copies a fixed set of canonical contract files from the registry repo into a dedicated mirror folder inside the university repo
- reports which files changed
- supports `--check` for drift detection and `--write` for updating files

The sync step should not attempt semantic adaptation. It only copies exact artifacts.

### Step 2: Codex adaptation

Add a second command in `IU-VC-registry` that invokes `codex exec` against `IU-cert-university` with a focused prompt instructing it to:

- read the mirrored contract files
- update local schema/example/test/doc files that encode the old contract
- avoid unrelated changes

This keeps the contract deterministic while still allowing intelligent downstream adaptation.

## Mirror Scope

The first version should mirror only the contract surface:

- `src/registry/contexts/iu-edu-degree-v1.jsonld`
- `src/registry/credentialSchema/iu-edu-degree-v1.schema.json`

These should be copied into a dedicated mirror location inside `IU-cert-university`:

- `src/schemas/registry-mirror/contexts/iu-edu-degree-v1.jsonld`
- `src/schemas/registry-mirror/credentialSchema/iu-edu-degree-v1.schema.json`

This mirror path makes the ownership explicit and avoids overwriting the university repo's local schema/example files directly.

## Codex Adaptation Scope

The Codex step should be prompted to review and update local files such as:

- `src/schemas/1.0/schema/schema-unidegree.json`
- `src/schemas/1.1/schema/schema-iu-cert.json`
- `src/schemas/__generated__/schema.example.ts`
- `src/schemas/__generated__/VC_document.example.ts`
- related tests and docs if the mirrored contract changed

The Codex step should not rewrite mirrored files because those are owned by the deterministic sync step.

## CLI Shape

Recommended commands in `IU-VC-registry`:

```bash
npm run sync:iu-cert-university -- --write
npm run sync:iu-cert-university:adapt
```

Optional drift check:

```bash
npm run sync:iu-cert-university -- --check
```

## Safety Requirements

- fail clearly if the target repo path is missing
- fail clearly if any source file is missing
- create missing mirror directories in the target repo
- print changed file paths and whether they were copied
- avoid deleting files in the target repo
- keep the Codex prompt scoped to mirrored changes and downstream alignment only

## Verification Strategy

For `IU-VC-registry`:

- unit/integration tests for the sync tool
- existing test suite still passes

For `IU-cert-university`:

- the deterministic sync step should be verifiable with `--check`
- the Codex step is advisory/automation for follow-up edits and should be reviewed in that repo before commit

## Non-Goals

- shared package imports between the two repos
- automatic cross-repo PR creation
- CI-driven Codex mutation in the university repo
- syncing the entire registry repo
