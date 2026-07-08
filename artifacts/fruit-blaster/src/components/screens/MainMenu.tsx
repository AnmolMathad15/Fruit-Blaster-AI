import { useEffect, useRef, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { useSoundManager } from '../../hooks/useSoundManager';

// Fruit character positions & styles (% of container)
// Tuned against the 1280×853 source image displayed in a 16:9 viewport via cover
const FRUITS = [
  { id: 'lemon',       left: 9,  top: 22, size: 78,  glow: '#fef08a', bobDur: 2.8, blinkDelay: 0    },
  { id: 'watermelon',  left: 17, top: 47, size: 115, glow: '#4ade80', bobDur: 3.1, blinkDelay: 1.3  },
  { id: 'pineapple',   left: 36, top: 58, size: 100, glow: '#fbbf24', bobDur: 2.5, blinkDelay: 2.7  },
  { id: 'strawberry',  left: 22, top: 77, size: 72,  glow: '#f87171', bobDur: 3.4, blinkDelay: 0.8  },
  { id: 'dragon',      left: 80, top: 22, size: 88,  glow: '#f0abfc', bobDur: 2.7, blinkDelay: 1.9  },
  { id: 'orange',      left: 63, top: 69, size: 88,  glow: '#fb923c', bobDur: 3.0, blinkDelay: 3.2  },
  { id: 'coconut',     left: 86, top: 71, size: 80,  glow: '#d4a574', bobDur: 2.6, blinkDelay: 0.5  },
];

// Static sparkle positions (generated once at module load)
const SPARKLES = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  left: (i * 37.3) % 100,
  top: (i * 23.7) % 68,
  size: 2 + (i % 3),
  delay: (i * 0.41) % 5,
  dur: 1.8 + (i % 4) * 0.6,
}));

// Nav button config
const NAV_BTNS = [
  { id: 'modes',        label: '🎮', title: 'Modes',        screen: 'modes'        as const },
  { id: 'leaderboard',  label: '🏆', title: 'Leaderboard',  screen: 'leaderboard'  as const },
  { id: 'achievements', label: '🏅', title: 'Achievements',  screen: 'achievements' as const },
  { id: 'settings',     label: '⚙️', title: 'Settings',     screen: 'settings'     as const },
];

