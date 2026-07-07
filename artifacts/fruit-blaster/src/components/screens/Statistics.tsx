import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { useStatsStore } from '../../store/statsStore';
import { GlassPanel, Button } from '../ui/UIComponents';
import { useSoundManager } from '../../hooks/useSoundManager';

export default function Statistics() {
  const { setScreen } = useGameStore();
  const stats = useStatsStore();
  const { playClick } = useSoundManager();

  const handleBack = () => {
    playClick();
    setScreen('menu');
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${seconds % 60}s`;
  };

  const accuracy = stats.swingsHit + stats.swingsMissed > 0 
    ? Math.round((stats.swingsHit / (stats.swingsHit + stats.swingsMissed)) * 100) 
    : 0;

  const statItems = [
    { label: 'Games Played', value: stats.gamesPlayed, icon: '🎮' },
    { label: 'Total Fruits Sliced', value: stats.totalFruitsSliced.toLocaleString(), icon: '🍉' },
    { label: 'Bombs Hit', value: stats.bombsHit, icon: '💣' },
    { label: 'Best Combo', value: `${stats.bestCombo}x`, icon: '🔥' },
    { label: 'Highest Score', value: stats.bestScore.toLocaleString(), icon: '🏆' },
    { label: 'Accuracy', value: `${accuracy}%`, icon: '🎯' },
    { label: 'Total Play Time', value: formatTime(stats.totalPlayTimeSeconds), icon: '⏱️' },
  ];

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      <GlassPanel className="w-full max-w-3xl p-8 md:p-12">
        <h2 className="text-4xl font-orbitron font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500 mb-10">
          YOUR STATS
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {statItems.map((item, index) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              key={item.label}
              className="bg-black/30 border border-white/5 rounded-2xl p-6 flex items-center gap-4 hover:bg-white/5 transition-colors"
            >
              <div className="text-4xl drop-shadow-md">{item.icon}</div>
              <div>
                <div className="text-sm text-white/50 uppercase tracking-widest mb-1">{item.label}</div>
                <div className="text-2xl font-bold font-orbitron">{item.value}</div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Button onClick={handleBack} variant="secondary">Back to Menu</Button>
        </div>
      </GlassPanel>
    </div>
  );
}
