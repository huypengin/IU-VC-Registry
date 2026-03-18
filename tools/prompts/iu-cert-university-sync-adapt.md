The registry contract files were just updated from IU-VC-registry into this IU-cert-university repository.

Read the mirrored registry files first, then align only the downstream files that depend on them.

Constraints:
- Treat the mirrored files as the source of truth for the contract.
- Update local schemas, generated examples, tests, docs, and VC assembly logic only where needed.
- Do not modify unrelated behavior or refactor unrelated code.
- Do not rewrite the mirrored files themselves.
- Preserve IU-cert-university as an independent repo with its own local copies.

Focus on downstream files such as:
- src/schemas/1.0/schema/schema-unidegree.json
- src/schemas/1.1/schema/schema-iu-cert.json
- src/schemas/__generated__/schema.example.ts
- src/schemas/__generated__/VC_document.example.ts
- related tests and docs that encode the older contract
