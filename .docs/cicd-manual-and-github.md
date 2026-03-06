# CI/CD Deployment Guide (Manual and GitHub Trigger)

This document explains two deployment paths for `infra-vc-registry-web`:
- Manual deployment from local machine
- GitHub-triggered deployment (Cloud Build auto deploy on `main`)

## Shared Configuration

- Project: `iu-smartcert-vc`
- Region: `asia-east2`
- Artifact Registry repo: `vc-registry`
- Image name: `infra-vc-registry-web`
- Cloud Run service: `infra-vc-registry-web`
- Cloud Run URL: `https://infra-vc-registry-web-911368042037.asia-east2.run.app`

Image URI format:

```bash
asia-east2-docker.pkg.dev/iu-smartcert-vc/vc-registry/infra-vc-registry-web:<TAG>
```

## Way 1: Manual CI/CD (Local Commands)

Use this when you want a direct one-off deployment from local machine.

### Steps

1. Authenticate and set project:

```bash
gcloud auth login
gcloud config set project iu-smartcert-vc
```

2. Authenticate Docker to Artifact Registry:

```bash
gcloud auth configure-docker asia-east2-docker.pkg.dev
```

3. Build image (important: use `infra/Dockerfile.nginx` and correct build arg):

```bash
TAG=manual-$(date +%Y%m%d-%H%M%S)
docker build \
  -f infra/Dockerfile.nginx \
  --build-arg REGISTRY_BASE_URL=https://infra-vc-registry-web-911368042037.asia-east2.run.app \
  -t asia-east2-docker.pkg.dev/iu-smartcert-vc/vc-registry/infra-vc-registry-web:$TAG \
  .
```

4. Push image:

```bash
docker push asia-east2-docker.pkg.dev/iu-smartcert-vc/vc-registry/infra-vc-registry-web:$TAG
```

5. Deploy to Cloud Run:

```bash
gcloud run deploy infra-vc-registry-web \
  --image=asia-east2-docker.pkg.dev/iu-smartcert-vc/vc-registry/infra-vc-registry-web:$TAG \
  --region=asia-east2 \
  --platform=managed
```

Note: do not pass `--set-env-vars` if you want to keep existing Cloud Run environment variables unchanged.

6. Verify:

```bash
gcloud run revisions list \
  --service=infra-vc-registry-web \
  --region=asia-east2 \
  --limit=1
```

## Way 2: GitHub CI/CD (Auto on Push to `main`)

Use this for standard team workflow and repeatable deployments.

### Flow

`git push origin main` -> Cloud Build Trigger -> Build -> Push Artifact Registry -> Deploy Cloud Run

### Current Setup (already configured)

- Build config file: `cloudbuild.yaml`
- Connection: `iu-vc-registry-conn` (Cloud Build <-> GitHub)
- Connected repository: `iu-vc-registry-repo` (`nathang0147/IU-VC-registry`)
- Trigger name: `infra-vc-registry-web-main`
- Trigger region: `asia-east2`
- Branch pattern: `^main$`

### How to use day-to-day

1. Commit your changes.
2. Push to `main`.
3. Monitor build:

```bash
gcloud builds list --region=asia-east2 --limit=5
```

4. Inspect latest revision:

```bash
gcloud run revisions list \
  --service=infra-vc-registry-web \
  --region=asia-east2 \
  --limit=3
```

## Struggles We Hit (and Fixes)

### 1) GitHub trigger creation failed with `Repository mapping does not exist`
- Cause: repo was not connected to Cloud Build.
- Fix: create Cloud Build GitHub connection, complete OAuth, then create repository mapping.

### 2) Connection setup failed due Secret Manager errors
- Cause: `secretmanager.googleapis.com` disabled and missing permissions for Cloud Build service agent.
- Fix: enable Secret Manager API and grant service agent `roles/secretmanager.admin`.

### 3) Trigger creation returned generic `INVALID_ARGUMENT`
- Cause: trigger needed explicit service account in this project setup.
- Fix: create trigger with `--service-account=projects/iu-smartcert-vc/serviceAccounts/911368042037-compute@developer.gserviceaccount.com`.

### 4) Build step 0 failed (`docker build`) because no root `Dockerfile`
- Cause: pipeline used `docker build .` with default Dockerfile lookup.
- Fix: set `-f infra/Dockerfile.nginx` in `cloudbuild.yaml`.

### 5) Build rejected when trigger service account is set
- Cause: Cloud Build policy requires explicit logging behavior when `build.service_account` is used.
- Fix: set in `cloudbuild.yaml`:

```yaml
options:
  logging: CLOUD_LOGGING_ONLY
```

### 6) Cloud Run deploy failed with `iam.serviceaccounts.actAs denied`
- Cause: deploying service account lacked permission to act as runtime service account.
- Fix: grant `roles/iam.serviceAccountUser` on `911368042037-compute@developer.gserviceaccount.com` to itself (and to Cloud Build SA as needed).

### 7) Missing role coverage for deploy path
- Cause: trigger service account initially lacked complete roles for build+deploy path.
- Fix: grant required project roles:
  - `roles/artifactregistry.writer`
  - `roles/run.admin`
  - `roles/logging.logWriter`

## Practical Recommendation

- Use manual path for urgent hotfixes.
- Use GitHub-triggered path for normal releases.
- Keep `cloudbuild.yaml` and IAM bindings as source-of-truth and review them when onboarding a new project.
