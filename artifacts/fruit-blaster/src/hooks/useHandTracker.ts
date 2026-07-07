import { useState, useEffect, useRef } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export function useHandTracker() {
  const [isTracking, setIsTracking] = useState(false);
  const [initStatus, setInitStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // Use a ref for the running flag so the RAF closure always reads the latest value
  const isRunningRef = useRef(false);
  
  const [fingertip, setFingertip] = useState<{ x: number, y: number, isPresent: boolean }>({ x: 0, y: 0, isPresent: false });
  // Expose fingertip as a ref so callers can read latest without depending on state
  const fingertipRef = useRef<{ x: number, y: number, isPresent: boolean }>({ x: 0, y: 0, isPresent: false });
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    let active = true;

    async function init() {
      try {
        setInitStatus('loading');
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm"
        );
        
        if (!active) return;

        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });

        if (!active) {
          landmarker.close();
          return;
        }

        landmarkerRef.current = landmarker;
        setInitStatus('ready');
      } catch (err: any) {
        if (active) {
          console.error("Hand tracker init error:", err);
          setError(err.message || 'Failed to initialize hand tracking');
          setInitStatus('error');
        }
      }
    }

    init();

    return () => {
      active = false;
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const startTracking = async (videoElement: HTMLVideoElement) => {
    videoRef.current = videoElement;
    if (initStatus !== 'ready' || !landmarkerRef.current) return false;
    
    // Set the running flag via ref BEFORE entering the RAF loop so
    // the closure always sees the current value (no stale state capture).
    isRunningRef.current = true;
    setIsTracking(true);
    let lastVideoTime = -1;

    const track = () => {
      // Read from ref — never stale, safe to call from any closure age
      if (!isRunningRef.current || !videoRef.current || !landmarkerRef.current) return;
      
      const currentTime = performance.now();
      if (videoRef.current.currentTime !== lastVideoTime) {
        lastVideoTime = videoRef.current.currentTime;
        try {
          const results = landmarkerRef.current.detectForVideo(videoRef.current, currentTime);
          
          if (results.landmarks && results.landmarks.length > 0) {
            // Index fingertip is landmark 8
            const pt = results.landmarks[0][8];
            const next = { x: pt.x, y: pt.y, isPresent: true };
            fingertipRef.current = next;
            setFingertip(next);
          } else {
            const next = { ...fingertipRef.current, isPresent: false };
            fingertipRef.current = next;
            setFingertip(next);
          }
        } catch {
          // Silently ignore per-frame detection errors
        }
      }
      
      animationFrameRef.current = requestAnimationFrame(track);
    };
    
    track();
    return true;
  };

  const stopTracking = () => {
    isRunningRef.current = false;
    setIsTracking(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  return { fingertip, fingertipRef, isTracking, error, initStatus, startTracking, stopTracking };
}
