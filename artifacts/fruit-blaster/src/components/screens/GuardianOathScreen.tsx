/**
 * GuardianOathScreen — Page 2 Cinematic
 *
 * Flow:
 *   1. Black → fade (0.5 s) → fullscreen video plays with sound
 *   2. Zero HTML overlay during playback
 *   3. At ~7 s: transparent hit-zone appears over the "BEGIN THE JOURNEY"
 *      button that lives inside the video itself
 *   4. Click → video keeps playing (scroll-close + petal-burst already in video)
 *   5. Video ends → fade to black → navigate to 'modes'
 *   6. Fallback: if video ends with no click, HTML button appears on frozen frame
 */

import {
  useEffect, useLayoutEffect, useRef, useState, useCallback,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { useSoundManager } from '../../hooks/useSoundManager';

/* ─── Video intrinsic size (known from ffprobe) ─────────────────────── */
const VID_W = 1280;
const VID_H = 720;
/** Normalised button rect in the video frame (measured from frame grabs) */
const BTN_NX1 = 0.27;
const BTN_NY1 = 0.845;
const BTN_NX2 = 0.73;
const BTN_NY2 = 0.935;
/** Time (seconds) when the button first becomes fully visible in the video */
const BTN_APPEAR_TIME = 6.8;

/* ─── Compute button rect inside a container that uses object-fit:cover ─ */
interface Rect { left: number; top: number; width: number; height: number }
function computeBtnRect(cw: number, ch: number): Rect {
  const containerAspect = cw / ch;
  const videoAspect     = VID_W / VID_H;

  let scale: number, ox: number, oy: number;
  if (containerAspect > videoAspect) {
    // container wider → scale by width, crop top/bottom
    scale = cw / VID_W;
    ox    = 0;
    oy    = (ch - VID_H * scale) / 2;
  } else {
    // container taller → scale by height, crop left/right
    scale = ch / VID_H;
    ox    = (cw - VID_W * scale) / 2;
    oy    = 0;
  }

  const x1 = BTN_NX1 * VID_W * scale + ox;
  const y1 = BTN_NY1 * VID_H * scale + oy;
  const x2 = BTN_NX2 * VID_W * scale + ox;
  const y2 = BTN_NY2 * VID_H * scale + oy;

  return { left: x1, top: y1, width: x2 - x1, height: y2 - y1 };
}

/* ─── Burst petals on click ──────────────────────────────────────────── */
function BurstPetals({ active, rect }: { active: boolean; rect: Rect | null }) {
  if (!active || !rect) return null;
  const cx = rect.left + rect.width  / 2;
  const cy = rect.top  + rect.height / 2;
  return (
    <>
      {Array.from({ length: 28 }, (_, i) => {
        const angle = (i / 28) * 360;
        const dist  = 100 + Math.random() * 180;
        const vx    = Math.cos((angle * Math.PI) / 180) * dist;
        const vy    = Math.sin((angle * Math.PI) / 180) * dist - 80;
        const hue   = 338 + Math.random() * 22;
        const size  = 10 + Math.random() * 10;
        return (
          <motion.div
            key={i}
            initial={{ x: cx, y: cy, opacity: 1, scale: 0.6, rotate: 0 }}
            animate={{ x: cx + vx, y: cy + vy, opacity: 0, scale: 1.4, rotate: 720 }}
            transition={{ duration: 1.2, delay: Math.random() * 0.15, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              top: 0, left: 0,
              width: size, height: size * 0.55,
              borderRadius: '60% 40% 60% 40%',
              background: `hsl(${hue},75%,78%)`,
              boxShadow: `0 0 6px hsl(${hue},60%,85%)`,
              pointerEvents: 'none',
              zIndex: 35,
            }}
          />
        );
      })}
    </>
  );
}

/* ─── Golden ripple rings from button centre ─────────────────────────── */
function GoldenRings({ active, rect }: { active: boolean; rect: Rect | null }) {
  if (!active || !rect) return null;
  const cx = rect.left + rect.width  / 2;
  const cy = rect.top  + rect.height / 2;
  const rw = rect.width;
  return (
    <>
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          initial={{ x: cx - rw / 2, y: cy - rect.height / 2, width: rw, height: rect.height, borderRadius: 8, opacity: 0.95, scale: 1 }}
          animate={{ scale: 4, opacity: 0 }}
          transition={{ duration: 0.9, delay: i * 0.18, ease: 'easeOut' }}
          style={{
            position: 'fixed', top: 0, left: 0,
            border: '2.5px solid rgba(255, 210, 50, 0.9)',
            boxShadow: '0 0 24px rgba(255,180,20,0.6)',
            pointerEvents: 'none',
            zIndex: 35,
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
  | 'fadein'      // black → transparent
  | 'playing'     // video playing, no overlay
  | 'clickable'   // transparent hit-zone over the video button (>= 6.8 s)
  | 'closing'     // user clicked — video still playing, effects shown
  | 'exiting'     // video ended after click — fade to black
  | 'fallback';   // video ended without click — show HTML button

export default function GuardianOathScreen() {
  const { setScreen }  = useGameStore();
  const { playClick }  = useSoundManager();

  const containerRef   = useRef<HTMLDivElement>(null);
  const videoRef       = useRef<HTMLVideoElement>(null);

  const [phase, setPhase]         = useState<Phase>('fadein');
  const [btnRect, setBtnRect]     = useState<Rect | null>(null);
  const [showBurst, setShowBurst] = useState(false);
  const hasClickedRef             = useRef(false);

  /* ── Compute / recompute button rect whenever container resizes ── */
  const recalc = useCallback(() => {
    const c = containerRef.current;
    if (!c) return;
    setBtnRect(computeBtnRect(c.clientWidth, c.clientHeight));
  }, []);

  useLayoutEffect(() => {
    recalc();
    const ro = new ResizeObserver(recalc);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [recalc]);

  /* ── Fade-in complete → start video ── */
  const handleFadeInDone = useCallback(() => {
    setPhase('playing');
    videoRef.current?.play().catch(() => {});
  }, []);

  /* ── timeupdate → activate hit-zone at BTN_APPEAR_TIME ── */
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const onTime = () => {
      if (vid.currentTime >= BTN_APPEAR_TIME && phase === 'playing') {
        setPhase('clickable');
      }
    };
    vid.addEventListener('timeupdate', onTime);
    return () => vid.removeEventListener('timeupdate', onTime);
  }, [phase]);

  /* ── Video ended ── */
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const onEnded = () => {
      if (hasClickedRef.current) {
        setPhase('exiting');
        setTimeout(() => setScreen('modes'), 800);
      } else {
        setPhase('fallback');
      }
    };
    vid.addEventListener('ended', onEnded);
    return () => vid.removeEventListener('ended', onEnded);
  }, [setScreen]);

  /* ── Click on the video button ── */
  const handleBtnClick = useCallback(() => {
    if (hasClickedRef.current || phase !== 'clickable') return;
    hasClickedRef.current = true;
    playClick();
    setShowBurst(true);
    setPhase('closing');
    // Video keeps playing — the scroll-close + petal burst is already in the video
    // After a beat, clear the burst overlay so it doesn't persist
    setTimeout(() => setShowBurst(false), 1500);
  }, [phase, playClick]);

  /* ── HTML fallback button click ── */
  const handleFallbackClick = useCallback(() => {
    if (hasClickedRef.current) return;
    hasClickedRef.current = true;
    playClick();
    setShowBurst(true);
    setPhase('exiting');
    setTimeout(() => { setShowBurst(false); setScreen('modes'); }, 800);
  }, [playClick, setScreen]);

  const isHitZoneVisible = phase === 'clickable';

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden bg-black select-none"
    >

      {/* ══ 1. Cinematic video ══════════════════════════════════════════ */}
      <video
        ref={videoRef}
        src={`${import.meta.env.BASE_URL}page2-cinematic.mp4`}
        playsInline
        preload="auto"
        disablePictureInPicture
        /* NOT muted — has native AAC audio */
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

      {/* ══ 2. Fade-in overlay (black → clear) ═════════════════════════ */}
      <AnimatePresence>
        {phase === 'fadein' && (
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

      {/* ══ 3. Transparent hit-zone over the video button ══════════════ */}
      <AnimatePresence>
        {isHitZoneVisible && btnRect && (
          <motion.button
            key="hizone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            onClick={handleBtnClick}
            aria-label="Begin the Journey"
            style={{
              position: 'absolute',
              left:   btnRect.left,
              top:    btnRect.top,
              width:  btnRect.width,
              height: btnRect.height,
              /* Fully transparent — the video button IS the visual */
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              zIndex: 30,
              outline: 'none',
              /* Subtle pulsing border so players sense it's clickable */
              boxShadow: '0 0 0 2px rgba(255,210,60,0.0)',
              animation: 'btn-hint 2s ease-in-out infinite',
            }}
          >
            {/* Invisible interior — just the hit target */}
          </motion.button>
        )}
      </AnimatePresence>

      {/* ══ 4. Click effects (burst petals + golden rings) ══════════════ */}
      <BurstPetals active={showBurst} rect={btnRect} />
      <GoldenRings active={showBurst} rect={btnRect} />

      {/* ══ 5. HTML fallback button (appears if video ends unclicked) ═══ */}
      <AnimatePresence>
        {phase === 'fallback' && (
          <motion.div
            key="fallback"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'absolute',
              bottom: '8%', left: 0, right: 0,
              display: 'flex', justifyContent: 'center',
              zIndex: 30,
            }}
          >
            <div style={{ position: 'relative', display: 'inline-flex' }}>
              {/* Idle petal drift */}
              {Array.from({ length: 8 }, (_, i) => {
                const a = (i / 8) * 360;
                const r = 70 + Math.random() * 40;
                return (
                  <motion.div
                    key={i}
                    animate={{
                      x: [Math.cos((a*Math.PI)/180)*r*0.7, Math.cos((a*Math.PI)/180)*r, Math.cos((a*Math.PI)/180)*r*0.7],
                      y: [Math.sin((a*Math.PI)/180)*r*0.7, Math.sin((a*Math.PI)/180)*r, Math.sin((a*Math.PI)/180)*r*0.7],
                      rotate: [0, 360],
                    }}
                    transition={{ duration: 4, delay: (i/8)*4, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                      position: 'absolute',
                      top: '50%', left: '50%',
                      width: 12, height: 7,
                      marginLeft: -6, marginTop: -3.5,
                      borderRadius: '60% 40% 60% 40%',
                      background: `hsl(${338 + Math.random()*22},72%,78%)`,
                      pointerEvents: 'none',
                    }}
                  />
                );
              })}

              <motion.button
                whileHover={{ y: -5, boxShadow: '0 0 70px rgba(255,200,40,1), 0 8px 32px rgba(0,0,0,0.6)' }}
                whileTap={{ scale: 0.95 }}
                animate={{
                  boxShadow: [
                    '0 0 20px rgba(200,150,20,0.4)',
                    '0 0 55px rgba(255,200,40,0.9)',
                    '0 0 20px rgba(200,150,20,0.4)',
                  ],
                }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                onClick={handleFallbackClick}
                style={{
                  position: 'relative',
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '16px 48px',
                  background: 'linear-gradient(180deg, #f0d060 0%, #c8a020 40%, #9a7010 100%)',
                  border: '2px solid #f8e080',
                  borderRadius: 8,
                  cursor: 'pointer', outline: 'none',
                }}
              >
                {/* Left gem */}
                <div style={{ width:14, height:14, borderRadius:'50%', background:'radial-gradient(circle at 35% 35%, #b0ffb8, #20a040)', boxShadow:'0 0 10px rgba(40,200,80,0.8)', border:'1.5px solid rgba(255,255,255,0.5)', flexShrink:0 }} />

                <span style={{ fontFamily:'Georgia,serif', fontWeight:700, fontSize:18, letterSpacing:4, textTransform:'uppercase', color:'#1a0800', whiteSpace:'nowrap' }}>
                  Begin the Journey
                </span>

                {/* Right gem */}
                <div style={{ width:14, height:14, borderRadius:'50%', background:'radial-gradient(circle at 35% 35%, #b0ffb8, #20a040)', boxShadow:'0 0 10px rgba(40,200,80,0.8)', border:'1.5px solid rgba(255,255,255,0.5)', flexShrink:0 }} />

                {/* Sweeping shine */}
                <motion.div
                  animate={{ x: ['-160%', '260%'] }}
                  transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 4, ease: 'easeInOut' }}
                  style={{ position:'absolute', inset:0, background:'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%)', borderRadius:'inherit', pointerEvents:'none' }}
                />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ 6. Fade-to-black exit ════════════════════════════════════════ */}
      <AnimatePresence>
        {phase === 'exiting' && (
          <motion.div
            key="fadeout"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, ease: 'easeIn' }}
            style={{ position: 'absolute', inset: 0, background: '#000', zIndex: 40, pointerEvents: 'none' }}
          />
        )}
      </AnimatePresence>

      {/* Keyframe for hit-zone hint pulse */}
      <style>{`
        @keyframes btn-hint {
          0%,100% { box-shadow: 0 0 0 2px rgba(255,210,60,0.15); }
          50%      { box-shadow: 0 0 18px 4px rgba(255,210,60,0.45); }
        }
      `}</style>
    </div>
  );
}
