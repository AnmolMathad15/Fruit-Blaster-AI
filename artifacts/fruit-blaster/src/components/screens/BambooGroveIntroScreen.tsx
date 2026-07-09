/**
 * BambooGroveIntroScreen
 *
 * Plays the Bamboo Grove cinematic (1280×720 native).
 * When the video ends it freezes on the last frame.
 * An invisible hotspot sits over the video's own "Enter the Grove" button.
 * Clicking it starts arcade mode.
 *
 * Debug mode (top-right toggle): drag the hotspot to align it,
 * copy the final vx/vy, then paste them back to hard-code.
 */

import { useEffect, useRef, useState, useReducer } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';

/* ─── Native video dimensions ───────────────────────────────────────── */
const VID_W = 1280;
const VID_H = 720;

/* ─── "Enter the Grove" button position in native video pixels ──────── */
// Adjust via debug drag — these are a best-guess start position
let BTN_VX = 640;   // centre X
let BTN_VY = 620;   // centre Y
let BTN_VR = 140;   // radius (wide to cover the full button text area)

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

/* ─── Drag offset ────────────────────────────────────────────────────── */
interface Offset { dx: number; dy: number; }
const ZERO: Offset = { dx: 0, dy: 0 };

export default function BambooGroveIntroScreen() {
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
  const [hovered, setHovered] = useState(false);

  /* ── Container resize → cover layout ── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setLayout(computeCoverLayout(el.clientWidth, el.clientHeight));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ── Autoplay + freeze ── */
  useEffect(() => { videoRef.current?.play().catch(() => {}); }, []);
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const onEnded = () => { vid.pause(); setEnded(true); };
    vid.addEventListener('ended', onEnded);
    return () => vid.removeEventListener('ended', onEnded);
  }, []);

  /* ── Enter game ── */
  const enterGrove = () => {
    if (exiting || debug) return;
    setExiting(true);
    setTimeout(() => {
      setMode('arcade');
      resetGame();
      setLives(3);
      setScreen('game');
    }, 700);
  };

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

  /* ── Computed screen position ── */
  const base   = toScreen(BTN_VX, BTN_VY, layout);
  const sx     = base.x + offset.dx;
  const sy     = base.y + offset.dy;
  const sr     = BTN_VR * layout.scale;
  const live   = toNative(sx, sy, layout);

  /* ── Copy calibration output ── */
  const copy = () => {
    const code = `// Paste these into BambooGroveIntroScreen.tsx:\nlet BTN_VX = ${live.vx};\nlet BTN_VY = ${live.vy};\nlet BTN_VR = ${Math.round(BTN_VR)};`;
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
      {/* ── Video ── */}
      <video
        ref={videoRef}
        src={`${import.meta.env.BASE_URL}bamboo-grove-cinematic.mp4`}
        playsInline preload="auto" disablePictureInPicture
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover', pointerEvents: 'none',
        }}
        controlsList="nodownload nofullscreen noremoteplayback"
        onContextMenu={e => e.preventDefault()}
      />

      {/* ── Hotspot — appears when video ends ── */}
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
              onMouseEnter={() => !debug && setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              onClick={enterGrove}
              style={{
                position: 'absolute',
                left: sx, top: sy,
                width: sr * 2, height: sr * 2,
                transform: 'translate(-50%,-50%)',
                cursor: debug ? 'grab' : 'pointer',
                pointerEvents: 'auto',
                zIndex: 50,
              }}
            >
              {/* Hover glow ring (production only) */}
              {!debug && hovered && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{
                    position: 'absolute', inset: -12,
                    borderRadius: '50%',
                    border: '2px solid rgba(120,220,80,0.6)',
                    boxShadow: '0 0 32px 10px rgba(80,200,60,0.35)',
                    pointerEvents: 'none',
                  }}
                />
              )}

              {/* Debug overlay */}
              {debug && (
                <>
                  <div style={{
                    position: 'absolute', inset: 0,
                    borderRadius: '50%',
                    background: 'rgba(255,30,30,0.28)',
                    border: '2px dashed rgba(255,80,80,0.7)',
                  }} />
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%,-50%)',
                    fontFamily: 'monospace', fontSize: 10, lineHeight: 1.5,
                    color: '#fff', textAlign: 'center',
                    textShadow: '0 0 4px #000,0 0 4px #000',
                    pointerEvents: 'none',
                  }}>
                    <div style={{ fontWeight: 700 }}>Enter the Grove</div>
                    <div>vx:{live.vx} vy:{live.vy}</div>
                    <div>r:{Math.round(sr)}px</div>
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
            Drag red circle over the<br />video button, then copy.
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

      {/* ── Fade to black on exit ── */}
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
