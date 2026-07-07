import { useEffect, useRef, useState } from 'react';
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
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  // Video must NOT use display:none — MediaPipe needs to be able to read frames.
  // Use opacity-0 + absolute positioning instead.
  const videoRef    = useRef<HTMLVideoElement>(null);
  const engineRef   = useRef<GameEngine | null>(null);
  const reqRef      = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());

  const { setScreen, mode, setScore, setLives, score, combo, setCombo, isPaused, setPaused, timeLeft, setTimeLeft } = useGameStore();
  const { webcamMirror, swordSkin } = useSettingsStore();
  const { addSwing, updateBestCombo } = useStatsStore();
  const {
    startTracking, stopTracking,
    fingertip, fingertipRef,
    isTracking, initStatus, initError,
  } = useHandTracker();

  const isTrackingRef = useRef(isTracking);
  useEffect(() => { isTrackingRef.current = isTracking; }, [isTracking]);

  // Mirror combo in a ref so onScore callback (defined once) reads latest value
  const comboRef = useRef(combo);
  useEffect(() => { comboRef.current = combo; }, [combo]);

  const { playSlice, playBomb, playMiss, playCombo } = useSoundManager();

  // Mouse / touch fallback when camera is denied or hand not visible
  const mousePosRef = useRef({ x: 0, y: 0, isPresent: false });

  // Debug overlay state
  const [cameraReady, setCameraReady] = useState(false);
  const [fps, setFps]                 = useState(0);
  const fpsFramesRef = useRef<number[]>([]);

  // ─── Camera setup ──────────────────────────────────────────────────────────
  // Runs once on mount. Independent of MediaPipe model load.
  useEffect(() => {
    let active = true;

    async function setupCam() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        });
        if (!active || !videoRef.current) return;

        const video = videoRef.current;
        video.srcObject = stream;

        // Wait for dimensions to be known before marking ready
        await new Promise<void>((resolve) => {
          const check = () => {
            if (video.readyState >= 1 && video.videoWidth > 0) return resolve();
            video.addEventListener('loadedmetadata', () => resolve(), { once: true });
          };
          check();
        });

        try { await video.play(); } catch (e) { console.warn('[GameCanvas] video.play() error:', e); }

        if (!active) return;
        console.log(`[GameCanvas] Camera ready — ${video.videoWidth}×${video.videoHeight}`);
        setCameraReady(true);

        // If model already loaded, start immediately
        if (landmarkerReadyRef.current) {
          startTracking(video);
        }
      } catch (e) {
        console.warn('[GameCanvas] Camera denied — mouse/touch fallback active:', e);
      }
    }

    setupCam();

    return () => {
      active = false;
      stopTracking();
      const vid = videoRef.current;
      if (vid?.srcObject) {
        (vid.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep a ref so setupCam (which runs once) can read whether the model is ready
  const landmarkerReadyRef = useRef(false);
  useEffect(() => {
    landmarkerReadyRef.current = initStatus === 'ready';
  }, [initStatus]);

  // When model finishes loading, start tracking if camera is already up
  useEffect(() => {
    if (initStatus === 'ready' && cameraReady && videoRef.current && !isTracking) {
      startTracking(videoRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initStatus, cameraReady]);

  // ─── Game Engine setup ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    engineRef.current = new GameEngine(canvas, mode, {
      onScore: (pts) => {
        setScore((s: number) => s + pts);
        setCombo(comboRef.current + 1);
        addSwing(true);
      },
      onMiss: () => {
        setCombo(0);
        addSwing(false);
        if (mode === 'classic') {
          playMiss();
          setLives((l: number) => {
            if (l <= 1) { setTimeout(() => setScreen('gameover'), 100); return 0; }
            return l - 1;
          });
        }
      },
      onBombHit: () => {
        setCombo(0);
        if (mode === 'classic' || mode === 'arcade') {
          setLives((l: number) => {
            if (l <= 1) { setTimeout(() => setScreen('gameover'), 100); return 0; }
            return l - 1;
          });
        }
      },
      playSlice,
      playBomb,
    });

    const handleResize = () => engineRef.current?.resize(window.innerWidth, window.innerHeight);
    window.addEventListener('resize', handleResize);

    // Mouse fallback — only active when hand tracking isn't running
    const handleMouseMove = (e: MouseEvent) => {
      if (!isTrackingRef.current) mousePosRef.current = { x: e.clientX, y: e.clientY, isPresent: e.buttons > 0 };
    };
    const handleMouseDown = (e: MouseEvent) => {
      if (!isTrackingRef.current) mousePosRef.current = { x: e.clientX, y: e.clientY, isPresent: true };
    };
    const handleMouseUp = () => { if (!isTrackingRef.current) mousePosRef.current.isPresent = false; };

    window.addEventListener('mousemove',  handleMouseMove);
    window.addEventListener('mousedown',  handleMouseDown);
    window.addEventListener('mouseup',    handleMouseUp);

    return () => {
      window.removeEventListener('resize',     handleResize);
      window.removeEventListener('mousemove',  handleMouseMove);
      window.removeEventListener('mousedown',  handleMouseDown);
      window.removeEventListener('mouseup',    handleMouseUp);
    };
  }, [mode]);

  // Combo milestone sounds
  useEffect(() => {
    if (combo > 0 && combo % 3 === 0) {
      playCombo(combo);
      updateBestCombo(combo);
    }
  }, [combo]);

  // Live refs for values read inside the RAF (avoid restarting loop on every tick)
  const isPausedRef      = useRef(isPaused);
  const webcamMirrorRef  = useRef(webcamMirror);
  const swordSkinRef     = useRef(swordSkin);
  // Debug overlay needs current values without triggering loop restart
  const cameraReadyRef   = useRef(cameraReady);
  const initStatusRef    = useRef(initStatus);
  useEffect(() => { isPausedRef.current = isPaused; },           [isPaused]);
  useEffect(() => { webcamMirrorRef.current = webcamMirror; },   [webcamMirror]);
  useEffect(() => { swordSkinRef.current = swordSkin; },         [swordSkin]);
  useEffect(() => { cameraReadyRef.current = cameraReady; },     [cameraReady]);
  useEffect(() => { initStatusRef.current = initStatus; },       [initStatus]);

  // ─── Game Loop ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const loop = (time: number) => {
      // FPS counter
      fpsFramesRef.current.push(time);
      fpsFramesRef.current = fpsFramesRef.current.filter(t => time - t < 1000);
      if (fpsFramesRef.current.length % 30 === 0) setFps(fpsFramesRef.current.length);

      if (isPausedRef.current) {
        lastTimeRef.current = time;
        reqRef.current = requestAnimationFrame(loop);
        return;
      }

      const dt = Math.min((time - lastTimeRef.current) / (1000 / 60), 3); // cap at 3× to avoid spiral
      lastTimeRef.current = time;

      const engine = engineRef.current;
      if (engine && canvasRef.current) {
        const cw = canvasRef.current.width;
        const ch = canvasRef.current.height;

        // Resolve control position — finger if tracking, mouse otherwise
        const ft = fingertipRef.current;
        let controlPos = mousePosRef.current;
        if (ft.isPresent && isTrackingRef.current) {
          const mirror = webcamMirrorRef.current;
          // MediaPipe normalized coords: mirror flips x
          const x = mirror ? (1 - ft.x) * cw : ft.x * cw;
          const y = ft.y * ch;
          controlPos = { x, y, isPresent: true };
        }

        engine.update(dt, controlPos);

        // ── Draw ────────────────────────────────────────────────────────────
        const ctx = engine.ctx;
        ctx.clearRect(0, 0, cw, ch);

        // Webcam feed (dimmed background)
        const vid = videoRef.current;
        if (vid && vid.readyState >= 2 && vid.videoWidth > 0) {
          ctx.save();
          ctx.globalAlpha = 0.28;
          if (webcamMirrorRef.current) { ctx.translate(cw, 0); ctx.scale(-1, 1); }
          const vw = vid.videoWidth;
          const vh = vid.videoHeight;
          const scale = Math.max(cw / vw, ch / vh);
          ctx.drawImage(vid, cw / 2 - (vw * scale) / 2, ch / 2 - (vh * scale) / 2, vw * scale, vh * scale);
          ctx.restore();
        }

        engine.draw(getSwordSkinColors(swordSkinRef.current));

        // ── Debug overlay (dev) ────────────────────────────────────────────
        if (import.meta.env.DEV) {
          drawDebugOverlay(ctx, {
            cameraReady,
            modelStatus: initStatus,
            handDetected: ft.isPresent && isTrackingRef.current,
            fingertipX: ft.x,
            fingertipY: ft.y,
            fps: fpsFramesRef.current.length,
            cx: ft.isPresent && isTrackingRef.current
              ? (webcamMirrorRef.current ? (1 - ft.x) * cw : ft.x * cw)
              : null,
            cy: ft.isPresent && isTrackingRef.current ? ft.y * ch : null,
          });
        }
      }

      reqRef.current = requestAnimationFrame(loop);
    };

    reqRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(reqRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // ─── Challenge mode timer ──────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'challenge' || isPaused) return;
    const t = setInterval(() => {
      setTimeLeft((l: number) => {
        if (l <= 1) { clearInterval(t); setScreen('gameover'); return 0; }
        return l - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [mode, isPaused]);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="w-full h-full relative bg-black overflow-hidden select-none">
      {/*
        IMPORTANT: must NOT be display:none — MediaPipe reads live video frames.
        Use opacity-0 + absolute to visually hide while keeping it renderable.
      */}
      <video
        ref={videoRef}
        className="absolute opacity-0 pointer-events-none"
        style={{ width: 1, height: 1 }}
        playsInline
        muted
      />

      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full touch-none" />

      <HUD />

      {/* Status badge */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 pointer-events-none">
        {initStatus === 'loading' && (
          <StatusBadge color="yellow">⏳ Loading AI model…</StatusBadge>
        )}
        {initStatus === 'error' && (
          <StatusBadge color="red">⚠️ Hand tracking unavailable — use mouse to slice</StatusBadge>
        )}
        {initStatus === 'ready' && !cameraReady && (
          <StatusBadge color="blue">📷 Waiting for camera…</StatusBadge>
        )}
        {initStatus === 'ready' && cameraReady && !isTracking && (
          <StatusBadge color="blue">🔍 Detecting hand… (or click-drag to slice)</StatusBadge>
        )}
        {isTracking && !fingertip.isPresent && (
          <StatusBadge color="green">✋ Show your index finger</StatusBadge>
        )}
      </div>

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ children, color }: { children: React.ReactNode; color: string }) {
  const colors: Record<string, string> = {
    yellow: 'bg-yellow-500/80',
    red:    'bg-red-600/80',
    blue:   'bg-blue-600/80',
    green:  'bg-green-600/80',
  };
  return (
    <div className={`${colors[color] ?? 'bg-black/60'} text-white text-sm px-4 py-2 rounded-full backdrop-blur font-medium`}>
      {children}
    </div>
  );
}

interface DebugInfo {
  cameraReady: boolean;
  modelStatus: string;
  handDetected: boolean;
  fingertipX: number;
  fingertipY: number;
  fps: number;
  cx: number | null;
  cy: number | null;
}

function drawDebugOverlay(ctx: CanvasRenderingContext2D, d: DebugInfo) {
  const pad = 12;
  const lineH = 20;
  const lines = [
    `FPS: ${d.fps}`,
    `Camera: ${d.cameraReady ? '✓ Ready' : '✗ Waiting'}`,
    `Model:  ${d.modelStatus}`,
    `Hand:   ${d.handDetected ? '✓ Detected' : '✗ Not detected'}`,
    d.handDetected ? `Tip: (${d.fingertipX.toFixed(3)}, ${d.fingertipY.toFixed(3)})` : '',
  ].filter(Boolean);

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(pad, pad, 220, lines.length * lineH + pad * 2);
  ctx.font = '13px monospace';
  lines.forEach((line, i) => {
    const ok = line.includes('✓');
    const bad = line.includes('✗');
    ctx.fillStyle = ok ? '#4ade80' : bad ? '#f87171' : '#e2e8f0';
    ctx.fillText(line, pad * 2, pad * 2 + i * lineH);
  });

  // Fingertip dot on canvas
  if (d.cx !== null && d.cy !== null) {
    ctx.beginPath();
    ctx.arc(d.cx, d.cy, 14, 0, Math.PI * 2);
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(d.cx, d.cy, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#00ff88';
    ctx.fill();
  }
  ctx.restore();
}
