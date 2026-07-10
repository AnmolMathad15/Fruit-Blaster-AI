/**
 * useHandTracker — complete MediaPipe Hand Landmarker pipeline.
 *
 * Key design decisions:
 *
 * 1. startTracking() reads landmarkerRef.current (a ref) — NOT initStatus (state).
 *    initStatus is React state; any function that closes over it captures a
 *    stale copy. Refs are always current.
 *
 * 2. GPU delegate removed. It silently fails inside sandboxed iframes (Replit
 *    preview, cross-origin frames). CPU is reliable everywhere.
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
 * 6. Camera is requested at 720×540 (vs 640×480) for better landmark accuracy.
 *    Higher than this hurts CPU inference performance on the CPU delegate.
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

export function useHandTracker() {
  const [initStatus, setInitStatus] = useState<InitStatus>('idle');
  const [initError, setInitError]   = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  const landmarkerRef    = useRef<HandLandmarker | null>(null);
  const isRunningRef     = useRef(false);
  const animFrameRef     = useRef<number>(0);
  const fingertipRef     = useRef<FingertipState>({ x: 0, y: 0, isPresent: false });
  const lostFramesRef    = useRef(0);

  // EMA state: last smoothed position used as "previous" each frame.
  // null = hand just appeared → snap instead of interpolating.
  const smoothedRef      = useRef<{ x: number; y: number } | null>(null);

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

        console.log('[HandTracker] Creating HandLandmarker…');
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            // GPU delegate fails in sandboxed iframes — CPU is reliable everywhere
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
          // Higher confidence thresholds → fewer false positives / shaky detections
          minHandDetectionConfidence: 0.65,
          minHandPresenceConfidence: 0.60,
          minTrackingConfidence: 0.55,
        });
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
    setIsTracking(true);

    const detect = () => {
      if (!isRunningRef.current || !landmarkerRef.current) return;

      if (video.readyState >= 2 && video.videoWidth > 0) {
        try {
          const now = performance.now();
          const results = landmarkerRef.current.detectForVideo(video, now);

          if (results.landmarks?.length > 0) {
            lostFramesRef.current = 0;
            const pt = results.landmarks[0][8]; // index fingertip (landmark 8)

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
            smoothedRef.current = { x: sx, y: sy };

            const next: FingertipState = { x: sx, y: sy, isPresent: true };
            fingertipRef.current = next;
            setFingertip(next);
          } else {
            // Debounce: require LOST_FRAME_THRESHOLD misses before marking absent.
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
        }
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
    const stopped: FingertipState = { x: 0, y: 0, isPresent: false };
    fingertipRef.current = stopped;
    setFingertip(stopped);
  }, []);

  return {
    fingertip,
    fingertipRef,
    isTracking,
    initStatus,
    initError,
    startTracking,
    stopTracking,
  };
}
