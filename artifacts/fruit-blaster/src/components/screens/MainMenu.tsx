import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { useSoundManager } from '../../hooks/useSoundManager';

/* ─────────────────────────────────────────────
   Sakura petal type
───────────────────────────────────────────── */
interface Petal {
  x: number; y: number;
  size: number;
  vx: number; vy: number;
  rot: number; rotV: number;
  opacity: number;
  phase: number; phaseSpeed: number;
  swayAmp: number;
  hue: number;
}

/* ─────────────────────────────────────────────
   CSS keyframes
───────────────────────────────────────────── */
const STYLES = `
@keyframes btn-float {
  0%,100% { transform: translate(-50%,-50%) translateY(0px);  }
  50%     { transform: translate(-50%,-50%) translateY(-8px); }
}
@keyframes btn-glow-pulse {
  0%,100% { box-shadow: 0 0 20px 6px rgba(255,190,40,.55), 0 0 60px 14px rgba(220,130,10,.28), inset 0 0 12px rgba(255,210,80,.15); }
  50%     { box-shadow: 0 0 38px 12px rgba(255,220,60,.80), 0 0 90px 26px rgba(240,160,20,.45), inset 0 0 22px rgba(255,230,100,.28); }
}
@keyframes btn-shine {
  0%   { transform: translateX(-140%) skewX(-18deg); opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 1; }
  100% { transform: translateX(340%)  skewX(-18deg); opacity: 0; }
}
@keyframes sword-idle {
  0%,100% { transform: rotate(-8deg) scale(1);    }
  50%     { transform: rotate(-5deg) scale(1.04); }
}
@keyframes vignette-breathe {
  0%,100% { opacity: .80; }
  50%     { opacity: .65; }
}
@keyframes mute-hover {
  0%,100% { box-shadow: 0 0 8px rgba(200,140,20,.25); }
  50%     { box-shadow: 0 0 16px rgba(255,200,60,.50); }
}
`;

/* ─────────────────────────────────────────────
   Spawn helper – scatters across full screen
   on init, top-edge on respawn
───────────────────────────────────────────── */
function spawnPetal(W: number, scatterY = false): Petal {
  return {
    x:         Math.random() * W,
    y:         scatterY ? Math.random() * window.innerHeight : -18,
    size:      3 + Math.random() * 9,
    vx:        (Math.random() - 0.5) * 0.7,
    vy:        0.55 + Math.random() * 1.4,
    rot:       Math.random() * Math.PI * 2,
    rotV:      (Math.random() - 0.5) * 0.055,
    opacity:   0.45 + Math.random() * 0.50,
    phase:     Math.random() * Math.PI * 2,
    phaseSpeed:0.012 + Math.random() * 0.022,
    swayAmp:   0.4  + Math.random() * 1.0,
    hue:       338  + Math.random() * 22,
  };
}

