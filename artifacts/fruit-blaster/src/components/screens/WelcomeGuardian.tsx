import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { useSoundManager } from '../../hooks/useSoundManager';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
interface Petal {
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  rot: number; rotV: number;
  opacity: number;
  phase: number; phaseSpeed: number;
  swayAmp: number;
  hue: number;
}

interface Firefly {
  x: number; y: number;
  vx: number; vy: number;
  phase: number; phaseSpeed: number;
  size: number;
  brightness: number;
}

interface DustMote {
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  opacity: number;
  phase: number;
}

interface Bat {
  x: number; y: number;
  vx: number; vy: number;
  wingPhase: number;
  size: number;
}

/* ─────────────────────────────────────────────
   Spawn helpers
───────────────────────────────────────────── */
function spawnPetal(W: number, scatterY = false): Petal {
  return {
    x: Math.random() * W,
    y: scatterY ? Math.random() * window.innerHeight : -14,
    vx: (Math.random() - 0.5) * 0.6,
    vy: 0.4 + Math.random() * 1.0,
    size: 3 + Math.random() * 8,
    rot: Math.random() * Math.PI * 2,
    rotV: (Math.random() - 0.5) * 0.04,
    opacity: 0.35 + Math.random() * 0.55,
    phase: Math.random() * Math.PI * 2,
    phaseSpeed: 0.010 + Math.random() * 0.018,
    swayAmp: 0.3 + Math.random() * 0.9,
    hue: 335 + Math.random() * 25,
  };
}

function spawnFirefly(W: number, H: number): Firefly {
  return {
    x: Math.random() * W,
    y: Math.random() * H,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3,
    phase: Math.random() * Math.PI * 2,
    phaseSpeed: 0.018 + Math.random() * 0.028,
    size: 1.5 + Math.random() * 2,
    brightness: 0.5 + Math.random() * 0.5,
  };
}

function spawnDust(W: number): DustMote {
  return {
    x: Math.random() * W,
    y: Math.random() * window.innerHeight,
    vx: (Math.random() - 0.5) * 0.18,
    vy: -0.12 - Math.random() * 0.18,
    size: 0.8 + Math.random() * 1.4,
    opacity: 0.12 + Math.random() * 0.22,
    phase: Math.random() * Math.PI * 2,
  };
}

function spawnBatFlock(fromLeft: boolean, H: number): Bat[] {
  const count = 5 + Math.floor(Math.random() * 4);
  const startX = fromLeft ? -60 : window.innerWidth + 60;
  const startY = H * 0.15 + Math.random() * H * 0.15;
  return Array.from({ length: count }, (_, i) => ({
    x: startX + (fromLeft ? -1 : 1) * i * 18,
    y: startY + (Math.random() - 0.5) * 40,
    vx: fromLeft ? 1.8 + Math.random() * 0.8 : -(1.8 + Math.random() * 0.8),
    vy: (Math.random() - 0.5) * 0.3,
    wingPhase: Math.random() * Math.PI * 2,
    size: 6 + Math.random() * 4,
  }));
}

