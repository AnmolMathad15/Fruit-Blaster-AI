/**
 * useHandTracker — complete MediaPipe Hand Landmarker pipeline.
 *
 * Key design decisions:
 *
 * 1. startTracking() reads landmarkerRef.current (a ref) — NOT initStatus (state).
 *    initStatus is React state; any function that closes over it captures a
 *    stale copy. Refs are always current.
 *
 * 2. Delegate selection: GPU when the page is the top-level frame (e.g. Vercel
 *    production — 3–5× faster inference), CPU inside sandboxed iframes (Replit
 *    preview, cross-origin embeds where GPU fails silently). Falls back to CPU
 *    automatically if GPU creation throws.
 *
 * 3. We wait for 'loadedmetadata' before calling detectForVideo so that
 *    videoWidth / videoHeight are non-zero.
 *
 * 4. Adaptive EMA smoothing is applied to raw MediaPipe coordinates each frame.
 *    Alpha scales with hand speed: fast movement → higher alpha (low lag),
 *    stationary hand → lower alpha (very stable, no micro-jitter).
 *    Range: 0.35 (stationary) → 0.75 (fast). On first detection after a gap,
 *    positions snap directly so the cursor never drifts in from elsewhere.
 *
 * 5. Lost-frame debouncing: 15 consecutive no-detection frames are required
 *    before the hand is marked absent, absorbing occlusion / lighting flicker /
 *    fast-movement misses without desensitising the tracker.
 *
 * 6. Camera is requested at 640×480 — optimal for CPU inference throughput.
 *    720×540 buys marginal landmark accuracy but adds ~19% more pixels per frame
 *    for the CPU delegate to process every RAF tick; not worth it.
 *
 * 7. Per-frame allocations are avoided: smoothedRef and lastRawRef are mutated
 *    in-place rather than replaced with new objects, eliminating GC pressure at
 *    60 fps.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export type InitStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface FingertipState {
  x: number;       // normalized [0,1] — caller multiplies by canvas size
  y: number;
  isPresent: boolean;
}

/** Minimum EMA alpha (stationary hand — very smooth). */
const SMOOTH_ALPHA_MIN = 0.35;
/** Maximum EMA alpha (fast movement — very responsive). */
const SMOOTH_ALPHA_MAX = 0.75;
/**
 * Speed scale factor: controls how quickly alpha ramps to max.
 * Normalized distance-per-frame of ~0.05 (fast slash) yields max alpha.
 * speed * SPEED_SCALE clamped to [0,1] then mapped to [MIN,MAX].
 */
const SPEED_SCALE = 12;

/** Frames without detection before the hand is considered absent. */
const LOST_FRAME_THRESHOLD = 15;

/**
 * Consecutive detectForVideo errors before the loop declares the tracker dead
 * and surfaces trackingLost=true so the caller can show a recovery UI.
 * 10 frames ≈ 167 ms at 60 fps — long enough to absorb a single noisy frame,
 * short enough to react quickly to a genuine WASM / GPU context failure.
 */
const MAX_CONSECUTIVE_ERRORS = 10;

/**
 * Frames a hand must be *consistently* detected before we trust it as present.
 * Guards against single-frame false positives (a sleeve, a shadow, a face edge
 * briefly scoring above threshold) snapping the sword onto the wrong point.
 */
const PRESENCE_CONFIRM_FRAMES = 4;

/**
 * Max normalized distance the fingertip may move between consecutive frames
 * before we treat it as an implausible jump (misdetection latching onto a
 * different object) rather than real motion, and discard the frame.
 * At 60fps a real slash covers a fraction of the frame per tick; 0.35 of the
 * normalized [0,1] space in one frame is far beyond any real fingertip motion.
 */
const MAX_JUMP_DISTANCE = 0.35;
/** Consecutive discarded "jump" frames before we give up and accept the new
 * position anyway — otherwise a genuinely fast slash could get stuck forever. */
