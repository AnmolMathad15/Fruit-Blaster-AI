/**
 * BambooGroveIntroScreen
 *
 * Plays the Bamboo Grove cinematic. On the final frame an "Enter the Grove"
 * button fades in. Clicking it starts the arcade-mode game.
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';

export default function BambooGroveIntroScreen() {
  const { setScreen, setMode, setLives, resetGame } = useGameStore();

  const videoRef  = useRef<HTMLVideoElement>(null);
  const [ended,   setEnded]   = useState(false);
  const [exiting, setExiting] = useState(false);

  /* autoplay */
  useEffect(() => { videoRef.current?.play().catch(() => {}); }, []);

  /* freeze on last frame */
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const onEnded = () => { vid.pause(); setEnded(true); };
    vid.addEventListener('ended', onEnded);
    return () => vid.removeEventListener('ended', onEnded);
  }, []);

  const enterGrove = () => {
    if (exiting) return;
    setExiting(true);
    setTimeout(() => {
      setMode('arcade');
      resetGame();
      setLives(3);
      setScreen('game');
    }, 700);
  };

  return (
    <div style={{
      width: '100%', height: '100%',
      position: 'relative', overflow: 'hidden', background: '#000',
    }}>

      {/* ── Cinematic video ── */}
      <video
        ref={videoRef}
        src={`${import.meta.env.BASE_URL}bamboo-grove-cinematic.mp4`}
        playsInline
        preload="auto"
        disablePictureInPicture
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          pointerEvents: 'none',
        }}
        controlsList="nodownload nofullscreen noremoteplayback"
        onContextMenu={e => e.preventDefault()}
      />

      {/* ── "Enter the Grove" button — appears on last frame ── */}
      <AnimatePresence>
        {ended && !exiting && (
          <motion.div
            key="cta"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'absolute',
              bottom: '12%',
              left: 0, right: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
              pointerEvents: 'auto',
            }}
          >
            <motion.button
              onClick={enterGrove}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.97 }}
              style={{
                padding: '16px 52px',
                fontFamily: 'Georgia, serif',
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: 3,
                textTransform: 'uppercase',
                color: '#d4f5c0',
                background: 'linear-gradient(135deg, rgba(20,60,20,0.92), rgba(10,40,10,0.97))',
                border: '2px solid rgba(120,220,80,0.7)',
                borderRadius: 14,
                cursor: 'pointer',
                boxShadow: [
                  '0 0 32px rgba(80,200,60,0.45)',
                  '0 0 64px rgba(40,140,20,0.25)',
                  'inset 0 1px 0 rgba(180,255,120,0.15)',
                ].join(','),
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* shimmer sweep */}
              <motion.div
                animate={{ x: ['-120%', '220%'] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1 }}
                style={{
                  position: 'absolute', top: 0, left: 0,
                  width: '50%', height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(180,255,120,0.18), transparent)',
                  pointerEvents: 'none',
                }}
              />
              🎋 Enter the Grove
            </motion.button>

            {/* subtle sub-label */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.55 }}
              transition={{ delay: 0.4 }}
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: 11,
                letterSpacing: 4,
                textTransform: 'uppercase',
                color: 'rgba(160,230,120,0.7)',
                margin: 0,
                pointerEvents: 'none',
              }}
            >
              Arcade Mode · Endless Waves
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Fade-to-black on exit ── */}
      <AnimatePresence>
        {exiting && (
          <motion.div
            key="fadeout"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
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
