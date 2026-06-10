# Deployment

## Status

Cloud deployment is planned but not active. Milestone 2 includes a backend
Dockerfile, a local Compose service, Alembic migrations, and CI image-build
validation. No cloud resources, credentials, or automated deployments exist.

## Option A

```mermaid
flowchart LR
    User --> Cloudflare[Cloudflare DNS]
    Cloudflare --> CloudFront[AWS CloudFront]
    CloudFront --> Static[AWS S3 static frontend]
    Static --> API[FastAPI container]
    API --> Supabase[(Supabase PostgreSQL and Auth)]
    API -. future files .-> Files[AWS S3 files bucket]
```

### Frontend

The Next.js frontend will be designed for static export, uploaded to a private
S3 bucket, and served through CloudFront. Cloudflare will manage the domain and
DNS. CloudFront provides CDN delivery and HTTPS at the AWS edge.

Server-only Next.js features must not be introduced without reconsidering the
static hosting decision.

### Backend

FastAPI runs in a Docker container locally. A later milestone will choose
between ECS/Fargate and Elastic Beanstalk based on cost, learning value, and
operational complexity.

S3 cannot execute the backend.

### CI/CD

Pull requests and pushes to `main` run frontend lint, typecheck, formatting, and
static build checks, plus backend lint, formatting, tests, and Docker image
builds. Main-branch deployment will later use GitHub Actions and AWS OIDC rather
than long-lived AWS keys.

Migrations must be run as an explicit, observable deployment step before code
that requires the new schema receives traffic.
