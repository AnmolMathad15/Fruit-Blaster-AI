/**
 * MainMenu — Landing page
 *
 * The looping video (landing-video.mp4, 1376×768) contains its own
 * "PLAY NOW" button in the animation. An invisible hit-area is placed
 * exactly over it using the same cover-layout system as the intro screens.
 *
 * ── Debug / Calibration ─────────────────────────────────────────────
 *   1.  Click "⚫ Debug OFF" (top-right) → turns red, shows overlay.
 *   2.  A draggable red rectangle appears over the button area.
 *   3.  Drag it until it perfectly covers the video's PLAY NOW button.
 *   4.  Read vx / vy / vw / vh from the live panel.
 *   5.  Paste those values into BTN_VX / BTN_VY / BTN_VW / BTN_VH below.
 *   6.  Toggle debug off — the hit-area is fully invisible and pixel-perfect.
 * ────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { useSoundManager } from '../../hooks/useSoundManager';

/* ─── Native video dimensions (1376×768) ───────────────────────────── */
const VID_W = 1376;
const VID_H = 768;

/* ─── PLAY NOW button position in native 1376×768 video pixels ──────── */
// ⚠️  Calibrate with Debug Mode, then hard-code the result.
let BTN_VX = 729;   // centre X
let BTN_VY = 463;   // centre Y
let BTN_VW = 345;   // width
let BTN_VH = 87;    // height

/* ─── Cover-layout helpers ───────────────────────────────────────────── */
interface CoverLayout { scale: number; offsetX: number; offsetY: number; }

function computeCoverLayout(cw: number, ch: number): CoverLayout {
  const scale = Math.max(cw / VID_W, ch / VID_H);
  return { scale, offsetX: (cw - VID_W * scale) / 2, offsetY: (ch - VID_H * scale) / 2 };
}
function toScreen(vx: number, vy: number, l: CoverLayout) {
  return { x: l.offsetX + vx * l.scale, y: l.offsetY + vy * l.scale };
}
function toNative(sx: number, sy: number, l: CoverLayout) {
  return { vx: Math.round((sx - l.offsetX) / l.scale), vy: Math.round((sy - l.offsetY) / l.scale) };
}

/* ─────────────────────────────────────────────
   Sakura petal type
───────────────────────────────────────────── */
interface Petal {
  x: number; y: number;
  size: number;
  vx: number; vy: number;
  rot: number; rotV: number;
  opacity: number;
  phase: number; phaseSpeed: number;
  swayAmp: number;
  hue: number;
}

const STYLES = `
@keyframes vignette-breathe {
  0%,100% { opacity: .80; }
  50%     { opacity: .65; }
}
@keyframes mute-hover {
  0%,100% { box-shadow: 0 0 8px rgba(200,140,20,.25); }
  50%     { box-shadow: 0 0 16px rgba(255,200,60,.50); }
}
`;

function spawnPetal(W: number, scatterY = false): Petal {
  return {
    x:          Math.random() * W,
    y:          scatterY ? Math.random() * window.innerHeight : -18,
    size:       3 + Math.random() * 9,
    vx:         (Math.random() - 0.5) * 0.7,
    vy:         0.55 + Math.random() * 1.4,
    rot:        Math.random() * Math.PI * 2,
    rotV:       (Math.random() - 0.5) * 0.055,
    opacity:    0.45 + Math.random() * 0.50,
    phase:      Math.random() * Math.PI * 2,
    phaseSpeed: 0.012 + Math.random() * 0.022,
    swayAmp:    0.4 + Math.random() * 1.0,
    hue:        338 + Math.random() * 22,
  };
}

