/**
 * WorldSelectionScreen — Page 3 Cinematic + Interactive World Map
 *
 * Hotspot alignment strategy:
 *   The video renders with objectFit:"cover" inside the full-screen container.
 *   We track the container size via ResizeObserver and compute the exact
 *   object-fit:cover scale + offset so that each hotspot's centre maps
 *   precisely to its pixel coordinate in the native 1920×1080 video frame.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, GameMode } from '../../store/gameStore';
import { useSoundManager } from '../../hooks/useSoundManager';
import { useSettingsStore } from '../../store/settingsStore';

/* ─── Native video dimensions ───────────────────────────────────────── */
const VID_W = 1920;
const VID_H = 1080;

/* ─── Destination definitions in native video pixel space ───────────── */
interface DestDef {
  id: GameMode;
  name: string;
  sub: string;
  icon: string;
  /** X coordinate in native 1920×1080 video frame */
  vx: number;
  /** Y coordinate in native 1920×1080 video frame */
  vy: number;
  /** Radius in native video pixels */
  vr: number;
  hue: number;
  lives: number;
}

const DESTINATIONS: DestDef[] = [
  {
    id: 'classic',   name: 'Dojo Gate',       sub: '3 lives · bombs · escalating danger',
    icon: '⚔️',  vx: 405,  vy: 338, vr: 156, hue: 18,  lives: 3,
  },
  {
    id: 'zen',       name: 'Moon Shrine',      sub: 'No bombs · unlimited lives · pure bliss',
    icon: '🌸',  vx: 1125, vy: 338, vr: 156, hue: 155, lives: 99,
  },
  {
    id: 'arcade',    name: 'Bamboo Grove',     sub: 'Endless waves · fast & furious',
    icon: '⚡',  vx: 809,  vy: 614, vr: 156, hue: 90,  lives: 3,
  },
  {
    id: 'challenge', name: 'Crimson Temple',   sub: '60 seconds · maximise your score',
    icon: '⏱️', vx: 377,  vy: 723, vr: 156, hue: 0,   lives: 3,
  },
  {
    id: 'survival',  name: 'Imperial Palace',  sub: '1 life · high bombs · survive!',
    icon: '💀',  vx: 1292, vy: 723, vr: 156, hue: 45,  lives: 1,
  },
];

/* ─── Compute object-fit:cover layout ───────────────────────────────── */
interface CoverLayout {
  scale: number;
  offsetX: number;  // px left edge of rendered video inside container
  offsetY: number;  // px top edge
}

function computeCoverLayout(cw: number, ch: number): CoverLayout {
  const scale  = Math.max(cw / VID_W, ch / VID_H);
  const rw     = VID_W * scale;
  const rh     = VID_H * scale;
  return { scale, offsetX: (cw - rw) / 2, offsetY: (ch - rh) / 2 };
}

/** Map a native video point → container pixel position */
function toContainer(vx: number, vy: number, layout: CoverLayout) {
  return {
    x: layout.offsetX + vx * layout.scale,
    y: layout.offsetY + vy * layout.scale,
  };
}