export default function MainMenu() {
  const { setScreen } = useGameStore();
  const { playClick } = useSoundManager();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [muted, setMuted] = useState(true);
  const [bestScore] = useState<number>(() => {
    try { return Number(localStorage.getItem('fruitblaster_highscore') ?? 0); }
    catch { return 0; }
  });

  // Start music muted (bypasses autoplay block); user unmutes via button
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.55;
    audio.muted = true;
    audio.play().catch(() => {});
  }, []);

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
    setMuted(audio.muted);
  };

  const handleNav = (screen: Parameters<typeof setScreen>[0]) => {
    playClick();
    setScreen(screen);
  };

  return (
    <div className="w-full h-full relative overflow-hidden select-none">
      {/* ── CSS keyframes injected inline ── */}
      <style>{`
        @keyframes wave-l {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes wave-r {
          0%   { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        @keyframes shimmer {
          0%,100% { opacity:.28; }
          50%      { opacity:.65; }
        }
        @keyframes sparkle {
          0%,100% { opacity:0; transform:scale(0) rotate(0deg); }
          45%,55% { opacity:1; transform:scale(1) rotate(180deg); }
        }
        @keyframes bob {
          0%,100% { transform:translateY(0px);   }
          50%      { transform:translateY(-7px);  }
        }
        @keyframes blink {
          0%,88%,100%  { transform:scaleY(1);    }
          93%,97%      { transform:scaleY(0.06); }
        }
        @keyframes pulse-glow {
          0%,100% { opacity:.20; transform:scale(1);    }
          50%      { opacity:.55; transform:scale(1.15); }
        }
        @keyframes foam {
          0%   { transform:translateX(-110%) scaleX(.6); opacity:0; }
          20%  { opacity:.75; }
          70%  { opacity:.45; }
          100% { transform:translateX(110%)  scaleX(1.3); opacity:0; }
        }
        @keyframes leaf-fall {
          0%   { transform:translateY(-20px) rotate(-15deg); opacity:0; }
          10%  { opacity:.8; }
          90%  { opacity:.6; }
          100% { transform:translateY(100vh) rotate(40deg); opacity:0; }
        }
        @keyframes cloud-drift {
          0%   { transform:translateX(-8px); }
          50%  { transform:translateX(8px);  }
          100% { transform:translateX(-8px); }
        }
      `}</style>

      {/* ── 1. Background image ── */}
      <img
        src={`${import.meta.env.BASE_URL}landing-bg.png`}
        alt="Fruit Blaster AI beach landing"
        className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
        draggable={false}
      />

      {/* ── 2. Subtle sky vignette (top) ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, transparent 60%, rgba(0,0,30,0.18) 100%)' }}
      />

      {/* ── 3. Cloud drift overlays ── */}
      {[
        { left: '8%',  top: '8%',  w: 140, h: 40, delay: 0   },
        { left: '65%', top: '6%',  w: 100, h: 32, delay: 1.5 },
        { left: '42%', top: '12%', w: 80,  h: 26, delay: 3   },
      ].map((c, i) => (
        <div
          key={i}
          className="absolute pointer-events-none rounded-full"
          style={{
            left: c.left, top: c.top,
            width: c.w, height: c.h,
            background: 'rgba(255,255,255,0.10)',
            filter: 'blur(6px)',
            animation: `cloud-drift ${6 + i * 1.5}s ease-in-out ${c.delay}s infinite`,
          }}
        />
      ))}

      {/* ── 4. Falling leaves ── */}
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="absolute pointer-events-none text-lg"
          style={{
            left: `${10 + i * 18}%`,
            top: 0,
            animation: `leaf-fall ${7 + i * 1.3}s linear ${i * 2.1}s infinite`,
            opacity: 0,
          }}
        >
          🍃
        </div>
      ))}

      {/* ── 5. Ocean wave overlay (sits at ocean level ~32-60% down) ── */}
      <div
        className="absolute left-0 right-0 pointer-events-none overflow-hidden"
        style={{ top: '32%', height: '30%' }}
      >
        {/* Deep layer shimmer */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, transparent 0%, rgba(56,189,248,0.10) 60%, rgba(14,165,233,0.22) 100%)',
            animation: 'shimmer 4s ease-in-out infinite',
          }}
        />

        {/* Wave 1 — front, faster */}
        <div
          style={{ animation: 'wave-l 3.5s linear infinite', width: '200%', position: 'absolute', bottom: '42%' }}
        >
          <svg viewBox="0 0 1200 55" preserveAspectRatio="none" style={{ width: '100%', height: 38, display: 'block' }}>
            <path d="M0,28 C120,55 300,4 480,28 C660,52 840,4 1020,28 C1080,38 1140,32 1200,28 L1200,55 L0,55 Z"
              fill="rgba(56,189,248,0.22)" />
          </svg>
        </div>

        {/* Wave 2 — back, slower, different shape */}
        <div
          style={{ animation: 'wave-r 5.2s linear infinite', width: '200%', position: 'absolute', bottom: '47%' }}
        >
          <svg viewBox="0 0 1200 55" preserveAspectRatio="none" style={{ width: '100%', height: 32, display: 'block' }}>
            <path d="M0,18 C200,44 420,6 600,22 C780,38 1000,8 1200,18 L1200,55 L0,55 Z"
              fill="rgba(14,165,233,0.15)" />
          </svg>
        </div>

        {/* Wave 3 — surface glimmer */}
        <div
          style={{ animation: 'wave-l 7s linear infinite', width: '200%', position: 'absolute', bottom: '38%' }}
        >
          <svg viewBox="0 0 1200 30" preserveAspectRatio="none" style={{ width: '100%', height: 18, display: 'block' }}>
            <path d="M0,15 C100,28 250,2 400,15 C550,28 700,2 850,14 C1000,26 1100,10 1200,15 L1200,30 L0,30 Z"
              fill="rgba(186,230,253,0.18)" />
          </svg>
        </div>

        {/* Foam streaks */}
        {[0, 1, 2].map(i => (
          <div
            key={i}
            style={{
              position: 'absolute',
              bottom: `${40 + i * 2.5}%`,
              left: 0, right: 0, height: 5,
              background: 'rgba(255,255,255,0.35)',
              borderRadius: 4,
              animation: `foam ${5.5 + i * 1.8}s ease-in-out ${i * 2.2}s infinite`,
            }}
          />
        ))}

        {/* Light shimmer streaks */}
        {[0, 1].map(i => (
          <div
            key={i}
            style={{
              position: 'absolute',
              bottom: `${20 + i * 15}%`,
              left: `${20 + i * 35}%`,
              width: '15%', height: 3,
              background: 'rgba(255,255,255,0.55)',
              borderRadius: 4,
              filter: 'blur(2px)',
              animation: `shimmer ${2.5 + i}s ease-in-out ${i * 1.3}s infinite`,
            }}
          />
        ))}
      </div>

      {/* ── 6. Fruit character animations ── */}
      {FRUITS.map(f => (
        <div
          key={f.id}
          className="absolute pointer-events-none"
          style={{
            left: `${f.left}%`,
            top: `${f.top}%`,
            width: f.size,
            height: f.size,
            transform: 'translate(-50%, -50%)',
            animation: `bob ${f.bobDur}s ease-in-out ${f.blinkDelay * 0.25}s infinite`,
          }}
        >
          {/* Glow halo */}
          <div
            style={{
              position: 'absolute',
              inset: -f.size * 0.15,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${f.glow}55 0%, transparent 70%)`,
              animation: `pulse-glow ${f.bobDur + 0.4}s ease-in-out ${f.blinkDelay}s infinite`,
            }}
          />
          {/* Eye blink overlay — two pill shapes that collapse to a line */}
          <div
            style={{
              position: 'absolute',
              top: '32%', left: '22%', right: '22%',
              display: 'flex', justifyContent: 'space-around',
            }}
          >
            {[0, 1].map(eye => (
              <div
                key={eye}
                style={{
                  width: f.size * 0.13,
                  height: f.size * 0.16,
                  background: 'rgba(255,255,255,0.85)',
                  borderRadius: '50%',
                  transformOrigin: 'center center',
                  animation: `blink ${3.2 + f.blinkDelay * 0.6}s ease-in-out ${f.blinkDelay + eye * 0.06}s infinite`,
                }}
              />
            ))}
          </div>
        </div>
      ))}

      {/* ── 7. Sparkle particles ── */}
      {SPARKLES.map(s => (
        <div
          key={s.id}
          className="absolute pointer-events-none rounded-full"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            background: 'white',
            boxShadow: `0 0 ${s.size * 3}px ${s.size}px rgba(255,255,220,0.9)`,
            animation: `sparkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
            opacity: 0,
          }}
        />
      ))}

      {/* ── 8. Interactive play button (transparent overlay over image's yellow button) ── */}
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => handleNav('modes')}
        className="absolute cursor-pointer"
        style={{
          left: '50%',
          top: '58%',
          transform: 'translate(-50%, -50%)',
          width: 230,
          height: 60,
          background: 'rgba(255,200,0,0.08)',
          border: '2.5px solid rgba(255,200,0,0.35)',
          borderRadius: 32,
          boxShadow: '0 0 24px rgba(255,180,0,0.4)',
        }}
        aria-label="Play Now"
      />

      {/* ── 9. Nav buttons (transparent overlays over image icons) ── */}
      <div
        className="absolute flex gap-3"
        style={{ left: '50%', top: '76%', transform: 'translate(-50%, -50%)' }}
      >
        {NAV_BTNS.map(btn => (
          <motion.button
            key={btn.id}
            whileHover={{ scale: 1.15, y: -3 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleNav(btn.screen)}
            className="cursor-pointer flex flex-col items-center gap-0.5"
            style={{
              width: 56, height: 56,
              background: 'rgba(255,255,255,0.06)',
              border: '1.5px solid rgba(255,255,255,0.15)',
              borderRadius: 12,
              boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
            }}
            title={btn.title}
            aria-label={btn.title}
          />
        ))}
      </div>

      {/* ── 10. Best score overlay ── */}
      {bestScore > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="absolute flex items-center gap-2 px-4 py-1.5 rounded-full"
          style={{
            left: '50%',
            top: '88%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(120,60,0,0.55)',
            border: '2px solid rgba(255,200,80,0.5)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <span className="text-yellow-300 text-lg">⭐</span>
          <span className="font-bold text-white text-sm tracking-widest uppercase">Best Score</span>
          <span className="font-black text-yellow-300 text-base">{bestScore.toLocaleString()}</span>
        </motion.div>
      )}

      {/* ── 11. Audio element ── */}
      <audio
        ref={audioRef}
        src={`${import.meta.env.BASE_URL}landing-music.mp3`}
        loop
        preload="auto"
      />

      {/* ── 12. Mute / unmute toggle ── */}
      <motion.button
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.9 }}
        onClick={toggleMute}
        className="absolute z-50 flex items-center justify-center text-xl cursor-pointer"
        style={{
          top: 14, right: 14,
          width: 44, height: 44,
          background: 'rgba(0,0,0,0.45)',
          border: '2px solid rgba(255,255,255,0.25)',
          borderRadius: '50%',
          boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
        }}
        aria_label={muted ? 'Unmute music' : 'Mute music'}
        title={muted ? 'Unmute music' : 'Mute music'}
      >
        {muted ? '🔇' : '🎵'}
      </motion.button>

      {/* Hint to unmute (fades after first interaction) */}
      {muted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute pointer-events-none text-white/60 text-xs font-semibold tracking-wide"
          style={{ top: 62, right: 10, whiteSpace: 'nowrap' }}
        >
          🎵 tap to play music
        </motion.div>
      )}
    </div>
  );
}
