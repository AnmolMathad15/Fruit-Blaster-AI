import { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useStatsStore } from '../../store/statsStore';
import { useHandTracker } from '../../hooks/useHandTracker';
import { useSoundManager } from '../../hooks/useSoundManager';
import { GameEngine } from '../../game/engine/GameEngine';
import { getSwordSkinColors } from '../../utils/mathUtils';
import HUD from './HUD';
import { GlassPanel, Button } from '../ui/UIComponents';

export default function GameScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const reqRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  
  const { setScreen, mode, setScore, setLives, lives, score, combo, setCombo, isPaused, setPaused, timeLeft, setTimeLeft } = useGameStore();
  const { webcamMirror, swordSkin } = useSettingsStore();
  const { addSwing, updateBestCombo } = useStatsStore();
  const { startTracking, stopTracking, fingertip, fingertipRef, isTracking, initStatus } = useHandTracker();
  // Keep a ref for isTracking so the game loop reads latest without needing it as a dep
  const isTrackingRef = useRef(isTracking);
  useEffect(() => { isTrackingRef.current = isTracking; }, [isTracking]);
  const { playSlice, playBomb, playMiss, playCombo } = useSoundManager();

  // Mouse fallback
  const mousePosRef = useRef({ x: 0, y: 0, isPresent: false });

  // Track whether the video stream is ready so we can retry tracking when model loads
  const videoReadyRef = useRef(false);

  useEffect(() => {
    // Setup webcam stream — independent of MediaPipe model load
    async function setupCam() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
        });
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
        videoReadyRef.current = true;
        // If model already loaded by the time camera is ready, start immediately
        if (initStatus === 'ready') {
          startTracking(videoRef.current);
        }
      } catch (e) {
        console.warn('Camera denied — using mouse/touch fallback');
      }
    }
    setupCam();

    return () => {
      stopTracking();
      videoReadyRef.current = false;
      const vid = videoRef.current;
      if (vid?.srcObject) {
        (vid.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Retry startTracking whenever the MediaPipe model finishes loading
  useEffect(() => {
    if (initStatus === 'ready' && videoReadyRef.current && videoRef.current && !isTracking) {
      startTracking(videoRef.current);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initStatus]);

  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Init Engine
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    engineRef.current = new GameEngine(canvas, mode, {
      onScore: (pts) => {
        setScore(s => s + pts);
        setCombo(combo + 1);
        addSwing(true);
      },
      onMiss: () => {
        setCombo(0);
        addSwing(false);
        if (mode === 'classic') {
          playMiss();
          setLives(l => {
            if (l <= 1) {
              setTimeout(() => setScreen('gameover'), 100);
              return 0;
            }
            return l - 1;
          });
        }
      },
      onBombHit: () => {
        setCombo(0);
        if (mode === 'classic' || mode === 'arcade') {
          setLives(l => {
            if (l <= 1) {
              setTimeout(() => setScreen('gameover'), 100);
              return 0;
            }
            return l - 1;
          });
        }
      },
      playSlice,
      playBomb
    });

    const handleResize = () => {
      engineRef.current?.resize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      if (!isTracking) {
        mousePosRef.current = { x: e.clientX, y: e.clientY, isPresent: e.buttons > 0 };
      }
    };
    const handleMouseDown = (e: MouseEvent) => {
      if (!isTracking) mousePosRef.current = { x: e.clientX, y: e.clientY, isPresent: true };
    };
    const handleMouseUp = () => {
      if (!isTracking) mousePosRef.current.isPresent = false;
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [mode, isTracking]);

  // Combo sounds
  useEffect(() => {
    if (combo > 0 && combo % 3 === 0) {
      playCombo(combo);
      updateBestCombo(combo);
    }
  }, [combo]);

  // Keep live refs for values read inside the RAF loop — this prevents
  // cancelling/restarting the loop on every state update (e.g. per-frame fingertip)
  const isPausedRef = useRef(isPaused);
  const webcamMirrorRef = useRef(webcamMirror);
  const swordSkinRef = useRef(swordSkin);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { webcamMirrorRef.current = webcamMirror; }, [webcamMirror]);
  useEffect(() => { swordSkinRef.current = swordSkin; }, [swordSkin]);

  // Game Loop — single long-lived RAF; reads all mutable state through refs
  useEffect(() => {
    const loop = (time: number) => {
      if (isPausedRef.current) {
        lastTimeRef.current = time;
        reqRef.current = requestAnimationFrame(loop);
        return;
      }

      const dt = (time - lastTimeRef.current) / (1000/60); // normalize to 60fps
      lastTimeRef.current = time;

      const engine = engineRef.current;
      if (engine && canvasRef.current) {
        const cw = canvasRef.current.width;
        const ch = canvasRef.current.height;
        
        // Read latest fingertip/tracking state from refs — no stale closures
        const ft = fingertipRef.current;
        let controlPos = mousePosRef.current;
        if (ft.isPresent && isTrackingRef.current) {
          const mirror = webcamMirrorRef.current;
          const x = mirror ? (1 - ft.x) * cw : ft.x * cw;
          controlPos = { x, y: ft.y * ch, isPresent: true };
        }

        engine.update(dt, controlPos);
        
        // Draw video background
        const ctx = engine.ctx;
        ctx.clearRect(0,0,cw,ch);
        if (videoRef.current && videoRef.current.readyState === 4) {
          ctx.save();
          ctx.globalAlpha = 0.3;
          if (webcamMirrorRef.current) {
            ctx.translate(cw, 0);
            ctx.scale(-1, 1);
          }
          const vw = videoRef.current.videoWidth;
          const vh = videoRef.current.videoHeight;
          const scale = Math.max(cw/vw, ch/vh);
          ctx.drawImage(videoRef.current, cw/2 - vw*scale/2, ch/2 - vh*scale/2, vw*scale, vh*scale);
          ctx.restore();
        }

        engine.draw(getSwordSkinColors(swordSkinRef.current));
      }

      reqRef.current = requestAnimationFrame(loop);
    };

    reqRef.current = requestAnimationFrame(loop);
    return () => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]); // only restart loop if game mode changes (new engine instance)

  // Timer for Challenge mode
  useEffect(() => {
    if (mode === 'challenge' && !isPaused) {
      const t = setInterval(() => {
        setTimeLeft(l => {
          if (l <= 1) {
            clearInterval(t);
            setScreen('gameover');
            return 0;
          }
          return l - 1;
        });
      }, 1000);
      return () => clearInterval(t);
    }
    return undefined;
  }, [mode, isPaused]);

  return (
    <div className="w-full h-full relative bg-black overflow-hidden select-none">
      <video ref={videoRef} className="hidden" playsInline muted />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full touch-none" />
      
      <HUD />

      {!isTracking && initStatus === 'ready' && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full backdrop-blur pointer-events-none">
          Click and drag to slice (Waiting for hand...)
        </div>
      )}

      {isPaused && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <GlassPanel className="p-8 flex flex-col items-center gap-4">
            <h2 className="text-4xl font-orbitron font-bold text-white mb-4">PAUSED</h2>
            <Button onClick={() => setPaused(false)} variant="primary" className="w-full">RESUME</Button>
            <Button onClick={() => setScreen('menu')} variant="secondary" className="w-full">QUIT</Button>
          </GlassPanel>
        </div>
      )}
    </div>
  );
}
