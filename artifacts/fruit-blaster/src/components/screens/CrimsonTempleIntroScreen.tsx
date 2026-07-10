/**
 * CrimsonTempleIntroScreen
 *
 * Plays the Crimson Temple cinematic (1280×720 native).
 * Freezes on last frame. An invisible rectangular hotspot sits over
 * the video's own "Enter the Temple" button. Clicking it fires a
 * multi-layered volcanic flame burst and starts challenge mode.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';

/* ─── Particle interfaces ────────────────────────────────────────────── */
interface FlamePetal {
  id: number;
  left: number;       // % across button width
  size: number;       // px — controls flame height/width
  duration: number;   // ms — rise duration
  delay: number;      // ms — stagger
  colorStop1: string; // inner hot colour
  colorStop2: string; // mid colour
  lean: number;       // deg — slight sideways lean
  scaleX: number;     // width variation
}

interface Ember {
  id: number;
  left: number;       // % start position
  vx: number;         // horizontal drift (deg rotation shorthand via translateX)
  size: number;       // px
  duration: number;   // ms
  delay: number;      // ms
  hue: number;        // colour
}

/* ─── Particle generators ────────────────────────────────────────────── */
function generateFlames(count = 18): FlamePetal[] {
  return Array.from({ length: count }, (_, i) => {
    // Alternate between three colour zones: white-hot core, orange mid, deep crimson base
    const zone = i % 3;
    const colorStop1 = zone === 0 ? '#fff8a0' : zone === 1 ? '#ff8c00' : '#ff2200';
    const colorStop2 = zone === 0 ? '#ff6600' : zone === 1 ? '#cc1500' : '#7a0000';
    return {
      id: i,
      left: 3 + Math.random() * 94,
      size: 22 + Math.random() * 36,
      duration: 370 + Math.random() * 200,   // 370–570ms — all finish < 700ms nav
      delay: Math.random() * 110,            // 0–110ms stagger
      colorStop1,
      colorStop2,
      lean: (Math.random() - 0.5) * 22,     // –11° to +11°
      scaleX: 0.55 + Math.random() * 0.65,  // 0.55–1.2
    };
  });
}

function generateEmbers(count = 28): Ember[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: 8 + Math.random() * 84,
    vx: (Math.random() - 0.5) * 90,         // –45 to +45 px horizontal travel
    size: 3 + Math.random() * 5,
    duration: 280 + Math.random() * 240,    // 280–520ms
    delay: Math.random() * 140,
    hue: 10 + Math.random() * 45,           // deep red → orange-yellow
  }));
}

/* ─── Native video dimensions ───────────────────────────────────────── */
const VID_W = 1280;
const VID_H = 720;

/* ─── Button hotspot (locked — calibrated to cinematic) ─────────────── */
const BTN_VX = 640;
const BTN_VY = 637;
const BTN_VW = 350;
const BTN_VH = 90;

/* ─── Cover-layout helpers ───────────────────────────────────────────── */
interface CoverLayout { scale: number; offsetX: number; offsetY: number; }

function computeCoverLayout(cw: number, ch: number): CoverLayout {
  const scale = Math.max(cw / VID_W, ch / VID_H);
  return { scale, offsetX: (cw - VID_W * scale) / 2, offsetY: (ch - VID_H * scale) / 2 };
}
function toScreen(vx: number, vy: number, l: CoverLayout) {
  return { x: l.offsetX + vx * l.scale, y: l.offsetY + vy * l.scale };
}

