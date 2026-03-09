# StatusList2021 Revocation Alignment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Align registry runtime output, schemas, examples, seeded public payloads, and ops documentation with one canonical wallet-facing `StatusList2021` revocation contract that keeps a stable `/status-list.json` URL while allowing mutable content updates.

**Architecture:** Keep authored assets in `src/registry/**` and examples in `src/examples/**`, keep generated output in `public/**`, and make the runtime publisher the authoritative live source for `/status/**`. Contract alignment is enforced through schema constraints, runtime publisher output, examples, and tests. Operational correctness is documented explicitly in deployment docs because the current Cloud Build path remains static-only.

**Tech Stack:** TypeScript, Vitest, Express, JSON-LD Data Integrity, static registry build tooling.

---

### Task 1: Add regression tests for the canonical publisher and allocation contract

**Files:**
- Modify: `tests/status/di-signer.spec.ts`
- Create: `tests/status/status-list-service.spec.ts`

**Step 1: Write the failing tests**

- Assert that the publisher-signing fixture uses VC v2 context and `validFrom`, not `issuanceDate`.
- Assert that allocated `credentialStatus` uses:
  - `type = StatusList2021Entry`
  - `statusPurpose = revocation`
  - `statusListCredential` ending in `/status-list.json`
  - optional `id` that, if emitted, equals `${statusListCredential}#${statusListIndex}`

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/status/di-signer.spec.ts tests/status/status-list-service.spec.ts`

Expected: failures caused by old publisher temporal fields and missing service contract coverage.

**Step 3: Write minimal implementation**

- Update runtime publisher and/or testable helpers so the new tests pass.

**Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/status/di-signer.spec.ts tests/status/status-list-service.spec.ts`

Expected: PASS

### Task 2: Normalize runtime publisher output

**Files:**
- Modify: `src/status/status-list-publisher.ts`
- Modify: `src/status/status-list-service.ts`

**Step 1: Enforce canonical publisher shape**

- Publish VC v2 context.
- Emit `validFrom` instead of `issuanceDate`.
- Keep canonical `id`, `credentialSubject.id`, `type`, `statusPurpose`, and `encodedList`.

**Step 2: Normalize allocation output**

- Keep canonical `/status-list.json` URL.
- Make `credentialStatus.id` explicit and derived from `statusListCredential` plus `statusListIndex`, or keep it omitted consistently if tests/documentation choose omission.
- Keep `statusListIndex` as a decimal string.

**Step 3: Re-run focused tests**

Run: `npx vitest run tests/status/di-signer.spec.ts tests/status/status-list-service.spec.ts`

Expected: PASS

### Task 3: Normalize authored schemas and examples

**Files:**
- Modify: `src/registry/credentialSchema/iu-smartcert-v1.schema.json`
- Modify: `src/registry/credentialSchema/iu-edu-degree-v1.schema.json`
- Modify: `src/registry/credentialSchema/iu-edu-transcript-v1.schema.json`
- Modify: `src/examples/iu-smartcert-v1.sample.ts`
- Modify: `src/examples/credential-issuance-example.ts`

**Step 1: Make `credentialStatus.id` optional in schemas**

- Remove `id` from required fields.
- Keep `id` property definition so examples remain valid when included.

**Step 2: Constrain transcript schema to the same `StatusList2021Entry` contract**

- Replace generic `credentialStatus: object` with the canonical revocation entry shape.

**Step 3: Normalize examples**

- Keep canonical `/status-list.json` URL.
- Ensure example `credentialStatus.id`, when included, is derived from the canonical URL and index.
- Keep VC-v2-oriented issuance style where already used.

**Step 4: Run validation**

Run: `npm run registry:validate`

Expected: PASS

### Task 4: Regenerate public assets and align seeded payloads

**Files:**
- Modify: `src/registry/status/degree/2025/status-list.json`
- Regenerate: `public/credentialSchema/**`
- Regenerate: `public/contexts/**` if touched by build inputs
- Regenerate: `public/status/**`

**Step 1: Align seeded status-list payload with runtime publisher shape**

- Keep seeded sample on canonical status-list contract and VC-v2 temporal style.

**Step 2: Rebuild public assets**

Run: `npm run registry:build`

Expected: `public/**` mirrors `src/registry/**` with canonical URLs and schema changes.

**Step 3: Spot-check generated output**

- Check generated public credential schemas.
- Check generated `public/status/degree/2025/status-list.json`.

### Task 5: Document mutable `/status/**` serving requirement

**Files:**
- Modify: `README.md`
- Modify: `cloudbuild.yaml`
- Modify: `infra/docker-compose.yml`
- Optionally modify: `infra/Dockerfile.nginx`

**Step 1: Document the operational requirement**

- Explain that wallet-visible revocation requires mutable runtime-backed `/status/**`.
- State clearly that nginx-only static deployment is insufficient unless `/status/**` is backed separately.

**Step 2: Minimize misleading deployment messaging**

- Add comments or documentation in deployment files showing that current Cloud Build path is static-only for registry assets.
- Do not redesign deployment in this task.

**Step 3: Re-run validation**

Run: `npm run registry:validate`

Expected: PASS

### Task 6: Full verification and delivery

**Files:**
- Review all changed files

**Step 1: Run full verification**

Run:
- `npm test`
- `npm run registry:validate`
- `npm run registry:build`

Expected: PASS

**Step 2: Review for remaining drift**

- Confirm runtime publisher shape matches seeded/public payload shape.
- Confirm schemas accept optional `credentialStatus.id`.
- Confirm `/status/**` cache policy remains short-lived or revalidatable.

**Step 3: Commit and publish**

Run:
- `git add ...`
- `git commit -m "feat: align registry status list contract"`
- `git push -u origin feat/statuslist2021-alignment`
- `gh pr create ...`
