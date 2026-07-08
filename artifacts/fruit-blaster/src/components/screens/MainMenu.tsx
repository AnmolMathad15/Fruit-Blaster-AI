import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { useSoundManager } from '../../hooks/useSoundManager';

export default function MainMenu() {
  const { setScreen } = useGameStore();
  const { playClick } = useSoundManager();
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  // Autoplay video (always muted so browser allows it)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    video.play().catch(() => {});
  }, []);

  // Start music muted; user unmutes via the button
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.6;
    audio.muted = true;
    audio.play().catch(() => {});
  }, []);

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
    setMuted(audio.muted);
  };

  const handlePlay = () => {
    playClick();
    setScreen('modes');
  };

  return (
    <div className="w-full h-full relative overflow-hidden select-none">
      {/* ── Full-screen background video ── */}
      <video
        ref={videoRef}
        src={`${import.meta.env.BASE_URL}landing-video.mp4`}
        className="absolute inset-0 w-full h-full object-cover"
        loop
        muted
        playsInline
        autoPlay
        preload="auto"
      />

      {/* ── Subtle dark gradient overlay so UI stays readable ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.05) 50%, rgba(0,0,0,0.45) 100%)',
        }}
      />

      {/* ── PLAY NOW button ── */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.button
          whileHover={{ scale: 1.07, boxShadow: '0 0 40px rgba(255,190,0,0.7)' }}
          whileTap={{ scale: 0.94 }}
          onClick={handlePlay}
          className="flex items-center gap-3 px-10 py-4 rounded-full cursor-pointer font-black text-2xl tracking-wide text-white"
          style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
            boxShadow: '0 6px 32px rgba(245,158,11,0.55), inset 0 1px 0 rgba(255,255,255,0.25)',
            border: '2px solid rgba(255,255,255,0.3)',
            textShadow: '0 1px 4px rgba(0,0,0,0.4)',
            letterSpacing: '0.08em',
          }}
        >
          <span style={{ fontSize: 26 }}>▶</span>
          PLAY NOW
        </motion.button>
      </div>

      {/* ── Music audio element ── */}
      <audio
        ref={audioRef}
        src={`${import.meta.env.BASE_URL}landing-music.mp3`}
        loop
        preload="auto"
      />

      {/* ── Mute / unmute toggle ── */}
      <motion.button
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.9 }}
        onClick={toggleMute}
        className="absolute z-50 flex items-center justify-center text-xl cursor-pointer"
        style={{
          top: 16, right: 16,
          width: 44, height: 44,
          background: 'rgba(0,0,0,0.50)',
          border: '2px solid rgba(255,255,255,0.25)',
          borderRadius: '50%',
          boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
        }}
        title={muted ? 'Unmute music' : 'Mute music'}
      >
        {muted ? '🔇' : '🎵'}
      </motion.button>

      {/* ── "tap to play music" hint ── */}
      {muted && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute pointer-events-none text-white/55 text-xs font-semibold tracking-wide"
          style={{ top: 64, right: 10, whiteSpace: 'nowrap' }}
        >
          🎵 tap to play music
        </motion.p>
      )}
    </div>
  );
}
