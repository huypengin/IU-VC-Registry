Implement CLI and Docker workflow for IU DID web project

Goal
- Provide a CLI (`tools/registry-cli.ts`) that validates registry JSON, generates issuer key material and did.json, and copies source registry into `public/` for static hosting.
- Ensure `generate` calls the existing key generator helper and, by default, copies generated files into `public/`.
- Provide Docker multi-stage builder (Node) and runtime (nginx) that builds and serves `public/`.
- Add documentation for using `generate` to `README.md` and add `.gitignore` rules to never commit key artifacts.

Plan
1. Fix Dockerfile: use multi-stage Node builder + nginx runtime; run `node --loader ts-node/esm tools/registry-cli.ts validate && node --loader ts-node/esm tools/registry-cli.ts build` in builder stage.
2. Update `tools/registry-cli.ts`:
   - Add `generate` command that spawns `node --loader ts-node/esm ./src/registry/issuers/helper/keyGenerator.ts generate` with options.
   - Support `--no-build` flag to skip copying `src/registry` -> `public/`.
   - Make `validateDidDocuments` accept both `.well-known` and legacy `.well-know` paths.
3. Ensure `.gitignore` contains patterns to exclude `**/*.keys.json`, `**/*.encrypted.json`, etc.
4. Create `infra/nginx.conf` to serve exact file paths and ensure `.well-known` JSON-LD content types are correct.
5. Add README usage docs for `vc-registry generate` and `npm` script examples.
6. Test locally:
   - Run `node --loader ts-node/esm tools/registry-cli.ts validate`
   - Run `node --loader ts-node/esm tools/registry-cli.ts generate --issuer test-issuer --output ./tmp/test-issuer` and verify files written
   - Run `node --loader ts-node/esm tools/registry-cli.ts generate --issuer test-issuer --output ./tmp/test-issuer` and verify `public/` updated when not using `--no-build`.
7. Finalize and push.

Assumptions
- Project uses ESM and `ts-node/esm` loader for runtime TS execution.
- `src/registry/issuers/helper/keyGenerator.ts` is the canonical key generation script.

Next steps / Defer
- Add unit tests for `registry-cli` (deferred; low risk).
- Support for Windows-native executable wrappers (optional).

