/**
 * MoonShrineIntroScreen
 *
 * Plays moon-shrine.mp4 (1280×720, ~10 s).
 * The video plays once and freezes on the last frame.
 * An invisible "Enter the Shrine" hotspot sits over the button
 * painted in the video's last frame.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { useMoonStore } from '../../store/moonStore';

/* ─── Blue moon-petal burst keyframes (injected once into document) ─── */
const PETAL_STYLE = `
@keyframes moonPetalRise {
  0%   { transform: translate(0,0) rotate(var(--r)) scale(0.2); opacity: 1; }
  60%  { opacity: 0.85; }
  100% { transform: translate(calc(var(--dx) * 1px), calc(var(--dy) * 1px)) rotate(calc(var(--r) + 200deg)) scale(0.7); opacity: 0; }
}
`;

/* ─── Native video dimensions (1280×720) ───────────────────────────── */
const VID_W = 1280;
const VID_H = 720;

/* ─── "Enter the Shrine" button position in native 1280×720 pixels ─── */
const BTN_VX = 642;   // centre X
const BTN_VY = 658;   // centre Y
const BTN_VW = 360;   // width  of clickable rectangle
const BTN_VH = 78;    // height of clickable rectangle

/* ─── Blue moon-petal burst — 22 petals pre-computed (deterministic) ── */
const MOON_PETALS = Array.from({ length: 22 }, (_, i) => {
  const angle = (i / 22) * Math.PI * 2 - Math.PI / 2;
  const dist  = 52 + (i % 4) * 20;
  return {
    dx:    Math.round(Math.cos(angle) * dist),
    dy:    Math.round(Math.sin(angle) * dist * 0.82),
    r:     (i * 19) % 360,
    delay: +(i * 0.022).toFixed(3),
    hue:   200 + (i % 7) * 9,   // 200–254 → blue → indigo
    big:   i % 5 === 0,
  };
});

/* ─── Cover-layout helpers ───────────────────────────────────────────── */
interface CoverLayout { scale: number; offsetX: number; offsetY: number; }

function computeCoverLayout(cw: number, ch: number): CoverLayout {
  const scale = Math.max(cw / VID_W, ch / VID_H);
  return { scale, offsetX: (cw - VID_W * scale) / 2, offsetY: (ch - VID_H * scale) / 2 };
}

function toScreen(vx: number, vy: number, l: CoverLayout) {
  return { x: l.offsetX + vx * l.scale, y: l.offsetY + vy * l.scale };
}

/* ═══════════════════════════════════════════════════════════════════════
   Main component
═══════════════════════════════════════════════════════════════════════ */
export default function MoonShrineIntroScreen() {
  const { setScreen, setMode, setLives, resetGame } = useGameStore();
  const { reset: resetMoon } = useMoonStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef     = useRef<HTMLVideoElement>(null);

  const [phase,      setPhase]      = useState<'playing' | 'ready' | 'exiting'>('playing');
  const [layout,     setLayout]     = useState<CoverLayout>({ scale: 1, offsetX: 0, offsetY: 0 });
  const [petalBurst, setPetalBurst] = useState(false);

  /* ── Inject petal keyframes once ── */
  useEffect(() => {
    const id = 'moon-petal-keyframes';
    if (!document.getElementById(id)) {
      const s = document.createElement('style');
      s.id = id;
      s.textContent = PETAL_STYLE;
      document.head.appendChild(s);
    }
  }, []);

  /* ── Cover-layout tracker ── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setLayout(computeCoverLayout(el.clientWidth, el.clientHeight));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ── Video: play on mount, freeze on last frame ── */
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.play().catch(() => {});
    const onEnded = () => { vid.pause(); setPhase('ready'); };
    vid.addEventListener('ended', onEnded);
    return () => vid.removeEventListener('ended', onEnded);
  }, []);

  /* ── Navigate to game (Moon Shrine — Survival Mode: 3 lives) ── */
  const enterShrine = useCallback(() => {
    if (phase !== 'ready') return;
    setPhase('exiting');
    setPetalBurst(true);
    setTimeout(() => {
      setMode('moon');
      resetGame();
      resetMoon();
      setLives(3);
      setScreen('game');
    }, 700);
  }, [phase, setMode, resetGame, resetMoon, setLives, setScreen]);

  /* ── Compute screen-space button rect ── */
  const btnBase = toScreen(BTN_VX, BTN_VY, layout);
  const btnW    = BTN_VW * layout.scale;
  const btnH    = BTN_VH * layout.scale;
  const btnL    = btnBase.x - btnW / 2;
  const btnT    = btnBase.y - btnH / 2;

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%', height: '100%',
        position: 'relative', overflow: 'hidden',
        background: '#000', userSelect: 'none',
      }}
    >

      {/* ══ 1. Moon Shrine cinematic video ════════════════════════════ */}
      <video
        ref={videoRef}
        src={`${import.meta.env.BASE_URL}moon-shrine.mp4`}
        playsInline
        preload="auto"
        disablePictureInPicture
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover', pointerEvents: 'none',
        }}
        controlsList="nodownload nofullscreen noremoteplayback"
        onContextMenu={e => e.preventDefault()}
      />

      {/* ══ 2. "Enter the Shrine" hit-area (shown once video freezes) ═ */}
      <AnimatePresence>
        {phase === 'ready' && (
          <motion.div
            key="enter-btn"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          >
            <div
              onClick={enterShrine}
              style={{
                position: 'absolute',
                left:     btnL,
                top:      btnT,
                width:    btnW,
                height:   btnH,
                overflow: 'visible',
                cursor:        'pointer',
                pointerEvents: 'auto',
                background:    'transparent',
                borderRadius:  8,
              }}
            >
              {/* Blue moon-petal burst — fires when the button is clicked */}
              {petalBurst && MOON_PETALS.map((p, i) => (
                <div
                  key={i}
                  style={{
                    position:    'absolute',
                    left:        '50%',
                    top:         '50%',
                    width:       p.big ? 12 : 9,
                    height:      p.big ? 26 : 19,
                    marginLeft:  p.big ? -6  : -4.5,
                    marginTop:   p.big ? -13 : -9.5,
                    borderRadius: '50% 50% 42% 42%',
                    background:  `radial-gradient(ellipse at 50% 30%, hsl(${p.hue},92%,88%), hsl(${p.hue + 18},78%,62%) 60%, transparent)`,
                    boxShadow:   `0 0 6px 1px hsl(${p.hue},90%,70%)`,
                    '--dx': p.dx,
                    '--dy': p.dy,
                    '--r':  `${p.r}deg`,
                    animation:   `moonPetalRise 0.62s ease-out ${p.delay}s both`,
                    pointerEvents: 'none',
                  } as React.CSSProperties}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ 3. Fade-to-black exit ══════════════════════════════════════ */}
      <AnimatePresence>
        {phase === 'exiting' && (
          <motion.div
            key="fadeout"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 0.7, ease: 'easeIn' }}
            style={{
              position: 'absolute', inset: 0,
              background: '#000', zIndex: 40, pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
