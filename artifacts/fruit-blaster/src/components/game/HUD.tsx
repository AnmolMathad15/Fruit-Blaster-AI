import { useGameStore } from '../../store/gameStore';
import { useMoonStore } from '../../store/moonStore';
import { motion, AnimatePresence } from 'framer-motion';

export default function HUD() {
  const { score, lives, combo, mode, timeLeft, setPaused } = useGameStore();
  const { spiritEnergy, moonBlessingActive, fruitsSliced, eclipseOrbsHit, survivalSeconds } = useMoonStore();

  return (
    <div className="absolute inset-0 pointer-events-none z-10 p-6 flex justify-between items-start">
      {/* Left HUD: Score & Mode */}
      <div className="flex flex-col items-start gap-2">
        <div className="bg-black/40 backdrop-blur-md rounded-2xl px-6 py-3 border border-white/10">
          <span className="text-white/50 text-sm font-orbitron uppercase tracking-widest block mb-1">SCORE</span>
          <motion.div 
            key={score}
            initial={{ scale: 1.2, color: '#fff' }}
            animate={{ scale: 1, color: '#e2e8f0' }}
            className="text-4xl font-bold font-orbitron"
          >
            {score}
          </motion.div>
        </div>
        
        {(mode === 'challenge' || mode === 'bamboo') && (
          <div className="bg-black/40 backdrop-blur-md rounded-2xl px-6 py-2 border border-white/10 mt-2">
            <span className="text-white/50 text-xs font-orbitron uppercase tracking-widest block">
              {mode === 'bamboo' ? '🎋 Zen Time' : 'TIME'}
            </span>
            <span className={`text-2xl font-bold font-orbitron ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </span>
          </div>
        )}
      </div>

      {/* Center: Combo */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 flex flex-col items-center">
        <AnimatePresence>
          {combo >= 3 && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 1.5, opacity: 0 }}
              key={combo}
              className="text-center"
            >
              <div className="text-6xl font-black font-orbitron italic text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-orange-500 drop-shadow-[0_5px_10px_rgba(255,100,0,0.5)]">
                {combo}x
              </div>
              <div className="text-xl font-bold text-white uppercase tracking-widest mt-1 drop-shadow-md">
                {combo >= 20 ? 'LEGENDARY!' : combo >= 10 ? 'UNSTOPPABLE!' : combo >= 5 ? 'AWESOME!' : 'GOOD!'}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right HUD: Lives & Pause */}
      <div className="flex flex-col items-end gap-4">
        <button 
          onClick={() => setPaused(true)}
          className="pointer-events-auto bg-black/40 hover:bg-white/10 backdrop-blur-md rounded-full p-4 border border-white/10 transition-colors"
        >
          <div className="w-5 h-5 flex justify-between">
            <div className="w-1.5 h-full bg-white rounded-sm"></div>
            <div className="w-1.5 h-full bg-white rounded-sm"></div>
          </div>
        </button>

        {(mode === 'classic' || mode === 'arcade' || mode === 'moon') && (
          <div className="flex gap-2 mt-2">
            {[...Array(3)].map((_, i) => (
              <motion.div 
                key={i}
                initial={false}
                animate={{ 
                  scale: i < lives ? 1 : 0.8,
                  opacity: i < lives ? 1 : 0.2,
                  filter: i < lives ? 'grayscale(0%)' : 'grayscale(100%)'
                }}
                className="text-3xl drop-shadow-lg"
              >
                {mode === 'moon' ? '🌙' : '❤️'}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Moon Shrine: Spirit Energy meter + survival stats */}
      {mode === 'moon' && (
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
