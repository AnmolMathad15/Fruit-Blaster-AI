---
name: Artifact registration gap (imported project)
description: Project was imported from GitHub — artifact.toml files exist but artifacts aren't registered in Replit's system
---

When this project was imported from GitHub, three artifact directories were present:
- `artifacts/fruit-blaster/` — React/Vite game
- `artifacts/api-server/` — Express API
- `artifacts/mockup-sandbox/` — Vite mockup preview

`listArtifacts()` returns `[]` — none are registered. As a result:
- Managed artifact workflows don't exist
- `WorkflowsRestart` with artifact workflow names fails
- `Screenshot` tool's `appPreview` type can't find them

**Workaround in place:** `configureWorkflow` was used to run the fruit-blaster game manually:
- Command: `PORT=5173 BASE_PATH=/ pnpm --filter @workspace/fruit-blaster run dev`
- Port: 5173 (must be in the supported list; original artifact.toml used 25257 which is unsupported)

**Why:** `createArtifact` fails if the slug directory already exists. The proper fix is Task #4: register all three artifacts through the Replit artifact system.
