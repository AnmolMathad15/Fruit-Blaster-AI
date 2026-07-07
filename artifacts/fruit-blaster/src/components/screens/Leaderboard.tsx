import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { useStatsStore } from '../../store/statsStore';
import { GlassPanel, Button } from '../ui/UIComponents';
import { useSoundManager } from '../../hooks/useSoundManager';

export default function Leaderboard() {
  const { setScreen } = useGameStore();
  const { leaderboard } = useStatsStore();
  const { playClick } = useSoundManager();

  const handleBack = () => {
    playClick();
    setScreen('menu');
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      <GlassPanel className="w-full max-w-4xl p-6 md:p-10 h-[80vh] flex flex-col">
        <h2 className="text-4xl font-orbitron font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent mb-8">
          LEADERBOARD
        </h2>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
          {leaderboard.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-white/50">
              <span className="text-6xl mb-4">👻</span>
              <p>No scores yet. Play a game to rank!</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-white/50 font-orbitron uppercase text-sm tracking-wider">
                  <th className="pb-4 pl-4">Rank</th>
                  <th className="pb-4">Score</th>
                  <th className="pb-4 hidden md:table-cell">Mode</th>
                  <th className="pb-4">Rank</th>
                  <th className="pb-4 hidden sm:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, index) => (
                  <motion.tr 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={entry.id} 
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-4 pl-4 font-bold text-lg">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    </td>
                    <td className="py-4 font-orbitron font-bold text-xl text-primary">{entry.score}</td>
                    <td className="py-4 capitalize hidden md:table-cell text-white/70">{entry.mode}</td>
                    <td className="py-4 text-3xl">{entry.catRank}</td>
                    <td className="py-4 text-white/50 text-sm hidden sm:table-cell">
                      {new Date(entry.date).toLocaleDateString()}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-8 flex justify-center">
          <Button onClick={handleBack} variant="secondary">Back to Menu</Button>
        </div>
      </GlassPanel>
    </div>
  );
}
