/**
 * WorldSelectionScreen — Page 3 Cinematic + Interactive World Map
 *
 * Flow:
 *   1. Video plays fullscreen, no interaction allowed
 *   2. Video reaches final frame → pauses on last frame
 *   3. Five circular hit-zones activate over the frozen frame at exact positions
 *   4. Hover → glow / ring / particles / tooltip / bell tone
 *   5. Click → vignette zoom → fade to black → game starts in chosen mode
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, GameMode } from '../../store/gameStore';
import { useSoundManager } from '../../hooks/useSoundManager';
import { useSettingsStore } from '../../store/settingsStore';

/* ─── Destination definitions — positions match the video frame exactly ─ */
interface Destination {
  id: GameMode;
  name: string;
  sub: string;
  icon: string;
  cx: string;   // % from left (matches video)
  cy: string;   // % from top  (matches video)
  radius: number; // px — clickable circle radius
  hue: number;
  lives: number;  // lives to set for this mode
}

const DESTINATIONS: Destination[] = [
  {
    id: 'classic', name: 'Dojo Gate', sub: '3 lives · bombs · escalating danger',
    icon: '⚔️',  cx: '33.3%', cy: '30.1%', radius: 120, hue: 18,  lives: 3,
  },
  {
    id: 'zen', name: 'Moon Shrine', sub: 'No bombs · unlimited lives · pure bliss',
    icon: '🌸',  cx: '67.7%', cy: '30.6%', radius: 120, hue: 155, lives: 99,
  },
  {
    id: 'arcade', name: 'Bamboo Grove', sub: 'Endless waves · fast & furious',
    icon: '⚡',  cx: '50.8%', cy: '62.5%', radius: 120, hue: 90,  lives: 3,
  },
  {
    id: 'challenge', name: 'Crimson Temple', sub: '60 seconds · maximise your score',
    icon: '⏱️', cx: '27.1%', cy: '75.5%', radius: 120, hue: 0,   lives: 3,
  },
  {
    id: 'survival', name: 'Imperial Palace', sub: '1 life · high bombs · survive!',
    icon: '💀',  cx: '78.4%', cy: '75.5%', radius: 120, hue: 45,  lives: 1,
  },
];

/* ─── Orbiting particles ─────────────────────────────────────────────── */
function Particles({ hue, active }: { hue: number; active: boolean }) {
  return (
    <>
      {Array.from({ length: 12 }, (_, i) => {
        const angle  = (i / 12) * 360;
        const r      = 68 + (i % 3) * 14;
        const sz     = 3 + (i % 3);
        const dur    = 2.8 + (i % 4) * 0.5;
        return (
          <motion.div
            key={i}
            animate={active ? { opacity: [0.3, 1, 0.3], scale: [0.7, 1.4, 0.7] } : { opacity: 0 }}
            transition={{ duration: dur, delay: (i / 12) * dur, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              top: '50%', left: '50%',
              width: sz, height: sz,
              marginTop: -sz / 2, marginLeft: -sz / 2,
              borderRadius: '50%',
              background: `hsl(${hue},90%,72%)`,
              boxShadow: `0 0 6px hsl(${hue},90%,65%)`,
              transformOrigin: '0 0',
              transform: `rotate(${angle}deg) translate(${r}px,0)`,
              pointerEvents: 'none',
            }}
          />
        );
      })}
    </>
  );
}

