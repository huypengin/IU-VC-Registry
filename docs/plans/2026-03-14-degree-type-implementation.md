# Degree Type Normalization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Normalize degree credential types so every degree credential in the registry requires `UniversityDegree`, `EducationalOccupationalCredential`, and the canonical local type `VNEduDegreeCredential`, while preserving `IUSmartCertCredential` for SmartCert credentials.

**Architecture:** Update the degree JSON-LD context and JSON Schema in both `src/registry` and `public` so the canonical type set is defined and enforced consistently. Then align examples and validation tests to the new contract, making the change intentionally breaking for older degree credentials that omit the new required types.

**Tech Stack:** TypeScript, Node.js, JSON Schema draft-07, JSON-LD, Vitest

---

### Task 1: Lock the new degree type contract in tests

**Files:**
- Modify: `tests/registry/registry-cli.spec.ts`

**Step 1: Write the failing test**

Add focused validation coverage for the degree schema so that:
- a credential with `["VerifiableCredential", "UniversityDegree", "EducationalOccupationalCredential", "VNEduDegreeCredential"]` validates
- a credential missing `UniversityDegree` fails
- a credential missing `EducationalOccupationalCredential` fails
- a credential missing `VNEduDegreeCredential` fails

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/registry/registry-cli.spec.ts`

Expected: FAIL because the current schema does not require the new canonical type set.

### Task 2: Update the degree context definitions

**Files:**
- Modify: `src/registry/contexts/iu-edu-degree-v1.jsonld`
- Modify: `public/contexts/iu-edu-degree-v1.jsonld`
- Modify: `src/registry/contexts/index.ts`
- Modify: `public/contexts/index.ts`

**Step 1: Write minimal implementation**

Add:
- `EducationalOccupationalCredential` mapped to `schema:EducationalOccupationalCredential`
- `UniversityDegree` mapped to the local vocabulary namespace
- `VNEduDegreeCredential` as the canonical local degree type

Keep all existing degree subject-field terms intact.

**Step 2: Run focused test**

Run: `npx vitest run tests/registry/registry-cli.spec.ts`

Expected: still FAIL, but now only because schema and examples are not yet aligned.

### Task 3: Enforce the canonical type set in the degree schema

**Files:**
- Modify: `src/registry/credentialSchema/iu-edu-degree-v1.schema.json`
- Modify: `public/credentialSchema/iu-edu-degree-v1.schema.json`
- Modify: `src/registry/credentialSchema/index.ts`
- Modify: `public/credentialSchema/index.ts`

**Step 1: Write minimal implementation**

Update the degree schema so `type` must include:
- `VerifiableCredential`
- `UniversityDegree`
- `EducationalOccupationalCredential`
- `VNEduDegreeCredential`

Preserve the rest of the subject schema unchanged unless a test requires adjustment.

**Step 2: Run focused test**

Run: `npx vitest run tests/registry/registry-cli.spec.ts`

Expected: PASS for the schema tests and any registry validation tests that already use the new type set.

### Task 4: Align examples and checked-in registry assets

**Files:**
- Modify: `src/examples/credential-issuance-example.ts`
- Modify: `src/examples/iu-smartcert-v1.sample.ts`
- Modify: `src/registry/contexts/iu-smartcert-v1.jsonld`
- Modify: `public/contexts/iu-smartcert-v1.jsonld`
- Modify: `README.md`

**Step 1: Write minimal implementation**

Normalize examples so degree credentials use the canonical degree type set and SmartCert examples retain `IUSmartCertCredential` in addition to the degree types. Remove references to `DegreeCredential` and `IUEducationDegreeCredential` from active examples and docs.

**Step 2: Run focused test**

Run: `npx vitest run tests/registry/registry-cli.spec.ts`

Expected: PASS

### Task 5: Run full verification

**Files:**
- No code changes expected

**Step 1: Run tests**

Run: `npm test`

Expected: PASS

**Step 2: Run build**

Run: `npm run build`

Expected: PASS

**Step 3: Run registry validation**

Run: `npm run registry:validate`

Expected: PASS

### Task 6: Commit the implementation

**Files:**
- Commit all modified implementation, test, and documentation files

**Step 1: Create commit**

```bash
git add tests/registry/registry-cli.spec.ts src/registry/contexts/iu-edu-degree-v1.jsonld public/contexts/iu-edu-degree-v1.jsonld src/registry/credentialSchema/iu-edu-degree-v1.schema.json public/credentialSchema/iu-edu-degree-v1.schema.json src/examples/credential-issuance-example.ts src/examples/iu-smartcert-v1.sample.ts src/registry/contexts/iu-smartcert-v1.jsonld public/contexts/iu-smartcert-v1.jsonld README.md
git commit -m "feat: normalize degree credential types"
```