function drawPetal(ctx: CanvasRenderingContext2D, p: Petal) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  const alpha = p.opacity * (0.65 + 0.35 * Math.sin(p.phase));
  ctx.globalAlpha = alpha * 0.7;
  ctx.fillStyle = `hsl(${p.hue - 6},70%,80%)`;
  ctx.beginPath();
  ctx.ellipse(-p.size * 0.25, p.size * 0.1, p.size * 0.65, p.size * 0.38, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = `hsl(${p.hue},72%,74%)`;
  ctx.beginPath();
  ctx.ellipse(0, 0, p.size, p.size * 0.52, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = alpha * 0.85;
  ctx.fillStyle = `hsl(${p.hue + 8},60%,84%)`;
  ctx.beginPath();
  ctx.ellipse(p.size * 0.28, -p.size * 0.08, p.size * 0.72, p.size * 0.40, 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFirefly(ctx: CanvasRenderingContext2D, f: Firefly) {
  const glow = (0.4 + 0.6 * Math.sin(f.phase)) * f.brightness;
  ctx.save();
  const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.size * 3);
  g.addColorStop(0, `rgba(200,255,150,${glow})`);
  g.addColorStop(0.4, `rgba(170,255,100,${glow * 0.4})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(f.x, f.y, f.size * 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = glow;
  ctx.fillStyle = '#e8ffcc';
  ctx.beginPath();
  ctx.arc(f.x, f.y, f.size * 0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBat(ctx: CanvasRenderingContext2D, b: Bat) {
  const wing = Math.sin(b.wingPhase) * 0.6;
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = '#0a0010';
  // body
  ctx.beginPath();
  ctx.ellipse(0, 0, b.size * 0.35, b.size * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();
  // left wing
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-b.size * 0.6, -b.size * (0.5 + wing), -b.size, b.size * 0.1, -b.size * 0.8, b.size * 0.3);
  ctx.bezierCurveTo(-b.size * 0.4, b.size * 0.2, -b.size * 0.1, b.size * 0.1, 0, 0);
  ctx.fill();
  // right wing
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(b.size * 0.6, -b.size * (0.5 + wing), b.size, b.size * 0.1, b.size * 0.8, b.size * 0.3);
  ctx.bezierCurveTo(b.size * 0.4, b.size * 0.2, b.size * 0.1, b.size * 0.1, 0, 0);
  ctx.fill();
  ctx.restore();
}

/* ─────────────────────────────────────────────
   CSS keyframes
───────────────────────────────────────────── */
const STYLES = `
@keyframes wg-camera-drift {
  0%   { transform: translate(0px, 0px) scale(1.04); }
  25%  { transform: translate(5px, -3px) scale(1.04); }
  50%  { transform: translate(0px, -5px) scale(1.04); }
  75%  { transform: translate(-5px, -2px) scale(1.04); }
  100% { transform: translate(0px, 0px) scale(1.04); }
}
@keyframes wg-btn-breathe {
  0%,100% { box-shadow: 0 0 18px 4px rgba(200,160,30,.55), 0 0 50px 10px rgba(180,120,10,.22), inset 0 0 10px rgba(255,210,60,.10); }
  50%     { box-shadow: 0 0 32px 10px rgba(220,180,50,.80), 0 0 80px 22px rgba(210,150,20,.40), inset 0 0 18px rgba(255,230,80,.22); }
}
@keyframes wg-btn-shine {
  0%   { transform: translateX(-160%) skewX(-20deg); opacity:0; }
  8%   { opacity:.9; }
  92%  { opacity:.9; }
  100% { transform: translateX(380%) skewX(-20deg); opacity:0; }
}
@keyframes wg-btn-float {
  0%,100% { transform: translateY(0px); }
  50%     { transform: translateY(-5px); }
}
@keyframes wg-vignette {
  0%,100% { opacity:.75; }
  50%     { opacity:.60; }
}
`;

const PETAL_COUNT = 120;
const FIREFLY_COUNT = 22;
const DUST_COUNT = 40;
const BAT_INTERVAL = 25000;

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */
export default function WelcomeGuardian() {
  const { setScreen } = useGameStore();
  const { playClick } = useSoundManager();

  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const audioRef   = useRef<HTMLAudioElement>(null);
  const rafRef     = useRef<number>(0);
  const petals     = useRef<Petal[]>([]);
  const fireflies  = useRef<Firefly[]>([]);
  const dust       = useRef<DustMote[]>([]);
  const bats       = useRef<Bat[]>([]);
  const batTimer   = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const musicReady = useRef(false);
  const [muted, setMuted] = useState(false);
  const [btnVisible, setBtnVisible] = useState(false);

  /* Canvas resize */
  const resize = () => {
    const c = canvasRef.current;
    if (!c) return;
    c.width  = window.innerWidth;
    c.height = window.innerHeight;
  };

  /* Init particles */
  useEffect(() => {
    resize();
    window.addEventListener('resize', resize);
    const W = window.innerWidth, H = window.innerHeight;
    petals.current    = Array.from({ length: PETAL_COUNT },  () => spawnPetal(W, true));
    fireflies.current = Array.from({ length: FIREFLY_COUNT }, () => spawnFirefly(W, H));
    dust.current      = Array.from({ length: DUST_COUNT },    () => spawnDust(W));
    return () => window.removeEventListener('resize', resize);
  }, []);

  /* RAF loop */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const tick = () => {
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      /* Petals */
      for (const p of petals.current) {
        p.phase += p.phaseSpeed;
        p.x     += p.vx + Math.sin(p.phase) * p.swayAmp;
        p.y     += p.vy;
        p.rot   += p.rotV;
        if (p.x < -20) p.x = W + 10;
        if (p.x > W + 20) p.x = -10;
        if (p.y > H + 20) Object.assign(p, spawnPetal(W, false));
        drawPetal(ctx, p);
      }

      /* Fireflies */
      for (const f of fireflies.current) {
        f.phase += f.phaseSpeed;
        f.x += f.vx + Math.sin(f.phase * 0.7) * 0.25;
        f.y += f.vy + Math.cos(f.phase * 0.5) * 0.18;
        f.vx += (Math.random() - 0.5) * 0.015;
        f.vy += (Math.random() - 0.5) * 0.015;
        f.vx = Math.max(-0.4, Math.min(0.4, f.vx));
        f.vy = Math.max(-0.4, Math.min(0.4, f.vy));
        if (f.x < 0) f.x = W;
        if (f.x > W) f.x = 0;
        if (f.y < 0) f.y = H;
        if (f.y > H) f.y = 0;
        drawFirefly(ctx, f);
      }

      /* Dust */
      for (const d of dust.current) {
        d.phase += 0.012;
        d.x += d.vx + Math.sin(d.phase) * 0.12;
        d.y += d.vy;
        if (d.y < -10 || d.x < -10 || d.x > W + 10) {
          Object.assign(d, spawnDust(W));
          d.y = H + 5;
        }
        ctx.save();
        ctx.globalAlpha = d.opacity * (0.6 + 0.4 * Math.sin(d.phase));
        ctx.fillStyle = '#d4b87a';
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      /* Bats */
      for (let i = bats.current.length - 1; i >= 0; i--) {
        const b = bats.current[i];
        b.x += b.vx;
        b.y += b.vy + Math.sin(b.wingPhase * 0.5) * 0.4;
        b.wingPhase += 0.18;
        drawBat(ctx, b);
        if (b.x < -120 || b.x > W + 120) bats.current.splice(i, 1);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  /* Bat flock timer */
  useEffect(() => {
    const H = window.innerHeight;
    const scheduleBats = () => {
      const delay = BAT_INTERVAL + Math.random() * 8000;
      batTimer.current = setTimeout(() => {
        const fromLeft = Math.random() > 0.5;
        bats.current = [...bats.current, ...spawnBatFlock(fromLeft, H)];
        scheduleBats();
      }, delay);
    };
    scheduleBats();
    return () => clearTimeout(batTimer.current);
  }, []);

  /* Button reveal after 2.8s */
  useEffect(() => {
    const t = setTimeout(() => setBtnVisible(true), 2800);
    return () => clearTimeout(t);
  }, []);

  /* Music: start on first interaction */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.7;
    audio.muted  = false;

    const start = () => {
      if (musicReady.current) return;
      audio.play().then(() => { musicReady.current = true; }).catch(() => {});
      document.removeEventListener('pointerdown', start);
    };
    document.addEventListener('pointerdown', start);
    return () => document.removeEventListener('pointerdown', start);
  }, []);

  /* Stop music when leaving */
  const handleBegin = () => {
    playClick();
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setScreen('modes');
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    if (!musicReady.current) {
      audio.play().then(() => { musicReady.current = true; }).catch(() => {});
    }
    audio.muted = !audio.muted;
    setMuted(audio.muted);
  };

  return (
    <div className="w-full h-full relative overflow-hidden select-none">
      <style>{STYLES}</style>

      {/* ── 1. Background image with camera drift ── */}
      <div
        className="absolute inset-0"
        style={{ animation: 'wg-camera-drift 18s ease-in-out infinite' }}
      >
        <img
          src={`${import.meta.env.BASE_URL}welcome-guardian-bg.png`}
          alt=""
          className="w-full h-full"
          style={{ objectFit: 'cover', objectPosition: 'center' }}
          draggable={false}
        />
      </div>

      {/* ── 2. Vignette ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 100% 95% at 50% 48%, transparent 25%, rgba(2,0,8,0.45) 100%)',
          animation: 'wg-vignette 10s ease-in-out infinite',
        }}
      />

      {/* ── 3. Particle canvas ── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ mixBlendMode: 'screen' }}
      />

      {/* ── 4. Fade-from-black entry ── */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: '#000', zIndex: 20 }}
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 1.6, ease: 'easeInOut' }}
      />

      {/* ── 5. BEGIN THE JOURNEY button ── */}
      {btnVisible && (
        <motion.div
          className="absolute"
          style={{ bottom: '6.5%', left: '50%', zIndex: 30 }}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <button
            onClick={handleBegin}
            aria-label="Begin the Journey"
            style={{
              transform: 'translateX(-50%)',
              animation: 'wg-btn-breathe 2.6s ease-in-out infinite, wg-btn-float 4s ease-in-out infinite',
              cursor: 'pointer',
              background: 'linear-gradient(180deg, rgba(6,3,12,0.92) 0%, rgba(10,5,18,0.96) 100%)',
              border: '2.5px solid rgba(210,170,40,0.80)',
              borderRadius: 4,
              padding: '0 52px',
              height: 58,
              minWidth: 300,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
              outline: 'none',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {/* Shimmer sweep */}
            <div className="absolute inset-0 pointer-events-none" style={{ overflow: 'hidden', borderRadius: 4 }}>
              <div style={{
                position: 'absolute', top: 0, left: 0,
                width: '28%', height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255,235,140,0.45), transparent)',
                animation: 'wg-btn-shine 4.5s ease-in-out 1.5s infinite',
              }} />
            </div>

            {/* Gem left */}
            <span style={{
              width: 10, height: 10, borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 35%, #6effa0, #1a8c40)',
              boxShadow: '0 0 6px rgba(60,220,100,0.8)',
              flexShrink: 0,
            }} />

            {/* Label */}
            <span style={{
              fontFamily: '"Cinzel Decorative", "Palatino Linotype", Georgia, serif',
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: '0.18em',
              color: '#d4a830',
              textShadow: '0 1px 0 rgba(255,230,120,0.50), 0 0 12px rgba(200,150,20,0.60)',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}>
              Begin the Journey
            </span>

            {/* Gem right */}
            <span style={{
              width: 10, height: 10, borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 35%, #6effa0, #1a8c40)',
              boxShadow: '0 0 6px rgba(60,220,100,0.8)',
              flexShrink: 0,
            }} />
          </button>
        </motion.div>
      )}

      {/* ── 6. Music ── */}
      <audio
        ref={audioRef}
        src={`${import.meta.env.BASE_URL}jade-moon-scroll.mp3`}
        loop
        preload="auto"
      />

      {/* ── 7. Mute toggle ── */}
      <motion.button
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.88 }}
        onClick={toggleMute}
        aria-label={muted ? 'Unmute music' : 'Mute music'}
        style={{
          position: 'absolute', top: 14, right: 14,
          width: 44, height: 44, zIndex: 50,
          background: 'rgba(10,5,20,0.65)',
          border: '1.5px solid rgba(210,170,40,0.40)',
          borderRadius: '50%', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 19, outline: 'none',
        }}
      >
        {muted ? '🔇' : '🔊'}
      </motion.button>
    </div>
  );
}
