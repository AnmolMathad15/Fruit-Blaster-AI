/**
 * GuardianOathScreen — Page 2 Cinematic
 *
 * Flow:
 *   1. Black → fade (0.5 s) → fullscreen video plays with sound
 *   2. At ~6.8 s: entire screen becomes tappable (matches in-video button appearance)
 *   3. Tap anywhere → petal burst → fade to black → 'modes'
 *   4. Video ends without tap → auto-navigate to 'modes'
 */

import {
  useEffect, useRef, useState, useCallback,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { useSoundManager } from '../../hooks/useSoundManager';

/** Time (seconds) when the in-video button becomes visible */
const BTN_APPEAR_TIME = 6.8;

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
type Phase =
  | 'fadein'    // black → transparent
  | 'playing'   // video playing, not yet tappable
  | 'clickable' // full screen is tappable
  | 'closing'   // tapped — video still playing, burst shown
  | 'exiting';  // fade to black before navigating

export default function GuardianOathScreen() {
  const { setScreen } = useGameStore();
  const { playClick } = useSoundManager();

  const videoRef = useRef<HTMLVideoElement>(null);

  const [phase, setPhase]         = useState<Phase>('fadein');
  const [showBurst, setShowBurst] = useState(false);
  const [tapPt, setTapPt]         = useState({ cx: 0, cy: 0 });
  const hasActedRef               = useRef(false);

  const navigate = useCallback(() => {
    if (hasActedRef.current) return;
    hasActedRef.current = true;
    setPhase('exiting');
    setTimeout(() => setScreen('modes'), 800);
  }, [setScreen]);

  /* ── Fade-in complete → start video ── */
  const handleFadeInDone = useCallback(() => {
    setPhase('playing');
    videoRef.current?.play().catch(() => {});
  }, []);

  /* ── timeupdate → unlock tap at BTN_APPEAR_TIME ── */
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

  /* ── Video ended without tap → auto-navigate ── */
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const onEnded = () => navigate();
    vid.addEventListener('ended', onEnded);
    return () => vid.removeEventListener('ended', onEnded);
  }, [navigate]);

  /* ── Full-screen tap handler ── */
  const handleTap = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (phase !== 'clickable' || hasActedRef.current) return;
    hasActedRef.current = true;
    playClick();
    setTapPt({ cx: e.clientX, cy: e.clientY });
    setShowBurst(true);
    setPhase('closing');
    setTimeout(() => setShowBurst(false), 1400);
    // Let video finish naturally; onEnded will navigate.
    // Safety: if video somehow stalls, navigate after 2 s.
    setTimeout(navigate, 2000);
  }, [phase, playClick, navigate]);

  return (
    <div
      onClick={handleTap}
      style={{
        width: '100%', height: '100%',
        position: 'relative', overflow: 'hidden',
        background: '#000',
        userSelect: 'none',
        cursor: phase === 'clickable' ? 'pointer' : 'default',
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
          objectFit: 'cover',
          willChange: 'transform',
          pointerEvents: 'none',
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

      {/* ══ 3. Petal burst from tap point ═══════════════════════════════ */}
      <BurstPetals active={showBurst} cx={tapPt.cx} cy={tapPt.cy} />

      {/* ══ 4. Fade-to-black exit ════════════════════════════════════════ */}
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
    </div>
  );
}
