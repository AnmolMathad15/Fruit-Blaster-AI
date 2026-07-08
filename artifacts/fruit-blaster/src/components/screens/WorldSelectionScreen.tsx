/**
 * WorldSelectionScreen — Page 3 Cinematic + World Map
 *
 * Flow:
 *   1. Video plays fullscreen, no interaction
 *   2. Video ends → pauses on final frame (becomes the world map)
 *   3. Five invisible tap zones activate over the video's destination markers
 *   4. Tap a destination → fade to black → game starts in that mode
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, GameMode } from '../../store/gameStore';
import { useSoundManager } from '../../hooks/useSoundManager';

/* ─── Destination tap zones (x/y are normalised 0–1 of screen size) ── */
const DESTINATIONS: { name: string; x: number; y: number; mode: GameMode }[] = [
  { name: 'Dojo Gate',       x: 0.365, y: 0.398, mode: 'classic'   },
  { name: 'Moon Shrine',     x: 0.714, y: 0.380, mode: 'zen'        },
  { name: 'Bamboo Grove',    x: 0.557, y: 0.602, mode: 'arcade'     },
  { name: 'Crimson Temple',  x: 0.339, y: 0.759, mode: 'challenge'  },
  { name: 'Imperial Palace', x: 0.771, y: 0.769, mode: 'classic'    },
];

/** Radius of each tap zone in % of viewport width */
const HIT_RADIUS_VW = 6;

type Phase = 'playing' | 'interactive' | 'exiting';

export default function WorldSelectionScreen() {
  const { setScreen, setMode, resetGame } = useGameStore();
  const { playClick } = useSoundManager();

  const videoRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<Phase>('playing');

  /* ── Autoplay ── */
  useEffect(() => {
    videoRef.current?.play().catch(() => {});
  }, []);

  /* ── Video ended → pause on final frame ── */
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const onEnded = () => { vid.pause(); setPhase('interactive'); };
    vid.addEventListener('ended', onEnded);
    return () => vid.removeEventListener('ended', onEnded);
  }, []);

  /* ── Select a destination ── */
  const handleSelect = (mode: GameMode) => {
    if (phase !== 'interactive') return;
    playClick();
    setPhase('exiting');
    setTimeout(() => { setMode(mode); resetGame(); setScreen('game'); }, 700);
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#000' }}>

      {/* ══ 1. Cinematic video — freezes on final frame ═══════════════ */}
      <video
        ref={videoRef}
        src={`${import.meta.env.BASE_URL}page3-cinematic.mp4`}
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

      {/* ══ 2. Invisible tap zones (active on final frozen frame) ═════ */}
      {phase === 'interactive' && DESTINATIONS.map(dest => (
        <div
          key={dest.name}
          onClick={() => handleSelect(dest.mode)}
          title={dest.name}
          style={{
            position: 'absolute',
            left:   `${dest.x * 100}%`,
            top:    `${dest.y * 100}%`,
            width:  `${HIT_RADIUS_VW * 2}vw`,
            height: `${HIT_RADIUS_VW * 2}vw`,
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            background: 'transparent',
            cursor: 'pointer',
            zIndex: 20,
          }}
        />
      ))}

      {/* ══ 3. Fade-to-black exit ════════════════════════════════════ */}
      <AnimatePresence>
        {phase === 'exiting' && (
          <motion.div
            key="fadeout"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, ease: 'easeIn' }}
            style={{ position: 'absolute', inset: 0, background: '#000', zIndex: 40, pointerEvents: 'none' }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
