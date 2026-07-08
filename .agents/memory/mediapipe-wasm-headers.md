---
name: MediaPipe WASM headers
description: COOP/COEP headers required for MediaPipe hand tracking WASM (SharedArrayBuffer) — where they're set and what's still missing
---

The MediaPipe Hand Landmarker uses WASM paths that require `SharedArrayBuffer`, which browsers only allow in cross-origin-isolated contexts.

**Required response headers:**
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: credentialless
```

**Why `credentialless` over `require-corp`:** `credentialless` allows cross-origin resources (Google Fonts, CDN assets, MediaPipe model at storage.googleapis.com) without requiring explicit `Cross-Origin-Resource-Policy` headers from those servers. Safer default for a game with external CDN deps.

**Currently set:** Only in `artifacts/fruit-blaster/vite.config.ts` under `server.headers` and `preview.headers` — this covers Vite dev + Vite preview only.

**Missing:** Production deployment must also inject these headers at the hosting layer (Replit deployment config). Without them, hand tracking will silently fail in production.

**How to apply:** When setting up production deployment for fruit-blaster, add the same headers at the static file server or proxy level.
