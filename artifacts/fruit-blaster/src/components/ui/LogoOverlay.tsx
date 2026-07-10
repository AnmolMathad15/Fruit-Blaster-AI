import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * LogoOverlay
 *
 * Places the game logo on every screen from page 2 onwards, positioned
 * against a 1920×1080 reference frame using the same cover math as the
 * cinematic backgrounds. Pointer-events are disabled so it never blocks
 * clicks on the underlying UI.
 *
 * Debug mode lets you drag / resize the logo and copy the final native
 * VX/VY/VW/VH coordinates.
 */

const BASE_W = 1920;
const BASE_H = 1080;

const BTN_VX = 1739;
const BTN_VY = 902;
const BTN_VW = 140;
const BTN_VH = 160;

interface Layout { scale: number; offsetX: number; offsetY: number; }

function computeLayout(cw: number, ch: number): Layout {
  const scale = Math.max(cw / BASE_W, ch / BASE_H);
  return { scale, offsetX: (cw - BASE_W * scale) / 2, offsetY: (ch - BASE_H * scale) / 2 };
}

interface NativeSize { w: number; h: number; }
interface NativeOffset { dx: number; dy: number; }
const ZERO_OFFSET: NativeOffset = { dx: 0, dy: 0 };
const INIT_SIZE: NativeSize = { w: BTN_VW, h: BTN_VH };

