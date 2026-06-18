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

Image is **built on the server** (no CI/registry) via `Dockerfile` (`npm ci` → `next build` →
`next start` on :3000). Served at `https://dvla.3dt.com.gh` behind Caddy. Orchestration lives in
the backend repo under `deploy/`.

## Tooling

- `npm run lint` (ESLint flat config via `eslint-config-next`), `npm run format` (Prettier).
- Husky pre-commit runs `lint-staged` (eslint --fix + prettier on staged files). Husky is skipped
  in Docker builds via `HUSKY=0` / `prepare: "husky || true"`.

## Conventions

- Keep commit messages clean and human-authored — no AI/assistant attribution or co-author trailers.
- Do not commit secrets.
