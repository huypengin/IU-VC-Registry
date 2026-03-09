# StatusList2021 Revocation Alignment Design

**Date:** 2026-03-09

## Goal

Standardize `IU-VC-registry` on one wallet-facing `StatusList2021` contract end to end so that registry schemas, examples, seeded public payloads, runtime allocation output, and published status-list credentials all agree with the `IU-cert-university` wallet-facing revocation model.

## Non-goals

- Do not redesign revocation cryptography.
- Do not remove smart-contract anchoring or audit logging.
- Do not migrate to Bitstring Status List.
- Do not broadly redesign unrelated VC contexts or issuance flows.

## Canonical Contract

### Wallet-facing `credentialStatus`

Canonical shape:

```json
{
  "type": "StatusList2021Entry",
  "statusPurpose": "revocation",
  "statusListCredential": "https://.../status/<category>/<year>/status-list.json",
  "statusListIndex": "<decimal string>",
  "id": "https://.../status/<category>/<year>/status-list.json#<index>"
}
```

Rules:

- `statusListCredential` must use the concrete `/status-list.json` URL.
- Bare path forms may exist only as redirect aliases, not as canonical values in runtime output, schemas, examples, or seeded public payloads.
- `statusListIndex` is emitted as a decimal string.
- `credentialStatus.id` is optional in schemas and TypeScript types.
- If `credentialStatus.id` is present, it must equal `${statusListCredential}#${statusListIndex}`.

### Published status-list credential

Canonical shape:

- `@context`: `https://www.w3.org/ns/credentials/v2`, `https://w3id.org/vc/status-list/2021/v1`, and `https://w3id.org/security/data-integrity/v2`
- `id`: canonical `/status-list.json` URL
- `type`: `["VerifiableCredential", "StatusList2021Credential"]`
- `issuer`: issuer DID
- `validFrom`: publication timestamp
- `credentialSubject.id`: `${id}#list`
- `credentialSubject.type`: `StatusList2021`
- `credentialSubject.statusPurpose`: `"revocation"`
- `credentialSubject.encodedList`: current bitstring

The registry uses VC-v2-oriented temporal semantics for the published status-list credential: `validFrom` is authoritative and `issuanceDate` is not emitted by the publisher.

## Source of Truth

- `src/registry/credentialSchema/**`, `src/registry/contexts/**`, and `src/examples/**` remain authored sources.
- `public/**` remains generated output from `npm run registry:build`.
- `src/registry/status/**` is a seeded reference payload for canonical shape only.
- Live revocation state is owned by the runtime status storage plus publisher, not by checked-in `src/registry/status/**` files.

## Runtime Behavior

Revocation must work by updating the content served at a stable status-list URL:

1. Issuance allocates a `StatusList2021Entry` using the canonical `statusListCredential` URL.
2. Revocation resolves the list by `statusListCredential`, then updates the bit at `statusListIndex`.
3. The publisher rewrites the same `status-list.json` file at the same URL with a fresh `encodedList`.
4. Wallets re-fetch the same URL and observe the bit transition from `0` to `1`.

This design keeps the status-list URL stable and makes the file content mutable.

## Operational Requirement

Wallet-visible revocation is only valid if `/status/**` is served from writable runtime-backed storage or direct dynamic API output.

Implications:

- A static build alone is insufficient for live revocation.
- The current local runtime path supports mutable status payloads:
  - `src/status/status-list-publisher.ts` writes `public/status/**`
  - `src/registry-server.ts` serves `/status/**` with short-lived caching
  - local Docker comments expect shared writable status storage
- The current Cloud Build deployment described in `cloudbuild.yaml` builds and deploys the nginx-only image from `infra/Dockerfile.nginx`, which is static-only unless `/status/**` is backed separately.

The repo must document this mismatch clearly. Registry contract alignment alone does not guarantee live revocation in production.

## Caching Requirement

- `/status/**` must use short-lived or revalidatable caching.
- Schemas, contexts, and DID documents may keep longer-lived immutable caching.
- The runtime server should continue distinguishing cache policy for `/status/**` from the rest of the registry.

## Current Drift To Remove

1. `src/status/status-list-service.ts` allocates `credentialStatus` without `id`, while multiple schemas require `id`.
2. `src/status/status-list-publisher.ts` emits VC v1 context plus `issuanceDate`, while seeded and public `status-list.json` use VC v2 plus `validFrom`.
3. `tests/status/di-signer.spec.ts` only exercises the old publisher shape.
4. `src/registry/credentialSchema/iu-edu-transcript-v1.schema.json` leaves `credentialStatus` unconstrained while other schemas define the `StatusList2021Entry` contract.
5. Checked-in deployment files still present an nginx-only static deployment path that does not satisfy mutable `/status/**` requirements.

## Implementation Boundaries

Required:

- Runtime allocation output
- Runtime publisher shape
- Credential schemas and public generated copies
- Examples and seeded status-list payloads
- Tests covering the canonical status-list publisher shape
- Documentation of mutable `/status/**` serving requirement

Out of scope:

- New revocation mechanisms
- Broader context redesign not required for canonical `StatusList2021`
- Smart-contract revocation removal
