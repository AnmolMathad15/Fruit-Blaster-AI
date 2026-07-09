/**
 * GuardianOathScreen — Page 2 Cinematic
 *
 * Plays page2-cinematic.mp4 (1920×1080, ~8.1 s).
 * The video's "Begin the Journey" button becomes clickable at BTN_APPEAR_TIME.
 * An invisible hit-area sits exactly over it using the cover-layout system.
 * Auto-advance on video end is intentionally disabled — the player must click
 * the in-video button.
 *
 * ── Debug / Calibration ─────────────────────────────────────────────
 *   1.  Click "⚫ Debug OFF" (top-right) → turns red, shows overlay.
 *   2.  A draggable red rectangle appears over the button area.
 *   3.  Drag it until it perfectly covers the video's BEGIN THE JOURNEY button.
 *   4.  Read vx / vy / vw / vh from the live panel.
 *   5.  Paste those values into BTN_VX / BTN_VY / BTN_VW / BTN_VH below.
 *   6.  Toggle debug off — the hit-area is fully invisible and pixel-perfect.
 * ────────────────────────────────────────────────────────────────────
 */

import {
  useEffect, useRef, useState, useCallback,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { useSoundManager } from '../../hooks/useSoundManager';

/* ─── Native video dimensions (1920×1080) ──────────────────────────── */
const VID_W = 1920;
const VID_H = 1080;

/* ─── "Begin the Journey" button position in native 1920×1080 pixels ─ */
// ⚠️  Calibrate with Debug Mode, then hard-code the result.
let BTN_VX = 954;   // centre X
let BTN_VY = 920;   // centre Y
let BTN_VW = 500;   // width
let BTN_VH = 110;   // height

/** Time (seconds) when the in-video button becomes visible */
const BTN_APPEAR_TIME = 6.8;

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

/* ─── Burst petals from tap point ───────────────────────────────────── */
function BurstPetals({ active, cx, cy }: { active: boolean; cx: number; cy: number }) {
  if (!active) return null;
  return (
    <>
      {Array.from({ length: 28 }, (_, i) => {
        const angle = (i / 28) * 360;
        const dist  = 100 + Math.random() * 180;
        const vx    = Math.cos((angle * Math.PI) / 180) * dist;
        const vy    = Math.sin((angle * Math.PI) / 180) * dist - 80;
        const hue   = 338 + Math.random() * 22;
        const size  = 10 + Math.random() * 10;
        return (
          <motion.div
            key={i}
            initial={{ x: cx, y: cy, opacity: 1, scale: 0.6, rotate: 0 }}
            animate={{ x: cx + vx, y: cy + vy, opacity: 0, scale: 1.4, rotate: 720 }}
            transition={{ duration: 1.2, delay: Math.random() * 0.15, ease: 'easeOut' }}
            style={{
              position: 'fixed', top: 0, left: 0,
              width: size, height: size * 0.55,
              borderRadius: '60% 40% 60% 40%',
              background: `hsl(${hue},75%,78%)`,
              boxShadow: `0 0 6px hsl(${hue},60%,85%)`,
              pointerEvents: 'none',
              zIndex: 35,
            }}
          />
        );
      })}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Main component
═══════════════════════════════════════════════════════════════════════ */
type Phase = 'fadein' | 'playing' | 'clickable' | 'exiting';

export default function GuardianOathScreen() {
  const { setScreen } = useGameStore();
  const { playClick } = useSoundManager();

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef     = useRef<HTMLVideoElement>(null);
  const hasActedRef  = useRef(false);

  const [phase,     setPhase]     = useState<Phase>('fadein');
  const [debug,     setDebug]     = useState(false);
  const [layout,    setLayout]    = useState<CoverLayout>({ scale: 1, offsetX: 0, offsetY: 0 });
  const [drag,      setDrag]      = useState({ dx: 0, dy: 0 });
  const [copied,    setCopied]    = useState(false);
  const [showBurst, setShowBurst] = useState(false);
  const [tapPt,     setTapPt]     = useState({ cx: 0, cy: 0 });

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

  /* ── Fade-in complete → start video ── */
  const handleFadeInDone = useCallback(() => {
    setPhase('playing');
    videoRef.current?.play().catch(() => {});
  }, []);

  /* ── timeupdate → unlock hit-area at BTN_APPEAR_TIME ── */
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const onTime = () => {
      if (vid.currentTime >= BTN_APPEAR_TIME && phase === 'playing') {
        setPhase('clickable');
      }
    };
    vid.addEventListener('timeupdate', onTime);
    return () => vid.removeEventListener('timeupdate', onTime);
  }, [phase]);

  /* ── Navigate to modes ── */
  const navigate = useCallback((e: React.MouseEvent) => {
    if (phase !== 'clickable' || hasActedRef.current) return;
    hasActedRef.current = true;
    playClick();
    setTapPt({ cx: e.clientX, cy: e.clientY });
    setShowBurst(true);
    setPhase('exiting');
    setTimeout(() => setShowBurst(false), 1400);
    setTimeout(() => setScreen('modes'), 800);
  }, [phase, playClick, setScreen]);

  /* ── Compute screen-space button rect ── */
  const btnBase = toScreen(BTN_VX, BTN_VY, layout);
  const btnW    = BTN_VW * layout.scale;
  const btnH    = BTN_VH * layout.scale;
  const btnL    = btnBase.x - btnW / 2 + drag.dx;
  const btnT    = btnBase.y - btnH / 2 + drag.dy;

  /* ── Live native coords (for debug panel) ── */
  const liveCentre = toNative(btnL + btnW / 2, btnT + btnH / 2, layout);

  /* ── Debug drag handlers ── */
  const startDrag = useCallback((e: React.MouseEvent) => {
    if (!debug) return;
    e.preventDefault();
    const startX = e.clientX - drag.dx;
    const startY = e.clientY - drag.dy;
    const onMove = (ev: MouseEvent) => setDrag({ dx: ev.clientX - startX, dy: ev.clientY - startY });
    const onUp   = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [debug, drag]);

  /* ── Copy coords to clipboard ── */
  const copyCoords = () => {
    const text =
      `let BTN_VX = ${liveCentre.vx};   // centre X\n` +
      `let BTN_VY = ${liveCentre.vy};   // centre Y\n` +
      `let BTN_VW = ${BTN_VW};   // width\n` +
      `let BTN_VH = ${BTN_VH};   // height`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  /* ── Skip: go directly to world selection, bypassing the video button ── */
  const handleSkip = () => {
    if (hasActedRef.current) return;
    hasActedRef.current = true;
    setPhase('exiting');
    setTimeout(() => setScreen('modes'), 800);
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%', height: '100%',
        position: 'relative', overflow: 'hidden',
        background: '#000', userSelect: 'none',
      }}
    >

      {/* ══ 1. Cinematic video ══════════════════════════════════════════ */}
      <video
        ref={videoRef}
        src={`${import.meta.env.BASE_URL}page2-cinematic.mp4`}
        playsInline
        preload="auto"
        disablePictureInPicture
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover', pointerEvents: 'none',
          willChange: 'transform',
        }}
        controlsList="nodownload nofullscreen noremoteplayback"
        onContextMenu={e => e.preventDefault()}
      />

      {/* ══ 2. Fade-in overlay (black → clear) ═════════════════════════ */}
      <AnimatePresence>
        {phase === 'fadein' && (
          <motion.div
            key="fadein"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            onAnimationComplete={handleFadeInDone}
            style={{ position: 'absolute', inset: 0, background: '#000', zIndex: 20, pointerEvents: 'none' }}
          />
        )}
      </AnimatePresence>

      {/* ══ 3. "Begin the Journey" invisible hit-area ═══════════════════ */}
      <AnimatePresence>
        {(phase === 'clickable' || (debug && phase !== 'fadein')) && (
          <motion.div
            key="btn-hitarea"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          >
            <div
              onMouseDown={debug ? startDrag : undefined}
              onClick={!debug ? navigate : undefined}
              style={{
                position: 'absolute',
                left:   btnL,
                top:    btnT,
                width:  btnW,
                height: btnH,
                cursor:        debug ? 'grab' : 'pointer',
                pointerEvents: 'auto',
                background:    debug ? 'rgba(255,30,30,0.28)' : 'transparent',
                border:        debug ? '2px dashed rgba(255,80,80,0.85)' : 'none',
                borderRadius:  8,
                boxShadow:     !debug ? '0 0 24px 6px rgba(255,200,120,0.15)' : 'none',
              }}
            >
              {/* Subtle pulse ring (non-debug) */}
              {!debug && (
                <motion.div
                  animate={{ opacity: [0.4, 0.9, 0.4] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                  style={{
                    position: 'absolute', inset: -3,
                    borderRadius: 10,
                    border: '2px solid rgba(255,200,120,0.35)',
                    pointerEvents: 'none',
                  }}
                />
              )}

              {/* Debug label */}
              {debug && (
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%,-50%)',
                  fontFamily: 'monospace', fontSize: 11, color: '#fff',
                  textShadow: '0 0 4px #000,0 0 4px #000',
                  pointerEvents: 'none', textAlign: 'center', lineHeight: 1.6,
                }}>
                  <div style={{ fontWeight: 700, fontSize: 12 }}>Begin the Journey</div>
                  <div>vx:{liveCentre.vx}  vy:{liveCentre.vy}</div>
                  <div>vw:{BTN_VW}  vh:{BTN_VH}</div>
                  <div style={{ fontSize: 10, opacity: 0.7 }}>drag to align</div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ 4. Petal burst from tap point ═══════════════════════════════ */}
      <BurstPetals active={showBurst} cx={tapPt.cx} cy={tapPt.cy} />

      {/* ══ 5. Debug calibration panel ════════════════════════════════ */}
      {debug && phase !== 'fadein' && (
        <div style={{
          position: 'absolute', top: 50, right: 12, zIndex: 200,
          background: 'rgba(0,0,0,0.90)',
          border: '1px solid rgba(255,80,80,0.45)',
          borderRadius: 10, padding: '14px 16px',
          fontFamily: 'monospace', fontSize: 11, color: '#fff',
          minWidth: 230, backdropFilter: 'blur(6px)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.8)',
        }}>
          <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 10, color: '#ff8080' }}>
            🎯 Begin the Journey — calibration
          </div>
          <div style={{ lineHeight: 2, color: '#aaa' }}>
            centre X: <b style={{ color: '#fff' }}>{liveCentre.vx}</b><br />
            centre Y: <b style={{ color: '#fff' }}>{liveCentre.vy}</b><br />
            width:    <b style={{ color: '#fff' }}>{BTN_VW}</b><br />
            height:   <b style={{ color: '#fff' }}>{BTN_VH}</b>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
            <button onClick={copyCoords} style={{
              flex: 1, padding: '6px 0',
              background: copied ? 'rgba(60,180,60,0.8)' : 'rgba(255,80,80,0.7)',
              border: 'none', borderRadius: 6,
              color: '#fff', fontFamily: 'monospace',
              fontSize: 11, cursor: 'pointer', fontWeight: 700,
            }}>
              {copied ? '✓ Copied!' : '📋 Copy coords'}
            </button>
            <button onClick={() => setDrag({ dx: 0, dy: 0 })} style={{
              padding: '6px 10px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 6, color: '#ccc',
              fontFamily: 'monospace', fontSize: 11, cursor: 'pointer',
            }}>↺</button>
          </div>
          <div style={{ marginTop: 10, color: 'rgba(255,255,255,0.35)', fontSize: 10, lineHeight: 1.5 }}>
            Drag the red box onto the video button.<br />
            Copy → paste values into BTN_VX/VY/VW/VH.
          </div>
        </div>
      )}

      {/* ══ 6. Skip hint ══════════════════════════════════════════════ */}
      <AnimatePresence>
        {phase === 'playing' && (
          <motion.p
            key="skip"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ delay: 1.5, duration: 0.6 }}
            onClick={handleSkip}
            style={{
              position: 'absolute', bottom: '3%', left: 0, right: 0,
              margin: 0, textAlign: 'center',
              fontFamily: 'Georgia,serif', fontSize: 11,
              letterSpacing: 4, textTransform: 'uppercase',
              color: 'rgba(255,220,150,0.45)',
              cursor: 'pointer', zIndex: 10, pointerEvents: 'auto',
            }}
          >
            tap to skip
          </motion.p>
        )}
      </AnimatePresence>

      {/* ══ 7. Fade-to-black exit ══════════════════════════════════════ */}
      <AnimatePresence>
        {phase === 'exiting' && (
          <motion.div
            key="fadeout"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, ease: 'easeIn' }}
            style={{ position: 'absolute', inset: 0, background: '#000', zIndex: 40, pointerEvents: 'none' }}
          />
        )}
      </AnimatePresence>

      {/* ══ 8. Debug toggle ═══════════════════════════════════════════ */}
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
    </div>
  );
}
