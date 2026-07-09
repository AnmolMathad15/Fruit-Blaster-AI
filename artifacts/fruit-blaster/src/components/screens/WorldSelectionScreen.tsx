/**
 * WorldSelectionScreen — Page 3 Cinematic + Interactive World Map
 *
 * Flow:
 *   1. Video plays fullscreen, no interaction allowed
 *   2. Video reaches final frame → pauses (stays visible as background)
 *   3. Four destination circles fade in over the frozen frame
 *   4. Hover → glow / ring / particles / tooltip / bell tone
 *   5. Click → zoom toward chosen kingdom → fade to black → game starts
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, GameMode } from '../../store/gameStore';
import { useSoundManager } from '../../hooks/useSoundManager';
import { useSettingsStore } from '../../store/settingsStore';

/* ─── Destination definitions ─────────────────────────────────────────
   cx/cy are % of screen width/height — adjust to match the video frame.  */
interface Destination {
  id: GameMode;
  label: string;
  sub: string;
  icon: string;
  cx: number; // % from left
  cy: number; // % from top
  hue: number; // glow colour
}

const DESTINATIONS: Destination[] = [
  { id: 'classic',   label: 'Classic Kingdom',  sub: '3 lives · bombs · escalating danger',     icon: '⚔️',  cx: 22, cy: 48, hue: 18  },
  { id: 'zen',       label: 'Zen Sanctuary',     sub: 'No bombs · unlimited lives · pure bliss',  icon: '🌸',  cx: 42, cy: 32, hue: 155 },
  { id: 'arcade',    label: 'Arcade Citadel',    sub: 'Endless waves · fast & furious',           icon: '⚡',  cx: 70, cy: 44, hue: 270 },
  { id: 'challenge', label: 'Challenge Spire',   sub: '60 seconds · maximise your score',         icon: '⏱️', cx: 55, cy: 68, hue: 210 },
];

/* ─── Orbiting particles around a destination ────────────────────────── */
function Particles({ hue, active }: { hue: number; active: boolean }) {
  return (
    <>
      {Array.from({ length: 10 }, (_, i) => {
        const angle  = (i / 10) * 360;
        const radius = 52 + (i % 3) * 12;
        const size   = 3 + (i % 3);
        const dur    = 3 + (i % 4) * 0.6;
        const delay  = (i / 10) * dur;
        return (
          <motion.div
            key={i}
            animate={active ? {
              rotate: [angle, angle + 360],
              opacity: [0.4, 0.9, 0.4],
              scale:   [0.8, 1.3, 0.8],
            } : { opacity: 0 }}
            transition={{ duration: dur, delay, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute',
              top: '50%', left: '50%',
              width: size, height: size,
              marginTop: -size / 2, marginLeft: -size / 2,
              borderRadius: '50%',
              background: `hsl(${hue},90%,75%)`,
              boxShadow:  `0 0 6px hsl(${hue},90%,65%)`,
              transformOrigin: '0 0',
              transform: `rotate(${angle}deg) translate(${radius}px, 0)`,
              pointerEvents: 'none',
            }}
          />
        );
      })}
    </>
  );
}

