import { useEffect, useRef, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { useSoundManager } from '../../hooks/useSoundManager';

/* ─────────────────────────────────────────────
   Canvas particle system types
───────────────────────────────────────────── */
interface Petal {
  x: number; y: number; size: number;
  vx: number; vy: number;
  rot: number; rotV: number;
  opacity: number; phase: number;
}
interface Firefly {
  x: number; y: number;
  vx: number; vy: number;
  phase: number; speed: number;
}
interface Ember {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number; size: number;
}

/* ─────────────────────────────────────────────
   CSS keyframes – all GPU-accelerated (transform + opacity only)
───────────────────────────────────────────── */
const STYLES = `
@keyframes cam-drift {
  0%,100% { transform: scale(1.06) translate(0px,0px); }
  25%      { transform: scale(1.07) translate(-4px,-2px); }
  50%      { transform: scale(1.06) translate(4px,2px); }
  75%      { transform: scale(1.07) translate(-2px,3px); }
}
@keyframes fog1 {
  0%,100% { transform: translateX(-6%) scaleX(1);    opacity:.22; }
  50%     { transform: translateX(6%)  scaleX(1.06); opacity:.38; }
}
@keyframes fog2 {
  0%,100% { transform: translateX(9%)  scaleX(1.08); opacity:.15; }
  55%     { transform: translateX(-9%) scaleX(1);    opacity:.28; }
}
@keyframes fog3 {
  0%,100% { transform: translateX(0%) translateY(0px); opacity:.18; }
  40%     { transform: translateX(4%) translateY(-6px); opacity:.30; }
  80%     { transform: translateX(-4%) translateY(4px); opacity:.22; }
}
@keyframes moon-pulse {
  0%,100% { opacity:.55; transform:scale(1);    }
  50%     { opacity:.85; transform:scale(1.08); }
}
@keyframes water-ripple {
  0%   { background-position:0% 50%;   opacity:.30; }
  50%  { background-position:100% 50%; opacity:.45; }
  100% { background-position:0% 50%;   opacity:.30; }
}
@keyframes lantern {
  0%,100% { opacity:.55; }
  20%     { opacity:.80; }
  45%     { opacity:.60; }
  70%     { opacity:.90; }
  85%     { opacity:.65; }
}
@keyframes btn-float {
  0%,100% { transform:translate(-50%,-50%) translateY(0px);   }
  50%     { transform:translate(-50%,-50%) translateY(-7px);  }
}
@keyframes btn-glow {
  0%,100% { box-shadow: 0 0 18px 4px rgba(220,160,30,.50), 0 0 50px 10px rgba(200,120,10,.25); }
  50%     { box-shadow: 0 0 32px 8px rgba(255,200,50,.75), 0 0 80px 20px rgba(220,140,20,.40); }
}
@keyframes btn-shine {
  0%   { transform:translateX(-120%) skewX(-20deg); }
  100% { transform:translateX(320%)  skewX(-20deg); }
}
@keyframes slash {
  0%   { opacity:0;   transform:scaleX(0)   rotate(-38deg); transform-origin:left center; filter:blur(2px); }
  15%  { opacity:.9;  transform:scaleX(.5)  rotate(-38deg); filter:blur(0px); }
  55%  { opacity:.7;  transform:scaleX(1)   rotate(-38deg); filter:blur(1px); }
  100% { opacity:0;   transform:scaleX(1.3) rotate(-38deg); filter:blur(4px); }
}
@keyframes slash-glow {
  0%,100% { opacity:0; }
  30%,60% { opacity:1; }
}
@keyframes vignette-breathe {
  0%,100% { opacity:.72; }
  50%     { opacity:.60; }
}
@keyframes god-ray {
  0%,100% { opacity:.06; transform:skewX(-12deg) translateX(0px);   }
  50%     { opacity:.14; transform:skewX(-12deg) translateX(10px);  }
}
`;

/* ─────────────────────────────────────────────
   Lantern positions (% of container, approximate)
───────────────────────────────────────────── */
const LANTERNS = [
  { left:'17%', top:'70%', size:18, delay:0    },
  { left:'29%', top:'68%', size:14, delay:0.7  },
  { left:'43%', top:'72%', size:12, delay:1.4  },
  { left:'55%', top:'66%', size:16, delay:0.3  },
  { left:'68%', top:'63%', size:13, delay:1.1  },
  { left:'78%', top:'58%', size:11, delay:0.5  },
];

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */
export default function MainMenu() {
  const { setScreen } = useGameStore();
  const { playClick } = useSoundManager();
  const audioRef   = useRef<HTMLAudioElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const rafRef     = useRef<number>(0);
  const petals     = useRef<Petal[]>([]);
  const fireflies  = useRef<Firefly[]>([]);
  const embers     = useRef<Ember[]>([]);
  const musicRef   = useRef(false);
  const [muted, setMuted]       = useState(false);
  const [slashOn, setSlashOn]   = useState(false);
  const logoAnim  = useAnimation();

  /* ── Canvas resize helper ── */
  const resizeCanvas = () => {
    const c = canvasRef.current;
    if (!c) return;
    c.width  = window.innerWidth;
    c.height = window.innerHeight;
  };

  /* ── Spawn helpers ── */
  const spawnPetal = (W: number): Petal => ({
    x: Math.random() * W, y: -20,
    size: 4 + Math.random() * 7,
    vx: (Math.random() - 0.5) * 0.6,
    vy: 0.6 + Math.random() * 1.1,
    rot: Math.random() * Math.PI * 2,
    rotV: (Math.random() - 0.5) * 0.04,
    opacity: 0.55 + Math.random() * 0.4,
    phase: Math.random() * Math.PI * 2,
  });

  const spawnFirefly = (W: number, H: number): Firefly => ({
    x: Math.random() * W,
    y: H * 0.35 + Math.random() * H * 0.55,
    vx: (Math.random() - 0.5) * 0.25,
    vy: (Math.random() - 0.5) * 0.18,
    phase: Math.random() * Math.PI * 2,
    speed: 0.012 + Math.random() * 0.014,
  });

  const spawnEmber = (W: number, H: number): Ember => ({
    x: W * 0.35 + Math.random() * W * 0.3,
    y: H * 0.55 + Math.random() * H * 0.35,
    vx: (Math.random() - 0.5) * 0.3,
    vy: -(0.35 + Math.random() * 0.55),
    life: 0, maxLife: 140 + Math.random() * 120,
    size: 1.2 + Math.random() * 1.8,
  });

  /* ── Particle init ── */
  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const W = window.innerWidth, H = window.innerHeight;
    petals.current    = Array.from({ length: 55 }, (_, i) => {
      const p = spawnPetal(W);
      p.y = Math.random() * H; // spread vertically at start
      return p;
    });
    fireflies.current = Array.from({ length: 14 }, () => spawnFirefly(W, H));
    embers.current    = Array.from({ length: 18 }, () => {
      const e = spawnEmber(W, H);
      e.life = Math.random() * e.maxLife; // stagger
      return e;
    });

    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  /* ── Canvas RAF loop ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let t = 0;

    const tick = () => {
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      t++;

      /* — Sakura petals — */
      for (const p of petals.current) {
        p.phase += 0.018;
        p.x  += p.vx + Math.sin(p.phase) * 0.5;
        p.y  += p.vy;
        p.rot += p.rotV;
        if (p.y > H + 20) Object.assign(p, spawnPetal(W));

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = p.opacity * (0.7 + 0.3 * Math.sin(p.phase));
        // Petal shape: two overlapping ellipses
        ctx.fillStyle = `hsl(${345 + Math.sin(p.phase) * 5}, 75%, 72%)`;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `hsl(${350}, 65%, 78%)`;
        ctx.beginPath();
        ctx.ellipse(p.size * 0.3, -p.size * 0.1, p.size * 0.7, p.size * 0.45, 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      /* — Fireflies — */
      for (const f of fireflies.current) {
        f.phase += f.speed;
        f.x += f.vx + Math.sin(f.phase * 0.7) * 0.3;
        f.y += f.vy + Math.cos(f.phase * 0.5) * 0.2;
        if (f.x < 0) f.x = W; if (f.x > W) f.x = 0;
        if (f.y < H * 0.3) f.vy = Math.abs(f.vy);
        if (f.y > H)       f.vy = -Math.abs(f.vy);

        const alpha = (0.35 + 0.65 * ((Math.sin(f.phase) + 1) / 2));
        const r = 4 + 3 * ((Math.sin(f.phase * 0.8) + 1) / 2);
        const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r * 3);
        grad.addColorStop(0, `rgba(200,255,120,${alpha})`);
        grad.addColorStop(0.4, `rgba(160,240,80,${alpha * 0.5})`);
        grad.addColorStop(1, 'rgba(100,200,60,0)');
        ctx.beginPath();
        ctx.arc(f.x, f.y, r * 3, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      /* — Embers — */
      for (const e of embers.current) {
        e.life++;
        if (e.life > e.maxLife) Object.assign(e, spawnEmber(W, H));
        e.x += e.vx; e.y += e.vy;
        const prog = e.life / e.maxLife;
        const alpha = prog < 0.1 ? prog * 10 : prog > 0.8 ? (1 - prog) * 5 : 0.75;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,${140 + Math.floor(80 * (1 - prog))},20,${alpha * 0.7})`;
        ctx.fill();
        // tiny glow
        const ggrad = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.size * 3);
        ggrad.addColorStop(0, `rgba(255,180,30,${alpha * 0.3})`);
        ggrad.addColorStop(1, 'rgba(255,100,0,0)');
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = ggrad;
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  /* ── Logo cinematic entrance ── */
  useEffect(() => {
    logoAnim.start({
      scale: [1.18, 1.0],
      opacity: [0, 1],
      filter: ['blur(8px)', 'blur(0px)'],
      transition: { duration: 1.8, ease: [0.16, 1, 0.3, 1] },
    });
  }, []);

  /* ── Sword slash after logo settles ── */
  useEffect(() => {
    const t = setTimeout(() => {
      setSlashOn(true);
      setTimeout(() => setSlashOn(false), 650);
    }, 2200);
    return () => clearTimeout(t);
  }, []);

  /* ── Music: autoplay unmuted, fall back to first tap ── */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.6;
    audio.muted  = false;
    audio.play().then(() => { musicRef.current = true; }).catch(() => {
      const go = () => {
        if (musicRef.current) return;
        audio.play().then(() => { musicRef.current = true; }).catch(() => {});
        document.removeEventListener('pointerdown', go);
      };
      document.addEventListener('pointerdown', go);
    });
  }, []);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    if (!musicRef.current) {
      audio.play().then(() => { musicRef.current = true; }).catch(() => {});
    }
    audio.muted = !audio.muted;
    setMuted(audio.muted);
  };

  const handlePlay = () => {
    playClick();
    setScreen('modes');
  };

  return (
    <div className="w-full h-full relative overflow-hidden select-none" style={{ background: '#0a0510' }}>
      <style>{STYLES}</style>

      {/* ── 1. Background image – slow camera drift ── */}
      <div
        className="absolute inset-0"
        style={{ animation: 'cam-drift 24s ease-in-out infinite' }}
      >
        <img
          src={`${import.meta.env.BASE_URL}landing-bg.png`}
          alt=""
          className="w-full h-full object-cover object-center"
          draggable={false}
        />
      </div>

      {/* ── 2. Cinematic vignette ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 90% 85% at 50% 45%, transparent 35%, rgba(5,2,12,0.72) 100%)',
          animation: 'vignette-breathe 8s ease-in-out infinite',
        }}
      />

      {/* ── 3. God rays ── */}
      {[30, 42, 55].map((left, i) => (
        <div
          key={i}
          className="absolute pointer-events-none"
          style={{
            left: `${left}%`, top: 0, width: 80, height: '65%',
            background: 'linear-gradient(to bottom, rgba(200,160,80,0.10), transparent)',
            animation: `god-ray ${10 + i * 3}s ease-in-out ${i * 2}s infinite`,
          }}
        />
      ))}

      {/* ── 4. Moon glow overlay ── */}
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          left: '38%', top: '8%',
          width: 140, height: 140,
          background: 'radial-gradient(circle, rgba(255,240,200,0.55) 0%, rgba(220,180,120,0.20) 45%, transparent 70%)',
          animation: 'moon-pulse 5s ease-in-out infinite',
        }}
      />

      {/* ── 5. Mist / fog layers ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div style={{
          position:'absolute', bottom:'28%', left:'-10%', right:'-10%', height:'18%',
          background:'linear-gradient(to right, transparent, rgba(180,160,220,0.18) 30%, rgba(160,140,200,0.22) 70%, transparent)',
          filter:'blur(16px)',
          animation:'fog1 16s ease-in-out infinite',
        }}/>
        <div style={{
          position:'absolute', bottom:'38%', left:'-15%', right:'-15%', height:'12%',
          background:'linear-gradient(to right, transparent, rgba(200,180,240,0.12) 40%, rgba(180,160,220,0.16) 60%, transparent)',
          filter:'blur(22px)',
          animation:'fog2 22s ease-in-out infinite',
        }}/>
        <div style={{
          position:'absolute', bottom:'18%', left:'-5%', right:'-5%', height:'22%',
          background:'linear-gradient(to top, rgba(120,100,180,0.20) 0%, transparent 100%)',
          filter:'blur(10px)',
          animation:'fog3 14s ease-in-out 4s infinite',
        }}/>
      </div>

      {/* ── 6. Water shimmer (lake area) ── */}
      <div
        className="absolute pointer-events-none"
        style={{
          left:'22%', right:'22%', top:'62%', height:'16%',
          borderRadius: 8,
          background:'linear-gradient(90deg, rgba(100,160,220,0.15), rgba(160,200,255,0.30), rgba(255,230,150,0.20), rgba(100,160,220,0.15))',
          backgroundSize:'400% 100%',
          animation:'water-ripple 7s ease-in-out infinite',
          filter:'blur(3px)',
        }}
      />

      {/* ── 7. Lantern glows ── */}
      {LANTERNS.map((l, i) => (
        <div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            left:l.left, top:l.top,
            width:l.size*3, height:l.size*3,
            transform:'translate(-50%,-50%)',
            background:`radial-gradient(circle, rgba(255,180,60,0.75) 0%, rgba(255,120,20,0.30) 45%, transparent 70%)`,
            animation:`lantern ${2.5+i*0.7}s ease-in-out ${l.delay}s infinite`,
          }}
        />
      ))}

      {/* ── 8. Particle canvas ── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ mixBlendMode: 'screen' }}
      />

      {/* ── 9. Sword slash effect ── */}
      {slashOn && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 30 }}>
          {/* Main slash line */}
          <div style={{
            position:'absolute', left:'10%', top:'45%',
            width:'85%', height:3,
            background:'linear-gradient(90deg, transparent, rgba(255,255,255,0.95), rgba(200,220,255,0.60), transparent)',
            animation:'slash 0.6s ease-out forwards',
            transformOrigin:'left center',
          }}/>
          {/* Slash light flash */}
          <div style={{
            position:'absolute', inset:0,
            background:'radial-gradient(ellipse 60% 40% at 55% 48%, rgba(255,255,255,0.08) 0%, transparent 70%)',
            animation:'slash-glow 0.6s ease-out forwards',
          }}/>
        </div>
      )}

      {/* ── 10. Logo area – cinematic entrance motion ── */}
      <motion.div
        animate={logoAnim}
        initial={{ scale: 1.18, opacity: 0 }}
        className="absolute inset-0 pointer-events-none"
        style={{ transformOrigin: '50% 35%' }}
      >
        {/* Invisible – just drives the entrance zoom; image logo is visible beneath */}
      </motion.div>

      {/* ── 11. PLAY NOW – transparent hit-area + premium glow ring ── */}
      <button
        onClick={handlePlay}
        aria-label="Play Now"
        className="absolute cursor-pointer group"
        style={{
          left:'50%', top:'52%',
          width:'44%', height:'11%',
          transform:'translate(-50%,-50%)',
          background:'transparent',
          border:'none', outline:'none',
          animation:'btn-float 3.6s ease-in-out infinite',
          zIndex:20,
        }}
      >
        {/* Animated glow ring */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            animation:'btn-glow 2.8s ease-in-out infinite',
            borderRadius:50,
          }}
        />
        {/* Shimmer sweep */}
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{ borderRadius:50 }}
        >
          <div style={{
            position:'absolute', top:0, left:0, width:'35%', height:'100%',
            background:'linear-gradient(90deg,transparent,rgba(255,230,120,0.35),transparent)',
            animation:'btn-shine 3s ease-in-out 1.5s infinite',
          }}/>
        </div>
      </button>

      {/* ── 12. Music ── */}
      <audio ref={audioRef} src={`${import.meta.env.BASE_URL}landing-music.mp3`} loop preload="auto"/>

      {/* ── 13. Mute toggle ── */}
      <motion.button
        whileHover={{ scale:1.12 }}
        whileTap={{ scale:0.9 }}
        onClick={toggleMute}
        aria-label={muted ? 'Unmute' : 'Mute'}
        style={{
          position:'absolute', top:14, right:14,
          width:42, height:42, zIndex:50,
          background:'rgba(0,0,0,0.55)',
          border:'1.5px solid rgba(255,200,100,0.30)',
          borderRadius:'50%', cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:18,
          boxShadow:'0 0 12px rgba(200,140,20,0.25)',
        }}
      >
        {muted ? '🔇' : '🔊'}
      </motion.button>
    </div>
  );
}
