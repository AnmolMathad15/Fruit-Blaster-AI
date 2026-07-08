import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { useSoundManager } from '../../hooks/useSoundManager';

/* ─── Sakura petal (reused from MainMenu) ─────────────────── */
interface Petal {
  x: number; y: number; size: number;
  vx: number; vy: number;
  rot: number; rotV: number;
  opacity: number; phase: number; phaseSpeed: number;
  swayAmp: number; hue: number;
}
function spawnPetal(W: number, scatterY = false): Petal {
  return {
    x: Math.random() * W,
    y: scatterY ? Math.random() * window.innerHeight : -18,
    size: 3 + Math.random() * 8,
    vx: (Math.random() - 0.5) * 0.7,
    vy: 0.6 + Math.random() * 1.3,
    rot: Math.random() * Math.PI * 2,
    rotV: (Math.random() - 0.5) * 0.05,
    opacity: 0.5 + Math.random() * 0.45,
    phase: Math.random() * Math.PI * 2,
    phaseSpeed: 0.012 + Math.random() * 0.02,
    swayAmp: 0.4 + Math.random() * 1.0,
    hue: 338 + Math.random() * 22,
  };
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

/* ─── Guardian virtue banners ─────────────────────────────── */
function VirtueBanner({ virtues, side }: { virtues: string[]; side: 'left' | 'right' }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: side === 'left' ? -80 : 80 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.6, duration: 0.8, ease: 'easeOut' }}
      className={`flex flex-col gap-3 ${side === 'left' ? 'items-end' : 'items-start'}`}
    >
      {virtues.map((v, i) => (
        <motion.div
          key={v}
          initial={{ opacity: 0, x: side === 'left' ? -40 : 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 + i * 0.12, duration: 0.5 }}
          style={{
            background: 'linear-gradient(180deg, #3d1a6e 0%, #5b2d8e 40%, #3d1a6e 100%)',
            border: '2px solid rgba(180,130,255,0.5)',
            borderRadius: 4,
            padding: '10px 20px',
            minWidth: 110,
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(80,0,160,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
            position: 'relative',
          }}
        >
          {/* tassel */}
          <div style={{
            position: 'absolute',
            bottom: -18,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 3,
            height: 18,
            background: 'linear-gradient(180deg, #c8a84b, #8b6914)',
            borderRadius: 2,
          }} />
          <span style={{
            fontFamily: 'Georgia, serif',
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 3,
            color: '#e8d5ff',
            textShadow: '0 0 12px rgba(180,130,255,0.8)',
            textTransform: 'uppercase',
          }}>
            {v}
          </span>
        </motion.div>
      ))}
    </motion.div>
  );
}

/* ─── Scroll feature item ─────────────────────────────────── */
function FeatureItem({ icon, text, delay }: { icon: string; text: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="flex items-start gap-3"
    >
      <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>{icon}</span>
      <p style={{
        fontFamily: 'Georgia, serif',
        fontSize: 13,
        lineHeight: 1.55,
        color: '#3d2a10',
        margin: 0,
      }}>
        {text}
      </p>
    </motion.div>
  );
}