const MAX_JUMP_DISCARDS = 3;

export function useHandTracker() {
  const [initStatus, setInitStatus] = useState<InitStatus>('idle');
  const [initError, setInitError]   = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  // True when the detect loop has been stopped due to persistent errors.
  // Caller should show a recovery UI and call startTracking again after
  // re-acquiring the camera stream.
  const [trackingLost, setTrackingLost] = useState(false);

  const landmarkerRef    = useRef<HandLandmarker | null>(null);
  const isRunningRef     = useRef(false);
  const animFrameRef     = useRef<number>(0);
  const fingertipRef     = useRef<FingertipState>({ x: 0, y: 0, isPresent: false });
  const lostFramesRef    = useRef(0);
  // Consecutive frames the hand has been seen — must clear PRESENCE_CONFIRM_FRAMES
  // before we trust a *new* detection (guards the appearance side; LOST_FRAME_THRESHOLD
  // already guards the disappearance side).
  const presenceFramesRef = useRef(0);
  // Consecutive frames discarded for an implausible jump in fingertip position.
  const jumpDiscardsRef         = useRef(0);
  // Consecutive detectForVideo errors — resets to 0 on any successful frame.
  const consecutiveErrorsRef    = useRef(0);

  // EMA state: last smoothed position used as "previous" each frame.
  // null = hand just appeared → snap instead of interpolating.
  const smoothedRef      = useRef<{ x: number; y: number } | null>(null);
  // Last *raw* (unsmoothed) landmark position — the jump filter compares
  // against this rather than the smoothed point, so a real fast slash doesn't
  // get flagged just because the smoothed cursor is lagging behind it.
  const lastRawRef       = useRef<{ x: number; y: number } | null>(null);

  const [fingertip, setFingertip] = useState<FingertipState>({ x: 0, y: 0, isPresent: false });

  // ─── Model initialisation ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        console.log('[HandTracker] Loading MediaPipe wasm…');
        setInitStatus('loading');

        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
        );
        if (cancelled) return;

        // Use GPU delegate when the page is the top-level browsing context
        // (e.g. production Vercel deployment) — GPU inference is 3–5× faster.
        // Fall back to CPU for sandboxed iframes (Replit preview) where GPU
        // WebGL contexts are blocked. Wrap in try/catch so any GPU init failure
        // (unsupported hardware, driver issue) automatically retries with CPU.
        const isInIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
        const delegateOrder: Array<'GPU' | 'CPU'> = isInIframe ? ['CPU'] : ['GPU', 'CPU'];

        console.log('[HandTracker] Creating HandLandmarker…');
        const landmarkerOpts = {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          },
          runningMode: 'VIDEO' as const,
          numHands: 1, // track exactly one hand — ignore any second hand / false detection
          // Strict confidence thresholds (0.8–0.9) — sharply cuts false positives from
          // body, face, clothing, or background being misread as a hand.
          minHandDetectionConfidence: 0.85,
          minHandPresenceConfidence: 0.8,
          minTrackingConfidence: 0.8,
        };

        let landmarker: HandLandmarker | null = null;
        for (const delegate of delegateOrder) {
          try {
            landmarker = await HandLandmarker.createFromOptions(vision, {
              ...landmarkerOpts,
              baseOptions: { ...landmarkerOpts.baseOptions, delegate },
            });
            console.log(`[HandTracker] Using ${delegate} delegate`);
            break;
          } catch (delegateErr) {
            if (delegate === 'GPU') {
              console.warn('[HandTracker] GPU delegate unavailable, falling back to CPU:', delegateErr);
            } else {
              throw delegateErr; // CPU failure is unrecoverable
            }
          }
        }
        if (!landmarker) throw new Error('Failed to create HandLandmarker with any delegate');
        if (cancelled) { landmarker.close(); return; }

        landmarkerRef.current = landmarker;
        setInitStatus('ready');
        console.log('[HandTracker] Model ready ✓');
      } catch (err: any) {
        if (!cancelled) {
          const msg = err?.message ?? String(err);
          console.error('[HandTracker] Init failed:', msg);
          setInitError(msg);
          setInitStatus('error');
        }
      }
    }

    init();
    return () => {
      cancelled = true;
      landmarkerRef.current?.close();
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // ─── startTracking ────────────────────────────────────────────────────────
  const startTracking = useCallback(async (video: HTMLVideoElement): Promise<boolean> => {
    if (isRunningRef.current) {
      console.log('[HandTracker] startTracking: already running, ignoring duplicate call');
      return true;
    }
    if (!landmarkerRef.current) {
      console.warn('[HandTracker] startTracking called but model not ready yet');
      return false;
    }

    if (video.readyState < 2 || video.videoWidth === 0) {
      console.log('[HandTracker] Video not ready, waiting for loadedmetadata…');
      await new Promise<void>((resolve) => {
        const onMeta = () => { video.removeEventListener('loadedmetadata', onMeta); resolve(); };
        video.addEventListener('loadedmetadata', onMeta);
        if (video.readyState >= 2 && video.videoWidth > 0) {
          video.removeEventListener('loadedmetadata', onMeta);
          resolve();
        }
      });
    }

    if (video.paused) {
      try { await video.play(); } catch (e) { console.warn('[HandTracker] video.play() failed:', e); }
    }

    if (!landmarkerRef.current) return false;

    console.log(`[HandTracker] Starting detection loop — ${video.videoWidth}×${video.videoHeight}`);
    isRunningRef.current = true;
    smoothedRef.current  = null; // reset EMA on (re)start
    presenceFramesRef.current = 0;
    jumpDiscardsRef.current = 0;
    lastRawRef.current = null;
    consecutiveErrorsRef.current = 0;
    setTrackingLost(false); // clear any previous error state on restart
    setIsTracking(true);

    const detect = () => {
      if (!isRunningRef.current || !landmarkerRef.current) return;

      if (video.readyState >= 2 && video.videoWidth > 0) {
        try {
          const now = performance.now();
          const results = landmarkerRef.current.detectForVideo(video, now);

          // numHands: 1 already caps the model to its single most-confident hand,
          // but guard explicitly in case a future config change relaxes that.
          consecutiveErrorsRef.current = 0; // successful inference — clear error streak
          if (results.landmarks?.length > 0) {
            lostFramesRef.current = 0;
            const pt = results.landmarks[0][8]; // index fingertip only (landmark 8) — never any other landmark

            // ── Implausible-jump rejection ──────────────────────────────────
            // A misdetection latching onto a different object (or the model
            // briefly re-anchoring on an edge) shows up as a huge frame-to-frame
            // jump. Discard those frames and hold the last stable position,
            // unless the jump persists for several frames (a genuinely fast
            // slash), in which case we accept it rather than get stuck.
            if (lastRawRef.current !== null && fingertipRef.current.isPresent) {
              const prevRaw = lastRawRef.current;
              const jump = Math.hypot(pt.x - prevRaw.x, pt.y - prevRaw.y);
              if (jump > MAX_JUMP_DISTANCE && jumpDiscardsRef.current < MAX_JUMP_DISCARDS) {
                jumpDiscardsRef.current += 1;
                animFrameRef.current = requestAnimationFrame(detect);
                return;
              }
            }
            jumpDiscardsRef.current = 0;
            // Mutate in-place to avoid a new object allocation every frame.
            if (lastRawRef.current === null) lastRawRef.current = { x: pt.x, y: pt.y };
            else { lastRawRef.current.x = pt.x; lastRawRef.current.y = pt.y; }

            // ── Presence confirmation ───────────────────────────────────────
            // Require a few consecutive detections before trusting a *new*
            // appearance, so a single stray frame (skin-toned object, motion
            // blur) can't snap the sword onto a false hand.
            if (!fingertipRef.current.isPresent) {
              presenceFramesRef.current += 1;
              if (presenceFramesRef.current < PRESENCE_CONFIRM_FRAMES) {
                animFrameRef.current = requestAnimationFrame(detect);
                return;
              }
            }

            // ── Adaptive EMA smoothing ─────────────────────────────────────
            // Alpha scales with movement speed so fast slashes feel instant
            // while a held/stationary hand stays rock-solid with no wobble.
            let sx: number;
            let sy: number;

            if (smoothedRef.current === null || !fingertipRef.current.isPresent) {
              // First frame or hand just reappeared — snap, no interpolation
              sx = pt.x;
              sy = pt.y;
            } else {
              const prev = smoothedRef.current;
              const speed = Math.hypot(pt.x - prev.x, pt.y - prev.y);
              const t = Math.min(1, speed * SPEED_SCALE);
              const alpha = SMOOTH_ALPHA_MIN + t * (SMOOTH_ALPHA_MAX - SMOOTH_ALPHA_MIN);
              sx = alpha * pt.x + (1 - alpha) * prev.x;
              sy = alpha * pt.y + (1 - alpha) * prev.y;
            }
            // Mutate in-place — avoids a new object allocation every frame.
            if (smoothedRef.current === null) smoothedRef.current = { x: sx, y: sy };
            else { smoothedRef.current.x = sx; smoothedRef.current.y = sy; }

            const next: FingertipState = { x: sx, y: sy, isPresent: true };
            fingertipRef.current = next;
            setFingertip(next);
          } else {
            // Debounce: require LOST_FRAME_THRESHOLD misses before marking absent.
            presenceFramesRef.current = 0;
            jumpDiscardsRef.current = 0;
            lastRawRef.current = null;
            lostFramesRef.current += 1;
            if (lostFramesRef.current >= LOST_FRAME_THRESHOLD && fingertipRef.current.isPresent) {
              smoothedRef.current = null; // reset so next detection snaps
              const next: FingertipState = { ...fingertipRef.current, isPresent: false };
              fingertipRef.current = next;
              setFingertip(next);
            }
          }
        } catch (err) {
          console.error('[HandTracker] detectForVideo error:', err);
          consecutiveErrorsRef.current += 1;
          if (consecutiveErrorsRef.current >= MAX_CONSECUTIVE_ERRORS) {
            // Persistent failure — WASM crash, GPU context loss, etc.
            // Stop the loop and surface trackingLost so the caller can show
            // a recovery UI (re-acquire the stream, then call startTracking).
            console.error(`[HandTracker] ${MAX_CONSECUTIVE_ERRORS} consecutive errors — detect loop stopped`);
            isRunningRef.current = false;
            setIsTracking(false);
            setTrackingLost(true);
            return; // do NOT schedule another frame
          }
        }
      } else {
        // Video not yet ready this frame — not an inference error, reset counter.
        consecutiveErrorsRef.current = 0;
      }

      animFrameRef.current = requestAnimationFrame(detect);
    };

    detect();
    return true;
  }, []);

  // ─── stopTracking ─────────────────────────────────────────────────────────
  const stopTracking = useCallback(() => {
    isRunningRef.current = false;
    setIsTracking(false);
    cancelAnimationFrame(animFrameRef.current);
    smoothedRef.current = null;
    presenceFramesRef.current = 0;
    jumpDiscardsRef.current = 0;
    lastRawRef.current = null;
    lostFramesRef.current = 0;
    const stopped: FingertipState = { x: 0, y: 0, isPresent: false };
    fingertipRef.current = stopped;
    setFingertip(stopped);
  }, []);

  return {
    fingertip,
    fingertipRef,
    isTracking,
    trackingLost,
    initStatus,
    initError,
    startTracking,
    stopTracking,
  };
}
