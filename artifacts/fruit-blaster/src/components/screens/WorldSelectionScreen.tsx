/**
 * WorldSelectionScreen — Page 3 Cinematic + Interactive World Map
 *
 * Hotspot alignment:
 *   objectFit:"cover" layout is computed via ResizeObserver so every hotspot
 *   tracks its native 1920×1080 video coordinate at any screen size.
 *
 * Debug / Calibration mode (top-right toggle):
 *   • Red overlay shows each clickable area.
 *   • Each circle is DRAGGABLE — drag it onto the portal, release.
 *   • A side panel shows the live vx/vy values ready to hard-code.
 *   • "Copy" button puts the full DESTINATIONS block on the clipboard.
 */

import {
  useEffect, useRef, useState, useCallback, useReducer,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, GameMode } from '../../store/gameStore';
import { useSoundManager } from '../../hooks/useSoundManager';
import { useSettingsStore } from '../../store/settingsStore';

/* ─── Native video dimensions ───────────────────────────────────────── */
const VID_W = 1920;
const VID_H = 1080;

/* ─── Destination definitions (native 1920×1080 video pixel space) ─── */
interface DestDef {
  id: GameMode;
  name: string;
  sub: string;
  icon: string;
  vx: number;   // centre X in native video frame
  vy: number;   // centre Y in native video frame
  vr: number;   // radius in native video pixels
  hue: number;
  lives: number;
}

const BASE_DESTINATIONS: DestDef[] = [
  {
    id: 'classic',   name: 'Dojo Gate',      sub: '3 lives · bombs · escalating danger',
    icon: '⚔️',  vx: 462,  vy: 175, vr: 156, hue: 18,  lives: 3,
  },
  {
    id: 'zen',       name: 'Moon Shrine',     sub: 'No bombs · unlimited lives · pure bliss',
    icon: '🌸',  vx: 1165, vy: 177, vr: 156, hue: 155, lives: 99,
  },
  {
    id: 'arcade',    name: 'Bamboo Grove',    sub: 'Endless waves · fast & furious',
    icon: '⚡',  vx: 806,  vy: 532, vr: 156, hue: 90,  lives: 3,
  },
  {
    id: 'challenge', name: 'Crimson Temple',  sub: '60 seconds · maximise your score',
    icon: '⏱️', vx: 348,  vy: 650, vr: 156, hue: 0,   lives: 3,
  },
  {
    id: 'survival',  name: 'Imperial Palace', sub: '1 life · high bombs · survive!',
    icon: '💀',  vx: 1358, vy: 643, vr: 156, hue: 45,  lives: 1,
  },
];

/* ─── Cover-layout helpers ───────────────────────────────────────────── */
interface CoverLayout { scale: number; offsetX: number; offsetY: number; }

function computeCoverLayout(cw: number, ch: number): CoverLayout {
  const scale = Math.max(cw / VID_W, ch / VID_H);
  return {
    scale,
    offsetX: (cw - VID_W * scale) / 2,
    offsetY: (ch - VID_H * scale) / 2,
  };
}

/** native video → container px */
function toScreen(vx: number, vy: number, l: CoverLayout) {
  return { x: l.offsetX + vx * l.scale, y: l.offsetY + vy * l.scale };
}

/** container px → native video */
function toNative(sx: number, sy: number, l: CoverLayout) {
  return {
    vx: Math.round((sx - l.offsetX) / l.scale),
    vy: Math.round((sy - l.offsetY) / l.scale),
  };
}

/* ─── Drag-offset state ──────────────────────────────────────────────── */
type Offsets = Record<string, { dx: number; dy: number }>;

function initOffsets(): Offsets {
  return Object.fromEntries(BASE_DESTINATIONS.map(d => [d.id, { dx: 0, dy: 0 }]));
}

type OffsetAction =
  | { type: 'move'; id: string; dx: number; dy: number }
  | { type: 'reset' };

function offsetReducer(state: Offsets, action: OffsetAction): Offsets {
  if (action.type === 'reset') return initOffsets();
  return { ...state, [action.id]: { dx: action.dx, dy: action.dy } };
}

