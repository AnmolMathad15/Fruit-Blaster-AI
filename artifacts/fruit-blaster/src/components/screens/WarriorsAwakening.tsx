/**
 * WarriorsAwakening — Page 2 — Fruit Blaster AI
 *
 * A cinematic initiation ceremony. The player awakens an ancient sword
 * by raising their hand — which is actually the hand-tracking calibration.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { useGameStore } from '../../store/gameStore';

/* ─── Constants ─────────────────────────────────────────────────────────── */

const WASM_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
];
const FINGERTIP_IDX = new Set([4, 8, 12, 16, 20]);

type TrackStatus = 'searching' | 'synchronizing' | 'recognized' | 'awakened';

/* ─── Background particles ──────────────────────────────────────────────── */

interface Particle {
  x: number; y: number; vx: number; vy: number;
  rot: number; rotV: number;
  size: number; opacity: number;
  type: 'petal' | 'firefly' | 'lantern';
  hue: number; phase: number; speed: number;
}

function mkParticle(W: number, scatter: boolean): Particle {
  const r = Math.random();
  const type: Particle['type'] = r < 0.62 ? 'petal' : r < 0.87 ? 'firefly' : 'lantern';
  return {
    x: Math.random() * W,
    y: scatter ? Math.random() * window.innerHeight : window.innerHeight + 20,
    vx: (Math.random() - 0.5) * 0.5,
    vy: type === 'lantern' ? -(0.22 + Math.random() * 0.38) : -(0.28 + Math.random() * 0.65),
    rot: Math.random() * Math.PI * 2,
    rotV: (Math.random() - 0.5) * 0.03,
    size: type === 'lantern' ? 7 + Math.random() * 10 : type === 'petal' ? 3 + Math.random() * 5 : 1.5 + Math.random() * 2,
    opacity: type === 'firefly' ? 0.55 + Math.random() * 0.45 : 0.28 + Math.random() * 0.38,
    type,
    hue: type === 'petal' ? 338 + Math.random() * 20 : type === 'lantern' ? 28 + Math.random() * 18 : 125 + Math.random() * 45,
    phase: Math.random() * Math.PI * 2,
    speed: 0.009 + Math.random() * 0.018,
  };
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle) {
  const pulse = 0.55 + 0.45 * Math.sin(p.phase);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);

  if (p.type === 'petal') {
    ctx.globalAlpha = p.opacity * pulse;
    ctx.fillStyle = `hsl(${p.hue},68%,72%)`;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.size, p.size * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `hsl(${p.hue + 8},58%,82%)`;
    ctx.globalAlpha = p.opacity * pulse * 0.6;
    ctx.beginPath();
    ctx.ellipse(p.size * 0.25, -p.size * 0.1, p.size * 0.65, p.size * 0.3, 0.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.type === 'firefly') {
    ctx.globalAlpha = p.opacity * pulse;
    ctx.shadowColor = `hsl(${p.hue},90%,65%)`;
    ctx.shadowBlur = 10;
    ctx.fillStyle = `hsl(${p.hue},90%,78%)`;
    ctx.beginPath();
    ctx.arc(0, 0, p.size, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.globalAlpha = p.opacity * pulse;
    ctx.shadowColor = `hsl(${p.hue},85%,58%)`;
    ctx.shadowBlur = 14;
    ctx.fillStyle = `hsl(${p.hue},78%,52%)`;
    ctx.fillRect(-p.size * 0.5, -p.size * 0.85, p.size, p.size * 1.7);
    ctx.globalAlpha = p.opacity * pulse * 0.45;
    ctx.fillStyle = '#fffce0';
    ctx.fillRect(-p.size * 0.28, -p.size * 0.55, p.size * 0.56, p.size);
  }
  ctx.restore();
}

/* ─── Hand skeleton ─────────────────────────────────────────────────────── */

function drawHandSkeleton(
  ctx: CanvasRenderingContext2D,
  lms: { x: number; y: number; z: number }[],
  W: number, H: number,
) {
  const pt = (i: number) => ({ x: (1 - lms[i].x) * W, y: lms[i].y * H });

  // Energy lines
  ctx.save();
  ctx.shadowColor = '#c8a020';
  ctx.shadowBlur = 12;
  ctx.strokeStyle = 'rgba(212,168,48,0.72)';
  ctx.lineWidth = 1.9;
  ctx.lineCap = 'round';
  for (const [a, b] of HAND_CONNECTIONS) {
    const p1 = pt(a), p2 = pt(b);
    ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
  }
  ctx.restore();

  // Jade nodes
  ctx.save();
  for (let i = 0; i < lms.length; i++) {
    const p = pt(i);
    const tip = FINGERTIP_IDX.has(i);
    const r = tip ? 6.5 : 3.8;
    ctx.shadowColor = '#00ff99';
    ctx.shadowBlur = tip ? 20 : 13;
    ctx.fillStyle = tip ? '#50ffb8' : '#2dce7a';
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 4;
    ctx.fillStyle = 'rgba(200,255,230,0.9)';
    ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.38, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/* ─── CSS Keyframes ─────────────────────────────────────────────────────── */

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700;900&display=swap');

@keyframes wa-float      { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-10px)} }
@keyframes wa-sword-float{ 0%,100%{transform:translateY(0px) rotate(-2deg)} 50%{transform:translateY(-14px) rotate(2deg)} }
@keyframes wa-mirror-idle{
  0%,100%{box-shadow:0 0 32px 12px rgba(45,206,122,.28),0 0 80px 20px rgba(45,206,122,.10),inset 0 0 40px rgba(45,206,122,.06)}
  50%    {box-shadow:0 0 50px 18px rgba(45,206,122,.42),0 0 110px 32px rgba(45,206,122,.16),inset 0 0 60px rgba(45,206,122,.12)}
}
@keyframes wa-mirror-active{
  0%,100%{box-shadow:0 0 60px 20px rgba(45,206,122,.65),0 0 140px 50px rgba(212,165,32,.32),inset 0 0 55px rgba(45,206,122,.18)}
  50%    {box-shadow:0 0 90px 30px rgba(45,206,122,.85),0 0 200px 70px rgba(212,165,32,.52),inset 0 0 80px rgba(45,206,122,.28)}
}
@keyframes wa-rune-pulse { 0%,100%{opacity:.15} 50%{opacity:.95} }
@keyframes wa-progress-glow{
  0%,100%{box-shadow:0 0 8px rgba(45,206,122,.55)}
  50%    {box-shadow:0 0 22px rgba(45,206,122,.9),0 0 42px rgba(45,206,122,.38)}
}
@keyframes wa-gold-glow{
  0%,100%{box-shadow:0 0 12px rgba(212,165,32,.45)}
  50%    {box-shadow:0 0 30px rgba(212,165,32,.85),0 0 60px rgba(212,165,32,.35)}
}
@keyframes wa-scan{
  0%  {top:0%;opacity:.7}
  100%{top:100%;opacity:0}
}
@keyframes wa-mist{
  0%,100%{opacity:.07;transform:translateX(0)}
  50%    {opacity:.13;transform:translateX(28px)}
}
@keyframes wa-moon-pulse{
  0%,100%{opacity:.85;transform:scale(1)}
  50%    {opacity:1;transform:scale(1.04)}
}
@keyframes wa-btn-breathe{
  0%,100%{box-shadow:0 0 16px rgba(212,165,32,.3),inset 0 0 6px rgba(212,165,32,.08)}
  50%    {box-shadow:0 0 32px rgba(212,165,32,.65),inset 0 0 12px rgba(212,165,32,.18)}
}
@keyframes wa-status-blink{
  0%,100%{opacity:.5} 50%{opacity:1}
}
`;

/* ─── Sacred Blade SVG ──────────────────────────────────────────────────── */

function SacredBlade({ awakened }: { awakened: boolean }) {
  return (
    <svg viewBox="0 0 72 290" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
      <defs>
        <linearGradient id="sb-blade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor={awakened ? '#88ffcc' : '#666'} />
          <stop offset="50%"  stopColor={awakened ? '#ffffff' : '#bbb'} />
          <stop offset="100%" stopColor={awakened ? '#44dd8a' : '#555'} />
        </linearGradient>
        <linearGradient id="sb-guard" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#6a4e00" />
          <stop offset="40%"  stopColor="#d4a520" />
          <stop offset="60%"  stopColor="#ffe066" />
          <stop offset="100%" stopColor="#6a4e00" />
        </linearGradient>
        <linearGradient id="sb-handle" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"  stopColor="#1a1000" />
          <stop offset="50%" stopColor="#4a2c00" />
          <stop offset="100%" stopColor="#1a1000" />
        </linearGradient>
        <radialGradient id="sb-gem">
          <stop offset="0%"  stopColor={awakened ? '#aaffdd' : '#1a4a2a'} />
          <stop offset="60%" stopColor={awakened ? '#2dce7a' : '#0d3a1e'} />
          <stop offset="100%" stopColor="#0a2010" />
        </radialGradient>
        <filter id="sb-glow">
          <feGaussianBlur stdDeviation="2.5" result="b"/>
          <feComposite in="SourceGraphic" in2="b" operator="over"/>
        </filter>
        <filter id="sb-glow-strong">
          <feGaussianBlur stdDeviation="4" result="b"/>
          <feComposite in="SourceGraphic" in2="b" operator="over"/>
        </filter>
      </defs>

      {/* Blade tip */}
      <path d="M36,4 L31,58 L41,58 Z" fill="url(#sb-blade)" />
      {/* Blade body */}
      <path d="M31,56 L28,182 L44,182 L41,56 Z" fill="url(#sb-blade)" />
      {/* Edge highlight */}
      <path d="M36,6 L34,180" stroke="rgba(255,255,255,0.55)" strokeWidth="0.9" />
      {/* Secondary edge */}
      <path d="M37,6 L39,180" stroke="rgba(255,255,255,0.2)" strokeWidth="0.6" />

      {/* Rune marks */}
      {[82, 112, 142].map((y, i) => (
        <text key={i} x="36" y={y} textAnchor="middle"
          fill={awakened ? '#2dce7a' : 'rgba(45,206,122,0.18)'}
          fontSize="10" fontFamily="serif"
          filter={awakened ? 'url(#sb-glow)' : undefined}
          style={{ animation: `wa-rune-pulse ${1.4 + i * 0.5}s ease-in-out ${i * 0.3}s infinite` }}
        >{['⊕', '◈', '⊗'][i]}</text>
      ))}

      {/* Guard base */}
      <path d="M8,182 L64,182 L64,198 L8,198 Z" fill="url(#sb-guard)" rx="2" />
      {/* Guard dragon wings */}
      <path d="M8,185 L2,175 L12,182 Z" fill="#d4a520" />
      <path d="M64,185 L70,175 L60,182 Z" fill="#d4a520" />
      {/* Guard center gem */}
      <ellipse cx="36" cy="190" rx="8" ry="6.5" fill="url(#sb-gem)"
        filter={awakened ? 'url(#sb-glow-strong)' : undefined} />

      {/* Handle */}
      <path d="M31,198 L41,198 L41,252 L31,252 Z" fill="url(#sb-handle)" />
      {/* Handle wrapping bands */}
      {[208, 220, 232, 244].map(y => (
        <line key={y} x1="31" y1={y} x2="41" y2={y}
          stroke="rgba(212,165,32,0.55)" strokeWidth="1.8" />
      ))}
      {/* Handle center line */}
      <line x1="36" y1="200" x2="36" y2="250" stroke="rgba(212,165,32,0.2)" strokeWidth="0.8" />

      {/* Pommel */}
      <ellipse cx="36" cy="260" rx="13" ry="10" fill="url(#sb-guard)" />
      <ellipse cx="36" cy="260" rx="5.5" ry="4.5" fill="url(#sb-gem)"
        filter={awakened ? 'url(#sb-glow)' : undefined} />
    </svg>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */

export default function WarriorsAwakening() {
  const { setScreen } = useGameStore();

  const [trackStatus, setTrackStatus]     = useState<TrackStatus>('searching');
  const [syncProgress, setSyncProgress]   = useState(0);
  const [fps, setFps]                     = useState(0);
  const [handPresent, setHandPresent]     = useState(false);
  const [awakeningFlash, setAwakeningFlash] = useState(false);
  const [camReady, setCamReady]           = useState(false);
  const [camError, setCamError]           = useState(false);

  const bgCanvasRef     = useRef<HTMLCanvasElement>(null);
  const mirrorCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef        = useRef<HTMLVideoElement>(null);
  const mirrorRef       = useRef<HTMLDivElement>(null);
  const landmarkerRef   = useRef<HandLandmarker | null>(null);
  const streamRef       = useRef<MediaStream | null>(null);

  const bgRafRef         = useRef<number>(0);
  const detectRafRef     = useRef<number>(0);
  const isRunningRef     = useRef(false);
  const hasAwakenedRef   = useRef(false);
  const awakeTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncRef        = useRef(0);
  const trackStatusRef = useRef<TrackStatus>('searching');
  const handPresentRef = useRef(false);
  const camReadyRef    = useRef(false);
  const modelReadyRef  = useRef(false);

  /* ── Mirror canvas sizing ─────────────────────────────────────────────── */
  useEffect(() => {
    const setSize = () => {
      const canvas = mirrorCanvasRef.current;
      if (!canvas) return;
      const w = canvas.clientWidth || canvas.offsetWidth || 340;
      const h = canvas.clientHeight || canvas.offsetHeight || 340;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };
    setSize();
    const obs = new ResizeObserver(setSize);
    if (mirrorCanvasRef.current) obs.observe(mirrorCanvasRef.current);
    return () => obs.disconnect();
  }, []);

  /* ── Background canvas animation ────────────────────────────────────────── */
  useEffect(() => {
    const canvas = bgCanvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    const particles = Array.from({ length: 130 }, () => mkParticle(canvas.width, true));
    const tick = () => {
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      for (const p of particles) {
        p.phase += p.speed;
        p.x += p.vx + Math.sin(p.phase * 0.7) * 0.38;
        p.y += p.vy;
        p.rot += p.rotV;
        if (p.x < -25) p.x = W + 12;
        if (p.x > W + 25) p.x = -12;
        if (p.y < -35) Object.assign(p, mkParticle(W, false), { y: H + 22 });
        drawParticle(ctx, p);
      }
      bgRafRef.current = requestAnimationFrame(tick);
    };
    tick();
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(bgRafRef.current); };
  }, []);

  /* ── Detection loop ──────────────────────────────────────────────────────── */
  const startDetectionLoop = useCallback(() => {
    if (isRunningRef.current) return;
    const video    = videoRef.current;
    const canvas   = mirrorCanvasRef.current;
    const lmarker  = landmarkerRef.current;
    if (!video || !canvas || !lmarker) return;

    isRunningRef.current = true;
    let frameCount = 0;
    let lastFpsMs  = performance.now();

    const loop = () => {
      if (!isRunningRef.current) return;
      frameCount++;
      const W = canvas.width || canvas.clientWidth || 340;
      const H = canvas.height || canvas.clientHeight || 340;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, W, H);

      // FPS (update every ~0.75s)
      const now = performance.now();
      if (now - lastFpsMs >= 750) {
        setFps(Math.round((frameCount * 1000) / (now - lastFpsMs)));
        frameCount = 0;
        lastFpsMs = now;
      }

      if (video.readyState >= 2 && video.videoWidth > 0) {
        try {
          const result = lmarker.detectForVideo(video, now);
          const lms = result.landmarks?.[0];

          if (lms?.length) {
            // Hand detected
            if (!handPresentRef.current) { handPresentRef.current = true; setHandPresent(true); }

            // Draw scanning ring
            const cx = W / 2, cy = H / 2;
            const ring = Math.min(W, H) * 0.42;
            ctx.save();
            ctx.strokeStyle = 'rgba(45,206,122,0.22)';
            ctx.lineWidth = 1.2;
            ctx.setLineDash([7, 5]);
            ctx.beginPath(); ctx.arc(cx, cy, ring, 0, Math.PI * 2); ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();

            drawHandSkeleton(ctx, lms, W, H);

            // Advance progress
            syncRef.current = Math.min(100, syncRef.current + 0.21);

          } else {
            // No hand
            if (handPresentRef.current) { handPresentRef.current = false; setHandPresent(false); }
            syncRef.current = Math.max(0, syncRef.current - 0.06);
          }

          // Compute status
          const p = syncRef.current;
          const newStatus: TrackStatus =
            hasAwakenedRef.current ? 'awakened' :
            p >= 100 ? 'awakened' :
            p >= 62 ? 'recognized' :
            lms?.length ? 'synchronizing' : 'searching';

          if (newStatus !== trackStatusRef.current) {
            trackStatusRef.current = newStatus;
            setTrackStatus(newStatus);

            if (newStatus === 'awakened' && !hasAwakenedRef.current) {
              hasAwakenedRef.current = true;
              syncRef.current = 100;
              setSyncProgress(100);
              setAwakeningFlash(true);
              awakeTimerRef.current = setTimeout(() => setScreen('modes'), 2800);
            }
          }

          // State updates (rate-limited to every 3 frames)
          if (frameCount % 3 === 0) {
            setSyncProgress(Math.floor(syncRef.current));
          }

        } catch (_) { /* ignore detection errors */ }
      }

      detectRafRef.current = requestAnimationFrame(loop);
    };
    loop();
  }, [setScreen]);

  /* ── Camera setup ────────────────────────────────────────────────────────── */
  useEffect(() => {
    let active = true;
    async function setupCam() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        });
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        const video = videoRef.current!;
        video.srcObject = stream;
        await new Promise<void>(res => {
          if (video.readyState >= 1 && video.videoWidth > 0) return res();
          video.addEventListener('loadedmetadata', () => res(), { once: true });
        });
        try { await video.play(); } catch { /* ignore */ }
        if (!active) return;
        camReadyRef.current = true;
        setCamReady(true);
        if (modelReadyRef.current) startDetectionLoop();
      } catch (e) {
        console.error('[Awakening] Camera denied:', e);
        if (active) setCamError(true);
      }
    }
    setupCam();
    return () => {
      active = false;
      isRunningRef.current = false;
      cancelAnimationFrame(detectRafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (awakeTimerRef.current !== null) {
        clearTimeout(awakeTimerRef.current);
        awakeTimerRef.current = null;
      }
    };
  }, [startDetectionLoop]);

  /* ── MediaPipe init ──────────────────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    async function initModel() {
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        if (cancelled) return;
        const lm = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
          runningMode: 'VIDEO',
          numHands: 1,
        });
        if (cancelled) { lm.close(); return; }
        landmarkerRef.current = lm;
        modelReadyRef.current = true;
        if (camReadyRef.current) startDetectionLoop();
      } catch (e) {
        console.error('[Awakening] MediaPipe init failed:', e);
      }
    }
    initModel();
    return () => {
      cancelled = true;
      landmarkerRef.current?.close();
      isRunningRef.current = false;
      cancelAnimationFrame(detectRafRef.current);
    };
  }, [startDetectionLoop]);

  const handleContinue = useCallback(() => {
    isRunningRef.current = false;
    if (awakeTimerRef.current !== null) {
      clearTimeout(awakeTimerRef.current);
      awakeTimerRef.current = null;
    }
    setScreen('modes');
  }, [setScreen]);

  /* ── Derived values ──────────────────────────────────────────────────────── */
  const isAwakened   = trackStatus === 'awakened';
  const isRecognized = trackStatus === 'recognized' || isAwakened;

  const trackLabel: Record<TrackStatus, string> = {
    searching:    'SEARCHING...',
    synchronizing:'SYNCHRONIZING...',
    recognized:   'GUARDIAN RECOGNIZED',
    awakened:     'BLADE AWAKENED',
  };
  const trackColor: Record<TrackStatus, string> = {
    searching:    'rgba(180,180,180,0.6)',
    synchronizing:'#2dce7a',
    recognized:   '#ffd700',
    awakened:     '#ffaa00',
  };

  /* ── Render ──────────────────────────────────────────────────────────────── */
  return (
    <div className="w-full h-full relative overflow-hidden select-none" style={{ background: '#02000e' }}>
      <style>{STYLES}</style>

      {/* ── Sky gradient ── */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background:
          'radial-gradient(ellipse 70% 40% at 78% 12%, rgba(100,70,20,.28) 0%, transparent 55%),' +
          'radial-gradient(ellipse 130% 70% at 50% 105%, rgba(6,0,26,.95) 0%, transparent 65%),' +
          'linear-gradient(165deg,#070020 0%,#0d0030 30%,#080018 60%,#030010 100%)',
      }} />

      {/* ── Moon ── */}
      <div className="absolute pointer-events-none" style={{
        top: '7%', right: '9%', width: 110, height: 110, borderRadius: '50%',
        background: 'radial-gradient(circle,rgba(255,242,185,.92) 0%,rgba(235,205,120,.5) 50%,transparent 72%)',
        boxShadow: '0 0 70px 28px rgba(255,220,120,.18)',
        animation: 'wa-moon-pulse 9s ease-in-out infinite',
      }} />

      {/* ── Mountain silhouettes ── */}
      <svg viewBox="0 0 1440 320" preserveAspectRatio="none"
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{ height: '48%', width: '100%' }}>
        <defs>
          <linearGradient id="mt1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1c0a3e" stopOpacity=".55" />
            <stop offset="100%" stopColor="#0a0022" stopOpacity=".95" />
          </linearGradient>
          <linearGradient id="mt2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#100828" stopOpacity=".85" />
            <stop offset="100%" stopColor="#050014" stopOpacity="1" />
          </linearGradient>
        </defs>
        <path d="M0,320 0,180 80,115 160,148 240,85 330,128 430,55 530,108 610,68 700,118 780,45 860,95 940,75 1020,128 1120,55 1220,108 1310,75 1380,128 1440,98 1440,320Z" fill="url(#mt1)"/>
        <path d="M0,320 0,228 105,172 200,205 300,145 415,182 520,132 620,168 720,112 805,158 905,128 1000,178 1100,142 1200,182 1300,152 1385,188 1440,162 1440,320Z" fill="url(#mt2)"/>
      </svg>

      {/* ── Mist layer ── */}
      <div className="absolute inset-0 pointer-events-none" style={{ animation: 'wa-mist 14s ease-in-out infinite' }}>
        <div style={{
          position: 'absolute', bottom: '28%', left: 0, right: 0, height: 70,
          background: 'linear-gradient(90deg,transparent,rgba(160,140,255,.06) 30%,rgba(160,140,255,.09) 50%,rgba(160,140,255,.06) 70%,transparent)',
        }}/>
      </div>

      {/* ── Particle canvas ── */}
      <canvas ref={bgCanvasRef} className="absolute inset-0 pointer-events-none" style={{ mixBlendMode: 'screen' }} />

      {/* ── Left Chinese banner ── */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5, duration: 0.8 }}
        className="absolute pointer-events-none" style={{ left: 14, top: '16%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, zIndex: 15 }}>
        <div style={{
          background: 'linear-gradient(180deg,#1c0a04 0%,#2e1505 50%,#1c0a04 100%)',
          border: '1px solid rgba(212,165,32,.55)',
          borderTop: '3px solid #d4a520', borderBottom: '3px solid #d4a520',
          padding: '18px 11px', color: '#d4a520', fontFamily: 'serif',
          fontSize: 21, lineHeight: 1.5, writingMode: 'vertical-rl', textOrientation: 'upright',
          letterSpacing: 5, boxShadow: '0 0 22px rgba(212,165,32,.18)',
        }}>守護者</div>
        <span style={{ color: 'rgba(212,165,32,.55)', fontSize: 9, letterSpacing: 2, fontFamily: 'serif' }}>GUARDIAN</span>
      </motion.div>

      {/* ── Right Chinese banner ── */}
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5, duration: 0.8 }}
        className="absolute pointer-events-none" style={{ right: 14, top: '16%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, zIndex: 15 }}>
        <div style={{
          background: 'linear-gradient(180deg,#1c0a04 0%,#2e1505 50%,#1c0a04 100%)',
          border: '1px solid rgba(212,165,32,.55)',
          borderTop: '3px solid #d4a520', borderBottom: '3px solid #d4a520',
          padding: '18px 11px', color: '#d4a520', fontFamily: 'serif',
          fontSize: 21, lineHeight: 1.5, writingMode: 'vertical-rl', textOrientation: 'upright',
          letterSpacing: 5, boxShadow: '0 0 22px rgba(212,165,32,.18)',
        }}>聖剣</div>
        <span style={{ color: 'rgba(212,165,32,.55)', fontSize: 9, letterSpacing: 2, fontFamily: 'serif' }}>SACRED BLADE</span>
      </motion.div>

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: [0.22,1,0.36,1] }}
        className="absolute top-0 left-0 right-0 flex flex-col items-center pointer-events-none" style={{ paddingTop: 18, zIndex: 20 }}>
        <h1 style={{
          fontFamily: '"Cinzel Decorative","Palatino Linotype",Georgia,serif',
          fontSize: 'clamp(20px,3.8vw,42px)', fontWeight: 900,
          letterSpacing: '0.15em', margin: 0, color: 'transparent',
          backgroundClip: 'text', WebkitBackgroundClip: 'text',
          backgroundImage: 'linear-gradient(180deg,#ffe566 0%,#d4a520 40%,#a07010 72%,#d4a520 100%)',
          filter: 'drop-shadow(0 0 18px rgba(212,165,32,.65))',
          textTransform: 'uppercase',
        }}>Warrior's Awakening</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 5 }}>
          <div style={{ height: 1, width: 55, background: 'linear-gradient(90deg,transparent,rgba(212,165,32,.55))' }}/>
          <span style={{ color: 'rgba(212,165,32,.7)', fontFamily: 'Georgia,serif', fontSize: 'clamp(9px,1.3vw,13px)', letterSpacing: '0.18em', fontStyle: 'italic' }}>
            The Sacred Blade Seeks Its Guardian
          </span>
          <div style={{ height: 1, width: 55, background: 'linear-gradient(90deg,rgba(212,165,32,.55),transparent)' }}/>
        </div>
      </motion.div>

      {/* ── Main content row ── */}
      <div className="absolute inset-0 flex items-center justify-center"
        style={{ paddingTop: 80, paddingBottom: 130, gap: 'clamp(10px,2vw,32px)', zIndex: 10, paddingLeft: 60, paddingRight: 60 }}>

        {/* ── Awakening Ritual scroll ── */}
        <motion.div initial={{ opacity: 0, x: -36 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35, duration: 0.9 }}
          style={{
            width: 'clamp(130px,16vw,195px)', flexShrink: 0,
            background: 'linear-gradient(180deg,#f5e8c0 0%,#e8d098 28%,#d4b46a 62%,#c8a040 82%,#d4b46a 100%)',
            borderRadius: 3, padding: 'clamp(14px,2vw,22px) clamp(12px,1.5vw,18px)',
            boxShadow: '0 0 32px rgba(0,0,0,.85),inset 0 0 18px rgba(180,130,35,.18),3px 0 10px rgba(0,0,0,.5)',
            border: '1px solid rgba(175,125,35,.6)', position: 'relative',
          }}>
          {/* Torn top edge */}
          <div style={{
            position:'absolute',top:-7,left:0,right:0,height:14,
            background:'linear-gradient(180deg,#c8a040,#d4b46a)',
            clipPath:'polygon(0% 0%,4% 55%,8% 0%,12% 70%,16% 8%,20% 55%,24% 0%,28% 65%,32% 8%,36% 45%,40% 0%,44% 58%,48% 5%,52% 68%,56% 0%,60% 50%,64% 8%,68% 65%,72% 0%,76% 45%,80% 12%,84% 68%,88% 0%,92% 55%,96% 8%,100% 0%,100% 100%,0% 100%)',
          }}/>
          {/* Torn bottom edge */}
          <div style={{
            position:'absolute',bottom:-7,left:0,right:0,height:14,
            background:'linear-gradient(0deg,#c8a040,#d4b46a)',
            clipPath:'polygon(0% 100%,4% 45%,8% 100%,12% 30%,16% 92%,20% 45%,24% 100%,28% 35%,32% 92%,36% 55%,40% 100%,44% 42%,48% 95%,52% 32%,56% 100%,60% 50%,64% 92%,68% 35%,72% 100%,76% 55%,80% 88%,84% 32%,88% 100%,92% 45%,96% 92%,100% 100%,100% 0%,0% 0%)',
          }}/>

          <h3 style={{
            fontFamily:'"Cinzel Decorative",Georgia,serif',
            fontSize:'clamp(9px,1.2vw,12px)', color:'#3a1800',
            letterSpacing:'0.08em', marginBottom:12, textAlign:'center',
            borderBottom:'1px solid rgba(100,58,10,.35)', paddingBottom:8,
          }}>Awakening Ritual</h3>

          {[
            { icon: '🤚', text: 'Raise your dominant hand.' },
            { icon: '○', text: 'Keep your hand inside the sacred circle.' },
            { icon: '◎', text: 'Move naturally.' },
            { icon: '⚔', text: 'Synchronize with the Sacred Blade.' },
          ].map((item, i) => (
            <div key={i} style={{ display:'flex', gap:7, marginBottom:10, alignItems:'flex-start' }}>
              <span style={{ fontSize:12, minWidth:16, color:'#5a2200', marginTop:1 }}>{item.icon}</span>
              <p style={{ fontFamily:'Georgia,serif', fontSize:'clamp(8px,1vw,11px)', color:'#3a1800', lineHeight:1.55, margin:0, fontStyle:'italic' }}>{item.text}</p>
            </div>
          ))}

          <div style={{ marginTop:10, textAlign:'center', fontSize:18, color:'rgba(160,55,18,.65)' }}>印</div>
        </motion.div>

        {/* ── Jade Mirror ── */}
        <motion.div initial={{ opacity: 0, scale: 0.82 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15, duration: 1, ease: [0.16,1,0.3,1] }}
          style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, flex:'0 0 auto' }}>

          <div style={{
            color: handPresent ? '#2dce7a' : 'rgba(45,206,122,.48)',
            fontFamily:'"Orbitron",sans-serif', fontSize:10, letterSpacing:'0.28em', transition:'color .6s',
            animation: !handPresent ? 'wa-status-blink 2s ease-in-out infinite' : undefined,
          }}>LIVE CAMERA</div>

          {/* Mirror frame + inner */}
          <div ref={mirrorRef} style={{ position:'relative', width:'clamp(210px,30vw,350px)', height:'clamp(210px,30vw,350px)' }}>

            {/* Outer conic frame */}
            <div style={{
              position:'absolute', inset:-13, borderRadius:'50%',
              background:'conic-gradient(from 0deg,#1a6e38,#0d4820,#2dce7a,#d4a520,#1a6e38,#0d4820,#2dce7a,#0d4820,#d4a520,#1a6e38)',
              animation: handPresent ? 'wa-mirror-active 2.2s ease-in-out infinite' : 'wa-mirror-idle 4.5s ease-in-out infinite',
              zIndex:0,
            }}/>

            {/* Cardinal orbs */}
            {[
              { top:-10, left:'50%', transform:'translateX(-50%)' },
              { bottom:-10, left:'50%', transform:'translateX(-50%)' },
              { left:-10, top:'50%', transform:'translateY(-50%)' },
              { right:-10, top:'50%', transform:'translateY(-50%)' },
            ].map((pos, i) => (
              <div key={i} style={{
                position:'absolute', ...pos,
                width:18, height:18, borderRadius:'50%',
                background:'radial-gradient(circle,#ffe066,#a87000)',
                border:'2px solid rgba(255,220,80,.75)',
                boxShadow:`0 0 ${handPresent?'14px rgba(212,165,32,.95)':'8px rgba(212,165,32,.4)'}`,
                transition:'box-shadow .5s', zIndex:3,
              }}/>
            ))}

            {/* Dragon carvings (top arc decoration) */}
            <div style={{
              position:'absolute', inset:-13, borderRadius:'50%',
              background:'transparent',
              border:'2px solid rgba(45,206,122,0)',
              zIndex:1, pointerEvents:'none',
            }}>
              {/* Carved cloud motifs at top */}
              {[-30,-15,0,15,30].map(deg => (
                <div key={deg} style={{
                  position:'absolute', top:'4%', left:'50%',
                  width:6, height:6, borderRadius:'50%',
                  background:'rgba(45,206,122,.4)',
                  transform:`translateX(-50%) rotate(${deg}deg) translateY(-${0}px)`,
                  boxShadow:'0 0 4px rgba(45,206,122,.5)',
                }}/>
              ))}
            </div>

            {/* Inner mirror (clips video + overlay) */}
            <div style={{
              position:'absolute', inset:0, borderRadius:'50%', overflow:'hidden',
              background:'#010008', zIndex:2,
              border:'3px solid rgba(45,206,122,.35)',
            }}>
              {/* Webcam feed */}
              <video ref={videoRef} playsInline muted style={{
                position:'absolute', inset:0, width:'100%', height:'100%',
                objectFit:'cover', transform:'scaleX(-1)',
                opacity: camReady ? 1 : 0, transition:'opacity 1.2s',
              }}/>

              {/* Loading / error state */}
              {!camReady && (
                <div style={{
                  position:'absolute', inset:0, display:'flex', flexDirection:'column',
                  alignItems:'center', justifyContent:'center', color:'rgba(45,206,122,.55)',
                  gap:10,
                }}>
                  <div style={{ fontSize:36, animation:'wa-float 3s ease-in-out infinite' }}>◎</div>
                  <div style={{ fontFamily:'"Orbitron",sans-serif', fontSize:9, letterSpacing:'0.22em', textAlign:'center', padding:'0 20px' }}>
                    {camError ? 'GRANT CAMERA\nPERMISSION' : 'AWAKENING\nSACRED MIRROR...'}
                  </div>
                </div>
              )}

              {/* Scan line when camera active but no hand */}
              {camReady && !handPresent && !camError && (
                <div style={{
                  position:'absolute', left:0, right:0, height:2, zIndex:3,
                  background:'linear-gradient(90deg,transparent,rgba(45,206,122,.55),transparent)',
                  animation:'wa-scan 2.8s ease-in-out infinite',
                }}/>
              )}

              {/* Hand overlay canvas */}
              <canvas ref={mirrorCanvasRef} style={{
                position:'absolute', inset:0, width:'100%', height:'100%', zIndex:4,
              }}/>
            </div>
          </div>

          <div style={{
            color: trackColor[trackStatus],
            fontFamily:'"Orbitron",sans-serif', fontSize:9, letterSpacing:'0.28em',
            transition:'color .6s',
            animation: trackStatus === 'searching' ? 'wa-status-blink 2s ease-in-out infinite' : undefined,
          }}>SACRED TRACKING</div>
        </motion.div>

        {/* ── Sacred Blade ── */}
        <motion.div initial={{ opacity: 0, x: 36 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45, duration: 0.9 }}
          style={{ width:'clamp(80px,11vw,140px)', flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>

          <div style={{
            animation: isRecognized ? 'wa-sword-float 2.6s ease-in-out infinite' : 'wa-float 4.2s ease-in-out infinite',
            filter: isRecognized
              ? 'drop-shadow(0 0 24px rgba(45,206,122,.9)) drop-shadow(0 0 48px rgba(45,206,122,.45))'
              : 'drop-shadow(0 0 8px rgba(45,206,122,.25))',
            transition:'filter 1.2s',
          }}>
            <SacredBlade awakened={isRecognized} />
          </div>

          {/* Stone pedestal */}
          <div style={{
            width:'clamp(55px,8vw,100px)',
            background:'linear-gradient(180deg,#2a1a08 0%,#1a1004 50%,#0e0a02 100%)',
            border:'1px solid rgba(212,165,32,.38)',
            borderRadius:'4px 4px 2px 2px',
            padding:'8px 0',
            textAlign:'center',
            boxShadow: isRecognized ? '0 0 28px rgba(45,206,122,.42)' : '0 0 10px rgba(0,0,0,.8)',
            transition:'box-shadow 1.2s',
          }}>
            <span style={{
              fontFamily:'"Orbitron",sans-serif', fontSize:7, letterSpacing:'0.12em',
              color: isRecognized ? '#2dce7a' : 'rgba(212,165,32,.38)',
              transition:'color 1.2s', display:'block',
            }}>SACRED BLADE</span>
            <span style={{
              fontFamily:'"Orbitron",sans-serif', fontSize:7, letterSpacing:'0.12em',
              color: isRecognized ? '#ffd700' : 'rgba(212,165,32,.3)',
              transition:'color 1.2s', display:'block', marginTop:2,
            }}>{isAwakened ? 'AWAKENED' : isRecognized ? 'AWAKENING' : 'DORMANT'}</span>
          </div>
        </motion.div>
      </div>

      {/* ── Sync progress bar + continue ── */}
      <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.8 }}
        className="absolute left-0 right-0 flex flex-col items-center"
        style={{ bottom: 58, gap: 10, zIndex: 20 }}>

        <div style={{
          fontFamily:'"Cinzel Decorative",Georgia,serif',
          fontSize:'clamp(8px,1.1vw,11px)', letterSpacing:'0.22em',
          color:'rgba(212,165,32,.78)', textTransform:'uppercase',
        }}>Synchronizing Sacred Blade</div>

        {/* Progress track */}
        <div style={{
          width:'clamp(240px,38vw,460px)', height:11,
          background:'rgba(18,8,36,.85)',
          border:'1px solid rgba(45,206,122,.28)', borderRadius:6,
          overflow:'hidden', boxShadow:'inset 0 2px 6px rgba(0,0,0,.6)',
          position:'relative',
        }}>
          <div style={{
            height:'100%', width:`${syncProgress}%`,
            background: syncProgress >= 100
              ? 'linear-gradient(90deg,#a87000,#ffd700,#d4a520)'
              : 'linear-gradient(90deg,#0a4820,#2dce7a,#50ffb8)',
            borderRadius:6, transition:'width .12s linear, background .6s',
            animation: syncProgress > 2 ? 'wa-progress-glow 1.6s ease-in-out infinite' : undefined,
          }}/>
          {/* Bamboo segments */}
          {[...Array(9)].map((_,i) => (
            <div key={i} style={{
              position:'absolute', top:0, bottom:0,
              left:`${(i+1)*11.11}%`, width:1,
              background:'rgba(0,0,0,.3)',
            }}/>
          ))}
        </div>

        <div style={{
          fontFamily:'"Orbitron",sans-serif',
          fontSize:'clamp(10px,1.3vw,14px)',
          color: syncProgress >= 100 ? '#ffd700' : '#2dce7a',
          letterSpacing:'0.1em', transition:'color .5s',
        }}>{syncProgress}%</div>

        {/* Continue Journey button */}
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleContinue}
          style={{
            marginTop: 4,
            padding: 'clamp(10px,1.3vh,14px) clamp(32px,4vw,54px)',
            background: 'linear-gradient(180deg,#2c1805 0%,#1c1002 50%,#100a00 100%)',
            border: `2px solid ${syncProgress > 0 ? '#d4a520' : 'rgba(212,165,32,.3)'}`,
            borderRadius: 4, cursor: 'pointer',
            fontFamily: '"Cinzel Decorative",Georgia,serif',
            fontSize: 'clamp(10px,1.3vw,14px)', letterSpacing: '0.2em',
            color: syncProgress > 0 ? '#d4a520' : 'rgba(212,165,32,.4)',
            textTransform: 'uppercase', transition: 'all .4s',
            animation: 'wa-btn-breathe 3s ease-in-out infinite',
            position: 'relative', overflow: 'hidden',
          }}
        >
          <span style={{
            position:'absolute', left:14, top:'50%', transform:'translateY(-50%)',
            width:8, height:8, borderRadius:'50%',
            background: syncProgress > 0 ? '#2dce7a' : '#0d3a1e',
            boxShadow: syncProgress > 0 ? '0 0 8px rgba(45,206,122,.85)' : 'none',
            transition:'all .5s',
          }}/>
          Continue Journey
          <span style={{
            position:'absolute', right:14, top:'50%', transform:'translateY(-50%)',
            width:8, height:8, borderRadius:'50%',
            background: syncProgress > 0 ? '#2dce7a' : '#0d3a1e',
            boxShadow: syncProgress > 0 ? '0 0 8px rgba(45,206,122,.85)' : 'none',
            transition:'all .5s',
          }}/>
        </motion.button>
      </motion.div>

      {/* ── Bottom HUD ── */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center"
        style={{ height:50, borderTop:'1px solid rgba(212,165,32,.14)', background:'rgba(2,0,14,.75)', gap:'clamp(14px,2.8vw,48px)', zIndex:20 }}>
        {[
          { icon:'◈', label:'FPS', val:`${fps || '--'}` },
          { icon:'🤚', label:'TRACKING', val: trackLabel[trackStatus] },
          { icon:'☀', label:'LIGHTING', val:'GOOD' },
          { icon:'◎', label:'CALIBRATION', val:`${syncProgress}%` },
        ].map(item => (
          <div key={item.label} style={{ display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ fontSize:12 }}>{item.icon}</span>
            <span style={{ fontFamily:'"Orbitron",sans-serif', fontSize:8, color:'rgba(212,165,32,.48)', letterSpacing:'0.08em' }}>{item.label}:</span>
            <span style={{
              fontFamily:'"Orbitron",sans-serif', fontSize:8, letterSpacing:'0.08em',
              color: item.label==='TRACKING' ? trackColor[trackStatus] : 'rgba(255,255,255,.65)',
              transition:'color .5s',
            }}>{item.val}</span>
          </div>
        ))}
      </div>

      {/* ── Awakening flash ── */}
      <AnimatePresence>
        {awakeningFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.85, 0] }}
            transition={{ duration: 2.4, times: [0, 0.12, 0.55, 1] }}
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center,rgba(255,255,255,.96) 0%,rgba(45,206,122,.65) 38%,transparent 68%)',
              zIndex: 60,
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
