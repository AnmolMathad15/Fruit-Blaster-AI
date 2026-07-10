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
 * 4. detectForVideo is called every animation frame (not gated on currentTime
 *    diffing, which could stall if the browser pauses video decode).
 *
 * 5. EMA (exponential moving average) smoothing is applied to the raw MediaPipe
 *    coordinates before publishing. This eliminates per-frame jitter without
 *    adding noticeable latency. Alpha = 0.45 keeps tracking tight but smooth.
 *    On first detection after a lost period, positions snap immediately so the
 *    cursor never lags to catch up.
 *
 * 6. Lost-frame debouncing: 15 consecutive no-detection frames are required
 *    before the hand is marked absent, absorbing occlusion / lighting flicker /
 *    fast-movement misses without desensitising the tracker.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export type InitStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface FingertipState {
  x: number;       // normalized [0,1] — caller multiplies by canvas size
  y: number;
  isPresent: boolean;
}

/** EMA smoothing factor: 0 = fully smoothed (laggy), 1 = raw (jittery). */
const SMOOTH_ALPHA = 0.45;

/** Frames without a detection before the hand is considered absent. */
const LOST_FRAME_THRESHOLD = 15;

export function useHandTracker() {
  const [initStatus, setInitStatus] = useState<InitStatus>('idle');
  const [initError, setInitError]   = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  // All values that the RAF loop reads — always use refs to avoid stale closures
  const landmarkerRef    = useRef<HandLandmarker | null>(null);
  const isRunningRef     = useRef(false);
  const animFrameRef     = useRef<number>(0);
  const fingertipRef     = useRef<FingertipState>({ x: 0, y: 0, isPresent: false });
  const lostFramesRef    = useRef(0);

  // EMA state: last published smoothed position, used as the "previous" value
  // each frame. Reset to raw on first detection so the cursor snaps instantly.
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
            // GPU delegate fails in sandboxed iframes — use CPU for reliability
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
          // minHandDetectionConfidence: higher = fewer false positives, less jitter
          minHandDetectionConfidence: 0.65,
          minHandPresenceConfidence: 0.6,
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
        if (video.readyState >= 2 && video.videoWidth > 0) { video.removeEventListener('loadedmetadata', onMeta); resolve(); }
      });
    }

    if (video.paused) {
      try { await video.play(); } catch (e) { console.warn('[HandTracker] video.play() failed:', e); }
    }

    if (!landmarkerRef.current) return false;

    console.log(`[HandTracker] Starting detection loop — videoSize: ${video.videoWidth}×${video.videoHeight}`);
    isRunningRef.current = true;
    smoothedRef.current = null; // reset EMA on (re)start
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

            // ── EMA smoothing ──────────────────────────────────────────────
            // On first detection after a gap, snap directly to raw position so
            // the cursor doesn't drift in from (0,0) or the last known location.
            let sx: number;
            let sy: number;
            if (smoothedRef.current === null || !fingertipRef.current.isPresent) {
              // First frame or hand just reappeared — snap, no interpolation
              sx = pt.x;
              sy = pt.y;
            } else {
              sx = SMOOTH_ALPHA * pt.x + (1 - SMOOTH_ALPHA) * smoothedRef.current.x;
              sy = SMOOTH_ALPHA * pt.y + (1 - SMOOTH_ALPHA) * smoothedRef.current.y;
            }
            smoothedRef.current = { x: sx, y: sy };

            const next: FingertipState = { x: sx, y: sy, isPresent: true };
            fingertipRef.current = next;
            setFingertip(next);
          } else {
            // Debounce hand loss — require LOST_FRAME_THRESHOLD consecutive
            // misses before marking absent. Absorbs single-frame MediaPipe
            // dropout from occlusion, lighting, or fast movement.
            lostFramesRef.current += 1;
            if (lostFramesRef.current >= LOST_FRAME_THRESHOLD && fingertipRef.current.isPresent) {
              smoothedRef.current = null; // reset EMA so next detection snaps
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
