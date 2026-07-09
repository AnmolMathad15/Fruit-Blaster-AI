---
name: Artifact registration gap after GitHub import
description: listArtifacts() returns empty even though artifact.toml exists on disk; fix via verifyAndReplaceArtifactToml.
---

Symptom: a project imported from GitHub (or otherwise not created via `createArtifact()` in
this session) has a valid `.replit-artifact/artifact.toml` on disk, but `listArtifacts()`
returns `[]` and no workflow is registered, so `WorkflowsRestart` fails with "workflow doesn't
exist".

**Why:** the artifact registry is populated from a registration event, not just the presence of
the TOML file on disk. Files copied in via import don't trigger that event.

**How to apply:** read the existing `artifact.toml`, write it unchanged to a sibling
`artifact.edit.toml`, and call `verifyAndReplaceArtifactToml({ tempFilePath, artifactTomlPath })`.
This triggers re-registration (workflows get created, `listArtifacts()` starts returning the
artifact) without needing `createArtifact()` (which would fail on the already-used slug).
