# Degree Type Normalization Design

**Date:** 2026-03-14

**Goal:** Normalize the registry's degree credential typing so every degree credential requires `UniversityDegree` for verifier interoperability, `EducationalOccupationalCredential` for Schema.org semantics, and one canonical local degree type for registry-specific identification.

## Problem

The registry currently uses multiple inconsistent degree type names:

- `DegreeCredential` in `src/registry/contexts/iu-edu-degree-v1.jsonld`
- `VNEduDegreeCredential` in `src/registry/contexts/iu-smartcert-v1.jsonld`
- `IUEducationDegreeCredential` in `src/examples/credential-issuance-example.ts`

This creates drift between contexts, schema examples, and issuer-facing samples. Separately, the deployment context requires `UniversityDegree` because walt.id verifier initialization expects that type. The user also wants richer semantic modeling using Schema.org.

## Requirements

- Every degree credential must require `UniversityDegree`
- Every degree credential must require `EducationalOccupationalCredential`
- Degree credentials must still identify the local registry-specific degree profile with one canonical local type
- `IUSmartCertCredential` must remain available for IU SmartCert credentials and must not be removed from SmartCert examples
- Validation should become strict for the new required type set, even if that breaks older degree credentials

## Ecosystem Direction

- `UniversityDegreeCredential` is common in W3C example material, but it is not a universal verifier requirement
- `EducationalOccupationalCredential` is the stronger semantic anchor from Schema.org
- `UniversityDegree` is an operational interop type required by the user's walt.id verifier flow

## Decision

Use a hybrid type strategy for all degree credentials:

```json
[
  "VerifiableCredential",
  "UniversityDegree",
  "EducationalOccupationalCredential",
  "VNEduDegreeCredential"
]
```

`VNEduDegreeCredential` becomes the single canonical local degree type. The older local aliases are removed from active examples and validation logic.

## Context Design

Update the degree context in both source and public copies to:

- add `EducationalOccupationalCredential` mapped to `schema:EducationalOccupationalCredential`
- add `UniversityDegree` as an explicit term in the local vocabulary namespace
- expose the canonical local type `VNEduDegreeCredential`
- preserve existing subject-property terms for degree payload fields

This keeps semantic meaning in the shared vocabulary while giving the verifier the exact operational type it expects.

## Schema Design

Update the degree JSON Schema in both source and public copies so the VC `type` field must include:

- `VerifiableCredential`
- `UniversityDegree`
- `EducationalOccupationalCredential`
- `VNEduDegreeCredential`

This should be enforced whether `type` is expressed as a string or array today, though the practical target is the array form because multiple required types are now mandatory.

## Example And Documentation Design

Update degree credential examples and docs to emit the canonical degree type set. Preserve `IUSmartCertCredential` where the credential is an IU SmartCert credential, so SmartCert examples can still look like:

```json
[
  "VerifiableCredential",
  "UniversityDegree",
  "EducationalOccupationalCredential",
  "VNEduDegreeCredential",
  "IUSmartCertCredential"
]
```

## Testing Strategy

Add or update tests to verify:

- validation passes for credentials with the full required degree type set
- validation fails when `UniversityDegree` is missing
- validation fails when `EducationalOccupationalCredential` is missing
- examples and registry validation commands stay aligned with the new type contract

## Migration Impact

This is a breaking validation change for previously issued degree credentials that do not include the new required type set. The registry will intentionally prefer strict forward validation over backward compatibility.
