/**
 * GuardianOathScreen — Page 2 Cinematic
 *
 * Flow:
 *   1. Black → fade (0.5 s) → fullscreen video plays with sound
 *   2. At ~6.8 s: "Begin the Journey" button fades in
 *   3. User clicks button → petal burst → fade to black → 'modes'
 *   Video ending alone does NOT navigate — user must click the button.
 */

import {
  useEffect, useRef, useState, useCallback,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { useSoundManager } from '../../hooks/useSoundManager';

/** Time (seconds) when the "Begin the Journey" button appears */
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
  | 'playing'   // video playing, button not yet visible
  | 'clickable' // "Begin the Journey" button is visible
  | 'closing'   // button clicked — burst shown, fading out
  | 'exiting';  // fade to black before navigating

export default function GuardianOathScreen() {
  const { setScreen } = useGameStore();
  const { playClick } = useSoundManager();

  const videoRef    = useRef<HTMLVideoElement>(null);
  const timersRef   = useRef<ReturnType<typeof setTimeout>[]>([]);
  const mountedRef  = useRef(true);

  const [phase, setPhase]         = useState<Phase>('fadein');
  const [showBurst, setShowBurst] = useState(false);
  const [tapPt, setTapPt]         = useState({ cx: 0, cy: 0 });
  const hasActedRef               = useRef(false);

  /* Clear all pending timers and mark unmounted */
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  const safeTimeout = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => { if (mountedRef.current) fn(); }, ms);
    timersRef.current.push(id);
  }, []);

  const navigate = useCallback(() => {
    if (hasActedRef.current) return;
    hasActedRef.current = true;
    if (!mountedRef.current) return;
    setPhase('exiting');
    safeTimeout(() => setScreen('modes'), 800);
  }, [setScreen, safeTimeout]);

  /* ── Fade-in complete → start video ── */
  const handleFadeInDone = useCallback(() => {
    setPhase('playing');
    videoRef.current?.play().catch(() => {});
  }, []);

  /* ── timeupdate → show button at BTN_APPEAR_TIME ── */
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

  /* ── "Begin the Journey" button click ── */
  const handleBegin = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (hasActedRef.current) return;
    hasActedRef.current = true;   // block any double-fire immediately
    playClick();
    setTapPt({ cx: e.clientX, cy: e.clientY });
    setShowBurst(true);
    setPhase('closing');
    safeTimeout(() => setShowBurst(false), 1400);
    safeTimeout(navigate, 600);
  }, [playClick, navigate, safeTimeout]);

  return (
    <div
      style={{
        width: '100%', height: '100%',
        position: 'relative', overflow: 'hidden',
        background: '#000',
        userSelect: 'none',
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

      {/* ══ 3. "Begin the Journey" button ═══════════════════════════════ */}
      <AnimatePresence>
        {(phase === 'clickable' || phase === 'closing') && (
          <motion.div
            key="begin-btn"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              bottom: '12%',
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              zIndex: 30,
              pointerEvents: phase === 'clickable' ? 'auto' : 'none',
            }}
          >
            <button
              onClick={handleBegin}
              style={{
                padding: '14px 40px',
                fontSize: '1.1rem',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#fff',
                background: 'linear-gradient(135deg, rgba(180,40,60,0.85) 0%, rgba(120,20,40,0.95) 100%)',
                border: '1.5px solid rgba(255,180,140,0.55)',
                borderRadius: '6px',
                cursor: 'pointer',
                boxShadow: '0 0 24px rgba(200,60,60,0.5), 0 4px 16px rgba(0,0,0,0.6)',
                backdropFilter: 'blur(4px)',
                transition: 'transform 0.12s, box-shadow 0.12s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 36px rgba(220,80,80,0.7), 0 4px 20px rgba(0,0,0,0.6)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 24px rgba(200,60,60,0.5), 0 4px 16px rgba(0,0,0,0.6)';
              }}
            >
              ⚔️ &nbsp;Begin the Journey
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ 4. Petal burst ══════════════════════════════════════════════ */}
      <BurstPetals active={showBurst} cx={tapPt.cx} cy={tapPt.cy} />

      {/* ══ 5. Fade-to-black exit ════════════════════════════════════════ */}
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
