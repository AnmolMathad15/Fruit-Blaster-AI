# Fruit Blaster AI

A gesture-controlled browser game where players slice falling fruits with their index finger via webcam. Uses MediaPipe Hand Landmarker for real-time hand detection.

## Run & Operate

- **Fruit Blaster game** runs via the managed artifact workflow `artifacts/fruit-blaster: web` (`pnpm --filter @workspace/fruit-blaster run dev`), served at `/`. Restart with the `WorkflowsRestart` tool using that exact name.
- **API server** runs via the managed artifact workflow `artifacts/api-server: API Server`, served at `/api`. Confirmed running and healthy after import setup.
- Imported project setup (2026-07-10): re-registered artifacts + workflows for fruit-blaster, api-server, and the mockup-sandbox canvas (artifact registration had been lost since the last import), ran `pnpm install` (node_modules was missing, causing all three workflows to fail with "vite not found" / "esbuild not found"), restarted all three services, and verified the game loads in preview and `GET /api/healthz` returns 200. `DATABASE_URL` is already set in the environment.
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Required env: `DATABASE_URL` — Postgres connection string (for API server; not used by the game)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
