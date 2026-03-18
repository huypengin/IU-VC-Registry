# AGENTS.md

## Repository Role

This repository is the authoritative registry workspace for the IU VC stack. It owns canonical registry contexts, credential schemas, issuer DID docs, public registry assets, status-list assets, and the sync tooling that mirrors contract changes into `IU-cert-university`.

If a task changes VC schema, registry surface, public credential metadata, or the deterministic sync workflow, start here first.

## Owned Surface

- canonical authoring surface under `src/registry/**`
- registry and sync tooling under `tools/**`
- status publishing logic under `src/status/**`, `src/registry-server.ts`, and `src/admin/server.ts`
- built and published output under `public/**`

## Hard Boundaries

- Treat this repo as the source of truth for registry contract and schema surface.
- Do not start schema or context changes in `IU-cert-university` and then copy them back here.
- Use the sync tooling for deterministic mirror updates into `IU-cert-university`; do not hand-edit mirrored contract files there from this repo's context.
- Do not hand-edit `public/**` when the same data is generated or published from canonical sources under `src/registry/**` or `src/status/**`.

## Commands

- Install dependencies: `npm install`
- Build TypeScript: `npm run build`
- Run all tests: `npm test`
- Run a focused Vitest file: `npx vitest run tests/path/to/spec.ts`
- Validate registry surface: `npm run registry:validate`
- Build public registry output: `npm run registry:build`
- Check downstream drift: `npm run sync:iu-cert-university -- --check`
- Write mirrored changes into the downstream repo: `npm run sync:iu-cert-university -- --write`
- Invoke downstream Codex adaptation: `npm run sync:iu-cert-university:adapt`

## Verification Expectations

- For canonical registry changes, run `npm test`, `npm run registry:validate`, and `npm run registry:build`.
- For sync-tool changes, also run the narrowest relevant tests under `tests/tools/**`.
- Use `npm run sync:iu-cert-university -- --check` before claiming the downstream mirror is aligned.

## Cross-Repo Workflow

- `IU-cert-university` is the downstream adaptation target, not the canonical schema owner.
- `waltid-identity` is a protocol reference only; consult it when validating wallet or verifier interoperability assumptions.
- The usual order is:
  1. update canonical files here
  2. verify here
  3. sync deterministic mirror files into `IU-cert-university`
  4. adapt downstream university-only copies there if needed

## Key References

- `README.md`
- `.github/instruction/AGENTS.md`
- `tools/sync-iu-cert-university.ts`
- `tools/prompts/iu-cert-university-sync-adapt.md`
- `docs/plans/2026-03-15-iu-cert-university-sync-design.md`
- `docs/plans/2026-03-15-iu-cert-university-sync-implementation.md`

## Multiagent Use

- Keep one agent responsible for canonical registry changes.
- Use read-only exploration for downstream impact analysis before editing.
- Do not run parallel workers on the same canonical registry files or the same sync tool files.