/* ─── Single destination ─────────────────────────────────────────────── */
function DestCircle({
  dest, disabled, selected, faded, onHover, onLeave, onClick,
}: {
  dest: Destination;
  disabled: boolean;
  selected: boolean;
  faded: boolean;
  onHover: () => void;
  onLeave: () => void;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const glow = hovered || selected;
  const d = dest.radius * 2; // diameter px

  const handleEnter = () => { if (!disabled) { setHovered(true);  onHover(); } };
  const handleLeave = () => { if (!disabled) { setHovered(false); onLeave(); } };

  return (
    <motion.div
      animate={{ opacity: faded ? 0 : 1, scale: selected ? 1.3 : 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'absolute',
        left: dest.cx,
        top:  dest.cy,
        width:  d,
        height: d,
        transform: 'translate(-50%, -50%)',
        cursor: disabled ? 'default' : 'pointer',
        userSelect: 'none',
      }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onClick={() => { if (!disabled) onClick(); }}
    >
      {/* Outer pulsing ring */}
      <motion.div
        animate={{
          scale:   glow ? [1, 1.12, 1] : [1, 1.04, 1],
          opacity: glow ? [0.85, 1, 0.85] : [0.3, 0.45, 0.3],
        }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          inset: glow ? -16 : -8,
          borderRadius: '50%',
          border: `2px solid hsl(${dest.hue},80%,65%)`,
          boxShadow: glow ? `0 0 28px 10px hsl(${dest.hue},75%,30%), 0 0 56px 20px hsl(${dest.hue},70%,15%)` : 'none',
          pointerEvents: 'none',
          transition: 'inset 0.3s ease, box-shadow 0.35s ease',
        }}
      />

      {/* Fully transparent click area — the video IS the visual */}
      <div style={{
        position: 'absolute', inset: 0,
        borderRadius: '50%',
        background: 'transparent',
        /* Debug outline — remove once positions confirmed */
        outline: glow ? `2px solid hsla(${dest.hue},90%,65%,0.6)` : 'none',
      }} />

      {/* Particles */}
      <Particles hue={dest.hue} active={glow} />

      {/* Tooltip */}
      <AnimatePresence>
        {hovered && !selected && (
          <motion.div
            key="tip"
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{   opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute',
              bottom: `calc(100% + 16px)`,
              left: '50%', transform: 'translateX(-50%)',
              background: 'linear-gradient(135deg,rgba(8,4,18,0.97),rgba(18,8,36,0.97))',
              border: `1px solid hsl(${dest.hue},70%,42%)`,
              borderRadius: 10,
              padding: '10px 18px',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex: 60,
              boxShadow: `0 6px 28px rgba(0,0,0,0.7), 0 0 14px hsl(${dest.hue},60%,18%)`,
            }}
          >
            <div style={{
              fontFamily: 'Georgia,serif', fontWeight: 700,
              fontSize: 15, letterSpacing: 1,
              color: `hsl(${dest.hue},85%,78%)`,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span>{dest.icon}</span> {dest.name}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4, fontFamily: 'sans-serif' }}>
              {dest.sub}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Main component
═══════════════════════════════════════════════════════════════════════ */
type Phase = 'playing' | 'interactive' | 'selecting' | 'exiting';

export default function WorldSelectionScreen() {
  const { setScreen, setMode, setLives, resetGame } = useGameStore();
  const { playClick }   = useSoundManager();
  const { soundVolume } = useSettingsStore();

  const videoRef    = useRef<HTMLVideoElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const [phase,  setPhase]  = useState<Phase>('playing');
  const [chosen, setChosen] = useState<GameMode | null>(null);

  /* ── Temple bell chord ── */
  const playBell = useCallback(() => {
    const vol = soundVolume / 100;
    if (vol <= 0) return;
    if (!audioCtxRef.current) {
      const C = window.AudioContext || (window as any).webkitAudioContext;
      if (C) audioCtxRef.current = new C();
    }
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    [523, 659, 784].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t0 = ctx.currentTime + i * 0.07;
      gain.gain.setValueAtTime(vol * 0.14, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 1.1);
      osc.start(t0); osc.stop(t0 + 1.15);
    });
  }, [soundVolume]);

  /* ── Clean up AudioContext ── */
  useEffect(() => () => { audioCtxRef.current?.close(); audioCtxRef.current = null; }, []);

  /* ── Autoplay ── */
  useEffect(() => { videoRef.current?.play().catch(() => {}); }, []);

  /* ── Video ended → freeze on last frame ── */
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const onEnded = () => { vid.pause(); setPhase('interactive'); };
    vid.addEventListener('ended', onEnded);
    return () => vid.removeEventListener('ended', onEnded);
  }, []);

  /* ── Destination selected ── */
  const handleSelect = useCallback((dest: Destination) => {
    if (phase !== 'interactive') return;
    playClick();
    setChosen(dest.id);
    setPhase('selecting');
    setTimeout(() => {
      setPhase('exiting');
      setTimeout(() => {
        setMode(dest.id);
        resetGame();
        setLives(dest.lives);   // apply mode-specific lives AFTER resetGame
        setScreen('game');
      }, 700);
    }, 800);
  }, [phase, playClick, setMode, resetGame, setLives, setScreen]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#000' }}>

      {/* ══ 1. Video — stays as frozen last frame after ended ══════════ */}
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

      {/* ══ 2. Destination circles ════════════════════════════════════ */}
      <AnimatePresence>
        {phase !== 'playing' && (
          <motion.div
            key="circles"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{   opacity: 0 }}
            transition={{ duration: 0.8 }}
            style={{
              position: 'absolute', inset: 0,
              pointerEvents: phase === 'interactive' ? 'auto' : 'none',
            }}
          >
            {DESTINATIONS.map(dest => (
              <DestCircle
                key={dest.id}
                dest={dest}
                disabled={phase !== 'interactive'}
                selected={chosen === dest.id}
                faded={chosen !== null && chosen !== dest.id}
                onHover={playBell}
                onLeave={() => {}}
                onClick={() => handleSelect(dest)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ 3. "Choose your world" hint ═══════════════════════════════ */}
      <AnimatePresence>
        {phase === 'interactive' && (
          <motion.p
            key="hint"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1,  y: 0  }}
            exit={{   opacity: 0         }}
            transition={{ duration: 0.6, delay: 0.6 }}
            style={{
              position: 'absolute', bottom: '3%',
              left: 0, right: 0, margin: 0,
              textAlign: 'center',
              fontFamily: 'Georgia,serif',
              fontSize: 12, letterSpacing: 5,
              textTransform: 'uppercase',
              color: 'rgba(255,220,150,0.5)',
              pointerEvents: 'none', zIndex: 10,
            }}
          >
            Choose your world
          </motion.p>
        )}
      </AnimatePresence>

      {/* ══ 4. Directional vignette on selection ══════════════════════ */}
      <AnimatePresence>
        {phase === 'selecting' && chosen && (() => {
          const d = DESTINATIONS.find(x => x.id === chosen)!;
          return (
            <motion.div
              key="vignette"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                position: 'absolute', inset: 0, zIndex: 20,
                background: `radial-gradient(ellipse 50% 50% at ${d.cx} ${d.cy}, transparent 5%, rgba(0,0,0,0.8) 100%)`,
                pointerEvents: 'none',
              }}
            />
          );
        })()}
      </AnimatePresence>

      {/* ══ 5. Fade to black ══════════════════════════════════════════ */}
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