/* ─── Particles ──────────────────────────────────────────────────────── */
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
              position: 'absolute', top: '50%', left: '50%',
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
  dest, offset, layout, debug,
  disabled, selected, faded,
  onHover, onLeave, onClick,
  onDragDelta,
}: {
  dest: DestDef;
  offset: { dx: number; dy: number };
  layout: CoverLayout;
  debug: boolean;
  disabled: boolean;
  selected: boolean;
  faded: boolean;
  onHover: () => void;
  onLeave: () => void;
  onClick: () => void;
  onDragDelta: (dx: number, dy: number) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const dragging = useRef(false);
  const dragStart = useRef({ mx: 0, my: 0, dx: 0, dy: 0 });

  const glow = hovered || selected;

  const base = toScreen(dest.vx, dest.vy, layout);
  const sx   = base.x + offset.dx;
  const sy   = base.y + offset.dy;
  const r    = dest.vr * layout.scale;
  const d    = r * 2;

  /* live native coords for the debug panel */
  const live = toNative(sx, sy, layout);

  /* ── drag handlers (only active in debug mode) ── */
  const onMouseDown = (e: React.MouseEvent) => {
    if (!debug) return;
    e.preventDefault();
    dragging.current = true;
    dragStart.current = { mx: e.clientX, my: e.clientY, dx: offset.dx, dy: offset.dy };

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      onDragDelta(
        dragStart.current.dx + (ev.clientX - dragStart.current.mx),
        dragStart.current.dy + (ev.clientY - dragStart.current.my),
      );
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleEnter = () => { if (!disabled && !debug) { setHovered(true);  onHover(); } };
  const handleLeave = () => { if (!disabled && !debug) { setHovered(false); onLeave(); } };

  return (
    <motion.div
      animate={{ opacity: faded ? 0 : 1, scale: selected ? 1.3 : 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'absolute',
        left: sx, top: sy,
        width: d, height: d,
        transform: 'translate(-50%,-50%)',
        cursor: debug ? 'grab' : (disabled ? 'default' : 'pointer'),
        userSelect: 'none',
        zIndex: debug ? 50 : 'auto',
      }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onMouseDown={onMouseDown}
      onClick={() => { if (!disabled && !debug) onClick(); }}
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
          transition: 'inset 0.3s, box-shadow 0.35s',
        }}
      />

      {/* Click / debug area */}
      <div style={{
        position: 'absolute', inset: 0,
        borderRadius: '50%',
        background: debug ? 'rgba(255,30,30,0.28)' : 'transparent',
        border: debug ? '2px dashed rgba(255,80,80,0.7)' : 'none',
        outline: (!debug && glow) ? `2px solid hsla(${dest.hue},90%,65%,0.6)` : 'none',
        pointerEvents: 'none',
      }} />

      {/* Debug label */}
      {debug && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          pointerEvents: 'none', textAlign: 'center',
          fontFamily: 'monospace', fontSize: 10, lineHeight: 1.5,
          color: '#fff', textShadow: '0 0 4px #000,0 0 4px #000',
        }}>
          <div style={{ fontWeight: 700, fontSize: 11 }}>{dest.name}</div>
          <div>vx:{live.vx} vy:{live.vy}</div>
          <div>r:{Math.round(r)}px</div>
        </div>
      )}

      {/* Particles — hidden while dragging in debug */}
      {!debug && <Particles hue={dest.hue} active={glow} />}

      {/* Tooltip */}
      <AnimatePresence>
        {hovered && !selected && !debug && (
          <motion.div
            key="tip"
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 16px)',
              left: '50%', transform: 'translateX(-50%)',
              background: 'linear-gradient(135deg,rgba(8,4,18,0.97),rgba(18,8,36,0.97))',
              border: `1px solid hsl(${dest.hue},70%,42%)`,
              borderRadius: 10, padding: '10px 18px',
              whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 60,
              boxShadow: `0 6px 28px rgba(0,0,0,0.7),0 0 14px hsl(${dest.hue},60%,18%)`,
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
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
              {dest.sub}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Calibration panel ──────────────────────────────────────────────── */
function CalibPanel({
  dests, offsets, layout, onReset,
}: {
  dests: DestDef[];
  offsets: Offsets;
  layout: CoverLayout;
  onReset: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const lines = dests.map(d => {
    const base = toScreen(d.vx, d.vy, layout);
    const sx = base.x + offsets[d.id].dx;
    const sy = base.y + offsets[d.id].dy;
    const { vx, vy } = toNative(sx, sy, layout);
    return { ...d, vx, vy };
  });

  const codeBlock = [
    'const DESTINATIONS: DestDef[] = [',
    ...lines.map((d, i) => [
      `  {`,
      `    id: '${d.id}', name: '${d.name}', sub: '${d.sub}',`,
      `    icon: '${d.icon}', vx: ${d.vx}, vy: ${d.vy}, vr: ${d.vr}, hue: ${d.hue}, lives: ${d.lives},`,
      `  }${i < lines.length - 1 ? ',' : ''}`,
    ].join('\n')),
    '];',
  ].join('\n');

  const copy = () => {
    navigator.clipboard.writeText(codeBlock).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{
      position: 'absolute', top: 50, right: 12, zIndex: 200,
      background: 'rgba(0,0,0,0.88)',
      border: '1px solid rgba(255,80,80,0.4)',
      borderRadius: 10, padding: '12px 14px',
      fontFamily: 'monospace', fontSize: 11, color: '#fff',
      minWidth: 220,
      backdropFilter: 'blur(6px)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.7)',
      userSelect: 'none',
    }}>
      <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8, color: '#ff8080' }}>
        🎯 Drag circles onto portals
      </div>

      {lines.map(d => {
        const base = toScreen(d.vx, d.vy, layout);
        const sx = base.x + offsets[d.id].dx;
        const sy = base.y + offsets[d.id].dy;
        const live = toNative(sx, sy, layout);
        return (
          <div key={d.id} style={{
            marginBottom: 6, paddingBottom: 6,
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}>
            <span style={{ color: `hsl(${d.hue},80%,68%)`, fontWeight: 700 }}>
              {d.icon} {d.name}
            </span>
            <div style={{ color: '#aaa', marginTop: 2 }}>
              vx: <b style={{ color: '#fff' }}>{live.vx}</b>
              {'  '}vy: <b style={{ color: '#fff' }}>{live.vy}</b>
            </div>
          </div>
        );
      })}

      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <button onClick={copy} style={{
          flex: 1, padding: '5px 0',
          background: copied ? 'rgba(60,180,60,0.8)' : 'rgba(255,80,80,0.7)',
          border: 'none', borderRadius: 6, color: '#fff',
          fontFamily: 'monospace', fontSize: 11, cursor: 'pointer',
          fontWeight: 700,
        }}>
          {copied ? '✓ Copied!' : '📋 Copy coords'}
        </button>
        <button onClick={onReset} style={{
          padding: '5px 10px',
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 6, color: '#ccc',
          fontFamily: 'monospace', fontSize: 11, cursor: 'pointer',
        }}>
          ↺ Reset
        </button>
      </div>

      <div style={{ marginTop: 10, color: 'rgba(255,255,255,0.35)', fontSize: 10, lineHeight: 1.5 }}>
        Drag circles to align.<br />
        Copy → paste as new vx/vy.
      </div>
    </div>
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
  const [offsets, dispatch] = useReducer(offsetReducer, undefined, initOffsets);

  /* ── Cover layout tracker ── */
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

  /* ── Temple bell ── */
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
      osc.type = 'sine'; osc.frequency.value = freq;
      const t0 = ctx.currentTime + i * 0.07;
      gain.gain.setValueAtTime(vol * 0.14, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 1.1);
      osc.start(t0); osc.stop(t0 + 1.15);
    });
  }, [soundVolume]);

  useEffect(() => () => { audioCtxRef.current?.close(); audioCtxRef.current = null; }, []);

  /* ── Video ── */
  useEffect(() => { videoRef.current?.play().catch(() => {}); }, []);
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const onEnded = () => { vid.pause(); setPhase('interactive'); };
    vid.addEventListener('ended', onEnded);
    return () => vid.removeEventListener('ended', onEnded);
  }, []);

  /* ── Select ── */
  const handleSelect = useCallback((dest: DestDef) => {
    if (phase !== 'interactive') return;
    playClick();
    setChosen(dest.id);
    setPhase('selecting');
    setTimeout(() => {
      setPhase('exiting');
      setTimeout(() => {
        // Some worlds get their own cinematic intro before the game
        if (dest.id === 'classic') {
          setScreen('dojo-intro');
        } else if (dest.id === 'arcade') {
          setScreen('bamboo-intro');
        } else if (dest.id === 'challenge') {
          setScreen('crimson-intro');
        } else if (dest.id === 'survival') {
          setScreen('imperial-intro');
        } else {
          setMode(dest.id);
          resetGame();
          setLives(dest.lives);
          setScreen('game');
        }
      }, 700);
    }, 800);
  }, [phase, playClick, setMode, resetGame, setLives, setScreen]);

  /* Vignette origin */
  const vignettePos = (() => {
    if (!chosen) return '50% 50%';
    const d = BASE_DESTINATIONS.find(x => x.id === chosen)!;
    const off = offsets[chosen];
    const base = toScreen(d.vx, d.vy, layout);
    const sx = base.x + off.dx, sy = base.y + off.dy;
    const cw = containerRef.current?.clientWidth  || 1;
    const ch = containerRef.current?.clientHeight || 1;
    return `${(sx / cw * 100).toFixed(1)}% ${(sy / ch * 100).toFixed(1)}%`;
  })();

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#000' }}
    >
      {/* ══ Video ════════════════════════════════════════════════════ */}
      <video
        ref={videoRef}
        src={`${import.meta.env.BASE_URL}page3-cinematic.mp4`}
        playsInline preload="auto" disablePictureInPicture
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover', willChange: 'transform', pointerEvents: 'none',
        }}
        controlsList="nodownload nofullscreen noremoteplayback"
        onContextMenu={e => e.preventDefault()}
      />

      {/* ══ Hotspots ═════════════════════════════════════════════════ */}
      <AnimatePresence>
        {phase !== 'playing' && (
          <motion.div
            key="circles"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            style={{
              position: 'absolute', inset: 0,
              pointerEvents: (phase === 'interactive' || debug) ? 'auto' : 'none',
            }}
          >
            {BASE_DESTINATIONS.map(dest => (
              <Hotspot
                key={dest.id}
                dest={dest}
                offset={offsets[dest.id]}
                layout={layout}
                debug={debug}
                disabled={phase !== 'interactive'}
                selected={chosen === dest.id}
                faded={chosen !== null && chosen !== dest.id}
                onHover={playBell}
                onLeave={() => {}}
                onClick={() => handleSelect(dest)}
                onDragDelta={(dx, dy) => dispatch({ type: 'move', id: dest.id, dx, dy })}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ Calibration panel (debug only) ═══════════════════════════ */}
      {debug && (
        <CalibPanel
          dests={BASE_DESTINATIONS}
          offsets={offsets}
          layout={layout}
          onReset={() => dispatch({ type: 'reset' })}
        />
      )}

      {/* ══ "Choose your world" hint ═════════════════════════════════ */}
      <AnimatePresence>
        {phase === 'interactive' && !debug && (
          <motion.p
            key="hint"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            style={{
              position: 'absolute', bottom: '3%', left: 0, right: 0, margin: 0,
              textAlign: 'center', fontFamily: 'Georgia,serif',
              fontSize: 12, letterSpacing: 5, textTransform: 'uppercase',
              color: 'rgba(255,220,150,0.5)', pointerEvents: 'none', zIndex: 10,
            }}
          >
            Choose your world
          </motion.p>
        )}
      </AnimatePresence>

      {/* ══ Debug toggle ═════════════════════════════════════════════ */}
      <button
        onClick={() => setDebug(v => !v)}
        style={{
          position: 'absolute', top: 12, right: 12, zIndex: 300,
          padding: '5px 12px', fontFamily: 'monospace', fontSize: 11,
          background: debug ? 'rgba(255,60,60,0.85)' : 'rgba(0,0,0,0.55)',
          color: '#fff',
          border: `1px solid ${debug ? '#ff4444' : 'rgba(255,255,255,0.2)'}`,
          borderRadius: 6, cursor: 'pointer', backdropFilter: 'blur(4px)',
          transition: 'all 0.2s',
        }}
      >
        {debug ? '🔴 Debug ON' : '⚫ Debug OFF'}
      </button>

      {/* ══ Vignette ═════════════════════════════════════════════════ */}
      <AnimatePresence>
        {phase === 'selecting' && chosen && (
          <motion.div
            key="vignette"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{
              position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none',
              background: `radial-gradient(ellipse 50% 50% at ${vignettePos}, transparent 5%, rgba(0,0,0,0.8) 100%)`,
            }}
          />
        )}
      </AnimatePresence>

      {/* ══ Fade to black ════════════════════════════════════════════ */}
      <AnimatePresence>
        {phase === 'exiting' && (
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
