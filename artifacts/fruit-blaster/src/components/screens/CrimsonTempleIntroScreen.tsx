/**
 * CrimsonTempleIntroScreen
 *
 * Plays the Crimson Temple cinematic (1280×720 native).
 * Freezes on last frame. An invisible rectangular hotspot sits over
 * the video's own "Enter the Temple" button — drag to calibrate.
 * Clicking it starts challenge mode.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';

/* ─── Fire particle config ───────────────────────────────────────────── */
interface FlameParticle {
  id: number;
  left: number;   // % across button width
  size: number;   // px
  duration: number; // ms
  delay: number;  // ms
  hue: number;    // degrees for color variation
}

function generateFlames(count = 22): FlameParticle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: 4 + Math.random() * 92,
    size: 18 + Math.random() * 28,
    duration: 350 + Math.random() * 180, // max ~530ms — all finish before 650ms
    delay: Math.random() * 100,          // max ~100ms — total ≤ 630ms < 700ms nav
    hue: Math.random() * 30 - 10,        // -10..+20 degrees around orange-red
  }));
}

/* ─── Native video dimensions ───────────────────────────────────────── */
const VID_W = 1280;
const VID_H = 720;

/* ─── Button hotspot — calibrate via debug drag ─────────────────────── */
let BTN_VX = 640;   // centre X in native video pixels
let BTN_VY = 637;   // centre Y
let BTN_VW = 350;   // rectangle width
let BTN_VH = 90;    // rectangle height

/* ─── Cover-layout helpers ───────────────────────────────────────────── */
interface CoverLayout { scale: number; offsetX: number; offsetY: number; }

function computeCoverLayout(cw: number, ch: number): CoverLayout {
  const scale = Math.max(cw / VID_W, ch / VID_H);
  return { scale, offsetX: (cw - VID_W * scale) / 2, offsetY: (ch - VID_H * scale) / 2 };
}
function toScreen(vx: number, vy: number, l: CoverLayout) {
  return { x: l.offsetX + vx * l.scale, y: l.offsetY + vy * l.scale };
}
function toNative(sx: number, sy: number, l: CoverLayout) {
  return { vx: Math.round((sx - l.offsetX) / l.scale), vy: Math.round((sy - l.offsetY) / l.scale) };
}

interface Offset { dx: number; dy: number; }
const ZERO: Offset = { dx: 0, dy: 0 };

