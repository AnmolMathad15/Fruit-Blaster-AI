import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { useStatsStore } from '../../store/statsStore';
import { GlassPanel, Button } from '../ui/UIComponents';
import { useSoundManager } from '../../hooks/useSoundManager';

export default function Achievements() {
  const { setScreen } = useGameStore();
  const { achievements } = useStatsStore();
  const { playClick } = useSoundManager();

  const handleBack = () => {
    playClick();
    setScreen('menu');
  };

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      <GlassPanel className="w-full max-w-5xl p-6 md:p-10 h-[85vh] flex flex-col">
        <div className="flex justify-between items-end mb-8 border-b border-white/10 pb-4">
          <h2 className="text-4xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
            ACHIEVEMENTS
          </h2>
          <div className="text-right">
            <div className="text-3xl font-bold font-orbitron">{unlockedCount} / {achievements.length}</div>
            <div className="text-white/50 text-sm uppercase tracking-widest">Unlocked</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {achievements.map((achievement, index) => (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              key={achievement.id}
              className={`relative overflow-hidden rounded-2xl p-4 border transition-all ${
                achievement.unlocked 
                  ? 'bg-gradient-to-br from-white/10 to-white/5 border-primary/50 shadow-[0_0_15px_rgba(200,100,255,0.2)]' 
                  : 'bg-black/40 border-white/5 opacity-60 grayscale'
              }`}
            >
              <div className="flex gap-4 items-center">
                <div className={`text-4xl ${achievement.unlocked ? 'drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]' : ''}`}>
                  {achievement.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-orbitron font-bold text-lg mb-1">{achievement.title}</h3>
                  <p className="text-xs text-white/60 leading-tight">{achievement.description}</p>
                </div>
              </div>
              
              {!achievement.unlocked && achievement.maxProgress > 1 && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-white/40 mb-1">
                    <span>Progress</span>
                    <span>{achievement.progress} / {achievement.maxProgress}</span>
                  </div>
                  <div className="w-full h-1.5 bg-black rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white/20" 
                      style={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {achievement.unlocked && (
                <div className="absolute top-0 right-0 bg-primary text-xs font-bold px-2 py-1 rounded-bl-lg">
                  UNLOCKED
                </div>
              )}
            </motion.div>
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <Button onClick={handleBack} variant="secondary">Back to Menu</Button>
        </div>
      </GlassPanel>
    </div>
  );
}