/* ─── Single destination circle ──────────────────────────────────────── */
function DestCircle({
  dest, disabled, selected, others, onHover, onLeave, onClick,
}: {
  dest: Destination;
  disabled: boolean;
  selected: boolean;
  others: boolean;
  onHover: () => void;
  onLeave: () => void;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  const handleEnter = () => { if (!disabled) { setHovered(true);  onHover(); } };
  const handleLeave = () => { if (!disabled) { setHovered(false); onLeave(); } };

  const glow   = hovered || selected;
  const ringInset = glow ? -(68 - 50) : -(52 - 50);

  return (
    <motion.div
      animate={{
        opacity: others ? 0 : 1,
        scale:   selected ? 1.35 : 1,
        filter:  glow
          ? `drop-shadow(0 0 32px hsl(${dest.hue},90%,60%))`
          : 'none',
      }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'absolute',
        left: `${dest.cx}%`,
        top:  `${dest.cy}%`,
        transform: 'translate(-50%, -50%)',
        width: 100, height: 100,
        cursor: disabled ? 'default' : 'pointer',
        userSelect: 'none',
      }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onClick={() => { if (!disabled) onClick(); }}
    >
      {/* Pulsing outer ring */}
      <motion.div
        animate={{
          scale:   glow ? [1, 1.15, 1] : [1, 1.05, 1],
          opacity: glow ? [0.8, 1,    0.8] : [0.4, 0.55, 0.4],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          inset: ringInset,
          borderRadius: '50%',
          border: `2px solid hsl(${dest.hue},80%,65%)`,
          boxShadow: glow ? `0 0 24px 8px hsl(${dest.hue},80%,30%)` : 'none',
          pointerEvents: 'none',
          transition: 'inset 0.3s ease, box-shadow 0.3s ease',
        }}
      />

      {/* Inner glowing circle */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: `radial-gradient(circle at 38% 36%,
          hsl(${dest.hue},60%,80%) 0%,
          hsl(${dest.hue},80%,30%) 55%,
          hsl(${dest.hue},90%,10%) 100%)`,
        border: `2px solid hsl(${dest.hue},80%,60%)`,
        boxShadow: glow
          ? `inset 0 0 28px hsl(${dest.hue},80%,50%), 0 0 40px hsl(${dest.hue},80%,30%)`
          : `inset 0 0 12px hsl(${dest.hue},60%,30%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 36,
        transition: 'box-shadow 0.3s ease',
      }}>
        {dest.icon}
      </div>

      {/* Orbiting particles */}
      <Particles hue={dest.hue} active={hovered || selected} />

      {/* Tooltip */}
      <AnimatePresence>
        {hovered && !selected && (
          <motion.div
            key="tip"
            initial={{ opacity: 0, y: 8,  scale: 0.92 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{   opacity: 0, y: 4,  scale: 0.95 }}
            transition={{ duration: 0.22 }}
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 14px)',
              left: '50%', transform: 'translateX(-50%)',
              background: 'linear-gradient(135deg,rgba(10,6,20,0.97),rgba(20,10,40,0.97))',
              border: `1px solid hsl(${dest.hue},70%,45%)`,
              borderRadius: 10,
              padding: '10px 16px',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex: 50,
              boxShadow: `0 4px 24px rgba(0,0,0,0.6), 0 0 12px hsl(${dest.hue},60%,20%)`,
            }}
          >
            <div style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: 14, color: `hsl(${dest.hue},80%,80%)`, letterSpacing: 1 }}>
              {dest.label}
            </div>
            <div style={{ fontFamily: 'sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 3 }}>
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
  const { setScreen, setMode, resetGame } = useGameStore();
  const { playClick }  = useSoundManager();
  const { soundVolume } = useSettingsStore();

  const videoRef   = useRef<HTMLVideoElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const [phase,  setPhase]  = useState<Phase>('playing');
  const [chosen, setChosen] = useState<GameMode | null>(null);

  /* ── Bell tone (temple chord) ── */
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
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t0 = ctx.currentTime + i * 0.07;
      gain.gain.setValueAtTime(vol * 0.15, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 1.1);
      osc.start(t0); osc.stop(t0 + 1.1);
    });
  }, [soundVolume]);

  /* ── Clean up AudioContext on unmount ── */
  useEffect(() => () => {
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
  }, []);

  /* ── Autoplay ── */
  useEffect(() => {
    videoRef.current?.play().catch(() => {});
  }, []);

  /* ── Video ended → pause on last frame, show circles ── */
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const onEnded = () => { vid.pause(); setPhase('interactive'); };
    vid.addEventListener('ended', onEnded);
    return () => vid.removeEventListener('ended', onEnded);
  }, []);

  /* ── Destination selected ── */
  const handleSelect = useCallback((mode: GameMode) => {
    if (phase !== 'interactive') return;
    playClick();
    setChosen(mode);
    setPhase('selecting');
    setTimeout(() => {
      setPhase('exiting');
      setTimeout(() => { setMode(mode); resetGame(); setScreen('game'); }, 700);
    }, 800);
  }, [phase, playClick, setMode, resetGame, setScreen]);

  const isDisabled = phase !== 'interactive';

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#000' }}>

      {/* ══ 1. Cinematic video — frozen on last frame after playback ═══ */}
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

      {/* ══ 2. Destination circles (fade in once interactive) ══════════ */}
      <AnimatePresence>
        {phase !== 'playing' && (
          <motion.div
            key="circles"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{   opacity: 0 }}
            transition={{ duration: 0.7 }}
            style={{
              position: 'absolute', inset: 0,
              pointerEvents: phase === 'interactive' ? 'auto' : 'none',
            }}
          >
            {DESTINATIONS.map(dest => (
              <DestCircle
                key={dest.id}
                dest={dest}
                disabled={isDisabled}
                selected={chosen === dest.id}
                others={chosen !== null && chosen !== dest.id}
                onHover={playBell}
                onLeave={() => {}}
                onClick={() => handleSelect(dest.id)}
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
            animate={{ opacity: 1, y: 0  }}
            exit={{   opacity: 0         }}
            transition={{ duration: 0.6, delay: 0.5 }}
            style={{
              position: 'absolute',
              bottom: '5%', left: 0, right: 0,
              textAlign: 'center',
              fontFamily: 'Georgia,serif',
              fontSize: 13,
              letterSpacing: 4,
              textTransform: 'uppercase',
              color: 'rgba(255,220,160,0.55)',
              pointerEvents: 'none',
              zIndex: 10,
              margin: 0,
            }}
          >
            Choose your world
          </motion.p>
        )}
      </AnimatePresence>

      {/* ══ 4. Selection vignette (zooms toward chosen kingdom) ═══════ */}
      <AnimatePresence>
        {phase === 'selecting' && chosen && (() => {
          const d = DESTINATIONS.find(x => x.id === chosen)!;
          return (
            <motion.div
              key="vignette"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1  }}
              style={{
                position: 'absolute', inset: 0,
                background: `radial-gradient(ellipse 55% 55% at ${d.cx}% ${d.cy}%, transparent 5%, rgba(0,0,0,0.75) 100%)`,
                pointerEvents: 'none', zIndex: 20,
              }}
            />
          );
        })()}
      </AnimatePresence>

      {/* ══ 5. Fade-to-black exit ═════════════════════════════════════ */}
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
