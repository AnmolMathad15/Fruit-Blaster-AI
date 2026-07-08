/**
 * GuardianOathScreen — Page 2 Cinematic
 *
 * Flow:
 *   1. Fade from black (0.5 s) → fullscreen cinematic video plays with audio
 *   2. No HTML overlay during playback — only the video is visible
 *   3. On ended: freeze on last frame ~1 s → fade in "BEGIN THE JOURNEY" button
 *   4. Button click: depress → golden energy burst → petals → fade to black → 'modes'
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { useSoundManager } from '../../hooks/useSoundManager';

/* ─── Floating cherry-blossom petal (canvas-free, pure CSS/framer) ─── */
interface PetalProps {
  id: number;
  style?: React.CSSProperties;
  animate?: object;
  transition?: object;
}

function FloatingPetal({ style, animate, transition }: Omit<PetalProps, 'id'>) {
  const hue = 338 + Math.random() * 20;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: [0, 0.8, 0], scale: [0.6, 1, 0.5], ...animate }}
      transition={transition}
      style={{
        position: 'absolute',
        width: 10 + Math.random() * 8,
        height: 6 + Math.random() * 5,
        borderRadius: '60% 40% 60% 40%',
        background: `hsl(${hue},72%,78%)`,
        boxShadow: `0 0 6px hsl(${hue},60%,85%)`,
        pointerEvents: 'none',
        ...style,
      }}
    />
  );
}

/* ─── Ambient idle petals around the button ─────────────────────────── */
const IDLE_PETALS = Array.from({ length: 12 }, (_, i) => i);

function IdlePetals({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <>
      {IDLE_PETALS.map(i => {
        const angle = (i / IDLE_PETALS.length) * 360;
        const r = 80 + Math.random() * 60;
        const x = Math.cos((angle * Math.PI) / 180) * r;
        const y = Math.sin((angle * Math.PI) / 180) * r;
        const delay = (i / IDLE_PETALS.length) * 4;
        return (
          <FloatingPetal
            key={i}
            style={{ left: '50%', top: '50%', marginLeft: -5, marginTop: -3 }}
            animate={{
              x: [x * 0.6, x, x * 0.8, x * 0.6],
              y: [y * 0.6, y, y * 0.8, y * 0.6],
              rotate: [0, 180, 360],
            }}
            transition={{ duration: 4 + Math.random() * 2, delay, repeat: Infinity, ease: 'easeInOut' }}
          />
        );
      })}
    </>
  );
}

/* ─── Burst petals on click ──────────────────────────────────────────── */
const BURST_PETALS = Array.from({ length: 24 }, (_, i) => i);

function BurstPetals({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <>
      {BURST_PETALS.map(i => {
        const angle = (i / BURST_PETALS.length) * 360;
        const dist = 120 + Math.random() * 160;
        const vx = Math.cos((angle * Math.PI) / 180) * dist;
        const vy = Math.sin((angle * Math.PI) / 180) * dist - 60;
        return (
          <FloatingPetal
            key={i}
            style={{ left: '50%', top: '50%', marginLeft: -5, marginTop: -3 }}
            animate={{ x: [0, vx], y: [0, vy], rotate: [0, 720], opacity: [1, 0] }}
            transition={{ duration: 1.2, delay: Math.random() * 0.2, ease: 'easeOut' }}
          />
        );
      })}
    </>
  );
}

/* ─── Golden energy ring on click ────────────────────────────────────── */
function EnergyRing({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <>
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          initial={{ scale: 0.8, opacity: 0.9 }}
          animate={{ scale: [0.8, 3.5], opacity: [0.9, 0] }}
          transition={{ duration: 0.8, delay: i * 0.15, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            inset: -2,
            borderRadius: 12,
            border: '2px solid rgba(255, 210, 60, 0.9)',
            boxShadow: '0 0 20px rgba(255, 180, 20, 0.6)',
            pointerEvents: 'none',
          }}
        />
      ))}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Main component
═══════════════════════════════════════════════════════════════════════ */
type Phase =
  | 'fadein'      // fading in from black
  | 'playing'     // video playing — zero overlay
  | 'freeze'      // video ended, holding last frame ~1 s
  | 'button'      // button fading in
  | 'exiting';    // fade to black before navigating

