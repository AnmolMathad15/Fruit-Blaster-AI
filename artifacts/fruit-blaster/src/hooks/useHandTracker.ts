/**
 * useHandTracker — complete MediaPipe Hand Landmarker pipeline.
 *
 * Key design decisions that fix the known bugs:
 *
 * 1. startTracking() checks landmarkerRef.current (a ref) — NOT initStatus (state).
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
 * 5. All detection errors are logged — no silent swallowing.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export type InitStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface FingertipState {
  x: number;       // normalized [0,1] — caller multiplies by canvas size
  y: number;
  isPresent: boolean;
}

export function useHandTracker() {
  const [initStatus, setInitStatus] = useState<InitStatus>('idle');
  const [initError, setInitError]   = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  // All values that the RAF loop reads — always use refs to avoid stale closures
  const landmarkerRef    = useRef<HandLandmarker | null>(null);
  const isRunningRef     = useRef(false);
  const animFrameRef     = useRef<number>(0);
  const fingertipRef     = useRef<FingertipState>({ x: 0, y: 0, isPresent: false });
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
  // IMPORTANT: reads landmarkerRef.current (ref), NOT initStatus (state).
  // Any function that closes over initStatus captures its value at definition
  // time and will see 'idle' forever even after the model loads.
  const startTracking = useCallback(async (video: HTMLVideoElement): Promise<boolean> => {
    // Guard against double-start (e.g. camera-ready path + initStatus effect both firing)
    if (isRunningRef.current) {
      console.log('[HandTracker] startTracking: already running, ignoring duplicate call');
      return true;
    }
    // Wait for landmarker to be available (ref is always current — no stale closure)
    if (!landmarkerRef.current) {
      console.warn('[HandTracker] startTracking called but model not ready yet');
      return false;
    }

    // Video must have dimensions before detectForVideo can run
    if (video.readyState < 2 || video.videoWidth === 0) {
      console.log('[HandTracker] Video not ready, waiting for loadedmetadata…');
      await new Promise<void>((resolve) => {
        const onMeta = () => { video.removeEventListener('loadedmetadata', onMeta); resolve(); };
        video.addEventListener('loadedmetadata', onMeta);
        // Also resolve immediately if it fires synchronously
        if (video.readyState >= 2 && video.videoWidth > 0) { video.removeEventListener('loadedmetadata', onMeta); resolve(); }
      });
    }

    // Ensure video is playing
    if (video.paused) {
      try { await video.play(); } catch (e) { console.warn('[HandTracker] video.play() failed:', e); }
    }

    if (!landmarkerRef.current) return false; // could have been closed while we waited

    console.log(`[HandTracker] Starting detection loop — videoSize: ${video.videoWidth}×${video.videoHeight}`);
    isRunningRef.current = true;
    setIsTracking(true);

    const detect = () => {
      if (!isRunningRef.current || !landmarkerRef.current) return;

      // video.readyState 4 = HAVE_ENOUGH_DATA (can draw frames)
      if (video.readyState >= 2 && video.videoWidth > 0) {
        try {
          const now = performance.now();
          const results = landmarkerRef.current.detectForVideo(video, now);
          if (results.landmarks?.length > 0) {
            const pt = results.landmarks[0][8]; // index fingertip
            const next: FingertipState = { x: pt.x, y: pt.y, isPresent: true };
            fingertipRef.current = next;
            setFingertip(next);
          } else {
            const next: FingertipState = { ...fingertipRef.current, isPresent: false };
            fingertipRef.current = next;
            setFingertip(next);
          }
        } catch (err) {
          console.error('[HandTracker] detectForVideo error:', err);
        }
      }

      animFrameRef.current = requestAnimationFrame(detect);
    };

    detect();
    return true;
  }, []); // no deps — all reads come from refs

  // ─── stopTracking ─────────────────────────────────────────────────────────
  const stopTracking = useCallback(() => {
    isRunningRef.current = false;
    setIsTracking(false);
    cancelAnimationFrame(animFrameRef.current);
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
