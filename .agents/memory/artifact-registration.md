---
name: Artifact registration gap (imported project)
description: Project was imported from GitHub — artifact.toml files exist but weren't registered; now resolved.
---

When this project was imported from GitHub, three artifact directories were present but unregistered.

**Resolution**: The artifacts were registered by the platform (July 2026). All three are now live:
- `artifacts/fruit-blaster/` — React/Vite game (preview path `/`)
- `artifacts/api-server/` — Express API (preview path `/api`)
- `artifacts/mockup-sandbox/` — Vite mockup preview (preview path `/__mockup`)

`listArtifacts()` now returns all three. The old "Fruit Blaster" manual workflow (port 5173) and the managed `artifacts/fruit-blaster: web` workflow (port 25257) both run; they are independent. The managed one is canonical.

**Why it was an issue earlier**: `createArtifact` fails if the slug directory already exists. Platform registration happened automatically.
