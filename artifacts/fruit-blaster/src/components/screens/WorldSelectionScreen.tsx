/**
 * WorldSelectionScreen — Page 3 Cinematic
 *
 * Flow:
 *   1. Video plays fullscreen, no interaction
 *   2. Video ends → pauses on final frame (frozen background)
 *   3. Final frame IS the interactive world map — tap zones added here once positions are known
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, GameMode } from '../../store/gameStore';
import { useSoundManager } from '../../hooks/useSoundManager';

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

  /* ── Video ended → pause on last frame ── */
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const onEnded = () => { vid.pause(); setPhase('interactive'); };
    vid.addEventListener('ended', onEnded);
    return () => vid.removeEventListener('ended', onEnded);
  }, []);

  /* ── Navigate to a mode ── */
  const goToMode = (mode: GameMode) => {
    if (phase !== 'interactive') return;
    playClick();
    setPhase('exiting');
    setTimeout(() => { setMode(mode); resetGame(); setScreen('game'); }, 700);
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#000' }}>

      {/* ══ 1. Cinematic video — freezes on last frame ════════════════ */}
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

      {/* ══ 2. Tap zones go here — add once video positions are known ═ */}
      {/*
          Example invisible hit-zone (uncomment + position to match video):

          {phase === 'interactive' && (
            <div
              onClick={() => goToMode('classic')}
              style={{ position: 'absolute', left: '20%', top: '45%',
                       width: 120, height: 120, borderRadius: '50%',
                       cursor: 'pointer', background: 'transparent' }}
            />
          )}
      */}

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