/* ─── CSS keyframes (injected once) ─────────────────────────────────── */
const FLAME_CSS = `
  @keyframes flameRise {
    0%   { transform: rotate(var(--lean)) scaleX(var(--sx)) translateY(0)     scaleY(1);    opacity: 1; }
    25%  { transform: rotate(calc(var(--lean) * -0.6)) scaleX(calc(var(--sx) * 0.88)) translateY(-28%) scaleY(1.18); opacity: 0.97; }
    55%  { transform: rotate(calc(var(--lean) * 0.4))  scaleX(calc(var(--sx) * 0.72)) translateY(-62%) scaleY(1.38); opacity: 0.78; }
    80%  { transform: rotate(calc(var(--lean) * -0.2)) scaleX(calc(var(--sx) * 0.50)) translateY(-88%) scaleY(1.15); opacity: 0.35; }
    100% { transform: rotate(0deg)                      scaleX(calc(var(--sx) * 0.28)) translateY(-112%) scaleY(0.7); opacity: 0; }
  }

  @keyframes emberFly {
    0%   { transform: translateY(0)    translateX(0)              scale(1);   opacity: 1; }
    40%  { transform: translateY(-55%) translateX(calc(var(--ex) * 0.5px)) scale(0.9); opacity: 0.9; }
    75%  { transform: translateY(-90%) translateX(calc(var(--ex) * 0.85px)) scale(0.6); opacity: 0.55; }
    100% { transform: translateY(-130%) translateX(calc(var(--ex) * 1px))  scale(0.2); opacity: 0; }
  }

  @keyframes glowExpand {
    0%   { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
    18%  { transform: translate(-50%, -50%) scale(1.05); opacity: 0.85; }
    55%  { transform: translate(-50%, -50%) scale(1.3);  opacity: 0.5; }
    100% { transform: translate(-50%, -50%) scale(1.7);  opacity: 0; }
  }

  @keyframes coreFlash {
    0%   { opacity: 0;   transform: translate(-50%, -50%) scale(0.5); }
    12%  { opacity: 0.95; transform: translate(-50%, -50%) scale(1); }
    45%  { opacity: 0.6;  transform: translate(-50%, -50%) scale(1.15); }
    100% { opacity: 0;   transform: translate(-50%, -50%) scale(1.5); }
  }
`;

/* ─── Active-fire state ──────────────────────────────────────────────── */
interface FireState {
  flames: FlamePetal[];
  embers: Ember[];
  active: boolean;
}
const IDLE: FireState = { flames: [], embers: [], active: false };

