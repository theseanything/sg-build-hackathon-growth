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
    - `cd frontend && pnpm lint`

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