export default function GuardianOathScreen() {
  const { setScreen } = useGameStore();
  const { playClick } = useSoundManager();

  const videoRef      = useRef<HTMLVideoElement>(null);
  const [phase, setPhase]         = useState<Phase>('fadein');
  const [btnHover, setBtnHover]   = useState(false);
  const [clicked, setClicked]     = useState(false);
  const btnControls               = useAnimation();

  /* ── Fade-in complete → switch to "playing" ── */
  const handleFadeInDone = useCallback(() => {
    setPhase('playing');
    // Attempt to play with sound; browsers allow it because user clicked PLAY NOW
    videoRef.current?.play().catch(() => {});
  }, []);

  /* ── Video ended → freeze ~1 s → show button ── */
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const onEnded = () => {
      setPhase('freeze');
      setTimeout(() => setPhase('button'), 1000);
    };

    vid.addEventListener('ended', onEnded);
    return () => vid.removeEventListener('ended', onEnded);
  }, []);

  /* ── Button: idle breathing glow animation ── */
  useEffect(() => {
    if (phase !== 'button') return;
    btnControls.start({
      boxShadow: [
        '0 0 20px rgba(200,150,20,0.4), 0 4px 24px rgba(0,0,0,0.5)',
        '0 0 50px rgba(255,200,40,0.9), 0 4px 24px rgba(0,0,0,0.5)',
        '0 0 20px rgba(200,150,20,0.4), 0 4px 24px rgba(0,0,0,0.5)',
      ],
      transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
    });
  }, [phase, btnControls]);

  /* ── Click handler ── */
  const handleBegin = useCallback(async () => {
    if (clicked || phase !== 'button') return;
    setClicked(true);
    playClick();

    // Depress + burst
    await btnControls.start({ scale: 0.95, transition: { duration: 0.08 } });
    await btnControls.start({ scale: 1.02, transition: { duration: 0.1 } });

    // Short pause for burst to play, then exit
    setTimeout(() => {
      setPhase('exiting');
      setTimeout(() => setScreen('modes'), 800);
    }, 400);
  }, [clicked, phase, playClick, btnControls, setScreen]);

  /* Derive overlay opacity for the black fade layers */
  const fadeInOverlay  = phase === 'fadein';
  const fadeOutOverlay = phase === 'exiting';

  return (
    <div className="w-full h-full relative overflow-hidden bg-black select-none">

      {/* ══ 1. Cinematic video — always mounted, covers full viewport ══ */}
      <video
        ref={videoRef}
        src={`${import.meta.env.BASE_URL}page2-cinematic.mp4`}
        playsInline
        preload="auto"
        disablePictureInPicture
        /* NOTE: NOT muted — the video has its own audio track */
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          willChange: 'transform', // GPU hint
          pointerEvents: 'none',
        }}
        /* Hide every native browser chrome element */
        controlsList="nodownload nofullscreen noremoteplayback"
        onContextMenu={e => e.preventDefault()}
      />

      {/* ══ 2. Fade-in overlay (black → transparent) ══ */}
      <AnimatePresence>
        {fadeInOverlay && (
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

      {/* ══ 3. "BEGIN THE JOURNEY" button — only when phase === 'button' ══ */}
      <AnimatePresence>
        {phase === 'button' && (
          <motion.div
            key="btn-container"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'absolute',
              bottom: '8%',
              left: 0, right: 0,
              display: 'flex',
              justifyContent: 'center',
              zIndex: 30,
              pointerEvents: clicked ? 'none' : 'auto',
            }}
          >
            {/* Ambient petal field */}
            <div style={{ position: 'relative', display: 'inline-flex' }}>
              <IdlePetals active={!clicked} />
              <BurstPetals active={clicked} />
              <EnergyRing active={clicked} />

              {/* The button itself */}
              <motion.button
                animate={btnControls}
                whileHover={!clicked ? {
                  y: -5,
                  boxShadow: '0 0 70px rgba(255,200,40,1), 0 8px 32px rgba(0,0,0,0.6)',
                  transition: { duration: 0.2 },
                } : {}}
                onHoverStart={() => setBtnHover(true)}
                onHoverEnd={() => setBtnHover(false)}
                onClick={handleBegin}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '16px 48px',
                  background: 'linear-gradient(180deg, #f0d060 0%, #c8a020 40%, #9a7010 100%)',
                  border: '2px solid #f8e080',
                  borderRadius: 8,
                  cursor: 'pointer',
                  outline: 'none',
                  zIndex: 1,
                }}
              >
                {/* Left gem */}
                <Gem pulse={btnHover} />

                <span style={{
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontWeight: 700,
                  fontSize: 18,
                  letterSpacing: 4,
                  textTransform: 'uppercase',
                  color: '#1a0800',
                  textShadow: '0 1px 3px rgba(255,255,255,0.4)',
                  whiteSpace: 'nowrap',
                }}>
                  Begin the Journey
                </span>

                {/* Right gem */}
                <Gem pulse={btnHover} />

                {/* Sweeping shine every ~4 s */}
                <SweepingShine />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ 4. Fade-out overlay (transparent → black) before 'modes' ══ */}
      <AnimatePresence>
        {fadeOutOverlay && (
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

/* ─── Gem sub-component ───────────────────────────────────────────── */
function Gem({ pulse }: { pulse: boolean }) {
  return (
    <motion.div
      animate={pulse
        ? { scale: [1, 1.3, 1], boxShadow: ['0 0 8px #40e060', '0 0 20px #40ff70', '0 0 8px #40e060'] }
        : { scale: 1 }}
      transition={{ duration: 0.4, repeat: pulse ? Infinity : 0 }}
      style={{
        width: 14, height: 14,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 35%, #b0ffb8, #20a040)',
        boxShadow: '0 0 10px rgba(40,200,80,0.8)',
        border: '1.5px solid rgba(255,255,255,0.5)',
        flexShrink: 0,
      }}
    />
  );
}

/* ─── Sweeping golden shine ───────────────────────────────────────── */
function SweepingShine() {
  return (
    <motion.div
      animate={{ x: ['-160%', '260%'] }}
      transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 4, ease: 'easeInOut' }}
      style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.45) 50%, transparent 70%)',
        borderRadius: 'inherit',
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    />
  );
}
