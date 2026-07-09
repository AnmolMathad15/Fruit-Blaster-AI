/**
 * WorldSelectionScreen — Page 3  AAA World Map
 *
 * Flow:
 *   1. New page3-cinematic.mp4 plays fullscreen
 *   2. Video ends → freezes on final frame → 5 portals activate
 *   3. Hover a portal → glow ring + rotating magic circle + particles + info panel
 *   4. Click (portal or panel button) → themed sound + particle burst → cinematic fade → game
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, GameMode } from '../../store/gameStore';
import { useSettingsStore } from '../../store/settingsStore';

// ─── Portal data ─────────────────────────────────────────────────────────────

const PORTALS = [
  {
    id:            'dojo-gate',
    name:          'Dojo Gate',
    subtitle:      'Classic Mode',
    mode:          'classic' as GameMode,
    x: 0.365,      y: 0.398,
    icon:          '🏯',
    difficulty:    1,
    diffLabel:     'Easy',
    color:         '#ff7744',
    glow:          'rgba(255,119,68,0.75)',
    ring:          '#ffaa55',
    panelBg:       'rgba(90,28,0,0.90)',
    panelBorder:   'rgba(255,140,60,0.45)',
    accent:        '#ffcc88',
    fadeBg:        'rgba(120,30,0,0.97)',
    desc:          'The training grounds where every Guardian begins their journey. Master the fundamentals of fruit slicing and sharpen your reflexes.',
    gameplay:      ['⏳ Unlimited Time', '❤️ 3 Lives', '🍉 Slice fruits to earn points', '💣 Avoid bombs — they cost one life', '⚡ Build combos for higher scores'],
    pColors:       ['#ff9955', '#ffcc66', '#ff6633', '#ffaa44', '#ffffc0'],
    soundId:       'bell',
    particleType:  'petal'  as 'petal'|'leaf'|'ember'|'dot',
  },
  {
    id:            'moon-shrine',
    name:          'Moon Shrine',
    subtitle:      'Survival Mode',
    mode:          'survival' as GameMode,
    x: 0.714,      y: 0.380,
    icon:          '🌕',
    difficulty:    4,
    diffLabel:     'Expert',
    color:         '#c8d5ff',
    glow:          'rgba(200,213,255,0.75)',
    ring:          '#e8eeff',
    panelBg:       'rgba(8,18,65,0.90)',
    panelBorder:   'rgba(180,200,255,0.45)',
    accent:        '#c8d5ff',
    fadeBg:        'rgba(10,20,100,0.97)',
    desc:          'Beneath the full moon, endless waves of enchanted fruits challenge your endurance. Only the strongest Guardians survive.',
    gameplay:      ['♾️ Endless Gameplay', '📈 Difficulty increases over time', '⚡ Faster fruit speed', '💣 Increasing bomb frequency', '🏆 Highest survival time recorded'],
    pColors:       ['#ffffff', '#e8eeff', '#c8d5ff', '#aabbff', '#ddeeff'],
    soundId:       'shrine',
    particleType:  'dot'    as 'petal'|'leaf'|'ember'|'dot',
  },
  {
    id:            'bamboo-grove',
    name:          'Bamboo Grove',
    subtitle:      'Zen Mode',
    mode:          'zen' as GameMode,
    x: 0.557,      y: 0.602,
    icon:          '🎋',
    difficulty:    2,
    diffLabel:     'Medium',
    color:         '#7eda5a',
    glow:          'rgba(126,218,90,0.75)',
    ring:          '#b8f07a',
    panelBg:       'rgba(8,46,8,0.90)',
    panelBorder:   'rgba(120,220,80,0.45)',
    accent:        '#b8f07a',
    fadeBg:        'rgba(10,60,10,0.97)',
    desc:          'A peaceful bamboo forest where calmness and precision are the keys to mastery. Every movement should be smooth and deliberate.',
    gameplay:      ['⏳ 2 Minute Timer', '🍉 Fruits appear at a calm, rhythmic pace', '💣 Very few bombs appear', '🎯 Accuracy over speed', '⚡ Long combo chains for bonus points'],
    pColors:       ['#b8f07a', '#7eda5a', '#aaffaa', '#80cc60', '#d4ffaa'],
    soundId:       'chimes',
    particleType:  'leaf'   as 'petal'|'leaf'|'ember'|'dot',
  },
  {
    id:            'crimson-temple',
    name:          'Crimson Temple',
    subtitle:      'Arcade Mode',
    mode:          'arcade' as GameMode,
    x: 0.339,      y: 0.759,
    icon:          '🔥',
    difficulty:    3,
    diffLabel:     'Hard',
    color:         '#ff3333',
    glow:          'rgba(255,51,51,0.75)',
    ring:          '#ff8844',
    panelBg:       'rgba(75,8,0,0.90)',
    panelBorder:   'rgba(255,80,40,0.45)',
    accent:        '#ff9966',
    fadeBg:        'rgba(140,8,0,0.97)',
    desc:          'An intense trial inside the Crimson Temple where speed, reflexes, and quick decision-making determine your fate.',
    gameplay:      ['⏳ 90 Second Timer', '🍉 Fruits spawn rapidly', '💣 Bombs appear frequently', '⚡ High combo multipliers', '🎁 Special bonus fruits award extra points'],
    pColors:       ['#ff4400', '#ff8800', '#ffcc00', '#ff2200', '#ff6600'],
    soundId:       'drum',
    particleType:  'ember'  as 'petal'|'leaf'|'ember'|'dot',
  },
  {
    id:            'imperial-palace',
    name:          'Imperial Palace',
    subtitle:      'Challenge Mode',
    mode:          'challenge' as GameMode,
    x: 0.771,      y: 0.769,
    icon:          '👑',
    difficulty:    5,
    diffLabel:     'Master',
    color:         '#ffd700',
    glow:          'rgba(255,215,0,0.75)',
    ring:          '#fffacd',
    panelBg:       'rgba(55,36,0,0.90)',
    panelBorder:   'rgba(255,215,0,0.45)',
    accent:        '#ffd700',
    fadeBg:        'rgba(100,65,0,0.97)',
    desc:          "The Emperor's final trial. Complete unique missions designed to test every skill you have mastered.",
    gameplay:      ['🎯 Mission-Based Challenges', '⚔️ Unique objectives each round', '⏳ Time-limited tasks', '🏅 Exclusive rewards and achievements', '👑 Designed for elite Guardians'],
    pColors:       ['#ffd700', '#fff7aa', '#ffcc00', '#fffacd', '#ffee55'],
    soundId:       'gong',
    particleType:  'dot'    as 'petal'|'leaf'|'ember'|'dot',
  },
] as const;

type Portal = typeof PORTALS[number];
type Phase  = 'playing' | 'interactive' | 'transitioning' | 'exiting';

// ─── Web Audio themed sounds ─────────────────────────────────────────────────

interface AudioWindow extends Window { webkitAudioContext?: typeof AudioContext; }

function playPortalSound(soundId: string, vol: number) {
  const W = window as AudioWindow;
  const Ctx = W.AudioContext || W.webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx() as AudioContext;
  const master = ctx.createGain();
  master.gain.value = Math.max(0, vol / 100) * 0.7;
  master.connect(ctx.destination);

  const tone = (freq: number, type: OscillatorType, start: number, end: number, peakVol: number, delay = 0) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(master);
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(peakVol, ctx.currentTime + delay);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + end);
    o.start(ctx.currentTime + delay);
    o.stop(ctx.currentTime + delay + end + 0.05);
  };

  if (soundId === 'bell') {
    // Temple bells — triad of sines, staggered
    tone(880,  'sine', 0, 2.5, 0.5, 0);
    tone(1108, 'sine', 0, 2.0, 0.3, 0.06);
    tone(1320, 'sine', 0, 1.5, 0.2, 0.12);
  } else if (soundId === 'chimes') {
    // Wind chimes — pentatonic arpeggio
    [523, 622, 784, 1047, 1245].forEach((f, i) => tone(f, 'sine', 0, 1.6, 0.28, i * 0.13));
  } else if (soundId === 'shrine') {
    // Shrine bell — deep resonant with harmonic
    tone(220, 'sine', 0, 3.0, 0.65, 0);
    tone(440, 'sine', 0, 2.0, 0.25, 0.04);
    tone(660, 'sine', 0, 1.0, 0.10, 0.08);
  } else if (soundId === 'drum') {
    // Taiko drum — noise burst + pitch-drop thump
    const bufSize = Math.floor(ctx.sampleRate * 0.35);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.035));
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass'; filt.frequency.value = 180;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.9, ctx.currentTime);
    ng.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    noise.connect(filt); filt.connect(ng); ng.connect(master);
    noise.start(ctx.currentTime);

    const o = ctx.createOscillator();
    const og = ctx.createGain();
    o.connect(og); og.connect(master);
    o.type = 'sine';
    o.frequency.setValueAtTime(120, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(38, ctx.currentTime + 0.28);
    og.gain.setValueAtTime(0.7, ctx.currentTime);
    og.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.38);
    o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.4);
  } else if (soundId === 'gong') {
    // Royal gong — deep, shimmering harmonics
    [78, 156, 234, 468].forEach((f, i) => tone(f, 'sine', 0, 3.2 - i * 0.3, 0.55 / (i + 1), 0));
  }

  setTimeout(() => { try { ctx.close(); } catch (_) {} }, 4500);
}

// ─── Particle types ───────────────────────────────────────────────────────────

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number;
  size: number; color: string;
  rot: number; rotSpd: number;
  type: 'petal' | 'leaf' | 'ember' | 'dot';
}

function spawnParticles(
  cx: number, cy: number,
  colors: readonly string[],
  type: Particle['type'],
  count: number
): Particle[] {
  return Array.from({ length: count }, () => {
    const a  = Math.random() * Math.PI * 2;
    const sp = 1.5 + Math.random() * 7;
    const rise = (type === 'ember' || type === 'dot') ? -(1.5 + Math.random() * 4) : 0;
    const ml = 90 + Math.random() * 80;
    return {
      x:   cx + (Math.random() - 0.5) * 120,
      y:   cy + (Math.random() - 0.5) * 80,
      vx:  Math.cos(a) * sp * (type === 'ember' ? 0.5 : 1),
      vy:  rise || Math.sin(a) * sp,
      life: ml, maxLife: ml,
      size:  5 + Math.random() * 16,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot:   Math.random() * Math.PI * 2,
      rotSpd:(Math.random() - 0.5) * 0.25,
      type,
    };
  });
}

// ─── Portal ring (SVG) ────────────────────────────────────────────────────────

function PortalRing({ portal, hovered }: { portal: Portal; hovered: boolean }) {
  const r1 = 58, r2 = 44;
  return (
    <motion.svg
      width={160} height={160} viewBox="-80 -80 160 160"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}
      animate={{ rotate: hovered ? 360 : 0 }}
      transition={hovered
        ? { duration: 3.5, repeat: Infinity, ease: 'linear' }
        : { duration: 0.6, ease: 'easeOut' }}
    >
      <defs>
        <filter id={`gf-${portal.id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Outer dashed arc */}
      <motion.circle
        cx={0} cy={0} r={r1}
        fill="none" stroke={portal.ring} strokeWidth={2.5}
        strokeDasharray={`${r1 * 0.8} ${r1 * 0.5}`}
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.35 }}
        style={{ filter: `drop-shadow(0 0 5px ${portal.color})` }}
      />

      {/* Inner counter-rotating arc */}
      <motion.circle
        cx={0} cy={0} r={r2}
        fill="none" stroke={portal.color} strokeWidth={1.5}
        strokeDasharray={`${r2 * 0.45} ${r2 * 0.8}`}
        animate={{ rotate: hovered ? -360 : 0, opacity: hovered ? 0.65 : 0 }}
        transition={hovered
          ? { rotate: { duration: 2.5, repeat: Infinity, ease: 'linear' }, opacity: { duration: 0.35 } }
          : { opacity: { duration: 0.35 } }}
        style={{ transformOrigin: 'center' }}
      />

      {/* Corner gems */}
      {[0, 90, 180, 270].map(deg => {
        const rad = (deg * Math.PI) / 180;
        return (
          <motion.circle
            key={deg}
            cx={Math.cos(rad) * r1} cy={Math.sin(rad) * r1}
            r={4}
            fill={portal.ring}
            animate={{ opacity: hovered ? 1 : 0, scale: hovered ? 1 : 0 }}
            transition={{ duration: 0.3, delay: deg / 1800 }}
            style={{ filter: `drop-shadow(0 0 5px ${portal.ring})` }}
          />
        );
      })}
    </motion.svg>
  );
}