export default function CrimsonTempleIntroScreen() {
  const { setScreen, setMode, setLives, resetGame } = useGameStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef     = useRef<HTMLVideoElement>(null);
  const dragging     = useRef(false);
  const dragStart    = useRef({ mx: 0, my: 0, dx: 0, dy: 0 });

  const [layout,  setLayout]  = useState<CoverLayout>({ scale: 1, offsetX: 0, offsetY: 0 });
  const [ended,   setEnded]   = useState(false);
  const [exiting, setExiting] = useState(false);
  const [debug,   setDebug]   = useState(false);
  const [offset,  setOffset]  = useState<Offset>(ZERO);
  const [copied,  setCopied]  = useState(false);
  const [flames,  setFlames]  = useState<FlameParticle[]>([]);

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

  /* ── Enter game (with fire burst) ── */
  const enterTemple = useCallback(() => {
    if (exiting || debug) return;
    // Spawn fire particles (all complete within ~630ms; component unmounts at 700ms)
    setFlames(generateFlames(24));
    setExiting(true);
    setTimeout(() => {
      setMode('challenge');
      resetGame();
      setLives(3);
      setScreen('game');
    }, 700);
  }, [exiting, debug, setMode, resetGame, setLives, setScreen]);

  /* ── Drag (debug only) ── */
  const onMouseDown = (e: React.MouseEvent) => {
    if (!debug) return;
    e.preventDefault();
    dragging.current = true;
    dragStart.current = { mx: e.clientX, my: e.clientY, dx: offset.dx, dy: offset.dy };
    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      setOffset({
        dx: dragStart.current.dx + (ev.clientX - dragStart.current.mx),
        dy: dragStart.current.dy + (ev.clientY - dragStart.current.my),
      });
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  /* ── Computed screen rect ── */
  const base = toScreen(BTN_VX, BTN_VY, layout);
  const sx   = base.x + offset.dx;
  const sy   = base.y + offset.dy;
  const sw   = BTN_VW * layout.scale;
  const sh   = BTN_VH * layout.scale;
  const live = toNative(sx, sy, layout);

  /* ── Copy calibration output ── */
  const copy = () => {
    const code = `// Paste these into CrimsonTempleIntroScreen.tsx:\nlet BTN_VX = ${live.vx};\nlet BTN_VY = ${live.vy};\nlet BTN_VW = ${Math.round(BTN_VW)};\nlet BTN_VH = ${Math.round(BTN_VH)};`;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#000' }}
    >
      {/* ── Fire animation keyframes ── */}
      <style>{`
        @keyframes flameRise {
          0%   { transform: translateY(0)   scaleX(1)    scaleY(1)    rotate(0deg);   opacity: 1; }
          30%  { transform: translateY(-35%) scaleX(0.85) scaleY(1.2)  rotate(-4deg);  opacity: 0.95; }
          60%  { transform: translateY(-65%) scaleX(0.7)  scaleY(1.4)  rotate(3deg);   opacity: 0.7; }
          85%  { transform: translateY(-90%) scaleX(0.5)  scaleY(1.15) rotate(-2deg);  opacity: 0.3; }
          100% { transform: translateY(-110%) scaleX(0.3) scaleY(0.8)  rotate(0deg);   opacity: 0; }
        }
      `}</style>

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
              onMouseDown={onMouseDown}
              onClick={enterTemple}
              style={{
                position: 'absolute',
                left: sx, top: sy,
                width: sw, height: sh,
                transform: 'translate(-50%,-50%)',
                cursor: debug ? 'grab' : 'pointer',
                pointerEvents: 'auto',
                zIndex: 50,
                borderRadius: 8,
                overflow: 'visible',
              }}
            >
              {/* Fire flame particles on click */}
              {!debug && flames.map(p => (
                <div
                  key={p.id}
                  style={{
                    position: 'absolute',
                    bottom: '10%',
                    left: `${p.left}%`,
                    width: p.size,
                    height: p.size * 1.5,
                    borderRadius: '50% 50% 30% 30% / 60% 60% 40% 40%',
                    background: `radial-gradient(ellipse at 50% 80%,
                      hsl(${45 + p.hue},100%,75%) 0%,
                      hsl(${20 + p.hue},100%,55%) 40%,
                      hsl(${5 + p.hue},100%,40%) 70%,
                      transparent 100%)`,
                    filter: 'blur(1.5px)',
                    pointerEvents: 'none',
                    transformOrigin: 'bottom center',
                    animation: `flameRise ${p.duration}ms ease-out ${p.delay}ms forwards`,
                  }}
                />
              ))}

              {/* Debug overlay */}
              {debug && (
                <>
                  <div style={{
                    position: 'absolute', inset: 0,
                    borderRadius: 8,
                    background: 'rgba(255,30,30,0.28)',
                    border: '2px dashed rgba(255,80,80,0.7)',
                  }} />
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%,-50%)',
                    fontFamily: 'monospace', fontSize: 10, lineHeight: 1.5,
                    color: '#fff', textAlign: 'center',
                    textShadow: '0 0 4px #000,0 0 4px #000',
                    pointerEvents: 'none', whiteSpace: 'nowrap',
                  }}>
                    <div style={{ fontWeight: 700 }}>Enter the Temple</div>
                    <div>vx:{live.vx} vy:{live.vy}</div>
                    <div>{Math.round(sw)}×{Math.round(sh)}px</div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Debug calibration panel ── */}
      {debug && ended && (
        <div style={{
          position: 'absolute', top: 50, right: 12, zIndex: 200,
          background: 'rgba(0,0,0,0.88)',
          border: '1px solid rgba(255,80,80,0.4)',
          borderRadius: 10, padding: '12px 14px',
          fontFamily: 'monospace', fontSize: 11, color: '#fff',
          minWidth: 200, backdropFilter: 'blur(6px)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.7)',
        }}>
          <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8, color: '#ff8080' }}>
            🎯 Drag onto button
          </div>
          <div style={{ color: '#aaa', marginBottom: 8 }}>
            vx: <b style={{ color: '#fff' }}>{live.vx}</b>{'  '}
            vy: <b style={{ color: '#fff' }}>{live.vy}</b>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={copy} style={{
              flex: 1, padding: '5px 0',
              background: copied ? 'rgba(60,180,60,0.8)' : 'rgba(255,80,80,0.7)',
              border: 'none', borderRadius: 6, color: '#fff',
              fontFamily: 'monospace', fontSize: 11, cursor: 'pointer', fontWeight: 700,
            }}>
              {copied ? '✓ Copied!' : '📋 Copy coords'}
            </button>
            <button onClick={() => setOffset(ZERO)} style={{
              padding: '5px 10px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 6, color: '#ccc',
              fontFamily: 'monospace', fontSize: 11, cursor: 'pointer',
            }}>
              ↺
            </button>
          </div>
          <div style={{ marginTop: 10, color: 'rgba(255,255,255,0.35)', fontSize: 10, lineHeight: 1.5 }}>
            Drag red rectangle over the<br />video button, then copy.
          </div>
        </div>
      )}

      {/* ── Debug toggle ── */}
      <button
        onClick={() => setDebug(v => !v)}
        style={{
          position: 'absolute', top: 12, right: 12, zIndex: 300,
          padding: '5px 12px', fontFamily: 'monospace', fontSize: 11,
          background: debug ? 'rgba(255,60,60,0.85)' : 'rgba(0,0,0,0.55)',
          color: '#fff',
          border: `1px solid ${debug ? '#ff4444' : 'rgba(255,255,255,0.2)'}`,
          borderRadius: 6, cursor: 'pointer', backdropFilter: 'blur(4px)',
          transition: 'all 0.2s',
        }}
      >
        {debug ? '🔴 Debug ON' : '⚫ Debug OFF'}
      </button>

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