/* ─────────────────────────────────────────────
   Draw a single sakura petal (3 overlapping ellipses)
───────────────────────────────────────────── */
function drawPetal(ctx: CanvasRenderingContext2D, p: Petal) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  const alpha = p.opacity * (0.65 + 0.35 * Math.sin(p.phase));

  // Back lobe
  ctx.globalAlpha = alpha * 0.7;
  ctx.fillStyle = `hsl(${p.hue - 6},70%,80%)`;
  ctx.beginPath();
  ctx.ellipse(-p.size * 0.25, p.size * 0.1, p.size * 0.65, p.size * 0.38, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // Main body
  ctx.globalAlpha = alpha;
  ctx.fillStyle = `hsl(${p.hue},72%,74%)`;
  ctx.beginPath();
  ctx.ellipse(0, 0, p.size, p.size * 0.52, 0, 0, Math.PI * 2);
  ctx.fill();

  // Front highlight lobe
  ctx.globalAlpha = alpha * 0.85;
  ctx.fillStyle = `hsl(${p.hue + 8},60%,84%)`;
  ctx.beginPath();
  ctx.ellipse(p.size * 0.28, -p.size * 0.08, p.size * 0.72, p.size * 0.40, 0.55, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */
const PETAL_COUNT = 200;

export default function MainMenu() {
  const { setScreen } = useGameStore();
  const { playClick }  = useSoundManager();

  const audioRef   = useRef<HTMLAudioElement>(null);
  const videoRef   = useRef<HTMLVideoElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const rafRef     = useRef<number>(0);
  const petals     = useRef<Petal[]>([]);
  const musicReady = useRef(false);

  const [muted, setMuted] = useState(false);

  /* ── Canvas resize ── */
  const resizeCanvas = () => {
    const c = canvasRef.current;
    if (!c) return;
    c.width  = window.innerWidth;
    c.height = window.innerHeight;
  };

  /* ── Init petals ── */
  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    const W = window.innerWidth;
    petals.current = Array.from({ length: PETAL_COUNT }, () => spawnPetal(W, true));
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  /* ── RAF loop: sakura petals only ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const tick = () => {
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      for (const p of petals.current) {
        p.phase += p.phaseSpeed;
        p.x     += p.vx + Math.sin(p.phase) * p.swayAmp;
        p.y     += p.vy;
        p.rot   += p.rotV;

        // Wrap x
        if (p.x < -20)  p.x = W + 10;
        if (p.x > W + 20) p.x = -10;

        // Respawn from top when off bottom
        if (p.y > H + 20) {
          Object.assign(p, spawnPetal(W, false));
        }

        drawPetal(ctx, p);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  /* ── Music autoplay ── */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.65;
    audio.muted  = false;

    let go: (() => void) | null = null;

    audio.play()
      .then(() => { musicReady.current = true; })
      .catch(() => {
        go = () => {
          if (musicReady.current) return;
          audio.play().then(() => { musicReady.current = true; }).catch(() => {});
          document.removeEventListener('pointerdown', go!);
          go = null;
        };
        document.addEventListener('pointerdown', go);
      });

    return () => {
      if (go) document.removeEventListener('pointerdown', go);
    };
  }, []);

  /* ── Video autoplay (muted so browser allows it) ── */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.play().catch(() => {});
  }, []);

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

  const handlePlay = () => {
    playClick();
    setScreen('modes');
  };

  return (
    <div
      className="w-full h-full relative overflow-hidden select-none"
      style={{ background: '#060208' }}
    >
      <style>{STYLES}</style>

      {/* ── 1. Looping video background ── */}
      <video
        ref={videoRef}
        src={`${import.meta.env.BASE_URL}landing-video.mp4`}
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full"
        style={{ objectFit: 'cover', objectPosition: 'center' }}
      />

      {/* ── 2. Subtle vignette so UI reads against bright video ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 95% 90% at 50% 48%, transparent 30%, rgba(4,1,10,0.68) 100%)',
          animation: 'vignette-breathe 9s ease-in-out infinite',
        }}
      />

      {/* ── 3. Sakura petal canvas ── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ mixBlendMode: 'screen' }}
      />

      {/* ── 4. PLAY NOW button – fully visible & functional ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.82 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.8, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="absolute"
        style={{ left: '50%', top: '72%', zIndex: 30 }}
      >
      <button
        onClick={handlePlay}
        aria-label="Play Now"
        style={{
          transform: 'translate(-50%, -50%)',
          animation: 'btn-float 3.8s ease-in-out infinite, btn-glow-pulse 2.4s ease-in-out infinite',
          cursor: 'pointer',
          /* Gold scroll-parchment style */
          background: 'linear-gradient(180deg, #f5d97a 0%, #d4a520 35%, #b8840e 65%, #e8c54a 100%)',
          border: '3px solid rgba(255,220,80,0.70)',
          borderRadius: 6,
          padding: '0 48px',
          height: 62,
          minWidth: 260,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          outline: 'none',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Shimmer sweep */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ overflow: 'hidden', borderRadius: 6 }}
        >
          <div style={{
            position: 'absolute', top: 0, left: 0,
            width: '32%', height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255,245,180,0.55), transparent)',
            animation: 'btn-shine 2.8s ease-in-out 1.2s infinite',
          }}/>
        </div>

        {/* Sword icon */}
        <span
          style={{
            fontSize: 26,
            lineHeight: 1,
            animation: 'sword-idle 3s ease-in-out infinite',
            display: 'inline-block',
            filter: 'drop-shadow(0 0 4px rgba(255,200,80,0.8))',
          }}
        >
          ⚔️
        </span>

        {/* Label */}
        <span style={{
          fontFamily: '"Cinzel Decorative", "Palatino Linotype", Georgia, serif',
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: '0.12em',
          color: '#3a1a00',
          textShadow: '0 1px 0 rgba(255,240,140,0.60), 0 -1px 0 rgba(0,0,0,0.30)',
          textTransform: 'uppercase',
        }}>
          Play Now
        </span>
      </button>
      </motion.div>

      {/* ── 5. Music ── */}
      <audio
        ref={audioRef}
        src={`${import.meta.env.BASE_URL}landing-music.mp3`}
        loop
        preload="auto"
      />

      {/* ── 6. Mute toggle ── */}
      <motion.button
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.88 }}
        onClick={toggleMute}
        aria-label={muted ? 'Unmute music' : 'Mute music'}
        style={{
          position: 'absolute', top: 14, right: 14,
          width: 44, height: 44, zIndex: 50,
          background: 'rgba(10,5,20,0.65)',
          border: '1.5px solid rgba(255,200,100,0.35)',
          borderRadius: '50%', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 19,
          animation: 'mute-hover 3s ease-in-out infinite',
          outline: 'none',
        }}
      >
        {muted ? '🔇' : '🔊'}
      </motion.button>
    </div>
  );
}
