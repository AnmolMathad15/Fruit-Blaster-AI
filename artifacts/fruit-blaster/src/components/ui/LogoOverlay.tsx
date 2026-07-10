import { useEffect, useRef, useState } from 'react';

/**
 * LogoOverlay
 *
 * Places the game logo on every screen from page 2 onwards, positioned
 * against a 1920×1080 reference frame using the same cover math as the
 * cinematic backgrounds. Pointer-events are disabled so it never blocks
 * clicks on the underlying UI.
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

export default function LogoOverlay() {
  const ref = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<Layout>({ scale: 1, offsetX: 0, offsetY: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setLayout(computeLayout(el.clientWidth, el.clientHeight));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const x = layout.offsetX + BTN_VX * layout.scale;
  const y = layout.offsetY + BTN_VY * layout.scale;
  const w = BTN_VW * layout.scale;
  const h = BTN_VH * layout.scale;

  return (
    <div
      ref={ref}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 60 }}
    >
      <img
        src={`${import.meta.env.BASE_URL}fruit-blaster-logo.png`}
        alt="Fruit Blaster AI"
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: w,
          height: h,
          transform: 'translate(-50%, -50%)',
          objectFit: 'contain',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
