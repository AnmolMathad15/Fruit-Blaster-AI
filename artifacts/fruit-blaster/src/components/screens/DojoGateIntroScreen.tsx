/**
 * DojoGateIntroScreen
 *
 * Plays dojo-gate.mp4 (1920×1080, ~8.4 s).
 * The video plays once and freezes on the last frame.
 * An invisible "Enter the Dojo" hotspot sits over the button
 * painted in the video's last frame. No hover effects, no glow —
 * the video artwork speaks for itself.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';

/* ─── Native video dimensions (1920×1080) ──────────────────────────── */
const VID_W = 1920;
const VID_H = 1080;

/* ─── "Enter the Dojo" button position in native 1920×1080 pixels ──── */
const BTN_VX = 968;   // centre X
const BTN_VY = 916;   // centre Y
const BTN_VW = 490;   // width  of clickable rectangle
const BTN_VH = 110;   // height of clickable rectangle

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
export default function DojoGateIntroScreen() {
  const { setScreen, setMode, setLives, resetGame } = useGameStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef     = useRef<HTMLVideoElement>(null);

  const [phase,  setPhase]  = useState<'playing' | 'ready' | 'exiting'>('playing');
  const [layout, setLayout] = useState<CoverLayout>({ scale: 1, offsetX: 0, offsetY: 0 });

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

  /* ── Navigate to game (classic / Dojo Gate — 3 lives) ── */
  const enterDojo = useCallback(() => {
    if (phase !== 'ready') return;
    setPhase('exiting');
    setTimeout(() => {
      setMode('classic');
      resetGame();
      setLives(3);
      setScreen('game');
    }, 700);
  }, [phase, setMode, resetGame, setLives, setScreen]);

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

      {/* ══ 1. Dojo Gate cinematic video ══════════════════════════════ */}
      <video
        ref={videoRef}
        src={`${import.meta.env.BASE_URL}dojo-gate.mp4`}
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

      {/* ══ 2. "Enter the Dojo" hit-area (shown once video freezes) ══ */}
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
              onClick={enterDojo}
              style={{
                position: 'absolute',
                left:   btnL,
                top:    btnT,
                width:  btnW,
                height: btnH,
                cursor: 'pointer',
                pointerEvents: 'auto',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
            />
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
