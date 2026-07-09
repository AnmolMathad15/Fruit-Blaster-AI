/**
 * MoonShrineIntroScreen
 *
 * Plays moon-shrine.mp4 (1280×720, ~10 s).
 * The video plays once and freezes on the last frame.
 * An invisible "Enter the Shrine" hotspot sits over the button
 * painted in the video's last frame.
 *
 * ── Debug / Calibration ─────────────────────────────────────────────
 *   1.  Click "⚫ Debug OFF" (top-right) → turns red, shows overlay.
 *   2.  A draggable red rectangle appears over the button area.
 *   3.  Drag it until it perfectly covers the video button.
 *   4.  Read vx / vy / vw / vh from the live panel.
 *   5.  Paste those values into BTN_VX / BTN_VY / BTN_VW / BTN_VH below.
 *   6.  Toggle debug off — the transparent hit-area is now pixel-perfect.
 * ────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { useMoonStore } from '../../store/moonStore';

/* ─── Native video dimensions (1280×720) ───────────────────────────── */
const VID_W = 1280;
const VID_H = 720;

/* ─── "Enter the Shrine" button position in native 1280×720 pixels ─── */
// ⚠️  Calibrate these with Debug Mode, then hard-code the result.
let BTN_VX = 637;   // centre X
let BTN_VY = 648;   // centre Y
let BTN_VW = 380;   // width  of clickable rectangle
let BTN_VH = 85;    // height of clickable rectangle

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

/* ═══════════════════════════════════════════════════════════════════════
   Main component
═══════════════════════════════════════════════════════════════════════ */
export default function MoonShrineIntroScreen() {
  const { setScreen, setMode, setLives, resetGame } = useGameStore();
  const { reset: resetMoon } = useMoonStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef     = useRef<HTMLVideoElement>(null);

  const [phase,  setPhase]  = useState<'playing' | 'ready' | 'exiting'>('playing');
  const [debug,  setDebug]  = useState(false);
  const [layout, setLayout] = useState<CoverLayout>({ scale: 1, offsetX: 0, offsetY: 0 });
  const [drag,   setDrag]   = useState({ dx: 0, dy: 0 });
  const [copied, setCopied] = useState(false);

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
              onMouseDown={debug ? startDrag : undefined}
              onClick={!debug ? enterShrine : undefined}
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
                boxShadow:     !debug ? '0 0 24px 6px rgba(180,220,255,0.18)' : 'none',
              }}
            >
              {/* Moonlit pulse ring (non-debug) */}
              {!debug && (
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  style={{
                    position: 'absolute', inset: -3,
                    borderRadius: 10,
                    border: '2px solid rgba(180,220,255,0.40)',
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
                  <div style={{ fontWeight: 700, fontSize: 12 }}>Enter the Shrine</div>
                  <div>vx:{liveCentre.vx}  vy:{liveCentre.vy}</div>
                  <div>vw:{BTN_VW}  vh:{BTN_VH}</div>
                  <div style={{ fontSize: 10, opacity: 0.7 }}>drag to align</div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ 3. Debug calibration panel ════════════════════════════════ */}
      {debug && phase === 'ready' && (
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
            🎯 Moon Shrine button calibration
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

      {/* ══ 4. Tap-to-skip hint ═══════════════════════════════════════ */}
      <AnimatePresence>
        {phase === 'playing' && (
          <motion.p
            key="skip"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ delay: 1.5, duration: 0.6 }}
            onClick={() => {
              const vid = videoRef.current;
              if (vid) vid.currentTime = vid.duration - 0.05;
            }}
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

      {/* ══ 5. Debug toggle ═══════════════════════════════════════════ */}
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

      {/* ══ 6. Fade-to-black exit ══════════════════════════════════════ */}
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
