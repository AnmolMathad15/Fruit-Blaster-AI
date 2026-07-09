import { useGameStore } from '../../store/gameStore';
import { useMoonStore } from '../../store/moonStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme, comboLabelFor } from '../../core/ThemeUIManager';
import { ThemedButton } from '../ui/UIComponents';

export default function HUD() {
  const { score, lives, combo, mode, timeLeft, setPaused } = useGameStore();
  const { spiritEnergy, moonBlessingActive, fruitsSliced, eclipseOrbsHit, survivalSeconds } = useMoonStore();
  const theme = useTheme();

  const showTimer = mode === 'challenge' || mode === 'bamboo';
  const showLives = mode === 'classic' || mode === 'arcade' || mode === 'moon' || mode === 'survival';
  const showMoonPanel = mode === 'moon';

  return (
    <div className="absolute inset-0 pointer-events-none z-10 p-6 flex justify-between items-start">
      {/* Left HUD: Score & Timer, framed by the theme's scoreboard art */}
      <div className="relative flex flex-col items-start">
        <div
          className="relative bg-no-repeat bg-contain bg-left-top px-8 py-4 min-w-[300px]"
          style={{ backgroundImage: `url(${theme.assets.scoreboard})`, aspectRatio: '375 / 145' }}
        >
          <span className="text-white/60 text-[10px] font-orbitron uppercase tracking-widest block mb-1">SCORE</span>
          <motion.div
            key={score}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="text-3xl font-bold font-orbitron"
            style={{ color: theme.accentSoft }}
          >
            {score}
          </motion.div>
        </div>

        {showTimer && (
          <div className="bg-black/40 backdrop-blur-md rounded-2xl px-6 py-2 border border-white/10 mt-2">
            <span className="text-white/50 text-xs font-orbitron uppercase tracking-widest block">
              {theme.timeLabel}
            </span>
            <span className={`text-2xl font-bold font-orbitron ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </span>
          </div>
        )}
      </div>

      {/* Center: Combo banner, themed art + copy */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 flex flex-col items-center">
        <AnimatePresence>
          {combo >= 3 && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 1.5, opacity: 0 }}
              key={combo}
              className="relative flex flex-col items-center justify-center px-10 py-4"
              style={{ backgroundImage: `url(${theme.assets.comboBanner})`, backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat' }}
            >
              <div className="text-5xl font-black font-orbitron italic text-white drop-shadow-[0_5px_10px_rgba(0,0,0,0.6)]">
                {combo}x
              </div>
              <div className="text-lg font-bold text-white uppercase tracking-widest mt-1 drop-shadow-md">
                {comboLabelFor(theme, combo)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right HUD: Pause button & lives, using the theme's life icon */}
      <div className="flex flex-col items-end gap-4">
        <ThemedButton kind="pause" onClick={() => setPaused(true)} className="pointer-events-auto w-16 h-16" />

        {showLives && (
          <div className="flex gap-2 mt-2">
            {[...Array(3)].map((_, i) => (
              <motion.img
                key={i}
                src={i < lives ? theme.assets.lifeFull : theme.assets.lifeEmpty}
                alt={theme.livesIconName}
                initial={false}
                animate={{
                  scale: i < lives ? 1 : 0.85,
                  opacity: i < lives ? 1 : 0.35,
                }}
                className="w-9 h-9 object-contain drop-shadow-lg"
              />
            ))}
          </div>
        )}
      </div>

      {/* Moon Shrine: Spirit Energy meter + survival stats (data is mode-specific, not the visual chrome) */}
      {showMoonPanel && (
        <>
          <div className="absolute bottom-6 left-6 flex flex-col items-start gap-1 pointer-events-none">
            <span className="text-blue-200/60 text-xs font-orbitron uppercase tracking-widest">Spirit Energy</span>
            <div className="w-48 h-3 rounded-full bg-black/50 border border-blue-300/20 overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${moonBlessingActive ? 'bg-gradient-to-r from-indigo-300 via-blue-200 to-white' : 'bg-gradient-to-r from-indigo-500 to-blue-300'}`}
                animate={{ width: `${spiritEnergy}%` }}
                transition={{ ease: 'easeOut', duration: 0.2 }}
              />
            </div>
            <AnimatePresence>
              {moonBlessingActive && (
                <motion.span
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="text-xs font-bold text-blue-100 tracking-widest uppercase mt-0.5"
                >
                  ✨ Moon Blessing Active
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-6 text-center pointer-events-none">
            <div>
              <div className="text-white text-lg font-bold font-orbitron">{fruitsSliced}</div>
              <div className="text-white/40 text-[10px] uppercase tracking-widest">Sliced</div>
            </div>
            <div>
              <div className="text-white text-lg font-bold font-orbitron">{eclipseOrbsHit}</div>
              <div className="text-white/40 text-[10px] uppercase tracking-widest">Orbs Hit</div>
            </div>
            <div>
              <div className="text-white text-lg font-bold font-orbitron">
                {Math.floor(survivalSeconds / 60)}:{(Math.floor(survivalSeconds) % 60).toString().padStart(2, '0')}
              </div>
              <div className="text-white/40 text-[10px] uppercase tracking-widest">Survived</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
