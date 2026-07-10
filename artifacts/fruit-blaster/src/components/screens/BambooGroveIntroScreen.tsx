/**
 * BambooGroveIntroScreen
 *
 * Plays the Bamboo Grove cinematic (1280×720 native).
 * When the video ends it freezes on the last frame.
 * An invisible hotspot sits over the video's own "Enter the Grove" button.
 * Clicking it starts arcade mode.
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';

/* ─── Native video dimensions ───────────────────────────────────────── */
const VID_W = 1280;
const VID_H = 720;

/* ─── "Enter the Grove" button position in native video pixels ──────── */
const BTN_VX = 636;   // centre X
const BTN_VY = 637;   // centre Y
const BTN_VW = 350;   // width  of the rectangle
const BTN_VH = 90;    // height of the rectangle

/* ─── Cover-layout helpers ───────────────────────────────────────────── */
interface CoverLayout { scale: number; offsetX: number; offsetY: number; }

function computeCoverLayout(cw: number, ch: number): CoverLayout {
  const scale = Math.max(cw / VID_W, ch / VID_H);
  return { scale, offsetX: (cw - VID_W * scale) / 2, offsetY: (ch - VID_H * scale) / 2 };
}
function toScreen(vx: number, vy: number, l: CoverLayout) {
  return { x: l.offsetX + vx * l.scale, y: l.offsetY + vy * l.scale };
}

export default function BambooGroveIntroScreen() {
  const { setScreen, setMode, setLives, setTimeLeft, resetGame } = useGameStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef     = useRef<HTMLVideoElement>(null);

  const [layout,  setLayout]  = useState<CoverLayout>({ scale: 1, offsetX: 0, offsetY: 0 });
  const [ended,   setEnded]   = useState(false);
  const [exiting, setExiting] = useState(false);
  const [leaves,  setLeaves]  = useState<{ id: number; angle: number; dist: number; delay: number; size: number; rotate: number }[]>([]);
  const leafIdRef = useRef(0);

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
    if (exiting) return;
    // Scatter bamboo leaves from the button instead of a hover glow — the
    // grove's own way of acknowledging the tap.
    const burst = Array.from({ length: 10 }, () => ({
      id: leafIdRef.current++,
      angle: Math.random() * Math.PI * 2,
      dist: 60 + Math.random() * 70,
      delay: Math.random() * 0.08,
      size: 14 + Math.random() * 12,
      rotate: (Math.random() - 0.5) * 360,
    }));
    setLeaves(burst);
    setExiting(true);
    setTimeout(() => {
      setMode('bamboo');
      resetGame();
      setLives(3);
      setTimeLeft(120); // Zen Mode — 2 minutes
      setScreen('game');
    }, 700);
  };

  /* ── Computed screen position ── */
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
              onClick={enterGrove}
              style={{
                position: 'absolute',
                left: sx, top: sy,
                width: sw, height: sh,
                transform: 'translate(-50%,-50%)',
                cursor: 'pointer',
                pointerEvents: 'auto',
                zIndex: 50,
                borderRadius: 8,
              }}
            >
              {/* Tap feedback — bamboo leaves scatter from the button instead
                  of any hover/glow effect, per the grove's natural theme. */}
              {leaves.length > 0 && (
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                  {leaves.map(leaf => (
                    <motion.span
                      key={leaf.id}
                      initial={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 0.6 }}
                      animate={{
                        opacity: 0,
                        x: Math.cos(leaf.angle) * leaf.dist,
                        y: Math.sin(leaf.angle) * leaf.dist + 40,
                        rotate: leaf.rotate,
                        scale: 1,
                      }}
                      transition={{ duration: 0.9, delay: leaf.delay, ease: 'easeOut' }}
                      style={{
                        position: 'absolute',
                        left: '50%', top: '50%',
                        fontSize: leaf.size,
                        filter: 'drop-shadow(0 0 4px rgba(80,200,60,0.5))',
                      }}
                    >
                      🍃
                    </motion.span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
