# CLAUDE.md — dvla_idp_web

DVLA IDP/ICMV issuance system — frontend. Next.js 16 + React 19 + Tailwind CSS 4, TypeScript.
Talks to the backend API.

## API URL is build-time

The app reads `NEXT_PUBLIC_API_URL`. **`NEXT_PUBLIC_*` variables are inlined into the client
bundle at build time**, so the API URL must be set _before_ `next build` — not at runtime.

- Local dev: `.env.local` (e.g. `NEXT_PUBLIC_API_URL=http://localhost:5000/api`).
- Docker/deploy: passed as a build arg `NEXT_PUBLIC_API_URL` (see `Dockerfile` and the backend
  repo's `deploy/docker-compose.yml`). Pre-live value: `https://api.dvla.3dt.com.gh/api`.

## Deployment (pre-live)

Image is **built on the server** via `Dockerfile` (`npm ci` → `next build` → `next start` on
:3000). Served at `https://dvla.3dt.com.gh` behind Caddy. Orchestration lives in the backend repo
under `deploy/`.

## CI/CD (pre-live)

Push to `master` auto-deploys via `.github/workflows/deploy-prelive.yml`, which runs on a
**self-hosted GitHub Actions runner on the Hetzner box** (GitHub-hosted runners are over quota;
self-hosted minutes are free). The workflow rsyncs the checkout into `/opt/dvla/frontend` and runs
`docker compose up -d --build frontend` (image built on the box), then health-checks
`https://dvla.3dt.com.gh`. `NEXT_PUBLIC_API_URL` is supplied as a build arg from `/opt/dvla/.env`.
Manual run via the workflow's "Run workflow" (workflow_dispatch).

## Tooling

- `npm run lint` (ESLint flat config via `eslint-config-next`), `npm run format` (Prettier).
- Husky pre-commit runs `lint-staged` (eslint --fix + prettier on staged files). Husky is skipped
  in Docker builds via `HUSKY=0` / `prepare: "husky || true"`.

## Conventions

- Keep commit messages clean and human-authored — no AI/assistant attribution or co-author trailers.
- Do not commit secrets.
