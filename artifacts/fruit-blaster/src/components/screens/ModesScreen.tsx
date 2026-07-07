import { motion } from 'framer-motion';
import { useGameStore, GameMode } from '../../store/gameStore';
import { useSoundManager } from '../../hooks/useSoundManager';
import { GlassPanel, Button } from '../ui/UIComponents';

export default function ModesScreen() {
  const { setScreen, setMode, resetGame } = useGameStore();
  const { playClick } = useSoundManager();

  const handleSelectMode = (mode: GameMode) => {
    playClick();
    setMode(mode);
    resetGame();
    setScreen('game');
  };

  const modes = [
    { id: 'classic', name: 'Classic', desc: '3 lives, bombs, escalating difficulty.', icon: '⚔️', color: 'from-red-500 to-orange-500' },
    { id: 'arcade', name: 'Arcade', desc: 'Fast, endless spawning. Bombs included.', icon: '⚡', color: 'from-purple-500 to-primary' },
    { id: 'zen', name: 'Zen', desc: 'No bombs, unlimited lives. Relax and slice.', icon: '🌸', color: 'from-green-400 to-teal-500' },
    { id: 'challenge', name: 'Challenge', desc: '60 seconds. Maximize your score.', icon: '⏱️', color: 'from-blue-400 to-indigo-500' },
  ];

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      <motion.h2 
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="text-4xl font-orbitron font-bold text-white mb-8"
      >
        SELECT MODE
      </motion.h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        {modes.map((m, i) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => handleSelectMode(m.id as GameMode)}
            className={`group cursor-pointer rounded-2xl p-[2px] bg-gradient-to-br ${m.color} hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all`}
          >
            <GlassPanel className="h-full w-full p-6 flex flex-col items-center text-center hover:bg-white/10 transition-colors">
              <span className="text-5xl mb-4 group-hover:scale-110 transition-transform">{m.icon}</span>
              <h3 className="text-2xl font-orbitron font-bold text-white mb-2">{m.name}</h3>
              <p className="text-white/60">{m.desc}</p>
            </GlassPanel>
          </motion.div>
        ))}
      </div>

      <Button onClick={() => { playClick(); setScreen('menu'); }} variant="ghost" className="mt-8">
        Back to Menu
      </Button>
    </div>
  );
}
