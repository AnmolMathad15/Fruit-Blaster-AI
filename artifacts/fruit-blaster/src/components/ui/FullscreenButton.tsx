import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Maximize, Minimize } from 'lucide-react';

// Cross-browser fullscreen helpers — Safari/iOS still expose the webkit-
// prefixed variants instead of the standard Fullscreen API.
interface FullscreenDoc extends Document {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
}
interface FullscreenEl extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}

function getFullscreenElement(): Element | null {
  const doc = document as FullscreenDoc;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

async function requestFullscreen(el: HTMLElement) {
  const target = el as FullscreenEl;
  if (target.requestFullscreen) await target.requestFullscreen();
  else if (target.webkitRequestFullscreen) await target.webkitRequestFullscreen();
}

async function exitFullscreen() {
  const doc = document as FullscreenDoc;
  if (doc.exitFullscreen) await doc.exitFullscreen();
  else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
}

/**
 * Persistent corner toggle that puts the whole game (document root) into the
 * browser's Fullscreen API — hides the address bar / tab strip / OS taskbar
 * so the game occupies the entire screen. Mounted once at the app root so it
 * stays available across every screen.
 */
export default function FullscreenButton() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!getFullscreenElement());
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    onChange();
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (getFullscreenElement()) {
        await exitFullscreen();
      } else {
        await requestFullscreen(document.documentElement);
      }
    } catch (e) {
      console.warn('[FullscreenButton] Fullscreen request failed:', e);
    }
  }, []);

  return (
    <motion.button
      whileHover={{ scale: 1.12 }}
      whileTap={{ scale: 0.88 }}
      onClick={toggleFullscreen}
      aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      // Offset below the top-left debug toggle (dev-only, MainMenu) so the two
      // never overlap; mute (top-right) and pause (in-game, top-right) are
      // unaffected since this button lives on the opposite side.
      style={{ position: 'fixed', top: 68, left: 14, zIndex: 200 }}
      className="w-11 h-11 rounded-full bg-black/50 backdrop-blur border border-white/15 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/70 transition-colors"
    >
      {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
    </motion.button>
  );
}
