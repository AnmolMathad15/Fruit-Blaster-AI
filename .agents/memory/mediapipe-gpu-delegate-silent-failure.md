---
name: MediaPipe GPU delegate silent failure on production (Vercel) vs dev (Replit)
description: Why hand tracking worked in Replit dev but failed ("camera works, hand never detected") on Vercel production — and why CPU-only is now the fix.
---

`useHandTracker.ts` used to pick the MediaPipe Tasks Vision delegate based on
`window.self !== window.top`: CPU inside Replit's sandboxed preview iframe,
GPU-then-CPU-fallback on top-level pages (production deployments like
Vercel). The try/catch fallback only handled GPU delegate **creation**
throwing — it did not handle the delegate creating successfully but then
silently returning zero hand detections on every frame, which is a real
MediaPipe Tasks Vision GPU-delegate failure mode on some hardware/browser
combos. That reproduced exactly as "camera permission granted, stuck on
waiting-for-hand" in production while dev (always CPU) worked fine.

**Fix:** delegate selection is now unconditionally `'CPU'` — the iframe-based
branching and the GPU delegate path were removed entirely, not just
deprioritized. CPU has proven reliable in every environment tested.

**Why:** exception-based fallback cannot catch a delegate that inits fine but
infers nothing; there is no error to catch. Diagnosing this took confirming
`crossOriginIsolated`/`isInIframe` values match between environments and
ruling out CORS/model-loading/WASM-header causes first (those were all fine
in both environments).

**How to apply:** if GPU delegate support is reconsidered for perf, don't
gate it on init success alone — add a post-init runtime sanity probe (e.g.
first N frames must produce at least one detection given a visibly present
hand) with automatic demotion to CPU, not just a try/catch around
`createFromOptions`.