// ─── Left info panel ──────────────────────────────────────────────────────────

function InfoPanel({ portal, onEnter }: { portal: Portal; onEnter: () => void }) {
  return (
    <motion.div
      key={portal.id}
      initial={{ x: -340, opacity: 0 }}
      animate={{ x: 0,    opacity: 1 }}
      exit={{   x: -340,  opacity: 0 }}
      transition={{ type: 'spring', damping: 24, stiffness: 200 }}
      style={{
        position:      'absolute',
        left:          14,
        top:           '50%',
        transform:     'translateY(-50%)',
        width:         290,
        background:    portal.panelBg,
        border:        `1px solid ${portal.panelBorder}`,
        borderRadius:  18,
        padding:       '22px 20px',
        backdropFilter:'blur(18px)',
        boxShadow:     `0 0 50px ${portal.glow}, 0 8px 36px rgba(0,0,0,0.7)`,
        zIndex:        25,
        pointerEvents: 'auto',
        userSelect:    'none',
      }}
    >
      {/* Icon + name */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 38, lineHeight: 1, marginBottom: 8 }}>{portal.icon}</div>
        <div style={{
          color: portal.accent, fontSize: 20, fontWeight: 800,
          letterSpacing: '0.06em', fontFamily: 'var(--font-orbitron, monospace)',
        }}>
          {portal.name}
        </div>
        <div style={{
          color: 'rgba(255,255,255,0.45)', fontSize: 11,
          letterSpacing: '0.13em', textTransform: 'uppercase', marginTop: 3,
        }}>
          {portal.subtitle}
        </div>
      </div>

      {/* Difficulty */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 13 }}>
        <span style={{ color: 'rgba(255,255,255,0.38)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Difficulty</span>
        <span style={{ fontSize: 12 }}>{'⭐'.repeat(portal.difficulty)}</span>
        <span style={{ color: portal.accent, fontSize: 10, fontWeight: 700 }}>{portal.diffLabel}</span>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: portal.panelBorder, marginBottom: 12 }} />

      {/* Description */}
      <p style={{ color: 'rgba(255,255,255,0.70)', fontSize: 11.5, lineHeight: 1.65, marginBottom: 13 }}>
        {portal.desc}
      </p>

      {/* Gameplay */}
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 18px', display: 'flex', flexDirection: 'column', gap: 5 }}>
        {portal.gameplay.map((item, i) => (
          <li key={i} style={{ color: 'rgba(255,255,255,0.62)', fontSize: 11, lineHeight: 1.45 }}>
            {item}
          </li>
        ))}
      </ul>

      {/* Enter button */}
      <motion.button
        whileHover={{ scale: 1.04, boxShadow: `0 0 28px ${portal.glow}` }}
        whileTap={{ scale: 0.97 }}
        onClick={onEnter}
        style={{
          width: '100%', padding: '12px 0',
          background: `linear-gradient(135deg, ${portal.color}88, ${portal.color}bb)`,
          border:    `1.5px solid ${portal.panelBorder}`,
          borderRadius: 9,
          color: '#fff', fontSize: 12, fontWeight: 800,
          letterSpacing: '0.14em', textTransform: 'uppercase',
          cursor: 'pointer',
          boxShadow: `0 0 18px ${portal.glow}`,
          fontFamily: 'var(--font-orbitron, monospace)',
          transition: 'background 0.2s',
        }}
      >
        ⚔️ &nbsp;Enter World
      </motion.button>
    </motion.div>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function WorldSelectionScreen() {
  const { setScreen, setMode, resetGame } = useGameStore();
  const { soundVolume }                   = useSettingsStore();

  const videoRef     = useRef<HTMLVideoElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const rafRef       = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const mountedRef   = useRef(true);
  const actedRef     = useRef(false);
  const timersRef    = useRef<ReturnType<typeof setTimeout>[]>([]);

  const [phase,   setPhase]   = useState<Phase>('playing');
  const [hovered, setHovered] = useState<string | null>(null);
  const [fadeBg,  setFadeBg]  = useState('rgba(0,0,0,0)');

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cancelAnimationFrame(rafRef.current);
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  /* ── Video autoplay → freeze on last frame ── */
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.play().catch(() => {});
    const onEnded = () => { vid.pause(); if (mountedRef.current) setPhase('interactive'); };
    vid.addEventListener('ended', onEnded);
    return () => vid.removeEventListener('ended', onEnded);
  }, []);

  /* ── Particle canvas loop ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const syncSize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    syncSize();
    window.addEventListener('resize', syncSize);

    const draw = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const pts = particlesRef.current;
      for (let i = pts.length - 1; i >= 0; i--) {
        const p = pts[i];
        p.x += p.vx; p.y += p.vy;
        if (p.type === 'ember') p.vy -= 0.06; else p.vy += 0.03;
        p.vx *= 0.99;
        p.rot += p.rotSpd;
        p.life -= 1;
        if (p.life <= 0) { pts.splice(i, 1); continue; }

        const alpha = p.life / p.maxLife;
        ctx.save();
        ctx.globalAlpha = Math.min(1, alpha * 2.5);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;

        if (p.type === 'petal') {
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.42, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'leaf') {
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * 0.35, p.size, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'ember') {
          ctx.shadowBlur = 10; ctx.shadowColor = p.color;
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.55, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => { window.removeEventListener('resize', syncSize); cancelAnimationFrame(rafRef.current); };
  }, []);

  /* ── Handle portal selection ── */
  const handleSelect = useCallback((portal: Portal) => {
    if (phase !== 'interactive' || actedRef.current) return;
    actedRef.current = true;
    setPhase('transitioning');
    setFadeBg(portal.fadeBg);

    playPortalSound(portal.soundId, soundVolume);

    const cx = portal.x * window.innerWidth;
    const cy = portal.y * window.innerHeight;
    particlesRef.current.push(
      ...spawnParticles(cx, cy, portal.pColors, portal.particleType, 140)
    );

    const t1 = setTimeout(() => {
      if (!mountedRef.current) return;
      setPhase('exiting');
      const t2 = setTimeout(() => {
        if (!mountedRef.current) return;
        setMode(portal.mode);
        resetGame();
        setScreen('game');
      }, 750);
      timersRef.current.push(t2);
    }, 1150);
    timersRef.current.push(t1);
  }, [phase, soundVolume, setMode, resetGame, setScreen]);

  const hoveredPortal = useMemo(
    () => PORTALS.find(p => p.id === hovered) ?? null,
    [hovered]
  );

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#000' }}>

      {/* ══ 1. Cinematic video ════════════════════════════════════════════ */}
      <video
        ref={videoRef}
        src={`${import.meta.env.BASE_URL}page3-cinematic.mp4`}
        playsInline preload="auto" disablePictureInPicture
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
        controlsList="nodownload nofullscreen noremoteplayback"
        onContextMenu={e => e.preventDefault()}
      />

      {/* ══ 2. Particle canvas ═══════════════════════════════════════════ */}
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}
      />

      {/* ══ 3. Portal zones ══════════════════════════════════════════════ */}
      {phase === 'interactive' && PORTALS.map(portal => {
        const isHov = hovered === portal.id;
        return (
          <motion.div
            key={portal.id}
            style={{
              position:  'absolute',
              left:      `${portal.x * 100}%`,
              top:       `${portal.y * 100}%`,
              width:     120,
              height:    120,
              transform: 'translate(-50%, -50%)',
              cursor:    'pointer',
              zIndex:    30,
              display:   'flex',
              alignItems:'center',
              justifyContent: 'center',
            }}
            animate={{ scale: isHov ? 1.2 : 1 }}
            transition={{ type: 'spring', damping: 16, stiffness: 200 }}
            onHoverStart={() => setHovered(portal.id)}
            onHoverEnd={()   => setHovered(h => h === portal.id ? null : h)}
            onClick={() => handleSelect(portal)}
          >
            {/* Radial glow */}
            <AnimatePresence>
              {isHov && (
                <motion.div
                  key="glow"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{   opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    position: 'absolute', inset: -30,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${portal.glow} 0%, transparent 68%)`,
                    boxShadow:  `0 0 50px ${portal.glow}, 0 0 90px ${portal.glow}50`,
                  }}
                />
              )}
            </AnimatePresence>

            {/* Animated ring */}
            <PortalRing portal={portal} hovered={isHov} />

            {/* Invisible hit area */}
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%' }} />

            {/* Hover label */}
            <AnimatePresence>
              {isHov && (
                <motion.div
                  key="lbl"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{   opacity: 0, y: 6  }}
                  style={{
                    position:  'absolute',
                    bottom:    -40,
                    left:      '50%',
                    transform: 'translateX(-50%)',
                    whiteSpace:'nowrap',
                    color:     portal.accent,
                    fontSize:  10.5,
                    fontWeight:800,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    textShadow:`0 0 14px ${portal.color}`,
                    pointerEvents: 'none',
                    fontFamily: 'var(--font-orbitron, monospace)',
                  }}
                >
                  {portal.name}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}

      {/* ══ 4. Info panel (left) ═════════════════════════════════════════ */}
      <AnimatePresence>
        {hoveredPortal && phase === 'interactive' && (
          <InfoPanel portal={hoveredPortal} onEnter={() => handleSelect(hoveredPortal)} />
        )}
      </AnimatePresence>

      {/* ══ 5. Hint text ═════════════════════════════════════════════════ */}
      <AnimatePresence>
        {phase === 'interactive' && !hovered && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ delay: 0.6 }}
            style={{
              position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)',
              color: 'rgba(255,255,255,0.45)', fontSize: 12.5,
              letterSpacing: '0.14em', textTransform: 'uppercase',
              textShadow: '0 2px 10px rgba(0,0,0,0.9)',
              pointerEvents: 'none', zIndex: 15,
            }}
          >
            ✦ &nbsp;Hover a portal to begin &nbsp;✦
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ 6. Themed transition overlay ════════════════════════════════ */}
      <AnimatePresence>
        {phase === 'transitioning' && (
          <motion.div
            key="trans"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.88 }}
            transition={{ duration: 0.55 }}
            style={{ position: 'absolute', inset: 0, background: fadeBg, zIndex: 30, pointerEvents: 'none' }}
          />
        )}
      </AnimatePresence>

      {/* ══ 7. Fade-to-black exit ════════════════════════════════════════ */}
      <AnimatePresence>
        {phase === 'exiting' && (
          <motion.div
            key="fadeout"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.75 }}
            style={{ position: 'absolute', inset: 0, background: '#000', zIndex: 40, pointerEvents: 'none' }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