function drawPetal(ctx: CanvasRenderingContext2D, p: Petal) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  const alpha = p.opacity * (0.65 + 0.35 * Math.sin(p.phase));

  ctx.globalAlpha = alpha * 0.7;
  ctx.fillStyle = `hsl(${p.hue - 6},70%,80%)`;
  ctx.beginPath();
  ctx.ellipse(-p.size * 0.25, p.size * 0.1, p.size * 0.65, p.size * 0.38, -0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = alpha;
  ctx.fillStyle = `hsl(${p.hue},72%,74%)`;
  ctx.beginPath();
  ctx.ellipse(0, 0, p.size, p.size * 0.52, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = alpha * 0.85;
  ctx.fillStyle = `hsl(${p.hue + 8},60%,84%)`;
  ctx.beginPath();
  ctx.ellipse(p.size * 0.28, -p.size * 0.08, p.size * 0.72, p.size * 0.40, 0.55, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

const PETAL_COUNT = 200;

/* ═══════════════════════════════════════════════════════════════════════
   Main component
═══════════════════════════════════════════════════════════════════════ */
export default function MainMenu() {
  const { setScreen } = useGameStore();
  const { playClick } = useSoundManager();

  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef     = useRef<HTMLAudioElement>(null);
  const videoRef     = useRef<HTMLVideoElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const rafRef       = useRef<number>(0);
  const petals       = useRef<Petal[]>([]);
  const musicReady   = useRef(false);

  const [muted,  setMuted]  = useState(false);
  const [debug,  setDebug]  = useState(false);
  const [layout, setLayout] = useState<CoverLayout>({ scale: 1, offsetX: 0, offsetY: 0 });
  const [drag,   setDrag]   = useState({ dx: 0, dy: 0 });
  const [copied, setCopied] = useState(false);

  /* ── Cover-layout tracker ── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setLayout(computeCoverLayout(el.clientWidth, el.clientHeight));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ── Canvas resize ── */
  const resizeCanvas = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    c.width  = window.innerWidth;
    c.height = window.innerHeight;
  }, []);

  /* ── Init petals ── */
  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    const W = window.innerWidth;
    petals.current = Array.from({ length: PETAL_COUNT }, () => spawnPetal(W, true));
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  /* ── RAF loop: 200 sakura petals ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const tick = () => {
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      for (const p of petals.current) {
        p.phase += p.phaseSpeed;
        p.x     += p.vx + Math.sin(p.phase) * p.swayAmp;
        p.y     += p.vy;
        p.rot   += p.rotV;
        if (p.x < -20)    p.x = W + 10;
        if (p.x > W + 20) p.x = -10;
        if (p.y > H + 20) Object.assign(p, spawnPetal(W, false));
        drawPetal(ctx, p);
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  /* ── Music: try autoplay, fall back to first tap ── */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.65;
    audio.muted  = false;

    let fallback: (() => void) | null = null;
    audio.play()
      .then(() => { musicReady.current = true; })
      .catch(() => {
        fallback = () => {
          if (musicReady.current) return;
          audio.play().then(() => { musicReady.current = true; }).catch(() => {});
          document.removeEventListener('pointerdown', fallback!);
          fallback = null;
        };
        document.addEventListener('pointerdown', fallback);
      });

    return () => { if (fallback) document.removeEventListener('pointerdown', fallback); };
  }, []);

  /* ── Video autoplay (muted so browser permits it) ── */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.play().catch(() => {});
  }, []);

  /* ── Mute toggle ── */
  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    if (!musicReady.current) {
      audio.play().then(() => { musicReady.current = true; }).catch(() => {});
    }
    audio.muted = !audio.muted;
    setMuted(audio.muted);
  };

  /* ── PLAY NOW handler ── */
  const handlePlay = useCallback(() => {
    playClick();
    setScreen('guardian');
  }, [playClick, setScreen]);

  /* ── Compute screen-space button rect ── */
  const btnBase = toScreen(BTN_VX, BTN_VY, layout);
  const btnW    = BTN_VW * layout.scale;
  const btnH    = BTN_VH * layout.scale;
  const btnL    = btnBase.x - btnW / 2 + drag.dx;
  const btnT    = btnBase.y - btnH / 2 + drag.dy;

  /* ── Live native coords for debug panel ── */
  const liveCentre = toNative(btnL + btnW / 2, btnT + btnH / 2, layout);

  /* ── Debug drag handlers ── */
  const startDrag = useCallback((e: React.MouseEvent) => {
    if (!debug) return;
    e.preventDefault();
    const startX = e.clientX - drag.dx;
    const startY = e.clientY - drag.dy;
    const onMove = (ev: MouseEvent) => setDrag({ dx: ev.clientX - startX, dy: ev.clientY - startY });
    const onUp   = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [debug, drag]);

  /* ── Copy coords ── */
  const copyCoords = () => {
    const text =
      `let BTN_VX = ${liveCentre.vx};   // centre X\n` +
      `let BTN_VY = ${liveCentre.vy};   // centre Y\n` +
      `let BTN_VW = ${BTN_VW};   // width\n` +
      `let BTN_VH = ${BTN_VH};   // height`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden select-none"
      style={{ background: '#060208' }}
    >
      <style>{STYLES}</style>

      {/* ── 0. Silent preload of page-2 cinematic ── */}
      <video
        src={`${import.meta.env.BASE_URL}page2-cinematic.mp4`}
        preload="auto" muted playsInline
        style={{ display: 'none' }} aria-hidden="true"
      />

      {/* ── 1. Looping video background ── */}
      <video
        ref={videoRef}
        src={`${import.meta.env.BASE_URL}landing-video.mp4`}
        loop muted playsInline
        className="absolute inset-0 w-full h-full"
        style={{ objectFit: 'cover', objectPosition: 'center' }}
      />

      {/* ── 2. Subtle vignette ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 95% 90% at 50% 48%, transparent 30%, rgba(4,1,10,0.68) 100%)',
          animation: 'vignette-breathe 9s ease-in-out infinite',
        }}
      />

      {/* ── 3. Sakura petal canvas ── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ mixBlendMode: 'screen' }}
      />

      {/* ── 4. Invisible PLAY NOW hit-area (over video's own button) ── */}
      <div
        onMouseDown={debug ? startDrag : undefined}
        onClick={!debug ? handlePlay : undefined}
        style={{
          position:      'absolute',
          left:          btnL,
          top:           btnT,
          width:         btnW,
          height:        btnH,
          cursor:        debug ? 'grab' : 'pointer',
          pointerEvents: 'auto',
          zIndex:        20,
          /* invisible in production; red outline in debug */
          background:    debug ? 'rgba(255,30,30,0.28)' : 'transparent',
          border:        debug ? '2px dashed rgba(255,80,80,0.85)' : 'none',
          borderRadius:  8,
        }}
      >
        {debug && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            fontFamily: 'monospace', fontSize: 11, color: '#fff',
            textShadow: '0 0 4px #000,0 0 4px #000',
            pointerEvents: 'none', textAlign: 'center', lineHeight: 1.6,
          }}>
            <div style={{ fontWeight: 700, fontSize: 12 }}>PLAY NOW</div>
            <div>vx:{liveCentre.vx}  vy:{liveCentre.vy}</div>
            <div>vw:{BTN_VW}  vh:{BTN_VH}</div>
            <div style={{ fontSize: 10, opacity: 0.7 }}>drag to align</div>
          </div>
        )}
      </div>

      {/* ── 5. Debug calibration panel ── */}
      {debug && (
        <div style={{
          position: 'absolute', top: 50, right: 12, zIndex: 200,
          background: 'rgba(0,0,0,0.90)',
          border: '1px solid rgba(255,80,80,0.45)',
          borderRadius: 10, padding: '14px 16px',
          fontFamily: 'monospace', fontSize: 11, color: '#fff',
          minWidth: 230, backdropFilter: 'blur(6px)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.8)',
        }}>
          <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 10, color: '#ff8080' }}>
            🎯 PLAY NOW button calibration
          </div>
          <div style={{ lineHeight: 2, color: '#aaa' }}>
            centre X: <b style={{ color: '#fff' }}>{liveCentre.vx}</b><br />
            centre Y: <b style={{ color: '#fff' }}>{liveCentre.vy}</b><br />
            width:    <b style={{ color: '#fff' }}>{BTN_VW}</b><br />
            height:   <b style={{ color: '#fff' }}>{BTN_VH}</b>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
            <button onClick={copyCoords} style={{
              flex: 1, padding: '6px 0',
              background: copied ? 'rgba(60,180,60,0.8)' : 'rgba(255,80,80,0.7)',
              border: 'none', borderRadius: 6,
              color: '#fff', fontFamily: 'monospace',
              fontSize: 11, cursor: 'pointer', fontWeight: 700,
            }}>
              {copied ? '✓ Copied!' : '📋 Copy coords'}
            </button>
            <button onClick={() => setDrag({ dx: 0, dy: 0 })} style={{
              padding: '6px 10px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 6, color: '#ccc',
              fontFamily: 'monospace', fontSize: 11, cursor: 'pointer',
            }}>↺</button>
          </div>
          <div style={{ marginTop: 10, color: 'rgba(255,255,255,0.35)', fontSize: 10, lineHeight: 1.5 }}>
            Drag the red box onto the PLAY NOW button.<br />
            Copy → paste values into BTN_VX/VY/VW/VH.
          </div>
        </div>
      )}

      {/* ── 6. Music ── */}
      <audio
        ref={audioRef}
        src={`${import.meta.env.BASE_URL}landing-music.mp3`}
        loop preload="auto"
      />

      {/* ── 7. Mute toggle ── */}
      <motion.button
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.88 }}
        onClick={toggleMute}
        aria-label={muted ? 'Unmute music' : 'Mute music'}
        style={{
          position: 'absolute', top: 14, right: 14,
          width: 44, height: 44, zIndex: 50,
          background: 'rgba(10,5,20,0.65)',
          border: '1.5px solid rgba(255,200,100,0.35)',
          borderRadius: '50%', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 19,
          animation: 'mute-hover 3s ease-in-out infinite',
          outline: 'none',
        }}
      >
        {muted ? '🔇' : '🔊'}
      </motion.button>

      {/* ── 8. Debug toggle ── */}
      <button
        onClick={() => setDebug(v => !v)}
        style={{
          position: 'absolute', top: 14, left: 14, zIndex: 300,
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
    </div>
  );
}
