# IU Cert University Sync Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a deterministic sync command in `IU-VC-registry` that mirrors registry contract files into `IU-cert-university`, plus a second command that invokes Codex CLI there for downstream adaptation.

**Architecture:** Implement one TypeScript tool that owns the mirror manifest, file comparison, copy behavior, and optional `codex exec` invocation. Expose it via npm scripts so registry changes can be propagated with a short, repeatable command sequence while keeping the university repo independent.

**Tech Stack:** TypeScript, Node.js `fs` and `child_process`, Vitest

---

### Task 1: Lock sync behavior in tests

**Files:**
- Modify: `tests/registry/registry-cli.spec.ts`
- Create: `tests/tools/sync-iu-cert-university.spec.ts`

**Step 1: Write the failing test**

Add tests that verify:
- `--check` reports drift when target mirror files differ from registry source files
- `--write` creates the target mirror directories and copies the files
- the tool prints changed file paths
- the Codex command runner builds the expected `codex exec` invocation without mutating files during the test

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/tools/sync-iu-cert-university.spec.ts`

Expected: FAIL because the sync tool does not exist yet.

### Task 2: Implement deterministic mirror sync

**Files:**
- Create: `tools/sync-iu-cert-university.ts`
- Modify: `package.json`

**Step 1: Write minimal implementation**

Implement:
- default target repo path for `IU-cert-university`
- mirror manifest for the degree context and degree schema
- `--check` mode
- `--write` mode
- diff detection via exact file content comparison
- clear stdout/stderr reporting and non-zero exit codes on drift or missing paths

**Step 2: Run focused test**

Run: `npx vitest run tests/tools/sync-iu-cert-university.spec.ts`

Expected: PASS for sync behavior tests, while Codex-related tests still fail if not implemented yet.

### Task 3: Implement Codex adaptation command

**Files:**
- Modify: `tools/sync-iu-cert-university.ts`
- Create: `tools/prompts/iu-cert-university-sync-adapt.md`
- Modify: `package.json`

**Step 1: Write minimal implementation**

Add an `adapt` mode or companion command that:
- invokes `codex exec`
- sets the working directory to `IU-cert-university`
- passes a prompt telling Codex to read mirrored files and align local schemas/examples/tests/docs only where needed

Keep prompt content on disk so it is reviewable and editable.

**Step 2: Run focused test**

Run: `npx vitest run tests/tools/sync-iu-cert-university.spec.ts`

Expected: PASS

### Task 4: Add lightweight operator documentation

**Files:**
- Modify: `README.md`

**Step 1: Write minimal documentation**

Document:
- the source-of-truth model
- `sync:iu-cert-university`
- `sync:iu-cert-university:adapt`
- recommended operator flow after registry schema changes

**Step 2: Run focused verification**

Run: `npx vitest run tests/tools/sync-iu-cert-university.spec.ts tests/registry/registry-cli.spec.ts`

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

### Task 6: Commit the implementation

**Files:**
- Commit all implementation, test, prompt, and documentation files for the sync workflow

**Step 1: Create commit**

```bash
git add package.json README.md tools/sync-iu-cert-university.ts tools/prompts/iu-cert-university-sync-adapt.md tests/tools/sync-iu-cert-university.spec.ts vitest.config.ts
git commit -m "feat: add iu-cert-university sync workflow"
```
