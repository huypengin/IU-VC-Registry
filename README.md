# IU DID Web – Subject templates scaffold

This repository now contains the scaffolding for the upcoming *subject template* feature. The new module mirrors the existing context/schema service pattern and is intentionally framework-agnostic so that it can plug into whichever HTTP server (Express, Fastify, etc.) the application eventually adopts.

## Subject service

* `src/types/subject.ts` – strongly typed definitions for subject template metadata and fields.
* `src/services/subject-service.ts` – lightweight in-memory implementation exposing `listTemplates`/`getTemplate` helpers. Replace the constructor data source when real storage becomes available.

## Placeholder routes

`src/routes/subject-routes.ts` exports an Express router that is only enabled when the `FEATURE_SUBJECT_TEMPLATES` environment variable is set to `true`. When the flag is disabled the endpoints intentionally return `404` responses so that the router can be mounted today without leaking unfinished functionality.

### Routes (behind the flag)

* `GET /subjects/templates` – returns all templates via the service layer.
* `GET /subjects/templates/:id` – returns a single template, or a 404 if the identifier is unknown.

Mount the router wherever you register the rest of the application routes:

```ts
import subjectRouter from './routes/subject-routes';
app.use(subjectRouter);
```

## Developer notes

1. Keep the subject service API aligned with any context/schema services so that shared tooling continues to work.
2. Use the provided TypeScript definitions when expanding the template model to guarantee downstream consumers receive complete metadata.
3. Update this README as the subject templates feature graduates from the placeholder state (e.g., when the feature flag is removed or more endpoints are added).