export default function CrimsonTempleIntroScreen() {
  const { setScreen, setMode, setLives, resetGame } = useGameStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef     = useRef<HTMLVideoElement>(null);

  const [layout,  setLayout]  = useState<CoverLayout>({ scale: 1, offsetX: 0, offsetY: 0 });
  const [ended,   setEnded]   = useState(false);
  const [exiting, setExiting] = useState(false);
  const [fire,    setFire]    = useState<FireState>(IDLE);

  /* ── Cover layout tracker ── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setLayout(computeCoverLayout(el.clientWidth, el.clientHeight));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ── Autoplay + freeze on last frame ── */
  useEffect(() => { videoRef.current?.play().catch(() => {}); }, []);
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const onEnded = () => { vid.pause(); setEnded(true); };
    vid.addEventListener('ended', onEnded);
    return () => vid.removeEventListener('ended', onEnded);
  }, []);

  /* ── Enter game — volcanic fire burst then transition ── */
  const enterTemple = useCallback(() => {
    if (exiting) return;
    setFire({ flames: generateFlames(18), embers: generateEmbers(28), active: true });
    setExiting(true);
    setTimeout(() => {
      setMode('challenge');
      resetGame();
      setLives(3);
      setScreen('game');
    }, 700);
  }, [exiting, setMode, resetGame, setLives, setScreen]);

  /* ── Computed screen rect (locked, no debug offset) ── */
  const base = toScreen(BTN_VX, BTN_VY, layout);
  const sx   = base.x;
  const sy   = base.y;
  const sw   = BTN_VW * layout.scale;
  const sh   = BTN_VH * layout.scale;

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#000' }}
    >
      {/* ── Keyframes ── */}
      <style>{FLAME_CSS}</style>

      {/* ── Video ── */}
      <video
        ref={videoRef}
        src={`${import.meta.env.BASE_URL}crimson-temple-cinematic.mp4`}
        playsInline preload="auto" disablePictureInPicture
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover', pointerEvents: 'none',
        }}
        controlsList="nodownload nofullscreen noremoteplayback"
        onContextMenu={e => e.preventDefault()}
      />

      {/* ── Hotspot over video's button ── */}
      <AnimatePresence>
        {ended && (
          <motion.div
            key="hotspot"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          >
            <div
              onClick={enterTemple}
              style={{
                position: 'absolute',
                left: sx, top: sy,
                width: sw, height: sh,
                transform: 'translate(-50%,-50%)',
                cursor: 'pointer',
                pointerEvents: 'auto',
                zIndex: 50,
                borderRadius: 8,
                overflow: 'visible',
              }}
            >
              {fire.active && <>
                {/* ── Layer 1: Wide base glow ── */}
                <div style={{
                  position: 'absolute',
                  left: '50%', bottom: '5%',
                  width: sw * 1.6, height: sh * 2.2,
                  borderRadius: '50%',
                  background: 'radial-gradient(ellipse at 50% 75%, rgba(255,80,0,0.72) 0%, rgba(180,20,0,0.45) 38%, rgba(80,0,0,0.25) 65%, transparent 100%)',
                  filter: 'blur(12px)',
                  pointerEvents: 'none',
                  animation: 'glowExpand 620ms ease-out forwards',
                }} />

                {/* ── Layer 2: Core flash ── */}
                <div style={{
                  position: 'absolute',
                  left: '50%', top: '50%',
                  width: sw * 0.9, height: sh * 1.4,
                  borderRadius: '50%',
                  background: 'radial-gradient(ellipse at 50% 60%, rgba(255,255,180,0.95) 0%, rgba(255,140,0,0.7) 40%, rgba(200,30,0,0.4) 70%, transparent 100%)',
                  filter: 'blur(8px)',
                  pointerEvents: 'none',
                  animation: 'coreFlash 500ms ease-out forwards',
                }} />

                {/* ── Layer 3: Flame petals ── */}
                {fire.flames.map(p => (
                  <div
                    key={p.id}
                    style={{
                      position: 'absolute',
                      bottom: '8%',
                      left: `${p.left}%`,
                      width: p.size * p.scaleX,
                      height: p.size * 1.85,
                      borderRadius: '50% 50% 28% 28% / 62% 62% 38% 38%',
                      background: `radial-gradient(ellipse at 50% 82%,
                        ${p.colorStop1} 0%,
                        ${p.colorStop2} 52%,
                        rgba(60,0,0,0.6) 80%,
                        transparent 100%)`,
                      filter: 'blur(2px)',
                      pointerEvents: 'none',
                      transformOrigin: 'bottom center',
                      // CSS custom properties for keyframe use
                      ['--lean' as any]: `${p.lean}deg`,
                      ['--sx'   as any]: `${p.scaleX}`,
                      animation: `flameRise ${p.duration}ms cubic-bezier(0.2,0.8,0.4,1) ${p.delay}ms forwards`,
                    }}
                  />
                ))}

                {/* ── Layer 4: Ember sparks ── */}
                {fire.embers.map(e => (
                  <div
                    key={e.id}
                    style={{
                      position: 'absolute',
                      bottom: '15%',
                      left: `${e.left}%`,
                      width: e.size,
                      height: e.size,
                      borderRadius: '50%',
                      background: `radial-gradient(circle, hsl(${e.hue + 30},100%,88%) 0%, hsl(${e.hue},100%,60%) 55%, transparent 100%)`,
                      boxShadow: `0 0 ${e.size * 1.5}px hsl(${e.hue},100%,65%)`,
                      filter: 'blur(0.5px)',
                      pointerEvents: 'none',
                      transformOrigin: 'bottom center',
                      ['--ex' as any]: `${e.vx}`,
                      animation: `emberFly ${e.duration}ms ease-out ${e.delay}ms forwards`,
                    }}
                  />
                ))}
              </>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Fade to black ── */}
      <AnimatePresence>
        {exiting && (
          <motion.div
            key="fadeout"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 0.7, ease: 'easeIn' }}
            style={{ position: 'absolute', inset: 0, background: '#000', zIndex: 40, pointerEvents: 'none' }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