export default function LogoOverlay() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<Layout>({ scale: 1, offsetX: 0, offsetY: 0 });

  const [debug, setDebug] = useState(false);
  const [offset, setOffset] = useState<NativeOffset>(ZERO_OFFSET);
  const [size, setSize] = useState<NativeSize>(INIT_SIZE);
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);

  /* ── Resize layout tracker ── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setLayout(computeLayout(el.clientWidth, el.clientHeight));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale = layout.scale || 1;

  /* ── Derived screen values ── */
  const screenX = layout.offsetX + (BTN_VX + offset.dx) * scale;
  const screenY = layout.offsetY + (BTN_VY + offset.dy) * scale;
  const screenW = size.w * scale;
  const screenH = size.h * scale;

  const live = {
    vx: Math.round(BTN_VX + offset.dx),
    vy: Math.round(BTN_VY + offset.dy),
    vw: Math.round(size.w),
    vh: Math.round(size.h),
  };

  /* ── Drag the logo ── */
  const onLogoMouseDown = (e: React.MouseEvent) => {
    if (!debug) return;
    e.preventDefault();
    const startMX = e.clientX;
    const startMY = e.clientY;
    const startDX = offset.dx;
    const startDY = offset.dy;
    setDragging(true);

    const onMove = (ev: MouseEvent) => {
      setOffset({
        dx: startDX + (ev.clientX - startMX) / scale,
        dy: startDY + (ev.clientY - startMY) / scale,
      });
    };
    const onUp = () => {
      setDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  /* ── Resize the logo ── */
  const onHandleMouseDown = (e: React.MouseEvent) => {
    if (!debug) return;
    e.preventDefault();
    e.stopPropagation();
    const startMX = e.clientX;
    const startMY = e.clientY;
    const startW = size.w;
    const startH = size.h;
    setResizing(true);

    const onMove = (ev: MouseEvent) => {
      setSize({
        w: Math.max(20, startW + (ev.clientX - startMX) / scale),
        h: Math.max(20, startH + (ev.clientY - startMY) / scale),
      });
    };
    const onUp = () => {
      setResizing(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  /* ── Copy calibrated values ── */
  const copy = () => {
    const code = `// Paste these into LogoOverlay.tsx:\nconst BTN_VX = ${live.vx};\nconst BTN_VY = ${live.vy};\nconst BTN_VW = ${live.vw};\nconst BTN_VH = ${live.vh};`;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 60 }}
    >
      {/* ── Logo ── */}
      <div
        onMouseDown={onLogoMouseDown}
        style={{
          position: 'absolute',
          left: screenX,
          top: screenY,
          width: screenW,
          height: screenH,
          transform: 'translate(-50%, -50%)',
          pointerEvents: debug ? 'auto' : 'none',
          cursor: debug ? (dragging ? 'grabbing' : 'grab') : 'default',
        }}
      >
        <img
          src={`${import.meta.env.BASE_URL}fruit-blaster-logo.png`}
          alt="Fruit Blaster AI"
          style={{
            width: '100%', height: '100%',
            objectFit: 'contain',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
          draggable={false}
        />

        {/* Debug frame + resize handle */}
        {debug && (
          <>
            <div
              style={{
                position: 'absolute', inset: 0,
                border: '2px dashed rgba(255,80,80,0.7)',
                borderRadius: 6,
                pointerEvents: 'none',
              }}
            />
            <div
              onMouseDown={onHandleMouseDown}
              style={{
                position: 'absolute', right: 0, bottom: 0,
                width: 14, height: 14,
                transform: 'translate(50%, 50%)',
                background: 'rgba(255,80,80,0.9)',
                border: '1px solid #fff',
                borderRadius: 3,
                cursor: 'se-resize',
              }}
            />
          </>
        )}
      </div>

      {/* ── Debug toggle ── */}
      <button
        onClick={() => setDebug(v => !v)}
        style={{
          position: 'absolute', top: 12, left: 12, zIndex: 300,
          padding: '5px 12px', fontFamily: 'monospace', fontSize: 11,
          background: debug ? 'rgba(255,60,60,0.85)' : 'rgba(0,0,0,0.55)',
          color: '#fff',
          border: `1px solid ${debug ? '#ff4444' : 'rgba(255,255,255,0.2)'}`,
          borderRadius: 6, cursor: 'pointer', backdropFilter: 'blur(4px)',
          transition: 'all 0.2s', pointerEvents: 'auto',
        }}
      >
        {debug ? '🔴 Logo Debug ON' : '⚫ Logo Debug OFF'}
      </button>

      {/* ── Debug calibration panel ── */}
      {debug && (
        <div style={{
          position: 'absolute', top: 48, left: 12, zIndex: 300,
          background: 'rgba(0,0,0,0.88)',
          border: '1px solid rgba(255,80,80,0.4)',
          borderRadius: 10, padding: '12px 14px',
          fontFamily: 'monospace', fontSize: 11, color: '#fff',
          minWidth: 200, backdropFilter: 'blur(6px)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.7)',
          pointerEvents: 'auto',
        }}>
          <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8, color: '#ff8080' }}>
            🎯 Logo calibration
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <div style={{ color: '#aaa' }}>vx: <b style={{ color: '#fff' }}>{live.vx}</b></div>
            <div style={{ color: '#aaa' }}>vy: <b style={{ color: '#fff' }}>{live.vy}</b></div>
            <div style={{ color: '#aaa' }}>vw: <b style={{ color: '#fff' }}>{live.vw}</b></div>
            <div style={{ color: '#aaa' }}>vh: <b style={{ color: '#fff' }}>{live.vh}</b></div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={copy} style={{
              flex: 1, padding: '5px 0',
              background: copied ? 'rgba(60,180,60,0.8)' : 'rgba(255,80,80,0.7)',
              border: 'none', borderRadius: 6, color: '#fff',
              fontFamily: 'monospace', fontSize: 11, cursor: 'pointer', fontWeight: 700,
            }}>
              {copied ? '✓ Copied!' : '📋 Copy coords'}
            </button>
            <button onClick={() => { setOffset(ZERO_OFFSET); setSize(INIT_SIZE); }} style={{
              padding: '5px 10px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 6, color: '#ccc',
              fontFamily: 'monospace', fontSize: 11, cursor: 'pointer',
            }}>
              ↺
            </button>
          </div>
          <div style={{ marginTop: 10, color: 'rgba(255,255,255,0.35)', fontSize: 10, lineHeight: 1.5 }}>
            Drag logo to move.<br />
            Drag bottom-right corner to resize.<br />
            Then copy the coords.
          </div>
        </div>
      )}
    </div>
  );
}