/* ─── Main component ──────────────────────────────────────── */
export default function GuardianOathScreen() {
  const { setScreen } = useGameStore();
  const { playClick } = useSoundManager();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const petals    = useRef<Petal[]>([]);
  const [scrollReady, setScrollReady] = useState(false);
  const [btnReady, setBtnReady]       = useState(false);

  /* Petal canvas */
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    petals.current = Array.from({ length: 140 }, () => spawnPetal(window.innerWidth, true));

    const tick = () => {
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, c.width, c.height);
      const W = c.width; const H = c.height;
      for (const p of petals.current) {
        p.phase += p.phaseSpeed;
        p.x += p.vx + Math.sin(p.phase) * p.swayAmp;
        p.y += p.vy;
        p.rot += p.rotV;
        drawPetal(ctx, p);
        if (p.y > H + 20) { Object.assign(p, spawnPetal(W)); }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('resize', resize); };
  }, []);

  /* Stagger: show scroll, then button */
  useEffect(() => {
    const t1 = setTimeout(() => setScrollReady(true), 200);
    const t2 = setTimeout(() => setBtnReady(true), 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const handleBegin = () => {
    playClick();
    setScreen('modes');
  };

  const features: { icon: string; text: string }[] = [
    { icon: '⚔️', text: 'For centuries, the Sacred Jade Orchard has protected harmony throughout the kingdom. Now darkness stirs — only a Guardian can restore the balance.' },
    { icon: '📷', text: 'Your hand is the blade. Camera access enables real-time hand tracking so every flick of your fingertip becomes a deadly slice.' },
    { icon: '💡', text: 'Control the blade with fluid, confident strokes. Wherever your fingertip points, the slash follows.' },
    { icon: '✋', text: 'Your movements mirror in real time. Train your precision and your reflexes will follow.' },
    { icon: '🍉', text: 'Slice the fruit and earn your score — but avoid the bombs. One wrong move and a life is lost.' },
    { icon: '🏆', text: 'Unlock achievements, climb the leaderboard and chase the highest score across all game modes.' },
  ];

  return (
    <div className="w-full h-full relative overflow-hidden select-none" style={{ background: '#000' }}>

      {/* ── Background video (same as landing) ── */}
      <video
        autoPlay muted loop playsInline
        className="absolute inset-0 w-full h-full object-cover"
        src={`${import.meta.env.BASE_URL}landing-video.mp4`}
        style={{ opacity: 0.85 }}
      />

      {/* ── Darkening overlay ── */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse 90% 85% at 50% 50%, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 100%)',
        pointerEvents: 'none',
      }} />

      {/* ── Sakura petals ── */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ mixBlendMode: 'screen', zIndex: 2 }} />

      {/* ── Layout: banners + scroll ── */}
      <div className="absolute inset-0 flex items-center justify-center gap-4 px-4" style={{ zIndex: 10 }}>

        {/* Left virtue banners */}
        <div className="hidden md:flex flex-col justify-center" style={{ minWidth: 130 }}>
          <VirtueBanner virtues={['HONOR', 'SPEED', 'DISCIPLINE']} side="left" />
        </div>

        {/* Center: scroll */}
        <AnimatePresence>
          {scrollReady && (
            <motion.div
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              style={{ transformOrigin: 'top center', flex: '0 1 620px', maxWidth: 620, width: '100%' }}
            >
              {/* Scroll wrapper */}
              <div style={{ position: 'relative' }}>

                {/* Top roller */}
                <div style={{
                  height: 36,
                  background: 'linear-gradient(180deg, #6b3a1f 0%, #3d1a06 50%, #6b3a1f 100%)',
                  borderRadius: 18,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.7), inset 0 2px 4px rgba(255,255,255,0.08)',
                  border: '2px solid #8b5a2b',
                  position: 'relative',
                  zIndex: 2,
                }}>
                  {/* Roller end caps */}
                  {(['left', 'right'] as const).map(side => (
                    <div key={side} style={{
                      position: 'absolute',
                      top: '50%', [side]: -10,
                      transform: 'translateY(-50%)',
                      width: 22, height: 42,
                      background: 'linear-gradient(180deg, #8b5a2b, #4a2810)',
                      borderRadius: 11,
                      border: '1.5px solid #6b3a1f',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                    }} />
                  ))}
                </div>

                {/* Parchment body */}
                <div style={{
                  background: 'linear-gradient(180deg, #f2e4c0 0%, #e8d4a0 30%, #eddcac 70%, #e2cc90 100%)',
                  padding: '28px 36px 32px',
                  boxShadow: '0 8px 40px rgba(0,0,0,0.6), inset 0 0 60px rgba(120,80,20,0.08)',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  {/* Aged paper texture overlay */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: `
                      repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(120,80,20,0.04) 28px, rgba(120,80,20,0.04) 29px),
                      radial-gradient(ellipse at 10% 90%, rgba(100,60,10,0.07) 0%, transparent 50%),
                      radial-gradient(ellipse at 90% 10%, rgba(100,60,10,0.07) 0%, transparent 50%)
                    `,
                    pointerEvents: 'none',
                  }} />

                  {/* Decorative border */}
                  <div style={{
                    position: 'absolute', inset: 8,
                    border: '1.5px solid rgba(120,80,20,0.2)',
                    borderRadius: 2,
                    pointerEvents: 'none',
                  }} />

                  {/* Title */}
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    style={{ textAlign: 'center', marginBottom: 20 }}
                  >
                    <div style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: 22,
                      fontWeight: 700,
                      color: '#2d1a06',
                      letterSpacing: 2,
                      textTransform: 'uppercase',
                      textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                    }}>
                      The Guardian's Oath
                    </div>
                    {/* Ornament divider */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 }}>
                      <div style={{ height: 1, width: 60, background: 'linear-gradient(90deg, transparent, rgba(120,80,20,0.5))' }} />
                      <span style={{ color: '#8b5a2b', fontSize: 14 }}>✦</span>
                      <div style={{ height: 1, width: 60, background: 'linear-gradient(270deg, transparent, rgba(120,80,20,0.5))' }} />
                    </div>
                  </motion.div>

                  {/* Feature grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
                    {features.map((f, i) => (
                      <FeatureItem key={i} icon={f.icon} text={f.text} delay={0.5 + i * 0.12} />
                    ))}
                  </div>
                </div>

                {/* Bottom roller */}
                <div style={{
                  height: 36,
                  background: 'linear-gradient(180deg, #6b3a1f 0%, #3d1a06 50%, #6b3a1f 100%)',
                  borderRadius: 18,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.7), inset 0 2px 4px rgba(255,255,255,0.08)',
                  border: '2px solid #8b5a2b',
                  position: 'relative',
                  zIndex: 2,
                }}>
                  {(['left', 'right'] as const).map(side => (
                    <div key={side} style={{
                      position: 'absolute',
                      top: '50%', [side]: -10,
                      transform: 'translateY(-50%)',
                      width: 22, height: 42,
                      background: 'linear-gradient(180deg, #8b5a2b, #4a2810)',
                      borderRadius: 11,
                      border: '1.5px solid #6b3a1f',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                    }} />
                  ))}
                </div>

              </div>

              {/* BEGIN THE JOURNEY button */}
              <AnimatePresence>
                {btnReady && (
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}
                  >
                    <motion.button
                      whileHover={{ scale: 1.06, boxShadow: '0 0 40px rgba(200,160,40,0.7)' }}
                      whileTap={{ scale: 0.96 }}
                      onClick={handleBegin}
                      style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '14px 40px',
                        background: 'linear-gradient(180deg, #e8c84a 0%, #c8a020 40%, #a07010 100%)',
                        border: '2px solid #f0d060',
                        borderRadius: 6,
                        cursor: 'pointer',
                        boxShadow: '0 4px 24px rgba(180,130,20,0.5), inset 0 1px 0 rgba(255,255,255,0.25)',
                        outline: 'none',
                      }}
                    >
                      {/* Left gem */}
                      <div style={{
                        width: 14, height: 14,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle at 35% 35%, #a0f0b0, #20a040)',
                        boxShadow: '0 0 10px rgba(40,200,80,0.8)',
                        border: '1.5px solid rgba(255,255,255,0.4)',
                        flexShrink: 0,
                      }} />

                      <span style={{
                        fontFamily: 'Georgia, serif',
                        fontWeight: 700,
                        fontSize: 16,
                        letterSpacing: 3,
                        textTransform: 'uppercase',
                        color: '#1a0a00',
                        textShadow: '0 1px 2px rgba(255,255,255,0.3)',
                      }}>
                        Begin the Journey
                      </span>

                      {/* Right gem */}
                      <div style={{
                        width: 14, height: 14,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle at 35% 35%, #a0f0b0, #20a040)',
                        boxShadow: '0 0 10px rgba(40,200,80,0.8)',
                        border: '1.5px solid rgba(255,255,255,0.4)',
                        flexShrink: 0,
                      }} />

                      {/* Animated shimmer */}
                      <motion.div
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                          borderRadius: 'inherit',
                          pointerEvents: 'none',
                          overflow: 'hidden',
                        }}
                      />
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>

            </motion.div>
          )}
        </AnimatePresence>

        {/* Right virtue banners */}
        <div className="hidden md:flex flex-col justify-center" style={{ minWidth: 130 }}>
          <VirtueBanner virtues={['FOCUS', 'PRECISION', 'VICTORY']} side="right" />
        </div>

      </div>

      {/* ── Sparkle (bottom-right, like in video) ── */}
      <motion.div
        animate={{ opacity: [0.4, 1, 0.4], scale: [0.9, 1.1, 0.9] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'absolute', bottom: 32, right: 40, fontSize: 28, zIndex: 5, pointerEvents: 'none' }}
      >
        ✦
      </motion.div>

    </div>
  );
}