/* ─── Orbiting particles ─────────────────────────────────────────────── */
function Particles({ hue, active }: { hue: number; active: boolean }) {
  return (
    <>
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * 360;
        const r     = 68 + (i % 3) * 14;
        const sz    = 3 + (i % 3);
        const dur   = 2.8 + (i % 4) * 0.5;
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

/* ─── Single hotspot ─────────────────────────────────────────────────── */
function Hotspot({
  dest, layout, debug, disabled, selected, faded, onHover, onLeave, onClick,
}: {
  dest: DestDef;
  layout: CoverLayout;
  debug: boolean;
  disabled: boolean;
  selected: boolean;
  faded: boolean;
  onHover: () => void;
  onLeave: () => void;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const glow = hovered || selected;

  const { x, y } = toContainer(dest.vx, dest.vy, layout);
  const r = dest.vr * layout.scale;   // radius scaled to match rendered video
  const d = r * 2;

  const handleEnter = () => { if (!disabled) { setHovered(true);  onHover(); } };
  const handleLeave = () => { if (!disabled) { setHovered(false); onLeave(); } };

  return (
    <motion.div
      animate={{ opacity: faded ? 0 : 1, scale: selected ? 1.3 : 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'absolute',
        /* centre exactly on the portal */
        left: x,
        top:  y,
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
          boxShadow: glow
            ? `0 0 28px 10px hsl(${dest.hue},75%,30%), 0 0 56px 20px hsl(${dest.hue},70%,15%)`
            : 'none',
          pointerEvents: 'none',
          transition: 'inset 0.3s ease, box-shadow 0.35s ease',
        }}
      />

      {/* Click area — transparent in production, red-tinted in debug */}
      <div style={{
        position: 'absolute', inset: 0,
        borderRadius: '50%',
        background: debug ? 'rgba(255,0,0,0.28)' : 'transparent',
        outline: (debug || glow) ? `2px solid hsla(${dest.hue},90%,65%,0.6)` : 'none',
      }} />

      {/* Debug label */}
      {debug && (
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          textAlign: 'center',
          fontFamily: 'monospace',
          fontSize: 10,
          color: '#fff',
          textShadow: '0 0 4px #000, 0 0 4px #000',
          lineHeight: 1.4,
        }}>
          <div style={{ fontWeight: 700 }}>{dest.name}</div>
          <div>x:{Math.round(x)} y:{Math.round(y)}</div>
          <div>r:{Math.round(r)}px</div>
        </div>
      )}

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

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef     = useRef<HTMLVideoElement>(null);
  const audioCtxRef  = useRef<AudioContext | null>(null);

  const [phase,  setPhase]  = useState<Phase>('playing');
  const [chosen, setChosen] = useState<GameMode | null>(null);
  const [debug,  setDebug]  = useState(false);

  /* ── Track container size → cover layout ── */
  const [layout, setLayout] = useState<CoverLayout>({ scale: 1, offsetX: 0, offsetY: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setLayout(computeCoverLayout(el.clientWidth, el.clientHeight));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
      const osc  = ctx.createOscillator();
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
  const handleSelect = useCallback((dest: DestDef) => {
    if (phase !== 'interactive') return;
    playClick();
    setChosen(dest.id);
    setPhase('selecting');
    setTimeout(() => {
      setPhase('exiting');
      setTimeout(() => {
        setMode(dest.id);
        resetGame();
        setLives(dest.lives);
        setScreen('game');
      }, 700);
    }, 800);
  }, [phase, playClick, setMode, resetGame, setLives, setScreen]);

  /* Vignette origin for selected destination */
  const vignettePos = (() => {
    if (!chosen) return '50% 50%';
    const d = DESTINATIONS.find(x => x.id === chosen)!;
    const { x, y } = toContainer(d.vx, d.vy, layout);
    const cw = containerRef.current?.clientWidth  || 1;
    const ch = containerRef.current?.clientHeight || 1;
    return `${(x / cw * 100).toFixed(1)}% ${(y / ch * 100).toFixed(1)}%`;
  })();

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#000' }}
    >
      {/* ══ 1. Video ══════════════════════════════════════════════════ */}
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

      {/* ══ 2. Hotspots — aligned to computed cover layout ════════════ */}
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
              <Hotspot
                key={dest.id}
                dest={dest}
                layout={layout}
                debug={debug}
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

      {/* ══ 4. Debug toggle ═══════════════════════════════════════════ */}
      <button
        onClick={() => setDebug(v => !v)}
        style={{
          position: 'absolute', top: 12, right: 12, zIndex: 100,
          padding: '5px 12px',
          fontFamily: 'monospace', fontSize: 11,
          background: debug ? 'rgba(255,60,60,0.85)' : 'rgba(0,0,0,0.55)',
          color: '#fff',
          border: `1px solid ${debug ? '#ff4444' : 'rgba(255,255,255,0.2)'}`,
          borderRadius: 6,
          cursor: 'pointer',
          backdropFilter: 'blur(4px)',
          transition: 'all 0.2s',
        }}
      >
        {debug ? '🔴 Debug ON' : '⚫ Debug OFF'}
      </button>

      {/* ══ 5. Directional vignette on selection ══════════════════════ */}
      <AnimatePresence>
        {phase === 'selecting' && chosen && (
          <motion.div
            key="vignette"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              position: 'absolute', inset: 0, zIndex: 20,
              background: `radial-gradient(ellipse 50% 50% at ${vignettePos}, transparent 5%, rgba(0,0,0,0.8) 100%)`,
              pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>

      {/* ══ 6. Fade to black ══════════════════════════════════════════ */}
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
