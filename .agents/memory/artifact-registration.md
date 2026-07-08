---
name: Artifact registration for imported GitHub projects
description: How to register pre-existing artifact.toml files that aren't yet known to the platform after a GitHub import
---

## Rule
When a project is imported from GitHub, artifact.toml files may exist on disk under `artifacts/<slug>/.replit-artifact/artifact.toml` but won't appear in `listArtifacts()`. Use `verifyAndReplaceArtifactToml` (write the existing content to a sibling `.edit.toml` and call the callback) to trigger platform registration without needing to recreate the artifact from scratch.

**Why:** `createArtifact()` fails if the directory already exists. `verifyAndReplaceArtifactToml` validates and replaces the toml, which causes the platform to register all artifacts whose toml files are touched.

**How to apply:** After a GitHub import, check `listArtifacts()` — if empty despite artifact.toml files existing on disk, write a copy of each artifact.toml to a sibling `.edit.toml` and call `verifyAndReplaceArtifactToml` for each one. The platform will auto-register them and create managed workflows.
