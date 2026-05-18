# Funding Fit Monorepo Agent Guide

This repository is a monorepo with separate frontend and backend projects. Before making changes, work from the project directory that owns the code you are touching and prefer the package manager used by that project.

## Projects

- `frontend/` is the Next.js project.
  - To set the correct node version run 'nvm use' in the project directory.
  - It uses `pnpm`.
  - Read `frontend/AGENTS.md` before working in this project. It contains the Next.js-specific agent guidance and local docs index.
  - Common commands:
    - `cd frontend && pnpm install`
    - `cd frontend && pnpm dev`
    - `cd frontend && pnpm build`
  - don't run the linter, as it will not work.

- `fundingfit-api/` is the Python FastAPI backend.
  - It uses `uv`.
  - Common commands:
    - `cd fundingfit-api && uv sync`
    - `cd fundingfit-api && uv run uvicorn main:app --reload`
    - `cd fundingfit-api && uv run pytest`

## General Guidance

- Keep frontend and backend dependency changes scoped to their own project directories.
- Do not mix package managers. Use `pnpm` for `frontend/` and `uv` for `fundingfit-api/`.
- When changing frontend code, follow `frontend/AGENTS.md` in addition to this root guide.
- When changing backend code, prefer FastAPI and Pydantic patterns already present in `fundingfit-api/`.

## Cursor Cloud specific instructions

### Services overview

| Service | Directory | Port | Start command |
|---|---|---|---|
| Next.js frontend | `frontend/` | 3000 | `cd frontend && pnpm dev` |
| FastAPI backend | `fundingfit-api/` | 8000 | `cd fundingfit-api && uv run uvicorn main:app --reload` |

Both must run for end-to-end testing. SQLite is embedded (auto-created `fundingfit.db`); no external DB needed.

### Node version

The frontend requires Node 24.15.0 (see `frontend/.nvmrc`). Run `nvm use` inside `frontend/` before any pnpm command.

### Authentication / sessions

There is no `/api/identify` endpoint despite what the backend README says. Sessions are created lazily: send `X-Session-ID: <profile_id>` on any authenticated request and the backend upserts a session automatically. Available demo profile IDs are in `fundingfit-api/data/companies.json` — currently `profile-northlight-001`, `profile-breadbloom-001`, `profile-movefit-001`.

### Mock mode (no Anthropic key needed)

The `/api/match` and `/api/plan` endpoints accept `?mock=true` to return hardcoded responses without an `ANTHROPIC_API_KEY`. For real AI matching, set the key in `fundingfit-api/.env`.

### Frontend → backend proxy

Next.js API routes under `frontend/app/api/` proxy to the FastAPI backend. The backend URL defaults to `http://localhost:8000` — no env var override is needed for local dev.

### Linting

Per the root AGENTS.md: do not run the frontend linter (`pnpm lint`) — it will not work. Backend has no separate linter.

### Testing

- Backend: `cd fundingfit-api && uv run pytest`
- Frontend: no automated tests configured.
