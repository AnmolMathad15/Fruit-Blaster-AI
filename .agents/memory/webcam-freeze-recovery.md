---
name: Webcam freeze recovery
description: How mid-game webcam freezing is prevented and recovered — three distinct failure paths, each with its own detection and recovery mechanism
---

Three failure modes were addressed:

## 1. Persistent detectForVideo errors (WASM/GPU crash)
**Where:** `useHandTracker.ts` detect loop  
**Detection:** `consecutiveErrorsRef` counts successive catch-block hits; threshold `MAX_CONSECUTIVE_ERRORS = 10` (~167ms at 60fps).  
**Response:** Loop stops (`isRunningRef = false`), `setTrackingLost(true)`, `setIsTracking(false)`.  
**Reset:** `startTracking()` resets both `consecutiveErrorsRef` and `trackingLost`.  
**Why:** A single bad frame should not kill tracking; 10 consecutive ones indicate a genuine crash, not noise.

## 2. Camera stream track ends mid-game (permission revoked / hardware disconnect)
**Where:** `GameCanvas.tsx` — `MediaStreamTrack 'ended'` listener attached to every acquired track  
**Detection:** `track.addEventListener('ended', ...)` — fires when the OS/browser kills the stream.  
**Response:** `stopTracking()` + `setCameraLost(true)` + `setPaused(true)` → "Camera Lost" overlay.  
**Recovery:** `restartCamera()` callback — tears down dead stream, re-calls `getUserMedia`, re-attaches track listener, calls `startTracking()`, only clears `cameraLost` on success.  
**Concurrency guard:** `restartingRef` prevents overlapping reconnect calls on double-click.

## 3. Video element paused by browser (background tab / power saving)
**Where:** `GameCanvas.tsx` — `visibilitychange` listener  
**Detection:** `document.visibilityState === 'visible' && video.paused`  
**Response:** `video.play().catch(() => {})` — resumes live frames for MediaPipe.

## trackingLost watcher (GameCanvas)
`useEffect` watches `trackingLost` from hook → sets `cameraLost + setPaused(true)`.  
Both the track-ended path and the consecutive-error path converge on `cameraLost = true`.

## UI
"Camera Lost" overlay: `z-[60]` (above all other overlays), "Reconnect Camera" + "Quit to Menu" buttons.  
Existing `handLost` and `PAUSED` overlays are gated with `!cameraLost`.

**How to apply:** When adding new camera-dependent features, ensure any mid-game camera failure sets `cameraLost + setPaused` and has a recovery path through `restartCamera`.
