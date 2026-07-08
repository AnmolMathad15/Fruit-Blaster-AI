import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { useSoundManager } from '../../hooks/useSoundManager';

export default function MainMenu() {
  const { setScreen } = useGameStore();
  const { playClick } = useSoundManager();
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(false);
  const musicPlayingRef = useRef(false);

  // ── Video: always hardware-muted, loops silently ──
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.play().catch(() => {});
  }, []);

  // ── Music: try autoplay; fall back to first tap ──
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.65;
    audio.muted = false;

    audio.play().then(() => {
      musicPlayingRef.current = true;
    }).catch(() => {
      // Autoplay blocked — start on first interaction
      const start = () => {
        if (musicPlayingRef.current) return;
        audio.play().then(() => { musicPlayingRef.current = true; }).catch(() => {});
        document.removeEventListener('pointerdown', start);
      };
      document.addEventListener('pointerdown', start);
    });
  }, []);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    // If music never started (autoplay blocked), kick it off now
    if (!musicPlayingRef.current) {
      audio.play().then(() => { musicPlayingRef.current = true; }).catch(() => {});
    }
    audio.muted = !audio.muted;
    setMuted(audio.muted);
  };

  const handlePlay = () => {
    playClick();
    setScreen('modes');
  };

  return (
    <div className="w-full h-full relative overflow-hidden select-none">

      {/* ── Full-screen looping video ── */}
      <video
        ref={videoRef}
        src={`${import.meta.env.BASE_URL}landing-video.mp4`}
        className="absolute inset-0 w-full h-full object-cover"
        loop
        muted
        playsInline
        autoPlay
        preload="auto"
        disablePictureInPicture
      />

      {/* ── Invisible hit-area over the video's PLAY NOW button ──
          Video native: 1376×768. Button center in source: x≈688 (50%), y≈512 (66.7%).
          With object-fit:cover the % coords stay constant for any landscape viewport. ── */}
      <button
        onClick={handlePlay}
        aria-label="Play Now"
        className="absolute cursor-pointer"
        style={{
          left: '50%',
          top: '66.7%',
          transform: 'translate(-50%, -50%)',
          width: '22%',
          height: '8.5%',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          borderRadius: 999,
          zIndex: 10,
        }}
      />

      {/* ── Music (background track, separate from video) ── */}
      <audio
        ref={audioRef}
        src={`${import.meta.env.BASE_URL}landing-music.mp3`}
        loop
        preload="auto"
      />

      {/* ── Mute / unmute — only UI element added on top ── */}
      <motion.button
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.9 }}
        onClick={toggleMute}
        aria-label={muted ? 'Unmute music' : 'Mute music'}
        title={muted ? 'Unmute music' : 'Mute music'}
        style={{
          position: 'absolute',
          top: 14, right: 14,
          width: 42, height: 42,
          background: 'rgba(0,0,0,0.48)',
          border: '1.5px solid rgba(255,255,255,0.22)',
          borderRadius: '50%',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          zIndex: 50,
        }}
      >
        {muted ? '🔇' : '🎵'}
      </motion.button>

    </div>
  );
}
